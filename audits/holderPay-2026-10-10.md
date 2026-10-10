# holderPay - audit 2026-10-10

The verdict path is unchanged. One drifted README claim corrected; everything
else in this pass came back clean, including the two bundles that have been the
recurring defect in this repository.

## Checked

- `npm ci && npm test`: **48 passed, 0 failed** (flow 5, multitoken 20,
  verify 23).
- **Both committed bundles are current, which is the failure this repository
  keeps having.** `api/[...path].js` shipped the crash #3 fixed (#7), and
  `public/pay.js` has twice been a stale artefact (`fix/rebuild-the-page-bundle`,
  `fix/the-page-ships-a-stale-bundle`). Re-derived rather than assumed:
  - `node scripts/build-web.mjs` rewrites `web/pay.js` **byte-identically**
    (`git status` empty after the build), and `public/pay.js` is byte-identical
    to `web/pay.js` at HEAD.
  - The serverless function was rebuilt with `scripts/build-vercel.mjs`'s exact
    esbuild options to a throwaway outfile (its catalog-baking steps refuse to
    run in a checkout with no `data/catalog.json`, by design, so they were not
    invoked and nothing in the tree was touched): `diff` against the committed
    `api/[...path].js` is **empty**. The deployment matches the sources.
- `core/verify.ts` end to end, which is the only thing that grants access.
  The receipt commits to the policy id under the buyer's own signature; the
  payment is the receipt's `previous`, and Nano's no-fork rule makes that
  pairing unique, so neither block can be replayed for a second policy or a
  second receipt. Both lanes are decided by what the payment block *is*, never
  by what the caller says, and the XNO lane is settled first because a send
  names its destination unambiguously while a fragment-A marker is one byte.
- Amounts: every quantity on the XNO path is `bigint`. `sentAmount`
  (`core/block.ts:76`) derives the amount from the **signed** balances of the
  block and its predecessor rather than from any node summary field, and
  refuses a predecessor on another account. `core/valuation.ts` is BigInt
  throughout; the pro-rata `backedValue` divides with integer division, which
  rounds against the payer and so can only refuse, never grant short. No
  float touches an amount anywhere in `core/`.
- `core/policy.ts`: `policyIsIntact` is recomputed from the canonical shape, so
  an `accept[]` entry, an `acceptAny`, a price or an expiry altered in transit
  changes the id and is refused. `acceptAny` is hashed only when present, so
  v1 offers still hash to the ids their on-chain receipts commit to.
  `acceptsXno` and `normalizeAccept` drop an unparseable price instead of
  throwing, which is what used to crash verification *after* a buyer had paid.
- Secrets: `.env.example` carries no value (every seed, key and token is
  empty), and `git grep` finds no 64-hex literal in it or the README.
  `scripts/build-vercel.mjs` refuses to finish a build whose artefacts contain
  a `.env` secret, and refuses a build whose leak check found nothing to look
  for - so the check cannot pass by being broken.
- README against the tree: the quickstart's commands all exist in
  `package.json`; `npm run dev`'s advertised `http://localhost:8787` matches
  `server/index.ts:43`; the claim that the build fails on a leaked secret
  points at the script that really does it; the only external links are
  `rpc.nano.to` (the owner's single-RPC rule, enforced in `core/rpc.ts`) and
  the hodlgame repository the vendored protocol comes from.

## Found and fixed

**The README advertised 47 offline tests; `npm test` runs 48.** `README.md:68`
said `# 47 offline tests: one per security claim`. The 48th is "a price that is
not an integer denies instead of throwing", which arrived with the
`priceXno`-parse fix. The whole argument of this repository is that its claims
can be checked rather than believed, and the first number a reader checks was
wrong.

Corrected to 48. **No test can fail without this fix and pass with it**: the
number is in prose and nothing in the suite reads it. `nano-receipt-ledger`
pins the same claim with a `ReadmeCounts` test that counts the suite and fails
on drift; the equivalent here would be a new `core/*.test.ts` counting
top-level `test(` call sites (all 48 are top level, so the call sites are the
count). That is a guard rather than a defect fix, so it is noted for the owner
rather than built here.

## Could not verify

- **An expired offer still grants when the node reports no timestamp**
  (`core/verify.ts:110`): the check is `policy.expires > 0 && receipt.timestamp
  > 0 && ...`, and `timestamp` is the node's `local_timestamp`, which is 0 for
  any block it did not see live. Reported 09-30, 10-02, 10-03 and 10-08 and
  left as the owner's call each time - Nano blocks carry no timestamp, so the
  only strict alternative is to deny a payment whenever an RPC happens not to
  report one, which is an access-policy decision rather than an audit's.
  Unchanged, and deliberately not re-escalated.
- `verifyPayment`'s `now` parameter is documented "for the expiry check only"
  and is not read by the function; expiry is measured on the receipt's own
  timestamp, which is the right clock. Dead parameter, no behavioural effect,
  not touched (a rename or removal is the noise this audit is told to avoid).
- Nothing here reached mainnet. The token lane, the auto-swap lane and
  `scripts/e2e.ts` all need funded keys, which this session does not and must
  not have; the offline suite's in-memory ledger is what was exercised.
  `scripts/check-deploy.mjs` was not run against the hosted page either - it is
  a black-box check of a live deployment, not of this tree.
