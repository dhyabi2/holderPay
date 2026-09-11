// Show the XNO balance (and receivables) of the PoC wallets.
import { loadEnv, env } from "../core/env.ts";
import { rpc, RpcSemanticError } from "../core/rpc.ts";

loadEnv();

const XNO = 10n ** 30n;
export const fmtXno = (raw: bigint | string): string => {
  const n = BigInt(raw);
  const whole = n / XNO;
  const frac = (n % XNO).toString().padStart(30, "0").replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
};

export async function balanceOf(account: string): Promise<{ balance: bigint; receivable: bigint; frontier: string | null }> {
  let balance = 0n;
  let frontier: string | null = null;
  try {
    const info = await rpc({ action: "account_info", account, representative: "true" });
    balance = BigInt(info.balance ?? "0");
    frontier = info.frontier ?? null;
  } catch (e) {
    if (!(e instanceof RpcSemanticError)) throw e; // unopened account is a fact, not a failure
  }
  let receivable = 0n;
  try {
    const r = await rpc({ action: "receivable", account, count: "50", source: "true", threshold: "1" });
    const blocks = r.blocks && typeof r.blocks === "object" ? r.blocks : {};
    for (const v of Object.values<any>(blocks)) receivable += BigInt(typeof v === "string" ? v : v.amount);
  } catch (e) {
    if (!(e instanceof RpcSemanticError)) throw e;
  }
  return { balance, receivable, frontier };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const role of ["CREATOR", "MERCHANT", "BUYER"]) {
    const account = env(`${role}_ADDRESS`);
    if (!account) continue;
    const b = await balanceOf(account);
    console.log(
      `${role.padEnd(9)} ${account}\n  balance ${fmtXno(b.balance)} XNO  receivable ${fmtXno(b.receivable)} XNO  ${b.frontier ? "opened" : "UNOPENED"}`
    );
  }
}
