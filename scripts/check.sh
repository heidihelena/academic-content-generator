#!/bin/bash
set -euo pipefail

# Runs the full verification pipeline (typecheck · lint · test · build) for both
# workspaces. Use before committing or opening a PR.
#
# Usage: bash scripts/check.sh [server|content-calendar]   (default: both)

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET="${1:-both}"

check_pkg() {
  local pkg="$1"
  echo ""
  echo "=================================================="
  echo "  $pkg"
  echo "=================================================="
  cd "$ROOT/$pkg"
  [ -d node_modules ] || npm install --no-audit --no-fund
  npm run typecheck
  npm run lint
  npm test
  npm run build
}

case "$TARGET" in
  server) check_pkg server ;;
  content-calendar|frontend) check_pkg content-calendar ;;
  both) check_pkg server; check_pkg content-calendar ;;
  *) echo "Unknown target: $TARGET (use: server | content-calendar | both)"; exit 1 ;;
esac

echo ""
echo "✅ All checks passed."
