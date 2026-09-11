// Launch TEACHER on Nano, and seed its price curve.
//
// TEACHER is an ordinary hodlgame Direct-Settlement token: its supply, its 5%
// creator cap and its decimals are fixed by the launch block itself, and its
// whole ledger is the replay of signed Nano blocks. holderPay does not define a
// new token standard -- it reuses that one so TEACHER trades on the same AMM
// that holderPay's auto-swap buys from.
//
//   node --experimental-strip-types scripts/launch-token.ts [--supply N] [--seed-xno X] [--seed-tokens N] [--publish]
//
// Writes TEACHER_TOKEN_ID / TEACHER_LAUNCH_HASH back into .env on success.

import * as fs from "node:fs";
import * as nanocurrency from "nanocurrency";
import { loadEnv, env } from "../core/env.ts";
import { rpc as nodeRpc } from "../core/rpc.ts";
import { encodeOpLink } from "../vendor/hodl/core/oplink.ts";
import { encodeFragLinks } from "../vendor/hodl/core/fraglink.ts";
import { tokenIdFromLaunchHash } from "../vendor/hodl/core/token.ts";
import { ANCHOR_PUB } from "../vendor/hodl/core/anchor.ts";
import { keysFromSeed, receiveAll, submitLink, tip, toRaw, fromRaw, waitForReceivable, XNO } from "../core/wallet.ts";

loadEnv();

