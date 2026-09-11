# SANCTUARY — a cinematic film for two

A scroll-driven, cinematic love-letter website. The page reads like a film: scenes, chapters, a soundtrack — not a landing page. Every picture and every quote from the original site is preserved, only the presentation changed.

## The Experience

The site is structured as scenes connected by scroll:

1. **Gate** — a cinematic login screen ("A private screening"). Same passcode as before (SHA-256, session-based unlock).
2. **Scene 01 · The Beginning** — full-screen cover photo with the title "To my entire universe & soulmate". Scrolling *zooms the camera into the photo* (pinned GSAP scrub), and the favorite-view quote fades in mid-zoom. Multiple favorite views auto-crossfade with ←/→ controls.
3. **Scene 02 · Why You** — the big paragraph, revealed word-by-word as you scroll (scrub-linked opacity/motion).
4. **Scene 03 · The Memory Box** — a **pinned horizontal reel**: vertical scrolling drives the memory film-strip sideways. Tilted photo frames straighten on hover.
5. **Scene 04 · For the Low Days** — the affirmation deck, now scrub-cycled: scrolling turns the cards while the card stays pinned. The hug overlay (breathing circle) is still one button away.
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
- Admin unlocks automatically if you've already passed the site passcode this session — same password, typed once
- "Lock Session" now returns you to the film (and clears the session)

## Structure

```text
├── index.html         # the film (scenes + gate)
├── style.css          # bespoke cinematic theme (no Tailwind)
├── script.js          # gate, Lenis, GSAP story, Supabase loaders, player
├── admin.html         # control room (CRUD, uploads, sync) — same design system
├── cover.jpg / memory1-3.jpg / babieee.jpg / dream2.jpg   # media
└── *.mp3              # soundtrack fallbacks
```

## Notes

- Passcode check is client-side SHA-256 — fine for a personal surprise, not real security
- Animations respect `prefers-reduced-motion`
- Deploy anywhere static (it was set up for Vercel before — still works)
