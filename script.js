/* ============================================================
   SANCTUARY — cinematic edition
   gate · smooth scroll · GSAP ScrollTrigger story · supabase
   ============================================================ */

// ==================== CONFIG ====================
// Keys no longer live in code. config.js + env.js (gitignored, generated)
// supply them at runtime; see secure/env.example.js.
var cfg = window.SANCTUARY_CFG || { supabaseUrl: "", supabaseAnonKey: "", passwordHash: "", debug: false };
var SUPABASE_URL = cfg.supabaseUrl;
var SUPABASE_ANON_KEY = cfg.supabaseAnonKey;
var SANCTUARY_PASSWORD_HASH = cfg.passwordHash;
var DEBUG = !!cfg.debug;
function debugLog() { if (DEBUG && window.console && console.log.apply) console.log.apply(console, ["[SANCTUARY]"].concat([].slice.call(arguments))); }

var supabaseClient = (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY)
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { "X-Client-Info": "sanctuary-secure" } }
    })
  : null;

var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
var HAS_GSAP = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
if (HAS_GSAP) gsap.registerPlugin(ScrollTrigger);
if (REDUCED) document.documentElement.classList.add("reduced");

// ==================== HELPERS ====================
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatDisplayDate(dateStr) {
  if (!dateStr) return "Special Day";
  try {
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch (e) {
    return dateStr;
  }
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

async function sha256(message) {
  if (!window.crypto || !crypto.subtle) return message.trim();
  var buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(message.trim()));
  return Array.from(new Uint8Array(buf)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
}

// ==================== CONTENT (fallbacks mirror DB) ====================
// media path resolver (media.js) — maps legacy bare filenames to assets/
var media = (window.SANCTUARY_MEDIA && window.SANCTUARY_MEDIA.resolve) || function (u) { return u; };

var defaultHeroFallback = {
  image_url: "assets/img/cover.jpg",
  badge: "My Favorite View",
  date: "Today",
  sub_tag: "",
  floating_badge: "",
  quote: "No matter where life takes us, my heart will always beat for you."
};

var fallbackMemories = [
  { title: "What makes me happy?", date: "2026-03-13", tag: "MINEEE 💍", image: "assets/img/memory1.jpg",
    caption: "Every moment with you makes me feel special beacause you feel like a long lost part of me which makes me complete 💕💕" },
  { title: "My Cute Babieeee", date: "2025-12-12", tag: "Special dayyy 🍷", image: "assets/img/memory2.jpg",
    caption: "Whenever im with you, im never alone. you make me feel so happy like im some celebrity but tbh, i just want to be YOURS ❤️" },
  { title: "Ummmmmah", date: "2026-08-14", tag: "Goofy Moments 🤪", image: "assets/img/memory3.jpg",
    caption: "You brings out the kid in me (idk the date😭)" }
];

var fallbackDreams = [
  { title: "My Second Love", emoji: "❤️", tag: "Our little cuteness",
    desc: "Our daughter will look like this and we will be the best parents anyone can ever wish for ❤️❤️", image: "assets/img/babieee.jpg" },
  { title: "Together and Forever", emoji: "🌻🌻", tag: "Our Goal",
    desc: "No matter what happens, we stay together, we fight together and we fix together cuz you're my wifey and i love you the most. just like this💕", image: "assets/img/dream2.jpg" }
];

var fallbackSongs = [
  { title: "Accidently in LOVE", artist: "Counting Crows", src: "assets/audio/accidently-in-love.mp3" },
  { title: "Make you MINE", artist: "PUBLIC", src: "assets/audio/make-you-mine.mp3" },
  { title: "You & I", artist: "One Direection", src: "assets/audio/you-and-i.mp3" }
];

var wholesomeAffirmations = [
  "You are the most precious part of my life, and nothing can diminish how brilliant and strong you are.",
  "Take a deep breath. You don't have to carry the whole world today. Just rest, my love.",
  "You are doing so much better than you give yourself credit for, and I am endlessly proud of you.",
  "My heart is always your safe home, no matter how chaotic everything else feels.",
  "You are beautiful, capable, intelligent, and you bring so much sunshine to my universe.",
  "Even on your quietest, hardest days, you are deeply and completely loved by me.",
  "Whatever obstacle you are facing today, we will overcome it together. You never stand alone.",
  "Your smile is my absolute favorite thing in this world. Be gentle with your sweet soul today.",
  "You are safe, you are protected, and you are cherished beyond all words.",
  "Your laughter is my favorite sound in the whole universe.",
  "I am proud of every single step you take, big or small.",
  "Whenever you doubt yourself, remember that I believe in you with my whole heart."
];

// ============================================================
// 1 · LOGIN GATE
// ============================================================
var gateEl, gateForm, gateInput, gateError;

function unlockSite() {
  sessionStorage.setItem("sanctuary_unlocked", "true");
  document.body.classList.remove("locked");
  spawnHeartBurst(window.innerWidth / 2, window.innerHeight * 0.6, 26);
  startExperience();
}

// --- gate brute-force throttle (client-side; real enforcement lives in Supabase RLS + any edge rate limit) ---
var gateAttempts = 0, gateLockUntil = 0;
function gateThrottled() {
  var now = Date.now();
  if (now < gateLockUntil) return true;
  if (gateAttempts >= 5) { gateLockUntil = now + 30000; gateAttempts = 0; return true; }
  return false;
}

async function handleGateSubmit(e) {
  e.preventDefault();
  if (gateThrottled()) {
    gateError.textContent = "too many attempts — take a breath, 30s pause 🌸";
    gateError.classList.add("show");
    return;
  }
  var val = gateInput.value.slice(0, 128); // input length cap (sanitize user input)
  var hash = await sha256(val);
  if (hash === SANCTUARY_PASSWORD_HASH) {  // hash-only comparison — the old "paste-the-hash" bypass is removed
    gateError.classList.remove("show");
    if (HAS_GSAP && !REDUCED) {
      var tl = gsap.timeline({ onComplete: function () {
        gateEl.style.display = "none";
        unlockSite();
      }});
      tl.to(gateEl.querySelector(".gate-inner"), { y: -26, opacity: 0, duration: 0.7, ease: "power3.in" })
        .to(gateEl.querySelectorAll(".gate-corner"), { opacity: 0, duration: 0.4 }, "<")
        .to(gateEl, { opacity: 0, duration: 0.7, ease: "power2.inOut" });
    } else {
      gateEl.classList.add("open");
      setTimeout(function () { gateEl.style.display = "none"; unlockSite(); }, 900);
    }
  } else {
    gateAttempts++;
    gateError.classList.add("show");
    gateError.classList.remove("shake");
    void gateError.offsetWidth;
    gateError.classList.add("shake");
    gateInput.value = "";
    gateInput.focus();
  }
}

function initGate() {
  gateEl = document.getElementById("gate");
  gateForm = document.getElementById("gate-form");
  gateInput = document.getElementById("gate-input");
  gateError = document.getElementById("gate-error");
  gateForm.addEventListener("submit", handleGateSubmit);
  gateInput.focus();

  if (sessionStorage.getItem("sanctuary_unlocked") === "true") {
    gateEl.style.display = "none";
    document.body.classList.remove("locked");
    startExperience();
  }
}

// ============================================================
// 2 · SMOOTH SCROLL (Lenis)
// ============================================================
var lenis = null;

function initSmoothScroll() {
  if (typeof Lenis === "undefined" || REDUCED) return;
  lenis = new Lenis({ duration: 1.15, smoothWheel: true, touchMultiplier: 1.4 });
  lenis.on("scroll", ScrollTrigger.update);
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

// ============================================================
// 3 · DATA (Supabase with graceful fallbacks)
// ============================================================
var favoriteViews = [];
var currentViewIndex = 0;
var viewAutoTimer = null;

async function loadFavoriteViews() {
  favoriteViews = await fetchTable("favorite_views", "created_at", true, function (v) { return v; }, favoriteViews);
  if (!favoriteViews.length) favoriteViews = [defaultHeroFallback];
  renderHeroStack();
}

function renderHeroStack() {
  var stack = document.getElementById("hero-stack");
  if (!stack) return;
  stack.innerHTML = favoriteViews.map(function (v, i) {
    return '<div class="hero-layer' + (i === 0 ? " is-active" : "") + '">' +
      '<img src="' + escapeHtml(media(v.image_url || defaultHeroFallback.image_url)) + '" alt="" /></div>';
  }).join("");

  var quoteEl = document.querySelector(".hero-quote");
  if (quoteEl) {
    var v = favoriteViews[0];
    var meta = [v.badge || "My Favorite View", v.date || "Today"];
    if (v.sub_tag && v.sub_tag.trim()) meta.push(v.sub_tag.trim());
    if (v.floating_badge && v.floating_badge.trim()) meta.push(v.floating_badge.trim());
    quoteEl.innerHTML =
      '<span class="hero-quote-meta">' + meta.map(escapeHtml).join(" · ") + "</span>" +
      '<span class="hero-quote-text">“' + escapeHtml(v.quote || defaultHeroFallback.quote) + "”</span>";
    // without a scrub timeline the quote must be visible statically
    if (!HAS_GSAP || REDUCED) quoteEl.style.opacity = "1";
  }

  if (favoriteViews.length > 1) {
    buildStackMeta();
    startAutoAdvance();
  }
  refreshTriggers();
}

function buildStackMeta() {
  if (document.getElementById("hero-count")) return;
  var meta = document.createElement("div");
  meta.className = "hero-stack-meta";
  meta.innerHTML =
    '<button id="hero-prev" aria-label="Previous view">←</button>' +
    '<span id="hero-count">01 / ' + pad2(favoriteViews.length) + "</span>" +
    '<button id="hero-next" aria-label="Next view">→</button>';
  document.getElementById("hero").appendChild(meta);
  document.getElementById("hero-prev").addEventListener("click", function () { switchView(currentViewIndex - 1); });
  document.getElementById("hero-next").addEventListener("click", function () { switchView(currentViewIndex + 1); });
}

function switchView(idx) {
  currentViewIndex = ((idx % favoriteViews.length) + favoriteViews.length) % favoriteViews.length;
  var layers = document.querySelectorAll(".hero-layer");
  layers.forEach(function (l, i) { l.classList.toggle("is-active", i === currentViewIndex); });

  var v = favoriteViews[currentViewIndex];
  var quoteEl = document.querySelector(".hero-quote");
  if (quoteEl) {
    var meta = [v.badge || "My Favorite View", v.date || "Today"];
    if (v.sub_tag && v.sub_tag.trim()) meta.push(v.sub_tag.trim());
    if (v.floating_badge && v.floating_badge.trim()) meta.push(v.floating_badge.trim());
    quoteEl.innerHTML =
      '<span class="hero-quote-meta">' + meta.map(escapeHtml).join(" · ") + "</span>" +
      '<span class="hero-quote-text">“' + escapeHtml(v.quote || defaultHeroFallback.quote) + "”</span>";
  }

  var count = document.getElementById("hero-count");
  if (count) count.textContent = pad2(currentViewIndex + 1) + " / " + pad2(favoriteViews.length);

  if (HAS_GSAP && !REDUCED) {
    gsap.fromTo(quoteEl, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: "power2.out" });
    gsap.fromTo(layers[currentViewIndex], { opacity: 0 }, { opacity: 1, duration: 0.9, ease: "power2.out" });
  } else if (quoteEl) {
    quoteEl.style.opacity = "1";
  }
}

function startAutoAdvance() {
  if (viewAutoTimer || REDUCED) return;
  viewAutoTimer = setInterval(function () { switchView(currentViewIndex + 1); }, 8000);
}

// ---------- shared data loader (one fetch-fallback-map pattern, four tables) ----------
async function fetchTable(table, orderCol, ascending, mapRow, fallback) {
  if (supabaseClient) {
    try {
      var res = await supabaseClient.from(table).select("*").order(orderCol, { ascending: ascending });
      if (!res.error && res.data && res.data.length > 0) {
        return res.data.map(mapRow);
      }
    } catch (err) { console.warn(table + " fallback:", err); }
  }
  return fallback;
}

// ---------- memories ----------
async function loadMemories() {
  var memories = await fetchTable("memories", "date", false, function (m) {
    return { title: m.title, date: m.date, tag: m.tag || "Memory",
             image: m.image_url || "assets/img/memory1.jpg", caption: m.caption || m.title };
  }, fallbackMemories);
  renderMemories(memories);
}

function renderMemories(memories) {
  var track = document.getElementById("mem-track");
  if (!track) return;
  var tilts = [-2.2, 1.8, -1.4, 2.4, -1.8, 1.2];
  var html = memories.map(function (m, i) {
    var tilt = tilts[i % tilts.length];
    return '<div class="mem-panel">' +
      '<div class="mem-card">' +
        '<div class="mem-frame" style="--tilt:' + tilt + 'deg">' +
          '<img src="' + escapeHtml(media(m.image)) + '" alt="' + escapeHtml(m.title) + '" loading="lazy" />' +
          '<span class="mem-tag">' + escapeHtml(m.tag || "Memory") + "</span>" +
        "</div>" +
        '<div class="mem-meta">' +
          '<p class="mem-date">' + escapeHtml(formatDisplayDate(m.date)) + "</p>" +
          '<h3 class="mem-title">' + escapeHtml(m.title) + "</h3>" +
          '<p class="mem-caption">“' + escapeHtml(m.caption) + "”</p>" +
        "</div>" +
      "</div></div>";
  });
  track.insertAdjacentHTML("beforeend", html.join(""));
  refreshTriggers();
}

// ---------- dreams ----------
async function loadDreams() {
  var dreams = await fetchTable("dreams", "created_at", false, function (d) {
    return { title: d.title, emoji: d.emoji || "✨", tag: d.tag || "Dream",
             desc: d.description || "", image: d.image_url || "assets/img/babieee.jpg" };
  }, fallbackDreams);
  renderDreams(dreams);
}

function renderDreams(dreams) {
  var list = document.getElementById("dream-list");
  if (!list) return;
  list.innerHTML = dreams.map(function (d, i) {
    return '<div class="dream-row" data-dream="' + i + '">' +
      '<div class="dream-media"><span class="dream-emoji">' + escapeHtml(d.emoji) + "</span>" +
        '<img src="' + escapeHtml(media(d.image)) + '" alt="' + escapeHtml(d.title) + '" loading="lazy" /></div>' +
      '<div class="dream-text">' +
        '<p class="dream-tag">' + escapeHtml(d.tag) + "</p>" +
        '<h3 class="dream-title">' + escapeHtml(d.title) + "</h3>" +
        '<p class="dream-desc">' + escapeHtml(d.desc) + "</p>" +
        '<p class="dream-manifest">manifesting together</p>' +
      "</div></div>";
  }).join("");
  refreshTriggers();
}

// ---------- scene 4 polaroid companion ----------
// Quotes are CLICK-driven (arrows / tapping the card) — scrolling never
// changes them. The polaroid photo simply changes whenever the quote does:
// one photo per quote, cycling through the reel.
var notePolaroids = [
  { src: "assets/img/biryani.jpg", tilt: -4 },
  { src: "assets/img/red-hat.jpg", tilt: 3 },
  { src: "assets/img/cute-stuff.jpg", tilt: -3 },
  { src: "assets/img/park.jpg", tilt: 4 },
  { src: "assets/img/noice.jpg", tilt: -5 },
  { src: "assets/img/yellow-hat.jpg", tilt: 2 }
];

var polaroidReelBuilt = false;

function buildPolaroidReel() {
  var reel = document.getElementById("polaroid-reel");
  if (!reel || polaroidReelBuilt) return;
  reel.innerHTML = notePolaroids.map(function (p, i) {
    return '<div class="polaroid-slide' + (i === 0 ? " is-current" : "") + '">' +
      '<img src="' + escapeHtml(media(p.src)) + '" alt="" />' +
      "</div>";
  }).join("");
  polaroidReelBuilt = true;
}

// warm the image cache so photo swaps never flash empty
function preloadNotePolaroids() {
  notePolaroids.forEach(function (p) { var im = new Image(); im.src = p.src; });
}

// polaroid photo changes whenever the quote changes (one photo per quote, cycling)
function swapNotePolaroid(quoteIdx) {
  var reel = document.getElementById("polaroid-reel");
  if (!reel || !notePolaroids.length) return;
  var idx = ((quoteIdx % notePolaroids.length) + notePolaroids.length) % notePolaroids.length;
  var slides = reel.querySelectorAll(".polaroid-slide");
  if (!slides.length) return;
  slides.forEach(function (s, i) { s.classList.toggle("is-current", i === idx); });
  var offset = -100 * idx; // one full frame per slide
  if (HAS_GSAP && !REDUCED) {
    gsap.to(reel, { xPercent: offset, duration: 0.7, ease: "power3.inOut" });
  } else {
    reel.style.transform = "translateX(" + offset + "%)";
  }
}

// ---------- songs ----------
var player = null;

function initPlayer() {
  var audio = new Audio();
  audio.preload = "auto";
  audio.volume = 0.7;
  player = { audio: audio, queue: [], index: 0, playing: false };

  var btnPlay = document.getElementById("btn-play");
  btnPlay.addEventListener("click", function () { player.playing ? pauseTrack() : playCurrent(); });
  document.getElementById("btn-next").addEventListener("click", nextTrack);
  document.getElementById("btn-prev").addEventListener("click", prevTrack);
  document.getElementById("seek").addEventListener("input", function (e) {
    if (audio.duration) audio.currentTime = (e.target.value / 100) * audio.duration;
  });

  audio.addEventListener("timeupdate", updateSeekUI);
  audio.addEventListener("ended", nextTrack);
  audio.addEventListener("error", function () {
    if (player.playing) { player.playing = false; syncPlayUI(); }
  });

  loadSongs();
}

async function loadSongs() {
  var songs = await fetchTable("songs", "created_at", true, function (s) {
    return { title: s.title, artist: s.artist, src: s.url };
  }, fallbackSongs);
  player.queue = songs;
  renderPlaylist();
  updateNowPlaying();
}

function renderPlaylist() {
  var ol = document.getElementById("playlist");
  ol.innerHTML = player.queue.map(function (s, i) {
    return '<li data-i="' + i + '">' +
      '<span class="num">' + pad2(i + 1) + "</span>" +
      "<div><p class=\"pt-title\">" + escapeHtml(s.title) + '</p><p class="pt-artist">' + escapeHtml(s.artist) + "</p></div></li>";
  }).join("");
  ol.querySelectorAll("li").forEach(function (li) {
    li.addEventListener("click", function () {
      player.index = parseInt(li.dataset.i, 10);
      playTrack(player.index);
    });
  });
}

function playCurrent() {
  if (!player.queue.length) return;
  playTrack(player.index);
}

function playTrack(i) {
  if (!player.queue[i]) return;
  player.index = i;
  var s = player.queue[i];
  player.audio.src = media(s.src);
  player.audio.play().then(function () {
    player.playing = true;
    syncPlayUI();
  }).catch(function () {
    player.playing = false;
    syncPlayUI();
  });
  updateNowPlaying();
  renderPlaylistState();
}

function pauseTrack() {
  player.audio.pause();
  player.playing = false;
  syncPlayUI();
  renderPlaylistState();
}

function nextTrack() {
  if (!player.queue.length) return;
  playTrack((player.index + 1) % player.queue.length);
}

function prevTrack() {
  if (!player.queue.length) return;
  playTrack((player.index - 1 + player.queue.length) % player.queue.length);
}

function updateNowPlaying() {
  var s = player.queue[player.index];
  if (!s) return;
  document.getElementById("track-title").textContent = s.title;
  document.getElementById("track-artist").textContent = s.artist;
  renderPlaylistState();
}

function renderPlaylistState() {
  document.querySelectorAll("#playlist li").forEach(function (li, i) {
    li.classList.toggle("active", i === player.index);
  });
  var num = document.querySelector("#playlist li.active .num");
  if (num) num.textContent = player.playing ? "▶" : pad2(player.index + 1);
}

function syncPlayUI() {
  document.getElementById("icon-play").classList.toggle("hidden", player.playing);
  document.getElementById("icon-pause").classList.toggle("hidden", !player.playing);
  document.getElementById("disc").classList.toggle("playing", player.playing);
  renderPlaylistState();
}

function fmtTime(sec) {
  if (!sec || isNaN(sec)) return "0:00";
  var m = Math.floor(sec / 60);
  var s = Math.floor(sec % 60);
  return m + ":" + pad2(s);
}

function updateSeekUI() {
  var a = player.audio;
  if (!a.duration) return;
  document.getElementById("seek").value = (a.currentTime / a.duration) * 100;
  document.getElementById("t-cur").textContent = fmtTime(a.currentTime);
  document.getElementById("t-dur").textContent = fmtTime(a.duration);
}

// ============================================================
// 4 · NOTES DECK (affirmations)
// ============================================================
var noteIndex = 0;
var noteAnimating = false;

function showNote(i, animate) {
  var card = document.getElementById("note-card");
  var textEl = document.getElementById("note-text");
  var prev = noteIndex;
  noteIndex = ((i % wholesomeAffirmations.length) + wholesomeAffirmations.length) % wholesomeAffirmations.length;

  function apply() {
    textEl.textContent = "“" + wholesomeAffirmations[noteIndex] + "”";
    document.getElementById("note-count").textContent =
      pad2(noteIndex + 1) + " / " + pad2(wholesomeAffirmations.length);
    if (noteIndex !== prev) swapNotePolaroid(noteIndex); // photo changes WITH the quote
  }

  if (HAS_GSAP && animate && !REDUCED && !noteAnimating) {
    noteAnimating = true;
    gsap.timeline({ onComplete: function () { noteAnimating = false; } })
      .to(card, { rotateX: 6, y: -14, opacity: 0, duration: 0.28, ease: "power2.in" })
      .add(apply)
      .fromTo(card, { rotateX: -6, y: 18, opacity: 0 },
        { rotateX: 0, y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
  } else {
    apply();
  }
}

function initNotes() {
  showNote(0, false);

  // click-to-advance quotes: arrows + clicking the card itself (nothing changes on scroll)
  var prevBtn = document.getElementById("note-prev");
  var nextBtn = document.getElementById("note-next");
  if (prevBtn) prevBtn.addEventListener("click", function () { showNote(noteIndex - 1, true); });
  if (nextBtn) nextBtn.addEventListener("click", function () { showNote(noteIndex + 1, true); });
  var cardEl = document.getElementById("note-card");
  if (cardEl) cardEl.addEventListener("click", function (e) {
    if (e.target.closest("button")) return;
    var r = cardEl.getBoundingClientRect();
    showNote(e.clientX < r.left + r.width / 2 ? noteIndex - 1 : noteIndex + 1, true);
  });

  document.getElementById("hug-open").addEventListener("click", function () {
    document.getElementById("hug-overlay").classList.add("open");
    spawnHeartBurst(window.innerWidth / 2, window.innerHeight * 0.5, 18);
  });
  document.getElementById("hug-close").addEventListener("click", closeHug);
  document.getElementById("hug-warm").addEventListener("click", function () {
    closeHug();
    spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2, 30);
  });
  // ←/→ keys change the quote too — but only while the notes scene is on screen
  var notesVisible = !("IntersectionObserver" in window);
  if ("IntersectionObserver" in window) {
    new IntersectionObserver(function (entries) {
      notesVisible = entries[0].isIntersecting;
    }, { threshold: 0.2 }).observe(document.getElementById("notes"));
  }
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") { closeHug(); return; }
    if (!notesVisible || document.getElementById("hug-overlay").classList.contains("open")) return;
    if (e.key === "ArrowRight") showNote(noteIndex + 1, true);
    else if (e.key === "ArrowLeft") showNote(noteIndex - 1, true);
  });
}

function closeHug() {
  document.getElementById("hug-overlay").classList.remove("open");
}

// ============================================================
// 5 · SCROLL STORY (GSAP ScrollTrigger)
// ============================================================
function buildScrollStory() {
  if (!HAS_GSAP || REDUCED) return;

  // ----- hero: pin + cinematic zoom into the cover -----
  var heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: "#hero", start: "top top", end: "+=120%",
      pin: true, scrub: 1, anticipatePin: 1
    }
  });
  heroTl.to("#hero-zoom", { scale: 1.35, ease: "power1.inOut" }, 0)
    .to("#hero-copy", { scale: 0.92, opacity: 0, y: -70, ease: "power2.in" }, 0)
    .to(".hero-scroll-cue", { opacity: 0, ease: "none" }, 0)
    .fromTo(".hero-quote", { opacity: 0, y: 26 }, { opacity: 1, y: 0, ease: "power2.out" }, 0.45);

  // ----- interlude: word-by-word scrub reveal -----
  var it = document.getElementById("interlude-text");
  var words = it.textContent.trim().split(/\s+/);
  it.innerHTML = words.map(function (w) { return '<span class="w">' + escapeHtml(w) + "</span>"; }).join(" ");
  gsap.fromTo(it.querySelectorAll(".w"),
    { opacity: 0.07, y: 26 },
    {
      opacity: 1, y: 0, stagger: 0.06, ease: "none",
      scrollTrigger: { trigger: "#interlude", start: "top 72%", end: "bottom 58%", scrub: 0.6 }
    });

  // ----- memories: pinned horizontal reel -----
  var track = document.getElementById("mem-track");
  var getDist = function () { return Math.max(0, track.scrollWidth - window.innerWidth); };
  gsap.to(track, {
    x: function () { return -getDist(); },
    ease: "none",
    scrollTrigger: {
      trigger: "#memories", start: "top top",
      end: function () { return "+=" + getDist(); },
      pin: true, scrub: 1, anticipatePin: 1, invalidateOnRefresh: true
    }
  });

  // ----- notes: reveal polaroid on arrival (quotes are click-driven, never scroll-driven) -----
  var polaroid = document.getElementById("note-polaroid");
  if (polaroid) {
    // open: unfold + straighten when the section arrives
    gsap.fromTo(polaroid,
      { opacity: 0, rotate: -14, scale: 0.7, y: 40 },
      {
        opacity: 1, rotate: -4, scale: 1, y: 0, duration: 0.9, ease: "back.out(1.7)",
        scrollTrigger: { trigger: "#notes", start: "top 60%" }
      }
    );
    // soften away once you leave the section (both directions)
    ScrollTrigger.create({
      trigger: "#notes", start: "top 45%", end: "bottom 70%",
      onLeave: function () { gsap.to(polaroid, { opacity: 0, scale: 0.85, duration: 0.4 }); },
      onLeaveBack: function () { gsap.to(polaroid, { opacity: 0, scale: 0.85, duration: 0.4 }); },
      onEnter: function () { gsap.to(polaroid, { opacity: 1, scale: 1, duration: 0.5 }); },
      onEnterBack: function () { gsap.to(polaroid, { opacity: 1, scale: 1, duration: 0.5 }); }
    });
  }

  // ----- dreams: editorial reveals + image parallax -----
  gsap.utils.toArray(".dream-row").forEach(function (row) {
    gsap.from(row, {
      opacity: 0, y: 70, duration: 1.1, ease: "power3.out",
      scrollTrigger: { trigger: row, start: "top 82%" }
    });
    var img = row.querySelector("img");
    gsap.fromTo(img, { yPercent: -7 }, {
      yPercent: 7, ease: "none",
      scrollTrigger: { trigger: row, start: "top bottom", end: "bottom top", scrub: true }
    });
  });

  // ----- music: gentle rise -----
  gsap.from(".player", {
    opacity: 0, y: 60, duration: 1.1, ease: "power3.out",
    scrollTrigger: { trigger: "#music", start: "top 65%" }
  });

  // ----- finale: floating photo parallax + copy reveal -----
  gsap.utils.toArray(".finale-photo").forEach(function (ph, i) {
    gsap.to(ph, {
      yPercent: i % 2 === 0 ? -18 : 14,
      ease: "none",
      scrollTrigger: { trigger: "#finale", start: "top bottom", end: "bottom top", scrub: true }
    });
  });
  gsap.from(".finale-copy > *", {
    opacity: 0, y: 40, duration: 1, stagger: 0.12, ease: "power3.out",
    scrollTrigger: { trigger: "#finale", start: "top 55%" }
  });
  gsap.from(".site-foot", {
    opacity: 0, duration: 1.2,
    scrollTrigger: { trigger: "#finale", start: "top 30%" }
  });

  // ----- chrome: chapter name + progress bar -----
  var chapters = [
    ["#hero", "SCENE 01 — THE BEGINNING"],
    ["#interlude", "SCENE 02 — WHY YOU"],
    ["#memories", "SCENE 03 — THE MEMORY BOX"],
    ["#notes", "SCENE 04 — FOR THE LOW DAYS"],
    ["#dreams", "SCENE 05 — WHAT WE'RE BUILDING"],
    ["#music", "SCENE 06 — THE SOUNDTRACK"],
    ["#finale", "FINAL SCENE — FOREVER"]
  ];
  chapters.forEach(function (ch) {
    ScrollTrigger.create({
      trigger: ch[0], start: "top 50%", end: "bottom 50%",
      onEnter: setChapter, onEnterBack: setChapter, id: ch[0]
    });
    function setChapter() {
      var el = document.getElementById("chrome-chapter");
      if (el && el.textContent !== ch[1]) el.textContent = ch[1];
    }
  });

  gsap.to("#progress-bar", {
    scaleX: 1, ease: "none",
    scrollTrigger: { trigger: "#film", start: "top top", end: "bottom bottom", scrub: 0.3 }
  });

  ScrollTrigger.refresh();
}

