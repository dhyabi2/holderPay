// The server-side ChainReader: locally-verified blocks from rpc.nano.to, plus
// a token-ledger replay for the L2 lane.
//
// Nothing in here can decide a verdict. It only supplies facts, each of which
// is re-derivable by anyone with the same public endpoint.

import { getBlocks } from "./chain.ts";
import type { ChainReader, VerifiedBlock } from "./block.ts";
import { currentFold, stateOf, opApplied } from "./ledger.ts";

export class NodeReader implements ChainReader {
  // Per-instance memo: one verify call touches the receipt, the payment and
  // (token lane) the fragment underneath it, and the balance check walks back
  // one more. Re-fetching the same hash within a call is pure waste.
  private memo = new Map<string, VerifiedBlock | null>();
  private extraAccounts: string[];

  constructor(extraAccounts: string[] = []) {
    this.extraAccounts = extraAccounts;
  }

  async getBlock(hash: string): Promise<VerifiedBlock | null> {
    const key = (hash ?? "").toUpperCase();
    if (this.memo.has(key)) return this.memo.get(key)!;
    const got = (await getBlocks([key])).get(key) ?? null;
    this.memo.set(key, got);
    return got;
  }

  /** Prefetch several hashes in one RPC round-trip. */
  async warm(hashes: string[]): Promise<void> {
    const want = hashes.map((h) => h.toUpperCase()).filter((h) => !this.memo.has(h));
    if (want.length === 0) return;
    const got = await getBlocks(want);
    for (const h of want) this.memo.set(h, got.get(h) ?? null);
  }

  async tokenOpApplied(tokenId: string, carrierHash: string) {
    const f = await currentFold(this.extraAccounts);
    return opApplied(f, tokenId, carrierHash);
  }

  /** Token balance as this verifier computes it. For display, not verdicts. */
  async tokenBalance(tokenId: string, account: string): Promise<bigint> {
    const f = await currentFold(this.extraAccounts);
    return stateOf(f, tokenId).balances.get(account) ?? 0n;
  }
}
