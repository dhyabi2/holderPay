// What a token is worth, and the order to show tokens in.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ READ THIS BEFORE CHANGING THE SORT.                                     ║
// ║                                                                         ║
// ║ A Direct-Settlement token's XNO reserve is a DECLARED VIRTUAL number.    ║
// ║ Seeding it is a two-block fragment op that costs THREE RAW and claims no ║
// ║ real money whatsoever. Measured live: three raw buys a token that quotes ║
// ║ 1,000,000 XNO per unit with exactly zero backing.                       ║
// ║                                                                         ║
// ║ So the AMM quote is NOT a value. It is an assertion by whoever launched  ║
// ║ the token, and it is free. Sorting by it puts the cheapest lie on top;   ║
// ║ pricing acceptance off it hands out unlimited free goods.                ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// The quantity that cannot be faked for free is REAL COLLATERAL: the sum of the
// ratcheted earmark floors. Consensus checks every earmark against the signed
// balance of the buyer's own wallet at the moment they bought (state.ts rejects
// a buy whose declared XNO exceeds `balance - existing floor`), and a balance
// observation that drops below the floor voids the position proportionally. To
// raise a token's backing by one XNO, somebody has to actually hold one XNO.
//
// Everything here therefore reports BOTH numbers and sorts by the honest one.

import type { State } from "../vendor/hodl/core/state.ts";
import type { Fold } from "./fold.ts";
import { tokens as launchedTokens } from "../vendor/hodl/core/multi.ts";

const XNO = 10n ** 30n;

export interface TokenView {
  tokenId: string;
  symbol: string;
  name: string;
  decimals: number;
  supply: string;
  poolXno: string;
  poolTokens: string;
  creator: string;
  holders: number;
  direct: boolean;

  /** AMM quote, raw XNO per whole token. FREE TO DECLARE -- display only. */
  quotedPrice: string;
  /** supply x quotedPrice. Free to declare. Display only. */
  quotedValue: string;
  /**
   * Real XNO collateral behind this token: the sum of the ratcheted earmark
   * floors, each one policed against a signed wallet balance. This is the
   * number that costs money to move, and the one the sort uses.
   */
  backing: string;
  /**
   * backing / quotedValue as a percentage, or null when nothing is quoted.
   * A token quoting far more than it is backed by is not necessarily a scam --
   * a young token legitimately has little collateral yet -- but a merchant
   * should see the gap before choosing to accept it.
   */
  backedPct: number | null;

  /** What the viewing account holds, if one was given. */
  balance: string;
  /** balance x quotedPrice. Free to declare, like every quoted figure. */
  quotedHoldingValue: string;
  /**
   * What the holding is worth against REAL collateral: the holder's pro-rata
   * share of the token's backing. Cannot be inflated by a seeded quote.
   */
  backedHoldingValue: string;
}

/** Real collateral behind a token: floors are policed against signed balances. */
export function backingOf(s: State): bigint {
  let total = 0n;
  for (const f of s.earmarkFloor.values()) total += f;
  return total;
}

/** Raw XNO per ONE whole token, from the (freely declared) curve. */
export function quotedPriceOf(s: State): bigint {
  if (s.poolTokens <= 0n || s.poolXno <= 0n) return 0n;
  return (s.poolXno * 10n ** BigInt(s.decimals)) / s.poolTokens;
}

/**
 * Display labels for tokens, keyed by token id.
 *
 * A hodlgame token's name and symbol live OFF chain, so they are not part of
 * consensus and holderPay refuses to let them decide anything. They are used
 * for display only, resolved from local configuration (the merchant's own
 * accept list, or TOKEN_LABELS in .env) rather than any registry -- a token
 * that renames itself "XNO" tomorrow must not become a different payment
 * today. Anything unlabelled shows a short form of its id, which is the one
 * name that cannot lie because it IS the launch block hash.
 */
export type TokenLabels = Map<string, { symbol?: string; name?: string }>;

