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
//
// WHICH ACCOUNTS WERE FOLDED IS PART OF THE ANSWER, NOT AN OPTIMISATION.
// `extraAccounts` is the buyer's own account, passed in from `body.payer` on
// POST /api/verify and POST /api/access. core/fold.ts states the consequence of
// leaving it out: "An account that traded this token without ever touching any
// seed is invisible here, and its ops are missing from the fold ... it can cause
// a real payment to fail verification". So a fold computed for one account set
// does not answer another caller's question, and `cached` is keyed on the set
// for exactly that reason. `inflight` once was not: whoever arrived while any fold
// was running got that fold, whatever accounts it covered. Two buyers checking
// out within the same few seconds -- or one buyer's page polling while the
// other's request runs -- was enough: the second got a replay with the first
// buyer's seed and not their own, `opApplied` found no carrier for their
// transfer, and `tokenLane` reported "not present in this verifier's replay
// yet" for a confirmed token payment they had already made.
//
// In-flight folds are kept in a Map keyed by the account set, so interleaved
// callers for a, b, a cost two replays, not three. Distinct account sets each
// need their own replay (about 145 RPC calls each), and GET /api/tokens and
// /api/token are unauthenticated, so at most MAX_CONCURRENT_REPLAYS of them run
// at once; the rest wait for a slot. They are still entered in the Map while
// they wait, so a second caller for a waiting set joins it rather than queueing
// another replay.
//
// The waiting line is bounded and has two lanes. A replay asked for by a payment
// check (POST /api/verify and /api/access, through NodeReader) for a validated
// payer within its client's budget (core/admission.ts) waits in the "payment" lane, and every free slot goes to that lane first, so a payer is
// never behind a crowd of lookups. Everything else -- GET /api/tokens, /api/token
// and /api/quote, which anyone can call with any account -- waits in the
// "lookup" lane, which holds at most MAX_WAITING_LOOKUPS; when it is full the
// call is refused at once with FoldBusyError (the server answers 503 with
// Retry-After) instead of joining a line a thousand deep. The payment lane is
// bounded too (MAX_WAITING_PAYMENTS), only so memory cannot grow without limit.
// Joining a replay that is already running or waiting costs no place in line,
// and a payment caller that joins a waiting lookup replay moves it to the
// payment lane.
export type FoldPriority = "payment" | "lookup";

interface Waiter {
  priority: FoldPriority;
  resolve: () => void;
}

interface Inflight {
  key: string;
  promise: Promise<Fold>;
  /** Set while the replay waits for a slot; cleared when it starts. */
  waiter: Waiter | null;
}

export const MAX_CONCURRENT_REPLAYS = 4;
export const MAX_WAITING_LOOKUPS = 8;
export const MAX_WAITING_PAYMENTS = 64;
/** Seconds a refused caller is told to wait before asking again. */
export const FOLD_BUSY_RETRY_AFTER_S = 5;

/** No slot and no room in this caller's lane: nothing was started or queued. */
export class FoldBusyError extends Error {
  readonly retryAfterSeconds = FOLD_BUSY_RETRY_AFTER_S;
  readonly priority: FoldPriority;
  constructor(priority: FoldPriority) {
    super(`too many ledger replays waiting (${priority}); try again shortly`);
    this.name = "FoldBusyError";
    this.priority = priority;
  }
}

let cached: { fold: Fold; key: string; seq: number } | null = null;
const inflight = new Map<string, Inflight>();
// Bumped by `bustFold`. A fold that was already running when the websocket saw
// a relevant block describes the ledger as it was BEFORE that block: it is
// still returned to the caller that asked for it, but it must not become the
// cached answer for the next one, or the bust buys nothing. A replay that is
// still waiting for a slot has not read anything yet, so it takes the
// generation current when it STARTS, and a bust leaves it in place.
let generation = 0;
// Stamped on each replay when it actually starts. A replay only becomes the
// cached answer if no replay that started after it has already been cached, so
// an older fold finishing last (two `force` calls, or a slow and a fast set)
// cannot overwrite newer data.
let replaySeq = 0;
const FOLD_TTL_MS = 4000;

