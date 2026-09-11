// Server-side wiring for the token fold: environment, an RPC-backed block
// source, and a short cache. The replay itself lives in core/fold.ts, which has
// no environment in it, so the browser runs exactly the same computation.

import { NanoRpcSource } from "../vendor/hodl/indexer/blockSource.ts";
import { foldAccounts, watchSet, stateOf, opApplied, type Fold } from "./fold.ts";
import { ANCHOR_PUB } from "../vendor/hodl/core/anchor.ts";
import * as nanocurrency from "nanocurrency";
import { env, loadEnv } from "./env.ts";
import { rpcKey } from "./rpc.ts";

export { stateOf, opApplied, type Fold };

loadEnv();

/** Accounts that seed discovery: the parties holderPay knows about by config,
 * plus anything the caller names, plus WATCH_EXTRA for accounts that traded the
 * token outside holderPay. */
function seeds(extra: string[]): string[] {
  const list = [
    env("CREATOR_ADDRESS"),
    env("MERCHANT_ADDRESS"),
    env("HOLDERPAY_ANCHOR_ADDRESS"),
    ...extra,
    ...env("WATCH_EXTRA").split(/[,\s]+/).filter(Boolean),
  ];
  // Opt-in wider discovery. holderPay's own anchor only knows accounts that
  // used holderPay; hodlgame's anchor knows everyone who ever launched or
  // traded ANY token, which is what makes "accept all tokens" mean the whole
  // universe rather than just ours. It is off by default because folding that
  // many chains is slow, and discovery only ever ADDS candidates -- replay
  // still validates every op on its own merits, so a wider set changes how
  // much we can see, never what is true.
  if (env("DISCOVER_HODLGAME") === "1") {
    try {
      list.push(nanocurrency.deriveAddress(ANCHOR_PUB, { useNanoPrefix: true }));
    } catch {
      /* malformed anchor constant: skip rather than fail the fold */
    }
  }
  return list.filter(Boolean);
}

export async function fold(extraAccounts: string[] = []): Promise<Fold> {
  const source = new NanoRpcSource(rpcKey());
  const anchor = env("HOLDERPAY_ANCHOR_ADDRESS");
  const accounts = (await watchSet(source, seeds(extraAccounts)))
    // The anchor's own chain carries no ops -- it only exists to be greeted.
    .filter((a) => a !== anchor);
  return foldAccounts(source, accounts);
}

// A fold costs a burst of RPC calls, so a short cache keeps a polling page (and
// the websocket path, which invalidates on every relevant confirmation) from
// hammering the endpoint. The TTL is deliberately short: a payment has to show
// up quickly, and `bustFold` makes the common case immediate anyway.
let cached: { fold: Fold; key: string } | null = null;
let inflight: Promise<Fold> | null = null;
const FOLD_TTL_MS = 4000;

export async function currentFold(extraAccounts: string[] = [], force = false): Promise<Fold> {
  const key = [...extraAccounts].sort().join(",");
  if (!force && cached && cached.key === key && Date.now() - cached.fold.at < FOLD_TTL_MS) return cached.fold;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const f = await fold(extraAccounts);
      cached = { fold: f, key };
      return f;
    } finally {
      inflight = null;
    }
  })();
  return inflight;
}

/** Invalidate the cache -- called when the websocket sees a relevant block. */
export function bustFold(): void {
  cached = null;
}
