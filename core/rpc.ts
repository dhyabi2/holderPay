// holderPay — Nano RPC client.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ STRICT RULE (set by the owner, no exceptions):                          ║
// ║   https://rpc.nano.to is the ONLY RPC service this project may call.    ║
// ║   The only other permitted network endpoint is the SAME provider's      ║
// ║   websocket, wss://ws.nano.to, used for confirmation subscriptions.     ║
// ║   No other node, no proxy, no third-party work service, no fallback     ║
// ║   endpoint. If rpc.nano.to is down, holderPay is down — by design.      ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Safety note that makes the single-endpoint rule acceptable: every block this
// client reads is re-verified locally (ed25519-blake2b over the block hash,
// vendor/hodl/core/blockVerify.ts). A single endpoint can therefore OMIT data
// or answer slowly — it can never forge a block, an amount, or a signature.
// The API key lives in .env and is never shipped to the browser; the browser
// talks to holderPay's own /api/rpc proxy, which whitelists actions.

import blakejsPkg from "blakejs";
const { blake2b } = blakejsPkg;

export const NANO_RPC = process.env.NANO_RPC_URL || "https://rpc.nano.to";
export const NANO_WS = process.env.NANO_WS_URL || "wss://ws.nano.to";
export const SEND_DIFFICULTY = "fffffff800000000";
export const RECEIVE_DIFFICULTY = "fffffe0000000000";

const TIMEOUT_MS = 15_000;
const WORK_TIMEOUT_MS = 20_000;

export function rpcKey(): string {
  return process.env.NANO_RPC_KEY ?? "";
}

/** A real answer from a responsive endpoint ("Account not found") — a fact,
 * not a transport failure. Kept distinct so callers can tell the two apart. */
export class RpcSemanticError extends Error {}

async function callRpc(body: Record<string, unknown>, timeoutMs: number, key: string): Promise<any> {
  const payload: Record<string, unknown> = { ...body };
  if (key) payload.key = key;
  // Identical POST bodies have been observed served from a frozen edge cache.
  // Nano nodes ignore unknown fields, so a per-request nonce makes every body
  // unique and no cache can key on it.
  payload._nb = Date.now().toString(36) + Math.random().toString(36).slice(2, 10);

  const ctl = new AbortController();
  const t = setTimeout(() => ctl.abort(), timeoutMs);
  try {
    const res = await fetch(NANO_RPC, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache",
        Pragma: "no-cache",
        ...(key ? { Authorization: key } : {}),
      },
      body: JSON.stringify(payload),
      signal: ctl.signal,
    });
    const json = (await res.json()) as any;
    if (json?.error) {
      throw new RpcSemanticError(typeof json.error === "string" ? json.error : JSON.stringify(json.error));
    }
    return json;
  } finally {
    clearTimeout(t);
  }
}

// ── proof of work ───────────────────────────────────────────────────────────
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ STRICT RULE (set by the owner, no exceptions):                          ║
// ║   work_generate ALWAYS goes to rpc.nano.to WITH THE KEY. There is no    ║
// ║   local generator, no WASM fallback, no unkeyed attempt. No key, or no  ║
// ║   answer from the endpoint, means the operation FAILS — loudly.         ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Why a fallback was wrong, not merely unnecessary: computing PoW here burns
// this process's CPU, and the cost is exponential in the difficulty bits. On a
// public deployment that turns /api/rpc into a CPU-exhaustion lever that costs
// the attacker a for-loop, and on any box it stalls the event loop for every
// other request mid-payment. The key exists precisely so this machine never
// does that work.
//
// The endpoint is known to hang and has served invalid nonces, so each nonce is
// still validated locally (validateWork) and a bad one is retried against the
// same keyed endpoint. Retrying one endpoint is persistence, not a fallback:
// no other service is ever contacted, and no work is ever computed here.

