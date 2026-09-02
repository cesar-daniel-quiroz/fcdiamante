# Bridge worker

Turns **Mi Aplicación** prompts (stored in Supabase) into real commits + deploys
on this repo, using the Claude Code CLI.

## How it works

1. The admin sends a prompt from the app → a `pendiente` row in `app_requests`.
2. This worker, while running, picks up the oldest `pendiente` row, records the
   current commit as the rollback target, and runs the prompt through
   `claude -p … --dangerously-skip-permissions` against the repo.
3. It runs `npm run build` to verify. If the build fails, changes are discarded
   and the row is marked `error` (nothing is committed or deployed).
4. On success it commits, runs the deploy command (default `git push`), and marks
   the row `completado` with the new commit SHA + summary.
5. "Volver al estado anterior" in the app queues a `revert` row; the worker
   restores the tree to that request's base commit and deploys.

A prompt sent while the worker is **off** simply stays `pendiente` and is picked
up when you start it again.

## Run

```bash
cd bridge
npm install
cp .env.example .env          # add SUPABASE_SERVICE_ROLE_KEY
npm start                     # long-running
# npm run once                # process a single request and exit
```

## Security note

The worker runs prompts unattended with permissions skipped, on your own repo.
Every change is a normal git commit and is revertible from the app. Only run it
for prompts you trust (it's gated to admins + the superadmin access window), and
keep `bridge/.env` (the service_role key) private.
