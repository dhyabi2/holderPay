// The payment binding: how a Nano payment is tied to one holderPay policy,
// on chain, with no server involved.
//
// A buyer publishes TWO consecutive blocks on their own account chain:
//
//   1. the PAYMENT      -- an XNO send to the merchant, or the last block of a
//                          hodlgame token `transfer` fragment pair;
//   2. the RECEIPT      -- a 1-raw data block whose `previous` is the payment's
//                          hash and whose `link` is memoLink(policyId).
//
// That is the entire construction, and it is enough:
//
//   * `link` proves INTENT. The buyer's own Ed25519-blake2b signature covers
//     it, so only the buyer can say "this payment is for this policy", and
//     because the policy id hashes the price, the merchant and the resource,
//     the terms cannot be restated afterwards by anyone.
//   * `previous` proves VALUE. Nano's chain rule means the receipt can point at
//     exactly one preceding block, and forks are rejected by consensus -- so
//     one payment can back exactly one receipt. No double-claiming, no server
//     side "spent" table needed to prevent it.
//   * Together they are UNFORGEABLE BY THE BACKEND. holderPay holds no key that
//     appears anywhere in this structure. To fabricate a grant, a compromised
//     holderPay server would have to produce a confirmed Nano block signed by
//     someone else's key -- which is the same thing as breaking Nano.
//
// Access is then claimed by ANSWERING A CHALLENGE with the paying account's
// key (authDigest below), so possession of a public block hash is not itself
// possession of the grant.

import * as nanocurrency from "nanocurrency";
import { h256, DOMAIN_MEMO, DOMAIN_AUTH, DOMAIN_GRANT } from "./hash.ts";

/**
 * Marker byte of a holderPay receipt link.
 *
 * A receipt is a 1-raw data block, which is exactly the shape a hodlgame op
 * block has -- so hodlgame's indexer WILL try to decode our receipts. 0x50 is
 * chosen to be disjoint from every marker it recognises: compact opcodes
 * (0x01..0x0d), fragment markers (0xE0 | opcode = 0xE1..0xED) and the
 * commit-reveal prefix (0xFF). A receipt therefore decodes to "unknown op
 * code" and is ignored, instead of being mistaken for a trade -- and in
 * particular it can never be swallowed as the second half of a fragment pair.
 */
export const RECEIPT_MARKER = 0x50;

/** The 32-byte value a receipt block carries in `link` (64 hex, upper-cased to
 * match how Nano renders block fields). */
export function memoLink(policyId: string): string {
  const digest = h256(DOMAIN_MEMO, policyId.toLowerCase());
  return (RECEIPT_MARKER.toString(16).padStart(2, "0") + digest.slice(2)).toUpperCase();
}

/** True if a block's `link` is the receipt marker for this policy. */
export function isReceiptLink(link: string, policyId: string): boolean {
  return (link ?? "").toUpperCase() === memoLink(policyId);
}

/**
 * What the buyer signs to prove they still control the paying account.
 * Domain-separated and bound to the policy, the receipt and a server-chosen
 * challenge, so a signature captured from one login cannot open another.
 */
export function authDigest(policyId: string, receiptHash: string, challenge: string): string {
  return h256(DOMAIN_AUTH, policyId.toLowerCase(), receiptHash.toUpperCase(), challenge).toUpperCase();
}

export function signAuth(secretKey: string, policyId: string, receiptHash: string, challenge: string): string {
  return nanocurrency.signBlock({ hash: authDigest(policyId, receiptHash, challenge), secretKey });
}

export function verifyAuth(
  publicKey: string,
  signature: string,
  policyId: string,
  receiptHash: string,
  challenge: string
): boolean {
  try {
    return (nanocurrency as any).verifyBlock({
      hash: authDigest(policyId, receiptHash, challenge),
      signature,
      publicKey,
    });
  } catch {
    return false;
  }
}

/**
 * A grant's deterministic NAME. Not a secret and not a bearer token: it is a
 * label anyone can recompute from public data, which is exactly why it cannot
 * be minted. Presenting it proves nothing on its own -- the verifier always
 * re-derives the verdict from the chain.
 */
export function grantId(policyId: string, receiptHash: string): string {
  return h256(DOMAIN_GRANT, policyId.toLowerCase(), receiptHash.toUpperCase());
}
