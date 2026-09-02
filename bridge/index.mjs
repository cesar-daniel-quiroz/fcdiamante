// Academia bridge worker
// -----------------------
// Polls the Supabase `app_requests` queue and turns each 'pendiente' prompt into
// real work on this repo: it runs the prompt through the Claude Code CLI, verifies
// the build, commits, deploys, and writes the outcome (plus a rollback target)
// back to the app. Runs only while this machine is on — that is by design: a
// prompt sent while the bridge is off stays 'pendiente' until it comes back up.
//
// Setup:
//   cd bridge && npm install
//   cp .env.example .env    # fill SUPABASE_SERVICE_ROLE_KEY (Dashboard → API)
//   npm start               # long-running; or `npm run once` for a single pass
//
// Requires the `claude` CLI to be installed and authenticated (you already have
// it via Claude Code).

import { createClient } from "@supabase/supabase-js";
import { execSync, execFileSync } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, ".."); // the app repo (parent of bridge/)

// --- config from bridge/.env (simple parser, no dependency) ---
function loadEnv() {
  const f = join(HERE, ".env");
  if (!existsSync(f)) return;
  for (const line of readFileSync(f, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}
loadEnv();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const DEPLOY_CMD = process.env.DEPLOY_CMD || "git push";
const DEPLOY_URL = process.env.DEPLOY_URL || null;
const POLL_MS = Number(process.env.POLL_MS || 15000);
const ONCE = process.argv.includes("--once");

if (!SUPABASE_URL || !SERVICE_ROLE) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in bridge/.env");
  process.exit(1);
}

const db = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const sh = (cmd, opts = {}) =>
  execSync(cmd, { cwd: REPO, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"], ...opts }).trim();
const headSha = () => sh("git rev-parse HEAD");

async function update(id, patch) {
  await db.from("app_requests").update(patch).eq("id", id);
}

// Run one prompt through the Claude Code CLI in unattended mode.
function runClaude(prompt) {
  // --dangerously-skip-permissions: the bridge is intentional automation on your
  // own repo. Everything it does is a commit you can revert from the app.
  const out = execFileSync(
    "claude",
    ["-p", prompt, "--dangerously-skip-permissions"],
    { cwd: REPO, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 },
  );
  return out.trim();
}

async function processPrompt(req) {
  const base = headSha();
  await update(req.id, { status: "en_progreso", started_at: new Date().toISOString(), base_sha: base });
  console.log(`▶ ${req.id} — ${req.prompt.slice(0, 60)}`);

  let summary = "";
  try {
    summary = runClaude(req.prompt);
  } catch (e) {
    await update(req.id, {
      status: "error",
      finished_at: new Date().toISOString(),
      error: "Claude falló: " + String(e.stderr || e.message).slice(0, 500),
    });
    return;
  }

  // Verify the app still builds before committing/deploying.
  try {
    sh("npm run build", { stdio: ["ignore", "pipe", "pipe"] });
  } catch (e) {
    // Roll the working tree back to the pre-work state so a broken change is
    // never committed or deployed.
    try { sh("git reset --hard " + base); sh("git clean -fd"); } catch { /* ignore */ }
    await update(req.id, {
      status: "error",
      finished_at: new Date().toISOString(),
      result_summary: summary.slice(0, 800),
      error: "La compilación falló; los cambios se descartaron. " + String(e.stdout || e.message).slice(0, 400),
    });
    return;
  }

  // Nothing changed? Mark complete without an empty commit.
  const dirty = sh("git status --porcelain");
  if (!dirty) {
    await update(req.id, {
      status: "completado",
      finished_at: new Date().toISOString(),
      result_sha: base,
      result_summary: (summary || "Sin cambios en el código.").slice(0, 800),
      deploy_url: DEPLOY_URL,
    });
    return;
  }

  sh("git add -A");
  sh(`git -c user.name="Academia Bridge" -c user.email="bridge@fcdiamante.app" commit -m ${JSON.stringify(
    "app-request " + req.id + ": " + req.prompt.slice(0, 60),
  )}`);
  const result = headSha();

  let deployErr = null;
  try { sh(DEPLOY_CMD); } catch (e) { deployErr = String(e.stdout || e.message).slice(0, 300); }

  await update(req.id, {
    status: "completado",
    finished_at: new Date().toISOString(),
    result_sha: result,
    result_summary: summary.slice(0, 800),
    deploy_url: DEPLOY_URL,
    error: deployErr ? "Desplegado localmente; push/deploy falló: " + deployErr : null,
  });
  console.log(`✓ ${req.id} → ${result.slice(0, 7)}`);
}

async function processRevert(req) {
  // Restore the tree to the state before the referenced request was applied.
  const { data: target } = await db
    .from("app_requests")
    .select("*")
    .eq("id", req.revert_of)
    .maybeSingle();
  const base = target?.base_sha;
  await update(req.id, { status: "en_progreso", started_at: new Date().toISOString() });

  if (!base) {
    await update(req.id, { status: "error", finished_at: new Date().toISOString(), error: "No se encontró el estado base a restaurar." });
    return;
  }
  try {
    // Non-destructive: snapshot the old tree as a new commit.
    sh(`git checkout ${base} -- .`);
    sh("git add -A");
    const dirty = sh("git status --porcelain");
    if (dirty) {
      sh(`git -c user.name="Academia Bridge" -c user.email="bridge@fcdiamante.app" commit -m ${JSON.stringify(
        "revert to " + base.slice(0, 7) + " (request " + req.id + ")",
      )}`);
    }
    const result = headSha();
    let deployErr = null;
    try { sh(DEPLOY_CMD); } catch (e) { deployErr = String(e.stdout || e.message).slice(0, 300); }
    await update(req.id, {
      status: "completado",
      finished_at: new Date().toISOString(),
      result_sha: result,
      result_summary: "Restaurado al estado " + base.slice(0, 7),
      deploy_url: DEPLOY_URL,
      error: deployErr,
    });
    if (target) await update(target.id, { status: "revertido" });
  } catch (e) {
    await update(req.id, { status: "error", finished_at: new Date().toISOString(), error: String(e.message).slice(0, 400) });
  }
}

async function tick() {
  const { data, error } = await db
    .from("app_requests")
    .select("*")
    .eq("status", "pendiente")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) { console.error("poll error:", error.message); return; }
  const req = data?.[0];
  if (!req) return;
  if (req.kind === "revert") await processRevert(req);
  else await processPrompt(req);
}

console.log(`Academia bridge on ${REPO}\nPolling every ${POLL_MS}ms${ONCE ? " (single pass)" : ""}…`);
if (ONCE) {
  await tick();
  process.exit(0);
} else {
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try { await tick(); } catch (e) { console.error(e); }
    await new Promise((r) => setTimeout(r, POLL_MS));
  }
}
