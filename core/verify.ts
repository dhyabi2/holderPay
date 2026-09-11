// THE VERDICT. A pure function from (policy, receipt hash, chain reader) to
// "access is owed" or "it is not", with a reason.
//
// Read this file if you read nothing else. It is deliberately small, it takes
// no secrets, it writes nothing, and it is the ONLY thing that decides access
// in holderPay. The server runs it; the buyer's browser runs the same code
// against the same public data and compares. If a compromised server ever
// answers `granted: true` for a receipt that does not verify, the page catches
// it, says so in red, and refuses the grant.
//
// What a malicious holderPay operator would need to forge a grant:
//   - a confirmed Nano block, signed by the buyer's key, that sends the
//     merchant the price, and
//   - a second block, signed by the same key, chained directly onto it, whose
//     link commits to this exact policy id.
// There is no third way in. No admin flag, no signing key, no database row.
// "Granting access" is not an action the backend can take -- it is an
// observation the backend can only report, and anyone can check the report.

import { assembleFrag, isFragA } from "../vendor/hodl/core/fraglink.ts";
import type { Policy } from "./policy.ts";
import { policyIsIntact, priceOf, acceptsToken, acceptsXno } from "./policy.ts";
import { grantId, isReceiptLink } from "./proof.ts";
import {
  type ChainReader,
  type VerifiedBlock,
  linkAsAddress,
  sameAccount,
  sentAmount,
  ZERO_HASH,
} from "./block.ts";

export interface Verdict {
  granted: boolean;
  /** Human-readable, and stable enough to test against. */
  reason: string;
  policyId: string;
  /** Present whenever the receipt block itself was found and readable. */
  receipt?: string;
  payer?: string;
  asset?: "XNO" | "TOKEN";
  /** Hash of the block that actually moved the value. */
  payment?: string;
  /** Amount moved, in raw (XNO) or the token's smallest unit. */
  paid?: string;
  price?: string;
  /** Both blocks confirmed by the node. A grant requires it. */
  confirmed: boolean;
  /** Receipt block's first-seen time (unix seconds), 0 if unknown. */
  at?: number;
  /** Deterministic name of the grant. Recomputable by anyone; not a secret. */
  grant?: string;
}

const deny = (policyId: string, reason: string, extra: Partial<Verdict> = {}): Verdict => ({
  granted: false,
  reason,
  policyId,
  confirmed: false,
  ...extra,
});

/**
 * @param policy   the offer, exactly as the buyer saw it
 * @param receiptHash the 1-raw block the buyer chained onto their payment
 * @param reader   locally-verifying access to the ledger
 * @param now      unix seconds, for the expiry check only
 */
export async function verifyPayment(
  policy: Policy,
  receiptHash: string,
  reader: ChainReader,
  now: number = Math.floor(Date.now() / 1000)
): Promise<Verdict> {
  const pid = policy?.id ?? "";

  // 0. The offer must be the offer. If the policy was altered anywhere between
  //    the merchant and here, its id no longer matches its contents -- and the
  //    buyer's on-chain commitment is to the id, not to whatever we were handed.
  if (!policy || !policyIsIntact(policy)) return deny(pid, "policy does not match its own id (tampered or malformed)");

  if (!/^[0-9A-Fa-f]{64}$/.test(receiptHash ?? "")) return deny(pid, "receipt hash is not a 64-hex block hash");
  const receipt = await reader.getBlock(receiptHash);
  if (!receipt) return deny(pid, "receipt block not found on chain (or failed local signature verification)");

  // 1. INTENT. The buyer's signature covers this link, so this is the buyer
  //    saying, unforgeably, "the payment I just made is for this policy".
  if (!isReceiptLink(receipt.link, policy.id)) {
    return deny(pid, "receipt block does not commit to this policy", { receipt: receipt.hash, payer: receipt.account });
  }
  const payer = receipt.account;

  // 2. VALUE. `previous` can name exactly one block and Nano rejects forks, so
  //    the payment underneath a receipt is unique and cannot be re-used.
  if (receipt.previous === ZERO_HASH) {
    return deny(pid, "receipt block has no payment under it", { receipt: receipt.hash, payer });
  }
  const payment = await reader.getBlock(receipt.previous);
  if (!payment) {
    return deny(pid, "the payment block under the receipt could not be verified", { receipt: receipt.hash, payer });
  }
  if (!sameAccount(payment.account, payer)) {
    return deny(pid, "payment and receipt are not the same account", { receipt: receipt.hash, payer });
  }

  // 3. EXPIRY, measured on the receipt the buyer signed.
  if (policy.expires > 0 && receipt.timestamp > 0 && receipt.timestamp > policy.expires) {
    return deny(pid, "this offer had already expired when the payment was made", {
      receipt: receipt.hash,
      payer,
      at: receipt.timestamp,
    });
  }

  const confirmed = receipt.confirmed && payment.confirmed;
  const base: Partial<Verdict> = { receipt: receipt.hash, payer, at: receipt.timestamp };

  // 4. AMOUNT + DESTINATION. Two lanes; which one applies is decided by what
  //    the payment block actually is, never by what the caller claims.
  //
  //    Order matters. A fragment-A link is recognised by one marker byte, so
  //    roughly one arbitrary 32-byte link in forty carries it by chance -- which
  //    means the block sitting before a perfectly ordinary XNO payment can
  //    occasionally *look* like the first half of a token transfer. A send to
  //    the merchant is unambiguous (it names the destination in the link), so it
  //    is settled first; the token lane only gets to speak when the payment is
  //    not an XNO send to us at all.
  const xno = await xnoLane(policy, payment, reader);
  if (xno && !xno.fail) return finish(policy, xno, confirmed, base);

  const token = await tokenLane(policy, receipt, payment, reader);
  if (token && !token.fail) return finish(policy, token, confirmed, base);

  // Both failed (or only one applied at all). Report the XNO failure first for
  // the same reason: if the block really did send XNO to the merchant, that is
  // what the buyer did, and a token-shaped complaint would be a lie.
  if (xno) return finish(policy, xno, confirmed, base);
  if (token) return finish(policy, token, confirmed, base);

  return deny(pid, "the block under the receipt is not a payment this policy accepts", base);
}

