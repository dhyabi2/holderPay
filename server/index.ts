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
import { makePolicy, policyIsIntact, type Policy, type PolicyInput } from "../core/policy.ts";
import { verifyPayment, lanesOf, type Verdict } from "../core/verify.ts";
import { memoLink, authDigest, verifyAuth, grantId } from "../core/proof.ts";
import { addressToPub, isNanoAddress } from "../core/block.ts";
import { NodeReader } from "../core/reader.ts";
import { currentFold, stateOf } from "../core/ledger.ts";
import { planSwap, quoteBuy } from "../core/swap.ts";
import { ANCHOR_PUB } from "../vendor/hodl/core/anchor.ts";
import * as catalog from "./catalog.ts";
import { watcher } from "./watch.ts";

loadEnv();

const PORT = Number(env("PORT", "8787"));
const WEB = path.resolve(process.cwd(), "web");
const TOKEN_ID = env("TEACHER_TOKEN_ID");
const MERCHANT = env("MERCHANT_ADDRESS");

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

// Crude per-IP limiter: enough to stop a stray loop from burning the RPC quota.
const hits = new Map<string, { n: number; until: number }>();
function rateLimit(ip: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now > h.until) {
    hits.set(ip, { n: 1, until: now + windowMs });
    return true;
  }
  h.n++;
  return h.n <= max;
}

// ── challenges (for proving control of the paying account) ───────────────────
// Short-lived nonces. A challenge is not an authorisation: it only stops a
// replay of someone else's signature. Losing this map logs people out; it can
// never let anyone in.
const challenges = new Map<string, number>();
const CHALLENGE_TTL_MS = 10 * 60_000;

function newChallenge(): string {
  const c = crypto.randomBytes(16).toString("hex");
  challenges.set(c, Date.now() + CHALLENGE_TTL_MS);
  for (const [k, exp] of challenges) if (exp < Date.now()) challenges.delete(k);
  return c;
}
function challengeValid(c: string): boolean {
  const exp = challenges.get(c);
  return !!exp && exp > Date.now();
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

// ── the server ──────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const ip = String(req.socket.remoteAddress ?? "?");
  const route = `${req.method} ${url.pathname}`;

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
      if (!rateLimit(`rpc:${ip}`, 600, 60_000)) return json(res, 429, { error: "slow down" });
      const body = await readBody(req);
      const action = String(body?.action ?? "");
      if (!ALLOWED_ACTIONS.has(action)) return json(res, 400, { error: `action not allowed: ${action}` });
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
          receiptLink: memoLink(l.policy.id),
        })),
      });
    }

    if (route === "POST /api/policies") {
      const body = await readBody(req);
      const input = body?.policy as PolicyInput;
      if (!input || !isNanoAddress(input.merchant ?? "")) return json(res, 400, { error: "merchant address required" });
      const listing = catalog.put(
        {
          merchant: input.merchant,
          resource: String(input.resource ?? "").slice(0, 200),
          title: String(input.title ?? "").slice(0, 200),
          description: String(input.description ?? "").slice(0, 2000),
          priceXno: input.priceXno ? BigInt(input.priceXno).toString() : undefined,
          priceToken: input.priceToken ? BigInt(input.priceToken).toString() : undefined,
          token: input.token,
          autoswap: !!input.autoswap,
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
      return json(res, 200, { policy: l.policy, lanes: lanesOf(l.policy), receiptLink: memoLink(l.policy.id) });
    }

    // ---- token state (for quoting and display) -----------------------------
    if (route === "GET /api/token") {
      const account = url.searchParams.get("account") ?? "";
      const tokenId = (url.searchParams.get("tokenId") || TOKEN_ID).toLowerCase();
      if (!tokenId) return json(res, 400, { error: "no token configured" });
      const f = await currentFold(account ? [account] : []);
      const s = stateOf(f, tokenId);
      const head = s.queue.find((q) => q.owed > 0n) ?? null;
      return json(res, 200, {
        tokenId,
        launched: s.launched,
        direct: s.direct,
        symbol: s.symbol || "TEACHER",
        decimals: s.decimals,
        supply: s.supply,
        treasury: s.treasury,
        poolXno: s.poolXno,
        poolTokens: s.poolTokens,
        creator: s.creator,
        holders: s.balances.size,
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
      if (url.searchParams.get("forge") === "1") {
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
      challenges.delete(challenge); // one-shot
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
    return json(res, 500, { error: e?.message ?? String(e) });
  }
});

function serveFile(res: http.ServerResponse, file: string, type: string) {
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { "content-type": "text/plain" });
      return res.end("not found: " + path.basename(file));
    }
    res.writeHead(200, { "content-type": type, "cache-control": "no-store" });
    res.end(data);
  });
}

// Watch the merchant (and every merchant in the catalog) from the start, so a
// payment made before anyone opens the page is still noticed immediately.
watcher.watch([MERCHANT, ...catalog.list().map((l) => l.policy.merchant)].filter(Boolean));

server.listen(PORT, () => {
  console.log(`holderPay on http://localhost:${PORT}`);
  console.log(`  rpc       ${env("NANO_RPC_URL", "https://rpc.nano.to")} (key ${env("NANO_RPC_KEY") ? "loaded" : "MISSING"})`);
  console.log(`  websocket ${NANO_WS}`);
  console.log(`  token     ${TOKEN_ID || "(not launched yet -- run scripts/launch-token.ts)"}`);
  console.log(`  merchant  ${MERCHANT}`);
});
