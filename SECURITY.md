# SANCTUARY — Security Notes 🔒

This is the hardened build of the site. The experience is identical; the difference is everything under the hood.

## Login model (3 named users)

The gate now signs in through **Supabase Auth** — one shared password, three identities:

| Identity (chip on the gate) | Email (example) | Role | Powers |
|---|---|---|---|
| **for babieee** | `babieee@yoursite.com` | `viewer` | Watch the film only — no edit rights anywhere |
| **aryan** | `aryan@yoursite.com` | `viewer` | Watch the film only — no edit rights anywhere |
| **admin** | `admin@yoursite.com` | `admin` | Full Control Room: create, edit, delete, upload, sync |

- Passwords live **only** in Supabase Auth (bcrypt-hashed). Nothing is stored in `env.js` any more.
- The role lives in `auth.users.app_metadata.role`, which users **cannot edit themselves** — it can only be set from the dashboard/SQL/service key.
- Enforcement is server-side RLS (`supabase-policies.sql` §2–4): viewers' write calls are rejected by the database even if someone tampers with the UI.
- Sessions are per browser tab (`sessionStorage`), auto-refresh, and expire with the tab.
- A legacy shared-passcode fallback (SHA-256 hash in env) still unlocks **view-only** if Supabase Auth is unreachable — it never grants edit power.

## What's protecting what

| Tweak | Where it lives |
|---|---|
| Hide API keys | No URL/key/hash in source. Injected at runtime by gitignored `env.js`. |
| Check env variables | `config.js` validates all vars; prod fails *closed* with a friendly screen. |
| Check keys in git | `node api/check-secrets.js` scans every commit; `.gitignore` blocks `.env`/`env.js`. |
| Named logins + roles | `auth.js` — Supabase Auth sign-in, role from `app_metadata`, per-tab sessions. |
| Protect admin routes | `admin.html` + `admin.js` gate; role-aware UI (viewers see read-only mode); `vercel.json` sends `noindex` + `no-store`. |
| Add auth / user perms | DB writes require a Supabase session whose `app_metadata.role = 'admin'` (see SQL §3–4). |
| Sanitize user input | `SEC.sanitizeText` strips tags/schemes/handlers on every write, with length caps. |
| Protect against XSS | All rendering escapes; log uses `textContent`; no inline handlers; strict CSP. |
| Check DB rules | `supabase-policies.sql` — RLS on, viewers = SELECT only, admin-only writes re-validated server-side. |
| Add rate limiting | Gate throttle (5 → 30s pause), admin lockout (5 fails → 15 min), uploads capped 30/hour, plus Supabase's built-in auth rate limits. |
| Set spend cap | Upload rate limit + bucket size caps (images 8MB, audio 15MB) protect storage cost. |
| Secure file upload | MIME + extension + size gate, magic-byte sniffing, randomized filenames. |
| CSRF protection | Per-session token minted at login; asserted on every state-changing call. |
| Check CORS | CSP `connect-src` allow-list (Supabase only); lock down CORS in Supabase API settings too. |
| Enable HTTPS | Client redirect on non-local http + HSTS (2y, preload) + `upgrade-insecure-requests`. |
| Add security headers | `vercel.json`: CSP, HSTS, nosniff, DENY frames, Permissions-Policy, COOP, referrer policy. |
| Secure cookies | Session lives in `sessionStorage` (session-scoped, per tab). Server-side cookie recipe below. |
| Disable debug mode | `DEBUG` env var; auto-forced off in production. |
| Check prod settings | Fail-closed config, prod checklists here + in the SQL pack. |

Libraries (GSAP, ScrollTrigger, Lenis, Supabase) are **vendored in `vendor/`** — no CDN, tighter CSP, works offline.

## Setup

```bash
cp .env.example .env        # fill in: SUPABASE_URL, SUPABASE_ANON_KEY
#                           # SITE_USERS: the 3 gate identities (labels + emails)
#                           # SANCTUARY_PASSWORD_HASH: optional legacy fallback only
node api/generate-env.js    # creates env.js (gitignored)
node api/check-secrets.js   # verify git history is clean
```

`SITE_USERS` format (one line):

