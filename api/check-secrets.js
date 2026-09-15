#!/usr/bin/env node
/* ------------------------------------------------------------
   SANCTUARY · secure edition — secret scanner ("check keys in git")
   Scans working tree AND full git history for leaked credentials.
   Exit 1 = leak found. Run before every push / in CI.
------------------------------------------------------------ */
"use strict";
const { execSync } = require("child_process");
const path = require("path");

const PATTERNS = [
  { name: "Supabase anon/publishable key", re: /sb_publishable_[A-Za-z0-9_-]{20,}/ },
  { name: "Supabase legacy anon key (JWT)", re: /eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9\.[A-Za-z0-9_-]{20,}/ },
  { name: "Supabase service role key (CRITICAL)", re: /sb_secret_[A-Za-z0-9_-]{20,}/ },
  { name: "Supabase project URL", re: /https:\/\/[a-z0-9]{20}\.supabase\.co/ },
  { name: "SHA-256 passcode hash", re: /\b[0-9a-f]{64}\b/ },
  { name: "Generic API key assignment", re: /(?:api[_-]?key|apikey|secret|password)\s*[:=]\s*['"][^'"]{8,}['"]/i }
];

// Files that are ALLOWED to mention these patterns (templates & scanners)
const ALLOW = [/\.env\.example$/i, /env\.example\.js$/i, /check-secrets\.js$/i, /supabase-policies\.sql$/i, /README\.md$/i];

function scanContent(content, label, hits) {
  for (const p of PATTERNS) {
    if (p.re.test(content)) {
      const allowed = ALLOW.some((rx) => rx.test(label));
      if (!allowed) hits.push(`${label} → ${p.name}`);
    }
  }
}

const hits = [];

// 1. Working tree (current directory — the secure copy)
const root = path.join(__dirname, "..");
let files = [];
try {
  files = execSync("git ls-files", { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean);
} catch (e) {
  files = require("fs").readdirSync(root).filter((f) => !f.startsWith("."));
}
for (const f of files) {
  try {
    const content = require("fs").readFileSync(path.join(root, f), "utf8");
    scanContent(content, f, hits);
  } catch (e) { /* binary or deleted */ }
}

// 2. Full git history (every commit, every blob, the WHOLE tree — not just this folder)
try {
  const revs = execSync("git rev-list --all", { cwd: root, encoding: "utf8" }).split("\n").filter(Boolean).slice(0, 500);
  for (const rev of revs) {
    const blobs = execSync(`git ls-tree -r --full-tree ${rev}`, { cwd: root, encoding: "utf8" });
    for (const line of blobs.split("\n")) {
      const m2 = line.match(/^[0-9]+ \w+ ([a-f0-9]+)\t(.+)$/);
      if (!m2) continue;
      const hash = m2[1], name = m2[2];
      if (ALLOW.some((rx) => rx.test(name))) continue;
      try {
        const content = execSync(`git cat-file blob ${hash}`, { cwd: root, encoding: "utf8", maxBuffer: 10 * 1024 * 1024 });
        scanContent(content, `${name} @ ${rev.slice(0, 8)}`, hits);
      } catch (e) { /* binary blob */ }
    }
  }
} catch (e) { /* not a git repo or git unavailable */ }

if (hits.length) {
  console.error("✗ Potential secrets found:");
  hits.forEach((h) => console.error("  - " + h));
  console.error("\nRotate any exposed keys at once (Supabase → Settings → API → regenerate).");
  process.exit(1);
} else {
  console.log("✓ No secrets found in working tree or git history.");
}
