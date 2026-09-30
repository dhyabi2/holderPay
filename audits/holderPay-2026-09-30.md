# holderPay — audit 2026-09-30

Scope: can an agent pay in XNO and get the access it paid for, today, without being hurt.
First audit of this repository.

## Checked

- `npm ci && npm test`: **47 tests, 47 pass, 0 fail** (`core/verify.test.ts`, `core/flow.test.ts`,
  `core/multitoken.test.ts`), on Node v22.22.2. `npm run build:web` also succeeds — 302 kB bundle,
  and the build's own check reports no key material in it.
- `core/verify.ts` end to end: the whole verdict, both lanes. The order of the checks, and what each
  one refuses.
- `core/proof.ts`: the payment binding (`memoLink`, `isReceiptLink`, `authDigest`, `grantId`).
- `core/block.ts`: `sentAmount`, `sameAccount`, `linkAsAddress`, the `VerifiedBlock` shape.
- `core/reader.ts` and `core/chain.ts`: where the facts a verdict rests on come from.
- Amount handling on every path that decides whether enough was paid.

## Found — nothing that hurts a payer today

The construction holds up and the amount handling is exact. Specifically:

- **No float anywhere on an amount.** Every value that decides a verdict is a `bigint`:
  `VerifiedBlock.balance`, `Lane.paid`, `Lane.price`, the token amount out of `assembleFrag`, and
  the collateral valuation. `paid` and `price` are only ever turned into strings (`.toString()`) at
  the edge of the verdict, for reporting.
- **The amount comes from signed data, not from the caller.** `sentAmount` (`core/block.ts:76-81`)
  derives what a block moved from `prev.balance - block.balance`, both signature-covered, and
  returns `null` when the predecessor is missing or belongs to another account. A receive block
  therefore yields a negative amount and is refused at `core/verify.ts:192-194`, not mistaken for a
  payment.
- **Underpayment is refused** with `lane.paid < lane.price` (`core/verify.ts:173`), and an unconfirmed
  pair never grants (`core/verify.ts:174`) — both blocks must be confirmed (`core/verify.ts:118`).
- **Which lane applies is decided by the block, never by the caller** (`core/verify.ts:121-135`), and
  the comment explaining why the XNO lane is settled first — a fragment-A marker byte collides by
  chance about one link in forty — matches what the code does.
- **The collateral valuation rounds down** (`core/verify.ts:321`), which can only refuse a payment,
  never grant a short one.
- **The token lane denies rather than assumes** when the reader cannot replay the L2 ledger
  (`core/verify.ts:268-274`) or cannot value an unlisted token (`core/verify.ts:291-297`).
- **The policy must match its own id** before anything else is read (`core/verify.ts:83`), so terms
  altered in transit cannot be the terms that get verified.
- **One payment backs exactly one receipt**, by Nano's chain rule rather than by a server-side spent
  table — and holding a receipt hash is not holding the grant, because access is claimed by
  answering a challenge with the paying key (`core/proof.ts:63-87`).

Nothing here needed a code change, so none was made.

## Observations — reported, not changed

1. **An expired offer can still be granted when the node reports no timestamp.** The expiry check is
   `policy.expires > 0 && receipt.timestamp > 0 && receipt.timestamp > policy.expires`
   (`core/verify.ts:110`). `timestamp` comes from `local_timestamp`
   (`core/chain.ts:85`), which is the node's *local* first-seen time and is 0 for any block the node
   did not see live — bootstrapped history, or an RPC that does not report it. When it is 0 the
   expiry check is skipped and a payment made long after the offer expired still grants.
   Not changed: making it deny instead would refuse legitimate paid access whenever the RPC happens
   not to report a timestamp, which is an access-policy decision for the owner, not an audit's.
2. **`verifyPayment`'s `now` parameter is unused.** It is declared and documented as
   "unix seconds, for the expiry check only" (`core/verify.ts:70,76`) but never read in the body —
   expiry is measured against the receipt's own timestamp, which is the right clock for it. The
   parameter is vestigial and the doc comment overstates it. Left alone as a no-op tidy-up that would
   be noise on its own; worth folding into whatever settles point 1.

## Fixed in this PR

The README advertised `npm test # 21 offline tests: one per security claim`; the suite runs **47**.
Corrected, since the number is a claim about the security surface. No code changed.

## Could not verify

- No live payment and no mainnet run: `npm run e2e` moves real XNO on mainnet and was not run.
- `vendor/hodl/` (the hodlgame indexer and `fraglink`) was read only where the token lane calls into
  it — `isFragA` and `assembleFrag`. Its own correctness is out of this repository's scope.
- The browser-side re-check (`web/verifier.ts`, `web/app.ts`) was read but not exercised in a
  browser; the claim that the page runs the same verdict code is consistent with both importing
  `core/verify.ts`, but was not confirmed by running it.
