/* ============================================================
   SANCTUARY — media resolver + Supabase Storage loader
   ------------------------------------------------------------
   All binaries (photos + audio) live in Supabase Storage — the
   repo ships zero image/audio files. This module is the single
   source of truth for turning a stored media reference into a
   fetchable URL.

   Reference formats understood everywhere (DB rows, fallbacks):
     • storage path   "photos/site/cover.jpg" · "music/song.mp3"
     • legacy repo    "assets/img/cover.jpg"  (auto-mapped, so old
                       DB rows and old backups keep working)
     • bare legacy    "memory1.jpg" · "you & i.mp3"
     • absolute URLs  https://… · data: URIs (passthrough)

   Access model (privacy!):
     • photos bucket = PRIVATE → short-lived SIGNED urls, minted
       with the signed-in user's JWT (RLS: authenticated read).
       warm(token) is called by auth.js right after login/restore
       so first paint never flashes.
     • music bucket  = PUBLIC  → permanent object URLs (playlist).

   Public API (script.js + admin.js):
     SANCTUARY_MEDIA.resolve(u)        sync legacy→assets path (old contract)
     await SANCTUARY_MEDIA.url(u)      → Promise<fetchable URL>
     await SANCTUARY_MEDIA_URLS(list, field)   patch objects in place
     SANCTUARY_MEDIA.warm(jwt)         prime signed urls after login
   ============================================================ */
