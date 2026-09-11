// Tests for the only thing that grants access.
//
// Every case here is an attack or a near-miss, run against an in-memory ledger
// so it needs no network and no funds. The point is not coverage for its own
// sake: it is that each documented security claim has a test that fails if the
// claim stops being true.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as nanocurrency from "nanocurrency";

import { makePolicy, acceptedToken, type Policy } from "./policy.ts";
import { memoLink, signAuth, verifyAuth, grantId, RECEIPT_MARKER } from "./proof.ts";
import { verifyPayment } from "./verify.ts";
import type { ChainReader, VerifiedBlock } from "./block.ts";
import { encodeFragLinks } from "../vendor/hodl/core/fraglink.ts";

const XNO = 10n ** 30n;

// ── a tiny fake ledger ──────────────────────────────────────────────────────

const SEED_BUYER = "11".repeat(32);
const SEED_OTHER = "22".repeat(32);
const buyer = keys(SEED_BUYER);
const other = keys(SEED_OTHER);
const MERCHANT = "nano_177uaf8ucnokskie7nt5maanp3pqwnmmh8qowoujxi6c48htzyc1zsrcgnxf";
const TOKEN_ID = "a1b2c3d4e5f60718293a4b5c6d7e8f90";

function keys(seed: string) {
  const secretKey = nanocurrency.deriveSecretKey(seed, 0);
  const publicKey = nanocurrency.derivePublicKey(secretKey);
  return { secretKey, publicKey, address: nanocurrency.deriveAddress(publicKey, { useNanoPrefix: true }) };
}

class MemoryReader implements ChainReader {
  blocks = new Map<string, VerifiedBlock>();
  applied = new Set<string>();
  /** Set false to model a verifier with no replay capability. */
  canReplay = true;

  async getBlock(hash: string) {
    return this.blocks.get((hash ?? "").toUpperCase()) ?? null;
  }

  async tokenOpApplied(tokenId: string, carrierHash: string) {
    if (!this.canReplay) throw new Error("reader should not have been asked");
    return this.applied.has(carrierHash.toUpperCase())
      ? { applied: true, reason: "applied in replay" }
      : { applied: false, reason: "not in replay" };
  }

  /** Append a real, hash-correct, signature-correct block to an account chain. */
  add(
    k: { secretKey: string; address: string },
    opts: { previous: string; balance: bigint; link: string; confirmed?: boolean; timestamp?: number }
  ): VerifiedBlock {
    const hash = nanocurrency.hashBlock({
      account: k.address,
      previous: opts.previous,
      representative: k.address,
      balance: opts.balance.toString(),
      link: opts.link,
    }).toUpperCase();
    const b: VerifiedBlock = {
      hash,
      account: k.address,
      previous: opts.previous.toUpperCase(),
      representative: k.address,
      balance: opts.balance,
      link: opts.link.toUpperCase(),
      confirmed: opts.confirmed ?? true,
      timestamp: opts.timestamp ?? 1_800_000_000,
      height: 0,
    };
    this.blocks.set(hash, b);
    return b;
  }
}

const ZERO = "0".repeat(64);
const pubOf = (addr: string) => nanocurrency.derivePublicKey(addr).toUpperCase();

function xnoPolicy(over: Partial<Parameters<typeof makePolicy>[0]> = {}): Policy {
  return makePolicy({
    merchant: MERCHANT,
    resource: "course/nano-101",
    title: "Nano 101",
    description: "one course",
    priceXno: (XNO / 100_000n).toString(), // 0.00001 XNO
    autoswap: false,
    expires: 0,
    ...over,
  });
}

function tokenPolicy(over: Partial<Parameters<typeof makePolicy>[0]> = {}): Policy {
  return makePolicy({
    merchant: MERCHANT,
    resource: "course/nano-101",
    title: "Nano 101",
    description: "one course",
    accept: [{ tokenId: TOKEN_ID, symbol: "TEACHER", decimals: 6, price: "1000000" }],
    autoswap: true,
    expires: 0,
    ...over,
  });
}

