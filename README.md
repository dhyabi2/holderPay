# holderPay

**One page. Pay with a Nano token — or with XNO, auto-swapped into the token —
and get access that nobody, including holderPay's own server, can grant without
the payment.**

Accepting a *specific token* on Nano is awkward today: Nano has no smart
contracts, so a token is a replay of signed blocks rather than a balance a
contract can check. holderPay makes that practical for checkout. It speaks the
[hodlgame](https://github.com/dhyabi2/hodlgame) token protocol (Apache-2.0,
vendored), so the token it accepts is a real token on a real AMM — and it
replays that ledger itself rather than trusting anyone's API for a balance.

```
buyer has TEACHER ──────────────────────────► merchant paid in TEACHER
buyer has only XNO ──► AMM swap in the ─────► merchant paid in TEACHER
                       buyer's own wallet
buyer has only XNO ─────────────────────────► merchant paid in XNO
                       (if the offer accepts it)
```

The demo token is **TEACHER**. The accepted token is configurable from the page
itself — any hodlgame token id, any price, any mix of lanes.

## The point

> Granting access is not an action the backend can take. It is an observation it
> can only report — and the buyer's browser re-derives the same observation from
> the public ledger, so a false report is visible.

A grant is two consecutive blocks on the buyer's own chain: the payment, and a
1-raw receipt whose `link` commits to the hash of the offer. Nano's own chain
rule welds them together; the buyer's own signature is the only thing that can
produce either. There is no signing key on the server, no session to mint, and
no "has paid" table — so there is nothing to tamper with.

The page proves this to you rather than asserting it: press **tamper test** and
the server will deliberately return a forged grant. The page catches it and
refuses.

That demo route is **off unless you switch it on**, because a route that returns
`granted: true` for a payment that never happened must not exist on a public
URL. Run it on localhost with `HOLDERPAY_ALLOW_FORGE=1` in your `.env`
(`.env.example` leaves it empty, so a fresh checkout has it off and the button
has nothing to catch). The server refuses to bind a public address at all while
the flag is set, and a Vercel deployment forces it off
(`server/vercel-env.ts`) — so on the hosted page the button returns the honest
verdict. What the page checks is not a demo switch: it re-derives every verdict
from the ledger on every payment, forged or not.

Full argument, including what is *not* claimed: **[docs/SECURITY.md](docs/SECURITY.md)**.

## Quick start

```bash
npm install
cp .env.example .env          # then put your rpc.nano.to key in it
npm run keys                  # generate creator / merchant / buyer wallets
# fund the CREATOR address with a little XNO, then:
npm run launch                # launch TEACHER and seed its price curve
npm run build:web
npm run dev                   # http://localhost:8787
```

Tests:

```bash
npm test                      # 48 offline tests: one per security claim
npm run e2e                   # the same attacks on mainnet, micro amounts
```

## How a payment works

**XNO lane.** Send the price to the merchant, then append a 1-raw block whose
`link` is `memoLink(policyId)`. Two blocks, feeless, sub-second.

**TEACHER lane.** A hodlgame `transfer` op rides two chained 1-raw "fragment"
blocks, so recipient and amount are fully on chain with no off-chain payload to
lose. The receipt chains onto the second one.

**Auto-swap lane.** The merchant wants the token; the buyer has XNO. The page
buys the exact amount on the AMM *inside the buyer's own wallet, with the
buyer's own signature*, then pays the merchant in the token. holderPay never
holds anyone's funds, and the verifier sees an ordinary token payment — the swap
leaves no special case in the verdict logic.

Because TEACHER is a zero-custody (Direct-Settlement) token there is no pool
account, so a buy takes one of two lanes: if a seller is queued the XNO goes
*straight to their wallet*; if nobody is owed, nothing moves at all and the XNO
stays in the buyer's wallet as earmarked collateral. `core/swap.ts` picks the
lane and quotes it exactly as the replay will.

## Chain access

**Strict rule, set by the owner: `https://rpc.nano.to` is the only RPC service
this project calls**, plus the same provider's websocket `wss://ws.nano.to`. No
other node, proxy, or work service, and no fallback endpoint
([`core/rpc.ts`](core/rpc.ts)). The vendored indexer's own fallback is
repointed at nano.to by [a shim](vendor/hodl/lib/rpc.ts).

**Proof of work follows the same rule, with the key, always.** Every
`work_generate` goes to rpc.nano.to authenticated; there is no local generator
and no WASM fallback. A nonce is validated against the threshold here and a bad
one is retried against the same keyed endpoint, but nothing is ever computed on
this machine — without a key, or without an answer, the operation fails loudly
rather than quietly burning CPU that a public deployment cannot spare.

That is safe because **every block is re-verified locally** — re-hashed and its
signature checked against the account the node attributes it to. A single
endpoint can omit data or stall; it cannot forge a block, an amount, or an
account.

The API key lives in `.env` and never reaches the browser: the page talks to
`/api/rpc`, which whitelists actions and adds the key server-side. The build
**fails** if any `.env` secret appears in the bundle
([`scripts/build-web.mjs`](scripts/build-web.mjs)).

**The websocket does the waiting.** Nano's websocket is a subscription protocol,
not a second RPC transport, so holderPay uses it for exactly what it is good at:
being told the instant a block involving a watched account confirms, instead of
asking on a timer. Reads and broadcasts stay on the RPC. A confirmation is only
ever a nudge to re-read — nothing is decided from it
([`server/watch.ts`](server/watch.ts), and the page's own socket in
[`web/app.ts`](web/app.ts)).

## Layout

```
core/            the trust model — all of it
  policy.ts      an offer, frozen into a hash
  proof.ts       the receipt binding + the challenge signature
  verify.ts      THE VERDICT. pure, no secrets, ~200 lines
  block.ts       block types; amounts from signed balances
  chain.ts       locally-verified reads (server)
  fold.ts        token replay, shared by server and browser
  ledger.ts      server wiring + cache for the fold
  reader.ts      the server's ChainReader
  swap.ts        AMM quote + the two buy lanes + token payment
  wallet.ts      block building and broadcasting (both runtimes)
  rpc.ts         rpc.nano.to, and nothing else
server/          http: static, /api/rpc proxy, verify, access, catalog
web/             the single page + its independent verifier
scripts/         keys, launch, e2e, funding watcher, web build
vendor/hodl/     hodlgame core + indexer (Apache-2.0, see LICENSE there)
docs/SECURITY.md the argument, and the limits
```

## API

| Route | What it does |
|---|---|
| `GET /api/config` | public config: websocket url, token id, merchant. Never the key. |
| `POST /api/rpc` | whitelisted proxy to rpc.nano.to |
| `GET /api/policies` · `POST /api/policies` | list / publish offers |
| `GET /api/token` | token state from holderPay's own replay |
| `GET /api/quote` | swap plan for a given token amount |
| `GET /api/challenge` | a nonce to sign |
| `POST /api/verify` | the verdict. `?forge=1` lies on purpose, for the demo |
| `POST /api/access` | verdict + proof of account control, then the goods |
| `GET /api/watch` · `POST /api/watch` | websocket subscription status |

## Credit

The token ledger, op encoding, AMM, and replay engine are
[hodlgame](https://github.com/dhyabi2/hodlgame)'s, vendored under
`vendor/hodl/` with its Apache-2.0 licence. holderPay adds the payment binding,
the verdict, the independent browser verifier, and the checkout page.
