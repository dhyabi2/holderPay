// The serverless entry point.
//
// Vercel gives each invocation a Node request and response, which is exactly
// what server/index.ts already speaks, so this file does not reimplement a
// single route: it fixes the environment, seeds the fixed catalog, and hands
// over to the same `handle` the Node server uses. The deployment and the thing
// tested on a laptop are therefore the same code, which is the only way the
// audit story stays true ("the one route worth auditing" cannot have two
// implementations).
//
// What is different here, and why:
//
//   - The catalog is FROZEN. There is no writable disk, and no shared one: a
//     write would live in one invocation's private filesystem and vanish. The
//     offers are baked in at build time by scripts/build-vercel.mjs instead.
//
//   - The confirmation websocket never starts. A long-lived subscription cannot
//     exist in a function that is created per request, and nothing needs it to:
//     the page subscribes to the Nano websocket DIRECTLY from the browser
//     (web/app.ts), so live confirmations still arrive. The /api/watch status
//     simply reports a socket that is not connected, which is the truth.
//
// Nothing about verification changes. Verdicts are recomputed from the chain on
// every request wherever this runs, and the browser re-derives them itself.

import "./vercel-env.ts"; // MUST be first: see the note in that file
import type * as http from "node:http";
import { handle } from "./index.ts";
import { seedReadOnly, type Listing } from "./catalog.ts";
// Baked at build time by scripts/build-vercel.mjs, which copies the live
// data/catalog.json next to this file. A deployment therefore carries its shop
// with it and needs no storage at all.
import baked from "./catalog.baked.json" with { type: "json" };

seedReadOnly(((baked as any)?.listings ?? []) as Listing[]);

export default function (req: http.IncomingMessage, res: http.ServerResponse): Promise<void> {
  return handle(req, res);
}