/** The price this offer charges in a given token. */
const tokenPrice = (p: Policy, tokenId = TOKEN_ID) => acceptedToken(p, tokenId)!.price;

/** Open the buyer's chain with some funds, returning the frontier. */
function openChain(r: MemoryReader, k = buyer, balance = XNO): string {
  return r.add(k, { previous: ZERO, balance, link: "00".repeat(32) }).hash;
}

/** The happy path: send, then chain a receipt naming the policy. */
function payXno(r: MemoryReader, policy: Policy, amount: bigint, k = buyer, startBalance = XNO) {
  const open = openChain(r, k, startBalance);
  const payment = r.add(k, { previous: open, balance: startBalance - amount, link: pubOf(policy.merchant) });
  const receipt = r.add(k, {
    previous: payment.hash,
    balance: startBalance - amount - 1n,
    link: memoLink(policy.id),
  });
  return { payment, receipt };
}

// ── the happy paths ─────────────────────────────────────────────────────────

test("XNO: exact price, confirmed, grants", async () => {
  const r = new MemoryReader();
  const policy = xnoPolicy();
  const { receipt, payment } = payXno(r, policy, BigInt(policy.priceXno!));
  const v = await verifyPayment(policy, receipt.hash, r);
  assert.equal(v.granted, true, v.reason);
  assert.equal(v.asset, "XNO");
  assert.equal(v.payment, payment.hash);
  assert.equal(v.paid, policy.priceXno);
  assert.equal(v.grant, grantId(policy.id, receipt.hash));
  assert.equal(v.payer, buyer.address);
});

test("XNO: overpaying still grants", async () => {
  const r = new MemoryReader();
  const policy = xnoPolicy();
  const { receipt } = payXno(r, policy, BigInt(policy.priceXno!) * 3n);
  const v = await verifyPayment(policy, receipt.hash, r);
  assert.equal(v.granted, true, v.reason);
});

test("TOKEN: a replay-applied transfer of the price grants", async () => {
  const r = new MemoryReader();
  const policy = tokenPolicy();
  const [fragALink, fragBLink] = encodeFragLinks(TOKEN_ID, {
    kind: "transfer",
    to: MERCHANT,
    amount: BigInt(tokenPrice(policy)),
  });
  const open = openChain(r);
  const fragA = r.add(buyer, { previous: open, balance: XNO - 1n, link: fragALink });
  const fragB = r.add(buyer, { previous: fragA.hash, balance: XNO - 2n, link: fragBLink });
  const receipt = r.add(buyer, { previous: fragB.hash, balance: XNO - 3n, link: memoLink(policy.id) });
  r.applied.add(fragA.hash);

  const v = await verifyPayment(policy, receipt.hash, r);
  assert.equal(v.granted, true, v.reason);
  assert.equal(v.asset, "TOKEN");
  assert.equal(v.paid, tokenPrice(policy));
});

// ── forgery attempts ────────────────────────────────────────────────────────

test("a grant cannot be minted without a receipt block: unknown hash denies", async () => {
  const r = new MemoryReader();
  const v = await verifyPayment(xnoPolicy(), "AB".repeat(32), r);
  assert.equal(v.granted, false);
  assert.match(v.reason, /not found/);
});

test("editing the price after the fact breaks the policy id", async () => {
  const r = new MemoryReader();
  const policy = xnoPolicy();
  const { receipt } = payXno(r, policy, BigInt(policy.priceXno!));
  // A backend that wants to sell the same access for more, or claim a cheaper
  // payment covered a dearer product, has to change the document -- and the id
  // is the hash of the document.
  const tampered = { ...policy, priceXno: (BigInt(policy.priceXno!) * 10n).toString() } as Policy;
  const v = await verifyPayment(tampered, receipt.hash, r);
  assert.equal(v.granted, false);
  assert.match(v.reason, /does not match its own id/);
});

