// Live proof that an offer can take a token it never heard of -- and that a
// worthless one still cannot pay.
//
//   node --experimental-strip-types scripts/e2e-anytoken.ts
//
// Pays the "any token" offer on mainnet with STUDENT, which that offer does NOT
// list, priced purely by STUDENT's real collateral. Then tries the same offer
// with a token that quotes a fortune and is backed by nothing.

import * as fs from "node:fs";
import { loadEnv, env } from "../core/env.ts";
import { rpc as nodeRpc } from "../core/rpc.ts";
import { keysFromSeed, receiveAll, tip, fromRaw, toRaw, sendXno, waitForReceivable } from "../core/wallet.ts";
import { memoLink } from "../core/proof.ts";
import { verifyPayment, type Verdict } from "../core/verify.ts";
import { NodeReader } from "../core/reader.ts";
import { currentFold, stateOf, bustFold } from "../core/ledger.ts";
import { tokens as launchedTokens } from "../vendor/hodl/core/multi.ts";
import { backingOf, circulatingOf } from "../core/valuation.ts";
import { planSwap, executeSwap, payTokenWithReceipt } from "../core/swap.ts";
import { acceptAnyOf, type Policy } from "../core/policy.ts";

loadEnv();
const buyer = keysFromSeed(env("BUYER_SEED"));
const MERCHANT = env("MERCHANT_ADDRESS");
const STUDENT = env("STUDENT_TOKEN_ID");

let pass = 0, fail = 0;
const check = (n: string, ok: boolean, d = "") => {
  ok ? pass++ : fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${n}${d ? " — " + d : ""}`);
};
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const listings = JSON.parse(fs.readFileSync("data/catalog.json", "utf8")).listings;
const listing = listings.find((l: any) => l.policy.acceptAny);
if (!listing) throw new Error("no acceptAny offer in the catalog -- run scripts/publish-offers.ts");
const policy: Policy = listing.policy;
const any = acceptAnyOf(policy)!;

console.log(`offer   ${policy.title}`);
console.log(`policy  ${policy.id}`);
console.log(`wants   ${fromRaw(any.priceXno, 30)} XNO of real collateral`);
console.log(`listed  ${(policy.accept ?? []).map((a: any) => a.symbol).join(", ") || "(nothing)"}`);

async function verifyWithRetry(receipt: string, tries = 16): Promise<Verdict> {
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

// ── make sure the buyer can actually afford the swap ────────────────────────
// Paying by collateral means BUYING collateral: the earmark that backs the
// tokens is real XNO the payer must hold. A thin wallet cannot pay this way,
// which is the point of the design rather than a limitation of the test.
const NEED_XNO = toRaw("0.0003", 30);
await receiveAll(nodeRpc, buyer);
{
  const b = await tip(nodeRpc, buyer.address);
  if (b.balance < NEED_XNO) {
    const creator = keysFromSeed(env("CREATOR_SEED"));
    const top = NEED_XNO - b.balance;
    console.log(`funding buyer with ${fromRaw(top, 30)} XNO`);
    await sendXno(nodeRpc, creator, buyer.address, top);
    if (!(await waitForReceivable(nodeRpc, buyer.address, top, 90_000))) {
      throw new Error("top-up never became receivable");
    }
    await receiveAll(nodeRpc, buyer);
  }
}
console.log(`buyer   ${fromRaw((await tip(nodeRpc, buyer.address)).balance, 30)} XNO`);

// ── what STUDENT must send, from its collateral alone ───────────────────────
bustFold();
let fold = await currentFold([buyer.address]);
let s = stateOf(fold, STUDENT);
let backing = backingOf(s), circ = circulatingOf(s);
const price = BigInt(any.priceXno);
let need = (price * circ + backing - 1n) / backing;

console.log(`\nSTUDENT backing ${fromRaw(backing, 30)} XNO over ${fromRaw(circ, s.decimals)} circulating`);
console.log(`  => ${fromRaw(need, s.decimals)} STUDENT must change hands`);
check("STUDENT is not listed on this offer", !(policy.accept ?? []).some((a: any) => a.tokenId === STUDENT));
check("a price is derivable from real collateral", need > 0n && backing > 0n);

let have = s.balances.get(buyer.address) ?? 0n;
if (have < need) {
  const plan = planSwap({
    state: s,
    walletBalance: (await tip(nodeRpc, buyer.address)).balance,
    myFloor: s.earmarkFloor.get(buyer.address) ?? 0n,
    wantTokens: need - have,
    slippageBps: 500,
  });
  if (plan.problem && plan.tokensOut <= 0n) {
    check("swap into STUDENT", false, plan.problem);
  } else {
    console.log(`  swapping ${fromRaw(plan.xno, 30)} XNO -> ${fromRaw(plan.tokensOut, s.decimals)} STUDENT (${plan.lane})`);
    await executeSwap(nodeRpc, buyer, STUDENT, plan);
    for (let i = 0; i < 14; i++) {
      await sleep(2500);
      bustFold();
      fold = await currentFold([buyer.address]);
      s = stateOf(fold, STUDENT);
      have = s.balances.get(buyer.address) ?? 0n;
      // The swap earmarks more XNO, which RAISES backing -- so what is owed
      // moves too. Recompute rather than trusting the first number.
      backing = backingOf(s);
      circ = circulatingOf(s);
      need = (price * circ + backing - 1n) / backing;
      if (have >= need) break;
    }
  }
}
console.log(`  buyer holds ${fromRaw(have, s.decimals)} STUDENT, needs ${fromRaw(need, s.decimals)}`);
check("the buyer can cover the collateral price", have >= need, `${fromRaw(have, s.decimals)} held`);

if (have >= need) {
  const before = stateOf(await currentFold([buyer.address]), STUDENT).balances.get(MERCHANT) ?? 0n;
  const r = await payTokenWithReceipt(nodeRpc, buyer, STUDENT, MERCHANT, need, memoLink(policy.id));
  console.log(`  receipt ${r.receipt}`);
  const v = await verifyWithRetry(r.receipt);
  check("an UNLISTED token pays the offer", v.granted, v.reason);
  check("the verdict names the token paid", v.tokenId === STUDENT, v.tokenId ?? "none");
  bustFold();
  const after = stateOf(await currentFold([buyer.address]), STUDENT).balances.get(MERCHANT) ?? 0n;
  check("the merchant received it", after > before, `${fromRaw(before, s.decimals)} -> ${fromRaw(after, s.decimals)}`);
}

// ── and the worthless token still cannot ────────────────────────────────────
bustFold();
fold = await currentFold([buyer.address]);
const worthless = launchedTokens(fold.state)
  .map(({ tokenId }) => tokenId)
  .find((id: string) => {
    const st = stateOf(fold, id);
    return backingOf(st) === 0n && (st.balances.get(buyer.address) ?? 0n) > 0n;
  });
if (!worthless) {
  console.log("\n  (no zero-backing token held by the buyer to test with)");
} else {
  const st = stateOf(fold, worthless);
  const held = st.balances.get(buyer.address) ?? 0n;
  console.log(`\nworthless token ${worthless.slice(0, 10)}: buyer holds ${fromRaw(held, st.decimals)}, backing 0`);
  const r = await payTokenWithReceipt(nodeRpc, buyer, worthless, MERCHANT, held / 2n, memoLink(policy.id));
  const v = await verifyWithRetry(r.receipt, 6);
  check("a token backed by nothing is REFUSED", !v.granted, v.reason);
  check("and the refusal says why", /no collateral/.test(v.reason), v.reason);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
