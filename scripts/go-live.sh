#!/usr/bin/env bash
# Wait for the creator wallet to be funded, then run the whole live pipeline:
# launch TEACHER, seed its curve, publish the demo offers, and run the mainnet
# end-to-end test with micro amounts.
#
#   bash scripts/go-live.sh [timeoutSeconds]
#
# Safe to re-run: the launch step is the only irreversible one, and it is
# skipped if TEACHER_TOKEN_ID is already set in .env.

set -o pipefail
cd "$(dirname "$0")/.."

NODE="node --experimental-strip-types"
TIMEOUT="${1:-3000}"

say() { printf '\n===== %s =====\n' "$1"; }

say "waiting for funds (timeout ${TIMEOUT}s)"
$NODE scripts/await-funding.ts --timeout "$TIMEOUT"
status=$?
if [ $status -ne 0 ]; then
  echo "not funded yet (exit $status) — nothing was spent"
  exit $status
fi

if grep -q '^TEACHER_TOKEN_ID=.\+' .env; then
  say "TEACHER already launched — skipping launch"
else
  say "launching TEACHER"
  $NODE scripts/launch-token.ts --publish || exit 1
fi

say "publishing demo offers"
$NODE scripts/publish-offers.ts || exit 1

say "live end-to-end test"
$NODE scripts/e2e.ts
e2e=$?

say "done (e2e exit $e2e)"
exit $e2e
