// Accepting many tokens, and refusing to be fooled about what they are worth.
//
// The dangerous part of "accept all tokens" is not the plumbing, it is the
// valuation. A Direct-Settlement token's XNO reserve is a free declaration, so
// any automatic pricing off the AMM quote is an unlimited withdrawal. These
// tests pin both halves: the plumbing works for arbitrarily many tokens, and
// the free lie never turns into a grant or a top spot in the list.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as nanocurrency from "nanocurrency";

import { MemorySource } from "../vendor/hodl/indexer/blockSource.ts";
import { encodeOpLink } from "../vendor/hodl/core/oplink.ts";
import { encodeFragLinks } from "../vendor/hodl/core/fraglink.ts";
import { tokenIdFromLaunchHash } from "../vendor/hodl/core/token.ts";
import { foldAccounts, stateOf, opApplied } from "./fold.ts";
import {
  makePolicy,
  policyIsIntact,
  acceptedTokens,
  acceptedToken,
  acceptsToken,
  swapTarget,
  normalizeAccept,
  type Policy,
} from "./policy.ts";
import { memoLink } from "./proof.ts";
import { verifyPayment, lanesOf } from "./verify.ts";
import { tokenList, sortTokens, viewToken, backingOf, circulatingOf, quotedPriceOf } from "./valuation.ts";
import type { ChainReader, VerifiedBlock } from "./block.ts";

const XNO = 10n ** 30n;
const DEC = 6;
const UNIT = 10n ** BigInt(DEC);
const ZERO = "0".repeat(64);

function keys(byte: string) {
  const seed = byte.repeat(32);
  const secretKey = nanocurrency.deriveSecretKey(seed, 0);
  const publicKey = nanocurrency.derivePublicKey(secretKey);
  return { secretKey, publicKey, address: nanocurrency.deriveAddress(publicKey, { useNanoPrefix: true }) };
}

const alice = keys("a1"); // launches HONEST
const bob = keys("b2"); // launches SECOND
const mallory = keys("cc"); // launches the free lie
const merchant = keys("d4");
const buyer = keys("e5");

/** Simulated ledger of really-signed blocks (same harness as flow.test.ts). */
class Sim {
  source = new MemorySource();
  blocks = new Map<string, VerifiedBlock>();
  private tips = new Map<string, { hash: string; balance: bigint; height: bigint }>();
  private clock = 1_800_000_000;
  private opens = 0;

  open(k: { secretKey: string; address: string }, balance: bigint) {
    return this.append(k, balance, (++this.opens).toString(16).padStart(64, "e"));
  }

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
    const delta = balance - (t?.balance ?? 0n);
    this.source.push({
      account: k.address, hash, previous, link: link.toUpperCase(), representative: k.address,
      height, timestamp: String(this.clock++), balance: balance.toString(),
      amount: (delta < 0n ? -delta : delta).toString(),
      subtype: delta < 0n ? "send" : delta > 0n ? (t ? "receive" : "open") : "change",
    } as any);
    const vb: VerifiedBlock = {
      hash, account: k.address, previous, representative: k.address, balance,
      link: link.toUpperCase(), confirmed: true, timestamp: Number(this.clock), height: Number(height),
    };
    this.blocks.set(hash, vb);
    this.tips.set(k.address, { hash, balance, height });
    return vb;
  }

  op(k: { secretKey: string; address: string }, link: string, delta = 1n) {
    return this.append(k, this.tips.get(k.address)!.balance - delta, link);
  }
  balance(a: string) {
    return this.tips.get(a)?.balance ?? 0n;
  }
}

/** Launch a token and seed its curve. `seedXno` is the FREE virtual reserve. */
function launch(
  sim: Sim,
  k: { secretKey: string; address: string },
  symbol: string,
  supplyWhole: bigint,
  seedXno: bigint,
  seedTokensWhole: bigint
) {
  const launchBlock = sim.op(
    k,
    encodeOpLink("", {
      kind: "launch",
      supply: supplyWhole * UNIT,
      name: symbol,
      symbol,
      decimals: DEC,
      image: "",
      direct: true,
    })
  );
  const tokenId = tokenIdFromLaunchHash(launchBlock.hash);
  const [a, b] = encodeFragLinks(tokenId, { kind: "seedLiq", xno: seedXno, tokens: seedTokensWhole * UNIT });
  sim.op(k, a);
  sim.op(k, b);
  return tokenId;
}

