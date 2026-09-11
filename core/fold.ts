// The token fold, with no environment attached -- so the identical code runs on
// the server and in the buyer's browser.
//
// This is what makes holderPay's central claim checkable rather than merely
// asserted: the page does not ask the server whether a token payment is valid,
// it replays the ledger itself from the public endpoint and compares. A server
// that answers "granted" for a transfer that does not apply is caught by the
// visitor's own machine.

import {
  MultiIndexer,
  type IndexedEvent,
  type LaunchMeta,
  metaMapResolver,
} from "../vendor/hodl/indexer/multiIndexer.ts";
import { fixpointOrder } from "../vendor/hodl/indexer/replay.ts";
import { tokenState, type MultiState } from "../vendor/hodl/core/multi.ts";
import type { State } from "../vendor/hodl/core/state.ts";
import type { BlockSource, CounterpartyReader } from "../vendor/hodl/indexer/blockSource.ts";

export interface Fold {
  state: MultiState;
  /** Carrier block hash (upper hex) -> the event that applied with it. Both
   * halves of a fragment pair map to the same event. */
  appliedByCarrier: Map<string, IndexedEvent>;
  /** Carrier block hash -> why the op did NOT apply. */
  rejectedByCarrier: Map<string, string>;
  accounts: string[];
  at: number;
}

function carriersOf(e: IndexedEvent): string[] {
  const hashes = e.carriers && e.carriers.length ? e.carriers : [e.hash];
  return hashes.map((h) => h.toUpperCase());
}

/**
 * Which accounts to replay.
 *
 * Seeds are the accounts we already know matter (creator, merchant, the buyer,
 * holderPay's discovery anchor). Each seed's counterparties are added, because
 * anyone who paid a holderPay wallet or greeted the anchor is a candidate
 * participant. Discovery can only ADD candidates: every op is still validated
 * on its own merits during replay, so appearing in the set buys an attacker
 * nothing.
 *
 * The honest limit runs the other way. An account that traded this token
 * without ever touching any seed is invisible here, and its ops are missing
 * from the fold. That is conservative for payments -- a missing buy makes a
 * payer look POORER, so it can cause a real payment to fail verification, never
 * a fake one to pass -- but it does mean this fold can lag a wider indexer's
 * view. Pass the accounts you know about in `seeds`.
 */
export async function watchSet(reader: CounterpartyReader, seeds: string[]): Promise<string[]> {
  const set = new Set<string>(seeds.filter(Boolean));
  const hops = await Promise.all(
    seeds.filter(Boolean).map(async (a) => {
      try {
        return await reader.counterparties(a);
      } catch {
        return { inbound: [], outbound: [] };
      }
    })
  );
  for (const cp of hops) {
    for (const h of cp.inbound) set.add(h.sender);
    for (const a of cp.outbound) set.add(a);
  }
  return [...set].filter(Boolean).sort();
}

/** Fold the given accounts' chains into token state. Pure given the blocks. */
export async function foldAccounts(
  source: BlockSource,
  accounts: string[],
  meta?: Map<string, LaunchMeta>
): Promise<Fold> {
  const indexer = new MultiIndexer(source, meta ? metaMapResolver(meta) : undefined);
  const events = await indexer.collectEvents(accounts);

  const appliedByCarrier = new Map<string, IndexedEvent>();
  const { state, invalid } = fixpointOrder(events as any, (e: any) => {
    for (const h of carriersOf(e as IndexedEvent)) appliedByCarrier.set(h, e as IndexedEvent);
  });

  const rejectedByCarrier = new Map<string, string>();
  for (const bad of invalid) {
    const e = events[bad.index];
    if (!e) continue;
    for (const h of carriersOf(e)) rejectedByCarrier.set(h, bad.reason);
  }

  return { state, appliedByCarrier, rejectedByCarrier, accounts, at: Date.now() };
}

export function stateOf(f: Fold, tokenId: string): State {
  return tokenState(f.state, tokenId.toLowerCase());
}

/** Did this carrier block's op apply, under this token? The answer core/verify
 * needs for the token lane. Silence is never treated as validity. */
export function opApplied(
  f: Fold,
  tokenId: string,
  carrierHash: string
): { applied: boolean; reason: string } {
  const key = carrierHash.toUpperCase();
  const ev = f.appliedByCarrier.get(key);
  if (ev) {
    if (ev.tokenId.toLowerCase() !== tokenId.toLowerCase()) {
      return { applied: false, reason: "carrier applied under a different token" };
    }
    return { applied: true, reason: "applied in replay" };
  }
  const why = f.rejectedByCarrier.get(key);
  if (why) return { applied: false, reason: why };
  return {
    applied: false,
    reason: "not present in this verifier's replay yet (unwatched account, or not yet confirmed)",
  };
}
