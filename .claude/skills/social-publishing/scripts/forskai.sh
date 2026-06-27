#!/usr/bin/env bash
#
# Thin, deterministic wrapper over the local forskai API for the social-publishing
# skill. It only calls forskai's own API — never a third-party endpoint. It prints
# the API's JSON response for the agent to read; it does NOT decide whether a
# variant is publishable (the server enforces the review gate on publish).
#
# Config (env):
#   FORSKAI_API    API base URL. Default http://localhost:3000/api
#                  (the desktop app serves http://127.0.0.1:47615/api)
#   FORSKAI_TOKEN  Bearer token, only if the backend has auth enabled.
#
# Usage: forskai.sh <subcommand> [args]
#   connections                       secret-safe provider + social status
#   accounts                          connected social accounts
#   items                             list content items
#   variants <itemId>                 variants under an item
#   variant <variantId>               one variant (incl. safetyReview, humanReviewedAt)
#   blockers <variantId>              alias of `variant` — inspect why it can't export
#   publish <variantId>               publish/export (server enforces the review gate)
#   record <variantId> <url> [notes]  record a manual publish to the publish-log

set -euo pipefail

API="${FORSKAI_API:-http://localhost:3000/api}"

# Assemble auth header only when a token is set.
auth_args=()
if [ -n "${FORSKAI_TOKEN:-}" ]; then
  auth_args=(-H "Authorization: Bearer ${FORSKAI_TOKEN}")
fi

req() {
  # req METHOD PATH [json-body]
  local method="$1" path="$2" body="${3:-}"
  if [ -n "$body" ]; then
    curl -fsS -X "$method" "${API}${path}" \
      -H 'content-type: application/json' "${auth_args[@]}" -d "$body"
  else
    curl -fsS -X "$method" "${API}${path}" "${auth_args[@]}"
  fi
}

json_string() {
  # Minimal JSON string escaper for the few values we inject (url, notes).
  printf '%s' "$1" | sed 's/\\/\\\\/g; s/"/\\"/g'
}

cmd="${1:-}"
case "$cmd" in
  connections) req GET "/connections" ;;
  accounts)    req GET "/accounts" ;;
  items)       req GET "/content-items" ;;
  variants)    req GET "/content-items/${2:?usage: variants <itemId>}/variants" ;;
  variant|blockers)
               req GET "/content-variants/${2:?usage: variant <variantId>}" ;;
  publish)
    # The server returns 400 unless the variant is safety-cleared AND
    # human-reviewed. Only call this AFTER explicit human approval.
    req POST "/content-variants/${2:?usage: publish <variantId>}/publish"
    ;;
  record)
    vid="${2:?usage: record <variantId> <url> [notes]}"
    url="${3:?usage: record <variantId> <url> [notes]}"
    notes="${4:-}"
    body="{\"publishedUrl\":\"$(json_string "$url")\""
    [ -n "$notes" ] && body="${body},\"notes\":\"$(json_string "$notes")\""
    body="${body}}"
    req POST "/content-variants/${vid}/publish-log" "$body"
    ;;
  ""|-h|--help|help)
    sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'
    ;;
  *)
    echo "unknown subcommand: $cmd (try: forskai.sh help)" >&2
    exit 2
    ;;
esac
