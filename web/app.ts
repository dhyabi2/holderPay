// The pay page.
//
// One page, three jobs:
//   1. show the offer and take the payment (TEACHER, XNO, or XNO auto-swapped
//      into TEACHER for a merchant who only wants the token);
//   2. watch the Nano websocket so "paid" appears the moment the block
//      confirms, instead of on some polling interval;
//   3. re-verify the server's verdict here, in this browser, from the public
//      ledger -- and say so loudly when the two disagree.
//
// The buyer's key is generated here and stays here. The server never receives
// it, never signs anything, and has no way to produce the blocks a grant is
// made of.

import * as nanocurrency from "nanocurrency";
import { memoLink, signAuth } from "../core/proof.ts";
import { lanesOf } from "../core/verify.ts";
import { acceptedTokens, acceptedToken, swapTarget, type AcceptedToken } from "../core/policy.ts";
import type { Policy } from "../core/policy.ts";
import type { Verdict } from "../core/verify.ts";
import { keysFromSeed, toRaw, fromRaw, receiveAll, sendXno, submitLink, tip, type Keys } from "../core/wallet.ts";
import { planSwap, executeSwap, payTokenWithReceipt, type SwapPlan } from "../core/swap.ts";
import { ANCHOR_PUB } from "../vendor/hodl/core/anchor.ts";
import { rpc } from "./rpc-browser.ts";
import { BrowserReader, verifyLocally, type CrossCheck } from "./verifier.ts";

// ── tiny DOM helpers ────────────────────────────────────────────────────────
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const el = (tag: string, cls?: string, text?: string) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
};
const short = (s: string, n = 10) => (s && s.length > n * 2 ? `${s.slice(0, n)}…${s.slice(-6)}` : s || "—");

function log(msg: string, kind: "" | "ok" | "err" = "") {
  const line = el("div", kind, `${new Date().toLocaleTimeString()}  ${msg}`);
  $("log").appendChild(line);
  $("log").scrollTop = $("log").scrollHeight;
}

/** The one line a payer reads while something is happening. Everything else
 * that used to be on screen now lives in the log or a disclosure. */
function status(msg: string, kind: "" | "ok" | "err" = "") {
  const n = $("status");
  n.className = "status " + kind;
  n.textContent = msg;
  if (msg) log(msg, kind);
}

// ── state ───────────────────────────────────────────────────────────────────
interface Config {
  ws: string;
  tokenId: string;
  symbol: string;
  decimals: number;
  merchant: string;
  anchors: { holderpay: string; hodlgame: string };
}

interface Listing {
  policy: Policy;
  lanes: ("XNO" | "TOKEN")[];
  receiptLink: string;
}

/** One row of the token list, as /api/tokens returns it. */
interface TokenRow {
  tokenId: string;
  symbol: string;
  decimals: number;
  balance: string;
  backing: string;
  backedHoldingValue: string;
  quotedHoldingValue: string;
  backedPct: number | null;
}

let cfg: Config;
let listings: Listing[] = [];
let current: Listing | null = null;
let keys: Keys;
let tokenView: any = null;
/** Every token this browser can see, sorted by real collateral, richest first. */
let myTokens: TokenRow[] = [];
let lastReceipt = "";

const SEED_KEY = "holderpay.seed.v1";
const RECEIPTS_KEY = "holderpay.receipts.v1";

// ── wallet ──────────────────────────────────────────────────────────────────

