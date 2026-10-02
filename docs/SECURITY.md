# holderPay — why the backend cannot grant access

The problem with every "pay to unlock" page is the same: the payment is real, but
the *unlock* is a boolean in somebody's database. Compromise the server, bribe an
admin, exploit one missing check, and access flows without payment. Paying on a
blockchain does not fix this by itself — it just moves the forgeable part from
the payment to the grant.

holderPay's claim is narrow and checkable:

> **Granting access is not an action holderPay's server can take. It is an
> observation it can only report — and the buyer's own browser re-derives the
> same observation from the public ledger, so a false report is visible.**

This document is the argument for that, and points at the code and the tests.

---

## 1. What a grant is made of

Two consecutive blocks on the buyer's own Nano account chain.

```
          ┌─────────────────────────────┐
 block N  │ PAYMENT                     │   XNO send to the merchant,
          │ link = merchant's pubkey    │   or the last block of a TEACHER
          │ balance = prev − price      │   transfer fragment pair
          └──────────────┬──────────────┘
                         │  previous
          ┌──────────────▼──────────────┐
 block N+1│ RECEIPT                     │   1-raw data block
          │ link = memoLink(policyId)   │   "the payment above is for this offer"
          └─────────────────────────────┘
```

Both blocks are signed with the buyer's Ed25519-blake2b key. That is the entire
construction. There is no token to issue, no session to mint, no row to write.

`memoLink` is in [`core/proof.ts`](../core/proof.ts); the verdict that reads this
shape is [`core/verify.ts`](../core/verify.ts).

## 2. Why each property holds

### The terms cannot be restated afterwards

A **policy** is the merchant's whole offer — merchant address, resource, price in
each accepted asset, expiry, and the display text — and its `id` is the
blake2b-256 of its canonical JSON ([`core/policy.ts`](../core/policy.ts)). The
receipt's `link` commits to that id.

So "you paid 0.00001 XNO but the price was 1 XNO" is not a claim anyone can make
after the fact: a different price is a different document, a different hash, and
therefore a receipt that does not match. `verifyPayment` re-derives the id from
the contents it was handed and refuses outright if they disagree — which also
means a policy tampered with *in transit* fails rather than applies.

Tests: *"editing the price after the fact breaks the policy id"*,
*"a payment for ANOTHER policy cannot be re-pointed at this one"*.

### The value cannot be invented

The amount is never read from a field a node reports. It is derived from the
**signed balances** of the payment block and its predecessor
(`sentAmount`, [`core/block.ts`](../core/block.ts)) — both of which are covered
by the buyer's signature. And every block fetched from the RPC is re-hashed and
its signature re-checked locally before it is used at all
(`verifyFetchedBlock`, vendored from hodlgame). An endpoint can therefore
*withhold* data — which makes verification fail — but it cannot forge an amount,
a destination, or an account.

### One payment backs exactly one grant

`previous` names exactly one block, and Nano's consensus rejects forks. So two
receipts can never point at the same payment. The only way to write a second
receipt is to chain it onto the first — whose own `link` is a memo marker, not a
send to the merchant, so it fails the amount check.

This is why holderPay needs no server-side "spent receipts" table. Double-spend
prevention is the ledger's, not ours.

Test: *"one payment backs one receipt: a second receipt has a different
previous"*.

### The server has nothing to forge with

Look for a signing key in the server. There is none — `server/index.ts` imports
no secret except the RPC API key, which only buys read access to a public ledger.
The only durable state is [`server/catalog.ts`](../server/catalog.ts), which
holds offers and the content to hand over. Delete it and you lose the shop
listing; you cannot revoke a single grant, because grants do not live there.

To fabricate one, an attacker who owns the server completely would still need a
confirmed Nano block signed by the buyer's key. That is not a holderPay
vulnerability; it is breaking Nano.

### Knowing a receipt hash is not owning it

Receipt hashes are public. So access additionally requires a signature, by the
**paying account's key**, over a domain-separated digest of
(policy id, receipt hash, a fresh server challenge) — `authDigest` in
[`core/proof.ts`](../core/proof.ts). A bystander who reads the ledger cannot
produce it; a captured signature does not open a second session, because the
challenge is different.

Test: *"the payer can answer a challenge; nobody else can"*.

### Token payments are replayed, not taken on trust

A TEACHER payment is valid only if the transfer actually applied in the token's
deterministic replay — the buyer must really have held the tokens. holderPay
replays the ledger itself ([`core/fold.ts`](../core/fold.ts)) instead of asking
hodlgame.fun's API, because a verifier that trusts a third party for the balance
has simply moved the forgeable part somewhere else.

