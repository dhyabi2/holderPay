// Offline integration test of the whole TEACHER path.
//
// This builds a real chain -- genuinely signed Nano state blocks, in the right
// order, with the real op encodings -- and feeds it to the real hodlgame indexer
// and replay engine, then verifies the resulting payment with the real verdict
// function. Nothing about the protocol is stubbed; only the network is.
//
// It exists because the live test costs real XNO and real waiting. If the op
// construction in core/swap.ts is wrong, or a fragment pair is mis-ordered, or
// the watch set misses an account, this catches it for free.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as nanocurrency from "nanocurrency";

import { MemorySource } from "../vendor/hodl/indexer/blockSource.ts";
import type { NanoBlock } from "../vendor/hodl/core/blockVerify.ts";
import { encodeOpLink } from "../vendor/hodl/core/oplink.ts";
import { encodeFragLinks } from "../vendor/hodl/core/fraglink.ts";
import { tokenIdFromLaunchHash } from "../vendor/hodl/core/token.ts";
import { foldAccounts, stateOf, opApplied } from "./fold.ts";
import { makePolicy } from "./policy.ts";
import { memoLink } from "./proof.ts";
import { verifyPayment } from "./verify.ts";
import { planSwap, quoteBuy } from "./swap.ts";
import type { ChainReader, VerifiedBlock } from "./block.ts";

const XNO = 10n ** 30n;
const DECIMALS = 6;
const UNIT = 10n ** BigInt(DECIMALS);

function keys(seedByte: string) {
  const seed = seedByte.repeat(32);
  const secretKey = nanocurrency.deriveSecretKey(seed, 0);
  const publicKey = nanocurrency.derivePublicKey(secretKey);
  return { secretKey, publicKey, address: nanocurrency.deriveAddress(publicKey, { useNanoPrefix: true }) };
}

const creator = keys("a1");
const merchant = keys("b2");
const buyer = keys("c3");

const ZERO = "0".repeat(64);

/**
 * A tiny simulated ledger. Blocks are really signed and really hashed, so the
 * indexer's local verification passes for the same reason it does on mainnet.
 */
class Sim {
  source = new MemorySource();
  blocks = new Map<string, VerifiedBlock>();
  private tips = new Map<string, { hash: string; balance: bigint; height: bigint }>();
  private clock = 1_800_000_000;

  private opens = 0;

  /** Open an account with a balance (a receive, so no XNO is conjured). The
   * link of a receive is the source send's hash, which must be non-zero. */
  open(k: { secretKey: string; address: string }, balance: bigint) {
    const source = (++this.opens).toString(16).padStart(64, "e");
    return this.append(k, balance, source);
  }

  /** Append a block that sets `balance` and carries `link`. */
  append(k: { secretKey: string; address: string }, balance: bigint, link: string): VerifiedBlock {
    const t = this.tips.get(k.address);
    const previous = t?.hash ?? ZERO;
    const height = (t?.height ?? 0n) + 1n;
    const block = nanocurrency.createBlock(k.secretKey, {
      work: "0000000000000000",
      previous: t ? previous : null,
      representative: k.address,
      balance: balance.toString(),
      link,
    });
    const hash = block.hash.toUpperCase();
    const prevBalance = t?.balance ?? 0n;
    const delta = balance - prevBalance;
    const nb: NanoBlock = {
      account: k.address,
      hash,
      previous,
      link: link.toUpperCase(),
      representative: k.address,
      height,
      timestamp: String(this.clock++),
      balance: balance.toString(),
      amount: (delta < 0n ? -delta : delta).toString(),
      subtype: delta < 0n ? "send" : delta > 0n ? (t ? "receive" : "open") : "change",
    };
    this.source.push(nb);
    const vb: VerifiedBlock = {
      hash,
      account: k.address,
      previous,
      representative: k.address,
      balance,
      link: link.toUpperCase(),
      confirmed: true,
      timestamp: Number(nb.timestamp),
      height: Number(height),
    };
    this.blocks.set(hash, vb);
    this.tips.set(k.address, { hash, balance, height });
    return vb;
  }

  /** Spend `delta` raw on a data block carrying `link`. */
  op(k: { secretKey: string; address: string }, link: string, delta = 1n): VerifiedBlock {
    const bal = this.tips.get(k.address)!.balance;
    return this.append(k, bal - delta, link);
  }

