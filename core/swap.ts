// Auto-swap: the buyer has XNO, the merchant only wants TEACHER.
//
// holderPay does NOT hold anyone's money to do this. The swap runs as two
// signed ops on the BUYER's own chain, in the buyer's own browser:
//
//   1. buy  -- XNO in, TEACHER out, on the hodlgame constant-product AMM;
//   2. transfer -- the bought TEACHER to the merchant (a fragment pair), with
//      the holderPay receipt block chained onto it.
//
// So the merchant is paid in the asset they asked for, the buyer never has to
// hold the token first, and the verifier sees an ordinary TEACHER payment --
// the swap leaves no special case in core/verify.ts at all.
//
// Two buy lanes, because TEACHER is a Direct-Settlement (zero-custody) token
// and has no pool account to pay into:
//
//   QUEUE-ROUTED  a seller is waiting to be paid, so the buyer's XNO is sent
//                 straight to that seller's wallet and the buy op is chained
//                 onto the send. Real money moves, wallet to wallet.
//   SELF-EARMARK  nobody is owed, so nothing moves: the XNO stays in the
//                 buyer's own wallet as earmarked collateral, declared in a
//                 fragment buy that consensus checks against the signed block
//                 balance.
//
// Both are hodlgame's rules, not holderPay's -- this module only picks the lane
// and quotes the price the same way the replay will.

import * as nanocurrency from "nanocurrency";
import { encodeOpLink } from "../vendor/hodl/core/oplink.ts";
import { encodeFragLinks } from "../vendor/hodl/core/fraglink.ts";
import type { State } from "../vendor/hodl/core/state.ts";
import { buildBlock, submitLink, tip, type Keys, type Rpc, SEND_DIFFICULTY } from "./wallet.ts";

/** Constant-product buy quote with the protocol's 1% swap fee, bit-identical
 * to core/state.ts so a preview never disagrees with what replay computes. */
export function quoteBuy(poolXno: bigint, poolTokens: bigint, xno: bigint): bigint {
  if (poolXno <= 0n || poolTokens <= 0n || xno <= 0n) return 0n;
  const afterFee = (xno * 9900n) / 10000n;
  return (afterFee * poolTokens) / (poolXno + afterFee);
}

/** Smallest XNO that buys at least `tokens`, found by bisection on quoteBuy.
 * Exact rather than algebraic: the on-chain quote floors twice, so inverting
 * the formula in closed form can land one raw short and fail the slippage
 * guard. Returns null if the reserves cannot supply that many tokens. */
export function xnoNeededFor(poolXno: bigint, poolTokens: bigint, tokens: bigint): bigint | null {
  if (tokens <= 0n) return 0n;
  if (poolXno <= 0n || poolTokens <= 0n || tokens >= poolTokens) return null;
  let lo = 1n;
  let hi = poolXno;
  // Grow the upper bound until it is enough (or clearly impossible).
  for (let i = 0; i < 128 && quoteBuy(poolXno, poolTokens, hi) < tokens; i++) hi *= 2n;
  if (quoteBuy(poolXno, poolTokens, hi) < tokens) return null;
  while (lo < hi) {
    const mid = (lo + hi) / 2n;
    if (quoteBuy(poolXno, poolTokens, mid) >= tokens) hi = mid;
    else lo = mid + 1n;
  }
  return lo;
}

export interface SwapPlan {
  lane: "queue" | "earmark";
  /** XNO the buyer spends (raw). */
  xno: bigint;
  /** TEACHER the curve will hand over. */
  tokensOut: bigint;
  /** Slippage floor written into the op. */
  minTokens: bigint;
  /** Queue-routed only: the seller who receives the XNO. */
  payTo?: string;
  /** Raw XNO the buyer's wallet must hold for this to be valid. */
  needBalance: bigint;
  /** Set when the plan cannot be made. */
  problem?: string;
}

export interface SwapInputs {
  state: State;
  /** Buyer's signed XNO balance right now (raw). */
  walletBalance: bigint;
  /** Buyer's existing earmark floor in this token (raw), 0 if none. */
  myFloor: bigint;
  /** Tokens the buyer needs to end up with. */
  wantTokens: bigint;
  /** Slippage tolerance in basis points (100 = 1%). */
  slippageBps: number;
}

/**
 * Decide how to buy `wantTokens`, or explain why it cannot be done.
 * The returned plan is what `executeSwap` signs -- quoting and executing are
 * split so the page can show the price before the buyer commits.
 */
