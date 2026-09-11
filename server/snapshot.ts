// The token catalogue: every token holderPay has ever seen, as of a build.
//
// ╔══════════════════════════════════════════════════════════════════════════╗
// ║ DISPLAY ONLY. NOTHING HERE MAY DECIDE A PAYMENT.                        ║
// ║                                                                         ║
// ║ A snapshot is stale the moment it is written -- backing changes every    ║
// ║ time anybody earmarks XNO -- so a verdict derived from one would be a    ║
// ║ verdict derived from a number nobody can check right now. Collateral for ║
// ║ verification comes from a LIVE fold, through ChainReader.tokenBacking    ║
// ║ (core/reader.ts). This module is imported by exactly one route.          ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// Why a snapshot exists at all: listing every token means replaying every chain
// that ever touched one, which measured at over twenty minutes -- against a
// sixty-second invocation ceiling. scripts/snapshot-tokens.ts does that work
// offline and the build ships the result.

import * as fs from "node:fs";
import * as path from "node:path";
import type { TokenView } from "../core/valuation.ts";

export interface Snapshot {
  /** When the fold ran, ISO. Shown to the payer rather than hidden. */
  at: string;
  accounts: number;
  tokens: TokenView[];
}

let baked: Snapshot | null = null;
let fileChecked = false;
let fromFile: Snapshot | null = null;

/** Seed the catalogue from the build (server/vercel-entry.ts does this). */
export function seed(s: Snapshot | null): void {
  baked = s && Array.isArray(s.tokens) ? s : null;
}

/**
 * The catalogue, or null if this deployment has none.
 *
 * Falls back to reading data/tokens.snapshot.json so a local server picks up a
 * fresh snapshot without a rebuild. Read once: it is a build artefact, not
 * live data, and re-reading it per request would only make it look live.
 */
export function snapshot(): Snapshot | null {
  if (baked) return baked;
  if (!fileChecked) {
    fileChecked = true;
    try {
      const raw = fs.readFileSync(path.resolve(process.cwd(), "data", "tokens.snapshot.json"), "utf-8");
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed?.tokens)) fromFile = parsed;
    } catch {
      /* no snapshot here: the catalogue is simply whatever the live fold sees */
    }
  }
  return fromFile;
}

/** How old the catalogue is, in ms, or null when there is none. */
export function ageMs(): number | null {
  const s = snapshot();
  if (!s?.at) return null;
  const t = Date.parse(s.at);
  return Number.isFinite(t) ? Date.now() - t : null;
}
