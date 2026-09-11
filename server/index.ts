// holderPay's server.
//
// Deliberately powerless. It serves a page, proxies rpc.nano.to so the API key
// stays out of the browser, and REPORTS what core/verify.ts computed. It holds
// no signing key, mints no tokens, and keeps no "has paid" table. Every answer
// it gives about a payment is re-derivable by the buyer's own browser from the
// same public ledger, and the page does exactly that on every verdict.
//
// There is one route here that lies on purpose: POST /api/verify?forge=1.
// It returns a granted verdict for a receipt that does not verify, so you can
// watch the page catch its own server red-handed. See docs/SECURITY.md.

import * as http from "node:http";
import * as fs from "node:fs";
import * as path from "node:path";
import * as crypto from "node:crypto";

import { loadEnv, env } from "../core/env.ts";
import { rpc, NANO_WS } from "../core/rpc.ts";
import {
  makePolicy,
  policyIsIntact,
  acceptedTokens,
  swapTarget,
  normalizeAccept,
  type Policy,
  type PolicyInput,
} from "../core/policy.ts";
import { verifyPayment, lanesOf, type Verdict } from "../core/verify.ts";
import { memoLink, authDigest, verifyAuth, grantId } from "../core/proof.ts";
import { addressToPub, isNanoAddress } from "../core/block.ts";
import { NodeReader } from "../core/reader.ts";
import { currentFold, stateOf } from "../core/ledger.ts";
import { tokenList, viewToken, type SortKey, type TokenLabels } from "../core/valuation.ts";
import { planSwap, quoteBuy } from "../core/swap.ts";
import { ANCHOR_PUB } from "../vendor/hodl/core/anchor.ts";
import * as catalog from "./catalog.ts";
import { watcher } from "./watch.ts";

loadEnv();

const PORT = Number(env("PORT", "8787"));
// Loopback by default. Binding to the world is the single decision that turns
// every "fine on my laptop" setting into a public one, so it must be typed out
// on purpose (HOST=0.0.0.0) rather than inherited by accident.
const HOST = env("HOST", "127.0.0.1");
const WEB = path.resolve(process.cwd(), "web");
const TOKEN_ID = env("TEACHER_TOKEN_ID");
const MERCHANT = env("MERCHANT_ADDRESS");

/** A bind that only this machine can reach. */
const isLoopback = (h: string) => h === "127.0.0.1" || h === "::1" || h === "localhost";
const PUBLIC_BIND = !isLoopback(HOST);

// ── RPC proxy ───────────────────────────────────────────────────────────────
// The browser needs the ledger but must never see the API key. Only these
// actions pass, so the proxy cannot be turned into an open relay. `process` is
// on the list because the buyer signs their own blocks in their own browser and
// has to broadcast them; a block is self-authenticating, so relaying one is not
// a privilege (an attacker gains nothing they could not do against any node).
const ALLOWED_ACTIONS = new Set([
  "account_info",
  "account_history",
  "accounts_frontiers",
  "block_info",
  "blocks_info",
  "pending",
  "receivable",
  "process",
  "work_generate",
  "version",
]);

// ── the work budget ─────────────────────────────────────────────────────────
// `work_generate` is the expensive one and needs its own, much tighter budget.
// It is never computed on this machine -- core/rpc.ts sends every nonce request
// to rpc.nano.to with the key, and fails rather than falling back (see the
// strict rule there). So what these limits protect is the KEY'S QUOTA: without
// them one client could burn the whole allowance and take the payment path down
// for everyone. A legitimate payment needs two or three nonces, so a handful a
// minute is generous, and a global cap bounds a botnet.
//
// Over budget, a caller WAITS for the next window rather than being turned
// away. A 429 in the middle of a checkout is indistinguishable from a broken
// payment to the person making it -- they have already signed nothing, know
// nothing about minute windows, and will simply click again, which costs
// another slot and makes the queue worse. Holding the request costs the server
// a timer and gets the payment through on the same connection.
//
// Waiting is bounded in both directions so it cannot become its own outage: no
// single request is held longer than WORK_MAX_WAIT_MS, and no more than
// WORK_MAX_WAITERS may be parked at once. Past either bound the answer is an
// honest 429 that says how long to wait, rather than a request held forever.
const WORK_PER_IP_PER_MIN = 12;
const WORK_GLOBAL_PER_MIN = 120;
// How long a request may be held waiting for a work slot. Tunable because the
// ceiling is not ours: a serverless platform kills the invocation at its own
// limit (60s on Vercel's default plan), and a request killed mid-hold is worse
// than one told to come back -- so the serverless entry lowers this.
const WORK_MAX_WAIT_MS = Number(env("WORK_MAX_WAIT_MS", "75000"));
const WORK_MAX_WAITERS = 64;

