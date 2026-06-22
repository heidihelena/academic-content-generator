# What Heidi actually wants (plain-language vision)

Captured 2026-06-22 so we pick up exactly here. This overrides the earlier
"web dashboard + server you configure by editing a `.env` file" assumption.

## The vision, in her words
- **A local desktop app**, opened from an **icon — like Claude Desktop.** Not a
  website, not "HTML", not a page you open in a browser.
- **Connecting accounts (OAuth) happens *inside the app, by clicking a button.***
  She logs into LinkedIn herself in a pop-up; the app stores the result. No
  copy-pasting codes into files.
- **No secrets in the shared code / GitHub.** She may share the tool with others,
  so nothing personal (tokens, passwords, client secrets) can live in the repo.
  Credentials stay **only on her own computer** (OS keychain / local app data).
- **It should be effortless.** Setting up accounts and hunting for websites and
  codes felt like "several hours" of work — that experience is the thing to
  eliminate, not repeat.

## What this means technically (for whoever builds it next)
- Package the existing app as a **desktop app** (Electron or Tauri) that runs the
  NestJS backend locally and shows the calendar UI in a native window with an
  app icon. No terminal, no editing `.env`.
- **In-app "Connect LinkedIn" button** → opens the provider's real login in a
  system/in-app browser → handles the OAuth callback on `localhost` → stores the
  token in the **OS keychain**, never in the repo.
- Replace `.env` editing with an in-app **Settings screen** for any keys.

## The one honest constraint (NOT tonight, and not "hours")
- LinkedIn still requires a **one-time developer-app registration** on their side
  before *any* tool may post on her behalf — this is LinkedIn's rule, not ours.
  In a desktop app this is done **once**, guided, in ~30 min — then it's just the
  "Connect" button forever after. We'll do that together on a fresh day.

## Status of the engine (already proven)
- The scheduling brain works: a scheduled post auto-published itself on time in a
  test run (to a safe mock destination). Only the nice desktop packaging + the
  one-time LinkedIn registration remain.
