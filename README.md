# ✦ MY LOVE — A Forever Sanctuary ✦

An aesthetic, cloud-synced digital sanctuary and interactive memory keepsake. Built with a strict architectural separation between a read-only visitor sanctuary for your partner and an administrative command center for managing cloud media and database records via Supabase.

---

## ✨ Core Features

### 🌸 Visitor Interface (`index.html`)
- **🔒 Frosted Glass Security Gate:** Protected by a SHA-256 hashed passcode lockscreen with an animated skeleton wireframe backdrop to prevent peeking before unlock.
- **📸 Dynamic "Favorite View" Stack:**
  - Dynamic polaroid card with a live anniversary counter, badges, and custom romantic notes.
  - **Adaptive Stack Engine:** Automatically renders as a clean single card when only one view exists; expands into an interactive cycling deck with navigation controls and pagination counters when multiple views are stored.
- **🫂 "For When You Feel Low" Uplifting Hub:**
  - **Instant Warm Hug:** A breathing circle animation with ambient pulse glow and comforting reminders.
  - **Wholesome Reminder Deck:** Interactive card deck cycling through wholesome affirmations.
- **🏡 Shared Dream Board:** Cloud-synced visual board for future goals, milestones, and shared visions.
- **🎞️ Cloud Memory Box:** Keepsake gallery displaying tagged polaroids, dates, and love quotes loaded dynamically from PostgreSQL.
- **🎶 Cozy Music Hub:**
  - **Ambient Lofi Chimes:** Procedural, relaxing chime generator powered by Web Audio API synthesizers.
  - **Dynamic Audio Streamer:** Streams uploaded `.mp3` tracks directly from Supabase Storage CDN with live progress seeking, time displays, and volume adjustment.
- **💖 Interactive Particle Canvas:** Tap-activated confetti bursts and a custom 2D canvas spawning physics-based floating hearts.

---

### 🛠️ Command Center (`admin.html`)
- **🛡️ Passcode-Protected Admin Gate:** Restricts database modification tools behind a dedicated master passcode.
- **⚡ 1-Click Database Synchronization:** An automated migration engine that scans browser storage and seeds default content into Supabase tables without creating duplicates.
- **📝 Full CRUD Records Management:**
  - **Create:** Upload memories, dreams, playlist tracks, and hero polaroids.
  - **Modify:** Edit existing records in real time using dedicated modals.
  - **Comparative Previews:** Shows side-by-side previews of the currently stored image versus the newly selected file before committing changes.
  - **Delete:** Remove outdated records directly from the database with confirmation guards.
- **☁️ Direct Bucket Uploads:** Automatically routes images to the `photos` bucket and audio tracks to the `music` bucket.
- **📟 Live Terminal Logger:** Displays real-time status output for storage uploads, API requests, and database updates.

---

## 🛠️ Built With

- **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3 (Glassmorphism & Custom Keyframe Animations)
- **Styling:** [Tailwind CSS CDN](https://tailwindcss.com/)
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL with Row-Level Security)
- **Object Storage:** Supabase Storage Buckets (`photos`, `music`)
- **Audio & Visual FX:** Web Audio API, [Lucide Icons](https://lucide.dev/), [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)
- **Deployment:** [Vercel](https://vercel.com/) (Continuous deployment via Git)

---

## 📂 Project Structure

```text
├── index.html         # Visitor frontend with frosted lockscreen
├── admin.html         # Admin control center (CRUD, uploads & migration)
├── style.css          # Custom animations, glassmorphic filters & scroll locks
├── script.js          # Client-side logic, audio synthesizer & particle canvas
├── cover.jpg          # Fallback hero polaroid
├── babieee.jpg        # Fallback dream board image
├── memory1.jpg        # Fallback memory keepsake image
└── README.md          # Project documentation