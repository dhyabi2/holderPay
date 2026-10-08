# holderPay — audit 2026-10-08

Node v22.22.0, `npm ci` clean, `npm test` → **48 pass, 0 fail** before and after. No mainnet run.

The 10-04 audit found that `public/pay.js` — the page a buyer is served — did not carry the fix of #3,
and fixed it in #5. **It did not ask the same question about the other artefact.** `api/[...path].js`
is the serverless function, and `.vercelignore` excludes `core/`, `server/`, `scripts/` and `web/`, so
that committed file **is** the deployment, continuously. This run asked it.

## Found and fixed — the deployed function still carried the crash #3 fixed

`api/[...path].js:3315-3317`, on `main`:

```js
function acceptsXno(p) {
  return !!p.priceXno && BigInt(p.priceXno) > 0n;   // the pre-#3 throwing version
}
```

`core/policy.ts:265` has the guarded version. The function did not. The history says why in two
lines: the bundle was last rebuilt at **`62f15e0`, 2026-09-11**, and #3 landed at **`08969d1`,
2026-10-03**. `git diff --stat 62f15e0..origin/main -- core/ server/` is **two files** —
`core/policy.ts` and `core/verify.test.ts` — so this one guard is the *entire* source-to-artefact
drift, which is exactly what the rebuilt diff turns out to be: one hunk, 7 lines, nothing else.

Measured by pulling `acceptsXno` and `priceXnoOf` out of each bundle and running them. `"0.0001"` is
how a person writes a price; `priceXno` is raw, so it is not a legal raw amount:

```
api/[...path].js on main (the deployment): acceptsXno("0.0001") THREW SyntaxError: Cannot convert 0.0001 to a BigInt
api/[...path].js on main (the deployment): priceXnoOf("0.0001") THREW SyntaxError: Cannot convert 0.0001 to a BigInt

api/[...path].js rebuilt (this branch):    acceptsXno("0.0001") -> false
api/[...path].js rebuilt (this branch):    priceXnoOf("0.0001") -> null

core/policy.ts (the source):               acceptsXno -> false   priceXnoOf -> null
```

So since #5 merged, the deployed **page** carried the guard and the deployed **function** did not —
the inverse of the asymmetry #5 was opened to fix.

**Honest scoping of today's blast radius**, because #3's write-up is stronger than what is currently
reachable:

- All three baked offers have an integer `priceXno` (two at `10000000000000000000000000` raw, one
  token-only) and `policyIsIntact` holds, so a buyer paying a **listed** offer is not hit.
- `POST /api/policies` is refused on the deployment (the catalog is fixed), and the local write path
  normalises through `BigInt(input.priceXno)` at `server/index.ts:538`.
- The reachable lever is `resolvePolicy` (`server/index.ts:359-363`): `POST /api/verify` accepts a
  caller-supplied policy that passes `policyIsIntact`, and a decimal `priceXno` hashes to a valid id.
  But `priceXnoOf` is reached from `xnoLane` only **after** the destination check, so getting there
  needs a real on-chain receipt over a real XNO send to that merchant — a 500, not a wrong grant.
- It becomes #3's paid-and-not-served the moment a decimal-priced offer is baked, and nothing refuses
  one.

### How the rebuild was done, and why it is the repo's own tooling

`scripts/build-vercel.mjs` is the only thing that builds this file, and it also rewrites
`server/catalog.baked.json` from `data/catalog.json` — which is gitignored and exists only on the
machine that created the offers. So on any other checkout the script either refuses (10-04's guard,
correctly) or, with `--allow-empty-shop`, bakes an empty shop into the very bundle being fixed.

Rather than hand-editing the artefact or reimplementing the esbuild call, `data/catalog.json` and
`data/tokens.snapshot.json` were reconstructed **from the committed baked files**, the repo's own
`npm run build:vercel` was run, and `data/` was removed again. The script then bakes byte-identical
inputs:

```
  api/[...path].js  270 kB
  catalog           3 offer(s) baked in
  token catalogue   23 token(s) as of 2026-09-11T17:55:11.343Z
  checked 4 artefact(s) against 0 secret(s): clean
$ git status --porcelain
 M api/[...path].js
```

`server/catalog.baked.json` and `server/tokens.baked.json` are unchanged (sha256 `7436c27e…` and
`9c3ae441…`), `public/` and `web/pay.js` are unchanged, and all three policy ids are present in the
rebuilt bundle. `npm test` 48 pass.

**No test could have caught this**, for the same reason it could not catch #5: the defect is that an
artefact was not rebuilt, and the suite covers `core/`. The before/after table above is the test that
holds, and the two-file `git diff --stat` is what makes it complete rather than suggestive.

## Found, NOT fixed — two things for the owner

**1. The deploy script holds the function hostage to one laptop.** The reason the deployment ran a
month-old bundle is structural, not an oversight: the only way to rebuild `api/[...path].js` is a
script that also rewrites the catalogue, so on every machine without `data/` it correctly refuses and
the function stays stale — including whenever a security fix lands in `core/`. Separating the two (build
the function always; leave the committed baked catalogue alone when there is no `data/catalog.json` to
bake, rather than refusing or emptying it) is strictly safer than both of today's branches. It is a
change to the deploy path, so it is not a routine's to merge.

