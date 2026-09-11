/* ============================================================
   SANCTUARY — cinematic edition
   gate · smooth scroll · GSAP ScrollTrigger story · supabase
   ============================================================ */

// ==================== CONFIG ====================
var SUPABASE_URL = "https://idlhbjoxxskzmvzrhjpb.supabase.co";
var SUPABASE_ANON_KEY = "sb_publishable_0NiaQQkwoIcttLrvBEzAqg_t5vaBgAY";
var SANCTUARY_PASSWORD_HASH = "7ad938a2c26edc6be22bcb1c2b17e1140c40257e2e2ec052db5bcee7f66aba08";

var supabaseClient = window.supabase
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
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
var defaultHeroFallback = {
  image_url: "cover.jpg",
  badge: "My Favorite View",
  date: "Today",
  sub_tag: "",
  floating_badge: "",
  quote: "No matter where life takes us, my heart will always beat for you."
};

var fallbackMemories = [
  { title: "What makes me happy?", date: "2026-03-13", tag: "MINEEE 💍", image: "memory1.jpg",
    caption: "Every moment with you makes me feel special beacause you feel like a long lost part of me which makes me complete 💕💕" },
  { title: "My Cute Babieeee", date: "2025-12-12", tag: "Special dayyy 🍷", image: "memory2.jpg",
    caption: "Whenever im with you, im never alone. you make me feel so happy like im some celebrity but tbh, i just want to be YOURS ❤️" },
  { title: "Ummmmmah", date: "2026-08-14", tag: "Goofy Moments 🤪", image: "memory3.jpg",
    caption: "You brings out the kid in me (idk the date😭)" }
];

var fallbackDreams = [
  { title: "My Second Love", emoji: "❤️", tag: "Our little cuteness",
    desc: "Our daughter will look like this and we will be the best parents anyone can ever wish for ❤️❤️", image: "babieee.jpg" },
  { title: "Together and Forever", emoji: "🌻🌻", tag: "Our Goal",
    desc: "No matter what happens, we stay together, we fight together and we fix together cuz you're my wifey and i love you the most. just like this💕", image: "dream2.jpg" }
];

var fallbackSongs = [
  { title: "Accidently in LOVE", artist: "Counting Crows", src: "Accidently in Love.mp3" },
  { title: "Make you MINE", artist: "PUBLIC", src: "Make you MINE.mp3" },
  { title: "You & I", artist: "One Direection", src: "You & I.mp3" }
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

async function handleGateSubmit(e) {
  e.preventDefault();
  var val = gateInput.value;
  var hash = await sha256(val);
  if (hash === SANCTUARY_PASSWORD_HASH || val.trim() === SANCTUARY_PASSWORD_HASH) {
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
  if (supabaseClient) {
    try {
      var res = await supabaseClient.from("favorite_views").select("*").order("created_at", { ascending: true });
      if (!res.error && res.data && res.data.length > 0) favoriteViews = res.data;
    } catch (err) { console.warn("favorite_views fallback:", err); }
  }
  if (!favoriteViews.length) favoriteViews = [defaultHeroFallback];
  renderHeroStack();
}

function renderHeroStack() {
  var stack = document.getElementById("hero-stack");
  if (!stack) return;
  stack.innerHTML = favoriteViews.map(function (v, i) {
    return '<div class="hero-layer' + (i === 0 ? " is-active" : "") + '">' +
      '<img src="' + escapeHtml(v.image_url || defaultHeroFallback.image_url) + '" alt="" /></div>';
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

// ---------- memories ----------
async function loadMemories() {
  var memories = fallbackMemories;
  if (supabaseClient) {
    try {
      var res = await supabaseClient.from("memories").select("*").order("date", { ascending: false });
      if (!res.error && res.data && res.data.length > 0) {
        memories = res.data.map(function (m) {
          return { title: m.title, date: m.date, tag: m.tag || "Memory",
                   image: m.image_url || "memory1.jpg", caption: m.caption || m.title };
        });
      }
    } catch (err) { console.warn("memories fallback:", err); }
  }
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
          '<img src="' + escapeHtml(m.image) + '" alt="' + escapeHtml(m.title) + '" loading="lazy" />' +
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
  var dreams = fallbackDreams;
  if (supabaseClient) {
    try {
      var res = await supabaseClient.from("dreams").select("*").order("created_at", { ascending: false });
      if (!res.error && res.data && res.data.length > 0) {
        dreams = res.data.map(function (d) {
          return { title: d.title, emoji: d.emoji || "✨", tag: d.tag || "Dream",
                   desc: d.description || "", image: d.image_url || "babieee.jpg" };
        });
      }
    } catch (err) { console.warn("dreams fallback:", err); }
  }
  renderDreams(dreams);
}

function renderDreams(dreams) {
  var list = document.getElementById("dream-list");
  if (!list) return;
  list.innerHTML = dreams.map(function (d, i) {
    return '<div class="dream-row" data-dream="' + i + '">' +
      '<div class="dream-media"><span class="dream-emoji">' + escapeHtml(d.emoji) + "</span>" +
        '<img src="' + escapeHtml(d.image) + '" alt="' + escapeHtml(d.title) + '" loading="lazy" /></div>' +
      '<div class="dream-text">' +
        '<p class="dream-tag">' + escapeHtml(d.tag) + "</p>" +
        '<h3 class="dream-title">' + escapeHtml(d.title) + "</h3>" +
        '<p class="dream-desc">' + escapeHtml(d.desc) + "</p>" +
        '<p class="dream-manifest">manifesting together</p>' +
      "</div></div>";
  }).join("");
  refreshTriggers();
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
  var songs = fallbackSongs;
  if (supabaseClient) {
    try {
      var res = await supabaseClient.from("songs").select("*").order("created_at", { ascending: true });
      if (!res.error && res.data && res.data.length > 0) {
        songs = res.data.map(function (s) { return { title: s.title, artist: s.artist, src: s.url }; });
      }
    } catch (err) { console.warn("songs fallback:", err); }
  }
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
  player.audio.src = s.src;
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
  noteIndex = ((i % wholesomeAffirmations.length) + wholesomeAffirmations.length) % wholesomeAffirmations.length;

  function apply() {
    textEl.textContent = "“" + wholesomeAffirmations[noteIndex] + "”";
    document.getElementById("note-count").textContent =
      pad2(noteIndex + 1) + " / " + pad2(wholesomeAffirmations.length);
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

  document.getElementById("hug-open").addEventListener("click", function () {
    document.getElementById("hug-overlay").classList.add("open");
    spawnHeartBurst(window.innerWidth / 2, window.innerHeight * 0.5, 18);
  });
  document.getElementById("hug-close").addEventListener("click", closeHug);
  document.getElementById("hug-warm").addEventListener("click", function () {
    closeHug();
    spawnHeartBurst(window.innerWidth / 2, window.innerHeight / 2, 30);
  });
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape") closeHug();
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

  // ----- notes: scrub-cycled affirmation deck -----
  ScrollTrigger.create({
    trigger: "#notes", start: "top 25%", end: "bottom 65%", scrub: true,
    onUpdate: function (self) {
      var target = Math.min(Math.floor(self.progress * wholesomeAffirmations.length), wholesomeAffirmations.length - 1);
      if (target !== noteIndex) showNote(target, true);
    }
  });

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
var HEART_COLORS = ["#e07a8b", "#d3a578", "#b85c6e", "#f3eee9"];

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
  var srcs = ["memory1.jpg", "memory2.jpg", "memory3.jpg", "cover.jpg"];
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
