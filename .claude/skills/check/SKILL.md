---
name: check
description: Run the full verification pipeline (typecheck, lint, test, build) for the server and content-calendar workspaces. Use to confirm the repo is green before committing or opening a PR. Optional arg `server` or `content-calendar` to check just one.
---

# /check — verify the repo is green

Run the verification pipeline via the repo's script:

```bash
bash scripts/check.sh           # both workspaces
bash scripts/check.sh server    # just the NestJS server
bash scripts/check.sh content-calendar   # just the React app
```

The script runs, per workspace: `npm run typecheck`, `npm run lint`,
`npm test`, `npm run build` (installing deps first if needed).

If the user passed an argument naming a workspace, pass it through. Otherwise
run both. Report the outcome concisely: which steps passed, and the first
failure (with the relevant output) if any step fails.
