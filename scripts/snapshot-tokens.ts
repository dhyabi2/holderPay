// Fold the whole hodlgame universe, once, offline, and write down what it found.
//
//   node --experimental-strip-types scripts/snapshot-tokens.ts
//
// WHY THIS IS A BUILD STEP AND NOT A REQUEST
//
// Listing every token means replaying every chain that ever touched one. Two
// measurements decide the design:
//
//   - Finding the accounts is cheap. hodlgame's anchor answers with 129
//     greetings in under four seconds, and the pool hellos among them name
//     their tokens outright.
//   - Folding those accounts is not. The same set took over twenty minutes to
//     replay, because a few trader chains are thousands of blocks long.
//
// A Vercel invocation is killed at sixty seconds, so the second number ends the
// argument: a complete catalogue cannot be computed while somebody waits. It
// can be computed here, at leisure, and shipped with the build the way the shop
// already is.
//
// WHAT THE SNAPSHOT IS ALLOWED TO DO
//
// Display, and nothing else. It is stale by construction -- backing moves every
// time anybody earmarks XNO -- so nothing that decides a payment may read it.
// That is not a convention: server/index.ts merges it only into /api/tokens,
// and core/verify.ts reaches collateral exclusively through a reader backed by
// a LIVE fold (core/reader.ts). A snapshot that is hours old can therefore make
// the page show a wrong number, and can never make a payment verify that should
// not have.

import * as fs from "node:fs";
import * as path from "node:path";

// Must be set before core/ledger.ts is imported: it reads this at module load.
process.env.DISCOVER_HODLGAME = "1";
import { loadEnv } from "../core/env.ts";
loadEnv();
process.env.DISCOVER_HODLGAME = "1";

const { currentFold } = await import("../core/ledger.ts");
const { tokenList } = await import("../core/valuation.ts");

const OUT = path.resolve(process.cwd(), "data", "tokens.snapshot.json");

const started = Date.now();
console.error("folding the hodlgame universe -- this takes tens of minutes, by design");

const fold = await currentFold([]);
// No account: a snapshot is about tokens, not about anybody's holdings. Balances
// are per-payer and always come from the live fold.
const tokens = tokenList(fold, "", "backing");

const out = {
  at: new Date().toISOString(),
  tookMs: Date.now() - started,
  accounts: fold.accounts.length,
  // Recorded so the page can say how stale it is without guessing.
  tokens,
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, (_k, v) => (typeof v === "bigint" ? v.toString() : v), 2));

console.error(
  `wrote ${tokens.length} tokens over ${fold.accounts.length} accounts in ${((Date.now() - started) / 1000).toFixed(0)}s -> ${path.relative(process.cwd(), OUT)}`
);