// Ledger reads are cheap per call and ruinous in aggregate: ~145 of them per
// replay means twenty simultaneous strangers checking a receipt is already 2900
// calls a minute against one paid endpoint. The per-IP limit cannot see that,
// because each of them is behaving. This ceiling can.
const READ_GLOBAL_PER_MIN = Number(env("READ_GLOBAL_PER_MIN", "3000"));

interface Budget {
  n: number;
  /** When this fixed window rolls over and the count resets. */
  until: number;
}
const workBudgets = new Map<string, Budget>();
let workWaiters = 0;

function budgetFor(key: string): Budget {
  const now = Date.now();
  let b = workBudgets.get(key);
  if (!b || now > b.until) {
    b = { n: 0, until: now + 60_000 };
    workBudgets.set(key, b);
    // The per-IP map would otherwise grow without limit under a botnet.
    if (workBudgets.size > 5000) {
      for (const [k, v] of workBudgets) if (now > v.until) workBudgets.delete(k);
    }
  }
  return b;
}

/** ms until `key` has a slot free; 0 if one is free right now. */
function msUntilSlot(key: string, max: number): number {
  const b = budgetFor(key);
  return b.n < max ? 0 : Math.max(0, b.until - Date.now());
}

type WorkSlot = { ok: true; waitedMs: number } | { ok: false; retryAfterMs: number; reason: string };

/**
 * Get a work slot, waiting for the next window if the current one is spent.
 * Consumes the slot only when it actually returns ok.
 */
async function awaitWorkSlot(ip: string, res: http.ServerResponse): Promise<WorkSlot> {
  const started = Date.now();
  for (;;) {
    const wait = Math.max(
      msUntilSlot(`ip:${ip}`, WORK_PER_IP_PER_MIN),
      msUntilSlot("global", WORK_GLOBAL_PER_MIN)
    );
    if (wait <= 0) {
      budgetFor(`ip:${ip}`).n++;
      budgetFor("global").n++;
      return { ok: true, waitedMs: Date.now() - started };
    }
    if (Date.now() - started + wait > WORK_MAX_WAIT_MS) {
      return { ok: false, retryAfterMs: wait, reason: "the work budget is spent for longer than a request may be held" };
    }
    if (workWaiters >= WORK_MAX_WAITERS) {
      return { ok: false, retryAfterMs: wait, reason: "too many requests already waiting for work" };
    }
    workWaiters++;
    try {
      // Wake a little after the window turns, and in any case often enough to
      // notice a client that has gone away.
      await new Promise((r) => setTimeout(r, Math.min(wait + 50, 5_000)));
    } finally {
      workWaiters--;
    }
    // Nobody is listening any more -- stop holding a slot for them.
    //
    // Check the RESPONSE, not the request. readBody() has already consumed the
    // request stream by this point, so `req.readable` is false for every normal
    // caller: testing it here silently dropped every waiting request without
    // answering, and the connection hung until the client gave up. `res` stays
    // writable exactly as long as someone is still there to write to.
    if (res.destroyed || res.writableEnded) return { ok: false, retryAfterMs: 0, reason: "client went away" };
  }
}

// Crude per-key limiter: enough to stop a stray loop, or a cheap DoS, from
// burning the RPC quota. In-memory, so it resets on restart and does
// not span instances -- adequate for one box, not for a fleet.
const hits = new Map<string, { n: number; until: number }>();
function rateLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(key);
  if (!h || now > h.until) {
    hits.set(key, { n: 1, until: now + windowMs });
    return true;
  }
  h.n++;
  return h.n <= max;
}

// Catalog writes are shop ADMINISTRATION, not part of the trust model: no
// grant depends on them, and a forged offer cannot mint access for anyone.
// They still must not be open to the world, or a stranger can spam your shop
// listing or rewrite what an existing offer hands over. Set ADMIN_TOKEN in
// .env to enable them; without it the endpoint is closed unless the operator
// explicitly asks for dev mode.
const ADMIN_TOKEN = env("ADMIN_TOKEN");
const DEV_OPEN_CATALOG = env("HOLDERPAY_DEV") === "1";
const ALLOW_FORGE = env("HOLDERPAY_ALLOW_FORGE") === "1";

