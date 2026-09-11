// Third-party verifier.
//
//   node --experimental-strip-types scripts/verify.ts <receiptHash> [--policy <id>] [--policy-file p.json]
//
// The point of this script is that it is not special. It has no relationship
// with holderPay's server, no privileged access, and no shared secret -- it
// reads the same public ledger through the same public endpoint and runs the
// same core/verify.ts. Anyone can do this, which is what "the backend cannot
// grant access" actually means in practice.

import * as fs from "node:fs";
import { loadEnv } from "../core/env.ts";
import { verifyPayment } from "../core/verify.ts";
import { NodeReader } from "../core/reader.ts";
import { policyIsIntact, type Policy } from "../core/policy.ts";
import { fromRaw } from "../core/wallet.ts";
import * as catalog from "../server/catalog.ts";

loadEnv();

const argv = process.argv.slice(2);
const arg = (n: string) => {
  const i = argv.indexOf("--" + n);
  return i >= 0 ? argv[i + 1] : "";
};

const receipt = argv.find((a) => /^[0-9A-Fa-f]{64}$/.test(a)) ?? "";
if (!receipt) {
  console.error("usage: verify.ts <receiptHash> [--policy <id>] [--policy-file <file.json>]");
  process.exit(2);
}

let policy: Policy | null = null;
const file = arg("policy-file");
if (file) policy = JSON.parse(fs.readFileSync(file, "utf-8"));
else {
  const id = arg("policy");
  const listing = id ? catalog.get(id) : catalog.list()[0];
  policy = listing?.policy ?? null;
}
if (!policy) {
  console.error("no policy: pass --policy <id> or --policy-file <file.json>");
  process.exit(2);
}

console.log(`policy   ${policy.title} (${policy.id})`);
console.log(`  self-consistent: ${policyIsIntact(policy)}`);
console.log(`  merchant ${policy.merchant}`);
if (policy.priceXno) console.log(`  price    ${fromRaw(policy.priceXno, 30)} XNO`);
if (policy.priceToken && policy.token) {
  console.log(`  price    ${fromRaw(policy.priceToken, policy.token.decimals)} ${policy.token.symbol}`);
}
console.log(`receipt  ${receipt.toUpperCase()}\n`);

const v = await verifyPayment(policy, receipt, new NodeReader(arg("payer") ? [arg("payer")] : []));

console.log(v.granted ? "GRANTED" : "DENIED");
console.log(`  ${v.reason}`);
for (const [k, val] of Object.entries(v)) {
  if (k === "granted" || k === "reason" || val == null) continue;
  console.log(`  ${k.padEnd(10)} ${val}`);
}
process.exit(v.granted ? 0 : 1);
