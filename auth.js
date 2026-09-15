/* ============================================================
   SANCTUARY · auth.js — shared Supabase Auth layer
   ------------------------------------------------------------

   How it works:
   • Identity labels come from window.SANCTUARY_CFG.siteUsers
     (generated into env.js from the SITE_USERS env var).
   • Signing in calls supabase.auth.signInWithPassword — the
     password is checked by Supabase Auth, never by this site.
   • The role lives in the user's app_metadata.role inside
     Supabase ("admin" or "viewer") — set via SQL in
     supabase-policies.sql (section 8) or the Auth dashboard.
     app_metadata can only be changed server-side, so viewers
     cannot promote themselves.
   • Sessions persist per browser TAB (sessionStorage), matching
     the site's existing "unlock" behaviour, and auto-refresh.
   • A legacy SHA-256 passcode fallback is included so the gate
     still opens if Supabase Auth is unreachable (fail-open to
     view-only; no admin rights without a real Supabase session).

   Load order: media.js → env.js → config.js → vendor/supabase.js
               → auth.js → (script.js | admin.js)
   ============================================================ */

(function () {
  "use strict";

  var cfg = window.SANCTUARY_CFG || {};

  // ---------- 1. Dedicated auth client (per-tab sessions) ----------
  // Kept separate from the content client so the film pages never
  // inherit an authenticated session they don't need.
  var authClient = (window.supabase && cfg.supabaseUrl && cfg.supabaseAnonKey)
    ? window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          storage: window.sessionStorage, // per-tab, like sanctuary_unlocked
          storageKey: "sanctuary_auth_tab"
        }
      })
    : null;

  // ---------- 2. Session state ----------
  var state = {
    user: null,        // supabase user object when signed in
    role: null,        // "admin" | "viewer" | null
    label: null,       // display name: "for babieee" | "aryan" | "admin"
    legacy: false,     // true when unlocked via the legacy passcode fallback
    legacyAdmin: false // legacy unlock that came through the Control Room (owner) — grants edit
  };

  var ROLE_META = {
    admin: { label: "admin", canEdit: true },
    viewer: { label: "viewer", canEdit: false }
  };

  function labelForUser(user) {
    if (!user) return null;
    var users = cfg.siteUsers || [];
    for (var i = 0; i < users.length; i++) {
      if (String(users[i].email).toLowerCase() === String(user.email || "").toLowerCase()) {
        return users[i].label;
      }
    }
    // user exists in Supabase but isn't in SITE_USERS — show email prefix
    return String(user.email || "guest").split("@")[0];
  }

  function roleFromUser(user) {
    if (!user) return null;
    var meta = user.app_metadata || {};
    var role = meta.role || (meta.roles && meta.roles[0]) || "viewer";
    return role === "admin" ? "admin" : "viewer"; // whitelist — never trust unknown values
  }

  // ---------- 3. Public API ----------
  var SANCTUARY_AUTH = {
    /** true when the gate can be passed this session */
    isUnlocked: function () {
      return !!(state.user || state.legacy);
    },
    /** "admin" | "viewer" | "legacy" | null */
    getRole: function () {
      return state.user ? state.role : (state.legacy ? "legacy" : null);
    },
    /** display name for the signed-in identity */
    getLabel: function () {
      return state.legacy ? "guest" : state.label;
    },
    /** edit power: a real Supabase admin session, OR the Control-Room legacy
     *  master passcode (site owner). The film-page legacy fallback is view-only. */
    canEdit: function () {
      return !!(state.user && state.role === "admin") || !!(state.legacy && state.legacyAdmin);
    },
    /** read power: any signed-in identity (or legacy unlock) */
    canView: function () {
      return this.isUnlocked();
    },

    /** the three identity chips for the gate, [{ label, email }] */
    getIdentities: function () {
      return (cfg.siteUsers || []).slice(0, 6);
    },

    /** Sign in with the selected identity. Resolves { ok, error, identity } */
    signIn: function (email, password) {
      var self = this;
      if (!authClient) {
        return Promise.resolve({ ok: false, error: "auth-unavailable", message: "Authentication service is not configured." });
      }
      return authClient.auth.signInWithPassword({
        email: String(email || "").trim().toLowerCase(),
        password: String(password || "")
      }).then(function (res) {
        if (res.error) {
          return { ok: false, error: res.error.status === 400 ? "bad-credentials" : res.error.message, message: res.error.message };
        }
        var user = res.data && res.data.user;
        state.user = user;
        state.role = roleFromUser(user);
        state.label = labelForUser(user);
        state.legacy = false;
        return { ok: true, identity: { role: state.role, label: state.label, canEdit: self.canEdit() } };
      }).catch(function (err) {
        return { ok: false, error: "network", message: (err && err.message) || "Network error" };
      });
    },

    /** Legacy SHA-256 passcode fallback (same hash as before).
     *  asAdmin=true only from the Control Room (no-identities mode = site owner). */
    signInLegacy: function (passcode, expectedHash, asAdmin) {
      var self = this;
      if (!expectedHash) {
        return Promise.resolve({ ok: false, error: "legacy-disabled", message: "Legacy passcode is disabled." });
      }
      return sha256(passcode).then(function (hash) {
        if (hash !== expectedHash) return { ok: false, error: "bad-credentials", message: "Wrong passcode" };
        state.legacy = true;
        state.legacyAdmin = !!asAdmin;
        state.user = null;
        state.role = null;
        state.label = "guest";
        return { ok: true, identity: { role: self.canEdit() ? "admin" : "legacy", label: self.getLabel(), canEdit: self.canEdit() } };
      }).catch(function () {
        return { ok: false, error: "network", message: "Could not verify passcode" };
      });
    },

    /** Synchronously kill every local trace of a session — no network,
     *  no awaits. Safe to call right before a navigation/reload. */
    hardClearSession: function () {
      state = { user: null, role: null, label: null, legacy: false, legacyAdmin: false };
      try {
        sessionStorage.removeItem("sanctuary_auth_tab");
        sessionStorage.removeItem("sanctuary_unlocked");
        sessionStorage.removeItem("sanctuary_role");
        sessionStorage.removeItem("sanctuary_identity");
        sessionStorage.removeItem("sanctuary_admin_auth");
      } catch (e) {}
      try {
        // sweep any legacy supabase-js sessions left by older builds
        Object.keys(window.localStorage).forEach(function (k) {
          if (/^sb-.*-auth-token$/.test(k) || k.indexOf("supabase.auth") !== -1) {
            window.localStorage.removeItem(k);
          }
        });
      } catch (e2) {}
    },

    /** Clear this tab's session: local wipe FIRST (synchronous), then the
     *  optional server-side revoke in the background. */
    signOut: function () {
      this.hardClearSession();
      var p = authClient ? authClient.auth.signOut() : Promise.resolve();
      return p.catch(function () { /* already signed out */ });
    },
    // (restore() never revives a legacy unlock — Supabase sessions only.)

    /** Restore session after a page refresh (same tab). */
    restore: function () {
      var self = this;
      if (!authClient) return Promise.resolve(null);
      return authClient.auth.getSession().then(function (res) {
        var session = res && res.data && res.data.session;
        if (!session || !session.user) return null;
        state.user = session.user;
        state.role = roleFromUser(session.user);
        state.label = labelForUser(session.user);
        state.legacy = false;
        return { role: state.role, label: state.label, canEdit: self.canEdit() };
      }).catch(function () { return null; });
    },

    /** Low-level client for admin.js write calls (always the SAME client). */
    client: function () { return authClient; },

    debugLog: function () {
      if (cfg.debug && window.console && console.log.apply) {
        console.log.apply(console, ["[AUTH]"].concat([].slice.call(arguments)));
      }
    }
  };

  // ---------- 4. Shared SHA-256 helper (same as script.js/admin.js) ----------
  function sha256(message) {
    if (!window.crypto || !crypto.subtle) return Promise.resolve(String(message).trim());
    var buf = crypto.subtle.digest("SHA-256", new TextEncoder().encode(String(message).trim()));
    return Promise.resolve(buf).then(function (d) {
      return Array.from(new Uint8Array(d)).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
    });
  }

  window.SANCTUARY_AUTH = SANCTUARY_AUTH;
})();