test("a payment for ANOTHER policy cannot be re-pointed at this one", async () => {
  const r = new MemoryReader();
  const cheap = xnoPolicy({ resource: "course/cheap", priceXno: (XNO / 1_000_000n).toString() });
  const dear = xnoPolicy({ resource: "course/dear", priceXno: (XNO / 100n).toString() });
  const { receipt } = payXno(r, cheap, BigInt(cheap.priceXno!));
  const v = await verifyPayment(dear, receipt.hash, r);
  assert.equal(v.granted, false);
  assert.match(v.reason, /does not commit to this policy/);
});

test("underpaying denies, and says by how much", async () => {
  const r = new MemoryReader();
  const policy = xnoPolicy();
  const { receipt } = payXno(r, policy, BigInt(policy.priceXno!) - 1n);
  const v = await verifyPayment(policy, receipt.hash, r);
  assert.equal(v.granted, false);
  assert.match(v.reason, /underpaid/);
});

test("paying someone else's address denies", async () => {
  const r = new MemoryReader();
  const policy = xnoPolicy();
  const open = openChain(r);
  const payment = r.add(buyer, { previous: open, balance: XNO - BigInt(policy.priceXno!), link: pubOf(other.address) });
  const receipt = r.add(buyer, { previous: payment.hash, balance: 0n, link: memoLink(policy.id) });
  const v = await verifyPayment(policy, receipt.hash, r);
  assert.equal(v.granted, false);
  assert.match(v.reason, /not a payment this policy accepts/);
});

test("a receipt with no payment under it denies", async () => {
  const r = new MemoryReader();
  const policy = xnoPolicy();
  // A receipt as the account's very first block: nothing was paid.
  const receipt = r.add(buyer, { previous: ZERO, balance: XNO, link: memoLink(policy.id) });
  const v = await verifyPayment(policy, receipt.hash, r);
  assert.equal(v.granted, false);
  assert.match(v.reason, /no payment under it/);
});

test("a receipt chained onto a RECEIVE, not a send, denies", async () => {
  const r = new MemoryReader();
  const policy = xnoPolicy();
  const open = openChain(r, buyer, XNO);
  // Balance went UP: this is money arriving, not money paid to the merchant.
  const recv = r.add(buyer, { previous: open, balance: XNO * 2n, link: "CD".repeat(32) });
  const receipt = r.add(buyer, { previous: recv.hash, balance: XNO * 2n - 1n, link: memoLink(policy.id) });
  const v = await verifyPayment(policy, receipt.hash, r);
  assert.equal(v.granted, false);
});

test("one payment backs one receipt: a second receipt has a different previous", async () => {
  // Nano forbids forks, so two receipts cannot share a `previous`. The only way
  // to write a second receipt is to chain it onto the FIRST receipt -- whose
  // own link is the memo marker, not a send to the merchant. So it denies.
  const r = new MemoryReader();
  const policy = xnoPolicy();
  const { receipt } = payXno(r, policy, BigInt(policy.priceXno!));
  const second = r.add(buyer, {
    previous: receipt.hash,
    balance: receipt.balance - 1n,
    link: memoLink(policy.id),
  });
  const v = await verifyPayment(policy, second.hash, r);
  assert.equal(v.granted, false);
  assert.match(v.reason, /not a payment this policy accepts/);
});

test("an unconfirmed payment is pending, not granted", async () => {
  const r = new MemoryReader();
  const policy = xnoPolicy();
  const open = openChain(r);
  const amount = BigInt(policy.priceXno!);
  const payment = r.add(buyer, { previous: open, balance: XNO - amount, link: pubOf(MERCHANT), confirmed: false });
  const receipt = r.add(buyer, {
    previous: payment.hash,
    balance: XNO - amount - 1n,
    link: memoLink(policy.id),
    confirmed: false,
  });
  const v = await verifyPayment(policy, receipt.hash, r);
  assert.equal(v.granted, false);
  assert.equal(v.confirmed, false);
  assert.match(v.reason, /confirmation/);
});

