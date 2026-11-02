# holderPay — audit 2026-10-14

Previous audit 2026-10-12 (`d05cb67`, a v1 `priceToken` that is not an integer). HEAD
audited: `main` at `d05cb67`. Read under one question: can an agent pay in XNO (or in a
token) with this today without being hurt?

Baseline on `main`, before any change:

```
$ npm ci && npm test                      # 51 passed, 0 failed
$ node scripts/build-web.mjs              # rewrites web/pay.js byte-identically
```

With this branch: **59 passed**, `build-web.mjs` still byte-identical (`core/ledger.ts`
imports `node:fs` and is not in the browser bundle). 55 of those came with the first commit;
the follow-up below added four more.

Every prior audit read the verdict as a *pure function* — policy, receipt, reader — and
that reading is still sound. This run read the one input that function does not control:
**which accounts the reader actually replayed**, and who decides that when two buyers are
checking out at the same time.

## Checked

- **`core/verify.ts` end to end**, unchanged by this branch. The receipt commits to the
  policy id under the buyer's own signature, the payment is the receipt's `previous`, and
  Nano's no-fork rule makes that pairing unique. Both lanes are still decided by what the
  payment block *is* (`xnoLane` by the link's destination, `tokenLane` by a decoded
  fragment pair whose two halves burn exactly 1 raw), never by what the caller claims.
- **No float touches an amount.** Every quantity on both lanes is `bigint`. The AcceptAny
  pro-rata `backedValue` (`verify.ts:321`) is integer division, which rounds against the
  payer and so can only refuse, never grant short.
- **Token ids agree across the two reader calls.** `assembleFrag` returns a lower-case id
  (`fraglink.ts:28,134`), `opApplied` compares case-insensitively (`fold.ts:128`) and
  `stateOf` lower-cases its key (`fold.ts:111`), so the `tokenOpApplied(assembled.tokenId)`
  / `tokenBacking(paidId)` pair cannot read two different tokens.
- **`POST /api/access`** still requires both a chain verdict and a signature by the paying
  account over `authDigest(policyId, receipt, challenge)`, and the challenge is burned only
  on success (`server/index.ts:722`), so a failed attempt does not consume an honest
  payer's challenge.
- **Secrets:** `.env.example` carries no value and `git grep -nE '[0-9a-fA-F]{64}'` over
  the tree and over `git log -p` finds no key material. Unchanged.

## Found and fixed — a fold in flight was handed to a caller that had asked a different question

`core/fold.ts:46-52` states the rule this depends on:

> An account that traded this token without ever touching any seed is invisible here, and
> its ops are missing from the fold. That is conservative for payments — a missing buy
> makes a payer look POORER, so it can cause a real payment to fail verification … Pass
> the accounts you know about in `seeds`.

That is exactly what the server does: both money routes read the buyer's account off the
request and pass it down.

```
server/index.ts:700  POST /api/access  new NodeReader(body?.payer ? [String(body.payer)] : [])
server/index.ts:674  POST /api/verify  new NodeReader(body?.payer ? [String(body.payer)] : [])
core/reader.ts:40    tokenOpApplied -> currentFold(this.extraAccounts)
```

`currentFold` keyed its **cache** on that account set — and did not key the **in-flight
promise** on it (`core/ledger.ts:57,63` on `main`):

```ts
let cached: { fold: Fold; key: string } | null = null;
let inflight: Promise<Fold> | null = null;
...
  if (!force && cached && cached.key === key && ...) return cached.fold;
  if (inflight) return inflight;            // <- no key compare
```

So whoever arrived while *any* fold was running received that fold, whatever accounts it
covered. A fold takes a burst of RPC calls over up to 400 chains, so the window is seconds
wide, and two buyers checking out in the same few seconds reach it — as does one buyer's
page polling `/api/verify` while another request runs.

The consequence lands on the token lane, after the money has moved. Buyer B's transfer is
confirmed on chain, but the fold B is handed never replayed B's account, so
`appliedByCarrier` has no entry for B's carrier block and `opApplied` falls through to its
last branch (`fold.ts:131`):

```
{ applied: false, reason: "not present in this verifier's replay yet (unwatched account, or not yet confirmed)" }
```

`tokenLane` turns that into `fail: "token transfer is signed but did not apply in the
ledger: …"` (`verify.ts:283`), `POST /api/access` answers **402 with that reason**, and a
buyer who has paid is told their payment did not happen. It is refuse-only — a fold can
only ever make a payer look poorer, never richer — so this is a real payment refused, not
a fake one accepted.

