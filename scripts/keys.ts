// Generate the holderPay operator/merchant/test wallets. Seeds are printed
// once and written to .env (gitignored) — this is a PoC key setup, not a
// production custody design.
import { randomBytes } from "node:crypto";
import * as nanocurrency from "nanocurrency";

export interface Keys { seed: string; secretKey: string; publicKey: string; address: string }

export function keysFromSeed(seed: string): Keys {
  const secretKey = nanocurrency.deriveSecretKey(seed, 0);
  const publicKey = nanocurrency.derivePublicKey(secretKey);
  return { seed, secretKey, publicKey, address: nanocurrency.deriveAddress(publicKey, { useNanoPrefix: true }) };
}

export function generate(): Keys {
  return keysFromSeed(randomBytes(32).toString("hex"));
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const roles = ["CREATOR", "MERCHANT", "BUYER"];
  const lines: string[] = [];
  for (const role of roles) {
    const k = generate();
    console.log(`${role}_ADDRESS=${k.address}`);
    lines.push(`${role}_SEED=${k.seed}`, `${role}_ADDRESS=${k.address}`);
  }
  console.log("\n--- .env lines ---\n" + lines.join("\n"));
}