/**
 * Refuse to serve the world in a configuration that is only safe on a laptop.
 *
 * Every setting below is harmless on loopback and dangerous off it, which is
 * exactly the combination that ships by accident: the operator demos locally,
 * deploys the same .env, and the demo switches stay on. A warning would be read
 * once and forgotten, so this exits instead. Nothing here is a judgement call --
 * each item is a setting that hands a stranger something they must not have.
 */
function refusePublicIfUnsafe(): void {
  if (!PUBLIC_BIND) return;
  const fatal: string[] = [];

  if (DEV_OPEN_CATALOG) {
    fatal.push(
      "HOLDERPAY_DEV=1 leaves POST /api/policies open to anyone -- a stranger could publish offers into your shop, or rewrite what an existing offer hands over. Set ADMIN_TOKEN instead."
    );
  }
  if (ALLOW_FORGE || DEV_OPEN_CATALOG) {
    fatal.push(
      "the forge demo (POST /api/verify?forge=1) is enabled -- it returns a GRANTED verdict for a payment that never happened. It is a teaching tool for localhost, never a public route."
    );
  }
  if (ADMIN_TOKEN && Buffer.byteLength(ADMIN_TOKEN) < 24) {
    fatal.push(`ADMIN_TOKEN is only ${Buffer.byteLength(ADMIN_TOKEN)} bytes -- use at least 24 (node -e "console.log(crypto.randomBytes(32).toString('hex'))"). A guessable admin token is worse than none, because none means closed.`);
  }
  if (!env("NANO_RPC_KEY")) {
    fatal.push(
      "NANO_RPC_KEY is missing -- proof of work is only ever fetched with the key (core/rpc.ts), so every payment would fail at the first block."
    );
  }

  if (fatal.length) {
    console.error(`\nholderPay refuses to bind ${HOST}:${PORT} in this configuration:\n`);
    for (const f of fatal) console.error("  x " + f + "\n");
    console.error("Fix these, or bind to 127.0.0.1 where they are safe.\n");
    process.exit(1);
  }

  if (!ADMIN_TOKEN) {
    console.log("  catalog   CLOSED (no ADMIN_TOKEN) -- publish with scripts/publish-offers.ts, which writes the file directly");
  }
}

function adminOk(req: http.IncomingMessage): boolean {
  if (!ADMIN_TOKEN) return DEV_OPEN_CATALOG;
  const given = String(req.headers["x-admin-token"] ?? "");
  // Constant-time compare: a length-leaking early return turns a secret into a
  // few thousand guesses.
  const a = Buffer.from(given);
  const b = Buffer.from(ADMIN_TOKEN);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

// ── challenges (for proving control of the paying account) ───────────────────
// A challenge is not an authorisation: it only stops a replay of someone else's
// signature. It can never let anyone in, so losing one is an inconvenience, not
// a breach -- but losing ALL of them mid-checkout is a user watching a real
// payment be refused, which is the same thing as broken.
//
// They used to be rows in a Map, which meant a restart logged everybody out and
// a second instance rejected challenges its neighbour had issued. So a challenge
// is now SELF-DESCRIBING: expiry and nonce, signed with an HMAC this server
// holds. Validity is recomputed, never looked up, so it survives a restart and
// holds across instances that share the secret.
const CHALLENGE_TTL_MS = 10 * 60_000;

// Shared across instances when set. Generated per process otherwise, which is
// correct for one box: challenges simply stop being valid after a restart, the
// behaviour we already had.
const CHALLENGE_SECRET = (() => {
  const s = env("CHALLENGE_SECRET");
  if (s) return Buffer.from(s);
  if (PUBLIC_BIND) {
    console.log("  challenge no CHALLENGE_SECRET -- generating one; set it if you run more than one instance");
  }
  return crypto.randomBytes(32);
})();

function signChallenge(payload: string): string {
  return crypto.createHmac("sha256", CHALLENGE_SECRET).update(payload).digest("hex").slice(0, 32);
}

function newChallenge(): string {
  const payload = `${Date.now() + CHALLENGE_TTL_MS}.${crypto.randomBytes(16).toString("hex")}`;
  return `${payload}.${signChallenge(payload)}`;
}

/**
 * One-shot enforcement is the one part that cannot be stateless: proving a
 * challenge has not been used before requires remembering that it was. This set
 * holds only spent challenges, and only until they would expire anyway, so it
 * stays small and loses nothing important on a restart -- an expired challenge
 * is refused by its own signature regardless.
 *
 * Being honest about the limit: across several instances that do not share this
 * set, a captured (challenge, signature) pair could be replayed once per
 * instance inside its ten-minute life. That is strictly better than the old Map,
 * where the pair was refused by every instance except the one that issued it --
 * including the honest payer's own retry.
 */
const spent = new Set<string>();

function challengeValid(c: string): boolean {
  const parts = c.split(".");
  if (parts.length !== 3) return false;
  const [expStr, nonce, mac] = parts;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || exp < Date.now()) return false;
  if (!/^[0-9a-f]{32}$/.test(nonce) || !/^[0-9a-f]{32}$/.test(mac)) return false;

  const expected = signChallenge(`${expStr}.${nonce}`);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;
  return !spent.has(c);
}