function readerFor(sim: Sim, accounts: string[]) {
  let folded: any = null;
  const ensure = async () => (folded ??= await foldAccounts(sim.source, accounts));
  const r: ChainReader & { fold: () => Promise<any> } = {
    getBlock: async (h: string) => sim.blocks.get((h ?? "").toUpperCase()) ?? null,
    tokenOpApplied: async (tokenId: string, carrier: string) => opApplied(await ensure(), tokenId, carrier),
    tokenBacking: async (tokenId: string) => {
      const st = stateOf(await ensure(), tokenId);
      return st.launched ? { backing: backingOf(st), circulating: circulatingOf(st) } : null;
    },
    fold: ensure,
  };
  return r;
}

/** Buy `want` of a token via the self-earmark lane, then pay the merchant. */
function buyAndPay(sim: Sim, tokenId: string, want: bigint, spend: bigint, policy: Policy) {
  const [ba, bb] = encodeFragLinks(tokenId, { kind: "buy", xno: spend, minTokens: 0n });
  sim.op(buyer, ba);
  sim.op(buyer, bb);
  const [ta, tb] = encodeFragLinks(tokenId, { kind: "transfer", to: merchant.address, amount: want });
  sim.op(buyer, ta);
  sim.op(buyer, tb);
  return sim.op(buyer, memoLink(policy.id));
}

// ── the policy shape ────────────────────────────────────────────────────────

test("an offer can list many tokens, each at its own price", () => {
  const p = makePolicy({
    merchant: merchant.address,
    resource: "r", title: "t", description: "d",
    accept: [
      { tokenId: "b".repeat(32), symbol: "BBB", decimals: 6, price: "5" },
      { tokenId: "a".repeat(32), symbol: "AAA", decimals: 2, price: "7" },
    ],
    autoswap: true,
    expires: 0,
  });
  assert.equal(p.v, 2);
  assert.equal(acceptedTokens(p).length, 2);
  assert.equal(acceptedToken(p, "a".repeat(32))!.price, "7");
  assert.equal(acceptedToken(p, "b".repeat(32))!.price, "5");
  assert.equal(acceptedToken(p, "c".repeat(32)), null);
  assert.equal(policyIsIntact(p), true);
});

test("listing the same tokens in a different order is the SAME offer", () => {
  const mk = (accept: any[]) =>
    makePolicy({ merchant: merchant.address, resource: "r", title: "t", description: "d", accept, autoswap: false, expires: 0 });
  const a = { tokenId: "a".repeat(32), symbol: "AAA", decimals: 6, price: "1" };
  const b = { tokenId: "b".repeat(32), symbol: "BBB", decimals: 6, price: "2" };
  assert.equal(mk([a, b]).id, mk([b, a]).id);
});

test("a duplicated token cannot quietly re-price itself", () => {
  const list = normalizeAccept([
    { tokenId: "a".repeat(32), symbol: "AAA", decimals: 6, price: "100" },
    { tokenId: "A".repeat(32), symbol: "AAA", decimals: 6, price: "1" }, // same id, cheaper
  ]);
  assert.equal(list.length, 1);
  assert.equal(list[0].price, "100", "the first listing wins, deterministically");
});

test("junk entries are dropped rather than silently priced at zero", () => {
  const list = normalizeAccept([
    { tokenId: "nope", symbol: "X", decimals: 6, price: "1" },
    { tokenId: "a".repeat(32), symbol: "A", decimals: 6, price: "0" },
    { tokenId: "b".repeat(32), symbol: "B", decimals: 6, price: "-5" },
    { tokenId: "c".repeat(32), symbol: "C", decimals: 6, price: "9" },
  ] as any);
  assert.deepEqual(list.map((l) => l.tokenId), ["c".repeat(32)]);
});

