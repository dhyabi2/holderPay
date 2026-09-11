// Live end-to-end test, on Nano mainnet, with micro amounts.
//
//   node --experimental-strip-types scripts/e2e.ts [--xno-price 0.00001] [--only xno|token|swap|attacks]
//
// It does the whole thing for real: funds a buyer, publishes an offer, pays it
// three different ways, verifies each payment against the chain, and then tries
// to cheat the verifier in every way the design claims to prevent. Nothing is
// mocked -- every block here is a real signed Nano block, and every verdict
// comes from core/verify.ts reading it back through rpc.nano.to.
//
// Budget: the payments are 0.00001 XNO each and every data block burns 1 raw,
// so a full run costs well under 0.0001 XNO.

import { loadEnv, env } from "../core/env.ts";
import { rpc as nodeRpc } from "../core/rpc.ts";
import { keysFromSeed, receiveAll, sendXno, submitLink, tip, toRaw, fromRaw, XNO, type Keys } from "../core/wallet.ts";
import { makePolicy, type Policy } from "../core/policy.ts";
import { memoLink, signAuth, verifyAuth } from "../core/proof.ts";
import { verifyPayment, type Verdict } from "../core/verify.ts";
import { NodeReader } from "../core/reader.ts";
import { currentFold, stateOf, bustFold } from "../core/ledger.ts";
import { planSwap, executeSwap, payTokenWithReceipt } from "../core/swap.ts";
import { addressToPub } from "../core/block.ts";
import { ANCHOR_PUB } from "../vendor/hodl/core/anchor.ts";
import * as nanocurrency from "nanocurrency";

loadEnv();

const argv = process.argv.slice(2);
const arg = (n: string, d: string) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};
const only = arg("only", "");
const want = (phase: string) => !only || only === phase;

const TOKEN_ID = env("TEACHER_TOKEN_ID");
const DECIMALS = 6;
const creator = keysFromSeed(env("CREATOR_SEED"));
const merchantKeys = keysFromSeed(env("MERCHANT_SEED"));
const buyer = keysFromSeed(env("BUYER_SEED"));
const MERCHANT = merchantKeys.address;
const PRICE_XNO = toRaw(arg("xno-price", "0.00001"), 30);
const PRICE_TOKEN = 1n * 10n ** BigInt(DECIMALS); // 1 TEACHER

let pass = 0;
let fail = 0;
const results: string[] = [];