/** Burn a challenge after a successful use. */
function spendChallenge(c: string): void {
  spent.add(c);
  if (spent.size > 10_000) {
    const now = Date.now();
    for (const k of spent) if (Number(k.split(".")[0]) < now) spent.delete(k);
  }
}

// ── helpers ─────────────────────────────────────────────────────────────────

const json = (res: http.ServerResponse, code: number, body: unknown) => {
  const text = JSON.stringify(body, (_k, v) => (typeof v === "bigint" ? v.toString() : v));
  res.writeHead(code, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store",
  });
  res.end(text);
};

async function readBody(req: http.IncomingMessage, limit = 256 * 1024): Promise<any> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new Error("body too large");
    chunks.push(c as Buffer);
  }
  if (!chunks.length) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf-8"));
}

/** Resolve a policy from a request: an id in the catalog, or a full inline
 * document (whose id is re-derived, so an inline policy cannot lie). */
function resolvePolicy(body: any): { policy: Policy | null; error?: string } {
  if (body?.policy && typeof body.policy === "object") {
    const p = body.policy as Policy;
    if (!policyIsIntact(p)) return { policy: null, error: "inline policy does not match its own id" };
    return { policy: p };
  }
  const id = String(body?.policyId ?? "");
  const listing = catalog.get(id);
  if (!listing) return { policy: null, error: "unknown policy id" };
  return { policy: listing.policy };
}


/**
 * Display labels for tokens, from local sources only: TOKEN_LABELS in .env and
 * the symbols merchants put in their own accept lists. Never from a registry --
 * a name is display, and nothing here is allowed to decide a payment.
 */
function tokenLabels(): TokenLabels {
  const labels: TokenLabels = new Map();
  try {
    for (const [id, v] of Object.entries<any>(JSON.parse(env("TOKEN_LABELS", "{}")))) {
      labels.set(id.toLowerCase(), typeof v === "string" ? { symbol: v } : v);
    }
  } catch {
    /* malformed TOKEN_LABELS is a config typo, not a reason to fail a request */
  }
  if (TOKEN_ID) labels.set(TOKEN_ID.toLowerCase(), { symbol: "TEACHER", name: "Teacher" });
  for (const l of catalog.list()) {
    for (const a of acceptedTokens(l.policy)) {
      if (a.symbol && !labels.has(a.tokenId)) labels.set(a.tokenId, { symbol: a.symbol });
    }
  }
  return labels;
}

// ── the server ──────────────────────────────────────────────────────────────

// In-flight bookkeeping, for draining on shutdown (see the bottom of the file).
let inFlight = 0;
let draining = false;
let drained: (() => void) | null = null;

/**
 * The whole HTTP surface, as one function.
 *
 * Exported because it has two homes: the Node server at the bottom of this
 * file, and the serverless entry (server/vercel-entry.ts) that Vercel calls.
 * Both run THIS code -- a deployment that diverged from the thing tested here
 * would be a second implementation of the only route worth auditing.
 */