export function viewToken(tokenId: string, s: State, account = "", labels?: TokenLabels): TokenView {
  const unit = 10n ** BigInt(s.decimals);
  const quotedPrice = quotedPriceOf(s);
  const quotedValue = (s.supply * quotedPrice) / unit;
  const backing = backingOf(s);
  const balance = account ? s.balances.get(account) ?? 0n : 0n;

  // Pro-rata share of real collateral. Circulating supply is what has claims on
  // it, so the treasury (never issued) is excluded -- otherwise an untouched
  // 95% treasury would dilute every real holder's backed value to near zero.
  const circulating = s.supply > s.treasury ? s.supply - s.treasury : 0n;
  const backedHoldingValue = circulating > 0n ? (backing * balance) / circulating : 0n;

  const label = labels?.get(tokenId.toLowerCase());
  return {
    tokenId,
    symbol: label?.symbol || s.symbol || tokenId.slice(0, 6),
    name: label?.name || s.name || "",
    decimals: s.decimals,
    supply: s.supply.toString(),
    poolXno: s.poolXno.toString(),
    poolTokens: s.poolTokens.toString(),
    creator: s.creator,
    holders: s.balances.size,
    direct: s.direct,
    quotedPrice: quotedPrice.toString(),
    quotedValue: quotedValue.toString(),
    backing: backing.toString(),
    // Parts-per-million internally, reported as a percentage, so a real but
    // tiny ratio does not round away to a flat 0 and read like "unbacked".
    backedPct: quotedValue > 0n ? Number((backing * 1_000_000n) / quotedValue) / 10_000 : null,
    balance: balance.toString(),
    quotedHoldingValue: ((balance * quotedPrice) / unit).toString(),
    backedHoldingValue: backedHoldingValue.toString(),
  };
}

export type SortKey = "backedHoldingValue" | "backing" | "quotedHoldingValue" | "quotedValue" | "symbol";

/**
 * Sort tokens, highest first.
 *
 * The default deliberately leads with what the VIEWER actually holds, measured
 * against real collateral -- the list exists so a payer can see what they can
 * pay with, most valuable first. Ties fall back to the token's own backing, and
 * finally to the token id so the order is total and every replayer agrees.
 *
 * `quoted*` keys are offered because a merchant may want to see them, but they
 * order by an assertion anybody can make for three raw. Never use one to decide
 * anything.
 */
export function sortTokens(list: TokenView[], key: SortKey = "backedHoldingValue"): TokenView[] {
  const num = (v: TokenView, k: SortKey): bigint => {
    if (k === "symbol") return 0n;
    try {
      return BigInt((v as any)[k] ?? "0");
    } catch {
      return 0n;
    }
  };
  return [...list].sort((a, b) => {
    if (key === "symbol") return a.symbol.localeCompare(b.symbol) || a.tokenId.localeCompare(b.tokenId);
    const primary = num(b, key) - num(a, key);
    if (primary !== 0n) return primary > 0n ? 1 : -1;
    // Same primary value: prefer the token with more real collateral behind it.
    const secondary = BigInt(b.backing) - BigInt(a.backing);
    if (secondary !== 0n) return secondary > 0n ? 1 : -1;
    return a.tokenId.localeCompare(b.tokenId);
  });
}

/** Every launched token in a fold, viewed for `account` and sorted. */
export function tokenList(
  fold: Fold,
  account = "",
  key: SortKey = "backedHoldingValue",
  labels?: TokenLabels
): TokenView[] {
  const views = launchedTokens(fold.state).map(({ tokenId, state }) => viewToken(tokenId, state, account, labels));
  return sortTokens(views, key);
}

/** Human-readable XNO for logs and the UI. */
export function xnoStr(raw: string | bigint): string {
  const n = BigInt(raw);
  const whole = n / XNO;
  const frac = (n % XNO).toString().padStart(30, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac.slice(0, 8)}` : `${whole}`;
}
