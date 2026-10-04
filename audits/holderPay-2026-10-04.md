# holderPay — audit 2026-10-04

Node v22.22.0, `npm ci` clean, `npm test` → **48 pass, 0 fail** before and after. No mainnet run.

The 09-30, 10-02 and 10-03 audits each read `core/verify.ts` and the server routes line by line, and
all three closed with the same sentence under **Could not verify**: *"`web/verifier.ts` and
`web/app.ts` were read, not run."* This run went at that sentence instead of re-reading what three
audits have already read.

## Checked

- Whether the **shipped page runs the same verdict code as the function.** `web/pay.js` is a
  committed build artefact and `public/pay.js` is the copy the platform serves, so the question is
  answerable without a browser: rebuild the bundle from the current tree and compare.
- `scripts/build-web.mjs` and `scripts/build-vercel.mjs` end to end, including what each writes and
  what it refuses to write.
- Which files a deploy build changes in a checkout, and what that does to the committed ones.
- `npm test`, before and after.

## Found

**1. The page served to buyers did not carry the fix of #3 — the crash it fixes was still live in the browser.**

`npm run build:web` on the current tree produces a `web/pay.js` that differs from the committed one
in exactly one hunk, 7 lines, and it is the `acceptsXno` fix:

```
committed:  return !!p.priceXno && BigInt(p.priceXno) > 0n;
rebuilt:    if (!p.priceXno) return false;
            try { return BigInt(p.priceXno) > 0n; } catch { return false; }
```

`core/policy.ts:265` has the guarded version. The bundle had the throwing one. `public/pay.js` is
byte-identical to the stale `web/pay.js` (`sha256 1183a9fe…`), so the deployed page carried it too.

The harm is the one #3 measured and `core/policy.ts:254-263` describes: `priceXno` is raw, "0.0001"
is how a person writes a price, `policyId` hashes the string as given so such an offer publishes
with an intact id, and `priceXnoOf` is reached from `xnoLane` **after** the destination check —
only once the payment really is XNO to this merchant. So the throw lands exactly when a buyer has
paid, and no retry clears it. Fixed on the server on 10-03; still live on the page until this
change.

**2. The root cause: `scripts/build-vercel.mjs` COPIED `web/pay.js` instead of building it.**

```
const assets = ["index.html", "pay.js", "pay.css"];
for (const f of assets) fs.copyFileSync(p("web", f), path.join(pub, f));
```

So a deploy ships whatever bundle happens to be in the tree. A change to `core/` that nobody
rebuilt the page for ships the old verdict code to the browser while the function carries the new
one — which is precisely what happened, and the next deploy would have copied the crashing page to
production again. **This is what "could not verify" cost: three audits read the browser code and
none asked whether the browser was running it.**

**3. A deploy build from any clone silently empties the shop. Not fixed here — see below.**

`data/` is in `.gitignore`, so `data/catalog.json` exists only on the machine that created the
offers. `build-vercel.mjs` reads it, catches the failure, warns `"! no data/catalog.json --
deploying an empty shop"`, and **overwrites the committed `server/catalog.baked.json`** — which
carries 3 listings — with `{"listings": []}`. `server/tokens.baked.json` goes the same way. Observed
here: one `npm run build:vercel` in a fresh clone turned 3 baked offers into 0, with a warning
rather than a refusal. Deploy that and the shop has no offers at all, so nobody can pay in XNO.
A warning that reads like a note is the wrong shape for replacing a live catalogue with nothing.

## Fixed, and split in two on purpose

**Finding 1 — `fix/rebuild-the-page-bundle` (this branch).** `web/pay.js`, `web/pay.js.map` and
`public/pay.js` rebuilt, so the page carries #3's fix (`sha256 51c0b50f…`, and the guarded
`acceptsXno` is in `public/pay.js`). Nothing else: no `.ts`, no script. `npm run build:web` in a
clean clone of the branch leaves the tree **unchanged**, which is the proof that the committed
artefact is now what the source produces. `npm test` 48 pass. This is the half that stops the live
page crashing, and it touches no deploy script, so a routine may merge it.

**Findings 2 and 3 — `fix/deploy-builds-the-page-and-keeps-the-shop`, left open for the owner.**
Both are in `scripts/build-vercel.mjs`, which is the deploy build. The merge rule here holds back a
change to a release path whatever its content, and rightly: a mistake in this file is deployed
rather than caught by a test. So it is proposed, not merged:

- the page is **built** (`await import("scripts/build-web.mjs")`) before being copied, so finding 1
  cannot recur. esbuild is deterministic: on a tree whose bundle is already current this rewrites
  the same bytes and the deployment is unchanged. `build-web.mjs`'s own key-leak refusal then also
  runs on every deploy, which it does not today;
- the empty-shop warning becomes a **refusal**, in the one case that loses something: no catalogue
  to read AND a baked one that already carries listings. Measured there — refuses with exit 1 and
  writes nothing; `--allow-empty-shop` proceeds; a real `data/catalog.json` bakes its 3 listings.

Evidence for the first, with `web/pay.js` reverted to the stale committed version both times:

| build script | `public/pay.js` carries #3's fix | carries the crashing line |
|---|---|---|
| `main`'s | no | **yes** |
| the proposed one | **yes** | no |

`npm test` 48 pass either way — the suite covers `core/`, and **no test could have caught finding
1**, because the defect is that an artefact was not rebuilt. The table above is the test that holds.

`server/tokens.baked.json` takes the same empty-overwrite path as the catalogue and is deliberately
left alone: its own comment says it is DISPLAY ONLY and that a missing snapshot is not an error, so
emptying it loses nothing anybody pays with.

## Could not verify

- **Still no browser.** This establishes that the shipped bundle now contains the same
  `acceptsXno` as `core/policy.ts`, by rebuilding and comparing. It does not execute the page.
- **The live deployment was not reached** (outbound HTTPS is proxied here), so whether production
  is currently serving the stale bundle is read off the committed `public/pay.js`, which is what
  `build-vercel.mjs` uploads.
- `vendor/hodl/` was again read only where the token lane enters it.
- `npm run e2e` moves real XNO and was not run.
