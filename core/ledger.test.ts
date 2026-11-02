// Tests for the fold cache in core/ledger.ts.
//
// The cache is not a performance detail: `currentFold(extraAccounts)` answers a
// question ABOUT those accounts. core/fold.ts says what happens when the buyer's
// own account is missing from the replay -- "it can cause a real payment to fail
// verification" -- so handing a caller a fold that covers somebody else's
// accounts is the same bug as not folding at all, and it lands on a buyer who
// has already paid.
//
// No node and no network: `currentFold` takes the replay as a parameter.

import { test } from "node:test";
import assert from "node:assert/strict";

import { currentFold, bustFold, MAX_CONCURRENT_REPLAYS } from "./ledger.ts";
import type { Fold } from "./fold.ts";

/** A replay that records which accounts it was asked for and resolves when told. */
function pendingLoad() {
  const calls: string[][] = [];
  let release: (() => void) | null = null;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  const load = async (accounts: string[]): Promise<Fold> => {
    calls.push([...accounts]);
    await gate;
    return {
      state: new Map() as unknown as Fold["state"],
      appliedByCarrier: new Map(),
      rejectedByCarrier: new Map(),
      accounts: [...accounts],
      at: Date.now(),
    };
  };
  return { load, calls, release: () => release!() };
}

test("a fold in flight for one account set is not handed to a caller asking for another", async () => {
  bustFold();
  const { load, calls, release } = pendingLoad();

  // Buyer A's request starts a replay; buyer B's arrives while it is running.
  const a = currentFold(["nano_a"], false, load);
  const b = currentFold(["nano_b"], false, load);
  release();
  const [foldA, foldB] = await Promise.all([a, b]);

  assert.deepEqual(foldA.accounts, ["nano_a"]);
  // Before the fix this was ["nano_a"]: B received A's in-flight fold, which
  // never folded nano_b, so `opApplied` could not find B's carrier block and
  // `tokenLane` reported "not present in this verifier's replay yet" for a
  // confirmed payment.
  assert.deepEqual(foldB.accounts, ["nano_b"]);
  assert.deepEqual(calls, [["nano_a"], ["nano_b"]]);
  bustFold();
});

test("two callers asking for the same accounts still share one replay", async () => {
  bustFold();
  const { load, calls, release } = pendingLoad();

  const a = currentFold(["nano_a"], false, load);
  const b = currentFold(["nano_a"], false, load);
  release();
  const [foldA, foldB] = await Promise.all([a, b]);

  assert.equal(foldA, foldB);
  assert.deepEqual(calls, [["nano_a"]], "the same question must not cost two replays");
  bustFold();
});

test("bustFold drops the fold in flight, so the next call is a fresh replay", async () => {
  bustFold();
  const first = pendingLoad();
  const inFlight = currentFold(["nano_a"], false, first.load);

  // What server/watch.ts does when the websocket reports a relevant block, and
  // what scripts/e2e.ts does for "a fresh replay each attempt, not a cache".
  bustFold();

  const second = pendingLoad();
  const after = currentFold(["nano_a"], false, second.load);
  first.release();
  second.release();
  await Promise.all([inFlight, after]);

  // Before the fix the second call was served the replay that started before
  // the bust, so a payment confirmed in between was still invisible.
  assert.deepEqual(second.calls, [["nano_a"]]);
  bustFold();
});

test("a fold that started before a bust does not become the cached answer", async () => {
  bustFold();
  const stale = pendingLoad();
  const inFlight = currentFold(["nano_a"], false, stale.load);
  bustFold();
  stale.release();
  await inFlight;

  const fresh = pendingLoad();
  const next = currentFold(["nano_a"], false, fresh.load);
  fresh.release();
  await next;
  assert.deepEqual(fresh.calls, [["nano_a"]], "the pre-bust fold must not be cached");
  bustFold();
});

