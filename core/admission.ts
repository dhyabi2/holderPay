// Who may take a place in the "payment" lane of the fold queue (core/ledger.ts).
//
// The payment lane exists so a buyer who has already paid is never stuck behind
// a crowd of anonymous lookups. That only holds if the crowd cannot simply walk
// into the payment lane too. Before this, POST /api/verify and /api/access put
// `body.payer` -- any string at all -- straight into a payment-priority replay,
// and every distinct string is a distinct replay. 68 requests with 68 made-up
// payers filled the 4 running slots and the 64 waiting places, and the real
// buyer's own payment check was answered 503.
//
// Two rules, both cheap and both fail closed:
//
//   1. A payer must be a real Nano address, checksum included. Anything else is
//      refused with 400 before it can reach the ledger at all.
//
//   2. A valid address costs nothing to make, so each client address may put at
//      most PAYMENT_PAYERS_PER_CLIENT distinct payers into the payment lane per
//      window. An honest buyer has one wallet; past the budget a request still
//      works, it just waits in the lookup lane like any other stranger, where a
//      full line is refused at once instead of crowding out a payer.

import * as nanocurrency from "nanocurrency";
import type { FoldPriority } from "./ledger.ts";

export type PayerParse = { ok: true; accounts: string[] } | { ok: false; error: string };

/**
 * The accounts to fold for `body.payer`: none when it is absent, the one
 * address when it is a valid Nano address (checksum checked, normalised to
 * nano_), and a refusal otherwise.
 */
export function parsePayer(raw: unknown): PayerParse {
  if (raw === undefined || raw === null || raw === "") return { ok: true, accounts: [] };
  if (typeof raw !== "string") return { ok: false, error: "payer must be a Nano address" };
  const a = raw.trim().replace(/^xrb_/, "nano_");
  if (a.length > 70 || !nanocurrency.checkAddress(a)) {
    return { ok: false, error: "payer is not a valid Nano address (bad format or checksum)" };
  }
  return { ok: true, accounts: [a] };
}

export const PAYMENT_PAYERS_PER_CLIENT = 3;
export const PAYMENT_WINDOW_MS = 60_000;
/** Bounds the bookkeeping itself: past this many clients the oldest are dropped. */
const MAX_TRACKED_CLIENTS = 10_000;

/** Per-client budget of distinct payers admitted to the payment lane. */
export class PaymentAdmission {
  private seen = new Map<string, { payers: Set<string>; until: number }>();
  private readonly perClient: number;
  private readonly windowMs: number;

  constructor(perClient = PAYMENT_PAYERS_PER_CLIENT, windowMs = PAYMENT_WINDOW_MS) {
    this.perClient = perClient;
    this.windowMs = windowMs;
  }

  /** The lane this client's replay of `accounts` may wait in. */
  priority(client: string, accounts: string[], now = Date.now()): FoldPriority {
    const key = [...accounts].sort().join(",");
    let h = this.seen.get(client);
    if (!h || now > h.until) {
      this.seen.delete(client);
      if (this.seen.size >= MAX_TRACKED_CLIENTS) {
        const oldest = this.seen.keys().next().value;
        if (oldest !== undefined) this.seen.delete(oldest);
      }
      h = { payers: new Set(), until: now + this.windowMs };
      this.seen.set(client, h);
    }
    if (h.payers.has(key)) return "payment";
    if (h.payers.size >= this.perClient) return "lookup";
    h.payers.add(key);
    return "payment";
  }
}
