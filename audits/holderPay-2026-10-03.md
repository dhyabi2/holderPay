# holderPay — audit 2026-10-03

Node v22.22.0. `npm ci` clean. `npm test` → **47 pass, 0 fail** before this change, **48 pass,
0 fail** after. No mainnet run: `npm run e2e` moves real XNO and was not run.

The 2026-09-30 audit read `core/verify.ts` line by line and 2026-10-02 covered the server routes
and deployment switches. This run took the one item 2026-10-02 filed under "worth knowing" and
asked whether its stated impact was right. It was not: it is a crash on the XNO grant path that
fires only after a buyer has paid.

## Checked

- `core/policy.ts` price parsing against `core/verify.ts`'s two lanes, following each `BigInt(...)`
  call to the point it is reached from `verifyPayment`.
- Whether an offer with an unparseable price can be published with an intact id (it can:
  `policyId` hashes `priceXno` as the string it was given; `makePolicy` normalises `accept` and
  `acceptAny` but not `priceXno`).
- Reproducibility of the three committed bundles against the repo's own build scripts.
- Re-confirmed, unchanged from 2026-10-02: no float on any amount (`core/` amounts are `bigint`),
  the XNO lane derives destination from the payment block's own `link` and the amount from the
  balance drop rather than the node's `amount` field, and `finish` refuses on `paid < price` then
  on `!confirmed` before granting.

## Found and fixed

**An offer priced the way a human writes a price crashed verification — after the buyer had paid.**

`acceptsXno` was `!!p.priceXno && BigInt(p.priceXno) > 0n` (`core/policy.ts:253`), with no guard.
`priceXno` is **raw**, but `0.0001` is how a price is written everywhere else in this fleet, and
nothing refuses it: `policyId` hashes the string as given, so the offer is published and
`policyIsIntact` says yes. Measured on the unchanged tree:

    policyIsIntact: true
    priceXno stored as: "0.0001"
    acceptsXno THREW: SyntaxError - Cannot convert 0.0001 to a BigInt

The damage is in **where** it throws. `priceXnoOf` is called at `core/verify.ts:187`, inside
`xnoLane`, *after* the destination check:

```ts
const dest = linkAsAddress(payment.link);
if (!dest || !sameAccount(dest, policy.merchant)) return null; // not an XNO payment to us
const price = priceXnoOf(policy);                              // <-- threw here
```

So it could only fire once the payment really was an XNO send to this merchant — i.e. exactly when
a buyer had sent real, irreversible XNO. `xnoLane` is awaited from `verifyPayment` with no `try`,
so the `SyntaxError` left `verifyPayment` entirely: the buyer paid and got a 500 instead of a
verdict, and since the grant is derived deterministically from the policy id and the receipt, no
retry could ever clear it. The previous audit recorded this as "a 500 on a request nobody benefits
from"; that was the `acceptAny` case. On `priceXno` it is a paid-and-not-served.

Fixed by guarding the parse and returning `false`, which is the pattern the author already wrote
one function away — `normalizeAcceptAny`: "Drop an unusable acceptAny rather than half-honour it."
`xnoLane` already carries a verdict for an offer with no XNO price, so a bad price now reaches
`"this offer does not accept XNO"` instead of throwing. The change can never grant anything that
was not granted before: every input it affects previously threw.

Test `a price that is not an integer denies instead of throwing` (`core/verify.test.ts`) builds the
offer, asserts the id is intact, pays it, and asserts a clean deny. Without the fix:

    not ok 48 - a price that is not an integer denies instead of throwing
      error: 'Cannot convert 0.0001 to a BigInt'
      name: 'SyntaxError'
    # tests 48  # pass 47  # fail 1

With it: `# tests 48  # pass 48  # fail 0`.

## Needs the owner — the fix does not reach the deployment from here

`core/policy.ts` is compiled into three **tracked** bundles, and `api/[...path].js` is the Vercel
function that actually serves the deployment. All three still carry the unguarded `acceptsXno`
(`grep -c acceptsXno` → 3 in each of `web/pay.js`, `public/pay.js`, `api/[...path].js`).

They could not be regenerated here, and this is worth knowing on its own: `scripts/build-vercel.mjs`
bakes `data/catalog.json` and `data/tokens.snapshot.json` into `server/catalog.baked.json` and
`server/tokens.baked.json` and inlines them into the function bundle, but `data/` is gitignored
(`.gitignore:5`). Run from a clean clone it warns `! no data/catalog.json -- deploying an empty
shop` and **empties the baked catalog**: on an unmodified tree, `npm run build:vercel` produces a
150-line deletion across those files. So no clone can faithfully rebuild the deployed artifact, and
any `core/` fix — this one, or a future security fix — reaches the deployment only from a checkout
that has the owner's `data/`.

`npm run build:web` alone **is** reproducible (byte-identical `web/pay.js` on a clean tree), so only
the Vercel half has this problem. This PR therefore changes source and test only, leaving the three
bundles mutually consistent rather than half-updated. One command on a machine with `data/` carries
it the rest of the way:

    npm run build:web && npm run build:vercel

## Not changed — the same defect on the token lane

`acceptedTokens`'s v1 branch does `BigInt(p.priceToken)` unguarded (`core/policy.ts:225`), so a v1
offer with a non-integer `priceToken` throws the same way, reached through `tokenLane`. Left alone
to keep this branch to one concern, and because Tier 0 is the XNO leg; it is the identical two-line
guard when you want it.

## Not changed — needs a decision (THIRD run reporting it, unchanged)

**An expired offer still grants when the node reports no timestamp.**
`policy.expires > 0 && receipt.timestamp > 0 && receipt.timestamp > policy.expires`
(`core/verify.ts:110`). `timestamp` is the node's `local_timestamp`, which is `0` for any block the
node did not see live, and the check is then skipped entirely — so a payment made long after the
offer expired is granted. Nano blocks carry no timestamp, so the only strict alternative is to deny
when the payment time cannot be established, which refuses legitimate paid access whenever an RPC
does not report one. That is an access-policy choice, not an audit fix. Reported 2026-09-30,
2026-10-02 and now. A one-line change in whichever direction you want; deny-on-unknown is the safe
one for an offer that carries an expiry at all.

## Could not verify

- No live payment, no mainnet, no browser: `web/verifier.ts` and `web/app.ts` were read, not run.
- The hosted deployment was not reached (outbound HTTPS is proxied here), so its behaviour is read
  off `server/vercel-env.ts` and `vercel.json`.
- `vendor/hodl/` was read only where the token lane enters it.
- `npm run build:vercel` was run twice only to measure its reproducibility, and both times its
  output was discarded with `git checkout --`; nothing baked here is in this PR.