// ============================================================
// 6 · HEARTS CANVAS
// ============================================================
var heartsCanvas = document.getElementById("hearts");
var hctx = heartsCanvas ? heartsCanvas.getContext("2d") : null;
var hearts = [];
var HEART_COLORS = ["#f65d8e", "#ff8fb3", "#e0426f", "#ffc2d6"];

function resizeHearts() {
  if (!heartsCanvas) return;
  heartsCanvas.width = window.innerWidth;
  heartsCanvas.height = window.innerHeight;
}
window.addEventListener("resize", resizeHearts);
resizeHearts();

function spawnHeartBurst(x, y, count) {
  for (var i = 0; i < count; i++) {
    hearts.push({
      x: x + (Math.random() - 0.5) * 60,
      y: y + (Math.random() - 0.5) * 40,
      size: Math.random() * 14 + 9,
      color: HEART_COLORS[Math.floor(Math.random() * HEART_COLORS.length)],
      vx: (Math.random() - 0.5) * 2.4,
      vy: -(Math.random() * 2.6 + 1.6),
      life: 0,
      maxLife: 60 + Math.random() * 30
    });
  }
}

window.addEventListener("click", function (e) {
  if (e.target.closest("button") || e.target.closest("a") || e.target.closest("input") ||
      e.target.closest(".hug-overlay") || e.target.closest("#gate")) return;
  spawnHeartBurst(e.clientX, e.clientY, 5);
});

