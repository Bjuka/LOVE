# ✦ MY LOVE — A Forever Sanctuary ✦

An aesthetic, cloud-synced digital sanctuary and memory keepsake built with love. Designed with a clean separation of concerns: a view-only frontend for your partner and an administrative backend portal for managing photos, audio, and memories via Supabase.

---

## ✨ Features

- **🔒 Frosted Glass Gateway:** Protected by a SHA-256 hashed passcode lock screen featuring scroll prevention and an animated skeleton wireframe backdrop to prevent peeking.
- **📸 "My Favorite View":** A dedicated polaroid card showcasing your favorite memory, badge, live anniversary date counter, and a romantic note.
- **🫂 "For When You Feel Low" Uplifting Hub:**
  - **Instant Warm Hug:** A breathing circle animation with a gentle pulse effect and reassuring love note.
  - **Wholesome Reminder Deck:** An interactive card deck cycling through wholesome, randomized affirmations.
- **🏡 Shared Dream Board:** Dynamic visual board pulling future goals, home dreams, and milestones directly from cloud storage.
- **🎞️ Cloud Memory Box:** Dynamic keepsake gallery displaying photos, custom tags, dates, and love quotes loaded from the database.
- **🎶 Cozy Music Hub:**
  - **Ambient Lofi Chimes:** Procedural ambient sound generator powered by the Web Audio API synthesizer.
  - **Dynamic Audio Playlist:** Streams hosted audio tracks directly from Supabase Storage CDN with live progress seeking and volume control.
- **🛠️ Dedicated Admin Portal (`admin.html`):** A secluded control dashboard to upload photos and audio tracks directly to cloud buckets and create database records without touching code.
- **💖 Canvas Physics & Particles:** Interactive floating heart canvas reacting to clicks and tap-activated confetti bursts.

---

## 🛠️ Built With

- **Frontend:** HTML5, CSS3 (Glassmorphism), Vanilla JavaScript (ES6+)
- **Styling:** [Tailwind CSS CDN](https://tailwindcss.com/) & Custom Animations
- **Backend & Database:** [Supabase](https://supabase.com/) (PostgreSQL & Row-Level Security)
- **Object Storage:** Supabase Storage Buckets (`photos`, `music`)
- **Deployment:** [Vercel](https://vercel.com/) (Continuous deployment via private Git repository)
- **Audio & FX:** Web Audio API, [Lucide Icons](https://lucide.dev/), [Canvas Confetti](https://www.npmjs.com/package/canvas-confetti)

---

## 📂 Project Structure

```text
├── index.html         # Read-only visitor frontend with passcode gateway
├── admin.html         # Content management dashboard & media uploader
├── style.css          # Glassmorphism, scroll locks, and custom animations
├── script.js          # Client logic, data fetchers, audio player & particle physics
├── cover.jpg          # Fallback hero image
├── babieee.jpg        # Fallback dream card media
├── memory1.jpg        # Fallback memory keepsake media
└── README.md          # Project documentation