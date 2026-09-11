// Browser-safe block types and helpers. No node builtins, no RPC, no env --
// so the identical code runs in the server verifier and in the page that
// re-checks the server. Only `nanocurrency` (Ed25519-blake2b) is used.

import * as nanocurrency from "nanocurrency";

export interface VerifiedBlock {
  hash: string;
  account: string;
  previous: string;
  representative: string;
  balance: bigint;
  /** Raw 64-hex link exactly as signed. */
  link: string;
  /** Node-reported confirmation. Advisory only -- not signature-covered. */
  confirmed: boolean;
  /** Node-reported first-seen time (unix seconds); 0 when unknown. */
  timestamp: number;
  /** Height as reported by the node; 0 when unknown. */
  height: number;
}

/** Anything that can hand back locally-verified blocks by hash. Implemented
 * once for the server (core/reader.ts) and once for the browser, so the
 * verdict function in core/verify.ts is shared byte-for-byte. */
export interface ChainReader {
  getBlock(hash: string): Promise<VerifiedBlock | null>;
  /**
   * L2 validity for a hodlgame token op: did this carrier block actually apply
   * in the token's deterministic replay? Optional -- a reader that cannot
   * replay (or a policy with no token lane) simply never gets asked.
   */
  tokenOpApplied?(
    tokenId: string,
    carrierHash: string
  ): Promise<{ applied: boolean; reason: string; merchantBalance?: bigint }>;
  /**
   * Real collateral behind a token, and the supply that has claims on it.
   *
   * Only needed by an offer that accepts ANY token (core/policy.ts, AcceptAny),
   * where the amount owed is derived from backing rather than read off a list.
   * Optional for the same reason tokenOpApplied is: a verifier that cannot
   * replay must refuse such a payment rather than guess at its value.
   */
  tokenBacking?(tokenId: string): Promise<{ backing: bigint; circulating: bigint } | null>;
}

export const ZERO_HASH = "0".repeat(64);

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

export function sameAccount(a: string, b: string): boolean {
  return (a ?? "").replace(/^xrb_/, "nano_").toLowerCase() === (b ?? "").replace(/^xrb_/, "nano_").toLowerCase();
}

/**
 * The native XNO a block moved, from the SIGNED balances of the block and its
 * predecessor. Positive = sent. Null when the predecessor is unavailable or
 * belongs to another account (an open block has none and can never be a send).
 */
export async function sentAmount(reader: ChainReader, block: VerifiedBlock): Promise<bigint | null> {
  if (block.previous === ZERO_HASH || /^0+$/.test(block.previous)) return null;
  const prev = await reader.getBlock(block.previous);
  if (!prev || !sameAccount(prev.account, block.account)) return null;
  return prev.balance - block.balance;
}