```bash
SITE_USERS='[{"label":"for babieee","email":"babieee@yoursite.com"},{"label":"aryan","email":"aryan@yoursite.com"},{"label":"admin","email":"admin@yoursite.com"}]'
```

`env.js` ships pre-generated in this working copy — after editing `.env`, re-run `node api/generate-env.js`.
It is gitignored and must never be committed.

Open `index.html` via any static server (`python -m http.server` / `npx serve`).
Opening via `file://` works, but the Supabase client stays disabled by design (CORS).

## Create the 3 users in Supabase

Run **`supabase-policies.sql`** in the SQL Editor — section 6 creates the users with
`app_metadata.role` set (viewer / viewer / admin) and one shared password. Edit the
emails + password at the top of that block first. Or do it by hand:

1. Dashboard → Authentication → Users → **Add user** (Auto Confirm ✓):
   `babieee@yoursite.com`, `aryan@yoursite.com`, `admin@yoursite.com` — same password.
2. Then run in the SQL Editor:

```sql
UPDATE auth.users SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"admin"')
  WHERE email = 'admin@yoursite.com';
UPDATE auth.users SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"viewer"')
  WHERE email IN ('babieee@yoursite.com', 'aryan@yoursite.com');
```

That role value is what RLS checks — it is the whole difference between
"can watch the film" and "can rewrite it".

## Deploy to Vercel

1. Push this repo to GitHub.
2. Vercel → Settings → Environment Variables — set the same vars from `.env` (incl. `SITE_USERS`).
3. If you don't want `env.js` in the build output: wire `node api/generate-env.js` into the Build Command (already set in `vercel.json`), or serve values from `/api/config` (see `api/config.js`) and un-comment that script tag in `index.html`.
4. Deploy. HTTPS, HSTS and all security headers come from `vercel.json` automatically.

## Supabase (the real security boundary)

The browser is cosmetic. The database is the boundary — run `supabase-policies.sql` in the SQL Editor:

- RLS enabled on all four tables.
- **Viewers (authenticated)**: SELECT only.
- **Admin (authenticated + `app_metadata.role = 'admin'`)**: INSERT / UPDATE / DELETE, re-validated server-side.
- **Anon**: nothing — the film only loads for a signed-in tab.
- Storage: `photos` bucket is **private** — reads require a signed-in session and are served via short-lived signed URLs minted with the user's JWT (`media.js`); `music` is public (playlist only). **Uploads only for the admin**, MIME allow-lists and size caps enforced.

## If the secret scanner flags git history

`node api/check-secrets.js` scans **every commit**, not just current files. If it reports hits in old commits:

1. **Rotate first, clean second.** Supabase → Settings → API → regenerate the anon key, and change the shared password. Once a key is leaked in history, assume it's public.
2. If this repo has **never been pushed** anywhere, you can rewrite history (`git filter-repo --replace-text`) or start a fresh repo.
3. If it **was** pushed, do NOT rely on deletion — rotate the credentials. That's the only real fix.

## Media binaries & git history

All photos/audio live in Supabase Storage (`photos/site/*`, `music/*`) — the repo ships no binary media. `.gitignore` blocks `assets/img/` and `assets/audio/` so they can't be re-committed by accident.

If media ever ends up in history again (repo must go public!):

1. `node scripts/purge-media-history.mjs` — rewrites every commit to drop `assets/img/*` + `assets/audio/*` (pure Node, no extra deps).
2. `git push --force origin main` — the rewrite invalidates old SHAs.
3. Re-clone everywhere; old clones still contain the blobs.
4. Backups taken before the rewrite: `love-backup-*.bundle` + `love-backup-*-worktree.tar.gz` (kept OUTSIDE the repo — they contain the binaries).

The service key used for `scripts/upload-to-storage.mjs` is passed via env var only — never stored, never committed.

## Honest limitations (a personal gift site, not a bank)

- The gate UI is client-side: it *hides* the site, it doesn't *defend* it. The database policies above are the actual defense.
- The legacy SHA-256 fallback (if configured) is convenience only — treat it as a viewing passcode, never an admin credential.
- Rate limits that live in the browser can be bypassed by a technical user; for hard enforcement, rely on Supabase's built-in auth rate limits + RLS.
- `env.js` ships the anon key to visitors by necessity (it's a public key) — that's fine *as long as RLS is on*, which the SQL pack ensures.
