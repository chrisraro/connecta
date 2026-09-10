#!/usr/bin/env node
/**
 * Launcher for the Supabase MCP server.
 *
 * WHY THIS EXISTS
 * ---------------
 * .mcp.json is committed and this repository is public, so the access token
 * can never live in it. The obvious alternative — a machine-wide
 * SUPABASE_ACCESS_TOKEN environment variable — solves the "not in git"
 * problem by creating a different one: every process the user runs can read
 * it, including tooling for unrelated projects.
 *
 * This launcher keeps the token in ONE gitignored file inside this project
 * (.mcp.env) and injects it into the server process alone. Nothing else on
 * the machine sees it, and nothing reaches the index.
 *
 * The token is passed through the environment, never as a CLI argument:
 * arguments are visible to anyone who can list processes.
 *
 * SCOPE
 * -----
 * Containment is layered, and neither layer is trusted alone:
 *   - the token itself should be a SCOPED personal access token, limited to
 *     this project ref and to the permissions listed in .mcp.env.example;
 *   - --project-ref confines the server to one project and disables the
 *     account-management tools (list_projects, organizations, billing);
 *   - --read-only blocks writes until the migration actually begins.
 */

import { spawn } from "node:child_process";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const envPath = join(repoRoot, ".mcp.env");

const SERVER = "@supabase/mcp-server-supabase@0.12.0";
const PROJECT_REF = "szfkysqinjowmgdzonje";

if (!existsSync(envPath)) {
  console.error(
    `[supabase-mcp] Missing ${envPath}\n` +
      `Copy .mcp.env.example to .mcp.env and put a SCOPED access token in it.\n` +
      `.mcp.env is gitignored — never commit it, and never set the token as a\n` +
      `machine-wide environment variable.`,
  );
  process.exit(1);
}

// Minimal KEY=VALUE parser. Deliberately not a dotenv dependency: this runs
// before anything else and handling one line of one file does not justify
// pulling a package into the trust path of a credential.
const fileEnv = {};
for (const rawLine of readFileSync(envPath, "utf8").split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const eq = line.indexOf("=");
  if (eq === -1) continue;
  const key = line.slice(0, eq).trim();
  let value = line.slice(eq + 1).trim();
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    value = value.slice(1, -1);
  }
  fileEnv[key] = value;
}

const token = fileEnv.SUPABASE_ACCESS_TOKEN;
if (!token || token.startsWith("sbp_your_")) {
  console.error(
    `[supabase-mcp] SUPABASE_ACCESS_TOKEN is not set in ${envPath}.\n` +
      `Create a scoped token at https://supabase.com/dashboard/account/tokens`,
  );
  process.exit(1);
}

// The file's value WINS over any inherited variable of the same name. If a
// stale machine-wide token is still set, the project-local one must be what
// takes effect — otherwise this launcher would silently authenticate as
// whatever the machine happens to be carrying.
const childEnv = { ...process.env, ...fileEnv };

const args = ["/c", "npx", "-y", SERVER, "--read-only", `--project-ref=${PROJECT_REF}`];
const child = spawn("cmd", args, { stdio: "inherit", env: childEnv });

child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
child.on("error", (err) => {
  console.error(`[supabase-mcp] failed to start the server: ${err.message}`);
  process.exit(1);
});