let activeReplays = 0;
const waiting: Record<FoldPriority, Waiter[]> = { payment: [], lookup: [] };
const LANE_CAP: Record<FoldPriority, number> = {
  payment: MAX_WAITING_PAYMENTS,
  lookup: MAX_WAITING_LOOKUPS,
};

/** How many replays wait for a slot in each lane (for tests and diagnostics). */
export function waitingReplays(): Record<FoldPriority, number> {
  return { payment: waiting.payment.length, lookup: waiting.lookup.length };
}

function releaseSlot(): void {
  const next = waiting.payment.shift() ?? waiting.lookup.shift();
  if (next) next.resolve();
  else activeReplays -= 1;
}

function promote(w: Waiter): void {
  const i = waiting.lookup.indexOf(w);
  if (i === -1) return;
  waiting.lookup.splice(i, 1);
  w.priority = "payment";
  waiting.payment.push(w);
}

export async function currentFold(
  extraAccounts: string[] = [],
  force = false,
  // The replay itself, injectable so the cache's rules can be tested without a
  // node: the same seam `foldAccounts(source, ...)` already uses one level down.
  load: (accounts: string[]) => Promise<Fold> = fold,
  // "payment" only for a caller deciding a payment; anything a stranger can
  // trigger with a GET stays "lookup", the default, so it can never crowd one out.
  priority: FoldPriority = "lookup"
): Promise<Fold> {
  const key = [...extraAccounts].sort().join(",");
  if (!force && cached && cached.key === key && Date.now() - cached.fold.at < FOLD_TTL_MS) return cached.fold;
  // Coalesce with a fold that is already running (or waiting for a slot) ONLY
  // when it covers the same accounts.
  const running = inflight.get(key);
  if (!force && running) {
    if (priority === "payment" && running.waiter) promote(running.waiter);
    return running.promise;
  }
  // Take a slot, or a place in this caller's lane, synchronously: a refused
  // caller leaves nothing behind in the Map or the line.
  let waiter: Waiter | null = null;
  let wait: Promise<void> | null = null;
  if (activeReplays < MAX_CONCURRENT_REPLAYS) {
    activeReplays += 1;
  } else {
    if (waiting[priority].length >= LANE_CAP[priority]) throw new FoldBusyError(priority);
    wait = new Promise<void>((resolve) => {
      waiter = { priority, resolve };
    });
    waiting[priority].push(waiter!);
  }
  const entry: Inflight = { key, promise: null as unknown as Promise<Fold>, waiter };
  // In the Map before the replay starts, so its cleanup always finds it.
  inflight.set(key, entry);
  entry.promise = (async () => {
    try {
      if (wait) await wait;
      entry.waiter = null;
      try {
        const startedAt = generation;
        const seq = ++replaySeq;
        const f = await load(extraAccounts);
        if (startedAt === generation && !(cached && cached.seq > seq)) cached = { fold: f, key, seq };
        return f;
      } finally {
        releaseSlot();
      }
    } finally {
      if (inflight.get(key) === entry) inflight.delete(key);
    }
  })();
  return entry.promise;
}

/** Invalidate the cache -- called when the websocket sees a relevant block.
 *
 * The in-flight fold is dropped too. `scripts/e2e.ts` calls this for "a fresh
 * replay each attempt: this is the real check, not a cache", and a `currentFold`
 * that handed back a replay started before the bust was not a fresh one. */
export function bustFold(): void {
  cached = null;
  // Drop every replay that has started. One still waiting for a slot has read
  // nothing yet, so it will be a fresh replay when it runs: it stays in the Map
  // (and in its lane) for callers to join, rather than a caller after the bust
  // queueing a second replay of the same set behind it.
  for (const [key, entry] of inflight) if (!entry.waiter) inflight.delete(key);
  generation += 1;
}
