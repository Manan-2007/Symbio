#!/usr/bin/env bash
set -euo pipefail
cd -- "$(dirname -- "${BASH_SOURCE[0]}")"
if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Install a supported Node LTS release, then run this script again."
  exit 1
fi
exec node scripts/start.mjs "$@"
