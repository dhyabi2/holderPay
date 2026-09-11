// Block building and broadcasting. Browser-safe: the only import is
// `nanocurrency`, and every RPC call goes through an injected function, so the
// server passes core/rpc.ts and the page passes a fetch to /api/rpc. One
// implementation, so the pay page and the test scripts cannot drift apart.
//
// Keys never leave the signer. The page holds the buyer's key in the buyer's
// own browser; the scripts hold the PoC keys on disk. holderPay's server never
// sees a secret key and never signs anything -- it cannot, there is no key for
// it to have.

import * as nanocurrency from "nanocurrency";

export const SEND_DIFFICULTY = "fffffff800000000";
export const RECEIVE_DIFFICULTY = "fffffe0000000000";

/** 1 XNO in raw. */
export const XNO = 10n ** 30n;

export type Rpc = (body: Record<string, unknown>) => Promise<any>;

export interface Keys {
  secretKey: string;
  publicKey: string;
  address: string;
}

export function keysFromSeed(seed: string, index = 0): Keys {
  const secretKey = nanocurrency.deriveSecretKey(seed, index);
  const publicKey = nanocurrency.derivePublicKey(secretKey);
  return { secretKey, publicKey, address: nanocurrency.deriveAddress(publicKey, { useNanoPrefix: true }) };
}

/** Exact decimal string to smallest-unit bigint. No Number anywhere: XNO has
 * 30 decimals and `Number("0.1") * 1e30` is already wrong. */
export function toRaw(s: string, decimals: number): bigint {
  const t = (s ?? "").trim();
  if (t === "" || t === "." || !/^\d*\.?\d*$/.test(t)) return 0n;
  const [int = "", frac = ""] = t.split(".");
  const d = Math.max(0, Math.floor(decimals));
  const fracPadded = (frac + "0".repeat(d)).slice(0, d);
  return BigInt(int || "0") * 10n ** BigInt(d) + BigInt(fracPadded || "0");
}

/** Smallest-unit bigint to an exact plain decimal string (never scientific). */
export function fromRaw(n: bigint | string, decimals: number): string {
  const v = BigInt(n);
  const d = 10n ** BigInt(decimals);
  const neg = v < 0n;
  const a = neg ? -v : v;
  const whole = a / d;
  const frac = (a % d).toString().padStart(decimals, "0").replace(/0+$/, "");
  return (neg ? "-" : "") + (frac ? `${whole}.${frac}` : `${whole}`);
}

export function buildBlock(
  secretKey: string,
  opts: { work: string; previous: string | null; representative: string; balance: string; link: string }
): any {
  const b = nanocurrency.createBlock(secretKey, {
    work: opts.work,
    previous: opts.previous,
    representative: opts.representative,
    balance: opts.balance,
    link: opts.link,
  });
  const blk: any = { ...b.block };
  blk.account = blk.account.replace(/^xrb_/, "nano_");
  delete blk.link_as_account; // not part of the signed block
  return blk;
}

export interface AccountTip {
  frontier: string | null;
  balance: bigint;
  representative: string;
}

export async function tip(rpc: Rpc, account: string): Promise<AccountTip> {
  try {
    const info = await rpc({ action: "account_info", account, representative: "true" });
    if (!info?.frontier) return { frontier: null, balance: 0n, representative: account };
    return {
      frontier: info.frontier,
      balance: BigInt(info.balance ?? "0"),
      representative: info.representative ?? account,
    };
  } catch {
    return { frontier: null, balance: 0n, representative: account };
  }
}

async function work(rpc: Rpc, hash: string, difficulty: string): Promise<string> {
  const r = await rpc({ action: "work_generate", hash, difficulty });
  const w = String(r?.work ?? "");
  if (!/^[0-9a-fA-F]{16}$/.test(w)) throw new Error("work_generate returned no usable nonce");
  return w;
}

/**
 * Append one block that burns `delta` raw and carries `link`. This is how every
 * holderPay/hodlgame data block is written: the link is the payload, and the
 * 1-raw burn is the only cost (Nano is feeless, so a data block must spend
 * something or it would be indistinguishable from a no-op change block).
 */
