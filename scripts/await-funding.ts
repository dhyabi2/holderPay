// Wait for the creator wallet to be funded, using the websocket rather than a
// polling loop -- the same mechanism the pay page uses to notice a payment.
//
//   node --experimental-strip-types scripts/await-funding.ts [--account nano_...] [--timeout 3600]
//
// A receive on an unopened account arrives as a RECEIVABLE, and receivables are
// not confirmations of anything on our own chain, so we watch the SENDER side:
// `confirmation` with an accounts filter fires on blocks involving the account,
// including sends addressed to it. A periodic receivable check backs that up,
// because a funding block broadcast before we connected would never be
// announced to us.

import WebSocket from "ws";
import { loadEnv, env } from "../core/env.ts";
import { NANO_WS, rpc } from "../core/rpc.ts";
import { fromRaw } from "../core/wallet.ts";

loadEnv();

const argv = process.argv.slice(2);
const arg = (n: string, d: string) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const account = arg("account", env("CREATOR_ADDRESS"));
const timeoutMs = Number(arg("timeout", "3600")) * 1000;
const started = Date.now();

async function incoming(): Promise<bigint> {
  let total = 0n;
  try {
    const info = await rpc({ action: "account_info", account });
    total += BigInt(info?.balance ?? "0");
  } catch {
    /* unopened */
  }
  try {
    const r = await rpc({ action: "receivable", account, count: "50", source: "true", threshold: "1" });
    const blocks = r?.blocks && typeof r.blocks === "object" ? r.blocks : {};
    for (const v of Object.values<any>(blocks)) total += BigInt(typeof v === "string" ? v : v.amount);
  } catch {
    /* unopened */
  }
  return total;
}

function stamp() {
  return new Date().toISOString().slice(11, 19);
}

const ws = new WebSocket(NANO_WS);
ws.on("open", () => {
  console.log(`${stamp()} watching ${account} on ${NANO_WS}`);
  ws.send(JSON.stringify({ action: "subscribe", topic: "confirmation", ack: true, options: { accounts: [account] } }));
});
ws.on("message", async (raw) => {
  let msg: any;
  try {
    msg = JSON.parse(raw.toString());
  } catch {
    return;
  }
  if (msg.topic !== "confirmation") return;
  const m = msg.message ?? {};
  console.log(`${stamp()} confirmation ${String(m.hash).slice(0, 16)}… subtype=${m.block?.subtype} amount=${m.amount}`);
  await report();
});
ws.on("error", (e) => console.log(`${stamp()} socket error: ${e.message}`));

async function report() {
  const total = await incoming();
  if (total > 0n) {
    console.log(`${stamp()} FUNDED: ${fromRaw(total, 30)} XNO available to ${account}`);
    process.exit(0);
  }
}

// Backstop: the funding block may have been broadcast before we subscribed.
const poll = setInterval(async () => {
  await report();
  if (Date.now() - started > timeoutMs) {
    console.log(`${stamp()} timed out waiting for funds`);
    clearInterval(poll);
    process.exit(2);
  }
}, 15_000);

await report();