Measured, with the replay injected so no node is involved
(`core/ledger.test.ts`, test 1 — buyer A's request starts the fold, buyer B's arrives
while it runs):

```
not ok 1 - a fold in flight for one account set is not handed to a caller asking for another
    Expected values to be strictly deep-equal:
    + actual - expected
      [
    +   'nano_a'
    -   'nano_b'
      ]
```

Two further cases fall out of the same line. `bustFold()` — which `server/watch.ts:91`
calls when the websocket reports a relevant block, and which `scripts/e2e.ts:82` calls for
"a fresh replay each attempt: this is the real check, not a cache" — cleared `cached` and
left `inflight` alone, so the next call was served a replay that had started *before* the
block arrived, and that pre-bust replay then became the cached answer for everyone else.

The fix keys the in-flight promise on the same account set the cache is keyed on, and has
`bustFold` drop it:

- two different account sets now cost two replays, which is the price of each caller
  getting an answer to its own question;
- two callers asking for the *same* accounts still share one replay — pinned by test 2,
  which passes before and after, so the fix does not quietly drop the coalescing;
- a fold that started before a bust is still returned to the caller that asked for it, but
  a generation counter stops it becoming the cached answer for the next one.

`currentFold` grew a third parameter, the replay function, defaulting to `fold`. Every one
of its 18 callers is unchanged; it exists so the cache's rules can be tested without a
node, which is the seam `foldAccounts(source, accounts)` already uses one level down.

```
$ node --experimental-strip-types --test core/ledger.test.ts   # without the fix
# tests 4   # pass 1   # fail 3
$ node --experimental-strip-types --test core/ledger.test.ts   # with it
# tests 4   # pass 4   # fail 0
$ npm test                                                     # 55 passed, 0 failed
```

### Follow-up on the same branch — `37d060f`, keyed by set rather than one slot

The first commit held ONE in-flight entry, so interleaved callers for a, b, a started a
third replay: the second `a` arrived after `b` had replaced it. `37d060f` keeps in-flight
folds in a `Map` keyed by the account set, which costs two replays for that sequence rather
than three, and adds two things the single slot had no room for:

- **A cap of `MAX_CONCURRENT_REPLAYS` (4) distinct replays at once**, with the rest waiting
  in arrival order and still joinable from the Map while they wait. Each replay is about 145
  RPC calls and `GET /api/tokens` is unauthenticated, so this bounds the burst. It bounds the
  burst and not the queue, which the comment there says plainly: distinct account sets come
  from caller-supplied parameters, so `waiting` can still grow — one entry per distinct set,
  which is strictly better than one unbounded 145-call replay per distinct set.
- **A start stamp (`replaySeq`) on each replay**, so a fold that started earlier but finished
  later cannot overwrite a newer cached one. Two `force` calls, or a slow set finishing after
  a fast one, hit this.

Re-verified here rather than assumed: `npm test` 59 passed / 0 failed, and
`node scripts/build-web.mjs` leaves `web/pay.js` byte-identical. The baton-passing in
`acquireSlot`/`releaseSlot` is sound — a finishing replay hands its slot to the next waiter
without decrementing, so `activeReplays` stays equal to the slots actually held, and the
release sits in a `finally` so a throwing `load` cannot leak one.

## Could not verify

- **Nothing was run against mainnet.** Every check here is offline: the suite's in-memory
  ledger, the injected replay, and reading. The concurrency window is argued from the cost
  of a fold (one `counterparties` call per seed plus a chain walk over up to 400 accounts)
  rather than timed against the live endpoint, which this session cannot reach with a key.
- **`POST /api/access` carries no rate limit**, while `POST /api/verify` does
  (`server/index.ts:669`, 120/min/ip) and both do the same chain work plus a fold. So the
  limit on the expensive path can be stepped around by calling the sibling route. Not
  touched here — it is a second concern and adding a refusal to the route that hands over
  the goods deserves its own branch and the owner's eye on the limit chosen.
- **`verifyPayment`'s `now` parameter is unused.** The expiry check compares
  `receipt.timestamp` against `policy.expires` (`verify.ts:112`), which is the right clock
  — the buyer's signed receipt, not ours — but the parameter and its doc comment still
  claim otherwise. Left alone: a rename moves no behaviour and the repo does not need the
  noise.
- **An expired offer is granted when the node reports `local_timestamp: 0`**, because the
  expiry check is skipped unless `receipt.timestamp > 0` (`verify.ts:112`). A node that has
  bootstrapped a block without a timestamp answers 0, so this is reachable. Whether to deny
  on an unknown timestamp is a product call about offers that expire, not a defect to patch
  quietly: flagged for the owner rather than changed.
