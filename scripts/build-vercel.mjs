// Build the Vercel deployment: one bundled function plus the static page.
//
//   node scripts/build-vercel.mjs
//
// Why bundle ourselves instead of letting the platform compile the sources:
// this project imports with explicit .ts extensions and vendors a second
// package tree, and a platform's own TypeScript handling is one silent
// resolution difference away from a deployment that does not match the code
// that was tested. esbuild is already a dependency and produces one file with
// every import resolved, so what ships is exactly what was built here.
//
// Output:
//   api/[...path].js   the whole server, as one file. The catch-all name is a
//                      Vercel filesystem route: every /api/* URL reaches it with
//                      req.url intact, which is what the router in index.ts
//                      expects (a rewrite would rewrite the path out from under
//                      it).
//   public/            the page, served statically by the platform rather than
//                      read off disk by the function on every request.

import * as esbuild from "esbuild";
import * as fs from "node:fs";
import * as path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const p = (...x) => path.join(ROOT, ...x);

// ── the shop, baked in ───────────────────────────────────────────────────────
// There is no writable disk on the platform, so the catalog travels with the
// build. An offer carries the hash of its own contents, so a baked offer cannot
// be quietly altered in transit: the id would stop matching.
const catalogSrc = p("data", "catalog.json");
let catalog = { listings: [] };
try {
  catalog = JSON.parse(fs.readFileSync(catalogSrc, "utf-8"));
} catch {
  console.warn("! no data/catalog.json -- deploying an empty shop");
}
fs.writeFileSync(p("server", "catalog.baked.json"), JSON.stringify(catalog, null, 2));

// ── the token catalogue, baked in ────────────────────────────────────────────
// Built offline by scripts/snapshot-tokens.ts, because folding every chain that
// ever touched a token measured at over twenty minutes and the platform kills an
// invocation at sixty seconds. DISPLAY ONLY -- see server/snapshot.ts. A missing
// snapshot is not an error: the deployment simply shows what it can replay.
let snapshot = null;
try {
  snapshot = JSON.parse(fs.readFileSync(p("data", "tokens.snapshot.json"), "utf-8"));
} catch {
  console.warn("! no data/tokens.snapshot.json -- the catalogue will show only what a live fold sees");
  console.warn("  (build one with: node --experimental-strip-types scripts/snapshot-tokens.ts)");
}
fs.writeFileSync(p("server", "tokens.baked.json"), JSON.stringify(snapshot ?? { at: "", accounts: 0, tokens: [] }));

// ── the function ─────────────────────────────────────────────────────────────
fs.mkdirSync(p("api"), { recursive: true });
const out = p("api", "[...path].js");
await esbuild.build({
  entryPoints: [p("server", "vercel-entry.ts")],
  outfile: out,
  bundle: true,
  platform: "node",
  target: "node22",
  format: "esm",
  // The websocket client is only reachable through code the serverless entry
  // never runs (the watcher is never started), but bundling it would still pull
  // a native-ish dependency into a function that has no use for it.
  external: ["ws"],
  define: {
    // Read by server/index.ts to decide that it must NOT open a listening
    // socket. Fixed at build time so the decision cannot be got wrong at
    // runtime by a missing platform variable.
    "process.env.HOLDERPAY_SERVERLESS": '"1"',
  },
  banner: {
    // ESM output, CommonJS dependencies. `nanocurrency` ships CJS and calls
    // require("fs") at load; without a real `require` in scope, esbuild's shim
    // throws 'Dynamic require of "fs" is not supported' the moment the module
    // is imported -- which is to say, on the first request the deployment ever
    // serves. createRequire gives the bundle the function those modules expect.
    js: [
      'import { createRequire as __holderpayCreateRequire } from "node:module";',
      'const require = __holderpayCreateRequire(import.meta.url);',
    ].join("\n"),
  },
  logLevel: "warning",
});