function renderHearts() {
  if (!hctx) return;
  hctx.clearRect(0, 0, heartsCanvas.width, heartsCanvas.height);
  for (var i = hearts.length - 1; i >= 0; i--) {
    var h = hearts[i];
    h.x += h.vx;
    h.y += h.vy;
    h.vy += 0.015; // gentle gravity drift
    h.life++;
    hctx.save();
    hctx.globalAlpha = Math.max(0, 1 - h.life / h.maxLife);
    hctx.fillStyle = h.color;
    hctx.font = h.size + "px serif";
    hctx.fillText("❤", h.x, h.y);
    hctx.restore();
    if (h.life >= h.maxLife) hearts.splice(i, 1);
  }
  requestAnimationFrame(renderHearts);
}
if (hctx) renderHearts();

// ============================================================
// 7 · ADMIN ACCESS — triple-click the SANCTUARY logo
// ============================================================
var clickCount = 0, clickTimer = null;
document.getElementById("chrome-logo").addEventListener("click", function () {
  clickCount++;
  clearTimeout(clickTimer);
  clickTimer = setTimeout(function () { clickCount = 0; }, 700);
  if (clickCount >= 3) {
    clickCount = 0;
    window.location.href = "admin.html";
  }
});

// ============================================================
// 8 · INIT
// ============================================================
var experienceStarted = false;