  /** Send XNO to an address (the link is the recipient's pubkey). */
  send(k: { secretKey: string; address: string }, to: string, raw: bigint): VerifiedBlock {
    const bal = this.tips.get(k.address)!.balance;
    return this.append(k, bal - raw, nanocurrency.derivePublicKey(to));
  }

  balance(address: string): bigint {
    return this.tips.get(address)?.balance ?? 0n;
  }
}

/** A ChainReader over the simulated ledger plus a real fold of it. */
function readerFor(sim: Sim, accounts: string[]): ChainReader & { fold: () => Promise<any> } {
  let folded: any = null;
  const ensure = async () => (folded ??= await foldAccounts(sim.source, accounts));
  return {
    getBlock: async (h: string) => sim.blocks.get((h ?? "").toUpperCase()) ?? null,
    tokenOpApplied: async (tokenId: string, carrier: string) => opApplied(await ensure(), tokenId, carrier),
    fold: ensure,
  };
}

/** Launch TEACHER and seed its virtual curve, exactly as scripts/launch-token.ts does. */
function launchTeacher(sim: Sim, supplyWhole: bigint, seedXno: bigint, seedTokensWhole: bigint) {
  sim.open(creator, XNO);
  const supply = supplyWhole * UNIT;
  const launch = sim.op(
    creator,
    encodeOpLink("", {
      kind: "launch",
      supply,
      name: "Teacher",
      symbol: "TEACHER",
      decimals: DECIMALS,
      image: "",
      direct: true,
    })
  );
  const tokenId = tokenIdFromLaunchHash(launch.hash);
  const [sa, sb] = encodeFragLinks(tokenId, { kind: "seedLiq", xno: seedXno, tokens: seedTokensWhole * UNIT });
  sim.op(creator, sa);
  sim.op(creator, sb);
  return { tokenId, launch };
}

test("TEACHER launches with a 5% creator cap and a seeded virtual curve", async () => {
  const sim = new Sim();
  const { tokenId } = launchTeacher(sim, 1_000_000n, XNO / 100n, 100_000n);
  const fold = await foldAccounts(sim.source, [creator.address]);
  const s = stateOf(fold, tokenId);

  assert.equal(s.launched, true);
  assert.equal(s.direct, true, "new launches are zero-custody");
  assert.equal(s.decimals, DECIMALS, "decimals are consensus-bound in the launch link");
  assert.equal(s.supply, 1_000_000n * UNIT);
  assert.equal(s.creatorShare, 50_000n * UNIT, "exactly 5% of supply");
  assert.equal(s.balances.get(creator.address), 50_000n * UNIT);
  assert.equal(s.poolTokens, 100_000n * UNIT, "seed moved tokens out of the treasury");
  assert.equal(s.poolXno, XNO / 100n, "virtual XNO reserve sets the price, claims no money");
  assert.equal(s.treasury, 850_000n * UNIT);
});

test("the auto-swap lane really produces a verifiable TEACHER payment", async () => {
  const sim = new Sim();
  const { tokenId } = launchTeacher(sim, 1_000_000n, XNO / 100n, 100_000n);

  // The buyer arrives with XNO only.
  sim.open(buyer, XNO / 1000n); // 0.001 XNO
  sim.open(merchant, 0n);

  const accounts = [creator.address, buyer.address, merchant.address];
  let fold = await foldAccounts(sim.source, accounts);
  let s = stateOf(fold, tokenId);

  const price = 1n * UNIT; // 1 TEACHER
  const plan = planSwap({
    state: s,
    walletBalance: sim.balance(buyer.address),
    myFloor: 0n,
    wantTokens: price,
    slippageBps: 300,
  });
  assert.equal(plan.problem, undefined, plan.problem);
  assert.equal(plan.lane, "earmark", "nobody is queued, so nothing should move");
  assert.ok(plan.tokensOut >= price, `quote ${plan.tokensOut} must cover ${price}`);

  // Execute the plan the way core/swap.ts does: a fragment buy pair.
  const [ba, bb] = encodeFragLinks(tokenId, { kind: "buy", xno: plan.xno, minTokens: plan.minTokens });
  sim.op(buyer, ba);
  sim.op(buyer, bb);

  fold = await foldAccounts(sim.source, accounts);
  s = stateOf(fold, tokenId);
  const bought = s.balances.get(buyer.address) ?? 0n;
  assert.ok(bought >= price, `buyer should hold at least ${price}, holds ${bought}`);
  assert.equal(s.earmark.get(buyer.address), plan.xno, "the XNO stayed put as collateral");
  assert.equal(quoteBuy(XNO / 100n, 100_000n * UNIT, plan.xno), bought, "quote matched execution exactly");

  // Now pay the merchant in TEACHER, with the receipt chained on.
  const policy = makePolicy({
    merchant: merchant.address,
    resource: "course/nano-101",
    title: "Nano 101",
    description: "",
    priceToken: price.toString(),
    token: { tokenId, symbol: "TEACHER", decimals: DECIMALS },
    autoswap: true,
    expires: 0,
  });
  const [ta, tb] = encodeFragLinks(tokenId, { kind: "transfer", to: merchant.address, amount: price });
  const fragA = sim.op(buyer, ta);
  sim.op(buyer, tb);
  const receipt = sim.op(buyer, memoLink(policy.id));

  const reader = readerFor(sim, accounts);
  const v = await verifyPayment(policy, receipt.hash, reader);
  assert.equal(v.granted, true, v.reason);
  assert.equal(v.asset, "TOKEN");
  assert.equal(v.paid, price.toString());
  assert.equal(v.payer, buyer.address);

  // And the merchant is genuinely richer in the replay.
  const after = stateOf(await reader.fold(), tokenId);
  assert.equal(after.balances.get(merchant.address), price);
  assert.equal(opApplied(await reader.fold(), tokenId, fragA.hash).applied, true);
});