// ── the page ─────────────────────────────────────────────────────────────────
// BUILT here, not copied. `web/pay.js` is a committed artefact, so copying it
// deploys whatever happens to be in the tree: a change to core/ that nobody
// rebuilt the page for ships the OLD verdict code to the browser while the
// function carries the new one. That happened - the `acceptsXno` fix of #3,
// which stops verification throwing after a buyer has paid, was in core/ and
// not in the bundle for a day, and this script would have copied the crashing
// page to production again. esbuild is deterministic, so for a tree whose
// bundle is already current this rewrites the same bytes and the deployment is
// unchanged; when it is not current, the fix ships instead of being lost.
await import(path.join(ROOT, "scripts", "build-web.mjs"));

const pub = p("public");
fs.rmSync(pub, { recursive: true, force: true });
fs.mkdirSync(pub, { recursive: true });
const assets = ["index.html", "pay.js", "pay.css"];
for (const f of assets) fs.copyFileSync(p("web", f), path.join(pub, f));

// The source map is deliberately NOT shipped: it is 690 kB, it is of no use to
// anyone but us, and it reconstructs the whole client source for anyone curious
// about where the wallet seed is kept.
const size = (f) => (fs.statSync(f).size / 1024).toFixed(0) + " kB";
console.log(`  api/[...path].js  ${size(out)}`);
for (const f of assets) console.log(`  public/${f.padEnd(16)} ${size(path.join(pub, f))}`);
console.log(`  catalog           ${catalog.listings.length} offer(s) baked in`);
console.log(
  `  token catalogue   ${snapshot?.tokens?.length ?? 0} token(s)` +
    (snapshot?.at ? ` as of ${snapshot.at}` : " (none -- live fold only)")
);

// ── the check that matters ───────────────────────────────────────────────────
// A bundle is a new way to leak a key: one careless import of core/env.ts
// evaluated at build time, one `define` of the wrong variable, and the secret is
// in a file served to the public. So grep the artefacts for the real values
// before they can be uploaded anywhere.
const secrets = [];
try {
  for (const line of fs.readFileSync(p(".env"), "utf-8").split("\n")) {
    const m = /^\s*([A-Z_]+)\s*=\s*(.+)\s*$/.exec(line);
    if (!m) continue; // blank line or comment -- and NOT a reason to stop reading
    // Precisely the values that must never travel. Not a keyword match: a
    // TEACHER_TOKEN_ID is a launch-block hash, public by construction and
    // legitimately baked into the offers, and flagging it would train whoever
    // runs this build to ignore the alarm.
    const isSecret = /(SEED|SECRET)$/.test(m[1]) || /_KEY$/.test(m[1]) || m[1] === "ADMIN_TOKEN";
    if (isSecret && m[2].trim().length >= 16) secrets.push([m[1], m[2].trim()]);
  }
} catch {
  /* no .env here; nothing to leak */
}
const artefacts = [out, ...assets.map((f) => path.join(pub, f))];
let leaked = false;
for (const a of artefacts) {
  const text = fs.readFileSync(a, "utf-8");
  for (const [name, value] of secrets) {
    if (text.includes(value)) {
      console.error(`\n!! ${name} appears in ${path.relative(ROOT, a)} -- refusing to finish the build`);
      leaked = true;
    }
  }
}
if (leaked) process.exit(1);
// A scan with nothing to scan for is not a pass. This check has already failed
// open once (an unguarded regex match threw on the first blank line of .env and
// the catch swallowed it, reporting "0 secrets: clean"), so the absence of
// secrets is now itself reported as a failure when a .env exists to read.
if (secrets.length === 0 && fs.existsSync(p(".env"))) {
  console.error("\n!! the leak check found no secrets to look for -- it is not working, so this build is not verified");
  process.exit(1);
}
console.log(`  checked ${artefacts.length} artefact(s) against ${secrets.length} secret(s): clean`);