export async function handle(req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const ip = String(req.socket.remoteAddress ?? "?");
  const route = `${req.method} ${url.pathname}`;
  harden(res);
  inFlight++;
  res.on("close", () => {
    inFlight--;
    if (draining && inFlight === 0) drained?.();
  });

  try {
    // ---- static ----------------------------------------------------------
    if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/index.html")) {
      return serveFile(res, path.join(WEB, "index.html"), "text/html; charset=utf-8");
    }
    if (req.method === "GET" && /^\/[a-zA-Z0-9._-]+\.(js|css|svg|png|ico|map)$/.test(url.pathname)) {
      const file = path.join(WEB, url.pathname.slice(1));
      const type =
        url.pathname.endsWith(".js") ? "text/javascript; charset=utf-8"
        : url.pathname.endsWith(".css") ? "text/css; charset=utf-8"
        : url.pathname.endsWith(".svg") ? "image/svg+xml"
        : "application/octet-stream";
      return serveFile(res, file, type);
    }

    // ---- config (public; never the API key) --------------------------------
    if (route === "GET /api/config") {
      return json(res, 200, {
        ws: NANO_WS,
        rpc: "/api/rpc",
        // A convenience default for the merchant form. The app is NOT limited
        // to it: an offer may list any hodlgame token, and /api/tokens returns
        // everything this verifier can see.
        tokenId: TOKEN_ID,
        symbol: "TEACHER",
        decimals: 6,
        merchant: MERCHANT,
        anchors: { holderpay: env("HOLDERPAY_ANCHOR_ADDRESS"), hodlgame: ANCHOR_PUB },
        launchHash: env("TEACHER_LAUNCH_HASH"),
        wsConnected: watcher.connected,
      });
    }

    // ---- rpc proxy --------------------------------------------------------
    if (route === "POST /api/rpc") {
      // MEASURED, do not lower blindly: one ledger replay costs ~145 calls
      // (121 account_info, 12 pending, 9 blocks_info, 4 account_history over 39
      // accounts), and the page performs a full replay for its OWN verdict every
      // time it checks a receipt. A per-IP cap below ~300/min therefore breaks
      // the browser's independent verification -- the feature this project
      // exists for -- so the per-IP figure stays generous and the GLOBAL ceiling
      // is what bounds total quota burn when the callers are a botnet rather
      // than a person.
      if (!rateLimit(`rpc:${ip}`, 600, 60_000)) {
        res.setHeader("retry-after", "60");
        return json(res, 429, { error: "too many ledger reads from this address -- try again in a minute" });
      }
      if (!rateLimit("rpc:global", READ_GLOBAL_PER_MIN, 60_000)) {
        res.setHeader("retry-after", "60");
        return json(res, 429, { error: "this verifier is at its ledger-read ceiling right now -- try again in a minute" });
      }
      const body = await readBody(req);
      const action = String(body?.action ?? "");
      if (!ALLOWED_ACTIONS.has(action)) return json(res, 400, { error: `action not allowed: ${action}` });
      let workWaitMs = 0;
      if (action === "work_generate") {
        const slot = await awaitWorkSlot(ip, res);
        if (!slot.ok) {
          if (slot.retryAfterMs === 0) return; // client hung up mid-wait
          const secs = Math.ceil(slot.retryAfterMs / 1000);
          res.setHeader("retry-after", String(secs));
          return json(res, 429, {
            error: `proof of work is rate limited -- ${slot.reason}. Try again in ${secs}s.`,
            retryAfterMs: slot.retryAfterMs,
          });
        }
        workWaitMs = slot.waitedMs;
        // Observable without changing the RPC response shape.
        if (workWaitMs > 0) res.setHeader("x-work-wait-ms", String(workWaitMs));
      }
      try {
        return json(res, 200, await rpc(body));
      } catch (e: any) {
        // Surface the node's own words (e.g. "Account not found") -- the client
        // distinguishes "unopened account" from a real failure.
        return json(res, 200, { error: e?.message ?? String(e) });
      }
    }

    // ---- shop ------------------------------------------------------------
    if (route === "GET /api/policies") {
      return json(res, 200, {
        listings: catalog.list().map((l) => ({
          policy: l.policy,
          lanes: lanesOf(l.policy),
          accept: acceptedTokens(l.policy),
          swapInto: swapTarget(l.policy),
          receiptLink: memoLink(l.policy.id),
        })),
      });
    }

    if (route === "POST /api/policies") {
      // Say so before asking for credentials: a fixed deployment cannot accept
      // this write from anybody, and "403 forbidden" would send an operator
      // hunting for a token that would not have helped.
      if (catalog.isReadOnly()) {
        return json(res, 405, { error: new catalog.CatalogReadOnlyError().message });
      }
      if (!adminOk(req)) {
        return json(res, 403, {
          error: "publishing offers is disabled -- set ADMIN_TOKEN in .env and send it as x-admin-token (or HOLDERPAY_DEV=1 for a local demo)",
        });
      }
      const body = await readBody(req);
      const input = body?.policy as PolicyInput;
      if (!input || !isNanoAddress(input.merchant ?? "")) return json(res, 400, { error: "merchant address required" });
      // normalizeAccept drops malformed or non-positive entries and de-dupes by
      // token id, so a published offer can never carry a token priced at zero.
      const accept = normalizeAccept(input.accept).slice(0, 50);
      if (accept.length === 0 && !input.priceXno) {
        return json(res, 400, { error: "an offer must accept XNO, at least one token, or both" });
      }
      const listing = catalog.put(
        {
          merchant: input.merchant,
          resource: String(input.resource ?? "").slice(0, 200),
          title: String(input.title ?? "").slice(0, 200),
          description: String(input.description ?? "").slice(0, 2000),
          priceXno: input.priceXno ? BigInt(input.priceXno).toString() : undefined,
          accept,
          autoswap: !!input.autoswap,
          swapInto: input.swapInto ? String(input.swapInto).toLowerCase() : undefined,
          expires: Number(input.expires) || 0,
        },
        String(body?.unlock ?? "").slice(0, 20000)
      );
      watcher.watch([listing.policy.merchant]);
      return json(res, 200, { policy: listing.policy, receiptLink: memoLink(listing.policy.id) });
    }

    if (route === "GET /api/policy") {
      const l = catalog.get(url.searchParams.get("id") ?? "");
      if (!l) return json(res, 404, { error: "unknown policy" });
      return json(res, 200, {
        policy: l.policy,
        lanes: lanesOf(l.policy),
        accept: acceptedTokens(l.policy),
        swapInto: swapTarget(l.policy),
        receiptLink: memoLink(l.policy.id),
      });
    }

    // ---- tokens ----------------------------------------------------------
    // Every token this verifier can see, sorted. The default order is by what
    // the given account holds measured against REAL COLLATERAL, never by the
    // AMM quote: a token's quoted price is a free declaration (three raw buys
    // one quoting a million XNO), so ordering by it would put the cheapest lie
    // on top. See core/valuation.ts.
    if (route === "GET /api/tokens") {
      const account = url.searchParams.get("account") ?? "";
      const sort = (url.searchParams.get("sort") ?? "backedHoldingValue") as SortKey;
      const held = url.searchParams.get("held") === "1";
      const f = await currentFold(account ? [account] : []);
      let tokens = tokenList(f, account, sort, tokenLabels());
      if (held && account) tokens = tokens.filter((t) => BigInt(t.balance) > 0n);
      return json(res, 200, { tokens, watched: f.accounts.length, foldAt: f.at, sort });
    }

    // ---- one token's state (for quoting and display) -----------------------
    if (route === "GET /api/token") {
      const account = url.searchParams.get("account") ?? "";
      const tokenId = (url.searchParams.get("tokenId") || TOKEN_ID).toLowerCase();
      if (!tokenId) return json(res, 400, { error: "tokenId required" });
      const f = await currentFold(account ? [account] : []);
      const s = stateOf(f, tokenId);
      const head = s.queue.find((q) => q.owed > 0n) ?? null;
      return json(res, 200, {
        ...viewToken(tokenId, s, account, tokenLabels()),
        launched: s.launched,
        treasury: s.treasury.toString(),
        queueHead: head ? { account: head.account, owed: head.owed } : null,
        queueTotal: s.queue.reduce((a, q) => a + q.owed, 0n),
        you: account
          ? {
              balance: s.balances.get(account) ?? 0n,
              earmark: s.earmark.get(account) ?? 0n,
              floor: s.earmarkFloor.get(account) ?? 0n,
            }
          : null,
        merchantBalance: MERCHANT ? s.balances.get(MERCHANT) ?? 0n : 0n,
        watched: f.accounts.length,
        foldAt: f.at,
      });
    }

    // ---- swap quote ------------------------------------------------------
    if (route === "GET /api/quote") {
      const tokenId = (url.searchParams.get("tokenId") || TOKEN_ID).toLowerCase();
      const want = BigInt(url.searchParams.get("tokens") ?? "0");
      const account = url.searchParams.get("account") ?? "";
      const slippageBps = Number(url.searchParams.get("slippageBps") ?? "300");
      if (!tokenId) return json(res, 400, { error: "no token configured" });
      const f = await currentFold(account ? [account] : []);
      const s = stateOf(f, tokenId);
      let walletBalance = 0n;
      if (account) {
        try {
          const info = await rpc({ action: "account_info", account });
          walletBalance = BigInt(info.balance ?? "0");
        } catch {
          /* unopened */
        }
      }
      const plan = planSwap({
        state: s,
        walletBalance,
        myFloor: s.earmarkFloor.get(account) ?? 0n,
        wantTokens: want,
        slippageBps,
      });
      return json(res, 200, { plan, walletBalance, spot: quoteBuy(s.poolXno, s.poolTokens, 10n ** 30n) });
    }

    // ---- challenge -------------------------------------------------------
    if (route === "GET /api/challenge") {
      return json(res, 200, { challenge: newChallenge(), ttlMs: CHALLENGE_TTL_MS });
    }

    // ---- verify ----------------------------------------------------------
    // The whole point of holderPay, and the one route worth auditing.
    if (route === "POST /api/verify") {
      if (!rateLimit(`verify:${ip}`, 120, 60_000)) return json(res, 429, { error: "slow down" });
      const body = await readBody(req);
      const { policy, error } = resolvePolicy(body);
      if (!policy) return json(res, 400, { error });
      const receipt = String(body?.receipt ?? "");

      const reader = new NodeReader(body?.payer ? [String(body.payer)] : []);
      const verdict = await verifyPayment(policy, receipt, reader);

      // The honest-server tamper demo. A real attacker would not add a query
      // parameter -- they would just patch this handler. The page's independent
      // check catches both identically, which is exactly the claim being made.
      if (url.searchParams.get("forge") === "1" && (DEV_OPEN_CATALOG || ALLOW_FORGE)) {
        const forged: Verdict = {
          ...verdict,
          granted: true,
          reason: "FORGED BY THE SERVER (demo) -- the page should reject this",
          confirmed: true,
          grant: grantId(policy.id, receipt || "00".repeat(32)),
          receipt: receipt || "00".repeat(32),
        };
        return json(res, 200, { verdict: forged, forged: true });
      }

      return json(res, 200, { verdict });
    }

    // ---- access ----------------------------------------------------------
    // Hand over the goods. Requires BOTH a verdict from the chain AND a
    // signature from the paying account over a fresh challenge, so a bystander
    // who merely read the receipt hash off the ledger cannot claim the grant.
    if (route === "POST /api/access") {
      const body = await readBody(req);
      const listing = catalog.get(String(body?.policyId ?? ""));
      if (!listing) return json(res, 404, { error: "unknown policy" });
      const receipt = String(body?.receipt ?? "");
      const challenge = String(body?.challenge ?? "");
      const signature = String(body?.signature ?? "");

      if (!challengeValid(challenge)) return json(res, 400, { error: "challenge expired -- request a new one" });

      const reader = new NodeReader(body?.payer ? [String(body.payer)] : []);
      const verdict = await verifyPayment(listing.policy, receipt, reader);
      if (!verdict.granted) return json(res, 402, { error: verdict.reason, verdict });

      const pub = addressToPub(verdict.payer!);
      if (!verifyAuth(pub, signature, listing.policy.id, verdict.receipt!, challenge)) {
        return json(res, 401, {
          error: "that payment is real, but you did not prove you control the paying account",
          verdict,
          digest: authDigest(listing.policy.id, verdict.receipt!, challenge),
        });
      }
      spendChallenge(challenge); // one-shot
      return json(res, 200, { verdict, unlock: listing.unlock });
    }

    // ---- websocket status ------------------------------------------------
    if (route === "GET /api/watch") {
      return json(res, 200, {
        connected: watcher.connected,
        accounts: watcher.watching,
        recent: watcher.since(60_000),
        url: NANO_WS,
      });
    }

    if (route === "POST /api/watch") {
      const body = await readBody(req);
      const accounts = (Array.isArray(body?.accounts) ? body.accounts : []).filter(isNanoAddress).slice(0, 20);
      watcher.watch(accounts);
      return json(res, 200, { ok: true, accounts: watcher.watching, connected: watcher.connected });
    }

    return json(res, 404, { error: "no such route", route });
  } catch (e: any) {
    // The client gets a reference, the operator gets the detail. An unhandled
    // error's message is written for whoever wrote the code -- file paths, env
    // names, library internals -- and none of that is owed to a stranger.
    // Deliberate messages are unaffected: every route above answers for itself,
    // including the RPC proxy, which forwards the node's own words on purpose.
    const ref = crypto.randomBytes(6).toString("hex");
    console.error(`[${ref}] ${route} failed:`, e);
    return json(res, 500, { error: "something went wrong on this server", ref });
  }
}

