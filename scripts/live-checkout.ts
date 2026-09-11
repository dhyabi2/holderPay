// Live checkout through the running server, exactly as the page does it.
//
//   node --experimental-strip-types scripts/live-checkout.ts [--url http://localhost:8787]
//
// The e2e script proves the chain logic by calling core/verify.ts directly.
// This proves the HTTP surface the browser actually uses: publish, pay, verify,
// answer a challenge, collect the goods -- and then asks the server to lie and
// checks that an independent verifier catches it.

import { loadEnv, env } from "../core/env.ts";
import { rpc as nodeRpc } from "../core/rpc.ts";
import { keysFromSeed, sendXno, submitLink, fromRaw, tip } from "../core/wallet.ts";
import { memoLink, signAuth } from "../core/proof.ts";
import { verifyPayment } from "../core/verify.ts";
import { NodeReader } from "../core/reader.ts";
import { bustFold } from "../core/ledger.ts";
import type { Policy } from "../core/policy.ts";

loadEnv();

const argv = process.argv.slice(2);
const base = (() => {
  const i = argv.indexOf("--url");
  return i >= 0 && argv[i + 1] ? argv[i + 1] : `http://localhost:${env("PORT", "8787")}`;
})();

const buyer = keysFromSeed(env("BUYER_SEED"));

let pass = 0;
let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  if (ok) pass++;
  else fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
}

const api = async (path: string, init?: RequestInit) => {
  const res = await fetch(base + path, init);
  return { status: res.status, body: await res.json().catch(() => ({})) };
};
const post = (path: string, body: unknown) =>
  api(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

console.log(`checkout against ${base}\n`);

// ── pick an offer the buyer can actually afford in XNO ───────────────────────
const { body: listed } = await api("/api/policies");
const listings: { policy: Policy }[] = listed.listings ?? [];
const listing = listings.find((l) => l.policy.priceXno && BigInt(l.policy.priceXno) > 0n);
if (!listing) throw new Error("no published offer accepts XNO — run scripts/publish-offers.ts");
const policy = listing.policy;
console.log(`offer    ${policy.title}`);
console.log(`policy   ${policy.id}`);
console.log(`price    ${fromRaw(policy.priceXno!, 30)} XNO`);

const bal = await tip(nodeRpc, buyer.address);
console.log(`buyer    ${buyer.address} (${fromRaw(bal.balance, 30)} XNO)\n`);
if (bal.balance < BigInt(policy.priceXno!) + 10n) throw new Error("buyer cannot afford this offer");

// ── pay ──────────────────────────────────────────────────────────────────────
const payment = await sendXno(nodeRpc, buyer, policy.merchant, BigInt(policy.priceXno!));
const receipt = await submitLink(nodeRpc, buyer, memoLink(policy.id), 1n);
console.log(`payment  ${payment}`);
console.log(`receipt  ${receipt}\n`);

// ── the server's verdict ─────────────────────────────────────────────────────
let verdict: any = null;
for (let i = 0; i < 12; i++) {
  const r = await post("/api/verify", { policy, receipt, payer: buyer.address });
  verdict = r.body.verdict;
  if (verdict?.granted) break;
  await sleep(2500);
}
check("the server's /api/verify grants the payment", !!verdict?.granted, verdict?.reason);
check("it reports the XNO lane", verdict?.asset === "XNO", verdict?.asset);

// ── an independent verifier, agreeing ────────────────────────────────────────
bustFold();
const mine = await verifyPayment(policy, receipt, new NodeReader([buyer.address]));
check("an independent verifier reaches the same verdict", mine.granted === !!verdict?.granted);
check("and the same grant id", mine.grant === verdict?.grant, mine.grant ?? "none");

// ── claim the goods ──────────────────────────────────────────────────────────
const { body: ch } = await api("/api/challenge");
const signature = signAuth(buyer.secretKey, policy.id, receipt, ch.challenge);
const claim = await post("/api/access", {
  policyId: policy.id,
  receipt,
  challenge: ch.challenge,
  signature,
  payer: buyer.address,
});
check("/api/access hands over the goods", claim.status === 200 && !!claim.body.unlock, claim.body.error ?? "");
if (claim.body.unlock) console.log(`\n--- unlocked ---\n${claim.body.unlock}\n----------------\n`);

// A challenge is one-shot: replaying the same signature must not work twice.
const replay = await post("/api/access", {
  policyId: policy.id,
  receipt,
  challenge: ch.challenge,
  signature,
  payer: buyer.address,
});
check("the same challenge cannot be replayed", replay.status !== 200, `status ${replay.status}`);

// A wrong signature over a real, granted payment must be refused.
const { body: ch2 } = await api("/api/challenge");
const wrongSig = signAuth(keysFromSeed(env("CREATOR_SEED")).secretKey, policy.id, receipt, ch2.challenge);
const impostor = await post("/api/access", {
  policyId: policy.id,
  receipt,
  challenge: ch2.challenge,
  signature: wrongSig,
  payer: buyer.address,
});
check("someone else's signature is refused on a real payment", impostor.status === 401, `status ${impostor.status}`);

// ── the tamper test ──────────────────────────────────────────────────────────
// Ask the server to forge a grant for a receipt that does not verify, and check
// that a verifier which does its own work is not fooled.
const fakeReceipt = "AB".repeat(32);
const forged = await post("/api/verify?forge=1", { policy, receipt: fakeReceipt, payer: buyer.address });
const serverSaid = forged.body.verdict;
if (!forged.body.forged) {
  console.log("  SKIP  tamper test — the forge route is disabled (set HOLDERPAY_DEV=1 to demo it)");
} else {
  check("the server can be made to claim a grant it should not", serverSaid?.granted === true);
  bustFold();
  const truth = await verifyPayment(policy, fakeReceipt, new NodeReader([buyer.address]));
  check("an independent verifier refuses the forged grant", truth.granted === false, truth.reason);
  check("so the two disagree, visibly", serverSaid?.granted !== truth.granted);
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
