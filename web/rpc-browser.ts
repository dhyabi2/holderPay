// Browser RPC. Replaces core/rpc.ts (and the vendored indexer's lib/rpc.ts) in
// the bundle: the page has no API key and must never have one, so every call
// goes through holderPay's own /api/rpc proxy, which adds the key server-side
// and only forwards whitelisted read/broadcast actions.
//
// Routing reads through the proxy does not weaken the browser's independent
// verification: every block the page receives is re-hashed and its signature
// re-checked locally (vendor/hodl/core/blockVerify.ts, same code the server
// runs). A proxy that lies by omission makes verification FAIL; it cannot make
// it succeed for a payment that did not happen.

export const NANO_RPC = "/api/rpc";
export const FALLBACK_RPC = "/api/rpc";
export const SEND_DIFFICULTY = "fffffff800000000";
export const RECEIVE_DIFFICULTY = "fffffe0000000000";

export function loadNanoRpcKey(): string {
  return ""; // there is no key in the browser, by design
}

export async function nanoRpc(_key: string, body: Record<string, unknown>): Promise<any> {
  const res = await fetch(NANO_RPC, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (json?.error) {
    // "Account not found" is a fact about an unopened account, not a failure.
    // Callers in the vendored indexer already treat a throw as "no data", and
    // the wallet code checks for a missing frontier, so re-throwing is correct.
    throw new Error(typeof json.error === "string" ? json.error : JSON.stringify(json.error));
  }
  return json;
}

/** Convenience for page code. */
export function rpc(body: Record<string, unknown>): Promise<any> {
  return nanoRpc("", body);
}

export function validateWork(): boolean {
  // Work is generated and validated server-side by core/rpc.ts. The page never
  // needs to check a nonce: an invalid one is simply rejected by `process`.
  return true;
}