**2. The browser pays the XNO before checking it can afford the receipt — and the money cannot be
recovered.** `web/app.ts:513-528`, shipped as `public/pay.js:7843-7857`:

```ts
await ensureHellos();                                            // burns 1 raw
const payment = await sendXno(rpc, keys, p.merchant, amount);    // needs balance >= amount  <- BROADCASTS
const receipt = await submitLink(rpc, keys, memoLink(p.id), 1n); // needs balance >= 1       <- THROWS
```

`core/wallet.ts:108` only requires `balance >= amount`, and nothing checks for the receipt's extra raw
before the send goes out. The page never disables the button on balance, and the only number the buyer
is shown is the price (`web/app.ts:411`). The in-repo CLI *does* guard —
`scripts/live-checkout.ts:60`: `if (bal.balance < BigInt(policy.priceXno!) + 10n) throw …` — and
`core/verify.test.ts:124` assumes the headroom. The browser path, the one buyers and agents use, has
neither. Because `ensureHellos()` runs **first** and burns exactly 1 raw on a fresh checkout, funding
`price + 1 raw` — the amount the two-block design implies — is precisely the losing case.

It is **not** recoverable: the receipt must be the immediate successor of the payment
(`core/verify.ts:96-101`), so topping the wallet up makes the receive block the new frontier and any
later receipt chains onto the receive, not the payment — `"the block under the receipt is not a payment
this policy accepts"`. The XNO is at the merchant, there is no grant, and the buyer must pay again. The
token lane has the same shape (`core/swap.ts:213-226` needs 3 raw; at 2 raw the transfer *applies* and
the receipt throws).

The fix is a refusal and belongs in `core/` so the suite can hold it, but it is on the path that
broadcasts a send and it needs the page bundle rebuilt with it, so it is one concern of its own and is
not bolted onto this branch.

## Read and found clean (not re-reported from the four prior audits)

- **No float on any amount.** Every `Number`/`parseFloat`/`toFixed`/`Math.*` hit in `core/`, `web/*.ts`,
  `server/*.ts` and `scripts/*.ts` is a timestamp, a height, a decimals count, a slippage bps, a
  display percentage (`valuation.ts:146`) or a backoff. `wallet.ts:35-53` is exact decimal↔bigint.
- **`public/` is current with source.** `npm run build:web` on this tree leaves the checkout unchanged
  and `public/pay.js` == `web/pay.js` (sha256 `51c0b50f…`), so #5 is intact and has not re-drifted.
- `core/swap.ts`'s AMM arithmetic agrees with the vendored replay over 20000 random bigint cases, and
  `xnoNeededFor` returns the exact minimal spend over 5000 solvable cases.
- `vendor/hodl/core/blockVerify.ts:34-59` recomputes the block hash from its fields, compares it to the
  hash that was *asked for*, rejects a `block_account` disagreeing with `contents.account`, rejects
  non-`state` types and verifies ed25519-blake2b. This is what makes the single-endpoint read safe and
  no prior audit had read it.
- `core/rpc.ts:91-98` `validateWork` has the byte order right, and the difficulty clamp only clamps
  upward.
- `server/watch.ts` decides nothing from the socket; contents are always re-fetched through the
  verifying path.
- `core/verify.test.ts` read end to end: tamper, cross-policy re-pointing, underpay, wrong merchant,
  receipt-on-open, receipt-on-receive, one-payment-one-receipt, unconfirmed, expiry, token-rejects-XNO
  and #3's decimal-price case all assert the right verdict and reason.

## Could not verify

- **Still no browser, and the live deployment is unreachable** (outbound HTTPS is proxied here), so
  whether production is serving the stale function is read off the committed artefact — which, since
  the platform runs no build of its own, is the same thing.
- `npm run e2e` moves real XNO and was not run.
- **`GET /api/quote` answers 500 on `?tokens=abc`** (`server/index.ts:636`, unguarded `BigInt(...)`),
  and `slippageBps=abc` reaches `BigInt(10_000 - NaN)` in `core/swap.ts:116`. The first was reproduced
  through the route; the second only inside `planSwap`, because reaching it needs `TOKEN_ID`
  configured. No money, no access — recorded so the next run need not re-find it.
- **An expired offer still grants when the node reports no timestamp** (`core/verify.ts:110`,
  `local_timestamp` is 0 for anything the node did not see live). Reported 09-30, 10-02, 10-03 and
  unchanged; it remains an access-policy choice for the owner, not an audit fix. `verifyPayment`'s
  `now` parameter is still declared, documented and unread.
- `scripts/keys.ts:1-3` says seeds are "written to `.env`"; the script has no `fs` import and prints
  them. `.env.example` has no `CHALLENGE_SECRET`, although `server/vercel-env.ts:77-80` warns a
  deployment without one rejects challenges issued by its own other instances. Both unverified against
  a real deployment.
