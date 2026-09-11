// Check a deployed holderPay, from the outside.
//
//   node scripts/check-deploy.mjs [https://holderpay.vercel.app]
//
// Everything here is a black-box request against a running deployment: no
// imports from this repo, no environment, nothing that could pass because the
// checker and the server share a bug. It is the last gate before believing a
// deploy, and it is the file to run after every one.
const BASE = (process.argv[2] ?? "https://holderpay.vercel.app").replace(/\/$/, "");
console.log(`checking ${BASE}\n`);
let pass = 0, fail = 0;
const check = (n, ok, d = "") => { ok ? pass++ : fail++; console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`); };

const cfg = await (await fetch(BASE + "/api/config")).json();
check("the function answers /api/config", !!cfg.ws, JSON.stringify(cfg).slice(0, 60));
check("it reports the websocket as NOT connected (honest)", cfg.wsConnected === false);

const pol = await (await fetch(BASE + "/api/policies")).json();
// Count deliberately NOT pinned: the shop grows, and a checker that fails
// on a new offer teaches people to ignore it.
check("the baked catalog is served", pol.listings?.length > 0, `${pol.listings?.length} listings`);
check("offers survive baking intact", pol.listings?.[0]?.policy?.id?.length === 64, pol.listings?.[0]?.policy?.title);

// writes must be refused with an explanation, not a 403 credential hunt
const w = await fetch(BASE + "/api/policies", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ policy: { merchant: pol.listings[0].policy.merchant, resource: "x", priceXno: "1" }, unlock: "x" }),
});
const wb = await w.json();
check("publishing is refused with a reason, not a 403", w.status === 405 && /fixed catalog/.test(wb.error ?? ""), `${w.status} ${wb.error?.slice(0, 50)}`);

// the forge route must be impossible here regardless of env
const f = await fetch(BASE + "/api/verify?forge=1", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ policyId: pol.listings[0].policy.id, receipt: "00".repeat(32) }),
});
const fb = await f.json();
check("the forge route is dead in the bundle", fb.forged !== true && fb.verdict?.granted !== true);

// the real work: verification off the live chain
const tok = await (await fetch(BASE + "/api/tokens?sort=backing")).json();
check("it replays the token ledger from mainnet", tok.tokens?.length > 0, `${tok.tokens?.length} tokens over ${tok.watched} accounts`);
const one = await (await fetch(BASE + "/api/token")).json();
check("TEACHER's state is readable", one.symbol === "TEACHER" && one.launched === true, `supply ${one.supply}`);

// proof of work still comes from the keyed endpoint
const work = await (await fetch(BASE + "/api/rpc", {
  method: "POST", headers: { "content-type": "application/json" },
  body: JSON.stringify({ action: "work_generate", hash: "A".repeat(64), difficulty: "fffffff800000000" }),
})).json();
check("work_generate works through the deployed proxy", /^[0-9a-f]{16}$/i.test(work.work ?? ""), JSON.stringify(work).slice(0, 70));
check("and came from the endpoint, not the function's CPU", work.source === "rpc" || work.source === "cache", work.source);

const ch = await (await fetch(BASE + "/api/challenge")).json();
check("challenges are issued and self-describing", /^\d+\.[0-9a-f]{32}\.[0-9a-f]{32}$/.test(ch.challenge ?? ""));

const page = await fetch(BASE + "/");
const html = await page.text();
check("the page is served", page.status === 200 && html.includes("holderPay"));
const js = await fetch(BASE + "/pay.js");
check("the bundle is served", js.status === 200);
const map = await fetch(BASE + "/pay.js.map");
check("the source map is NOT shipped", map.status === 404, `status ${map.status}`);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
