// A holderPay POLICY is the merchant's offer, frozen into a hash.
//
// Everything that decides whether access is owed lives here: who must be paid,
// in what asset, how much, for which resource, until when. The policy id is the
// blake2b-256 of the canonical JSON of the whole document, so a single changed
// byte -- a price, the merchant address, the resource -- is a different policy
// with a different id.
//
// WHY THIS IS THE WHOLE SECURITY MODEL: the buyer's payment commits to the
// policy id ON CHAIN (see proof.ts). A verifier therefore never has to trust
// any server's claim about what the terms were; the terms are pinned by the
// same signature that moved the money. A backend that wants to grant access
// for free has nothing to tamper with: it does not hold a signing key, and the
// only thing a grant consists of is a pointer to blocks anyone can re-fetch.
//
// ── v2: many tokens, each at a price the merchant set ───────────────────────
//
// v1 offers carried at most one token. v2 carries a LIST, so an offer can take
// any hodlgame token, not just TEACHER.
//
// What v2 deliberately does NOT do is accept an arbitrary token at whatever the
// AMM quotes for it. A Direct-Settlement token's XNO reserve is a DECLARED
// VIRTUAL number -- seeding it costs three raw and claims no real money -- so
// anyone can mint a token that quotes a million XNO a unit for a rounding error
// of a rounding error. Pricing acceptance off that quote would hand an attacker
// unlimited free goods. Every accepted token therefore names its own price,
// chosen by the merchant. "All tokens" means any token can be listed, never
// that an unknown token is valued automatically. See core/valuation.ts for the
// only measure of a token that cannot be faked for free.

import { canonicalJson, h256, DOMAIN_POLICY } from "./hash.ts";

export type Asset = "XNO" | "TOKEN";

export interface TokenSpec {
  /** 32-hex hodlgame token id (first 16 bytes of the launch block hash). */
  tokenId: string;
  symbol: string;
  decimals: number;
}

/** One token this offer takes, and what it costs in that token. */
export interface AcceptedToken extends TokenSpec {
  /** Price in the token's smallest unit. */
  price: string;
}

/**
 * Take ANY token, priced by what is actually behind it.
 *
 * The tempting version of "accept everything" prices a token off its AMM quote,
 * and that version is an open vault: three raw launches a token whose curve
 * quotes a million XNO per unit with nothing behind it (measured, on mainnet --
 * see scripts/e2e-multitoken.ts). A quote is a free assertion by whoever
 * launched the token, so anything priced off one is free to buy.
 *
 * What cannot be asserted for free is COLLATERAL: the sum of the ratcheted
 * earmark floors, each of which consensus checks against the signed balance of
 * a real wallet. Raising a token's backing by one XNO requires somebody to
 * actually hold one XNO. So an offer that accepts any token asks for a transfer
 * whose pro-rata share of that collateral is worth the price, and the worthless
 * token simply cannot produce one: zero backing spread over any supply is zero,
 * at any amount.
 *
 * The honest caveat, stated in the type rather than buried: backing is a
 * property of the token NOW, not of the payment then. If a token's collateral
 * collapses after a payment, a verdict that was granted can stop being granted.
 * A listed `accept[]` entry has a fixed price and never moves, which is why it
 * remains the right way to sell for a token you have chosen deliberately.
 */
export interface AcceptAny {
  /** Raw XNO of REAL COLLATERAL the transfer must be worth. */
  priceXno: string;
  /**
   * Total collateral a token must have before it is accepted at all, raw XNO.
   * Pro-rata pricing already refuses a worthless token, so this is a floor on
   * seriousness rather than a safety check: a token backed by a thousandth of
   * an XNO can technically pay, in a quantity that means the merchant now holds
   * a meaningful fraction of a meaningless thing.
   */
  minBacking?: string;
}

