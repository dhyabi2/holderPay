// Bundle the pay page.
//
// Two substitutions matter:
//
//   1. Anything that resolves to core/rpc.ts (holderPay's keyed client) or the
//      vendored indexer's lib/rpc.ts is redirected to web/rpc-browser.ts. That
//      is a build-time GUARANTEE that no code path in the browser bundle can
//      read an API key or reach rpc.nano.to directly -- it goes through the
//      server's whitelisted /api/rpc proxy or not at all.
//   2. `Buffer` is injected from the npm polyfill, because the vendored op
//      codecs use it. No node builtins survive into the bundle.

import * as esbuild from "esbuild";
import * as path from "node:path";
import * as fs from "node:fs";

const root = path.resolve(import.meta.dirname, "..");

/** Redirect every RPC client in the graph to the browser one. */
const browserRpcPlugin = {
  name: "browser-rpc",
  setup(build) {
    build.onResolve({ filter: /rpc\.ts$/ }, (args) => {
      const resolved = path.resolve(args.resolveDir, args.path);
      const isKeyedClient =
        resolved === path.join(root, "core", "rpc.ts") ||
        resolved === path.join(root, "vendor", "hodl", "lib", "rpc.ts");
      if (!isKeyedClient) return null;
      return { path: path.join(root, "web", "rpc-browser.ts") };
    });
  },
};

const shimDir = path.join(root, "web", ".shim");
fs.mkdirSync(shimDir, { recursive: true });
const bufferShim = path.join(shimDir, "buffer.js");
fs.writeFileSync(bufferShim, 'import { Buffer } from "buffer";\nexport { Buffer };\n');
// `process.env.X` appears in vendored module scope; give it something inert.
const processShim = path.join(shimDir, "process.js");
fs.writeFileSync(processShim, 'export const process = { env: {}, browser: true };\n');

const result = await esbuild.build({
  entryPoints: [path.join(root, "web", "app.ts")],
  outfile: path.join(root, "web", "pay.js"),
  bundle: true,
  format: "esm",
  target: ["es2022"],
  platform: "browser",
  sourcemap: true,
  minify: process.argv.includes("--minify"),
  plugins: [browserRpcPlugin],
  inject: [bufferShim, processShim],
  define: { global: "globalThis" },
  logLevel: "info",
  metafile: true,
});

// Fail loudly if the key ever leaks into the bundle. Cheap, and exactly the
// kind of mistake that is invisible until it is a breach.
// Check for the literal secrets in .env, plus a direct endpoint URL that would
// bypass the proxy. Matching the real values (not just their variable names)
// avoids false positives from vendored comments that mention a key by name.
const bundle = fs.readFileSync(path.join(root, "web", "pay.js"), "utf-8");
const forbidden = new Map([["a direct rpc.nano.to URL", "https://rpc.nano.to"]]);
try {
  for (const line of fs.readFileSync(path.join(root, ".env"), "utf-8").split("\n")) {
    const m = /^\s*([A-Z_]*(?:KEY|SEED))\s*=\s*(\S+)\s*$/.exec(line);
    if (m && m[2].length >= 16) forbidden.set(`the value of ${m[1]}`, m[2]);
  }
} catch {
  /* no .env in this checkout */
}
for (const [what, needle] of forbidden) {
  if (bundle.includes(needle)) {
    console.error(`\nREFUSING THE BUILD: ${what} appears in the browser bundle.`);
    process.exit(1);
  }
}

const jsOut = Object.entries(result.metafile.outputs).find(([f]) => f.endsWith("pay.js"));
const bytes = jsOut?.[1]?.bytes ?? 0;
console.log(`pay.js built (${(bytes / 1024).toFixed(0)} kB), no key material in the bundle`);