export function planSwap(i: SwapInputs): SwapPlan {
  const s = i.state;
  const fail = (problem: string): SwapPlan => ({
    lane: "earmark",
    xno: 0n,
    tokensOut: 0n,
    minTokens: 0n,
    needBalance: 0n,
    problem,
  });
  if (!s.launched) return fail("token has not launched");
  if (s.poolXno <= 0n || s.poolTokens <= 0n) return fail("token has no liquidity to swap against yet");
  if (i.wantTokens <= 0n) return fail("nothing to buy");

  const xno = xnoNeededFor(s.poolXno, s.poolTokens, i.wantTokens);
  if (xno == null) return fail("not enough liquidity for that size");
  const tokensOut = quoteBuy(s.poolXno, s.poolTokens, xno);

  // The slippage floor must not sit above what we are actually asking for, or
  // the op invalidates itself.
  const bps = Math.min(10_000, Math.max(0, Math.floor(i.slippageBps)));
  const guard = (tokensOut * BigInt(10_000 - bps)) / 10_000n;
  const minTokens = guard < i.wantTokens ? guard : i.wantTokens;

  // Queue-routed when someone is owed: the XNO goes to them, and the curve only
  // mints against min(spend, their residual), so the spend is capped there.
  const head = s.queue.find((q) => q.owed > 0n);
  if (head) {
    if (xno <= head.owed) {
      return {
        lane: "queue",
        xno,
        tokensOut,
        minTokens,
        payTo: head.account,
        // send + 1-raw op block
        needBalance: xno + 1n,
      };
    }
    // A spend larger than the head's residual would only mint on the residual,
    // so buy exactly the residual's worth here. The page asks again for the rest
    // (the next queue head may be a different account).
    const capped = head.owed;
    const out = quoteBuy(s.poolXno, s.poolTokens, capped);
    return {
      lane: "queue",
      xno: capped,
      tokensOut: out,
      minTokens: (out * BigInt(10_000 - bps)) / 10_000n,
      payTo: head.account,
      needBalance: capped + 1n,
      problem:
        out < i.wantTokens
          ? `the queued seller is only owed ${capped} raw, which buys ${out} -- repeat the buy for the rest`
          : undefined,
    };
  }

  // Self-earmark: nothing moves, but consensus requires the signed balance to
  // cover the declared amount PLUS any floor already pledged elsewhere in this
  // token, plus the 2 raw the fragment pair burns.
  const need = xno + i.myFloor + 2n;
  return {
    lane: "earmark",
    xno,
    tokensOut,
    minTokens,
    needBalance: need,
    problem: i.walletBalance < need ? `wallet needs ${need} raw to collateralize this buy` : undefined,
  };
}

/**
 * Sign and broadcast the plan. Returns the hash of the last block, after which
 * the buyer holds `tokensOut` TEACHER in the replay.
 */
export async function executeSwap(rpc: Rpc, keys: Keys, tokenId: string, plan: SwapPlan): Promise<string> {
  if (plan.problem && plan.tokensOut <= 0n) throw new Error(plan.problem);

  if (plan.lane === "queue") {
    if (!plan.payTo) throw new Error("queue lane without a payee");
    const t = await tip(rpc, keys.address);
    if (!t.frontier) throw new Error("wallet is unopened -- send it some XNO first");
    if (t.balance < plan.needBalance) throw new Error("not enough XNO for this swap");

    // Block 1: real XNO straight to the queued seller's wallet.
    const w1 = (await rpc({ action: "work_generate", hash: t.frontier, difficulty: SEND_DIFFICULTY })).work;
    const send = buildBlock(keys.secretKey, {
      work: w1,
      previous: t.frontier,
      representative: t.representative,
      balance: (t.balance - plan.xno).toString(),
      link: nanocurrency.derivePublicKey(plan.payTo),
    });
    const r1 = await rpc({ action: "process", json_block: "true", block: send });

    // Block 2: the buy op, chained onto the send so the amount is value-bound
    // (the replay reads the deposit, it does not believe a declaration).
    const w2 = (await rpc({ action: "work_generate", hash: r1.hash, difficulty: SEND_DIFFICULTY })).work;
    const op = buildBlock(keys.secretKey, {
      work: w2,
      previous: String(r1.hash),
      representative: t.representative,
      balance: (t.balance - plan.xno - 1n).toString(),
      link: encodeOpLink(tokenId, { kind: "buy", xno: 0n, minTokens: plan.minTokens }),
    });
    const r2 = await rpc({ action: "process", json_block: "true", block: op });
    return String(r2.hash).toUpperCase();
  }

  // Self-earmark: a fragment pair declaring (xno, minTokens). No value moves.
  const [fragA, fragB] = encodeFragLinks(tokenId, { kind: "buy", xno: plan.xno, minTokens: plan.minTokens });
  await submitLink(rpc, keys, fragA, 1n);
  return submitLink(rpc, keys, fragB, 1n);
}

/** Transfer tokens to the merchant (fragment pair) and chain the holderPay
 * receipt onto it. The three blocks together are the whole payment proof. */
export async function payTokenWithReceipt(
  rpc: Rpc,
  keys: Keys,
  tokenId: string,
  to: string,
  amount: bigint,
  receiptLink: string
): Promise<{ fragA: string; payment: string; receipt: string }> {
  const [a, b] = encodeFragLinks(tokenId, { kind: "transfer", to, amount });
  const fragA = await submitLink(rpc, keys, a, 1n);
  const payment = await submitLink(rpc, keys, b, 1n);
  const receipt = await submitLink(rpc, keys, receiptLink, 1n);
  return { fragA, payment, receipt };
}
