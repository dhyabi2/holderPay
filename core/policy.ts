// A holderPay POLICY is the merchant's offer, frozen into a hash.
//
// Everything that decides whether access is owed lives here: who must be paid,
// in what asset, how much, for which resource, until when. The policy id is the
// blake2b-256 of the canonical JSON of the whole document, so a single changed
// byte -- the price, the merchant address, the resource -- is a different
// policy with a different id.
//
// WHY THIS IS THE WHOLE SECURITY MODEL: the buyer's payment commits to the
// policy id ON CHAIN (see proof.ts). A verifier therefore never has to trust
// any server's claim about what the terms were; the terms are pinned by the
// same signature that moved the money. A backend that wants to grant access
// for free has nothing to tamper with: it does not hold a signing key, and the
// only thing a grant consists of is a pointer to blocks anyone can re-fetch.

import { canonicalJson, h256, DOMAIN_POLICY } from "./hash.ts";

export type Asset = "XNO" | "TOKEN";

export interface TokenSpec {
  /** 32-hex hodlgame token id (first 16 bytes of the launch block hash). */
  tokenId: string;
  symbol: string;
  decimals: number;
}

export interface PolicyInput {
  /** Nano address that must be paid. */
  merchant: string;
  /** What is being sold. Opaque to holderPay; shown to the buyer. */
  resource: string;
  title: string;
  description: string;
  /** Price in the token's smallest unit. Omit the lane to refuse that asset. */
  priceToken?: string;
  token?: TokenSpec;
  /** Price in raw (1 XNO = 10^30 raw). Omit to refuse XNO. */
  priceXno?: string;
  /**
   * The merchant wants TOKEN only, but will still accept an XNO payer: the pay
   * page swaps the buyer's XNO for the token on the hodlgame AMM and pays the
   * merchant in the token. The swap happens in the BUYER's wallet, signed by
   * the buyer -- holderPay never holds anyone's funds.
   */
  autoswap: boolean;
  /** Unix seconds; 0 = never expires. A payment must be confirmed before it. */
  expires: number;
}

export interface Policy extends PolicyInput {
  v: 1;
  id: string;
}

/** Fields that are hashed, in a fixed shape. `id` itself is never an input. */
function hashable(p: PolicyInput): Record<string, unknown> {
  return {
    v: 1,
    merchant: p.merchant,
    resource: p.resource,
    title: p.title,
    description: p.description,
    priceXno: p.priceXno ?? "",
    priceToken: p.priceToken ?? "",
    token: p.token ? { tokenId: p.token.tokenId.toLowerCase(), symbol: p.token.symbol, decimals: p.token.decimals } : null,
    autoswap: !!p.autoswap,
    expires: Math.floor(p.expires) || 0,
  };
}

export function policyId(p: PolicyInput): string {
  return h256(DOMAIN_POLICY, canonicalJson(hashable(p)));
}

export function makePolicy(p: PolicyInput): Policy {
  return { ...p, v: 1, id: policyId(p) };
}

/** Re-derive the id and compare. Any tampering in transit fails here. */
export function policyIsIntact(p: Policy): boolean {
  return p.v === 1 && policyId(p) === p.id;
}

export function acceptsXno(p: PolicyInput): boolean {
  return !!p.priceXno && BigInt(p.priceXno) > 0n;
}

export function acceptsToken(p: PolicyInput): boolean {
  return !!p.priceToken && !!p.token && BigInt(p.priceToken) > 0n;
}

/** The minimum amount that satisfies the policy in `asset`, or null if that
 * asset is not accepted at all. */
export function priceOf(p: PolicyInput, asset: Asset): bigint | null {
  if (asset === "XNO") return acceptsXno(p) ? BigInt(p.priceXno!) : null;
  return acceptsToken(p) ? BigInt(p.priceToken!) : null;
}