function loadWallet(): Keys {
  let seed = "";
  try {
    seed = localStorage.getItem(SEED_KEY) ?? "";
  } catch {
    /* private mode: fall through to an in-memory wallet */
  }
  if (!/^[0-9a-fA-F]{64}$/.test(seed)) {
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    seed = [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
    try {
      localStorage.setItem(SEED_KEY, seed);
    } catch {}
  }
  return keysFromSeed(seed);
}

function rememberReceipt(policyId: string, receipt: string) {
  try {
    const all = JSON.parse(localStorage.getItem(RECEIPTS_KEY) ?? "{}");
    all[policyId] = receipt;
    localStorage.setItem(RECEIPTS_KEY, JSON.stringify(all));
  } catch {}
}
function recallReceipt(policyId: string): string {
  try {
    return JSON.parse(localStorage.getItem(RECEIPTS_KEY) ?? "{}")[policyId] ?? "";
  } catch {
    return "";
  }
}

// ── rendering ───────────────────────────────────────────────────────────────

function renderOffer() {
  if (!current) {
    $("offerTitle").textContent = "Nothing for sale yet";
    $("offerDesc").textContent = "";
    $("offerPrice").textContent = "";
    $("payActions").replaceChildren();
    return;
  }
  const p = current.policy;
  $("offerTitle").textContent = p.title || p.resource;
  $("offerDesc").textContent = p.description;
  $("switchOffer").hidden = listings.length < 2;

  // One headline price. Everything else the offer takes is a quiet aside, in
  // the same order the pay buttons appear -- most valuable to this buyer first.
  const box = $("offerPrice");
  box.replaceChildren();
  const prices = acceptedTokens(p)
    .map((a) => ({ a, rank: rankOf(a.tokenId) }))
    .sort((x, y) => (y.rank > x.rank ? 1 : y.rank < x.rank ? -1 : 0))
    .map(({ a }) => `${fromRaw(a.price, a.decimals)} ${a.symbol || a.tokenId.slice(0, 6)}`);
  if (p.priceXno) prices.push(`${fromRaw(p.priceXno, 30)} XNO`);
  box.appendChild(el("span", "", prices[0] ?? "\u2014"));
  if (prices.length > 1) box.appendChild(el("span", "alt", `or ${prices.slice(1).join(" / ")}`));

  renderPayActions();
}

function payOption(label: string, hint: string, onClick: () => void, disabled = false) {
  const btn = el("button", "primary", label) as HTMLButtonElement;
  btn.disabled = disabled;
  btn.title = hint; // the explanation is a tooltip now, not a paragraph
  btn.onclick = () => {
    document.querySelectorAll<HTMLButtonElement>("#payActions button").forEach((b) => (b.disabled = true));
    Promise.resolve(onClick()).finally(() => renderPayActions());
  };
  return btn;
}

/**
 * Where a token sits in this buyer's list, as a sortable number.
 *
 * The rank is the token's BACKED holding value -- the buyer's pro-rata share of
 * real collateral -- not the AMM quote. A token's quoted price is a free
 * declaration (three raw buys one quoting a million XNO a unit), so ranking by
 * it would reliably float the cheapest lie to the top of the buyer's wallet.
 * See core/valuation.ts.
 */
function rankOf(tokenId: string): bigint {
  const row = myTokens.find((t) => t.tokenId === tokenId.toLowerCase());
  if (!row) return -1n;
  try {
    return BigInt(row.backedHoldingValue);
  } catch {
    return 0n;
  }
}

function heldBalance(tokenId: string): bigint {
  const row = myTokens.find((t) => t.tokenId === tokenId.toLowerCase());
  try {
    return BigInt(row?.balance ?? "0");
  } catch {
    return 0n;
  }
}

function renderPayActions() {
  if (!current) return;
  const p = current.policy;
  const box = $("payActions");
  box.replaceChildren();
  const lanes = lanesOf(p);

  // One button per accepted token, richest-to-this-buyer first, so what they
  // can actually pay with sits at the top. Tokens they cannot cover still show
  // -- disabled, with the shortfall in the tooltip -- because hiding them makes
  // an offer look narrower than it is.
  if (lanes.includes("TOKEN")) {
    const rows = acceptedTokens(p)
      .map((a) => ({ a, have: heldBalance(a.tokenId), rank: rankOf(a.tokenId) }))
      .sort((x, y) => {
        // Affordable first, then by real backed value, then by symbol so the
        // order never depends on map iteration.
        const xOk = x.have >= BigInt(x.a.price) ? 1 : 0;
        const yOk = y.have >= BigInt(y.a.price) ? 1 : 0;
        if (xOk !== yOk) return yOk - xOk;
        if (x.rank !== y.rank) return y.rank > x.rank ? 1 : -1;
        return (x.a.symbol || x.a.tokenId).localeCompare(y.a.symbol || y.a.tokenId);
      });

    for (const { a, have } of rows) {
      const need = BigInt(a.price);
      const sym = a.symbol || a.tokenId.slice(0, 6);
      box.appendChild(
        payOption(
          `Pay ${fromRaw(need, a.decimals)} ${sym}`,
          have >= need
            ? `you hold ${fromRaw(have, a.decimals)} ${sym}`
            : `you hold ${fromRaw(have, a.decimals)} ${sym} \u2014 ${fromRaw(need - have, a.decimals)} short`,
          () => payWithToken(a),
          have < need
        )
      );
    }
  }

  if (lanes.includes("XNO")) {
    box.appendChild(
      payOption(`Pay ${fromRaw(p.priceXno!, 30)} XNO`, "straight to the merchant, wallet to wallet", () => payWithXno())
    );
  }

  // The auto-swap lane: the merchant wants a token, the buyer has XNO.
  const target = swapTarget(p);
  if (p.autoswap && target) {
    const canQuote = tokenView && BigInt(tokenView.poolXno ?? "0") > 0n;
    const sym = target.symbol || target.tokenId.slice(0, 6);
    box.appendChild(
      payOption(
        `Pay with XNO \u2192 ${sym}`,
        "buys the token on the AMM in your own wallet, then pays the merchant in it",
        () => payWithSwap(target),
        !canQuote
      )
    );
  }
}

function renderVerdict(mine: Verdict | null, check: CrossCheck | null) {
  const card = $("verdictCard") as HTMLDetailsElement;
  card.hidden = false;
  const v = check?.mine ?? mine;
  if (!v) return;

  // The summary is the whole story for a payer: granted, or why not.
  const badge = $("verdictBadge");
  badge.className = v.granted ? "granted" : "denied";
  badge.textContent = v.granted ? "Paid \u2713 verified on chain" : v.reason;

  const rows = $("verdictRows");
  rows.replaceChildren();
  const row = (k: string, val: string) => {
    const d = el("div");
    d.append(el("span", "", k), el("span", "", val));
    rows.appendChild(d);
  };
  if (v.paid && v.price) {
    const dec = v.asset === "XNO" ? 30 : current?.policy.token?.decimals ?? 6;
    row("paid", `${fromRaw(v.paid, dec)} / ${fromRaw(v.price, dec)} ${v.asset === "XNO" ? "XNO" : current?.policy.token?.symbol ?? ""}`);
  }
  if (v.payer) row("payer", v.payer);
  if (v.payment) row("payment", v.payment);
  if (v.receipt) row("receipt", v.receipt);
  if (v.grant) row("grant", v.grant);
  if (current) row("policy", current.policy.id);

  const cc = $("crosscheck");
  cc.replaceChildren();
  if (!check) {
    cc.className = "crosscheck muted";
    cc.textContent = "checking independently\u2026";
    return;
  }
  if (check.serverOverclaimed) {
    // The failure this whole design exists to make visible. It opens the fold
    // by itself, because it is the one time a payer must read the details.
    card.open = true;
    cc.className = "crosscheck disagree";
    cc.appendChild(el("b", "", "Refused: the server claimed this grant, the ledger does not support it."));
    const ul = el("ul");
    for (const d of check.differences) ul.appendChild(el("li", "", d));
    cc.appendChild(ul);
    badge.className = "denied";
    badge.textContent = "Refused \u2014 the server and the chain disagree";
  } else if (check.agrees) {
    cc.className = "crosscheck agree";
    cc.textContent = "Re-verified in this browser: the server matches the ledger.";
  } else {
    card.open = true;
    cc.className = "crosscheck disagree";
    cc.appendChild(el("b", "", "This browser and the server disagree."));
    const ul = el("ul");
    for (const d of check.differences) ul.appendChild(el("li", "", d));
    cc.appendChild(ul);
  }
}

// ── payment flows ───────────────────────────────────────────────────────────

async function ensureHellos() {
  // One-time 1-raw greetings so both indexers can discover this wallet from
  // chain data alone. Best-effort: discoverability, never correctness.
  const done = `holderpay.hello.${keys.address}`;
  try {
    if (localStorage.getItem(done)) return;
  } catch {}
  for (const target of [cfg.anchors.holderpay, cfg.anchors.hodlgame]) {
    if (!target) continue;
    try {
      const pub = /^[0-9a-fA-F]{64}$/.test(target) ? target : nanocurrency.derivePublicKey(target);
      await submitLink(rpc, keys, pub, 1n);
    } catch {
      /* ignore */
    }
  }
  try {
    localStorage.setItem(done, "1");
  } catch {}
}

async function payWithXno() {
  if (!current) return;
  const p = current.policy;
  const amount = BigInt(p.priceXno!);
  try {
    status(`Paying ${fromRaw(amount, 30)} XNO\u2026`);
    await ensureHellos();
    const payment = await sendXno(rpc, keys, p.merchant, amount);
    log(`payment block ${short(payment)}`, "ok");
    const receipt = await submitLink(rpc, keys, memoLink(p.id), 1n);
    log(`receipt block ${short(receipt)} — committed to policy ${short(p.id, 8)}`, "ok");
    await onPaid(receipt);
  } catch (e: any) {
    status(e.message, "err");
  }
}

async function payWithToken(a: AcceptedToken) {
  if (!current) return;
  const p = current.policy;
  const sym = a.symbol || a.tokenId.slice(0, 6);
  try {
    status(`Paying ${fromRaw(a.price, a.decimals)} ${sym}\u2026`);
    await ensureHellos();
    const r = await payTokenWithReceipt(rpc, keys, a.tokenId, p.merchant, BigInt(a.price), memoLink(p.id));
    log(`transfer ${short(r.fragA)} + ${short(r.payment)}`, "ok");
    log(`receipt block ${short(r.receipt)}`, "ok");
    await onPaid(r.receipt);
  } catch (e: any) {
    status(e.message, "err");
  }
}

/**
 * The auto-swap lane. Buys the exact amount of TEACHER the offer asks for on
 * the AMM (inside the buyer's own wallet, with the buyer's own signature),
 * then pays the merchant in the token. The merchant never touches XNO; the
 * buyer never has to source the token in advance.
 */
async function payWithSwap(a: AcceptedToken) {
  if (!current) return;
  const p = current.policy;
  const want = BigInt(a.price);
  const sym = a.symbol || a.tokenId.slice(0, 6);
  try {
    await ensureHellos();
    const have = heldBalance(a.tokenId);
    if (have < want) {
      const missing = want - have;
      status(`Swapping XNO for ${fromRaw(missing, a.decimals)} ${sym}\u2026`);
      const st = await loadTokenState(a.tokenId, true);
      if (!st) throw new Error(`could not read ${sym}'s market`);
      const walletBalance = (await tip(rpc, keys.address)).balance;
      const plan: SwapPlan = planSwap({
        state: st as any,
        walletBalance,
        myFloor: BigInt(tokenView?.you?.floor ?? "0"),
        wantTokens: missing,
        slippageBps: 300,
      });
      if (plan.problem && plan.tokensOut <= 0n) throw new Error(plan.problem);
      log(
        `lane ${plan.lane}: ${fromRaw(plan.xno, 30)} XNO -> ${fromRaw(plan.tokensOut, a.decimals)} ${sym}` +
          (plan.payTo ? ` (paid straight to queued seller ${short(plan.payTo)})` : " (collateral stays in your wallet)")
      );
      const h = await executeSwap(rpc, keys, a.tokenId, plan);
      log(`swap block ${short(h)}`, "ok");
      await loadTokenState(a.tokenId, true);
    }
    status(`Paying in ${sym}\u2026`);
    const r = await payTokenWithReceipt(rpc, keys, a.tokenId, p.merchant, want, memoLink(p.id));
    log(`receipt block ${short(r.receipt)}`, "ok");
    await onPaid(r.receipt);
  } catch (e: any) {
    status(e.message, "err");
  }
}

async function onPaid(receipt: string) {
  lastReceipt = receipt;
  if (current) rememberReceipt(current.policy.id, receipt);
  await checkReceipt(receipt);
  await refreshBalances();
}

// ── verification ────────────────────────────────────────────────────────────

async function askServer(receipt: string, forge = false): Promise<Verdict | null> {
  if (!current) return null;
  try {
    const res = await fetch(`/api/verify${forge ? "?forge=1" : ""}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policy: current.policy, receipt, payer: keys.address }),
    });
    const j = await res.json();
    return j.verdict ?? null;
  } catch {
    return null;
  }
}

async function checkReceipt(receipt: string, forge = false) {
  if (!current || !receipt) return;
  renderVerdict(null, null);
  const theirs = await askServer(receipt, forge);
  renderVerdict(theirs, null);
  status("Verifying against the chain\u2026");
  const reader = new BrowserReader(current.policy.token?.tokenId ?? "", [
    keys.address,
    current.policy.merchant,
    cfg.anchors.holderpay,
  ]);
  const check = await verifyLocally(current.policy, receipt, reader, theirs);
  renderVerdict(check.mine, check);
  if (check.serverOverclaimed) status("Refused \u2014 the server and the chain disagree", "err");
  else if (check.agrees) status(check.mine.granted ? "" : check.mine.reason, check.mine.granted ? "ok" : "");
  if (check.mine.granted && !forge) await claimAccess(receipt);
}

/** Prove control of the paying account and collect what was bought. */
async function claimAccess(receipt: string) {
  if (!current) return;
  try {
    const { challenge } = await (await fetch("/api/challenge")).json();
    const signature = signAuth(keys.secretKey, current.policy.id, receipt, challenge);
    const res = await fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ policyId: current.policy.id, receipt, challenge, signature, payer: keys.address }),
    });
    const j = await res.json();
    if (j.unlock) {
      $("unlockCard").hidden = false;
      $("unlock").textContent = j.unlock;
      status("", "ok");
    } else {
      status(j.error, "err");
    }
  } catch (e: any) {
    status(e.message, "err");
  }
}

// ── data loading ────────────────────────────────────────────────────────────

async function loadTokenState(tokenId: string, force = false) {
  const id = (tokenId || cfg.tokenId || "").toLowerCase();
  if (!id) return null;
  const res = await fetch(
    `/api/token?tokenId=${id}&account=${encodeURIComponent(keys.address)}${force ? "&t=" + Date.now() : ""}`
  );
  const j = await res.json();
  if (j.error) return null;
  tokenView = j;
  // The shape core/swap.ts expects: bigints, not strings.
  return {
    launched: j.launched,
    direct: j.direct,
    poolXno: BigInt(j.poolXno ?? "0"),
    poolTokens: BigInt(j.poolTokens ?? "0"),
    queue: j.queueHead ? [{ account: j.queueHead.account, owed: BigInt(j.queueHead.owed) }] : [],
    earmarkFloor: new Map([[keys.address, BigInt(j.you?.floor ?? "0")]]),
  };
}

/** Every token this browser can see, richest-to-this-buyer first. The ORDER is
 * the server's, but the server has no discretion in it: the sort is a pure
 * function of replayed collateral (core/valuation.ts), which this page could
 * recompute itself from the same public blocks. */
async function loadTokens() {
  const res = await fetch(`/api/tokens?account=${encodeURIComponent(keys.address)}&t=${Date.now()}`);
  const j = await res.json();
  myTokens = Array.isArray(j.tokens) ? j.tokens : [];

  // The wallet line shows the buyer's most valuable holding, whatever it is.
  const top = myTokens.find((t) => BigInt(t.balance) > 0n);
  $("balTok").textContent = top ? fromRaw(top.balance, top.decimals) : "0";
  $("balTokLabel").textContent = top ? top.symbol : cfg.symbol || "tokens";
  const held = myTokens.filter((t) => BigInt(t.balance) > 0n).length;
  const n = myTokens.length;
  $("tokenChip").textContent = held > 1
    ? `${top!.symbol} +${held - 1}`
    : top
      ? top.symbol
      : `${n} token${n === 1 ? "" : "s"}`;
}

async function refreshBalances() {
  try {
    const info = await rpc({ action: "account_info", account: keys.address });
    $("balXno").textContent = fromRaw(info?.balance ?? "0", 30);
  } catch {
    $("balXno").textContent = "0";
  }
  await loadTokens();
  // Keep the swap lane's market warm for the token an XNO payer lands in.
  const target = current ? swapTarget(current.policy) : null;
  if (target) await loadTokenState(target.tokenId, true);
  renderOffer();
}

async function loadListings() {
  const j = await (await fetch("/api/policies")).json();
  listings = j.listings ?? [];
  // ?policy=<id> selects one; otherwise the first published offer.
  const want = new URL(location.href).searchParams.get("policy");
  current = listings.find((l) => l.policy.id === want) ?? listings[0] ?? null;
  renderOffer();
  if (current) {
    const remembered = recallReceipt(current.policy.id);
    if (remembered) {
      lastReceipt = remembered;
      log(`found an earlier receipt for this offer (${short(remembered)}) — re-checking`);
      void checkReceipt(remembered);
    }
  }
}

// ── websocket: instant payment detection ────────────────────────────────────

function connectSocket() {
  const chip = $("wsChip");
  const dot = chip.querySelector(".dot") as HTMLElement;
  let ws: WebSocket;
  let backoff = 1000;

  const open = () => {
    ws = new WebSocket(cfg.ws);
    ws.onopen = () => {
      backoff = 1000;
      dot.classList.add("on");
      chip.title = `subscribed on ${cfg.ws}`;
      const accounts = [keys.address, current?.policy.merchant, cfg.merchant].filter(Boolean);
      ws.send(JSON.stringify({ action: "subscribe", topic: "confirmation", ack: true, options: { accounts } }));
      log(`websocket subscribed to ${accounts.length} account(s)`);
    };
    ws.onmessage = (ev) => {
      let msg: any;
      try {
        msg = JSON.parse(ev.data);
      } catch {
        return;
      }
      if (msg.ack) return;
      if (msg.topic !== "confirmation") return;
      const m = msg.message ?? {};
      const hash = String(m.hash ?? "").toUpperCase();
      const account = String(m.account ?? "");
      // A confirmation is only a nudge. Nothing here is trusted: it triggers a
      // re-read through the RPC, where the block is verified properly.
      if (account === keys.address) {
        log(`confirmed ${short(hash)} on your wallet`);
        if (hash === lastReceipt.toUpperCase()) void checkReceipt(lastReceipt);
        void refreshBalances();
      } else {
        log(`confirmed ${short(hash)} on ${short(account)}`);
        void loadTokens();
      }
    };
    ws.onclose = () => {
      dot.classList.remove("on");
      setTimeout(open, backoff);
      backoff = Math.min(30_000, backoff * 2);
    };
    ws.onerror = () => ws.close();
  };
  open();

  setInterval(() => {
    if (ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify({ action: "ping" }));
  }, 25_000);
}

// ── merchant panel ──────────────────────────────────────────────────────────

function wireConfigPanel() {
  ($("cfgMerchant") as HTMLInputElement).value = cfg.merchant;
  ($("cfgTokenId") as HTMLInputElement).value = cfg.tokenId;

  $("cfgSave").onclick = async () => {
    const val = (id: string) => ($(id) as HTMLInputElement).value.trim();
    const decimals = cfg.decimals ?? 6;
    // Comma- or space-separated token ids, so one offer can take many tokens.
    // Each is priced the same, because a price per token is the merchant's
    // decision and there is no safe way to derive one automatically: a token's
    // AMM quote is free to declare (core/valuation.ts).
    const ids = val("cfgTokenId").toLowerCase().split(/[,\s]+/).filter(Boolean);
    const priceToken = val("cfgPriceToken");
    const priceXno = val("cfgPriceXno");
    const symbols = val("cfgSymbol").split(/[,\s]+/).filter(Boolean);
    const accept = ids.map((tokenId, i) => ({
      tokenId,
      symbol: symbols[i] ?? symbols[0] ?? "",
      decimals,
      price: toRaw(priceToken, decimals).toString(),
    }));
    const body = {
      policy: {
        merchant: val("cfgMerchant"),
        resource: val("cfgResource"),
        title: val("cfgTitle"),
        description: val("cfgDesc"),
        accept: priceToken ? accept : [],
        priceXno: priceXno ? toRaw(priceXno, 30).toString() : undefined,
        autoswap: ($("cfgAutoswap") as HTMLInputElement).checked,
        expires: 0,
      },
      unlock: ($("cfgUnlock") as HTMLTextAreaElement).value,
    };
    const res = await fetch("/api/policies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = await res.json();
    if (j.error) return status(j.error, "err");
    status("Published", "ok");
    await loadListings();
    await refreshBalances();
  };
}

// ── boot ────────────────────────────────────────────────────────────────────

async function main() {
  cfg = await (await fetch("/api/config")).json();
  keys = loadWallet();
  $("walletAddr").textContent = keys.address;

  $("copyAddr").onclick = () => navigator.clipboard?.writeText(keys.address);
  $("walletMenu").onclick = () => {
    const seed = localStorage.getItem(SEED_KEY) ?? "(in memory only)";
    if (confirm("Show this wallet's seed? Anyone with it can spend the funds.")) alert(seed);
  };
  $("receiveBtn").onclick = async () => {
    try {
      const r = await receiveAll(rpc, keys);
      status(r.count ? `Received ${r.count} block(s)` : "Nothing to receive", r.count ? "ok" : "");
      await refreshBalances();
    } catch (e: any) {
      status(e.message, "err");
    }
  };
  $("recheck").onclick = () => checkReceipt(lastReceipt);
  $("tamperBtn").onclick = async () => {
    if (!lastReceipt) return status("Pay first \u2014 there is nothing to tamper with yet", "err");
    status("Asking the server to forge a grant\u2026");
    await checkReceipt(lastReceipt, true);
  };
  $("switchOffer").onclick = () => {
    const i = listings.findIndex((l) => l === current);
    current = listings[(i + 1) % listings.length];
    renderOffer();
    void refreshBalances();
  };

  // Each step is independent. Chaining them meant one failed render (a bad
  // offer, a slow endpoint) took the wallet and the live socket down with it,
  // leaving a page that looked merely empty rather than broken.
  const step = async (name: string, fn: () => unknown) => {
    try {
      await fn();
    } catch (e: any) {
      log(`${name} failed: ${e?.message ?? e}`, "err");
    }
  };
  await step("merchant panel", () => wireConfigPanel());
  await step("offers", () => loadListings());
  // The socket goes up BEFORE balances. Loading balances replays the token
  // ledger, which can take seconds, and waiting for it meant the page could
  // miss a confirmation for a payment made in that window.
  await step("websocket", () => connectSocket());
  await step("balances", () => refreshBalances());

  log(`wallet ${keys.address}`);
  log("chain access: rpc.nano.to only (proxied so the key stays server-side)");
}

void main().catch((e) => log(`startup failed: ${e.message}`, "err"));