function check(name: string, ok: boolean, detail = "") {
  if (ok) {
    pass++;
    console.log(`  PASS  ${name}${detail ? " — " + detail : ""}`);
  } else {
    fail++;
    console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`);
  }
  results.push(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

function head(s: string) {
  console.log(`\n=== ${s} ===`);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Wait until a verdict settles (the node confirms both blocks). */
async function verifyWithRetry(policy: Policy, receipt: string, payer: string, tries = 12): Promise<Verdict> {
  let last: Verdict | null = null;
  for (let i = 0; i < tries; i++) {
    bustFold(); // a fresh replay each attempt: this is the real check, not a cache
    const v = await verifyPayment(policy, receipt, new NodeReader([payer]));
    last = v;
    if (v.granted) return v;
    // Only these reasons are worth waiting on; the rest are final.
    if (!/confirmation|not present in this verifier/.test(v.reason)) return v;
    await sleep(2500);
  }
  return last!;
}

async function ensureHellos(k: Keys, label: string) {
  for (const [who, target] of [
    ["hodlgame", ANCHOR_PUB],
    ["holderPay", env("HOLDERPAY_ANCHOR_ADDRESS")],
  ] as const) {
    if (!target) continue;
    try {
      const pub = /^[0-9a-fA-F]{64}$/.test(target) ? target : nanocurrency.derivePublicKey(target);
      await submitLink(nodeRpc, k, pub, 1n);
      console.log(`  ${label} greeted the ${who} anchor`);
    } catch (e: any) {
      console.log(`  ${label} hello to ${who} failed: ${e.message}`);
    }
  }
}

// ── the offers under test ───────────────────────────────────────────────────

const xnoOffer = makePolicy({
  merchant: MERCHANT,
  resource: "e2e/xno-lane",
  title: "e2e: XNO lane",
  description: "paid in XNO, straight to the merchant",
  priceXno: PRICE_XNO.toString(),
  autoswap: false,
  expires: 0,
});

const tokenOffer = makePolicy({
  merchant: MERCHANT,
  resource: "e2e/token-lane",
  title: "e2e: TEACHER lane",
  description: "paid in TEACHER; XNO payers are swapped into it",
  priceToken: PRICE_TOKEN.toString(),
  token: { tokenId: TOKEN_ID, symbol: "TEACHER", decimals: DECIMALS },
  autoswap: true,
  expires: 0,
});

// ── phases ─────────────────────────────────────────────────────────────────

async function setup() {
  head("setup");
  console.log(`  creator  ${creator.address}`);
  console.log(`  merchant ${MERCHANT}`);
  console.log(`  buyer    ${buyer.address}`);
  console.log(`  token    ${TOKEN_ID || "(none: run scripts/launch-token.ts first)"}`);

  await receiveAll(nodeRpc, creator);
  const c = await tip(nodeRpc, creator.address);
  console.log(`  creator balance ${fromRaw(c.balance, 30)} XNO`);
  if (!c.frontier) throw new Error(`fund the creator first: ${creator.address}`);

  // Give the buyer enough for the payments plus a few hundred raw of block costs.
  const need = PRICE_XNO * 4n + 10_000n;
  let b = await tip(nodeRpc, buyer.address);
  if (b.balance < need) {
    const topUp = need - b.balance;
    if (c.balance < topUp + 1000n) throw new Error("creator cannot cover the buyer top-up");
    const h = await sendXno(nodeRpc, creator, buyer.address, topUp);
    console.log(`  funded buyer with ${fromRaw(topUp, 30)} XNO (${h.slice(0, 12)}…)`);
    const got = await receiveAll(nodeRpc, buyer);
    console.log(`  buyer received ${got.count} block(s)`);
    b = await tip(nodeRpc, buyer.address);
  }
  console.log(`  buyer balance   ${fromRaw(b.balance, 30)} XNO`);
  await ensureHellos(buyer, "buyer");
}

async function phaseXno() {
  head("XNO lane: pay the merchant directly");
  const payment = await sendXno(nodeRpc, buyer, MERCHANT, PRICE_XNO);
  console.log(`  payment ${payment}`);
  const receipt = await submitLink(nodeRpc, buyer, memoLink(xnoOffer.id), 1n);
  console.log(`  receipt ${receipt}`);

  const v = await verifyWithRetry(xnoOffer, receipt, buyer.address);
  check("an XNO payment of the exact price grants access", v.granted, v.reason);
  check("the verdict names the right payer", v.payer === buyer.address, v.payer ?? "none");
  check("the verdict names the right amount", v.paid === PRICE_XNO.toString(), v.paid ?? "none");
  check("the verdict carries a recomputable grant id", !!v.grant, v.grant ?? "none");

  // Proving control of the paying account.
  const challenge = "e2e-" + Date.now();
  const sig = signAuth(buyer.secretKey, xnoOffer.id, receipt, challenge);
  check(
    "the payer can answer a challenge",
    verifyAuth(addressToPub(buyer.address), sig, xnoOffer.id, receipt, challenge)
  );
  check(
    "a different account cannot answer it",
    !verifyAuth(addressToPub(creator.address), sig, xnoOffer.id, receipt, challenge)
  );

  return { receipt, payment };
}

async function phaseToken() {
  head("TEACHER lane: auto-swap XNO into the token, then pay in the token");
  if (!TOKEN_ID) {
    check("token lane", false, "TEACHER_TOKEN_ID not set — run scripts/launch-token.ts");
    return null;
  }

  bustFold();
  let f = await currentFold([buyer.address]);
  let s = stateOf(f, TOKEN_ID);
  console.log(`  token launched=${s.launched} direct=${s.direct} poolXno=${s.poolXno} poolTokens=${s.poolTokens}`);
  console.log(`  watching ${f.accounts.length} account(s)`);
  check("holderPay's own replay sees the token as launched", s.launched);
  check("the token is zero-custody (Direct-Settlement)", s.direct);
  check("the curve has liquidity to swap against", s.poolXno > 0n && s.poolTokens > 0n);
  if (!s.launched || s.poolXno <= 0n) return null;

  const have = s.balances.get(buyer.address) ?? 0n;
  if (have < PRICE_TOKEN) {
    const missing = PRICE_TOKEN - have;
    const walletBalance = (await tip(nodeRpc, buyer.address)).balance;
    const plan = planSwap({
      state: s,
      walletBalance,
      myFloor: s.earmarkFloor.get(buyer.address) ?? 0n,
      wantTokens: missing,
      slippageBps: 300,
    });
    console.log(
      `  swap plan: lane=${plan.lane} spend=${fromRaw(plan.xno, 30)} XNO -> ${fromRaw(plan.tokensOut, DECIMALS)} TEACHER` +
        (plan.payTo ? ` to queued seller ${plan.payTo.slice(0, 12)}…` : "")
    );
    if (plan.problem) console.log(`  note: ${plan.problem}`);
    check("a swap plan covers the price", plan.tokensOut >= missing, `${plan.tokensOut} vs ${missing}`);
    if (plan.tokensOut < missing) return null;

    const h = await executeSwap(nodeRpc, buyer, TOKEN_ID, plan);
    console.log(`  swap block ${h}`);

    // Give the node a moment to confirm, then re-replay.
    for (let i = 0; i < 12; i++) {
      await sleep(2500);
      bustFold();
      f = await currentFold([buyer.address]);
      s = stateOf(f, TOKEN_ID);
      if ((s.balances.get(buyer.address) ?? 0n) >= PRICE_TOKEN) break;
    }
    const now = s.balances.get(buyer.address) ?? 0n;
    check("the swap credited the buyer in the replay", now >= PRICE_TOKEN, `${fromRaw(now, DECIMALS)} TEACHER`);
    if (now < PRICE_TOKEN) {
      const why = [...f.rejectedByCarrier.values()].slice(-3).join(" | ");
      console.log(`  last rejections: ${why || "(none)"}`);
      return null;
    }
  }

  const merchantBefore = s.balances.get(MERCHANT) ?? 0n;
  const r = await payTokenWithReceipt(nodeRpc, buyer, TOKEN_ID, MERCHANT, PRICE_TOKEN, memoLink(tokenOffer.id));
  console.log(`  transfer ${r.fragA} + ${r.payment}`);
  console.log(`  receipt  ${r.receipt}`);

  const v = await verifyWithRetry(tokenOffer, r.receipt, buyer.address, 16);
  check("a TEACHER payment of the exact price grants access", v.granted, v.reason);
  check("the verdict reports the TOKEN lane", v.asset === "TOKEN", v.asset ?? "none");

  bustFold();
  const after = stateOf(await currentFold([buyer.address]), TOKEN_ID).balances.get(MERCHANT) ?? 0n;
  check(
    "the merchant's token balance actually grew by the price",
    after - merchantBefore === PRICE_TOKEN,
    `${fromRaw(merchantBefore, DECIMALS)} -> ${fromRaw(after, DECIMALS)}`
  );

  return { receipt: r.receipt, payment: r.payment };
}

async function phaseAttacks(xnoReceipt: string) {
  head("attacks: every way the design says a grant cannot be faked");
  const reader = () => new NodeReader([buyer.address]);

  // 1. A receipt that does not exist.
  let v = await verifyPayment(xnoOffer, "AB".repeat(32), reader());
  check("an invented receipt hash is refused", !v.granted, v.reason);

  // 2. A real payment, re-pointed at a different offer.
  const other = makePolicy({ ...xnoOffer, resource: "e2e/some-other-thing" });
  v = await verifyPayment(other, xnoReceipt, reader());
  check("a real receipt cannot be reused for a different offer", !v.granted, v.reason);

  // 3. The same offer with the price raised after the fact.
  const raised = { ...xnoOffer, priceXno: (PRICE_XNO * 100n).toString() } as Policy;
  v = await verifyPayment(raised, xnoReceipt, reader());
  check("editing the price breaks the policy id, so it is refused", !v.granted, v.reason);

  // 4. An underpayment, on chain for real.
  const dear = makePolicy({ ...xnoOffer, resource: "e2e/dear", priceXno: (PRICE_XNO * 10n).toString() });
  await sendXno(nodeRpc, buyer, MERCHANT, PRICE_XNO); // pays a tenth of the asking price
  const shortReceipt = await submitLink(nodeRpc, buyer, memoLink(dear.id), 1n);
  v = await verifyWithRetry(dear, shortReceipt, buyer.address, 8);
  check("paying a tenth of the price is refused as underpaid", !v.granted && /underpaid/.test(v.reason), v.reason);

  // 5. A receipt with no payment under it: commit to an offer without paying.
  const ghost = makePolicy({ ...xnoOffer, resource: "e2e/ghost" });
  const ghostReceipt = await submitLink(nodeRpc, buyer, memoLink(ghost.id), 1n);
  v = await verifyWithRetry(ghost, ghostReceipt, buyer.address, 8);
  check("committing to an offer without paying is refused", !v.granted, v.reason);

  // 6. Paying the right amount to the wrong address.
  const wrong = makePolicy({ ...xnoOffer, resource: "e2e/wrong-dest" });
  await sendXno(nodeRpc, buyer, creator.address, PRICE_XNO);
  const wrongReceipt = await submitLink(nodeRpc, buyer, memoLink(wrong.id), 1n);
  v = await verifyWithRetry(wrong, wrongReceipt, buyer.address, 8);
  check("paying the right price to the wrong address is refused", !v.granted, v.reason);

  // 7. A signature from the wrong key cannot claim a real grant.
  const challenge = "attack-" + Date.now();
  const forgedSig = signAuth(creator.secretKey, xnoOffer.id, xnoReceipt, challenge);
  check(
    "someone who merely read the receipt off the ledger cannot claim it",
    !verifyAuth(addressToPub(buyer.address), forgedSig, xnoOffer.id, xnoReceipt, challenge)
  );
}

async function main() {
  await setup();

  let xnoReceipt = "";
  if (want("xno")) {
    const r = await phaseXno();
    xnoReceipt = r.receipt;
  }
  if (want("token") || want("swap")) await phaseToken();
  if (want("attacks")) {
    if (!xnoReceipt) {
      const r = await phaseXno();
      xnoReceipt = r.receipt;
    }
    await phaseAttacks(xnoReceipt);
  }

  head("summary");
  console.log(results.join("\n"));
  console.log(`\n${pass} passed, ${fail} failed`);
  const left = await tip(nodeRpc, buyer.address);
  console.log(`buyer has ${fromRaw(left.balance, 30)} XNO left`);
  process.exit(fail ? 1 : 0);
}

await main();
