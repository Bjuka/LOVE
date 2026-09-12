# SANCTUARY — Security Notes 🔒

This is the hardened build of the site. The experience is identical; the difference is everything under the hood.

## What's protecting what

| Tweak | Where it lives |
|---|---|
| Hide API keys | No URL/key/hash in source. Injected at runtime by gitignored `env.js`. |
| Check env variables | `config.js` validates all vars; prod fails *closed* with a friendly screen. |
| Check keys in git | `node api/check-secrets.js` scans every commit; `.gitignore` blocks `.env`/`env.js`. |
| Protect admin routes | `admin.html` + `admin.js` gate; `vercel.json` sends `noindex` + `no-store`. |
| Add auth / user perms | Passcode gate with real lockout; DB writes require a Supabase `authenticated` user (see SQL). |
| Sanitize user input | `SEC.sanitizeText` strips tags/schemes/handlers on every write, with length caps. |
| Protect against XSS | All rendering escapes; log uses `textContent`; no inline handlers; strict CSP. |
| Check DB rules | `supabase-policies.sql` — RLS on, anon = read-only, writes re-validated server-side. |
| Add rate limiting | Gate throttle (5 → 30s pause), admin lockout (5 fails → 15 min), uploads capped 30/hour. |
| Set spend cap | Upload rate limit + bucket size caps (images 8MB, audio 15MB) protect storage cost. |
| Secure file upload | MIME + extension + size gate, magic-byte sniffing, randomized filenames. |
| CSRF protection | Per-session token minted at login; asserted on every state-changing call. |
| Check CORS | CSP `connect-src` allow-list (Supabase only); lock down CORS in Supabase API settings too. |
| Enable HTTPS | Client redirect on non-local http + HSTS (2y, preload) + `upgrade-insecure-requests`. |
| Add security headers | `vercel.json`: CSP, HSTS, nosniff, DENY frames, Permissions-Policy, COOP, referrer policy. |
| Secure cookies | Admin flag lives in `sessionStorage` (session-scoped). Server-side cookie recipe below. |
| Disable debug mode | `DEBUG` env var; auto-forced off in production. |
| Check prod settings | Fail-closed config, prod checklists here + in the SQL pack. |

Libraries (GSAP, ScrollTrigger, Lenis, Supabase) are **vendored in `vendor/`** — no CDN, tighter CSP, works offline.

## Setup

```bash
cp .env.example .env        # fill in: SUPABASE_URL, SUPABASE_ANON_KEY, SANCTUARY_PASSWORD_HASH
node api/generate-env.js    # creates env.js (gitignored)
node api/check-secrets.js   # verify git history is clean
```

`env.js` ships pre-generated in this working copy — after editing `.env`, re-run `node api/generate-env.js`.
It is gitignored and must never be committed.

Open `index.html` via any static server (`python -m http.server` / `npx serve`).
Opening via `file://` works, but the Supabase client stays disabled by design (CORS).

## Deploy to Vercel

1. Push this repo to GitHub.
2. Vercel → Settings → Environment Variables — set the same vars from `.env`.
3. If you don't want `env.js` in the build output: wire `node api/generate-env.js` into the Build Command, or serve values from `/api/config` (see `api/config.js`) and un-comment that script tag in `index.html`.
4. Deploy. HTTPS, HSTS and all security headers come from `vercel.json` automatically.

## Supabase (the real security boundary)

The browser is cosmetic. The database is the boundary — run `supabase-policies.sql` in the SQL Editor:

- RLS enabled on all four tables; `anon` can only SELECT.
- INSERT/UPDATE/DELETE require a Supabase `authenticated` user **and** server-side length/format validation.
- Storage buckets enforce MIME allow-lists and size caps.
- Create yourself as the admin: Dashboard → Authentication → Users → Add user. That user's sign-in is what authorizes admin writes.

For the strongest setup, switch admin writes to `supabaseClient.auth.signInWithPassword(...)` and keep an httpOnly session cookie server-side — recipe sketched in `api/config.js`.

## If the secret scanner flags git history

`node api/check-secrets.js` scans **every commit**, not just current files. If it reports hits in old commits (the pre-hardening copies of `script.js` / `admin.html` had the URL, anon key and passcode hash hardcoded):

1. **Rotate first, clean second.** Supabase → Settings → API → regenerate the anon key, and change your passcode (new SHA-256 into `.env`). Once a key is leaked in history, assume it's public.
2. If this repo has **never been pushed** anywhere, you can rewrite history (`git filter-repo --replace-text`) or start a fresh repo.
3. If it **was** pushed, do NOT rely on deletion — rotate the credentials. That's the only real fix.

## Honest limitations (a personal gift site, not a bank)

- The passcode gate is client-side SHA-256: it *hides* the site, it doesn't *defend* it. The database policies above are the actual defense.
- Rate limits that live in the browser can be bypassed by a technical user; for hard enforcement, put an edge middleware or Supabase Edge Function in front of writes.
- `env.js` ships the anon key to visitors by necessity (it's a public key) — that's fine *as long as RLS is on*, which the SQL pack ensures.