export async function submitLink(rpc: Rpc, keys: Keys, link: string, delta: bigint): Promise<string> {
  const t = await tip(rpc, keys.address);
  if (!t.frontier) throw new Error("wallet is unopened -- send it some XNO first");
  if (t.balance < delta) throw new Error("not enough XNO in this wallet");
  const w = await work(rpc, t.frontier, SEND_DIFFICULTY);
  const blk = buildBlock(keys.secretKey, {
    work: w,
    previous: t.frontier,
    representative: t.representative,
    balance: (t.balance - delta).toString(),
    link,
  });
  const r = await rpc({ action: "process", json_block: "true", block: blk });
  if (!r?.hash) throw new Error("process returned no hash");
  return String(r.hash).toUpperCase();
}

/** Plain XNO send. Returns the send block hash. */
export async function sendXno(rpc: Rpc, keys: Keys, to: string, raw: bigint): Promise<string> {
  if (raw <= 0n) throw new Error("amount must be positive");
  return submitLink(rpc, keys, nanocurrency.derivePublicKey(to), raw);
}

/**
 * Wait until `account` has something receivable worth at least `min` raw.
 *
 * A Nano send is not receivable by the destination the instant `process`
 * returns -- the answering node has to confirm it and the destination's view has
 * to catch up. Calling receiveAll immediately after a send therefore finds
 * nothing and silently leaves the wallet unopened, which is exactly what broke
 * the first live e2e run. Resolves false on timeout rather than throwing, so
 * callers can report a useful message instead of a stack trace.
 */
export async function waitForReceivable(
  rpc: Rpc,
  account: string,
  min = 1n,
  timeoutMs = 60_000,
  onWait?: (elapsedMs: number) => void
): Promise<boolean> {
  const started = Date.now();
  for (;;) {
    try {
      const r = await rpc({ action: "receivable", account, count: "50", source: "true", threshold: "1" });
      const blocks = r?.blocks && typeof r.blocks === "object" ? r.blocks : {};
      let total = 0n;
      for (const v of Object.values<any>(blocks)) total += BigInt(typeof v === "string" ? v : v.amount);
      if (total >= min) return true;
    } catch {
      /* unopened accounts answer with an error; keep waiting */
    }
    if (Date.now() - started > timeoutMs) return false;
    onWait?.(Date.now() - started);
    await new Promise((r) => setTimeout(r, 2000));
  }
}

/** Receive every receivable block so incoming XNO becomes spendable. */
export async function receiveAll(rpc: Rpc, keys: Keys): Promise<{ count: number; balance: bigint }> {
  const r = await rpc({ action: "receivable", account: keys.address, count: "50", source: "true", threshold: "1" });
  const blocks = r?.blocks && typeof r.blocks === "object" ? r.blocks : {};
  const t = await tip(rpc, keys.address);
  let previous = t.frontier;
  let balance = t.balance;
  const representative = t.representative;
  let count = 0;
  for (const [hash, entry] of Object.entries<any>(blocks)) {
    const amount = BigInt(typeof entry === "string" ? entry : entry.amount);
    if (amount <= 0n) continue;
    balance += amount;
    const w = await work(rpc, previous ?? keys.publicKey, RECEIVE_DIFFICULTY);
    const blk = buildBlock(keys.secretKey, {
      work: w,
      previous,
      representative,
      balance: balance.toString(),
      link: hash,
    });
    const res = await rpc({ action: "process", json_block: "true", block: blk });
    previous = String(res.hash);
    count++;
  }
  return { count, balance };
}

/**
 * Send `raw` to `to` and chain a receipt block onto it in one go.
 * This pair IS the payment proof (see core/proof.ts): the send moves the value,
 * the receipt names the policy, and Nano's own chain rule welds them together.
 * Returns both hashes; the receipt hash is what the verifier is given.
 */
export async function payXnoWithReceipt(
  rpc: Rpc,
  keys: Keys,
  to: string,
  raw: bigint,
  receiptLink: string
): Promise<{ payment: string; receipt: string }> {
  const payment = await sendXno(rpc, keys, to, raw);
  const receipt = await submitLink(rpc, keys, receiptLink, 1n);
  return { payment, receipt };
}

/** One-time 1-raw hello so any indexer can discover this account from chain
 * data alone. Idempotent at the caller's discretion; harmless if repeated. */
export async function sayHello(rpc: Rpc, keys: Keys, anchorPubOrAddress: string): Promise<string> {
  const pub = /^[0-9a-fA-F]{64}$/.test(anchorPubOrAddress)
    ? anchorPubOrAddress
    : nanocurrency.derivePublicKey(anchorPubOrAddress);
  return submitLink(rpc, keys, pub, 1n);
}