export interface PolicyInput {
  /** Nano address that must be paid. */
  merchant: string;
  /** What is being sold. Opaque to holderPay; shown to the buyer. */
  resource: string;
  title: string;
  description: string;
  /** Every token this offer accepts, each with its own price. */
  accept?: AcceptedToken[];
  /** Also take any OTHER token, priced by its real collateral. See AcceptAny. */
  acceptAny?: AcceptAny;
  /** Price in raw (1 XNO = 10^30 raw). Omit to refuse XNO. */
  priceXno?: string;
  /**
   * The merchant wants a token, but will still take an XNO payer: the page
   * swaps the buyer's XNO for the token on the AMM and pays the merchant in it.
   * The swap happens in the BUYER's wallet, signed by the buyer -- holderPay
   * never holds anyone's funds.
   */
  autoswap: boolean;
  /** Which accepted token an XNO payer is swapped into. Defaults to the first. */
  swapInto?: string;
  /** Unix seconds; 0 = never expires. A payment must be confirmed before it. */
  expires: number;

  // ── v1 compatibility ──────────────────────────────────────────────────────
  // Offers published before multi-token support carried a single token. They
  // are still verified under their ORIGINAL hash (see policyId), because their
  // receipts are already on chain and re-hashing them would invalidate grants
  // people have paid for.
  token?: TokenSpec;
  priceToken?: string;
}

export interface Policy extends PolicyInput {
  v: 1 | 2;
  id: string;
}

/** The v1 hashable shape. Frozen forever: old receipts commit to these bytes. */
function hashableV1(p: PolicyInput): Record<string, unknown> {
  return {
    v: 1,
    merchant: p.merchant,
    resource: p.resource,
    title: p.title,
    description: p.description,
    priceXno: p.priceXno ?? "",
    priceToken: p.priceToken ?? "",
    token: p.token
      ? { tokenId: p.token.tokenId.toLowerCase(), symbol: p.token.symbol, decimals: p.token.decimals }
      : null,
    autoswap: !!p.autoswap,
    expires: Math.floor(p.expires) || 0,
  };
}

/** The v2 hashable shape. The accept list is sorted by token id so two
 * merchants who listed the same tokens in a different order produce the same
 * offer, not two offers that look identical and are not. */
function hashableV2(p: PolicyInput): Record<string, unknown> {
  const accept = normalizeAccept(p.accept);
  const any = normalizeAcceptAny(p.acceptAny);
  return {
    v: 2,
    merchant: p.merchant,
    resource: p.resource,
    title: p.title,
    description: p.description,
    priceXno: p.priceXno ?? "",
    accept: accept.map((a) => ({
      tokenId: a.tokenId,
      symbol: a.symbol,
      decimals: a.decimals,
      price: a.price,
    })),
    autoswap: !!p.autoswap,
    swapInto: (p.swapInto ?? "").toLowerCase(),
    expires: Math.floor(p.expires) || 0,
    // Included ONLY when set. An offer published before this existed must keep
    // hashing to the id it already has -- its receipts are on chain and its
    // buyers' grants are derived from that id, so adding a key unconditionally
    // would revoke access people have paid for. Tampering is still caught: an
    // acceptAny added or stripped in transit changes the hash either way.
    ...(any ? { acceptAny: { priceXno: any.priceXno, minBacking: any.minBacking ?? "0" } } : {}),
  };
}

/** Lower-case ids, drop unusable entries, de-duplicate, sort by id. */
export function normalizeAccept(list: AcceptedToken[] | undefined): AcceptedToken[] {
  const byId = new Map<string, AcceptedToken>();
  for (const a of list ?? []) {
    const tokenId = String(a?.tokenId ?? "").toLowerCase();
    if (!/^[0-9a-f]{32}$/.test(tokenId)) continue;
    let price: bigint;
    try {
      price = BigInt(a.price);
    } catch {
      continue;
    }
    if (price <= 0n) continue;
    // First listing of a token id wins, so a duplicate cannot quietly re-price
    // the same token depending on hash-map order.
    if (byId.has(tokenId)) continue;
    byId.set(tokenId, {
      tokenId,
      symbol: String(a.symbol ?? ""),
      decimals: Number(a.decimals) || 0,
      price: price.toString(),
    });
  }
  return [...byId.values()].sort((x, y) => (x.tokenId < y.tokenId ? -1 : x.tokenId > y.tokenId ? 1 : 0));
}