A verifier that *cannot* replay refuses token payments rather than assuming them
valid, and an op that is absent from the fold is treated as unproven, never as
fine. Silence is never evidence.

Tests: *"a token transfer that did not apply in replay denies"*, *"a verifier
that cannot replay refuses token payments instead of guessing"*.

## 3. The part that makes it checkable rather than merely true

Everything above would still be a promise if you had to take the server's word
for the verdict. So the page doesn't.

[`web/verifier.ts`](../web/verifier.ts) runs **the same `core/verify.ts`** in the
buyer's browser: it re-fetches the blocks, re-checks the signatures, replays the
token ledger, and compares its own verdict with the server's field by field. If
the server claims a grant the ledger does not support, the page says so in red
and refuses it locally.

You can watch this happen on localhost. The **tamper test** button calls
`POST /api/verify?forge=1`, a route that deliberately returns
`granted: true` for a receipt that does not verify:

```
the server claimed a grant the ledger does not support — refused
```

The route only exists when `HOLDERPAY_ALLOW_FORGE=1` (or `HOLDERPAY_DEV=1`) is
set, and `.env.example` leaves both empty: a route that grants access for a
payment that never happened is a teaching tool, not something to leave reachable.
`refusePublicIfUnsafe()` (`server/index.ts:215`) exits rather than bind a public
address while either flag is set, and `server/vercel-env.ts` forces both to `0`
before the server is imported, so the hosted page cannot reach it. Without the
flag the query parameter is ignored and `/api/verify` answers with the honest
verdict, which the page then agrees with — nothing is refused, because nothing
was forged.

None of that is what the claim rests on. The page's own verdict is derived from
the ledger on every single payment, with or without the flag; the forge route
only lets you watch it disagree on demand.

A real attacker would not add a query parameter — they would patch the handler.
The page's independent check catches both identically, which is the whole point
of shipping it.

## 4. What is NOT claimed

Being straight about the edges, because a security document that only lists wins
is marketing.

1. **Watch-set completeness.** holderPay's token replay watches the creator, the
   merchant, the buyer, and everyone who greeted its discovery anchor. An account
   that traded TEACHER without ever touching any of those is invisible to the
   fold, so this verifier's balances can lag a wider indexer's. The direction is
   safe — a missing buy makes a payer look *poorer*, so it can make a real
   payment fail, never a fake one pass — but it is a real limitation. `WATCH_EXTRA`
   in `.env` exists to close it.

2. **Liveness depends on one endpoint.** By the owner's rule, rpc.nano.to is the
   only service holderPay may call. If it is down, holderPay is down. It cannot
   lie to us (every block is verified locally), but it can refuse to answer.

3. **Confirmation is the node's word.** `confirmed` is not signature-covered.
   holderPay requires it before granting, so a node that falsely reports
   confirmation could cause a premature grant on a payment that later never
   confirms. The exposure is bounded by the fact that the receipt block is itself
   a successor to the payment — a Nano send with a confirmed successor on the
   same chain is not getting reversed.

4. **The browser cross-check is advisory to the *content* server.** The page
   refuses a forged grant locally, which protects the buyer from being misled and
   makes tampering visible. If the operator's own content server chooses to serve
   the goods anyway, that is the operator giving away their own product — there
   is no victim to protect.

5. **Burner wallet hygiene.** The demo wallet lives in `localStorage` and the PoC
   seeds live in `.env`. That is appropriate for micro-amount testing and
   completely inappropriate for real money.

6. **Nano-level risks are inherited, not solved.** Key loss, a buyer paying from
   an exchange account they do not control the keys to (they could never answer
   the challenge), and the token economics of TEACHER itself are all out of
   scope here.

## 5. Where to look

| File | What it decides |
|---|---|
| [`core/verify.ts`](../core/verify.ts) | the verdict — the only thing that grants access |
| [`core/policy.ts`](../core/policy.ts) | what an offer is, and why its hash pins it |
| [`core/proof.ts`](../core/proof.ts) | the receipt binding and the challenge signature |
| [`core/block.ts`](../core/block.ts) | amounts derived from signed balances |
| [`core/fold.ts`](../core/fold.ts) | the token replay, shared by server and browser |
| [`web/verifier.ts`](../web/verifier.ts) | the browser's independent check |
| [`core/verify.test.ts`](../core/verify.test.ts) | one test per claim above |
| [`scripts/e2e.ts`](../scripts/e2e.ts) | the same attacks, on mainnet, for real |
