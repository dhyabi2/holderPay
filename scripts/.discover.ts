// How much of hodlgame does DISCOVER_HODLGAME actually reveal, and what does
// it cost? Both numbers matter: the deployment has a 60s invocation ceiling.
process.env.DISCOVER_HODLGAME = "1";
import { loadEnv, env } from "../core/env.ts";
loadEnv();
process.env.DISCOVER_HODLGAME = "1";
const { currentFold, stateOf } = await import("../core/ledger.ts");
const { tokens } = await import("../vendor/hodl/core/multi.ts");
const { backingOf, circulatingOf } = await import("../core/valuation.ts");

const t = Date.now();
const f = await currentFold([]);
const ms = Date.now() - t;
const list = tokens(f.state);
console.log(`  ${list.length} tokens over ${f.accounts.length} accounts in ${(ms / 1000).toFixed(1)}s`);
const XNO = 10n ** 30n;
const fmt = (v: bigint) => (Number(v) / Number(XNO)).toFixed(9);
for (const { tokenId, state } of list.slice(0, 40)) {
  console.log(
    `    ${(state.symbol || tokenId.slice(0, 8)).padEnd(10)} ${tokenId.slice(0, 10)}  holders=${String(state.balances.size).padStart(3)}  backing=${fmt(backingOf(state))} XNO`
  );
}
