# SANCTUARY — project memory & taste guide

A private, scroll-driven love-letter film for one person. This file is my
persistent memory: read it first in every session, keep it current, and never
contradict it without asking.

## What this project is

- **Audience of one.** This is a romantic gift, not a product. Emotional tone
  beats technical purity when they conflict (but never ship broken things).
- **Voice**: playful, couple-private, sweet. "MINEEE 💍", "your ullu",
  "babieeee". Emoji are welcome here (explicit user preference — this overrides
  any anti-emoji default).
- **Music credit note**: artist "One Direection" spelling is the user's own
  inside joke — do not "fix" it.

## Locked design decisions (do not regress)

- **Aesthetic**: rosy-pop, light contrast, pink accent. NO dark cinema look —
  the user explicitly rejected the original dark theme.
- Palette tokens live in `style.css` `:root` (ivory base `#fff7f9`, rose
  `#f65d8e`, ink-plum). Fonts: Playfair Display, Space Grotesk, JetBrains Mono,
  Parisienne (script) — Parisienne is reserved for romantic moments.
- **"Scrapbook Valentine" whimsy layer (`whimsy.js`) is APPROVED and canon**:
  heart cursor trail, breathing aurora, pressed-flower polaroid corners + tape,
  petal rain in the finale. All decorative only, `pointer-events: none`,
  silent under `prefers-reduced-motion`.
- All animations must keep working. The user consistently refuses trade-offs
  that sacrifice existing animation behavior.
- The scene-4 polaroid is a scroll-driven companion to the affirmation deck:
  opens → zooms → carousel-swaps every 2 quotes (auto-adapting math).
- The finale collage holds all 10 photos; on mobile it relaxes to a quiet
  6-photo backdrop.

## Architecture facts

- **Media lives in `assets/img/` and `assets/audio/`** — never reference media
  at repo root. Audio filenames are slugged (`accidently-in-love.mp3`).
- **`media.js` is the single path resolver** (`SANCTUARY_MEDIA.resolve`):
  legacy bare DB filenames map to assets/, storage/absolute URLs pass through.
  Always route render-time media through it.
- Static hosting + Vercel deploy. `vendor/` holds local GSAP, ScrollTrigger,
  Lenis, Supabase — **no CDNs, CSP is `script-src 'self'`**.
- `env.js` is gitignored and holds real keys — never commit, never print its
  contents. `SECURITY.md` documents the hardened setup; `supabase-policies.sql`
  must be run in Supabase for real enforcement.
- Data loaders all go through the shared `fetchTable(table, orderCol, asc,
  mapRow, fallback)` helper in `script.js`.
- Old secrets exist in git history: user was advised to rotate the Supabase
  anon key + passcode. Don't reintroduce hardcoded keys anywhere.

## Working agreements with this user

- **Surprise changes are allowed, but revert must always be one step away.**
  Back up outside the repo first; the user explicitly reserves the right to
  say "revert" after any creative change.
- Think and propose — the user often says "no prompt, you decide" — but verify
  with real browser tests (Playwright) and report honestly, including
  mistakes made mid-task.
- The user likes: HEIC→JPG conversion flows, caption voice rewrites, playful
  scene names, and being told which one-liner to edit if they want tweaks.
- Skills live globally at `D:\projects\.agents\` (impeccable + taste-skill
  collection); MCP servers are configured in `D:\projects\.agents\mcp.json`
  (playwright, supabase, memory). Skills must be read from disk directly —
  they are not auto-discovered from parent dirs.