test("a transfer of tokens the payer never bought does not apply, so it is refused", async () => {
  const sim = new Sim();
  const { tokenId } = launchTeacher(sim, 1_000_000n, XNO / 100n, 100_000n);
  sim.open(buyer, XNO / 1000n);
  sim.open(merchant, 0n);

  const price = 1n * UNIT;
  const policy = makePolicy({
    merchant: merchant.address,
    resource: "course/nano-101",
    title: "Nano 101",
    description: "",
    priceToken: price.toString(),
    token: { tokenId, symbol: "TEACHER", decimals: DECIMALS },
    autoswap: true,
    expires: 0,
  });

  // No buy. Straight to a signed transfer of tokens the buyer does not hold.
  const [ta, tb] = encodeFragLinks(tokenId, { kind: "transfer", to: merchant.address, amount: price });
  sim.op(buyer, ta);
  sim.op(buyer, tb);
  const receipt = sim.op(buyer, memoLink(policy.id));

  const reader = readerFor(sim, [creator.address, buyer.address, merchant.address]);
  const v = await verifyPayment(policy, receipt.hash, reader);
  assert.equal(v.granted, false);
  assert.match(v.reason, /did not apply in the ledger/);
  const after = stateOf(await reader.fold(), tokenId);
  assert.equal(after.balances.get(merchant.address) ?? 0n, 0n, "the merchant got nothing, correctly");
});

test("a buy declaring more XNO than the wallet holds does not apply", async () => {
  // The self-earmark lane is only valid if the signed block balance covers the
  // declared amount. This is the check that stops a buyer minting tokens against
  // collateral they do not have.
  const sim = new Sim();
  const { tokenId } = launchTeacher(sim, 1_000_000n, XNO / 100n, 100_000n);
  sim.open(buyer, 1000n); // 1000 raw: almost nothing

  const [ba, bb] = encodeFragLinks(tokenId, { kind: "buy", xno: XNO, minTokens: 0n }); // claims a whole XNO
  sim.op(buyer, ba);
  sim.op(buyer, bb);

  const fold = await foldAccounts(sim.source, [creator.address, buyer.address]);
  const s = stateOf(fold, tokenId);
  assert.equal(s.balances.get(buyer.address) ?? 0n, 0n, "an unbacked buy must credit nothing");
});

test("an XNO payment verifies against the same chain the token path uses", async () => {
  const sim = new Sim();
  launchTeacher(sim, 1_000_000n, XNO / 100n, 100_000n);
  sim.open(buyer, XNO / 1000n);
  sim.open(merchant, 0n);

  const price = XNO / 100_000n; // 0.00001 XNO
  const policy = makePolicy({
    merchant: merchant.address,
    resource: "course/nano-101",
    title: "Nano 101",
    description: "",
    priceXno: price.toString(),
    autoswap: false,
    expires: 0,
  });
  sim.send(buyer, merchant.address, price);
  const receipt = sim.op(buyer, memoLink(policy.id));

  const reader = readerFor(sim, [creator.address, buyer.address, merchant.address]);
  const v = await verifyPayment(policy, receipt.hash, reader);
  assert.equal(v.granted, true, v.reason);
  assert.equal(v.asset, "XNO");
  assert.equal(v.paid, price.toString());
});
