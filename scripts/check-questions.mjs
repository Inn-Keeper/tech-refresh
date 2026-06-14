// Decisive runtime check for the tiered question bank.
//
// Uses the WEB app's own anon key + URL (apps/web/.env) and runs the exact
// REST query a flip-card fires, at every tier, for a sample tech. If the DB,
// RLS policy, and grant are correct, every tier prints a non-zero count — and
// the "not loading by tier" problem is then purely stale client cache.
//
//   node scripts/check-questions.mjs            # samples "TypeScript"
//   node scripts/check-questions.mjs "React"    # check a specific tech
//
// No deps; reads the env file directly so no secrets are printed.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", "apps", "web", ".env");

function readEnv(file) {
  const out = {};
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = /^\s*([\w.]+)\s*=\s*(.*)\s*$/.exec(line);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = readEnv(envPath);
const url = env.VITE_SUPABASE_URL;
const anon = env.VITE_SUPABASE_ANON_KEY;
if (!url || !anon) {
  console.error(`Missing VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY in ${envPath}`);
  process.exit(1);
}

const tech = process.argv[2] || "TypeScript";
const TIERS = ["easy", "mid", "high", "ultra"];

console.log(`Project: ${url}`);
console.log(`Querying questions for tech="${tech}" across tiers (anon key, RLS as the app sees it)\n`);

let anyEmpty = false;
for (const difficulty of TIERS) {
  const qs = new URLSearchParams({
    select: "id,prompt,difficulty",
    tech: `eq.${tech}`,
    difficulty: `eq.${difficulty}`,
    limit: "50",
  });
  const res = await fetch(`${url}/rest/v1/questions?${qs}`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  if (!res.ok) {
    console.log(`  ${difficulty.padEnd(6)} → HTTP ${res.status} ${res.statusText}: ${await res.text()}`);
    anyEmpty = true;
    continue;
  }
  const rows = await res.json();
  if (rows.length === 0) anyEmpty = true;
  const sample = rows[0] ? ` e.g. "${rows[0].prompt.slice(0, 60)}…"` : "";
  console.log(`  ${difficulty.padEnd(6)} → ${rows.length} rows${sample}`);
}

console.log(
  anyEmpty
    ? "\n⚠️  At least one tier returned 0 rows via the anon key. That's a DB/RLS/grant or wrong-project issue, NOT the client. Fix that first."
    : "\n✅ All tiers return rows via the app's own anon key. The DB path is correct — any 'static' questions you still see are stale client cache: hard-reload web / fully restart mobile."
);
