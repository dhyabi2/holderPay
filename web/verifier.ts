// The buyer's own verifier, running in the buyer's own browser.
//
// This is the part that makes "the backend cannot grant access" a checkable
// statement rather than a promise. The page never takes the server's verdict at
// face value: it fetches the same blocks, re-checks the same signatures, replays
// the same token ledger, and runs the SAME core/verify.ts. If the two disagree,
// the page believes itself and says so.
//
// Everything here is public-data-only. No key, no session, no privilege.

import { NanoRpcSource } from "../vendor/hodl/indexer/blockSource.ts";
import { verifyFetchedBlock } from "../vendor/hodl/core/blockVerify.ts";
import { foldAccounts, watchSet, opApplied, stateOf, type Fold } from "../core/fold.ts";
import type { ChainReader, VerifiedBlock } from "../core/block.ts";
import { verifyPayment, type Verdict } from "../core/verify.ts";
import { backingOf, circulatingOf } from "../core/valuation.ts";
import type { Policy } from "../core/policy.ts";
import { rpc } from "./rpc-browser.ts";

/** Blocks by hash, verified locally. Identical checks to core/chain.ts. */
export class BrowserReader implements ChainReader {
  private memo = new Map<string, VerifiedBlock | null>();
  private fold: Fold | null = null;
  private seeds: string[];
  private tokenId: string;

  constructor(tokenId: string, seeds: string[]) {
    this.tokenId = (tokenId ?? "").toLowerCase();
    this.seeds = seeds.filter(Boolean);
  }

  async getBlock(hash: string): Promise<VerifiedBlock | null> {
    const key = (hash ?? "").toUpperCase();
    if (this.memo.has(key)) return this.memo.get(key)!;
    if (!/^[0-9A-F]{64}$/.test(key)) return null;
    const res = await rpc({ action: "blocks_info", hashes: [key], json_block: "true", include_not_found: "true" });
    const entry = res?.blocks?.[key];
    let out: VerifiedBlock | null = null;
    // The local signature check is the whole point: a proxy can withhold a
    // block, but a block it hands back must hash and verify or it is dropped.
    if (entry && verifyFetchedBlock(key, entry)) {
      const c = entry.contents ?? {};
      out = {
        hash: key,
        account: String(entry.block_account ?? c.account ?? ""),
        previous: String(c.previous ?? "").toUpperCase(),
        representative: String(c.representative ?? ""),
        balance: BigInt(c.balance ?? "0"),
        link: String(c.link ?? "").toUpperCase(),
        confirmed: String(entry.confirmed ?? "").toLowerCase() === "true",
        timestamp: Number(entry.local_timestamp ?? 0) || 0,
        height: Number(entry.height ?? 0) || 0,
      };
    }
    this.memo.set(key, out);
    return out;
  }

  /** Replay the token ledger here, in the page. Cached per verifier instance
   * because it costs a burst of RPC round-trips. */
  async ensureFold(force = false): Promise<Fold> {
    if (this.fold && !force) return this.fold;
    const source = new NanoRpcSource("");
    const accounts = await watchSet(source, this.seeds);
    this.fold = await foldAccounts(source, accounts);
    return this.fold;
  }

  async tokenOpApplied(tokenId: string, carrierHash: string) {
    return opApplied(await this.ensureFold(), tokenId, carrierHash);
  }

  /**
   * Collateral behind a token, replayed HERE.
   *
   * An offer that accepts any token derives what is owed from this number, so
   * without it the page could not re-check such a payment for itself -- it
   * would have to take the server's word, which is the one thing this file
   * exists to avoid.
   */
  async tokenBacking(tokenId: string): Promise<{ backing: bigint; circulating: bigint } | null> {
    const st = stateOf(await this.ensureFold(), tokenId);
    return st.launched ? { backing: backingOf(st), circulating: circulatingOf(st) } : null;
  }

  async tokenState() {
    return stateOf(await this.ensureFold(), this.tokenId);
  }
}

export interface CrossCheck {
  mine: Verdict;
  theirs: Verdict | null;
  /** True when the server's answer matches what this browser computed. */
  agrees: boolean;
  /** The dangerous case: the server says yes, the chain says no. */
  serverOverclaimed: boolean;
  differences: string[];
}

/** Compare only the fields that decide access. Cosmetic drift (a reason string,
 * a timestamp the node had not filled in yet) is not a disagreement. */
export function crossCheck(mine: Verdict, theirs: Verdict | null): CrossCheck {
  if (!theirs) {
    return { mine, theirs, agrees: false, serverOverclaimed: false, differences: ["no answer from the server"] };
  }
  const differences: string[] = [];
  const cmp = (label: string, a: unknown, b: unknown) => {
    if (String(a ?? "") !== String(b ?? "")) differences.push(`${label}: server says ${b}, this browser says ${a}`);
  };
  cmp("granted", mine.granted, theirs.granted);
  cmp("payer", mine.payer, theirs.payer);
  cmp("asset", mine.asset, theirs.asset);
  cmp("paid", mine.paid, theirs.paid);
  cmp("payment", mine.payment, theirs.payment);
  cmp("grant", mine.grant, theirs.grant);
  return {
    mine,
    theirs,
    agrees: differences.length === 0,
    serverOverclaimed: !!theirs.granted && !mine.granted,
    differences,
  };
}

/** Verify a receipt locally and compare with whatever the server claimed. */
export async function verifyLocally(
  policy: Policy,
  receiptHash: string,
  reader: BrowserReader,
  serverVerdict: Verdict | null
): Promise<CrossCheck> {
  const mine = await verifyPayment(policy, receiptHash, reader);
  return crossCheck(mine, serverVerdict);
}
