# holderPay — audit 2026-10-12

Previous audit 2026-10-10 (`c290850`, the README's test count). HEAD audited: `main` at
`c290850`. Read under one question: can an agent pay in XNO (or in a token) with this
today without being hurt?

Baseline on `main`, before any change:

```
$ npm ci && npm test                      # 48 passed, 0 failed
$ node scripts/build-web.mjs              # rewrites web/pay.js byte-identically
$ node <build-vercel's exact esbuild options, to a throwaway outfile>
  diff against the committed api/[...path].js   # empty
```

With this branch: **51 passed**, and all three committed bundles rebuilt (see below).

This run went at the v1 compatibility shape, which no previous audit had read against the
v2 screening that replaced it.

## Checked

- **`core/verify.ts` end to end**, unchanged by this branch. The receipt commits to the
  policy id under the buyer's own signature, the payment is the receipt's `previous`, and
  Nano's no-fork rule makes that pairing unique — so neither block can be replayed for a
  second policy or a second receipt. Both lanes are decided by what the payment block
  *is*, never by what the caller says.
- **The node is still treated as an untrusted mirror.** `verifyFetchedBlock`
  (`vendor/hodl/core/blockVerify.ts:34`) re-hashes `account|previous|representative|balance|link`
  and checks the signature against the account the node attributed the block to, so a
  hash that comes back must be the block that hashes to it. `getBlocks`
  (`core/chain.ts:55`) screens requested hashes with `/^[0-9A-F]{64}$/` and drops every
  entry that fails verification. Amounts are derived from the signed balance delta
  (`sentAmount`), never from the node's unsigned `amount` field.
- **No float touches an amount.** Every quantity on both lanes is `bigint`; the pro-rata
  `backedValue` (`core/verify.ts:321`) divides with integer division, which rounds
  against the payer and so can only refuse, never grant short.
- **`POST /api/access`** requires both a chain verdict and a signature by the paying
  account over `authDigest(policyId, receipt, challenge)`, so reading a receipt hash off
  the public ledger is not possession of the grant. The challenge is one-shot
  (`spendChallenge`).
- **The static file route** (`server/index.ts:425`) matches
  `/^\/[a-zA-Z0-9._-]+\.(js|css|svg|png|ico|map)$/`, which cannot contain a `/`, so
  `path.join(WEB, …)` cannot leave `WEB`. A percent-encoded `../` decodes to a pathname
  with slashes and fails the test.
- **Secrets:** `.env.example` carries no value, `git grep` finds no 64-hex literal in it
  or the README, and `scripts/build-vercel.mjs` still refuses a build whose artefacts
  contain a `.env` secret *and* refuses one whose leak check found nothing to look for.
- **All three committed bundles were current on `main`**, re-derived rather than assumed:
  `build-web.mjs` rewrote `web/pay.js` byte-identically, `public/pay.js` was byte-identical
  to it, and `build-vercel.mjs`'s exact esbuild options reproduced `api/[...path].js` byte
  for byte. This branch changes `core/policy.ts`, which is in all three graphs, so all
  three are rebuilt here — the diff in each is only this change.

## Found and fixed — a v1 price that is not an integer threw after the buyer had paid

`acceptedTokens` (`core/policy.ts:224` on `main`) opened with

```ts
if (!p.token || !p.priceToken || BigInt(p.priceToken) <= 0n) return [];
```

That bare `BigInt` is the **same defect `acceptsXno` was fixed for**, on the token lane.
`acceptsXno` carries the reasoning in a comment right below it: `priceXno` is raw, "0.0001"
is how a human writes a price, `policyId` hashes the string as given, so such an offer
publishes with an intact id — and the conversion then threw out of `verifyPayment` after
a buyer had paid, where no retry could clear it. `priceToken` is the same field on the
other lane and still had the bare conversion.

v2 screens its own list: `normalizeAccept` drops an entry whose price will not parse
before it is hashed. **v1 has no equivalent** — its hashable shape is frozen because its
receipts are already on chain — so the v1 path is the one place an unparseable price can
still reach the verdict. Measured on `c290850`:

| v1 `priceToken` | `acceptedTokens` | `acceptsToken` | `lanesOf` |
| --- | --- | --- | --- |
| `"0.5"` (display units) | **SyntaxError** | **SyntaxError** | **SyntaxError** |
| `"1e6"` | **SyntaxError** | **SyntaxError** | **SyntaxError** |
| `"1,000"`, `"abc"` | **SyntaxError** | **SyntaxError** | **SyntaxError** |
| `"1000000"` | 1 entry | true | `["TOKEN"]` |

`policyIsIntact` is `true` for every row. Three places take the throw:

1. **After the money moved.** `tokenLane` calls `acceptsToken` at `core/verify.ts:232`,
   *after* the fragment pair has decoded and the transfer is on chain. End to end on the
   repository's own `Sim` harness, with a real buy, a real transfer to the merchant and a
   real receipt block: `verifyPayment` raised `Cannot convert 0.5 to a BigInt` instead of
   returning a verdict. The buyer has paid and gets `500 something went wrong on this
   server`, on every retry.
2. **The shop listing.** `GET /api/policies` maps `acceptedTokens` over every listing and
   `lanesOf` over every policy, so one such offer in `data/catalog.json` 500s the whole
   shop — the first thing a new buyer or agent loads.
3. **The browser's independent verdict**, which runs the same `core/` code.

Fixed by dropping an unusable v1 price instead of throwing, exactly as `acceptsXno` and
`normalizeAcceptAny` already do, and by reading `p.token.tokenId` through `String(… ?? "")`
for the same reason. The offer then reports that it accepts nothing — `acceptsToken` false,
`lanesOf` `[]`, and a token payer gets the deny `this offer does not accept tokens`
instead of a 500.

**This only narrows what is accepted.** No amount, destination, rounding, key path or
policy id changes: every `priceToken` that parses today produces byte-identical output,
pinned by `an integer v1 price is still accepted, unchanged`, which passes on `c290850`
too. **2 of the 3 new tests fail on `c290850` and pass here**; 48 → 51, and `README.md:68`
is updated to 51 with them.

## Found, not fixed — the owner's call

- **`hashableV1` throws on a v1 policy with no `token.tokenId`** (`core/policy.ts:134`:
  `p.token.tokenId.toLowerCase()`). `resolvePolicy` accepts an inline policy from a
  `POST /api/verify` body, so this is reachable with untrusted input: the intended
  `400 inline policy does not match its own id` becomes `500 something went wrong on this
  server`. No money and no access are at stake — only the status code — and the remedy
  touches the function commented *"Frozen forever: old receipts commit to these bytes"*.
  The guard would be provably id-preserving (`String(x ?? "")` is identical for every
  `tokenId` that does not throw today), but changing the v1 hash function for a 500-vs-400
  is not a routine's call. Left for the owner.
- **An expired offer still grants when the node reports no timestamp**
  (`core/verify.ts:110`): `receipt.timestamp` is the node's `local_timestamp`, which is 0
  for any block it did not see live. Reported 09-30, 10-02, 10-03, 10-08 and 10-10 and
  left as the owner's call each time — Nano blocks carry no timestamp, so the only strict
  alternative is to deny whenever an RPC happens not to report one, which is an
  access-policy decision rather than an audit's. Unchanged.
- **A negative or non-integer `priceXno` in `POST /api/policies`** (`server/index.ts:629`:
  `BigInt(input.priceXno).toString()`) throws on junk and accepts `"-5"`, which prices an
  offer below zero. Publishing is admin-gated and the merchant is pricing their own goods,
  so the harm is self-inflicted; noted rather than fixed to keep this branch to one
  concern.

## Could not verify

- `node scripts/check-deploy.mjs` cannot run from this session: `holderpay.vercel.app`
  does not resolve behind the agent proxy (`ENOTFOUND`). The live deployment was therefore
  not probed; the bundles were verified by rebuilding them from source instead.
- `npm run build:vercel` cannot be run in full here, and correctly refuses: `data/` is
  gitignored, so this checkout has no `data/catalog.json` and the script would otherwise
  bake an empty shop over the 3 listings in `server/catalog.baked.json`. The function was
  therefore rebuilt with that script's exact esbuild options (reproducing the committed
  artefact byte for byte on `main` first, to prove the invocation is the right one), and
  `public/` was refreshed from `web/` the way the script does.
- No payment was made and no wallet or seed exists in this session, so both lanes were
  exercised against the in-repo `Sim` ledger of really-signed blocks, not against mainnet.