(function () {
  "use strict";

  // ---- legacy filename tables (kept so pre-migration DB rows still load) ----
  var IMG = {
    "cover.jpg": 1, "memory1.jpg": 1, "memory2.jpg": 1, "memory3.jpg": 1,
    "babieee.jpg": 1, "dream2.jpg": 1, "biryani.jpg": 1, "cute-stuff.jpg": 1,
    "noice.jpg": 1, "park.jpg": 1, "red-hat.jpg": 1, "yellow-hat.jpg": 1
  };

  var AUDIO = {
    "accidently in love.mp3": "accidently-in-love.mp3",
    "accidently-in-love.mp3": 1,
    "make you mine.mp3": "make-you-mine.mp3",
    "make-you-mine.mp3": 1,
    "you & i.mp3": "you-and-i.mp3",
    "you and i.mp3": "you-and-i.mp3",
    "you-and-i.mp3": 1
  };

  // config is read LAZILY: this file loads BEFORE env.js on the page,
  // so window.SANCTUARY_CFG does not exist yet at script-parse time.
  function supabaseUrl() {
    var c = window.SANCTUARY_CFG || {};
    return String(c.supabaseUrl || "").replace(/\/+$/, "");
  }
  function anonKey() {
    var c = window.SANCTUARY_CFG || {};
    return c.supabaseAnonKey || "";
  }

  var BUCKET_RE = /^(photos|music)\//; // "photos/site/cover.jpg"
  var SIGN_TTL = 86400;                // signed-url lifetime (24h — survives a long film night)

  var TOKEN = null;                    // signed-in user's access token
  var urlCache = {};                   // path → { url, exp }
  var inflight = {};                   // path → Promise<url>

  function isLegacyRef(u) {
    var raw = String(u || "");
    var clean = raw.trim().toLowerCase();
    return !!(IMG[clean] || AUDIO[clean] || /^assets\/(img|audio)\//i.test(raw));
  }

  // legacy repo path / bare name → storage path (so pre-migration DB rows keep working)
  function legacyToStorage(url) {
    var clean = String(url).trim().toLowerCase();
    var a = AUDIO[clean];
    if (a) return "music/" + (a === 1 ? clean : a);
    if (IMG[clean] === 1) return "photos/site/" + clean;
    var m = clean.match(/assets\/(?:img|audio)\/([^\/]+)$/);
    if (m) {
      var name = m[1];
      if (/\.(mp3|wav|m4a)$/.test(name)) {
        name = name.replace(/&/g, "and").replace(/\s+/g, "-"); // legacy spaces/"&" → slugged upload name
        return "music/" + name;
      }
      return "photos/site/" + name;
    }
    return null; // unknown legacy ref — leave untouched
  }

  // ---------- 1. sync resolver — same contract as the old media.js ----------
  function resolveMedia(url) {
    if (!url || typeof url !== "string") return url;
    if (/^(https?:)?\/\//i.test(url) || url.indexOf("data:") === 0 || url.charAt(0) === "/" || BUCKET_RE.test(url)) return url;
    var clean = url.trim().toLowerCase();
    if (IMG[clean] === 1) return "assets/img/" + clean;
    var a = AUDIO[clean];
    if (a) return "assets/audio/" + (a === 1 ? clean : a);
    return url;
  }

  // ---------- 2. signed-url minting (private photos bucket) ----------
  function signPath(path) {
    var base = supabaseUrl();
    if (!TOKEN || !base) {
      // No session yet (or Supabase down): return the bare object URL.
      // The browser will fail this request; warm(jwt) re-primes after login.
      return Promise.resolve(base + "/storage/v1/object/" + path);
    }
    return fetch(base + "/storage/v1/object/sign/" + path, {
      method: "POST",
      headers: { apikey: anonKey(), Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" },
      body: JSON.stringify({ expiresIn: SIGN_TTL })
    }).then(function (r) {
      if (!r.ok) throw new Error("sign failed: HTTP " + r.status);
      return r.json();
    }).then(function (j) {
      var u = base + "/storage/v1" + (j.signedURL || ("/object/sign/" + (j.signedPath || path)));
      urlCache[path] = { url: u, exp: Date.now() + (SIGN_TTL - 120) * 1000 };
      return u;
    }).catch(function () {
      return base + "/storage/v1/object/" + path; // graceful degradation
    });
  }

  // ---------- 3. async URL for one reference ----------
  function urlFor(url) {
    if (!url || typeof url !== "string") return Promise.resolve(url);
    if (isLegacyRef(url)) {
      var mapped = legacyToStorage(url);
      if (mapped) url = mapped;                               // legacy → storage path
      else return Promise.resolve(resolveMedia(url));         // unknown legacy ref
    }
    if (/^(https?:)?\/\//i.test(url) || url.indexOf("data:") === 0) return Promise.resolve(url);
    if (!BUCKET_RE.test(url) || !supabaseUrl()) return Promise.resolve(url);

    var now = Date.now();
    var hit = urlCache[url];
    if (hit && hit.exp > now + 120000) return Promise.resolve(hit.url);
    if (inflight[url]) return inflight[url];

    if (url.indexOf("music/") === 0) {                        // public bucket: permanent URL
      var pub = supabaseUrl() + "/storage/v1/object/public/" + url;
      urlCache[url] = { url: pub, exp: now + 350e3 };
      return Promise.resolve(pub);
    }
    inflight[url] = signPath(url).then(function (u) { delete inflight[url]; return u; },
                                       function (e) { delete inflight[url]; throw e; });
    return inflight[url];
  }

  // ---------- 4. patch a list of objects in place: SANCTUARY_MEDIA_URLS(rows, "image_url") ----------
  function patchAll(list, field) {
    var arr = Array.isArray(list) ? list : [list];
    return Promise.all(arr.map(function (item) {
      if (!item || !item[field]) return null;
      return urlFor(item[field]).then(function (u) { if (u) item[field] = u; return item; });
    })).then(function () { return list; });
  }

  // ---------- 5. warm() — auth.js calls this right after login/restore ----------
  function warm(token) {
    TOKEN = token || null;
    if (!TOKEN) return;
    // prime every known site photo so first render is instant
    Object.keys(IMG).forEach(function (name) { urlFor("photos/site/" + name); });
  }

  window.SANCTUARY_MEDIA = { resolve: resolveMedia, url: urlFor, warm: warm };
  window.SANCTUARY_MEDIA_URLS = patchAll;
})();
