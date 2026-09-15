# SANCTUARY — a cinematic film for two

A scroll-driven, cinematic love-letter website. The page reads like a film: scenes, chapters, a soundtrack — not a landing page. Every picture and every quote from the original site is preserved, only the presentation changed.

## The Experience

The site is structured as scenes connected by scroll:

1. **Gate** — a cinematic login screen ("A private screening") with three identity chips — **for babieee** · **aryan** · **admin**. Same shared password for all three; sign-in goes through Supabase Auth (session-based unlock, per tab). The first two are view-only guests; `admin` also holds the keys to the Control Room.
2. **Scene 01 · The Beginning** — full-screen cover photo with the title "To my entire universe & soulmate". Scrolling *zooms the camera into the photo* (pinned GSAP scrub), and the favorite-view quote fades in mid-zoom. Multiple favorite views auto-crossfade with ←/→ controls.
3. **Scene 02 · Why You** — the big paragraph, revealed word-by-word as you scroll (scrub-linked opacity/motion).
4. **Scene 03 · The Memory Box** — a **pinned horizontal reel**: vertical scrolling drives the memory film-strip sideways. Tilted photo frames straighten on hover.
5. **Scene 04 · For the Low Days** — the affirmation deck is now click-driven: tap the card or use ←/→ to change quotes (scrolling never changes them) and the polaroid photo changes with each quote. The hug overlay (breathing circle) is still one button away.
6. **Scene 05 · What We're Building** — dreams as large editorial rows with parallax images.
7. **Scene 06 · The Soundtrack** — full inline music player (your MP3s from Supabase Storage), spinning vinyl disc, seek bar, playlist with active-track highlight.
8. **Final Scene · Forever** — the closing letter with floating memory photos drifting at different scroll speeds (parallax collage).

Plus: film grain + vignette overlay, a fixed "film chrome" bar showing the current scene name, scroll progress line, tap-anywhere floating hearts.

## Tech

- **GSAP + ScrollTrigger** — pinned scenes, scrubbed animations, horizontal scroll section, parallax
- **Lenis** — smooth inertial scrolling
- **Vanilla JS + CSS** — no frameworks, no Tailwind, no icon CDNs (site *and* admin)
- **Supabase** — same tables as before: `favorite_views`, `memories`, `dreams`, `songs`; storage buckets `photos` / `music`
- All content has local fallbacks, so the site works even if Supabase is unreachable

## Editing your site (no more typing /admin.html)

- **Footer ✎** — bottom-right of the finale, a discreet ✎ links to the admin
- **Triple-click "SANCTUARY"** in the top chrome bar
- The Control Room shows who you are (identity badge) — viewers see a read-only console; **admin** gets the full editing suite (create, edit, delete, upload, sync)
- Edit power is enforced **twice**: the UI hides write actions for viewers, and Supabase RLS rejects viewer writes at the database level
- "Lock Session" now returns you to the film (and clears the session)

See `SECURITY.md` for creating the three users and setting their roles in Supabase.

## Structure

```text
├── index.html         # the film (scenes + gate)
├── style.css          # bespoke cinematic theme (no Tailwind)
├── script.js          # gate, Lenis, GSAP story, Supabase loaders, player
├── auth.js            # shared Supabase Auth layer (3 named logins · viewer vs admin roles)
├── media.js           # media path resolver (legacy names → assets/)
├── whimsy.js          # heart trail, petal rain, aurora, polaroid corners
├── admin.html         # control room (CRUD, uploads, sync) — same design system
├── admin.js           # hardened admin logic
├── config.js / env.js # runtime config (env.js is gitignored — never commit it)
├── assets/
│   ├── img/           # all photos (cover, memories, dreams, polaroids)
│   └── audio/         # soundtrack fallbacks (slugged filenames)
├── api/               # generate-env · check-secrets · optional edge config
├── vendor/            # local GSAP, ScrollTrigger, Lenis, Supabase (no CDN)
├── supabase-policies.sql  # RLS pack — run in the Supabase SQL Editor
├── vercel.json        # security headers + media caching
└── SECURITY.md        # security guide & checklist
```

## Notes

- Passcode check is client-side SHA-256 — fine for a personal surprise, not real security
- Animations respect `prefers-reduced-motion`
- Deploy anywhere static (it was set up for Vercel before — still works)