/** A replay whose every call waits for its own release, in call order. */
function perCallLoad() {
  const calls: string[][] = [];
  const releases: Array<() => void> = [];
  const load = (accounts: string[]): Promise<Fold> => {
    calls.push([...accounts]);
    return new Promise<Fold>((resolve) => {
      releases.push(() =>
        resolve({
          state: new Map() as unknown as Fold["state"],
          appliedByCarrier: new Map(),
          rejectedByCarrier: new Map(),
          accounts: [...accounts],
          at: Date.now(),
        })
      );
    });
  };
  return { load, calls, releases };
}

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test("interleaved a, b, a cost two replays, not three", async () => {
  bustFold();
  const { load, calls, release } = pendingLoad();

  const a1 = currentFold(["nano_a"], false, load);
  const b = currentFold(["nano_b"], false, load);
  const a2 = currentFold(["nano_a"], false, load);
  release();
  const [foldA1, foldB, foldA2] = await Promise.all([a1, b, a2]);

  assert.equal(foldA1, foldA2, "the second a joins the a already running");
  assert.deepEqual(foldB.accounts, ["nano_b"]);
  assert.deepEqual(calls, [["nano_a"], ["nano_b"]]);
  bustFold();
});

test("no more than MAX_CONCURRENT_REPLAYS distinct replays run at once; the rest wait", async () => {
  bustFold();
  const { load, calls, releases } = perCallLoad();
  const n = MAX_CONCURRENT_REPLAYS + 3;
  const folds = Array.from({ length: n }, (_, i) => currentFold([`nano_${i}`], false, load));
  // A caller for a set that is waiting for a slot joins it, it does not queue another.
  const joined = currentFold([`nano_${n - 1}`], false, load);
  await tick();
  assert.equal(calls.length, MAX_CONCURRENT_REPLAYS, "only the cap may be replaying");

  // Each finished replay hands its slot to the next waiter, in arrival order.
  releases[0]();
  await tick();
  assert.equal(calls.length, MAX_CONCURRENT_REPLAYS + 1);
  assert.deepEqual(calls[MAX_CONCURRENT_REPLAYS], [`nano_${MAX_CONCURRENT_REPLAYS}`]);

  for (let done = 1; done < n; done++) {
    releases[done]();
    await tick();
  }
  const results = await Promise.all(folds);
  results.forEach((f, i) => assert.deepEqual(f.accounts, [`nano_${i}`]));
  assert.equal(await joined, results[n - 1]);
  assert.equal(calls.length, n, "one replay per distinct set");
  bustFold();
});

test("a failed replay gives its slot back", async () => {
  bustFold();
  const failing = async (): Promise<Fold> => {
    throw new Error("rpc down");
  };
  const failures = Array.from({ length: MAX_CONCURRENT_REPLAYS + 1 }, (_, i) =>
    currentFold([`nano_f${i}`], false, failing).catch(() => "failed")
  );
  assert.deepEqual(await Promise.all(failures), Array(MAX_CONCURRENT_REPLAYS + 1).fill("failed"));

  const { load, calls, releases } = perCallLoad();
  const next = Array.from({ length: MAX_CONCURRENT_REPLAYS }, (_, i) => currentFold([`nano_g${i}`], false, load));
  await tick();
  assert.equal(calls.length, MAX_CONCURRENT_REPLAYS, "every slot is free again");
  releases.forEach((r) => r());
  await Promise.all(next);
  bustFold();
});

test("with force, an older fold finishing last does not overwrite the newer cached one", async () => {
  bustFold();
  const { load, releases } = perCallLoad();
  const older = currentFold(["nano_a"], true, load);
  const newer = currentFold(["nano_a"], true, load);
  await tick();
  releases[1]();
  const newerFold = await newer;
  releases[0]();
  const olderFold = await older;
  assert.notEqual(olderFold, newerFold);

  const cachedFold = await currentFold(["nano_a"], false, async () => {
    throw new Error("must be served from the cache");
  });
  assert.equal(cachedFold, newerFold, "the cache keeps the fold that started later");
  bustFold();
});