test("a v1 offer still verifies under its ORIGINAL hash", () => {
  // Receipts for v1 offers are already on chain. Re-hashing them under v2 would
  // invalidate grants people have paid for, so v1 keeps its own shape forever.
  const v1 = makePolicy({
    v: 1,
    merchant: merchant.address,
    resource: "r", title: "t", description: "d",
    token: { tokenId: "a".repeat(32), symbol: "AAA", decimals: 6 },
    priceToken: "1000000",
    autoswap: true,
    expires: 0,
  });
  assert.equal(v1.v, 1);
  assert.equal(policyIsIntact(v1), true);
  // And it presents through the same accessor as a v2 offer, so nothing
  // downstream needs to know which version it is looking at.
  assert.equal(acceptedTokens(v1).length, 1);
  assert.equal(acceptedToken(v1, "a".repeat(32))!.price, "1000000");
  // A v2 offer with the same fields is a DIFFERENT offer, as it must be.
  const v2 = makePolicy({ ...v1, v: 2, accept: acceptedTokens(v1) });
  assert.notEqual(v1.id, v2.id);
});

test("swapInto picks the lane an XNO payer is swapped into", () => {
  const accept = [
    { tokenId: "a".repeat(32), symbol: "AAA", decimals: 6, price: "1" },
    { tokenId: "b".repeat(32), symbol: "BBB", decimals: 6, price: "2" },
  ];
  const base = { merchant: merchant.address, resource: "r", title: "t", description: "d", autoswap: true, expires: 0 };
  assert.equal(swapTarget(makePolicy({ ...base, accept }))!.tokenId, "a".repeat(32), "defaults to the first");
  assert.equal(swapTarget(makePolicy({ ...base, accept, swapInto: "b".repeat(32) }))!.tokenId, "b".repeat(32));
  // An unknown swapInto falls back rather than leaving the page with nothing.
  assert.equal(swapTarget(makePolicy({ ...base, accept, swapInto: "z".repeat(32) }))!.tokenId, "a".repeat(32));
});

// ── paying with any of several tokens ───────────────────────────────────────

test("an offer taking three tokens accepts a payment in each, at that token's own price", async () => {
  const sim = new Sim();
  sim.open(alice, XNO);
  sim.open(bob, XNO);
  sim.open(mallory, XNO);
  sim.open(merchant, 0n);
  sim.open(buyer, XNO / 100n);

  const honest = launch(sim, alice, "HONEST", 1_000_000n, XNO / 100n, 100_000n);
  const second = launch(sim, bob, "SECOND", 1_000_000n, XNO / 50n, 100_000n);
  const accounts = [alice.address, bob.address, mallory.address, merchant.address, buyer.address];

  for (const [tokenId, price] of [
    [honest, 1n * UNIT],
    [second, 2n * UNIT],
  ] as const) {
    const policy = makePolicy({
      merchant: merchant.address,
      resource: `r/${tokenId.slice(0, 4)}`,
      title: "t", description: "d",
      accept: [
        { tokenId: honest, symbol: "HONEST", decimals: DEC, price: (1n * UNIT).toString() },
        { tokenId: second, symbol: "SECOND", decimals: DEC, price: (2n * UNIT).toString() },
      ],
      autoswap: true,
      expires: 0,
    });
    const receipt = buyAndPay(sim, tokenId, price, XNO / 1000n, policy);
    const reader = readerFor(sim, accounts);
    const v = await verifyPayment(policy, receipt.hash, reader);
    assert.equal(v.granted, true, `${tokenId.slice(0, 6)}: ${v.reason}`);
    assert.equal(v.tokenId, tokenId);
    assert.equal(v.paid, price.toString());
    assert.equal(v.price, price.toString(), "the price charged is that token's own price");
  }
});

