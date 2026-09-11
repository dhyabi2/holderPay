// Live proof that an offer really does accept more than one token.
//
//   node --experimental-strip-types scripts/e2e-multitoken.ts
//
// Publishes one offer that takes TEACHER *or* STUDENT at different prices, then
// pays it with each in turn on mainnet and verifies both. Finally it launches a
// worthless token whose curve quotes a fortune and tries to pay with that -- the
// attack that any "accept every token at its market value" design would fall
// for -- and checks it is refused.
//
// Needs TEACHER_TOKEN_ID and STUDENT_TOKEN_ID in .env (scripts/launch-token.ts
// --symbol STUDENT). Costs a few hundred raw plus the swap amounts.

import { loadEnv, env } from "../core/env.ts";
import { rpc as nodeRpc } from "../core/rpc.ts";
import {
  keysFromSeed, receiveAll, sendXno, submitLink, tip, fromRaw, waitForReceivable, toRaw,
} from "../core/wallet.ts";
import { makePolicy, acceptedTokens, type AcceptedToken } from "../core/policy.ts";
import { memoLink } from "../core/proof.ts";
import { verifyPayment, type Verdict } from "../core/verify.ts";
import { NodeReader } from "../core/reader.ts";
import { currentFold, stateOf, bustFold } from "../core/ledger.ts";
import { planSwap, executeSwap, payTokenWithReceipt } from "../core/swap.ts";
import { viewToken, sortTokens, tokenList } from "../core/valuation.ts";
import { encodeOpLink } from "../vendor/hodl/core/oplink.ts";
import { encodeFragLinks } from "../vendor/hodl/core/fraglink.ts";
import { tokenIdFromLaunchHash } from "../vendor/hodl/core/token.ts";

loadEnv();

const DEC = 6;
const UNIT = 10n ** BigInt(DEC);
const creator = keysFromSeed(env("CREATOR_SEED"));
const buyer = keysFromSeed(env("BUYER_SEED"));
const MERCHANT = env("MERCHANT_ADDRESS");
const TEACHER = env("TEACHER_TOKEN_ID");
const STUDENT = env("STUDENT_TOKEN_ID");

let pass = 0;
let fail = 0;
const results: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  if (ok) pass++;
  else fail++;
  const line = `${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`;
  console.log("  " + line);
  results.push(line);
}
const head = (s: string) => console.log(`\n=== ${s} ===`);
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function verifyWithRetry(policy: any, receipt: string, tries = 16): Promise<Verdict> {
  let last: Verdict | null = null;
  for (let i = 0; i < tries; i++) {
    bustFold();
    const v = await verifyPayment(policy, receipt, new NodeReader([buyer.address]));
    last = v;
    if (v.granted) return v;
    if (!/confirmation|not present in this verifier/.test(v.reason)) return v;
    await sleep(2500);
  }
  return last!;
}

if (!TEACHER || !STUDENT) {
  console.error("need TEACHER_TOKEN_ID and STUDENT_TOKEN_ID in .env");
  console.error("  node --experimental-strip-types scripts/launch-token.ts --symbol STUDENT");
  process.exit(2);
}

// ── one offer, two tokens, two different prices ─────────────────────────────

const accept: AcceptedToken[] = [
  { tokenId: TEACHER, symbol: "TEACHER", decimals: DEC, price: (1n * UNIT).toString() },
  { tokenId: STUDENT, symbol: "STUDENT", decimals: DEC, price: (2n * UNIT).toString() },
];

const offer = makePolicy({
  merchant: MERCHANT,
  resource: "e2e/multi-token",
  title: "e2e: pay in whichever token you hold",
  description: "TEACHER at 1, STUDENT at 2 -- each token has its own price",
  accept,
  priceXno: toRaw("0.00001", 30).toString(),
  autoswap: true,
  expires: 0,
});

head("setup");
console.log(`  offer    ${offer.id}`);
console.log(`  accepts  ${acceptedTokens(offer).map((a) => `${fromRaw(a.price, a.decimals)} ${a.symbol}`).join("  |  ")}`);
check("the offer lists both tokens", acceptedTokens(offer).length === 2);

await receiveAll(nodeRpc, creator);
let b = await tip(nodeRpc, buyer.address);
const need = toRaw("0.00004", 30);
if (b.balance < need) {
  const topUp = need - b.balance;
  await sendXno(nodeRpc, creator, buyer.address, topUp);
  console.log(`  funded buyer with ${fromRaw(topUp, 30)} XNO`);
  if (!(await waitForReceivable(nodeRpc, buyer.address, topUp, 90_000))) {
    throw new Error("top-up never became receivable");
  }
  await receiveAll(nodeRpc, buyer);
  b = await tip(nodeRpc, buyer.address);
}
console.log(`  buyer    ${fromRaw(b.balance, 30)} XNO`);

// ── pay with each accepted token in turn ────────────────────────────────────

