#!/usr/bin/env node
/* ============================================================
   SANCTUARY · set-main-password.js — rotate the MAIN password
   ------------------------------------------------------------
   The MAIN password is the real login for all 3 users. It lives
   ONLY inside Supabase (auth.users) — this script is how you
   change it. It never touches your code or .env.

   Usage (any one of these):

     1) Interactive (safest — nothing lands in shell history):
          SUPABASE_ACCESS_TOKEN=sbp_xxx node api/set-main-password.js

     2) One-shot:
          SUPABASE_ACCESS_TOKEN=sbp_xxx node api/set-main-password.js "new password"

     3) Or put these in .env first (then just run `node api/set-main-password.js`):
          SUPABASE_ACCESS_TOKEN=sbp_xxx
          SUPABASE_PROJECT_REF=your-project-ref        (from Dashboard → Settings → General)

   Which users get it? The emails in SITE_USERS from .env, or the
   3 known Sanctuary emails if SITE_USERS is absent.

   Requirements: Node 18+ (uses built-in fetch). No dependencies.
   ============================================================ */
"use strict";

const fs = require("fs");
const path = require("path");

// --- tiny .env loader (same as generate-env.js) ---
const root = path.join(__dirname, "..");
const envFile = path.join(root, ".env");
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

const TOKEN = process.env.SUPABASE_ACCESS_TOKEN || "";
const REF = process.env.SUPABASE_PROJECT_REF || "";
const API = process.env.SUPABASE_MANAGEMENT_URL || "https://api.supabase.com";
const NEW_PASSWORD = process.argv[2] || "";

if (!TOKEN) {
  console.error("✗ Missing SUPABASE_ACCESS_TOKEN.");
  console.error("  Get one: Supabase Dashboard → Account → Access Tokens");
  console.error("  Run:  SUPABASE_ACCESS_TOKEN=sbp_xxx node api/set-main-password.js \"new password\"");
  process.exit(1);
}
if (!REF) {
  console.error("✗ Missing SUPABASE_PROJECT_REF.");
  console.error("  Find it: Supabase Dashboard → Settings → General → Reference ID");
  console.error("  Put it in .env (gitignored): SUPABASE_PROJECT_REF=yourref");
  process.exit(1);
}
if (!NEW_PASSWORD) {
  console.error("✗ Missing the new password argument.");
  console.error('  Run:  node api/set-main-password.js "your new password"');
  process.exit(1);
}
if (NEW_PASSWORD.length < 8) {
  console.error("✗ Password too short (min 8 chars) — Supabase will reject it.");
  process.exit(1);
}

// --- which users to update ---
let emails = [];
try {
  const users = JSON.parse(process.env.SITE_USERS || "[]");
  if (Array.isArray(users)) emails = users.map((u) => String(u.email || "").trim().toLowerCase()).filter(Boolean);
} catch (e) { /* fall through to defaults */ }
if (!emails.length) {
  console.error("✗ No user emails configured.");
  console.error("  Set SITE_USERS in .env (see .env.example), e.g.:");
  console.error("    SITE_USERS='[{\"label\":\"for babieee\",\"email\":\"babieee@example.com\"},...]'");
  process.exit(1);
}

async function main() {
  // 1. service_role key (needed to write to auth.users)
  const keysRes = await fetch(`${API}/v1/projects/${REF}/api-keys?reveal=true`, {
    headers: { Authorization: `Bearer ${TOKEN}` }
  });
  if (!keysRes.ok) throw new Error(`Management API said ${keysRes.status} — is the access token valid?`);
  const keys = await keysRes.json();
  const serviceKey = (Array.isArray(keys) ? keys : []).find((k) => k.name === "service_role");
  if (!serviceKey) throw new Error("service_role key not found for this project.");

  // 2. project URL
  const projRes = await fetch(`${API}/v1/projects/${REF}`, { headers: { Authorization: `Bearer ${TOKEN}` } });
  if (!projRes.ok) throw new Error(`Cannot read project ${REF} (${projRes.status}).`);
  const project = await projRes.json();
  const siteUrl = (project.api_url || `https://${REF}.supabase.co`).replace(/\/$/, "");

  // 3. reset each user's password (create if missing)
  let ok = 0, failed = 0;
  for (const email of emails) {
    const res = await fetch(`${siteUrl}/auth/v1/admin/users`, {
      method: "POST",
      headers: { apikey: serviceKey.api_key, Authorization: `Bearer ${serviceKey.api_key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password: NEW_PASSWORD, email_confirm: true })
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.id) {
      console.log(`✓ password updated for ${email}`);
      ok++;
    } else if (res.status === 422 && /already/i.test(body.msg || "")) {
      // user exists → use the UPDATE endpoint instead
      const list = await fetch(`${siteUrl}/auth/v1/admin/users?per_page=200`, {
        headers: { apikey: serviceKey.api_key, Authorization: `Bearer ${serviceKey.api_key}` }
      });
      const listBody = await list.json().catch(() => ({ users: [] }));
      const user = (listBody.users || []).find((u) => String(u.email).toLowerCase() === email);
      if (!user) throw new Error(`Found "already exists" for ${email} but could not list it.`);
      const upd = await fetch(`${siteUrl}/auth/v1/admin/users/${user.id}`, {
        method: "PUT",
        headers: { apikey: serviceKey.api_key, Authorization: `Bearer ${serviceKey.api_key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ password: NEW_PASSWORD })
      });
      if (upd.ok) { console.log(`✓ password updated for ${email}`); ok++; }
      else { console.error(`✗ ${email}: update failed (${upd.status})`); failed++; }
    } else {
      console.error(`✗ ${email}: ${res.status} ${body.msg || body.message || ""}`);
      failed++;
    }
  }

  console.log("");
  console.log(`Done — ${ok} updated, ${failed} failed.`);
  console.log("Nothing else to change: the site reads this password from Supabase at sign-in.");
  if (ok > 0) {
    console.log("");
    console.log("Reminder: the BACKUP password is separate (SANCTUARY_PASSWORD_HASH in .env).");
    console.log("Change it with:  node api/hash-password.js --set \"backup passphrase\"");
  }
}

main().catch((err) => {
  console.error("✗ " + err.message);
  process.exit(1);
});
