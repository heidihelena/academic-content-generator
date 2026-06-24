#!/bin/bash
set -euo pipefail

# SessionStart hook for Claude Code on the web.
#
# Installs dependencies for both workspaces (the NestJS server and the React
# content-calendar app) so type-checks, tests, linters and builds run
# immediately — fresh web containers start with no node_modules. Web-only by
# default; local sessions manage their own deps.

if [ "${CLAUDE_CODE_REMOTE:-}" != "true" ]; then
  exit 0
fi

# Provided by the harness in real sessions; derive it from this script's path
# (repo-root = two levels up from .claude/hooks) when run standalone.
PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"

echo "[session-start] installing server dependencies…"
( cd "$PROJECT_DIR/server" && npm install --no-audit --no-fund )

echo "[session-start] installing content-calendar dependencies…"
( cd "$PROJECT_DIR/content-calendar" && npm install --no-audit --no-fund )

echo "[session-start] dependencies ready."
