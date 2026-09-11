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

/**
 * Smallest receivable worth spending a nonce on, in raw.
 *
 * Receiving a block costs a full proof of work, bought off the shared RPC key.
 * So a receivable smaller than that nonce is worth is not income, it is a bill,
 * and anyone may send you one: a stranger can spend a few raw to make your
 * wallet spend a nonce, repeatedly, and dust-spam is the cheapest way there is
 * to drain the key's work quota.
 *
 * Measured on this project's own accounts, nothing legitimate is anywhere near
 * this line -- every real receivable observed was 10^25 raw (0.00001 XNO, the
 * smallest price holderPay expresses), and hodlgame data blocks do NOT leave
 * dust behind for their recipients: a fragment link carries payload, not a
 * spendable account, so its burned raw lands in an unowned pseudo-account
 * rather than in the merchant's wallet.
 */
export const DUST_RAW = 1000n;

export interface ReceiveResult {
  /** Blocks actually received. */
  count: number;
  balance: bigint;
  /** Receivables below `dust`, deliberately left on the table. */
  skipped: number;
  /** Real receivables left over because `max` was hit -- call again to get them. */
  remaining: number;
}

/**
 * Receive incoming XNO so it becomes spendable.
 *
 * BOUNDED ON PURPOSE. Each block received needs its own proof of work, and
 * nonces come from rpc.nano.to on the key (core/rpc.ts -- never from this
 * machine). An unbounded receive is therefore an unbounded spend of somebody
 * else's quota: this used to ask for up to 50 receivables and fire 50
 * work_generate calls from a single click of the page's Receive button, which
 * alone exceeds the proxy's whole per-minute work budget.
 *
 * So it takes at most `max` blocks per call and reports what is left. Nothing is
 * lost by stopping early -- a receivable stays receivable forever, and a payment
 * is verified from the SEND block, so an unreceived balance never changes a
 * verdict.
 */
export async function receiveAll(
  rpc: Rpc,
  keys: Keys,
  opts: { max?: number; dust?: bigint } = {}
): Promise<ReceiveResult> {
  const max = Math.max(1, Math.min(opts.max ?? 8, 25));
  const dust = opts.dust ?? DUST_RAW;

  // Ask for a few more than we will take, only so `remaining` can be honest.
  const r = await rpc({
    action: "receivable",
    account: keys.address,
    count: String(max + 10),
    source: "true",
    threshold: dust.toString(),
  });
  const blocks = r?.blocks && typeof r.blocks === "object" ? r.blocks : {};
  const t = await tip(rpc, keys.address);
  let previous = t.frontier;
  let balance = t.balance;
  const representative = t.representative;
  let count = 0;
  let skipped = 0;
  let remaining = 0;

  for (const [hash, entry] of Object.entries<any>(blocks)) {
    const amount = BigInt(typeof entry === "string" ? entry : entry.amount);
    // `threshold` is the node's word; re-check it here so the dust rule holds
    // even if the endpoint ignores the parameter.
    if (amount < dust) {
      skipped++;
      continue;
    }
    if (count >= max) {
      remaining++;
      continue;
    }
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
  return { count, balance, skipped, remaining };
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
