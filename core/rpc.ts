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
import * as nanocurrency from "nanocurrency";

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
// rpc.nano.to serves work_generate, but it is known to hang and has served
// invalid nonces, so every nonce is validated locally and a WASM generator
// runs as the offline (not third-party) last resort.

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

async function generateWork(root: string, difficulty: string, key: string): Promise<{ work: string; difficulty: string; source: string }> {
  const cached = cacheGet(root, difficulty);
  if (cached) return { work: cached, difficulty, source: "cache" };

  try {
    const json = await callRpc({ action: "work_generate", hash: root, difficulty }, WORK_TIMEOUT_MS, key);
    const w = String(json?.work ?? "").trim();
    if (w && validateWork(w, root, difficulty)) {
      cachePut(root, difficulty, w);
      return { work: w, difficulty, source: "rpc" };
    }
  } catch {
    /* fall through to local */
  }

  // Offline WASM generator — local CPU, not a third-party service, so the
  // single-endpoint rule still holds.
  const work = await nanocurrency.computeWork(root, { workThreshold: difficulty });
  if (!work) throw new Error("work generation failed");
  cachePut(root, difficulty, work);
  return { work, difficulty, source: "local" };
}

/** One JSON-RPC call against rpc.nano.to. work_generate is served by the
 * layered generator above (validated, with an offline last resort). */
export async function nanoRpc(key: string, body: Record<string, unknown>): Promise<any> {
  if (body.action === "work_generate" && typeof body.hash === "string") {
    // Clamp caller-supplied difficulty: local PoW cost is EXPONENTIAL in the
    // leading bits, so an unclamped value would wedge the event loop.
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
