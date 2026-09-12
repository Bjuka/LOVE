/* ============================================================
   SANCTUARY — media path resolver
   Single source of truth for image/audio locations.
   - maps legacy bare filenames ("cover.jpg") to assets/img/
   - maps legacy audio names (spaces/&) to slugged files
   - passes through absolute URLs, storage URLs and data: URIs
   Loaded before config.js; used by script.js and admin.js.
   ============================================================ */
(function () {
  "use strict";

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

  function resolveMedia(url) {
    if (!url || typeof url !== "string") return url;
    if (/^(https?:)?\/\//i.test(url) || url.indexOf("data:") === 0 || url.charAt(0) === "/") return url;
    var clean = url.trim().toLowerCase();
    if (IMG[clean] === 1) return "assets/img/" + clean;
    var a = AUDIO[clean];
    if (a) return "assets/audio/" + (a === 1 ? clean : a);
    return url; // unknown name → leave untouched
  }

  window.SANCTUARY_MEDIA = { resolve: resolveMedia };
})();
