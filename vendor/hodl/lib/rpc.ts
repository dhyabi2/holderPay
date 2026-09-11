// Shim for the vendored hodlgame indexer.
//
// Upstream lib/rpc.ts allowed one non-nano.to fallback endpoint. holderPay's
// owner rule forbids that, so FALLBACK_RPC is repointed at rpc.nano.to itself
// and the "second view" the indexer cross-checks against becomes the KEYLESS
// view of the same provider. That preserves the upstream cross-checking code
// path unmodified (keyed vs keyless answers compared, higher frontier wins)
// while calling exactly one service. Blocks are signature-verified locally
// either way, so a view can omit data — never forge it.

import { nanoRpc, SEND_DIFFICULTY, RECEIVE_DIFFICULTY, validateWork } from "../../../core/rpc.ts";

export { nanoRpc, SEND_DIFFICULTY, RECEIVE_DIFFICULTY, validateWork };

export const NANO_RPC = process.env.NANO_RPC_URL || "https://rpc.nano.to";
export const FALLBACK_RPC = NANO_RPC;

export function loadNanoRpcKey(): string {
  return process.env.NANO_RPC_KEY ?? "";
}
