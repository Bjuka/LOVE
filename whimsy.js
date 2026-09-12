/* ============================================================
   SANCTUARY — whimsy layer · "Scrapbook Valentine"
   Pure decoration on top of the film. Never blocks clicks,
   never touches existing elements' transforms, and goes
   completely quiet for prefers-reduced-motion users.
   ============================================================ */
(function () {
  "use strict";

  var REDUCED = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (REDUCED) return; // the film already respects the setting; we stay out of the way

  /* ---------- tiny helpers ---------- */
  function el(tag, cls, parent) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    n.setAttribute("aria-hidden", "true");
    if (parent) parent.appendChild(n);
    return n;
  }

  /* ============================================================
     1 · HEART TRAIL — the cursor leaves little blooming hearts
     ============================================================ */
  var HEARTS = ["❤", "🩷", "♡"];
  var lastX = -99, lastY = -99, MIN_DIST = 34;

  function spawnHeart(x, y) {
    var h = el("span", "whimsy-heart", document.body);
    h.textContent = HEARTS[Math.floor(Math.random() * HEARTS.length)];
    h.style.left = x + "px";
    h.style.top = y + "px";
    var size = 10 + Math.random() * 10;
    var drift = (Math.random() - 0.5) * 34;
    var spin = (Math.random() - 0.5) * 40;
    h.style.fontSize = size + "px";
    h.style.setProperty("--dx", drift.toFixed(1) + "px");
    h.style.setProperty("--rot", spin.toFixed(1) + "deg");
    // self-destruct after the bloom finishes
    setTimeout(function () { if (h.parentNode) h.parentNode.removeChild(h); }, 1100);
  }

  window.addEventListener("pointermove", function (e) {
    // ignore touch (no persistent cursor there; avoids confetti during scroll)
    if (e.pointerType && e.pointerType !== "mouse") return;
    var dx = e.clientX - lastX, dy = e.clientY - lastY;
    if (dx * dx + dy * dy < MIN_DIST * MIN_DIST) return;
    lastX = e.clientX; lastY = e.clientY;
    spawnHeart(e.clientX, e.clientY);
  }, { passive: true });

  /* ============================================================
     2 · BREATHING AURORA — the rose air slowly inhales/exhales
     (CSS does the work; JS only confirms the layer exists)
     ============================================================ */
  var air = document.querySelector(".rose-air");
  if (air) air.classList.add("rose-air--alive");

  /* ============================================================
     3 · PRESSED-FLOWER CORNERS — every polaroid gets tiny
     botanical corners + a second piece of tape, like a real
     scrapbook page. Applied to anything already on the page and
     to future polaroids (the note reel renders later).
     ============================================================ */
  function dressPolaroid(p) {
    if (p.dataset.whimsyDressed) return;
    p.dataset.whimsyDressed = "1";
    el("i", "whimsy-corner whimsy-corner--tl", p);
    el("i", "whimsy-corner whimsy-corner--br", p);
    var tape = el("i", "whimsy-tape", p);
    tape.style.transform = "rotate(" + ((Math.random() - 0.5) * 8 - 2).toFixed(1) + "deg)";
  }
  function dressAll(root) {
    (root || document).querySelectorAll(".polaroid:not([data-whimsy-dressed]), .note-polaroid:not([data-whimsy-dressed])").forEach(dressPolaroid);
  }
  dressAll();

  // note polaroids + any future renders
  var noteBox = document.getElementById("note-polaroid");
  if (noteBox) {
    var mo = new MutationObserver(function () { dressAll(noteBox); });
    mo.observe(noteBox, { childList: true, subtree: true });
  }

  /* ============================================================
     4 · PETAL RAIN — when the finale arrives, the air fills
     with soft falling petals. Starts once, stops when you
     scroll back above the finale.
     ============================================================ */
  var petalTimer = null, finale = document.getElementById("finale");
  var PETALS = ["🌸", "🌷", "🌸", "❀"];

  function spawnPetal() {
    if (!document.body) return;
    var p = el("span", "whimsy-petal", document.body);
    p.textContent = PETALS[Math.floor(Math.random() * PETALS.length)];
    p.style.left = (Math.random() * 100) + "vw";
    p.style.fontSize = (9 + Math.random() * 9) + "px";
    var dur = 6 + Math.random() * 5;
    p.style.setProperty("--fall-dur", dur + "s");
    p.style.setProperty("--sway", (18 + Math.random() * 26).toFixed(0) + "px");
    p.style.setProperty("--spin", ((Math.random() - 0.5) * 240).toFixed(0) + "deg");
    setTimeout(function () { if (p.parentNode) p.parentNode.removeChild(p); }, (dur + 1) * 1000);
  }

  function petalsOn() {
    if (petalTimer) return;
    petalTimer = setInterval(spawnPetal, 420);
    spawnPetal(); // first one right away
  }
  function petalsOff() {
    if (!petalTimer) return;
    clearInterval(petalTimer);
    petalTimer = null;
  }

  if (finale && "IntersectionObserver" in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) { en.isIntersecting ? petalsOn() : petalsOff(); });
    }, { threshold: 0.15 });
    io.observe(finale);
  }
})();