/** Nano PoW check: blake2b-8(work_le ‖ root) read as LE u64 >= threshold. */
export function validateWork(workHex: string, rootHex: string, difficultyHex: string): boolean {
  if (!/^[0-9a-fA-F]{16}$/.test(workHex) || !/^[0-9a-fA-F]{64}$/.test(rootHex)) return false;
  const workLe = Buffer.from(workHex, "hex").reverse();
  const digest = blake2b(Buffer.concat([workLe, Buffer.from(rootHex, "hex")]), undefined, 8);
  let v = 0n;
  for (let i = 7; i >= 0; i--) v = (v << 8n) | BigInt(digest[i]);
  return v >= BigInt("0x" + difficultyHex);
}

const workCache = new Map<string, string>();
const WORK_CACHE_MAX = 2000;

function cacheGet(root: string, difficulty: string): string | undefined {
  const r = root.toLowerCase();
  return (
    workCache.get(`${r}|${difficulty.toLowerCase()}`) ??
    // send-difficulty work always satisfies receive difficulty
    (difficulty.toLowerCase() === RECEIVE_DIFFICULTY ? workCache.get(`${r}|${SEND_DIFFICULTY}`) : undefined)
  );
}
function cachePut(root: string, difficulty: string, work: string) {
  if (workCache.size >= WORK_CACHE_MAX) workCache.delete(workCache.keys().next().value!);
  workCache.set(`${root.toLowerCase()}|${difficulty.toLowerCase()}`, work);
}

/** How many times to re-ask the keyed endpoint before giving up. */
const WORK_ATTEMPTS = 3;

async function generateWork(root: string, difficulty: string, key: string): Promise<{ work: string; difficulty: string; source: string }> {
  const cached = cacheGet(root, difficulty);
  if (cached) return { work: cached, difficulty, source: "cache" };

  // No key, no work. Failing here is the point: an unkeyed request would either
  // be refused or silently fall into some other way of producing a nonce, and
  // the rule is that there is no other way.
  if (!key) {
    throw new Error(
      "work_generate requires NANO_RPC_KEY — proof of work is never computed locally (set it in .env)"
    );
  }

  let last = "";
  for (let i = 0; i < WORK_ATTEMPTS; i++) {
    try {
      const json = await callRpc({ action: "work_generate", hash: root, difficulty }, WORK_TIMEOUT_MS, key);
      const w = String(json?.work ?? "").trim();
      if (w && validateWork(w, root, difficulty)) {
        cachePut(root, difficulty, w);
        return { work: w, difficulty, source: "rpc" };
      }
      // A nonce that does not meet the threshold is the endpoint being wrong,
      // not us being unlucky. Say so, rather than reporting a timeout.
      last = w ? `endpoint returned a nonce that fails the ${difficulty} threshold` : "endpoint returned no nonce";
    } catch (e: any) {
      // The endpoint ANSWERED and said no (bad key, quota spent, hash refused).
      // Asking two more times cannot change its mind and spends two more units
      // of the very quota that may be the problem. Only a hang or a transport
      // failure is worth repeating.
      if (e instanceof RpcSemanticError) throw new Error(`work_generate refused by ${NANO_RPC}: ${e.message}`);
      last = e?.message ?? String(e);
    }
  }

  throw new Error(`work_generate failed after ${WORK_ATTEMPTS} attempts against ${NANO_RPC}: ${last}`);
}

/** One JSON-RPC call against rpc.nano.to. work_generate is served by the keyed
 * generator above -- validated locally, retried, and never computed here. */
export async function nanoRpc(key: string, body: Record<string, unknown>): Promise<any> {
  if (body.action === "work_generate" && typeof body.hash === "string") {
    // Clamp caller-supplied difficulty. Nothing is computed here any more, so
    // this no longer guards our CPU -- it stops a caller from spending the
    // key's quota on an absurd threshold that no sane block needs.
    const raw =
      typeof body.difficulty === "string" && /^[0-9a-fA-F]{16}$/.test(body.difficulty)
        ? body.difficulty
        : SEND_DIFFICULTY;
    const difficulty = BigInt("0x" + raw) > BigInt("0x" + SEND_DIFFICULTY) ? SEND_DIFFICULTY : raw;
    return generateWork(body.hash, difficulty, key);
  }
  return callRpc(body, TIMEOUT_MS, key);
}

/** Convenience wrapper that uses the configured key. */
export function rpc(body: Record<string, unknown>): Promise<any> {
  return nanoRpc(rpcKey(), body);
}
