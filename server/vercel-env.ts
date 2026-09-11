// Settings forced before anything else loads.
//
// server/index.ts reads its configuration into module-level constants the moment
// it is imported, so anything that must be true of a deployment has to be true
// BEFORE that import. ES modules evaluate in import order, which is why this is
// a separate module imported first by server/vercel-entry.ts rather than a few
// assignments next to it -- assignments there would run after the import they
// were meant to influence, and silently do nothing.
//
// These are forced, not defaulted. A deployment cannot be talked into dev mode
// by a stray environment variable in a dashboard.

// The two demo switches. HOLDERPAY_DEV opens the catalog to the world, and the
// forge route returns a GRANTED verdict for a payment that never happened; both
// are teaching tools for localhost and neither may exist on a public URL.
process.env.HOLDERPAY_DEV = "0";
process.env.HOLDERPAY_ALLOW_FORGE = "0";

// Serverless invocations are public by definition, which is what this flag means
// to the rest of the server: it decides HSTS. There is no socket to bind here.
process.env.HOST = "0.0.0.0";

// A request that waits for a work slot must finish INSIDE the platform's own
// invocation ceiling (60s on Vercel's default plan). Held past that, the
// platform kills it and the caller gets a timeout instead of either a nonce or
// an honest "come back in a minute" -- strictly the worst of the three.
process.env.WORK_MAX_WAIT_MS ??= "25000";

// Every instance must agree on which challenges it issued, and instances here
// are created and destroyed per request. Without a shared secret each one would
// mint challenges no other could validate, so a payer's /api/access would fail
// whenever it landed on a different invocation than /api/challenge did.
if (!process.env.CHALLENGE_SECRET) {
  console.error(
    "CHALLENGE_SECRET is not set: this deployment will reject challenges issued by its own other instances. Set it in the project's environment variables."
  );
}
