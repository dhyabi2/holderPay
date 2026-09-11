// Domain-separated hashing + canonical JSON.
//
// Every digest holderPay computes is prefixed with a domain string, so a value
// signed in one context can never be replayed as a value in another (a Nano
// block signature can never double as a holderPay auth signature, a policy
// hash can never collide with a payment memo, and so on).

import blakejsPkg from "blakejs";
const { blake2bHex } = blakejsPkg;

export const DOMAIN_POLICY = "holderpay-policy-v1";
export const DOMAIN_MEMO = "holderpay-pay-v1";
export const DOMAIN_AUTH = "holderpay-auth-v1";
export const DOMAIN_GRANT = "holderpay-grant-v1";

/** Unit separator between hashed parts, so ("ab","c") and ("a","bc") can never
 * share a preimage. It cannot occur in any part we hash (hex, addresses,
 * decimal amounts, canonical JSON). */
const SEP = "";

/** blake2b-256 over the domain and parts, hex. */
export function h256(domain: string, ...parts: string[]): string {
  const payload = Buffer.from([domain, ...parts].join(SEP), "utf-8");
  return blake2bHex(payload, undefined, 32);
}

/**
 * Canonical JSON: object keys sorted, no insignificant whitespace, bigints as
 * decimal strings. Two parties that agree on the VALUES must produce the same
 * bytes -- otherwise the policy hash would depend on key insertion order and a
 * merchant and a verifier could disagree about what was actually offered.
 */
export function canonicalJson(value: unknown): string {
  if (value === null || typeof value === "number" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "bigint") return JSON.stringify(value.toString());
  if (typeof value === "string") return JSON.stringify(value);
  if (Array.isArray(value)) return "[" + value.map(canonicalJson).join(",") + "]";
  if (typeof value === "object") {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).filter((k) => obj[k] !== undefined).sort();
    return "{" + keys.map((k) => JSON.stringify(k) + ":" + canonicalJson(obj[k])).join(",") + "}";
  }
  throw new Error("cannot canonicalize " + typeof value);
}