const argv = process.argv.slice(2);
const arg = (name: string, dflt: string): string => {
  const i = argv.indexOf("--" + name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : dflt;
};
const flag = (name: string) => argv.includes("--" + name);

const DECIMALS = 6;
// Any symbol: holderPay is not a one-token app. `--env-key STUDENT` writes
// STUDENT_TOKEN_ID / STUDENT_LAUNCH_HASH instead of the TEACHER pair, so a
// second launch does not overwrite the first.
const SYMBOL = arg("symbol", "TEACHER").toUpperCase();
const NAME = arg("name", SYMBOL.charAt(0) + SYMBOL.slice(1).toLowerCase());
const ENV_KEY = arg("env-key", SYMBOL).toUpperCase().replace(/[^A-Z0-9_]/g, "_");

const wholeSupply = BigInt(arg("supply", "1000000")); // 1,000,000 TEACHER
const seedTokensWhole = BigInt(arg("seed-tokens", "100000")); // into the curve
const seedXnoStr = arg("seed-xno", "0.01"); // VIRTUAL reserve: claims no real XNO

const supply = wholeSupply * 10n ** BigInt(DECIMALS);
const seedTokens = seedTokensWhole * 10n ** BigInt(DECIMALS);
const seedXno = toRaw(seedXnoStr, 30);

const creator = keysFromSeed(env("CREATOR_SEED"));
const anchor = env("HOLDERPAY_ANCHOR_ADDRESS");

function say(...a: unknown[]) {
  console.log(...a);
}

async function main() {
  say(`creator   ${creator.address}`);

  const got = await receiveAll(nodeRpc, creator);
  if (got.count) say(`received  ${got.count} block(s), balance now ${fromRaw(got.balance, 30)} XNO`);

  const t = await tip(nodeRpc, creator.address);
  if (!t.frontier) throw new Error(`creator wallet is unopened -- fund ${creator.address} first`);
  say(`balance   ${fromRaw(t.balance, 30)} XNO`);
  // launch (1) + two hellos (2) + the seed fragment pair (2), plus headroom for
  // the e2e payments that follow.
  if (t.balance < 100n) throw new Error("creator balance is too small to write blocks");

  // Hellos make the creator discoverable from chain data alone -- to hodlgame's
  // indexer (so TEACHER shows up on hodlgame.fun) and to holderPay's own
  // verifier watch set. Best-effort: a failed hello costs discoverability, never
  // correctness, because replay validates every op on its own merits.
  for (const [label, target] of [["hodlgame", ANCHOR_PUB], ["holderPay", anchor]] as const) {
    if (!target) continue;
    try {
      const pub = /^[0-9a-fA-F]{64}$/.test(target) ? target : nanocurrency.derivePublicKey(target);
      const h = await submitLink(nodeRpc, creator, pub, 1n);
      say(`hello     ${label} anchor -> ${h.slice(0, 12)}...`);
    } catch (e: any) {
      say(`hello     ${label} anchor FAILED (${e.message}) -- continuing`);
    }
  }

  // ── launch ────────────────────────────────────────────────────────────────
  // The launch link carries supply + decimals (consensus-bound) and opcode
  // 0x0b, which marks the token zero-custody. Name and symbol are off-chain
  // display metadata; holderPay pins them locally and never lets them decide
  // anything, so a registry outage cannot change what a payment means.
  const launchLink = encodeOpLink("", {
    kind: "launch",
    supply,
    name: NAME,
    symbol: SYMBOL,
    decimals: DECIMALS,
    image: "",
    direct: true,
  });
  const launchHash = await submitLink(nodeRpc, creator, launchLink, 1n);
  const tokenId = tokenIdFromLaunchHash(launchHash);
  say(`launch    ${launchHash}`);
  say(`tokenId   ${tokenId}`);
  say(`supply    ${fromRaw(supply, DECIMALS)} ${SYMBOL} (creator keeps 5% = ${fromRaw(supply / 20n, DECIMALS)})`);

  // ── seed the curve ────────────────────────────────────────────────────────
  // A Direct-Settlement seed is a pure price-curve declaration: the XNO side is
  // virtual and claims no real money, and the token side comes out of the 95%
  // treasury. It costs 2 raw.
  const [fa, fb] = encodeFragLinks(tokenId, { kind: "seedLiq", xno: seedXno, tokens: seedTokens });
  await submitLink(nodeRpc, creator, fa, 1n);
  const seedHash = await submitLink(nodeRpc, creator, fb, 1n);
  say(`seed      ${fromRaw(seedXno, 30)} XNO (virtual) against ${fromRaw(seedTokens, DECIMALS)} ${SYMBOL}`);
  say(`          -> ${seedHash}`);
  const pricePerToken = (seedXno * 10n ** BigInt(DECIMALS)) / seedTokens;
  say(`price     ~${fromRaw(pricePerToken, 30)} XNO per ${SYMBOL}`);

  // ── persist ───────────────────────────────────────────────────────────────
  let envText = fs.readFileSync(".env", "utf-8");
  const idKey = `${ENV_KEY}_TOKEN_ID`;
  const hashKey = `${ENV_KEY}_LAUNCH_HASH`;
  const upsert = (text: string, key: string, value: string) =>
    new RegExp(`^${key}=.*$`, "m").test(text)
      ? text.replace(new RegExp(`^${key}=.*$`, "m"), `${key}=${value}`)
      : `${text.replace(/\n*$/, "")}\n${key}=${value}\n`;
  envText = upsert(envText, idKey, tokenId);
  envText = upsert(envText, hashKey, launchHash);
  fs.writeFileSync(".env", envText);
  say(`\nwrote ${idKey} to .env`);

  if (flag("publish")) await publishMeta(tokenId);

  say(`\nexplorer  https://www.hodlgame.fun/t/${tokenId}`);
}

/**
 * Optional: register display metadata with hodlgame.fun so TEACHER shows a name
 * and image there. Signed by the launch key, so only the creator can write it.
 * holderPay never reads this back -- it is courtesy to the other explorer.
 */
async function publishMeta(tokenId: string) {
  try {
    const { metaSignDigest, metaFieldsHash } = await import("../vendor/hodl/core/metaAuth.ts");
    const meta = {
      name: NAME,
      symbol: SYMBOL,
      decimals: DECIMALS,
      image: "https://www.hodlgame.fun/icon.svg",
      description: "Access token for holderPay demo checkouts.",
    };
    const seq = Date.now();
    const digest = metaSignDigest(tokenId, seq, "update", metaFieldsHash(meta as any));
    const signature = nanocurrency.signBlock({ hash: digest, secretKey: creator.secretKey });
    const res = await fetch("https://www.hodlgame.fun/api/tokens", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tokenId, ...meta, account: creator.address, signature, seq, action: "update" }),
    });
    say(`meta      hodlgame.fun -> ${res.status} ${(await res.text()).slice(0, 200)}`);
  } catch (e: any) {
    say(`meta      publish skipped (${e.message})`);
  }
}

await main();
