// Boot the real browser bundle against a minimal DOM, with a real server.
//
//   node --experimental-strip-types scripts/page-smoke.ts [--url http://localhost:8787]
//
// There is no headless browser in this environment, and a page that throws on
// load is indistinguishable from one that works until someone opens it. So this
// stubs just enough DOM for web/pay.js to run, loads the page's real markup to
// discover which element ids exist, and boots the bundle. It catches the things
// that actually break a rewrite of the markup: an id the script reads but the
// HTML no longer has, a missing method on a stubbed node, an exception in main().
//
// It is a smoke test, not a rendering test -- it proves the page comes up and
// talks to the server, not that it looks right.

import { loadEnv, env } from "../core/env.ts";

loadEnv();

const argv = process.argv.slice(2);
const base = (() => {
  const i = argv.indexOf("--url");
  return i >= 0 && argv[i + 1] ? argv[i + 1] : `http://localhost:${env("PORT", "8787")}`;
})();

const html = await (await fetch(base + "/")).text();
const ids = [...html.matchAll(/id="([A-Za-z][\w-]*)"/g)].map((m) => m[1]);
const missing = new Set<string>();
const errors: string[] = [];

class Node {
  id: string;
  tag: string;
  className = "";
  textContent = "";
  title = "";
  value = "";
  checked = true;
  hidden = false;
  open = false;
  disabled = false;
  scrollTop = 0;
  scrollHeight = 0;
  children: Node[] = [];
  onclick: null | (() => unknown) = null;
  classList = {
    add: () => {},
    remove: () => {},
    contains: () => false,
  };

  constructor(id: string, tag = "div") {
    this.id = id;
    this.tag = tag;
  }
  appendChild(n: Node) {
    this.children.push(n);
    return n;
  }
  append(...n: Node[]) {
    this.children.push(...n);
  }
  replaceChildren(...n: Node[]) {
    this.children = n;
  }
  setAttribute(k: string, v: string) {
    (this as any)[k] = v;
  }
  querySelector() {
    return new Node("", "span");
  }
  querySelectorAll() {
    return [] as Node[];
  }
}

const nodes = new Map<string, Node>();
for (const id of ids) nodes.set(id, new Node(id));

(globalThis as any).document = {
  getElementById(id: string) {
    if (!nodes.has(id)) {
      // The failure mode this test exists for: the script reaching for an
      // element the markup dropped. Return a node so boot continues and every
      // such id is reported at once, instead of dying on the first.
      missing.add(id);
      nodes.set(id, new Node(id));
    }
    return nodes.get(id)!;
  },
  createElement: (tag: string) => new Node("", tag),
  // The page draws each token's picture as inline SVG, built from its id
  // (web/app.ts, tokenIcon). Without this the icon throws and every pay button
  // silently disappears -- which is precisely how this stub earned the method.
  createElementNS: (_ns: string, tag: string) => new Node("", tag),
  createTextNode: (t: string) => {
    const n = new Node("", "#text");
    n.textContent = t;
    return n;
  },
  querySelectorAll: () => [] as Node[],
};

const store = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => void store.set(k, v),
  removeItem: (k: string) => void store.delete(k),
};

(globalThis as any).location = { href: base + "/" };
// Node already defines `navigator` as a getter-only property, so it has to be
// redefined rather than assigned.
Object.defineProperty(globalThis, "navigator", {
  value: { clipboard: { writeText: async () => {} } },
  configurable: true,
});
(globalThis as any).confirm = () => false;
(globalThis as any).alert = () => {};

// Resolve the page's relative fetches against the real server.
const realFetch = globalThis.fetch;
(globalThis as any).fetch = (input: any, init?: any) => {
  const url = typeof input === "string" && input.startsWith("/") ? base + input : input;
  return realFetch(url, init);
};

// A websocket that connects for real -- the page's live-payment path is one of
// the things worth proving comes up.
let wsOpened = false;
class FakeWS {
  static OPEN = 1;
  readyState = 0;
  onopen: any = null;
  onmessage: any = null;
  onclose: any = null;
  onerror: any = null;
  private ws: any;
  constructor(url: string) {
    import("ws").then(({ default: WS }) => {
      this.ws = new WS(url);
      this.ws.on("open", () => {
        this.readyState = 1;
        wsOpened = true;
        this.onopen?.();
      });
      this.ws.on("message", (d: any) => this.onmessage?.({ data: d.toString() }));
      this.ws.on("close", () => {
        this.readyState = 3;
        /* do not call onclose: the page would reconnect forever */
      });
      this.ws.on("error", () => {});
    });
  }
  send(s: string) {
    try {
      this.ws?.send(s);
    } catch {}
  }
  close() {
    try {
      this.ws?.close();
    } catch {}
  }
}
(globalThis as any).WebSocket = FakeWS;

process.on("uncaughtException", (e) => errors.push(String(e?.message ?? e)));
process.on("unhandledRejection", (e: any) => errors.push(String(e?.message ?? e)));

console.log(`booting web/pay.js against ${base}`);
await import("../web/pay.js" as any);
// Loading balances replays the token ledger, which is a burst of RPC calls.
await new Promise((r) => setTimeout(r, 30000));

// ── what the page ended up showing ──────────────────────────────────────────
const text = (id: string) => nodes.get(id)?.textContent ?? "";
const childText = (id: string) =>
  (nodes.get(id)?.children ?? []).map((c) => c.textContent || (c as any).tag).join(" | ");

console.log(`\n  title      ${text("offerTitle")}`);
console.log(`  price      ${text("offerPrice") || childText("offerPrice")}`);
console.log(`  buttons    ${childText("payActions")}`);
console.log(`  wallet     ${text("walletAddr")}`);
console.log(`  balances   ${text("balXno")} XNO / ${text("balTok")} ${text("balTokLabel")}`);
console.log(`  token chip ${text("tokenChip")}`);
console.log(`  log lines  ${(nodes.get("log")?.children ?? []).length}`);
console.log(`  websocket  ${wsOpened ? "connected" : "NOT connected"}`);

let fail = 0;
const check = (name: string, ok: boolean, detail = "") => {
  if (!ok) fail++;
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
};

console.log("");
check("no element id is missing from the markup", missing.size === 0, [...missing].join(", "));
check("no exception during boot", errors.length === 0, errors.join(" | "));
check("the offer title rendered", !!text("offerTitle") && text("offerTitle") !== "…", text("offerTitle"));
check("at least one pay button rendered", (nodes.get("payActions")?.children ?? []).length > 0);
check("the wallet address rendered", /^nano_/.test(text("walletAddr")), text("walletAddr"));
check("the websocket connected", wsOpened);

console.log(`\n${fail === 0 ? "page boots clean" : `${fail} problem(s)`}`);
process.exit(fail ? 1 : 0);