for (const a of accept) {
  head(`pay in ${a.symbol}`);
  const price = BigInt(a.price);

  bustFold();
  let fold = await currentFold([buyer.address]);
  let s = stateOf(fold, a.tokenId);
  check(`${a.symbol} is launched and priced in holderPay's own replay`, s.launched && s.poolXno > 0n);

  let have = s.balances.get(buyer.address) ?? 0n;
  if (have < price) {
    const plan = planSwap({
      state: s,
      walletBalance: (await tip(nodeRpc, buyer.address)).balance,
      myFloor: s.earmarkFloor.get(buyer.address) ?? 0n,
      wantTokens: price - have,
      slippageBps: 300,
    });
    if (plan.problem && plan.tokensOut <= 0n) {
      check(`swap into ${a.symbol}`, false, plan.problem);
      continue;
    }
    console.log(`  swap ${fromRaw(plan.xno, 30)} XNO -> ${fromRaw(plan.tokensOut, DEC)} ${a.symbol} (${plan.lane})`);
    await executeSwap(nodeRpc, buyer, a.tokenId, plan);
    for (let i = 0; i < 14; i++) {
      await sleep(2500);
      bustFold();
      fold = await currentFold([buyer.address]);
      s = stateOf(fold, a.tokenId);
      have = s.balances.get(buyer.address) ?? 0n;
      if (have >= price) break;
    }
    check(`the swap credited ${fromRaw(price, DEC)} ${a.symbol}`, have >= price, `${fromRaw(have, DEC)}`);
    if (have < price) continue;
  }

  const before = s.balances.get(MERCHANT) ?? 0n;
  const r = await payTokenWithReceipt(nodeRpc, buyer, a.tokenId, MERCHANT, price, memoLink(offer.id));
  console.log(`  receipt ${r.receipt}`);
  const v = await verifyWithRetry(offer, r.receipt);
  check(`paying in ${a.symbol} grants access`, v.granted, v.reason);
  check(`the verdict names ${a.symbol} as the token paid`, v.tokenId === a.tokenId, v.tokenId ?? "none");
  check(`it charges ${a.symbol}'s OWN price`, v.price === a.price, `${v.price} vs ${a.price}`);

  bustFold();
  const after = stateOf(await currentFold([buyer.address]), a.tokenId).balances.get(MERCHANT) ?? 0n;
  check(`the merchant received ${a.symbol}`, after - before === price, `${fromRaw(before, DEC)} -> ${fromRaw(after, DEC)}`);
}

// ── the attack: a token that quotes a fortune and is backed by nothing ───────

head("attack: a worthless token quoting a fortune");
console.log("  launching FOOL with a virtual reserve of 1,000,000 XNO...");
const launchHash = await submitLink(
  nodeRpc,
  buyer,
  encodeOpLink("", { kind: "launch", supply: 1_000_000n * UNIT, name: "Fool", symbol: "FOOL", decimals: DEC, image: "", direct: true }),
  1n
);
const FOOL = tokenIdFromLaunchHash(launchHash);
const [fa, fb] = encodeFragLinks(FOOL, { kind: "seedLiq", xno: 1_000_000n * 10n ** 30n, tokens: 900_000n * UNIT });
await submitLink(nodeRpc, buyer, fa, 1n);
await submitLink(nodeRpc, buyer, fb, 1n);
console.log(`  FOOL ${FOOL} launched for 3 raw`);

// Let the chain settle so the fold sees it.
let fs: any = null;
for (let i = 0; i < 14; i++) {
  await sleep(2500);
  bustFold();
  fs = stateOf(await currentFold([buyer.address]), FOOL);
  if (fs.launched && fs.poolXno > 0n) break;
}
const fv = viewToken(FOOL, fs);
console.log(`  FOOL quotes ${fromRaw(fv.quotedValue, 30)} XNO of "value", backed by ${fromRaw(fv.backing, 30)} XNO`);
check("the fake token really does quote a fortune", BigInt(fv.quotedValue) > 1000n * 10n ** 30n, `${fromRaw(fv.quotedValue, 30)} XNO`);
check("and is backed by nothing", fv.backing === "0");

// Pay the offer with it. The offer does not list FOOL, so the quote is never
// consulted -- this is the whole reason acceptance is a list and not a price feed.
const foolPay = await payTokenWithReceipt(nodeRpc, buyer, FOOL, MERCHANT, 1n * UNIT, memoLink(offer.id));
const fvd = await verifyWithRetry(offer, foolPay.receipt, 8);
check("paying with the unlisted fortune-quoting token is REFUSED", !fvd.granted, fvd.reason);
check("and the refusal names what the offer does take", /TEACHER|STUDENT/.test(fvd.reason), fvd.reason);

// ── and the sort does not put the lie on top ────────────────────────────────

head("ordering");
bustFold();
const fold = await currentFold([buyer.address]);
const labels = new Map([
  [TEACHER, { symbol: "TEACHER" }],
  [STUDENT, { symbol: "STUDENT" }],
  [FOOL, { symbol: "FOOL" }],
]);
const byBacking = tokenList(fold, buyer.address, "backedHoldingValue", labels);
const byQuote = sortTokens(byBacking, "quotedHoldingValue");
console.log("  by quoted value (free to declare):");
for (const t of byQuote) console.log(`    ${t.symbol.padEnd(8)} ${fromRaw(t.quotedHoldingValue, 30)} XNO`);
console.log("  by real collateral (what holderPay sorts on):");
for (const t of byBacking) console.log(`    ${t.symbol.padEnd(8)} ${fromRaw(t.backedHoldingValue, 30)} XNO  backing=${fromRaw(t.backing, 30)}`);

const foolQuoteRank = byQuote.findIndex((t) => t.tokenId === FOOL);
const foolBackedRank = byBacking.findIndex((t) => t.tokenId === FOOL);
check("ordering by the free quote floats the lie to the top", foolQuoteRank === 0, `rank ${foolQuoteRank}`);
check("ordering by real collateral does not", foolBackedRank > 0 || byBacking.length === 1, `rank ${foolBackedRank}`);
check("the lie has zero backing in the list", byBacking[foolBackedRank]?.backing === "0");

head("summary");
console.log(results.join("\n"));
console.log(`\n${pass} passed, ${fail} failed`);
console.log(`buyer has ${fromRaw((await tip(nodeRpc, buyer.address)).balance, 30)} XNO left`);
process.exit(fail ? 1 : 0);
