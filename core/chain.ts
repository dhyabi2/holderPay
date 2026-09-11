// Reading the Nano ledger, with the node treated as an untrusted mirror.
//
// Every block that comes back from rpc.nano.to is re-hashed and its signature
// re-checked locally against the account the node attributes it to
// (vendor/hodl/core/blockVerify.ts). The node can therefore omit a block, lag,
// or answer slowly -- it cannot invent one, change an amount, or move a
// payment to a different account. That property is what makes the single
// -endpoint rule in core/rpc.ts safe.
//
// Amounts are DERIVED from the signed balance chain (previous.balance minus
// this.balance), never read from the node's unsigned `amount` field.

import * as nanocurrency from "nanocurrency";
import { rpc } from "./rpc.ts";
import { verifyFetchedBlock } from "../vendor/hodl/core/blockVerify.ts";

export interface VerifiedBlock {
  hash: string;
  account: string;
  previous: string;
  representative: string;
  balance: bigint;
  /** Raw 64-hex link exactly as signed. */
  link: string;
  /** Node-reported confirmation. Advisory: see `confirmed` note below. */
  confirmed: boolean;
  /** Node-reported first-seen time (unix seconds); 0 when unknown. */
  timestamp: number;
  /** Height as reported by the node; 0 when unknown. */
  height: number;
}

/** `link` read as a Nano address -- meaningful only on a send block. */
export function linkAsAddress(link: string): string {
  try {
    return nanocurrency.deriveAddress(link, { useNanoPrefix: true });
  } catch {
    return "";
  }
}

export function addressToPub(address: string): string {
  return nanocurrency.derivePublicKey(address).toUpperCase();
}

export function isNanoAddress(a: string): boolean {
  return /^(nano|xrb)_[13][13456789abcdefghijkmnopqrstuwxyz]{59}$/.test((a ?? "").trim());
}

/**
 * Fetch blocks by hash and keep only those whose signature verifies.
 * A hash that the node omits, or that fails verification, is simply absent
 * from the returned map -- callers treat absence as "not proven".
 */
export async function getBlocks(hashes: string[]): Promise<Map<string, VerifiedBlock>> {
  const out = new Map<string, VerifiedBlock>();
  const want = [...new Set(hashes.map((h) => h.toUpperCase()))].filter((h) => /^[0-9A-F]{64}$/.test(h));
  if (want.length === 0) return out;

  const res = await rpc({
    action: "blocks_info",
    hashes: want,
    json_block: "true",
    include_not_found: "true",
    // `pending`/`source` are not needed; balance + previous give us everything,
    // and asking for less keeps the single RPC call small.
  });
  const blocks = res?.blocks && typeof res.blocks === "object" ? res.blocks : {};
  for (const [hash, entry] of Object.entries<any>(blocks)) {
    if (!verifyFetchedBlock(hash, entry)) continue; // node lied or omitted -> drop
    const c = entry.contents ?? {};
    out.set(hash.toUpperCase(), {
      hash: hash.toUpperCase(),
      account: String(entry.block_account ?? c.account ?? ""),
      previous: String(c.previous ?? "").toUpperCase(),
      representative: String(c.representative ?? ""),
      balance: BigInt(c.balance ?? "0"),
      link: String(c.link ?? "").toUpperCase(),
      // "confirmed" is the node's own view and is NOT signature-covered. It is
      // reported so a caller can wait for it, but nothing security-relevant
      // rests on it alone: the money is proven by the signed balance delta, and
      // a Nano send is irreversible once its successor block exists, which is
      // exactly what the receipt block is.
      confirmed: String(entry.confirmed ?? "").toLowerCase() === "true",
      timestamp: Number(entry.local_timestamp ?? 0) || 0,
      height: Number(entry.height ?? 0) || 0,
    });
  }
  return out;
}

export async function getBlock(hash: string): Promise<VerifiedBlock | null> {
  return (await getBlocks([hash])).get(hash.toUpperCase()) ?? null;
}

/**
 * The native XNO amount a block moved, derived from the SIGNED balances of the
 * block and its predecessor. Positive = sent, negative = received.
 * Returns null when the predecessor is unavailable (an open block has none, and
 * an open block can never be a send).
 */
export async function sentAmount(block: VerifiedBlock): Promise<bigint | null> {
  if (/^0{64}$/.test(block.previous)) return null; // open block: received, never sent
  const prev = await getBlock(block.previous);
  if (!prev) return null;
  if (prev.account.toLowerCase() !== block.account.toLowerCase()) return null;
  return prev.balance - block.balance;
}

export interface AccountInfo {
  frontier: string | null;
  balance: bigint;
  representative: string;
  height: number;
}

export async function accountInfo(account: string): Promise<AccountInfo> {
  try {
    const info = await rpc({ action: "account_info", account, representative: "true" });
    return {
      frontier: info.frontier ?? null,
      balance: BigInt(info.balance ?? "0"),
      representative: info.representative ?? account,
      height: Number(info.block_count ?? 0) || 0,
    };
  } catch {
    // An account that has never received is not an error, it is unopened.
    return { frontier: null, balance: 0n, representative: account, height: 0 };
  }
}
