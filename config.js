/* ============================================================
   SANCTUARY · secure edition — runtime configuration loader
   ------------------------------------------------------------
   HOW THE SECRETS WORK NOW:
   1. `env.js` (gitignored) is generated from `env.example.js`
      by `node api/generate-env.js` — it injects window.SANCTUARY_CONFIG.
   2. This loader validates the config and exposes window.SANCTUARY_CFG.
   3. No Supabase URL / anon key / password hash lives in source control.
   4. For real secret hygiene, move the anon key server-side
      (see api/config.js + /api/* proxies) — the browser only ever
      receives short-lived session cookies, never service keys.
   ============================================================ */

(function () {
  "use strict";

  var LOCAL_HOSTS = ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"];
  function isLocalHost() {
    return LOCAL_HOSTS.indexOf(location.hostname) !== -1 || location.protocol === "file:";
  }

  // ---------- 1. HTTPS enforcement (client side) ----------
  // vercel.json also sends HSTS; this catches local misconfigurations.
  if (location.protocol === "http:" && !isLocalHost()) {
    location.replace("https://" + location.host + location.pathname + location.search + location.hash);
    return;
  }

  // ---------- 2. Read injected config ----------
  var injected = window.SANCTUARY_CONFIG || {};
  var missing = [];

  function need(key) {
    if (!injected[key]) missing.push(key);
    return injected[key] || "";
  }

  var cfg = {
    supabaseUrl: need("SUPABASE_URL"),
    supabaseAnonKey: need("SUPABASE_ANON_KEY"),
    passwordHash: need("SANCTUARY_PASSWORD_HASH"),
    debug: injected.DEBUG === true,
    deployedAt: injected.DEPLOYED_AT || null
  };

  // ---------- 3. Production checks (fail fast & loud in dev, quiet fail in prod) ----------
  function isProd() {
    return !isLocalHost() && location.protocol === "https:";
  }

  if (missing.length) {
    var msg = "[SANCTUARY] Missing required configuration: " + missing.join(", ") +
      ". Generate env.js from env.example.js (run: node api/generate-env.js).";
    if (isProd()) {
      // Never dump internals to visitors in production.
      document.documentElement.innerHTML = "<body style=\"font-family:sans-serif;display:grid;place-items:center;height:100vh;margin:0;background:#fff7f9;color:#47262f;text-align:center\"><div><h1>Sanctuary</h1><p>This screening is temporarily closed. Please try again soon.</p></div></body>";
      throw new Error("Configuration error"); // details stay in the thrown error, not on screen
    }
    console.error(msg);
  }

  if (cfg.debug && isProd()) {
    console.warn("[SANCTUARY] DEBUG=true in production — disabling debug mode automatically.");
    cfg.debug = false;
  }

  if (cfg.debug) {
    console.info("[SANCTUARY] Debug mode ON — verbose logs enabled (local only).");
  }

  if (cfg.supabaseUrl && location.protocol === "https:" && cfg.supabaseUrl.indexOf("https://") !== 0) {
    console.error("[SANCTUARY] Supabase URL must use HTTPS.");
    cfg.supabaseUrl = "";
  }

  window.SANCTUARY_CFG = cfg;
  window.SANCTUARY_DEBUG = cfg.debug;
})();
