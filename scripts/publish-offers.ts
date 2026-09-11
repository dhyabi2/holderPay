// Publish the demo offers into the catalog, so the pay page has something to
// show as soon as it loads.
//
//   node --experimental-strip-types scripts/publish-offers.ts
//
// Prices are deliberately tiny (0.00001 XNO / 1 TEACHER) so the whole demo can
// be exercised on mainnet for a fraction of a cent.

import { loadEnv, env } from "../core/env.ts";
import { toRaw, fromRaw } from "../core/wallet.ts";
import { memoLink } from "../core/proof.ts";
import * as catalog from "../server/catalog.ts";

loadEnv();

const MERCHANT = env("MERCHANT_ADDRESS");
const TOKEN_ID = env("TEACHER_TOKEN_ID");
const DECIMALS = 6;

if (!MERCHANT) throw new Error("MERCHANT_ADDRESS is not set");

const PRICE_1 = (1n * 10n ** BigInt(DECIMALS)).toString();
const accept = TOKEN_ID ? [{ tokenId: TOKEN_ID, symbol: "TEACHER", decimals: DECIMALS, price: PRICE_1 }] : [];

const offers = [
  {
    input: {
      merchant: MERCHANT,
      resource: "course/nano-101",
      title: "Nano 101 — the full course",
      description:
        "Pay in TEACHER, or pay in XNO and let the page swap it into TEACHER for the seller. Either way your access is proven by a block, not by our database.",
      accept,
      priceXno: toRaw("0.00001", 30).toString(),
      autoswap: true,
      expires: 0,
    },
    unlock:
      "Welcome to Nano 101.\n\n" +
      "Lesson 0: the reason you are reading this is not that a server decided you could. " +
      "It is that two blocks exist on your own account chain -- a payment, and a receipt " +
      "that commits to this exact offer -- and anyone can check them. Delete our database " +
      "and your access survives; compromise our server and it still cannot be handed to " +
      "someone who did not pay.",
  },
  {
    input: {
      merchant: MERCHANT,
      resource: "shop/any-token",
      title: "Pay with any token you hold",
      description:
        "Bring whatever token you have. What it is worth here is its share of REAL collateral -- the earmarked XNO behind it, which somebody had to actually hold -- not the price its own curve quotes. A token launched for three raw that claims to be worth a million cannot buy this, at any quantity.",
      accept,
      priceXno: toRaw("0.00001", 30).toString(),
      // How much REAL collateral must change hands.
      //
      // Chosen against live numbers, and the lesson is worth stating: a
      // collateral price has to be small next to a token's TOTAL backing, or
      // nobody can pay it. These demo tokens are backed by fractions of a
      // millionth of an XNO (TEACHER 1e-7, STUDENT 4e-7), so an earlier
      // 0.000001 XNO price here was unpayable with the entire supply of either
      // -- the offer would have looked open and accepted nothing. At 1e-9 XNO
      // a payer needs roughly a quarter of a percent of a token's circulating
      // supply, which is a real payment rather than an impossible one.
      //
      // It stays unpayable with a WORTHLESS token at any price: zero collateral
      // spread over any supply is zero.
      acceptAny: { priceXno: toRaw("0.000000001", 30).toString(), minBacking: "0" },
      autoswap: true,
      expires: 0,
    },
    unlock:
      "Paid with a token nobody listed in advance.\n\n" +
      "What made it acceptable was not its name, its picture, or the price its own AMM quotes -- " +
      "all three are free to invent. It was the collateral behind it: earmarked XNO that consensus " +
      "checks against the signed balance of a real wallet. That is why a token minted for three raw, " +
      "quoting a million XNO a unit, buys exactly nothing here.",
  },
  {
    input: {
      merchant: MERCHANT,
      resource: "seller/teacher-only",
      title: "TEACHER only — no XNO accepted",
      description:
        "This seller wants the token and nothing else. XNO payers are auto-swapped on the AMM inside their own wallet; the seller is paid in TEACHER.",
      accept,
      priceXno: undefined,
      autoswap: true,
      expires: 0,
    },
    unlock: "Paid in TEACHER. The seller never touched XNO, and you never had to source the token in advance.",
  },
];

for (const o of offers) {
  if (o.input.accept.length === 0 && !o.input.priceXno) {
    console.log(`skipped "${o.input.title}" -- no accepted asset (launch TEACHER first)`);
    continue;
  }
  const l = catalog.put(o.input as any, o.unlock);
  const bits = (l.policy.accept ?? []).map((a) => `${fromRaw(a.price, a.decimals)} ${a.symbol}`);
  if (l.policy.priceXno) bits.push(`${fromRaw(l.policy.priceXno, 30)} XNO`);
  console.log(`published  ${l.policy.title}`);
  console.log(`  policy   ${l.policy.id}`);
  console.log(`  price    ${bits.join(" or ")}`);
  console.log(`  receipt  ${memoLink(l.policy.id)}`);
  console.log(`  link     http://localhost:${env("PORT", "8787")}/?policy=${l.policy.id}\n`);
}