test("paying the price of the CHEAP token with the DEAR token's amount still denies if short", async () => {
  const sim = new Sim();
  sim.open(alice, XNO);
  sim.open(merchant, 0n);
  sim.open(buyer, XNO / 100n);
  const honest = launch(sim, alice, "HONEST", 1_000_000n, XNO / 100n, 100_000n);
  const accounts = [alice.address, merchant.address, buyer.address];

  const policy = makePolicy({
    merchant: merchant.address,
    resource: "r", title: "t", description: "d",
    accept: [{ tokenId: honest, symbol: "HONEST", decimals: DEC, price: (10n * UNIT).toString() }],
    autoswap: true, expires: 0,
  });
  // Pay 1 when the price is 10.
  const receipt = buyAndPay(sim, honest, 1n * UNIT, XNO / 1000n, policy);
  const v = await verifyPayment(policy, receipt.hash, readerFor(sim, accounts));
  assert.equal(v.granted, false);
  assert.match(v.reason, /underpaid/);
});

test("a token the offer does not list is refused, and the message says what IS taken", async () => {
  const sim = new Sim();
  sim.open(alice, XNO);
  sim.open(mallory, XNO);
  sim.open(merchant, 0n);
  sim.open(buyer, XNO / 100n);
  const honest = launch(sim, alice, "HONEST", 1_000_000n, XNO / 100n, 100_000n);
  const rogue = launch(sim, mallory, "ROGUE", 1_000_000n, XNO / 100n, 100_000n);
  const accounts = [alice.address, mallory.address, merchant.address, buyer.address];

  const policy = makePolicy({
    merchant: merchant.address,
    resource: "r", title: "t", description: "d",
    accept: [{ tokenId: honest, symbol: "HONEST", decimals: DEC, price: (1n * UNIT).toString() }],
    autoswap: true, expires: 0,
  });
  const receipt = buyAndPay(sim, rogue, 1n * UNIT, XNO / 1000n, policy);
  const v = await verifyPayment(policy, receipt.hash, readerFor(sim, accounts));
  assert.equal(v.granted, false);
  assert.match(v.reason, /wrong token/);
  assert.match(v.reason, /HONEST/, "it names what the offer does take");
});

// ── the free lie ────────────────────────────────────────────────────────────

test("a token quoting a fortune, backed by nothing, costs 3 raw to make", async () => {
  const sim = new Sim();
  sim.open(mallory, 1000n); // a thousand raw, total
  const fake = launch(sim, mallory, "FAKE", 1_000_000n, 1_000_000n * XNO, 1n);

  const s = stateOf(await foldAccounts(sim.source, [mallory.address]), fake);
  const view = viewToken(fake, s);
  assert.ok(BigInt(view.quotedPrice) > 1000n * XNO, "the quote really is enormous");
  assert.equal(view.backing, "0", "and nothing backs it");
  assert.equal(view.backedPct, 0);
  assert.equal(sim.balance(mallory.address), 997n, "three raw spent, total");
});

test("the free lie NEVER becomes a grant: an unlisted token is refused however it is priced", async () => {
  const sim = new Sim();
  sim.open(alice, XNO);
  sim.open(mallory, 1000n);
  sim.open(merchant, 0n);
  sim.open(buyer, XNO / 100n);
  const honest = launch(sim, alice, "HONEST", 1_000_000n, XNO / 100n, 100_000n);
  const fake = launch(sim, mallory, "FAKE", 1_000_000n, 1_000_000n * XNO, 900_000n);
  const accounts = [alice.address, mallory.address, merchant.address, buyer.address];

  const policy = makePolicy({
    merchant: merchant.address,
    resource: "r", title: "t", description: "d",
    accept: [{ tokenId: honest, symbol: "HONEST", decimals: DEC, price: (1n * UNIT).toString() }],
    autoswap: true, expires: 0,
  });

  // Mallory pays with a token the curve says is worth a fortune. It is not on
  // the list, so the quote is never consulted at all.
  const receipt = buyAndPay(sim, fake, 1n * UNIT, XNO / 1000n, policy);
  const v = await verifyPayment(policy, receipt.hash, readerFor(sim, accounts));
  assert.equal(v.granted, false);
  assert.match(v.reason, /wrong token/);
});

