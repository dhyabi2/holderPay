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

let cfg: Config;
let listings: Listing[] = [];
let current: Listing | null = null;
let keys: Keys;
let tokenView: any = null;
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

  // One headline price, with the alternative asset as a quiet aside.
  const box = $("offerPrice");
  box.replaceChildren();
  const token = p.priceToken && p.token ? `${fromRaw(p.priceToken, p.token.decimals)} ${p.token.symbol}` : "";
  const xno = p.priceXno ? `${fromRaw(p.priceXno, 30)} XNO` : "";
  const [headline, alt] = token ? [token, xno] : [xno, ""];
  box.appendChild(el("span", "", headline || "—"));
  if (alt) box.appendChild(el("span", "alt", `or ${alt}`));

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

function renderPayActions() {
  if (!current) return;
  const p = current.policy;
  const box = $("payActions");
  box.replaceChildren();
  const lanes = lanesOf(p);
  const dec = p.token?.decimals ?? 6;

  if (lanes.includes("TOKEN") && p.token) {
    const have = BigInt(tokenView?.you?.balance ?? "0");
    const need = BigInt(p.priceToken!);
    box.appendChild(
      payOption(
        `Pay ${fromRaw(need, dec)} ${p.token.symbol}`,
        `you hold ${fromRaw(have, dec)} ${p.token.symbol}`,
        () => payWithToken(),
        have < need
      )
    );
  }

  if (lanes.includes("XNO")) {
    box.appendChild(
      payOption(`Pay ${fromRaw(p.priceXno!, 30)} XNO`, "straight to the merchant, wallet to wallet", () => payWithXno())
    );
  }

  // The auto-swap lane: the merchant wants the token, the buyer has XNO.
  if (p.autoswap && p.token && p.priceToken) {
    const canQuote = tokenView && BigInt(tokenView.poolXno ?? "0") > 0n;
    box.appendChild(
      payOption(
        `Pay with XNO \u2192 ${p.token.symbol}`,
        "buys the token on the AMM in your own wallet, then pays the merchant in it",
        () => payWithSwap(),
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

async function payWithToken() {
  if (!current?.policy.token) return;
  const p = current.policy;
  try {
    status(`Paying ${fromRaw(p.priceToken!, p.token!.decimals)} ${p.token!.symbol}\u2026`);
    await ensureHellos();
    const r = await payTokenWithReceipt(
      rpc,
      keys,
      p.token!.tokenId,
      p.merchant,
      BigInt(p.priceToken!),
      memoLink(p.id)
    );
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
async function payWithSwap() {
  if (!current?.policy.token) return;
  const p = current.policy;
  const want = BigInt(p.priceToken!);
  try {
    await ensureHellos();
    const have = BigInt(tokenView?.you?.balance ?? "0");
    if (have < want) {
      const missing = want - have;
      status(`Swapping XNO for ${fromRaw(missing, p.token!.decimals)} ${p.token!.symbol}\u2026`);
      const st = await loadTokenState(true);
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
        `lane ${plan.lane}: ${fromRaw(plan.xno, 30)} XNO -> ${fromRaw(plan.tokensOut, p.token!.decimals)} ${p.token!.symbol}` +
          (plan.payTo ? ` (paid straight to queued seller ${short(plan.payTo)})` : " (collateral stays in your wallet)")
      );
      const h = await executeSwap(rpc, keys, p.token!.tokenId, plan);
      log(`swap block ${short(h)}`, "ok");
      await loadTokenState(true);
    }
    status(`Paying in ${p.token!.symbol}\u2026`);
    const r = await payTokenWithReceipt(rpc, keys, p.token!.tokenId, p.merchant, want, memoLink(p.id));
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

async function loadTokenState(force = false) {
  const tokenId = current?.policy.token?.tokenId || cfg.tokenId;
  if (!tokenId) return null;
  const res = await fetch(`/api/token?tokenId=${tokenId}&account=${encodeURIComponent(keys.address)}${force ? "&t=" + Date.now() : ""}`);
  const j = await res.json();
  if (j.error) return null;
  tokenView = j;
  $("balTok").textContent = fromRaw(j.you?.balance ?? "0", j.decimals ?? 6);
  $("balTokLabel").textContent = j.symbol ?? "TEACHER";
  $("tokenChip").textContent = `${j.symbol ?? "token"} ${short(j.tokenId, 6)}`;
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

async function refreshBalances() {
  try {
    const info = await rpc({ action: "account_info", account: keys.address });
    $("balXno").textContent = fromRaw(info?.balance ?? "0", 30);
  } catch {
    $("balXno").textContent = "0";
  }
  await loadTokenState(true);
  renderPayActions();
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
        void loadTokenState(true);
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
    const tokenId = val("cfgTokenId").toLowerCase();
    const priceToken = val("cfgPriceToken");
    const priceXno = val("cfgPriceXno");
    const body = {
      policy: {
        merchant: val("cfgMerchant"),
        resource: val("cfgResource"),
        title: val("cfgTitle"),
        description: val("cfgDesc"),
        token: tokenId ? { tokenId, symbol: val("cfgSymbol"), decimals } : undefined,
        priceToken: tokenId && priceToken ? toRaw(priceToken, decimals).toString() : undefined,
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