interface Lane {
  asset: "XNO" | "TOKEN";
  paid: bigint;
  price: bigint;
  payment: string;
  /** Set when the lane itself already failed for a specific, reportable reason. */
  fail?: string;
}

function finish(policy: Policy, lane: Lane, confirmed: boolean, base: Partial<Verdict>): Verdict {
  const common: Verdict = {
    granted: false,
    reason: "",
    policyId: policy.id,
    confirmed,
    asset: lane.asset,
    payment: lane.payment,
    paid: lane.paid.toString(),
    price: lane.price.toString(),
    ...base,
  };
  if (lane.fail) return { ...common, reason: lane.fail };
  if (lane.paid < lane.price) return { ...common, reason: `underpaid: ${lane.paid} < ${lane.price}` };
  if (!confirmed) return { ...common, reason: "waiting for network confirmation" };
  return {
    ...common,
    granted: true,
    reason: "paid and confirmed on chain",
    grant: grantId(policy.id, common.receipt!),
  };
}

/** Plain XNO send, straight to the merchant. */
async function xnoLane(policy: Policy, payment: VerifiedBlock, reader: ChainReader): Promise<Lane | null> {
  const dest = linkAsAddress(payment.link);
  if (!dest || !sameAccount(dest, policy.merchant)) return null; // not an XNO payment to us
  const price = priceOf(policy, "XNO");
  if (price == null) {
    return { asset: "XNO", paid: 0n, price: 0n, payment: payment.hash, fail: "this offer does not accept XNO" };
  }
  const amount = await sentAmount(reader, payment);
  if (amount == null || amount <= 0n) {
    return { asset: "XNO", paid: 0n, price, payment: payment.hash, fail: "that block did not send any XNO" };
  }
  return { asset: "XNO", paid: amount, price, payment: payment.hash };
}

/**
 * hodlgame token transfer. The op rides two chained 1-raw "fragment" blocks
 * (vendor/hodl/core/fraglink.ts), so the full payload -- recipient and amount
 * -- is ON CHAIN and needs no off-chain reveal to interpret. The receipt is
 * chained onto fragment B.
 *
 * A token transfer also has to be VALID in the L2 (the payer must really have
 * held the tokens), which is a replay question, not a block question. That is
 * delegated to the reader, and a reader that cannot answer it denies rather
 * than assumes.
 */
async function tokenLane(
  policy: Policy,
  receipt: VerifiedBlock,
  fragB: VerifiedBlock,
  reader: ChainReader
): Promise<Lane | null> {
  if (fragB.previous === ZERO_HASH) return null;
  const fragA = await reader.getBlock(fragB.previous);
  if (!fragA || !sameAccount(fragA.account, fragB.account) || !isFragA(fragA.link)) return null;

  // Both halves of a real fragment pair burn exactly 1 raw. Checking it costs
  // nothing (fragA is already fetched) and removes almost all of the chance
  // that an unrelated block is mistaken for a token transfer.
  if (fragA.balance - fragB.balance !== 1n) return null;

  let assembled: { tokenId: string; op: any };
  try {
    assembled = assembleFrag(fragA.link, fragB.link);
  } catch {
    return null; // marker byte present but the pair does not decode -- not our payment
  }
  if (assembled.op?.kind !== "transfer") return null;

  const price = priceOf(policy, "TOKEN");
  if (price == null || !acceptsToken(policy)) {
    return { asset: "TOKEN", paid: 0n, price: 0n, payment: fragB.hash, fail: "this offer does not accept tokens" };
  }
  const want = policy.token!.tokenId.toLowerCase();
  if (assembled.tokenId.toLowerCase() !== want) {
    return {
      asset: "TOKEN",
      paid: 0n,
      price,
      payment: fragB.hash,
      fail: `wrong token: paid ${assembled.tokenId.slice(0, 10)} but this offer wants ${want.slice(0, 10)}`,
    };
  }
  if (!sameAccount(assembled.op.to, policy.merchant)) {
    return { asset: "TOKEN", paid: 0n, price, payment: fragB.hash, fail: "token transfer was sent to a different address" };
  }

  const amount: bigint = assembled.op.amount;
  if (!reader.tokenOpApplied) {
    return {
      asset: "TOKEN",
      paid: amount,
      price,
      payment: fragB.hash,
      fail: "this verifier cannot replay the token ledger, so a token payment cannot be proven here",
    };
  }
  const applied = await reader.tokenOpApplied(assembled.tokenId, fragA.hash);
  if (!applied.applied) {
    return {
      asset: "TOKEN",
      paid: amount,
      price,
      payment: fragB.hash,
      fail: `token transfer is signed but did not apply in the ledger: ${applied.reason}`,
    };
  }
  return { asset: "TOKEN", paid: amount, price, payment: fragB.hash };
}

/** Which lanes this policy will accept at all -- for the UI. */
export function lanesOf(policy: Policy): ("XNO" | "TOKEN")[] {
  const out: ("XNO" | "TOKEN")[] = [];
  if (acceptsToken(policy)) out.push("TOKEN");
  if (acceptsXno(policy)) out.push("XNO");
  return out;
}