test("the sort puts real collateral on top, and the free lie at the bottom", async () => {
  const sim = new Sim();
  sim.open(alice, XNO);
  sim.open(mallory, XNO); // give the attacker room, so the attack gets its best case
  sim.open(buyer, XNO / 10n);

  const honest = launch(sim, alice, "HONEST", 1_000_000n, XNO / 100n, 100_000n);
  // Mallory's curve claims a fortune per token. It cost three raw to say so.
  const fake = launch(sim, mallory, "FAKE", 1_000_000n, 1_000_000n * XNO, 900_000n);

  // The buyer commits REAL collateral to HONEST.
  {
    const [ba, bb] = encodeFragLinks(honest, { kind: "buy", xno: XNO / 1000n, minTokens: 0n });
    sim.op(buyer, ba);
    sim.op(buyer, bb);
  }
  // Mallory holds FAKE simply by being its creator: the 5% launch share.
  const fold = await foldAccounts(sim.source, [alice.address, mallory.address, buyer.address]);

  const hs = stateOf(fold, honest);
  const fs = stateOf(fold, fake);
  assert.ok(BigInt(quotedPriceOf(fs)) > BigInt(quotedPriceOf(hs)), "the lie quotes higher than the honest token");
  assert.equal(backingOf(fs), 0n, "and is backed by nothing");
  assert.ok(backingOf(hs) > 0n, "while the honest token has real collateral");

  // Viewed by MALLORY, who holds the fake and none of the honest token.
  const byQuote = sortTokens(tokenList(fold, mallory.address), "quotedHoldingValue");
  const byBacking = tokenList(fold, mallory.address); // default: backed holding value

  // This is the whole point. The freely-declared quote ranks the lie first.
  assert.equal(byQuote[0].tokenId, fake, "quoted order is exactly what an attacker buys for 3 raw");
  // Mallory holds only the 5% creator share, and that alone quotes at tens of
  // thousands of XNO -- conjured out of three raw.
  assert.ok(BigInt(byQuote[0].quotedHoldingValue) > 10_000n * XNO, "and it ranks by an invented fortune");

  // The honest measure gives it nothing, because nothing is behind it.
  assert.equal(byBacking[byBacking.length - 1].tokenId, fake, "backed order sinks the lie to the bottom");
  assert.equal(byBacking[byBacking.length - 1].backedHoldingValue, "0");
  assert.equal(byBacking[byBacking.length - 1].backing, "0");
});

test("sorting is total and deterministic even when every value ties", () => {
  const mk = (tokenId: string) => ({
    tokenId, symbol: "T", name: "", decimals: 6, supply: "0", poolXno: "0", poolTokens: "0",
    creator: "", holders: 0, direct: true, quotedPrice: "0", quotedValue: "0", backing: "0",
    backedPct: null, balance: "0", quotedHoldingValue: "0", backedHoldingValue: "0",
  });
  const ids = ["c".repeat(32), "a".repeat(32), "b".repeat(32)];
  const once = sortTokens(ids.map(mk)).map((t) => t.tokenId);
  const twice = sortTokens([...ids].reverse().map(mk)).map((t) => t.tokenId);
  assert.deepEqual(once, twice, "input order must not change the result");
  assert.deepEqual(once, [...ids].sort());
});