function refreshTriggers() {
  if (HAS_GSAP && experienceStarted) ScrollTrigger.refresh();
}

function startExperience() {
  if (experienceStarted) return;
  experienceStarted = true;

  initSmoothScroll();

  // finale photo collage
  var finale = document.getElementById("finale-photos");
  var srcs = ["assets/img/memory1.jpg", "assets/img/memory2.jpg", "assets/img/memory3.jpg", "assets/img/cover.jpg", "assets/img/biryani.jpg", "assets/img/cute-stuff.jpg", "assets/img/noice.jpg", "assets/img/park.jpg", "assets/img/red-hat.jpg", "assets/img/yellow-hat.jpg"];
  if (finale && !finale.childElementCount) {
    finale.innerHTML = srcs.map(function (s) {
      return '<div class="finale-photo"><img src="' + s + '" alt="" loading="lazy" /></div>';
    }).join("");
  }

  // hero title entrance — immediately, never wait on the network
  if (HAS_GSAP && !REDUCED) {
    gsap.to(".hero-title .line > span", { y: 0, duration: 1.3, ease: "power4.out", stagger: 0.14, delay: 0.35 });
    gsap.from("#hero-copy .scene-label", { opacity: 0, y: 12, duration: 1, delay: 0.2 });
  } else {
    document.querySelectorAll(".hero-title .line > span").forEach(function (s) { s.style.transform = "none"; });
  }

  // scene 4 polaroid reel must exist BEFORE the scroll story builds its triggers
  buildPolaroidReel();
  preloadNotePolaroids();

  // scroll story first (trigger distances recalc when data renders)
  buildScrollStory();

  initNotes();
  initPlayer();
  loadFavoriteViews();
  loadDreams();
  loadMemories();

  // re-measure once all images have settled
  window.addEventListener("load", function () {
    if (HAS_GSAP) ScrollTrigger.refresh();
  });
}

document.addEventListener("DOMContentLoaded", function () {
  initGate();
});