const server = http.createServer(handle);

/**
 * Content Security Policy for the page.
 *
 * This matters more here than on a normal site: the buyer's WALLET SEED lives in
 * this origin's localStorage (web/app.ts, SEED_KEY). One injected script reads it
 * and empties the wallet, with no payment and no signature required. So the
 * policy is allow-nothing plus exactly what the page uses -- its own bundle, its
 * own stylesheet, its own /api, and the Nano websocket.
 *
 * The page is built for this: web/index.html carries no inline script and no
 * inline style, so 'unsafe-inline' is never needed and is never granted.
 */
function contentSecurityPolicy(): string {
  // The websocket is configurable, so derive its origin rather than hardcoding
  // one -- a policy that does not match the socket silently kills confirmations.
  let wsOrigin = "";
  try {
    wsOrigin = new URL(NANO_WS).origin;
  } catch {
    /* malformed NANO_WS_URL: omit it and let the socket fail loudly instead */
  }
  return [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src 'self'${wsOrigin ? " " + wsOrigin : ""}`,
    "base-uri 'none'",
    "form-action 'none'",
    "frame-ancestors 'none'",
  ].join("; ");
}

/** Headers every response carries, whatever it is. */
function harden(res: http.ServerResponse): void {
  res.setHeader("x-content-type-options", "nosniff");
  res.setHeader("referrer-policy", "no-referrer");
  res.setHeader("x-frame-options", "DENY");
  res.setHeader("cross-origin-opener-policy", "same-origin");
  res.setHeader("cross-origin-resource-policy", "same-origin");
  res.setHeader("permissions-policy", "geolocation=(), microphone=(), camera=(), payment=()");
  // Only meaningful over TLS, and harmless otherwise; a public deployment is
  // expected to terminate HTTPS in front of this process.
  if (PUBLIC_BIND) res.setHeader("strict-transport-security", "max-age=31536000");
}

function serveFile(res: http.ServerResponse, file: string, type: string) {
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("not found: " + path.basename(file));
    }
    res.writeHead(200, {
      "content-type": type,
      "cache-control": "no-store",
      "content-security-policy": contentSecurityPolicy(),
    });
    res.end(data);
  });
}

/**
 * Drain rather than cut.
 *
 * A request here is not a page view: it can be the second half of a payment, and
 * the work gate may legitimately hold one for over a minute waiting for a budget
 * window. Killing that mid-flight leaves a buyer who has signed and broadcast a
 * real block staring at a dead connection. So stop accepting new work, let what
 * is in flight finish, and only then exit -- with a hard ceiling so a stuck
 * request cannot keep a dying process alive forever.
 */
const SHUTDOWN_GRACE_MS = WORK_MAX_WAIT_MS + 15_000;

function shutdown(signal: string): void {
  if (draining) return; // a second Ctrl-C means "now", not "again"
  draining = true;
  console.log(`\n${signal} -- draining ${inFlight} request(s), up to ${Math.round(SHUTDOWN_GRACE_MS / 1000)}s`);
  server.close(() => finish(0));
  watcher.stop();

  const timer = setTimeout(() => {
    console.error(`still ${inFlight} request(s) in flight after the grace period -- exiting anyway`);
    finish(1);
  }, SHUTDOWN_GRACE_MS);
  timer.unref();

  drained = () => {
    clearTimeout(timer);
    finish(0);
  };
  if (inFlight === 0) drained();
}

let finished = false;
function finish(code: number): void {
  if (finished) return;
  finished = true;
  process.exit(code);
}

/**
 * Everything below runs ONLY when this file is the process: a listening socket,
 * a websocket subscription and signal handlers are all meaningless inside a
 * serverless invocation, and starting them there would connect a socket per
 * request. The flag is set at build time by scripts/build-vercel.mjs, so the
 * decision is made once by the build rather than guessed at runtime.
 */
if (process.env.HOLDERPAY_SERVERLESS !== "1") {
// Watch the merchant (and every merchant in the catalog) from the start, so a
// payment made before anyone opens the page is still noticed immediately.
watcher.watch([MERCHANT, ...catalog.list().map((l) => l.policy.merchant)].filter(Boolean));

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

refusePublicIfUnsafe();

server.listen(PORT, HOST, () => {
  console.log(`holderPay on http://${isLoopback(HOST) ? "localhost" : HOST}:${PORT}`);
  console.log(`  rpc       ${env("NANO_RPC_URL", "https://rpc.nano.to")} (key ${env("NANO_RPC_KEY") ? "loaded" : "MISSING"})`);
  console.log(`  websocket ${NANO_WS}`);
  console.log(`  token     ${TOKEN_ID || "(not launched yet -- run scripts/launch-token.ts)"}`);
  console.log(`  merchant  ${MERCHANT}`);
});
}