test("backing and quoted price read what they claim to read", async () => {
  const sim = new Sim();
  sim.open(alice, XNO);
  sim.open(buyer, XNO / 10n);
  const honest = launch(sim, alice, "HONEST", 1_000_000n, XNO / 100n, 100_000n);
  const spend = XNO / 1000n;
  const [ba, bb] = encodeFragLinks(honest, { kind: "buy", xno: spend, minTokens: 0n });
  sim.op(buyer, ba);
  sim.op(buyer, bb);

  const s = stateOf(await foldAccounts(sim.source, [alice.address, buyer.address]), honest);
  // Backing is the RATCHETED floor, not the raw earmark: it tracks
  // min(earmark, current sell value), and a buy pays the AMM's 1% fee, so the
  // guaranteed layer sits just under what was committed. Only ever under --
  // the floor falls and never rises, which is what makes it safe to rely on.
  const backing = backingOf(s);
  assert.ok(backing > 0n, "real collateral is counted");
  assert.ok(backing <= spend, "and never exceeds what was actually committed");
  assert.ok(backing * 100n >= spend * 98n, `floor should be within the swap fee of cost, got ${backing} vs ${spend}`);
  assert.equal(quotedPriceOf(s), (s.poolXno * UNIT) / s.poolTokens);
});

// ── accepting ANY token, priced by real collateral ──────────────────────────
//
// The whole point of this block: "accept everything" is only safe if value is
// measured by something that costs money. These tests buy the attack rather
// than describe it -- a token is launched for nothing, quotes a fortune, and
// must still be unable to pay for a thing.

test("an offer that takes any token accepts one backed by real collateral", async () => {
  const sim = new Sim();
  sim.open(alice, XNO);
  sim.open(merchant, 0n);
  sim.open(buyer, XNO);
  const tokenId = launch(sim, alice, "OPEN", 1_000_000n, 10n * XNO, 100_000n);
  const policy = makePolicy({
    merchant: merchant.address,
    resource: "r",
    title: "any token welcome",
    description: "d",
    // No accept[] at all: this offer has never heard of this token.
    acceptAny: { priceXno: (XNO / 1_000_000n).toString() },
    autoswap: false,
    expires: 0,
  });

  // The buyer earmarks real XNO, which is what creates collateral.
  const receipt = buyAndPay(sim, tokenId, 50n * UNIT, XNO / 100n, policy);
  const reader = readerFor(sim, [alice.address, buyer.address, merchant.address]);
  const v = await verifyPayment(policy, receipt.hash, reader);

  assert.equal(v.granted, true, v.reason);
  assert.equal(v.tokenId, tokenId, "the verdict names the token actually paid");
});

test("a token backed by nothing cannot pay, however much of it is sent", async () => {
  const sim = new Sim();
  sim.open(merchant, 0n);
  sim.open(buyer, XNO);
  // FOOL: launched for three blocks, quoting a million XNO of virtual reserve,
  // with not one raw of real collateral behind it. This is the exact shape that
  // an "accept every token at its market value" design pays out on.
  const fool = launch(sim, buyer, "FOOL", 1_000_000n, 1_000_000n * XNO, 900_000n);
  const policy = makePolicy({
    merchant: merchant.address,
    resource: "r",
    title: "any token welcome",
    description: "d",
    acceptAny: { priceXno: (XNO / 1_000_000n).toString() },
    autoswap: false,
    expires: 0,
  });

  // Send the merchant a fortune's worth at the quoted price: the entire supply.
  const [ta, tb] = encodeFragLinks(fool, { kind: "transfer", to: merchant.address, amount: 10_000n * UNIT });
  sim.op(buyer, ta);
  sim.op(buyer, tb);
  const receipt = sim.op(buyer, memoLink(policy.id));

  const reader = readerFor(sim, [buyer.address, merchant.address]);
  const v = await verifyPayment(policy, receipt.hash, reader);

  assert.equal(v.granted, false, "a token with no collateral must never buy anything");
  assert.match(v.reason, /no collateral/);
});

test("an underpayment in an accepted-anyway token is refused", async () => {
  const sim = new Sim();
  sim.open(alice, XNO);
  sim.open(merchant, 0n);
  sim.open(buyer, XNO);
  const tokenId = launch(sim, alice, "OPEN", 1_000_000n, 10n * XNO, 100_000n);
  const policy = makePolicy({
    merchant: merchant.address,
    resource: "r",
    title: "any token welcome",
    description: "d",
    // Ask for a hundred times what the buyer's whole earmark is worth.
    acceptAny: { priceXno: (100n * XNO).toString() },
    autoswap: false,
    expires: 0,
  });
  const receipt = buyAndPay(sim, tokenId, 50n * UNIT, XNO / 100n, policy);
  const reader = readerFor(sim, [alice.address, buyer.address, merchant.address]);
  const v = await verifyPayment(policy, receipt.hash, reader);

  assert.equal(v.granted, false);
  assert.match(v.reason, /underpaid/);
});

