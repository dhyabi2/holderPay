// The merchant's shop: policies, and what each one unlocks.
//
// This file is the ONLY mutable server state in holderPay, and it deliberately
// holds nothing security-critical. It stores offers (which are self-verifying:
// each carries the hash of its own contents) and the content to hand over once
// a payment verifies. It holds no grants, no sessions, no "user X has paid"
// table -- because there is nothing to store. Whether access is owed is
// recomputed from the chain on every request by core/verify.ts.
//
// Deleting data/catalog.json loses the shop listing. It cannot revoke a single
// grant, because grants do not live here: they live in the ledger.

import * as fs from "node:fs";
import * as path from "node:path";
import { makePolicy, type Policy, type PolicyInput } from "../core/policy.ts";

export interface Listing {
  policy: Policy;
  /** What the buyer gets. Plain text or markdown; served only on a verdict. */
  unlock: string;
  createdAt: number;
}

const DIR = path.resolve(process.cwd(), "data");
const FILE = path.join(DIR, "catalog.json");

let cache: Map<string, Listing> | null = null;

function load(): Map<string, Listing> {
  if (cache) return cache;
  cache = new Map();
  try {
    const raw = JSON.parse(fs.readFileSync(FILE, "utf-8"));
    for (const l of raw.listings ?? []) cache.set(l.policy.id, l);
  } catch {
    /* no catalog yet */
  }
  return cache;
}

function save(): void {
  fs.mkdirSync(DIR, { recursive: true });
  fs.writeFileSync(FILE, JSON.stringify({ listings: [...load().values()] }, null, 2));
}

export function list(): Listing[] {
  return [...load().values()].sort((a, b) => a.createdAt - b.createdAt);
}

export function get(policyId: string): Listing | null {
  return load().get((policyId ?? "").toLowerCase()) ?? null;
}

export function put(input: PolicyInput, unlock: string): Listing {
  const policy = makePolicy(input);
  const existing = load().get(policy.id);
  const listing: Listing = { policy, unlock, createdAt: existing?.createdAt ?? Date.now() };
  load().set(policy.id, listing);
  save();
  return listing;
}

export function remove(policyId: string): boolean {
  const ok = load().delete((policyId ?? "").toLowerCase());
  if (ok) save();
  return ok;
}
