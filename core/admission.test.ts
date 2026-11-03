// Tests for who may take the payment lane of the fold queue (core/admission.ts),
// and for the HTTP routes that use it.
//
// The flood this guards against: POST /api/access took `body.payer` as any
// string and was unthrottled, so 68 requests naming 68 made-up payers filled
// the 4 running replays and the 64 waiting payment places, and a real buyer's
// payment check got 503.
//
// No node and no network: the fold tests inject the replay, and the HTTP tests
// only reach routes that answer before any ledger read.

import { test } from "node:test";
import assert from "node:assert/strict";
import * as http from "node:http";
import type { AddressInfo } from "node:net";
import * as nanocurrency from "nanocurrency";

import { parsePayer, PaymentAdmission, PAYMENT_PAYERS_PER_CLIENT } from "./admission.ts";
import {
  currentFold,
  bustFold,
  waitingReplays,
  MAX_CONCURRENT_REPLAYS,
  MAX_WAITING_PAYMENTS,
} from "./ledger.ts";
import type { Fold } from "./fold.ts";

const VALID = "nano_1111111111111111111111111111111111111111111111111111hifc8npp";
// Same characters, last one changed: the format is right, the checksum is not.
const BAD_CHECKSUM = "nano_1111111111111111111111111111111111111111111111111111hifc8npq";

function addressOf(i: number): string {
  const seed = i.toString(16).padStart(64, "0");
  return nanocurrency.deriveAddress(nanocurrency.derivePublicKey(nanocurrency.deriveSecretKey(seed, 0)), {
    useNanoPrefix: true,
  });
}

test("a payer must be a Nano address with a correct checksum", () => {
  assert.deepEqual(parsePayer(undefined), { ok: true, accounts: [] });
  assert.deepEqual(parsePayer(""), { ok: true, accounts: [] });
  assert.deepEqual(parsePayer(VALID), { ok: true, accounts: [VALID] });
  assert.deepEqual(parsePayer(VALID.replace(/^nano_/, "xrb_")), { ok: true, accounts: [VALID] });
  for (const bad of [BAD_CHECKSUM, "anything", "nano_x", 42, { a: 1 }, [VALID], VALID + "1"]) {
    assert.equal(parsePayer(bad).ok, false, `must refuse ${JSON.stringify(bad)}`);
  }
});

test("one client puts at most a few distinct payers in the payment lane; the rest are lookups", () => {
  const adm = new PaymentAdmission();
  const now = 1_000_000;
  const lanes = Array.from({ length: 10 }, (_, i) => adm.priority("1.2.3.4", [addressOf(i)], now));
  assert.equal(lanes.filter((l) => l === "payment").length, PAYMENT_PAYERS_PER_CLIENT);
  assert.deepEqual(lanes.slice(PAYMENT_PAYERS_PER_CLIENT), Array(10 - PAYMENT_PAYERS_PER_CLIENT).fill("lookup"));
  // The same payer asking again is still a payment check: retries cost nothing.
  assert.equal(adm.priority("1.2.3.4", [addressOf(0)], now), "payment");
  // Another client has its own budget, and the budget comes back after the window.
  assert.equal(adm.priority("5.6.7.8", [addressOf(99)], now), "payment");
  assert.equal(adm.priority("1.2.3.4", [addressOf(50)], now + 61_000), "payment");
});

/** A replay that never finishes until released. */
function heldLoad() {
  const releases: Array<() => void> = [];
  const load = (accounts: string[]): Promise<Fold> =>
    new Promise<Fold>((resolve) => {
      releases.push(() =>
        resolve({
          state: new Map() as unknown as Fold["state"],
          appliedByCarrier: new Map(),
          rejectedByCarrier: new Map(),
          accounts: [...accounts],
          at: Date.now(),
        })
      );
    });
  return { load, releases };
}

const tick = () => new Promise<void>((resolve) => setImmediate(resolve));

test("68 made-up payers from one client cannot fill the payment lane ahead of a real buyer", async () => {
  bustFold();
  const adm = new PaymentAdmission();
  const { load, releases } = heldLoad();
  const flood = MAX_CONCURRENT_REPLAYS + MAX_WAITING_PAYMENTS;
  const strangers: Array<Promise<unknown>> = [];
  for (let i = 0; i < flood; i++) {
    const accounts = [addressOf(i)];
    // Most of these are refused (lookup lane full): that is the point.
    strangers.push(currentFold(accounts, false, load, adm.priority("6.6.6.6", accounts)).catch(() => null));
  }
  await tick();
  assert.ok(waitingReplays().payment < MAX_WAITING_PAYMENTS, "the flood did not take the payment lane");

  // Before the fix every one of those was "payment", the lane was full, and
  // this rejected with FoldBusyError -- a 503 for a buyer who had paid.
  const buyer = [addressOf(1000)];
  const buyerFold = currentFold(buyer, false, load, adm.priority("10.0.0.1", buyer));
  await tick();
  assert.equal(waitingReplays().payment, 1, "the buyer has a place in the payment lane");

  let settled = false;
  buyerFold.then(() => (settled = true), () => (settled = true));
  while (!settled) {
    releases.forEach((r) => r());
    await tick();
  }
  assert.deepEqual((await buyerFold).accounts, buyer);
  while (releases.length) {
    releases.splice(0).forEach((r) => r());
    await tick();
  }
  await Promise.all(strangers);
  bustFold();
});

// ── HTTP: the routes refuse before they read the ledger ─────────────────────

async function startServer() {
  process.env.HOLDERPAY_SERVERLESS = "1"; // no listener, no websocket, no signals
  const { handle } = await import("../server/index.ts");
  const server = http.createServer(handle);
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  const post = async (path: string, body: unknown) => {
    const res = await fetch(`http://127.0.0.1:${port}${path}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    return { status: res.status, body: (await res.json()) as any };
  };
  return { server, post };
}

test("HTTP: /api/access refuses a payer with a bad checksum (400) and is rate limited (429)", async () => {
  const { server, post } = await startServer();
  try {
    // Before the fix this reached the catalogue (404) and, with a real policy,
    // a payment-priority replay of whatever string was sent.
    const bad = await post("/api/access", { policyId: "nope", payer: BAD_CHECKSUM });
    assert.equal(bad.status, 400);
    assert.match(bad.body.error, /checksum/);

    // Before the fix /api/access had no limit at all: every call got a 404 here.
    const statuses: number[] = [];
    for (let i = 0; i < 40; i++) statuses.push((await post("/api/access", { policyId: "nope" })).status);
    assert.notEqual(statuses[0], 429);
    assert.equal(statuses[statuses.length - 1], 429, `statuses: ${statuses.join(",")}`);
  } finally {
    server.close();
  }
});
