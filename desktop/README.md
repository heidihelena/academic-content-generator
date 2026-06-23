# forskAI — desktop app

Runs the whole content calendar locally in a native window you open from an
icon (like Claude Desktop). No browser, no config files, no terminal once it's
installed.

## How it works

```
┌─ Electron window ──────────────┐
│  the content-calendar UI       │  ← built frontend (content-calendar/dist)
│            ↕ http://127.0.0.1  │
│  embedded NestJS server        │  ← server/dist, started as a child process
│            ↕                   │
│  your data: ~/…/forskAI/       │  ← JSON store + uploads, on YOUR machine only
└────────────────────────────────┘
```

- **Local & private.** Posts, connected accounts and OAuth tokens are saved in
  the per-user app folder (`app.getPath('userData')`), never in the repo. The
  tool is safe to share — it ships with no one's logins.
- **No native modules.** The server uses the `file` persistence driver (a single
  JSON file), so packaging needs no compile step and works on any machine.
- **Connecting accounts** happens inside the app: the "Connect" buttons drive the
  server's OAuth flow on `127.0.0.1`. (Real LinkedIn still needs its one-time
  developer-app registration — see `docs/PLATFORM_SETUP.md`.)

## Get the installable app (no dev setup needed)

The clickable installers are built in CI. In GitHub → **Actions → "Build desktop
app" → Run workflow**. When it finishes, download the artifact for your system:

- macOS → `forskai-macos-latest` → `.dmg`
- Windows → `forskai-windows-latest` → `.exe`
- Linux → `forskai-ubuntu-latest` → `.AppImage`

Open it, drag to Applications (macOS) or run the installer, and forskAI appears
as an app icon.

## Run it locally (for development)

```bash
# from the repo root, build the two halves first:
(cd server && npm ci && npm run build)
(cd content-calendar && npm ci && VITE_API_URL=http://127.0.0.1:47615/api npm run build)

# then launch the desktop shell:
cd desktop && npm ci && npm run dev
```

## Build installers on your own machine

```bash
cd desktop && npm run dist   # outputs to desktop/release/
```

> Note: each OS builds its own format. A macOS `.dmg` must be built on macOS,
> Windows `.exe` on Windows — which is why CI builds all three.