test("an expired offer denies even when fully paid", async () => {
  const r = new MemoryReader();
  const policy = xnoPolicy({ expires: 1_700_000_000 });
  const { receipt } = payXno(r, policy, BigInt(policy.priceXno!)); // stamped 1_800_000_000
  const v = await verifyPayment(policy, receipt.hash, r);
  assert.equal(v.granted, false);
  assert.match(v.reason, /expired/);
});

test("XNO sent to the right merchant does not satisfy a token-only offer", async () => {
  const r = new MemoryReader();
  const policy = tokenPolicy();
  const { receipt } = payXno(r, policy, XNO / 2n);
  const v = await verifyPayment(policy, receipt.hash, r);
  assert.equal(v.granted, false);
  assert.match(v.reason, /does not accept XNO/);
});

test("a token transfer that did not apply in replay denies", async () => {
  const r = new MemoryReader();
  const policy = tokenPolicy();
  const [fragALink, fragBLink] = encodeFragLinks(TOKEN_ID, {
    kind: "transfer",
    to: MERCHANT,
    amount: BigInt(tokenPrice(policy)),
  });
  const open = openChain(r);
  const fragA = r.add(buyer, { previous: open, balance: XNO - 1n, link: fragALink });
  const fragB = r.add(buyer, { previous: fragA.hash, balance: XNO - 2n, link: fragBLink });
  const receipt = r.add(buyer, { previous: fragB.hash, balance: XNO - 3n, link: memoLink(policy.id) });
  // NOT added to r.applied: the buyer signed a transfer of tokens they never had.
  const v = await verifyPayment(policy, receipt.hash, r);
  assert.equal(v.granted, false);
  assert.match(v.reason, /did not apply in the ledger/);
});

test("a transfer of the RIGHT amount of the WRONG token denies", async () => {
  const r = new MemoryReader();
  const policy = tokenPolicy();
  const otherToken = "ffffffffffffffffffffffffffffffff";
  const [fragALink, fragBLink] = encodeFragLinks(otherToken, {
    kind: "transfer",
    to: MERCHANT,
    amount: BigInt(tokenPrice(policy)),
  });
  const open = openChain(r);
  const fragA = r.add(buyer, { previous: open, balance: XNO - 1n, link: fragALink });
  const fragB = r.add(buyer, { previous: fragA.hash, balance: XNO - 2n, link: fragBLink });
  const receipt = r.add(buyer, { previous: fragB.hash, balance: XNO - 3n, link: memoLink(policy.id) });
  r.applied.add(fragA.hash);
  const v = await verifyPayment(policy, receipt.hash, r);
  assert.equal(v.granted, false);
  assert.match(v.reason, /wrong token/);
});

test("a token transfer to a different recipient denies", async () => {
  const r = new MemoryReader();
  const policy = tokenPolicy();
  const [fragALink, fragBLink] = encodeFragLinks(TOKEN_ID, {
    kind: "transfer",
    to: other.address,
    amount: BigInt(tokenPrice(policy)),
  });
  const open = openChain(r);
  const fragA = r.add(buyer, { previous: open, balance: XNO - 1n, link: fragALink });
  const fragB = r.add(buyer, { previous: fragA.hash, balance: XNO - 2n, link: fragBLink });
  const receipt = r.add(buyer, { previous: fragB.hash, balance: XNO - 3n, link: memoLink(policy.id) });
  r.applied.add(fragA.hash);
  const v = await verifyPayment(policy, receipt.hash, r);
  assert.equal(v.granted, false);
  assert.match(v.reason, /different address/);
});

