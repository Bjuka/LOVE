/* ============================================================
   SANCTUARY — one-time migration: repo binaries → Supabase Storage
   ------------------------------------------------------------
   Uploads assets/img/*  → photos/site/*
           assets/audio/* → music/*
   then verifies every object (size + content-type) and prints a
   report. Idempotent: existing objects are skipped unless --force.

   Secrets stay OUT of this file — pass them via env vars:

     SUPABASE_URL=https://idlhbjoxxskzmvzrhjpb.supabase.co \
     SUPABASE_SERVICE_KEY=eyJ… \
     node scripts/upload-to-storage.mjs

   Service key: Supabase Dashboard → Project Settings → API →
   `service_role` (secret). Never commit it, never ship it to
   the browser. Delete nothing in Storage unless verified twice.
   ============================================================ */

import { createHash } from "node:crypto";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, basename, extname } from "node:path";

const SUPABASE_URL = (process.env.SUPABASE_URL || "").replace(/\/+$/, "");
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || "";
const FORCE = process.argv.includes("--force");

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("✗ Set SUPABASE_URL and SUPABASE_SERVICE_KEY env vars first (see header of this file).");
  process.exit(1);
}

const MIME = {
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png",
  ".webp": "image/webp", ".gif": "image/gif",
  ".mp3": "audio/mpeg", ".wav": "audio/wav", ".m4a": "audio/mp4"
};

const PLAN = [
  { dir: "assets/img",   bucket: "photos", public: false, prefix: "site/" },
  { dir: "assets/audio", bucket: "music",  public: true,  prefix: "" }
];

function headers(extra = {}) {
  return { Authorization: `Bearer ${SERVICE_KEY}`, apikey: SERVICE_KEY, ...extra };
}

async function createBucket(bucket, isPublic) {
  const create = await fetch(`${SUPABASE_URL}/storage/v1/bucket`, {
    method: "POST", headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ id: bucket, name: bucket, public: isPublic, file_size_limit: 15728640 })
  });
  if (!create.ok && create.status !== 409 && create.status !== 400) {
    throw new Error(`cannot create bucket '${bucket}': HTTP ${create.status} ${await create.text()}`);
  }
  console.log(`✓ bucket '${bucket}' ready (public=${isPublic})`);
}

async function ensureBucket(bucket, isPublic) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${bucket}`, { headers: headers() });
  if (res.ok) {
    const info = await res.json().catch(() => ({}));
    if (info.public === isPublic) {
      console.log(`• bucket '${bucket}' exists (public=${info.public})`);
      return;
    }
    // Visibility mismatch: some Storage versions have no PATCH route.
    // Buckets must be EMPTY here — try delete + recreate with the right flag.
    console.log(`• bucket '${bucket}' exists but public=${info.public} (want ${isPublic}) — recreating…`);
    const list = await listObjects(bucket).catch(() => []);
    if (list.length > 0) {
      throw new Error(`bucket '${bucket}' holds ${list.length} object(s) — empty it first (Dashboard → Storage) so visibility can be fixed.`);
    }
    const del = await fetch(`${SUPABASE_URL}/storage/v1/bucket/${bucket}`, { method: "DELETE", headers: headers() });
    if (!del.ok) throw new Error(`cannot delete bucket '${bucket}' for recreate: HTTP ${del.status} ${await del.text()}`);
    await createBucket(bucket, isPublic);
    return;
  }
  if (res.status !== 404 && res.status !== 400) {
    throw new Error(`cannot inspect bucket '${bucket}': HTTP ${res.status} ${await res.text()}`);
  }
  await createBucket(bucket, isPublic);
}

async function listObjects(bucket) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/${bucket}`, {
    method: "POST", headers: headers({ "Content-Type": "application/json" }),
    body: JSON.stringify({ prefix: "", limit: 1000 })
  });
  if (!res.ok) throw new Error(`cannot list bucket '${bucket}': HTTP ${res.status}`);
  return res.json();
}

async function upload(bucket, path, buf, contentType) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "POST",
    headers: headers({
      "Content-Type": contentType,
      "x-upsert": "true",
      "cache-control": "31536000"
    }),
    body: buf
  });
  if (!res.ok) throw new Error(`upload failed for ${bucket}/${path}: HTTP ${res.status} ${await res.text()}`);
}

async function verify(bucket, path, buf) {
  const res = await fetch(`${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`, {
    method: "HEAD", headers: headers()
  });
  if (!res.ok) return { ok: false, note: `HTTP ${res.status}` };
  const remoteSize = Number(res.headers.get("content-length") || -1);
  const localSize = buf.length;
  const ct = (res.headers.get("content-type") || "").toLowerCase();
  const ok = remoteSize === localSize && ct.startsWith(MIME[extname(path)]?.split("/")[0] || "");
  return { ok, note: `${localSize} bytes, content-type=${ct}` };
}

// ---------------- run ----------------
console.log(`→ target: ${SUPABASE_URL}\n`);
for (const { bucket, public: isPublic } of PLAN) await ensureBucket(bucket, isPublic);

const existing = {};
for (const { bucket } of PLAN) {
  existing[bucket] = new Set((await listObjects(bucket)).map(o => o.name));
  console.log(`• bucket '${bucket}' currently has ${existing[bucket].size} object(s)`);
}
console.log("");

const report = [];
for (const { dir, bucket, prefix } of PLAN) {
  let files;
  try { files = readdirSync(dir); } catch { console.log(`✗ local dir missing: ${dir} — skipped`); continue; }
  for (const name of files.sort()) {
    const full = join(dir, name);
    if (!statSync(full).isFile()) continue;
    const ext = extname(name).toLowerCase();
    if (!MIME[ext]) { console.log(`⚠ skip ${full}: unmapped extension`); continue; }
    const path = prefix + name;
    const buf = readFileSync(full);
    const localMd5 = createHash("md5").update(buf).digest("hex");

    if (existing[bucket].has(path) && !FORCE) {
      report.push({ bucket, path, localMd5, action: "SKIP (exists — use --force to overwrite)" });
      continue;
    }
    try {
      await upload(bucket, path, buf, MIME[ext]);
      const v = await verify(bucket, path, buf);
      report.push({ bucket, path, localMd5, action: v.ok ? "UPLOADED ✓" : `UPLOADED but verify failed: ${v.note}` });
    } catch (err) {
      report.push({ bucket, path, localMd5, action: `ERROR: ${err.message}` });
    }
  }
}

console.log("\n========== MIGRATION REPORT ==========");
let fail = 0;
for (const r of report) {
  console.log(`${r.bucket}/${r.path}  →  ${r.action}   (local md5 ${r.localMd5.slice(0, 8)}…)`);
  if (r.action.startsWith("ERROR") || r.action.includes("verify failed")) fail++;
}
console.log("======================================");
console.log(fail === 0
  ? `\n✅ All ${report.length} file(s) accounted for. Compare md5s above against:\n   md5sum assets/img/*.jpg assets/audio/*.mp3\n\nOnly after verifying: delete local copies / purge git history.`
  : `\n✗ ${fail} upload(s) failed — do NOT delete local files yet. Re-run or fix errors above.`);
process.exit(fail === 0 ? 0 : 1);