export function policyId(p: PolicyInput & { v?: 1 | 2 }): string {
  const v = p.v ?? 2;
  return h256(DOMAIN_POLICY, canonicalJson(v === 1 ? hashableV1(p) : hashableV2(p)));
}

export function makePolicy(p: PolicyInput & { v?: 1 | 2 }): Policy {
  const v = p.v ?? 2;
  const base: PolicyInput =
    v === 2
      ? { ...p, accept: normalizeAccept(p.accept), acceptAny: normalizeAcceptAny(p.acceptAny) ?? undefined }
      : p;
  return { ...base, v, id: policyId({ ...base, v }) };
}

/** Re-derive the id under the policy's OWN version and compare. Any tampering
 * in transit fails here, and a v1 offer keeps verifying exactly as it did. */
export function policyIsIntact(p: Policy): boolean {
  if (p.v !== 1 && p.v !== 2) return false;
  return policyId(p) === p.id;
}

/**
 * Every token this offer accepts, whatever version it is. v1's single token is
 * surfaced as a one-entry list, so nothing downstream has to know about
 * versions at all.
 */
export function acceptedTokens(p: PolicyInput & { v?: 1 | 2 }): AcceptedToken[] {
  if ((p.v ?? 2) === 1) {
    if (!p.token || !p.priceToken || BigInt(p.priceToken) <= 0n) return [];
    return [
      {
        tokenId: p.token.tokenId.toLowerCase(),
        symbol: p.token.symbol,
        decimals: p.token.decimals,
        price: p.priceToken,
      },
    ];
  }
  return normalizeAccept(p.accept);
}

/** The accepted entry for a token id, or null if this offer does not take it. */
export function acceptedToken(p: PolicyInput & { v?: 1 | 2 }, tokenId: string): AcceptedToken | null {
  const want = (tokenId ?? "").toLowerCase();
  return acceptedTokens(p).find((a) => a.tokenId === want) ?? null;
}

/** Which token an XNO payer should be swapped into. */
export function swapTarget(p: PolicyInput & { v?: 1 | 2 }): AcceptedToken | null {
  const list = acceptedTokens(p);
  if (list.length === 0) return null;
  const want = (p.swapInto ?? "").toLowerCase();
  return list.find((a) => a.tokenId === want) ?? list[0];
}

export function acceptsXno(p: PolicyInput): boolean {
  return !!p.priceXno && BigInt(p.priceXno) > 0n;
}

export function acceptsToken(p: PolicyInput & { v?: 1 | 2 }): boolean {
  return acceptedTokens(p).length > 0 || acceptAnyOf(p) !== null;
}

/** Drop an unusable acceptAny rather than half-honour it. */
export function normalizeAcceptAny(a: AcceptAny | undefined): AcceptAny | null {
  if (!a) return null;
  let price: bigint;
  let min: bigint;
  try {
    price = BigInt(a.priceXno ?? "0");
    min = BigInt(a.minBacking ?? "0");
  } catch {
    return null;
  }
  if (price <= 0n || min < 0n) return null;
  return { priceXno: price.toString(), minBacking: min.toString() };
}

/**
 * The open-token terms of this offer, or null. v1 offers never have them: they
 * were published before this existed and must verify exactly as they did.
 */
export function acceptAnyOf(p: PolicyInput & { v?: 1 | 2 }): AcceptAny | null {
  if ((p.v ?? 2) === 1) return null;
  return normalizeAcceptAny(p.acceptAny);
}

/** The XNO price, or null if XNO is not accepted. */
export function priceXnoOf(p: PolicyInput): bigint | null {
  return acceptsXno(p) ? BigInt(p.priceXno!) : null;
}
