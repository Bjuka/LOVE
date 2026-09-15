#!/usr/bin/env node
/* ============================================================
   SANCTUARY · hash-password.js — manage the BACKUP password
   ------------------------------------------------------------
   The BACKUP password is a view-only fallback that works even
   when Supabase is unreachable. Its SHA-256 lives in .env as
   SANCTUARY_PASSWORD_HASH and ships to the browser in env.js.

   Usage:

     Show what's currently set:
       node api/hash-password.js --show

     Compute a hash only (prints it, changes nothing):
       node api/hash-password.js "some passphrase"

     Set a new backup password (updates .env + regenerates env.js):
       node api/hash-password.js --set "some passphrase"

     Disable the backup password entirely:
       node api/hash-password.js --clear

   ⚠ The backup unlock is VIEW-ONLY. It can never edit the site —
     that requires a real Supabase admin login.
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const root = path.join(__dirname, "..");
const envPath = path.join(root, ".env");
const sha256 = (s) => crypto.createHash("sha256").update(String(s), "utf8").digest("hex");

// --- tiny .env loader (same conventions as generate-env.js) ---
const env = {};
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) env[m[1]] = m[2];
  }
}

const args = process.argv.slice(2);
const command = args[0] || "";
const value = args.slice(1).join(" ");

function currentHash() {
  return (process.env.SANCTUARY_PASSWORD_HASH || env.SANCTUARY_PASSWORD_HASH || "").trim();
}

function upsertEnvVar(newHash) {
  let lines = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf8").split(/\r?\n/) : [];
  const idx = lines.findIndex((l) => /^SANCTUARY_PASSWORD_HASH\s*=/.test(l));
  const entry = `SANCTUARY_PASSWORD_HASH=${newHash}`;
  if (idx >= 0) lines[idx] = entry;
  else lines.push(entry);
  fs.writeFileSync(envPath, lines.join("\n").replace(/\n+$/, "\n"));
}

if (command === "--show") {
  const h = currentHash();
  if (!h) { console.log("Backup password: DISABLED (SANCTUARY_PASSWORD_HASH is empty)."); return; }
  console.log("Backup password hash (SHA-256):");
  console.log("  " + h);
  console.log("Set in: .env → SANCTUARY_PASSWORD_HASH  (ships to browser via env.js)");
  console.log('Change it with:  node api/hash-password.js --set "new backup passphrase"');
  return;
}

if (command === "--clear") {
  upsertEnvVar("");
  console.log("✓ Backup password disabled (SANCTUARY_PASSWORD_HASH emptied).");
  console.log("  Now run:  node api/generate-env.js");
  return;
}

if (command === "--set") {
  if (!value) { console.error('✗ Provide the passphrase:  node api/hash-password.js --set "passphrase"'); process.exit(1); }
  const h = sha256(value);
  upsertEnvVar(h);
  console.log("✓ .env updated — SANCTUARY_PASSWORD_HASH is now the SHA-256 of your new backup passphrase.");
  console.log("  hash: " + h);
  console.log("  Now run:  node api/generate-env.js   (rebuilds env.js the browser loads)");
  return;
}

// default: just compute & print
if (!value) {
  console.log("Usage:");
  console.log('  node api/hash-password.js "passphrase"     # compute SHA-256 only');
  console.log('  node api/hash-password.js --set "passphrase" # write into .env');
  console.log("  node api/hash-password.js --show            # show current hash");
  console.log("  node api/hash-password.js --clear           # disable backup password");
  process.exit(1);
}
console.log("SHA-256: " + sha256(value));
console.log('To activate:  node api/hash-password.js --set "' + value + '"  then  node api/generate-env.js');