test("a verifier that cannot replay refuses token payments instead of guessing", async () => {
  const r = new MemoryReader();
  const policy = tokenPolicy();
  const [fragALink, fragBLink] = encodeFragLinks(TOKEN_ID, {
    kind: "transfer",
    to: MERCHANT,
    amount: BigInt(tokenPrice(policy)),
  });
  const open = openChain(r);
  const fragA = r.add(buyer, { previous: open, balance: XNO - 1n, link: fragALink });
  const fragB = r.add(buyer, { previous: fragA.hash, balance: XNO - 2n, link: fragBLink });
  const receipt = r.add(buyer, { previous: fragB.hash, balance: XNO - 3n, link: memoLink(policy.id) });
  const noReplay: ChainReader = { getBlock: (h) => r.getBlock(h) };
  const v = await verifyPayment(policy, receipt.hash, noReplay);
  assert.equal(v.granted, false);
  assert.match(v.reason, /cannot replay/);
});

test("an XNO payment is not mistaken for a malformed token payment", async () => {
  // A fragment-A link is recognised by one marker byte, so an unrelated block
  // can carry it by chance. Worst case: the block before the payment looks like
  // fragment A, AND the payment itself moves exactly 1 raw (so the 1-raw
  // fragment check does not save us). The XNO lane must still win, because the
  // payment demonstrably sent XNO to the merchant.
  const r = new MemoryReader();
  const policy = xnoPolicy({ priceXno: "1" });
  const [fragALink] = encodeFragLinks(TOKEN_ID, { kind: "transfer", to: other.address, amount: 5n });

  const open = openChain(r, buyer, XNO);
  const decoy = r.add(buyer, { previous: open, balance: XNO - 1n, link: fragALink });
  const payment = r.add(buyer, { previous: decoy.hash, balance: XNO - 2n, link: pubOf(MERCHANT) });
  const receipt = r.add(buyer, { previous: payment.hash, balance: XNO - 3n, link: memoLink(policy.id) });

  const v = await verifyPayment(policy, receipt.hash, r);
  assert.equal(v.granted, true, v.reason);
  assert.equal(v.asset, "XNO");
  assert.equal(v.paid, "1");
});

// ── proving you are the payer ───────────────────────────────────────────────

test("the payer can answer a challenge; nobody else can", async () => {
  const policy = xnoPolicy();
  const receiptHash = "AB".repeat(32);
  const challenge = "nonce-12345";
  const sig = signAuth(buyer.secretKey, policy.id, receiptHash, challenge);
  assert.equal(verifyAuth(buyer.publicKey, sig, policy.id, receiptHash, challenge), true);
  assert.equal(verifyAuth(other.publicKey, sig, policy.id, receiptHash, challenge), false);
  // Bound to the challenge: a captured signature does not open a new session.
  assert.equal(verifyAuth(buyer.publicKey, sig, policy.id, receiptHash, "nonce-99999"), false);
  // Bound to the policy and the receipt too.
  assert.equal(verifyAuth(buyer.publicKey, sig, policy.id, "CD".repeat(32), challenge), false);
});

// ── encoding hygiene ───────────────────────────────────────────────────────

test("the receipt marker byte avoids every hodlgame op marker", () => {
  const link = memoLink(xnoPolicy().id);
  const b0 = parseInt(link.slice(0, 2), 16);
  assert.equal(b0, RECEIPT_MARKER);
  assert.ok(b0 > 0x0d, "must not look like a compact opcode");
  assert.notEqual(b0 & 0xf0, 0xe0, "must not look like a fragment marker");
  assert.notEqual(b0, 0xff, "must not look like a commit-reveal link");
});

test("the policy id does not depend on key order", () => {
  const a = makePolicy({
    merchant: MERCHANT, resource: "r", title: "t", description: "d",
    priceXno: "1", autoswap: false, expires: 0,
  });
  const b = makePolicy({
    expires: 0, autoswap: false, priceXno: "1",
    description: "d", title: "t", resource: "r", merchant: MERCHANT,
  });
  assert.equal(a.id, b.id);
});
