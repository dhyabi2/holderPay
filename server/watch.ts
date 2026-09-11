// Websocket payment detection.
//
// The owner's instruction was to use the websocket for as much as possible, and
// that is the right call for this job: Nano's websocket is a SUBSCRIPTION
// protocol, so instead of asking "has anything arrived?" on a timer, we are
// told the instant a block involving a watched account confirms. For a checkout
// page that is the difference between "paid" appearing in under a second and
// appearing on the next poll.
//
// What it cannot do (probed against the endpoint): it is not a second RPC
// transport. `confirmation`, `vote`, `work`, `telemetry` and friends are
// subscriptions; account_info / blocks_info / process get no answer at all. So
// reads and broadcasts stay on rpc.nano.to and the socket does exactly one
// thing -- tell us when to look.
//
// Same provider as the RPC (wss://ws.nano.to), so the single-service rule holds.

import WebSocket from "ws";
import { NANO_WS } from "../core/rpc.ts";
import { bustFold } from "../core/ledger.ts";

export interface Confirmation {
  hash: string;
  account: string;
  link: string;
  subtype: string;
  amount: string;
  at: number;
}

type Listener = (c: Confirmation) => void;

/**
 * One socket for the whole process, with the watched-account set mutable at
 * runtime. Reconnects with backoff; a dropped socket degrades holderPay to
 * polling, never to wrong answers, because nothing is decided from a
 * notification -- it only triggers a re-read of the ledger.
 */
export class ConfirmationWatcher {
  private ws: WebSocket | null = null;
  private accounts = new Set<string>();
  private listeners = new Set<Listener>();
  private backoff = 1000;
  private closed = false;
  /** Recent confirmations, newest last. Lets a page that connects a moment late
   * still see the block it was waiting for. */
  private recent: Confirmation[] = [];
  private RECENT_MAX = 200;

  start(): void {
    if (this.ws || this.closed) return;
    const ws = new WebSocket(NANO_WS);
    this.ws = ws;

    ws.on("open", () => {
      this.backoff = 1000;
      this.send({
        action: "subscribe",
        topic: "confirmation",
        ack: true,
        options: { accounts: [...this.accounts] },
      });
      // Keepalive: the endpoint answers `ping` with `pong`, which is also how we
      // notice a half-open socket that stopped delivering.
      const timer = setInterval(() => {
        if (ws.readyState === WebSocket.OPEN) this.send({ action: "ping" });
        else clearInterval(timer);
      }, 25_000);
    });

    ws.on("message", (raw) => {
      let msg: any;
      try {
        msg = JSON.parse(raw.toString());
      } catch {
        return;
      }
      if (msg.topic !== "confirmation" || !msg.message) return;
      const m = msg.message;
      const c: Confirmation = {
        hash: String(m.hash ?? "").toUpperCase(),
        account: String(m.account ?? ""),
        link: String(m.block?.link ?? "").toUpperCase(),
        subtype: String(m.block?.subtype ?? ""),
        amount: String(m.amount ?? "0"),
        at: Date.now(),
      };
      // A confirmation involving a watched account can change the token fold, so
      // drop the cached one. We never trust the socket's CONTENTS -- the block
      // is re-fetched and re-verified through rpc.nano.to when it matters.
      bustFold();
      this.recent.push(c);
      if (this.recent.length > this.RECENT_MAX) this.recent.shift();
      for (const l of this.listeners) {
        try {
          l(c);
        } catch {
          /* a listener must not kill the socket */
        }
      }
    });

    const retry = () => {
      this.ws = null;
      if (this.closed) return;
      setTimeout(() => this.start(), this.backoff);
      this.backoff = Math.min(30_000, this.backoff * 2);
    };
    ws.on("close", retry);
    ws.on("error", retry);
  }

  private send(obj: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) this.ws.send(JSON.stringify(obj));
  }

  /** Add accounts to the live subscription (no reconnect needed). */
  watch(accounts: string[]): void {
    const added = accounts.filter((a) => a && !this.accounts.has(a));
    for (const a of added) this.accounts.add(a);
    if (added.length) {
      this.send({ action: "update", topic: "confirmation", options: { accounts_add: added } });
    }
    this.start();
  }

  on(l: Listener): () => void {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  }

  /** Confirmations seen in the last `ms`, optionally filtered by account. */
  since(ms: number, account?: string): Confirmation[] {
    const cutoff = Date.now() - ms;
    return this.recent.filter((c) => c.at >= cutoff && (!account || c.account === account));
  }

  get connected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  get watching(): string[] {
    return [...this.accounts];
  }

  stop(): void {
    this.closed = true;
    this.ws?.close();
    this.ws = null;
  }
}

export const watcher = new ConfirmationWatcher();
