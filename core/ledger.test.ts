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

import {
  currentFold,
  bustFold,
  waitingReplays,
  FoldBusyError,
  MAX_CONCURRENT_REPLAYS,
  MAX_WAITING_LOOKUPS,
  MAX_WAITING_PAYMENTS,
} from "./ledger.ts";
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

/** Run `n` replays that hold every slot until released; returns their releases. */
async function holdEverySlot(load: (accounts: string[]) => Promise<Fold>, prefix: string) {
  const held = Array.from({ length: MAX_CONCURRENT_REPLAYS }, (_, i) =>
    currentFold([`${prefix}${i}`], false, load)
  );
  await tick();
  return held;
}

/** Release every replay, in order, until all the given folds have settled. */
async function drain(releases: Array<() => void>, folds: Array<Promise<unknown>>) {
  let done = 0;
  const settled = Promise.allSettled(folds);
  let finished = false;
  settled.then(() => (finished = true));
  while (!finished) {
    while (done < releases.length) releases[done++]();
    await tick();
  }
  return settled;
}

test("the lookup line is bounded: when it is full a lookup is refused at once, not queued", async () => {
  bustFold();
  const { load, calls, releases } = perCallLoad();
  const held = await holdEverySlot(load, "nano_h");
  const queued = Array.from({ length: MAX_WAITING_LOOKUPS }, (_, i) => currentFold([`nano_q${i}`], false, load));
  await tick();
  assert.deepEqual(waitingReplays(), { payment: 0, lookup: MAX_WAITING_LOOKUPS });

  // Before the fix the 1001st caller just joined the end of an unbounded line.
  await assert.rejects(currentFold(["nano_over"], false, load), (e: unknown) => {
    assert.ok(e instanceof FoldBusyError);
    assert.equal(e.priority, "lookup");
    assert.ok(e.retryAfterSeconds > 0);
    return true;
  });
  assert.deepEqual(waitingReplays(), { payment: 0, lookup: MAX_WAITING_LOOKUPS }, "a refusal takes no place");

  await drain(releases, [...held, ...queued]);
  assert.equal(calls.length, MAX_CONCURRENT_REPLAYS + MAX_WAITING_LOOKUPS);
  assert.ok(!calls.some((c) => c[0] === "nano_over"), "the refused set was never replayed");

  // And the refused set is not stuck in the Map: asking again later replays it.
  const again = perCallLoad();
  const later = currentFold(["nano_over"], false, again.load);
  await tick();
  again.releases[0]();
  assert.deepEqual((await later).accounts, ["nano_over"]);
  bustFold();
});

test("a payment check is never behind waiting lookups: it gets the next free slot", async () => {
  bustFold();
  const { load, calls, releases } = perCallLoad();
  const held = await holdEverySlot(load, "nano_h");
  const lookups = Array.from({ length: MAX_WAITING_LOOKUPS }, (_, i) => currentFold([`nano_q${i}`], false, load));
  const payment = currentFold(["nano_payer"], false, load, "payment");
  await tick();
  assert.deepEqual(waitingReplays(), { payment: 1, lookup: MAX_WAITING_LOOKUPS });

  releases[0]();
  await tick();
  assert.deepEqual(calls[MAX_CONCURRENT_REPLAYS], ["nano_payer"], "the payer's replay runs before any lookup");

  await drain(releases, [...held, ...lookups, payment]);
  assert.deepEqual((await payment).accounts, ["nano_payer"]);
  bustFold();
});

test("a full lookup line does not refuse a payment check", async () => {
  bustFold();
  const { load, releases } = perCallLoad();
  const held = await holdEverySlot(load, "nano_h");
  const lookups = Array.from({ length: MAX_WAITING_LOOKUPS }, (_, i) => currentFold([`nano_q${i}`], false, load));
  await assert.rejects(currentFold(["nano_x"], false, load), FoldBusyError);
  const payment = currentFold(["nano_payer"], false, load, "payment");
  await tick();
  assert.equal(waitingReplays().payment, 1);
  await drain(releases, [...held, ...lookups, payment]);
  assert.deepEqual((await payment).accounts, ["nano_payer"]);
  bustFold();
});

test("the payment line is bounded too", async () => {
  bustFold();
  const { load, releases } = perCallLoad();
  const held = await holdEverySlot(load, "nano_h");
  const payments = Array.from({ length: MAX_WAITING_PAYMENTS }, (_, i) =>
    currentFold([`nano_p${i}`], false, load, "payment")
  );
  await assert.rejects(currentFold(["nano_p_over"], false, load, "payment"), (e: unknown) => {
    assert.ok(e instanceof FoldBusyError);
    assert.equal(e.priority, "payment");
    return true;
  });
  await drain(releases, [...held, ...payments]);
  bustFold();
});

test("a payment caller joining a waiting lookup replay moves it ahead of the other lookups", async () => {
  bustFold();
  const { load, calls, releases } = perCallLoad();
  const held = await holdEverySlot(load, "nano_h");
  const lookups = Array.from({ length: 3 }, (_, i) => currentFold([`nano_q${i}`], false, load));
  // A stranger's GET /api/tokens?account=payer got there first, as a lookup.
  const strangers = currentFold(["nano_payer"], false, load);
  const payment = currentFold(["nano_payer"], false, load, "payment");
  await tick();
  assert.deepEqual(waitingReplays(), { payment: 1, lookup: 3 });

  releases[0]();
  await tick();
  assert.deepEqual(calls[MAX_CONCURRENT_REPLAYS], ["nano_payer"]);
  await drain(releases, [...held, ...lookups, strangers, payment]);
  assert.equal(await strangers, await payment, "still one replay for the one set");
  assert.equal(calls.filter((c) => c[0] === "nano_payer").length, 1);
  bustFold();
});

test("bustFold keeps a replay that is still waiting for a slot: no duplicate replay, and it is cached", async () => {
  bustFold();
  const { load, calls, releases } = perCallLoad();
  const held = await holdEverySlot(load, "nano_h");
  const waitingFold = currentFold(["nano_w"], false, load);
  await tick();
  assert.equal(waitingReplays().lookup, 1);

  bustFold();
  // A caller after the bust joins the waiting replay; it has read nothing yet,
  // so it is as fresh as a new one. Before the fix this queued a second replay.
  const afterBust = currentFold(["nano_w"], false, load);
  assert.deepEqual(waitingReplays(), { payment: 0, lookup: 1 });

  await drain(releases, [...held, waitingFold, afterBust]);
  assert.equal(await waitingFold, await afterBust);
  assert.equal(calls.filter((c) => c[0] === "nano_w").length, 1, "one replay of nano_w, not two");

  // It started after the bust, so it is the cached answer.
  const cachedFold = await currentFold(["nano_w"], false, async () => {
    throw new Error("must be served from the cache");
  });
  assert.equal(cachedFold, await waitingFold);
  bustFold();
});

test("bustFold still drops a replay that already started, even while others wait", async () => {
  bustFold();
  const { load, calls, releases } = perCallLoad();
  const held = await holdEverySlot(load, "nano_h");
  const waitingFold = currentFold(["nano_w"], false, load);
  await tick();
  bustFold();
  // nano_h0 was running at the bust: asking again must not join it.
  const again = currentFold(["nano_h0"], false, load);
  await drain(releases, [...held, waitingFold, again]);
  assert.equal(calls.filter((c) => c[0] === "nano_h0").length, 2);
  bustFold();
});