test("a merchant can require a minimum backing before a token is taken at all", async () => {
  const sim = new Sim();
  sim.open(alice, XNO);
  sim.open(merchant, 0n);
  sim.open(buyer, XNO);
  const tokenId = launch(sim, alice, "OPEN", 1_000_000n, 10n * XNO, 100_000n);
  const policy = makePolicy({
    merchant: merchant.address,
    resource: "r",
    title: "serious tokens only",
    description: "d",
    acceptAny: { priceXno: (XNO / 1_000_000n).toString(), minBacking: (1000n * XNO).toString() },
    autoswap: false,
    expires: 0,
  });
  const receipt = buyAndPay(sim, tokenId, 50n * UNIT, XNO / 100n, policy);
  const reader = readerFor(sim, [alice.address, buyer.address, merchant.address]);
  const v = await verifyPayment(policy, receipt.hash, reader);

  assert.equal(v.granted, false);
  assert.match(v.reason, /under this offer's minimum/);
});

test("a verifier that cannot value tokens refuses rather than guessing", async () => {
  const sim = new Sim();
  sim.open(alice, XNO);
  sim.open(merchant, 0n);
  sim.open(buyer, XNO);
  const tokenId = launch(sim, alice, "OPEN", 1_000_000n, 10n * XNO, 100_000n);
  const policy = makePolicy({
    merchant: merchant.address,
    resource: "r",
    title: "any token welcome",
    description: "d",
    acceptAny: { priceXno: (XNO / 1_000_000n).toString() },
    autoswap: false,
    expires: 0,
  });
  const receipt = buyAndPay(sim, tokenId, 50n * UNIT, XNO / 100n, policy);
  const full = readerFor(sim, [alice.address, buyer.address, merchant.address]);
  // Same reader, minus the ability to value a token.
  const blind: ChainReader = { getBlock: full.getBlock, tokenOpApplied: full.tokenOpApplied };
  const v = await verifyPayment(policy, receipt.hash, blind);

  assert.equal(v.granted, false);
  assert.match(v.reason, /cannot value tokens/);
});

test("an offer with a listed price ignores collateral for that token", async () => {
  const sim = new Sim();
  sim.open(alice, XNO);
  sim.open(merchant, 0n);
  sim.open(buyer, XNO);
  const tokenId = launch(sim, alice, "OPEN", 1_000_000n, 10n * XNO, 100_000n);
  const policy = makePolicy({
    merchant: merchant.address,
    resource: "r",
    title: "listed beats open",
    description: "d",
    // Listed at 10 tokens, while the open lane would demand a fortune.
    accept: [{ tokenId, symbol: "OPEN", decimals: DEC, price: (10n * UNIT).toString() }],
    acceptAny: { priceXno: (1_000_000n * XNO).toString() },
    autoswap: false,
    expires: 0,
  });
  const receipt = buyAndPay(sim, tokenId, 50n * UNIT, XNO / 100n, policy);
  const reader = readerFor(sim, [alice.address, buyer.address, merchant.address]);
  const v = await verifyPayment(policy, receipt.hash, reader);

  assert.equal(v.granted, true, "the merchant's own listed price wins for a listed token");
  assert.equal(v.price, (10n * UNIT).toString());
});

// ── a v1 price that is not an integer ───────────────────────────────────────
//
// `priceXno` already has this fixed: core/policy.ts's `acceptsXno` wraps
// `BigInt` in a try/catch because "0.0001" is how a human writes a price, the
// policy id hashes the string as given, and the bare conversion threw out of
// `verifyPayment` after a buyer had paid. v1's `priceToken` is the same field
// on the token lane and had the same bare conversion.
//
// v1's hashable shape is frozen -- its receipts are on chain -- so unlike v2
// there is no `normalizeAccept` screening the list before it is hashed. A v1
// offer whose price reads "0.5" therefore publishes with an INTACT id, and the
// throw lands in three places that matter: `acceptsToken` (which `tokenLane`
// calls after the fragment pair has already decoded, i.e. after the money
// moved), `lanesOf` (the page's and the shop's lane display), and
// `GET /api/policies`, which maps `acceptedTokens` over every listing.

function v1WithPrice(priceToken: string): Policy {
  return makePolicy({
    v: 1,
    merchant: merchant.address,
    resource: "r", title: "t", description: "d",
    token: { tokenId: "a".repeat(32), symbol: "AAA", decimals: DEC },
    priceToken,
    autoswap: false,
    expires: 0,
  });
}

test("a v1 price that is not an integer is dropped, not thrown on", () => {
  // Each of these publishes with an intact id and used to raise SyntaxError out
  // of every accessor. "0.5" and "1e6" are the realistic ones: a price written
  // in display units, and one written in exponent notation.
  // ("0x10" is NOT in this list: `BigInt` reads it as 16, so it is a price.)
  for (const priceToken of ["0.5", "1e6", "1,000", "abc", "-5", ""]) {
    const p = v1WithPrice(priceToken);
    assert.equal(policyIsIntact(p), true, priceToken);
    assert.deepEqual(acceptedTokens(p), [], priceToken);
    assert.equal(acceptsToken(p), false, priceToken);
    assert.deepEqual(lanesOf(p), [], priceToken);
  }
  // A v1 offer with a missing or non-string token id threw from the same line,
  // and is now read as the empty id (which matches nothing). Such a policy
  // cannot be built by `makePolicy` at all -- `hashableV1` throws on it first,
  // which is a separate defect left for the owner -- so it is constructed here
  // the only way it can actually arrive: as an inline policy in a request body.
  const noId = { ...v1WithPrice("1000000"), token: { symbol: "AAA", decimals: DEC } } as any;
  assert.deepEqual(acceptedTokens(noId), [
    { tokenId: "", symbol: "AAA", decimals: DEC, price: "1000000" },
  ]);
  assert.equal(acceptedToken(noId, "a".repeat(32)), null, "the empty id matches nothing");
});

test("an integer v1 price is still accepted, unchanged", () => {
  const p = v1WithPrice("1000000");
  assert.equal(acceptedTokens(p).length, 1);
  assert.equal(acceptedToken(p, "a".repeat(32))!.price, "1000000");
  assert.deepEqual(lanesOf(p), ["TOKEN"]);
});

test("a v1 offer priced '0.5' denies the buyer instead of throwing after they paid", async () => {
  const sim = new Sim();
  sim.open(alice, XNO);
  sim.open(merchant, 0n);
  sim.open(buyer, XNO / 100n);
  const tokenId = launch(sim, alice, "HONEST", 1_000_000n, XNO / 100n, 100_000n);

  // The offer as a v1 merchant wrote it: 0.5 of a 6-decimal token.
  const policy = makePolicy({
    v: 1,
    merchant: merchant.address,
    resource: "r", title: "t", description: "d",
    token: { tokenId, symbol: "HONEST", decimals: DEC },
    priceToken: "0.5",
    autoswap: false,
    expires: 0,
  });
  assert.equal(policyIsIntact(policy), true, "it publishes with an intact id");

  // The buyer really pays: a buy, a transfer to the merchant, and the receipt
  // chained onto it. By the time the verdict is computed the money has moved.
  const receipt = buyAndPay(sim, tokenId, 1n * UNIT, XNO / 1000n, policy);
  const reader = readerFor(sim, [alice.address, merchant.address, buyer.address]);

  const verdict = await verifyPayment(policy, receipt.hash, reader);
  assert.equal(verdict.granted, false);
  assert.equal(verdict.reason, "this offer does not accept tokens");
  assert.equal(verdict.payer, buyer.address, "the verdict still reports who paid");
});
