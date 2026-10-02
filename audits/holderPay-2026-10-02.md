# holderPay — audit 2026-10-02

Node v22.22.0. `npm ci` clean, `npm test` → **47 pass, 0 fail** before and after this change.
No mainnet run: `npm run e2e` moves real XNO and was not run.

The 2026-09-30 audit covered `core/verify.ts` line by line, so this run looked at what it had
explicitly left unexercised — the page-side proof, the server routes, the deployment switches —
and re-checked the amount arithmetic end to end.

## Checked

- **No float ever touches an amount.** Every amount in `core/` is `bigint`: `normalizeAccept`
  parses prices with `BigInt` and drops anything non-positive (`core/policy.ts:178-188`),
  `priceXnoOf` returns `bigint | null` (`core/policy.ts:286`), and `core/wallet.ts:34` carries the
  reason in a comment. The only `Number()` calls on a money-adjacent value are
  `valuation.ts:146` (`backedPct`, a display percentage) and `chain.ts:85-86`
  (`local_timestamp`, `height`).
- **The XNO lane's amount is derived, not reported.** `xnoLane` takes the destination from the
  payment block's own `link` and the amount from `sentAmount`, which is the balance drop against
  the previous block on the same account (`core/chain.ts:102-107`, `core/block.ts:76`). The
  node's `amount` field is never trusted for the verdict.
- **Underpayment and confirmation.** `finish` refuses on `paid < price` and then on
  `!confirmed`, and only grants after both (`core/verify.ts:171-173`).
- **Lane order.** The XNO lane is settled before the token lane because a fragment-A marker byte
  collides by chance about one link in forty; which lane applies is decided by the block, never
  by the caller (`core/verify.ts:121-135`).
- **Static file route.** `^\/[a-zA-Z0-9._-]+\.(js|css|svg|png|ico|map)$` (`server/index.ts:425`)
  excludes `/`, so no path can escape `web/`. No `exec`, `spawn` or shell anywhere in `server/`
  or `core/`.
- **Admin surface.** `adminOk` compares with `crypto.timingSafeEqual` after a length check
  (`server/index.ts:249-258`); `refusePublicIfUnsafe` exits rather than bind a public address
  with a demo switch on, a short `ADMIN_TOKEN`, or no `NANO_RPC_KEY` (`server/index.ts:215-247`).
- **Secrets.** `.env.example` holds names and empty values only; `.env`, `.keys.json` and `data/`
  are gitignored; no 64-hex seed, API key or token value in the tracked tree or in any commit
  (`git log --all --name-only` lists no `.env`, `.keys*` or seed file ever). Nothing to rotate.

## Found and fixed

**The tamper test — the one thing both the README and docs/SECURITY.md tell a newcomer to press —
does nothing in every configuration the docs describe.**

`POST /api/verify?forge=1` only forges when `HOLDERPAY_ALLOW_FORGE=1` or `HOLDERPAY_DEV=1`
(`server/index.ts:681`), and `.env.example` leaves both empty. So after
`cp .env.example .env && npm run dev` — the README's own quickstart — the query parameter is
ignored, `/api/verify` answers with the honest verdict, the page agrees with it, and
`checkReceipt(receipt, true)` ends by setting the status line to the empty string
(`web/app.ts:629`). The button clears the status and says nothing. On a deployment it can never
work by design: `server/vercel-env.ts:16-17` forces both flags to `0`, and
`refusePublicIfUnsafe` exits rather than bind a public address with either set — both correct, and
neither documented.

README.md and docs/SECURITY.md now say the demo needs `HOLDERPAY_ALLOW_FORGE=1` on localhost, that
a public deployment forces it off, and — the part that matters — that the page's independent
verdict is derived from the ledger on every payment with or without the flag. The forge route only
lets you watch it disagree on demand.

No test: the claim was in prose and the fix is in prose. The behaviour it now describes is the
behaviour of the code as it stands; nothing was changed to make it true.

## Not changed — needs a decision (carried over from 2026-09-30, unchanged)

**An expired offer still grants when the node reports no timestamp.**
`policy.expires > 0 && receipt.timestamp > 0 && receipt.timestamp > policy.expires`
(`core/verify.ts:110`). `timestamp` is `local_timestamp` (`core/chain.ts:85`), the node's own
first-seen time, which is `0` for any block the node did not see live — bootstrapped history, or
an RPC that does not report it. When it is `0` the expiry check is skipped entirely, so a payment
made long after the offer expired is granted.

Nano blocks carry no timestamp, so there is no second clock to fall back on: the only strict
alternative is to deny when the payment time cannot be established. That refuses legitimate paid
access whenever an RPC happens not to report a timestamp, which is an access-policy choice for the
owner rather than something an audit should decide. **Second run reporting it.** A one-line change
either way, in whichever direction you want: deny-on-unknown is the safe one for a paid offer that
carries an expiry at all.

## Not changed, worth knowing

- **The page cannot tell a forged answer from an honest one.** The server returns
  `{verdict, forged: true}` in forge mode, and `askServer` reads only `j.verdict`
  (`web/app.ts:607-609`). Were it to read `forged`, the page could say "this deployment has the
  forge demo switched off" instead of clearing the status line. Not done here: `web/app.ts` is
  compiled into `web/pay.js`, `public/pay.js` and the committed `api/[...path].js` bundle, so the
  one-line change arrives as a four-file regenerated diff. Worth doing in a build-aware change.
- `verifyPayment`'s `now` parameter is still declared, documented and unread
  (`core/verify.ts:70,76`). Vestigial; fold it into whatever settles the expiry question.
- `acceptsXno` calls `BigInt(p.priceXno)` without a guard (`core/policy.ts:254`), so a policy
  whose `priceXno` is a non-numeric string throws a `SyntaxError` instead of denying. It has to
  pass `policyIsIntact` first, which means an attacker would have to compute the matching id — the
  cost is a 500 on a request nobody benefits from, not a wrong grant.

## Could not verify

- No live payment, no mainnet, no browser: `web/verifier.ts` and `web/app.ts` were read, not run.
  The claim that the page runs the same verdict code is consistent with both importing
  `core/verify.ts`, but was not confirmed by executing it in a browser.
- `vendor/hodl/` was read only where the token lane enters it (`isFragA`, `assembleFrag`).
- The hosted deployment was not reached from this container (outbound HTTPS is proxied), so the
  Vercel behaviour above is read off `server/vercel-env.ts` and `vercel.json`, not observed.
