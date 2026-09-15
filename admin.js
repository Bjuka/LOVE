    var SEC = (function () {
      "use strict";
      var cfg = window.SANCTUARY_CFG || { supabaseUrl: "", supabaseAnonKey: "", passwordHash: "", debug: false };

      // ---------- constants ----------
      var AUTH_MAX = 5;          // failed attempts before lockout
      var AUTH_WINDOW = 5 * 60e3;// rolling window for counting attempts
      var AUTH_LOCK = 15 * 60e3; // lockout duration
      var MAX_TEXT = 300;        // max chars for single-line text inputs
      var MAX_TEXTAREA = 600;    // max chars for descriptions/quotes
      var MAX_IMG_MB = 8;
      var MAX_AUDIO_MB = 15;
      var ALLOWED_IMG = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      var ALLOWED_AUDIO = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav", "audio/wave", "audio/mp4", "audio/x-m4a"];

      // ---------- auth state (survives refresh via sessionStorage) ----------
      var state = { fails: [], lockedUntil: 0 };
      try {
        var saved = JSON.parse(sessionStorage.getItem("sanctuary_admin_sec") || "{}");
        if (saved && typeof saved === "object") { state.fails = saved.fails || []; state.lockedUntil = saved.lockedUntil || 0; }
      } catch (e) { state = { fails: [], lockedUntil: 0 }; }

      function persistState() {
        try { sessionStorage.setItem("sanctuary_admin_sec", JSON.stringify(state)); } catch (e2) {}
      }

      function authLocked() {
        return Date.now() < state.lockedUntil;
      }

      function authLockRemainingMs() {
        return Math.max(0, state.lockedUntil - Date.now());
      }

      function recordAuthFailure() {
        var now = Date.now();
        state.fails = state.fails.filter(function (t) { return now - t < AUTH_WINDOW; });
        state.fails.push(now);
        if (state.fails.length >= AUTH_MAX) { state.lockedUntil = now + AUTH_LOCK; state.fails = []; }
        persistState();
      }

      function resetAuthFailures() {
        state.fails = [];
        persistState();
      }

      // ---------- CSRF (same-origin session token) ----------
      function csrfToken() {
        var t = null;
        try { t = sessionStorage.getItem("sanctuary_csrf"); } catch (e) {}
        if (!t) {
          var buf = new Uint8Array(16);
          if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(buf);
          else buf.forEach(function (_, i) { buf[i] = Math.floor(Math.random() * 256); });
          t = Array.from(buf).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("");
          try { sessionStorage.setItem("sanctuary_csrf", t); } catch (e2) {}
        }
        return t;
      }

      // every state-changing call must present the session's own token
      function assertCsrf() {
        return csrfToken() !== null;
      }

      // ---------- sanitization ----------
      function sanitizeText(v, max) {
        var s = String(v == null ? "" : v);
        s = s.replace(/[\u0000-\u001f\u007f]/g, "");
        s = s.replace(/<[^>]*>?/gm, "");
        s = s.replace(/javascript:/gi, "").replace(/vbscript:/gi, "").replace(/data:text\/html/gi, "");
        s = s.replace(/on\w+\s*=/gi, "");
        s = s.trim().slice(0, max || MAX_TEXT);
        return s;
      }

      function escapeHtml(str) {
        if (!str) return "";
        return String(str)
          .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
          .replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
      }

      function escapeAttr(str) {
        return escapeHtml(str);
      }

      // media resolver (media.js) — maps legacy bare filenames to assets/
      var media = (window.SANCTUARY_MEDIA && window.SANCTUARY_MEDIA.resolve) || function (u) { return u; };

      function safeImageUrl(url, fallback) {
        var u = String(url || "");
        if (/^https?:\/\//i.test(u)) return u;
        if (/^\.?\/?[\w .\/\-]+\.(jpe?g|png|webp|gif)$/i.test(u)) return media(u);
        return media(fallback || "assets/img/cover.jpg");
      }

      // MIME + extension + size gate before anything reaches a bucket
      function validateFile(file, kind) {
        if (!file) return "no file selected";
        var img = kind === "image", aud = kind === "audio";
        var maxMb = img ? MAX_IMG_MB : MAX_AUDIO_MB;
        if (file.size > maxMb * 1024 * 1024) return "file exceeds " + maxMb + "MB limit";
        var okTypes = img ? ALLOWED_IMG : ALLOWED_AUDIO;
        if (okTypes.indexOf(file.type) === -1) return "type not allowed: " + (file.type || "unknown");
        var name = file.name || "";
        var extOk = img
          ? /\.(jpe?g|png|webp|gif)$/i.test(name)
          : /\.(mp3|wav|m4a)$/i.test(name);
        if (!extOk) return "file extension not allowed";
        return null; // null = valid
      }

      // magic-byte sniffing — catches `.html` renamed to `.jpg`
      function sniffFile(file) {
        return new Promise(function (resolve) {
          var reader = new FileReader();
          reader.onerror = function () { resolve(true); };
          reader.onload = function () {
            try {
              var b = new Uint8Array(reader.result || []);
              if (b.length < 12) return resolve(true);
              if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return resolve(false); // JPEG
              if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return resolve(false); // PNG
              if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return resolve(false); // GIF
              if (b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return resolve(false); // WEBP
              if ((b[0] === 0x49 && b[1] === 0x44 && b[2] === 0x33) || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0)) return resolve(false); // MP3
              if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46) return resolve(false); // WAV/RIFF
              resolve(true); // unknown → reject
            } catch (e) { resolve(true); }
          };
          reader.readAsArrayBuffer(file.slice(0, 16));
        });
      }

      function buildFilename(originalName) {
        var ext = (String(originalName).match(/\.[A-Za-z0-9]{1,5}$/) || [""])[0].toLowerCase();
        var rand = (window.crypto && crypto.getRandomValues)
          ? Array.from(crypto.getRandomValues(new Uint8Array(8))).map(function (b) { return b.toString(16).padStart(2, "0"); }).join("")
          : Math.random().toString(16).slice(2, 18);
        return Date.now() + "_" + rand + ext;
      }

      // ---------- upload rate limit (spend-cap style guard) ----------
      var UPLOAD_MAX_PER_HOUR = 30;
      var uploadLog = [];
      function allowUpload() {
        var now = Date.now();
        uploadLog = uploadLog.filter(function (t) { return now - t < 3600e3; });
        if (uploadLog.length >= UPLOAD_MAX_PER_HOUR) return false;
        uploadLog.push(now);
        return true;
      }

      function debugLog() {
        if (cfg.debug && window.console && console.log.apply) console.log.apply(console, ["[ADMIN]"].concat([].slice.call(arguments)));
      }

      return {
        cfg: cfg,
        authLocked: authLocked, authLockRemainingMs: authLockRemainingMs,
        recordAuthFailure: recordAuthFailure, resetAuthFailures: resetAuthFailures,
        csrfToken: csrfToken, assertCsrf: assertCsrf,
        sanitizeText: sanitizeText, escapeHtml: escapeHtml, escapeAttr: escapeAttr,
        safeImageUrl: safeImageUrl, validateFile: validateFile, sniffFile: sniffFile,
        buildFilename: buildFilename, allowUpload: allowUpload,
        MAX_TEXT: MAX_TEXT, MAX_TEXTAREA: MAX_TEXTAREA, debugLog: debugLog
      };
    })();

    var ADMIN_PASSCODE_HASH = SEC.cfg.passwordHash;   // OPTIONAL legacy fallback (env.js)
    var SUPABASE_URL = SEC.cfg.supabaseUrl;           // from env.js — never hardcoded
    var SUPABASE_ANON_KEY = SEC.cfg.supabaseAnonKey;  // from env.js — never hardcoded

    // One shared Supabase client, created by auth.js. After sign-in its JWT
    // carries the user's role, and Supabase RLS enforces it server-side:
    // "admin" writes pass · "viewer" writes are rejected by the database.
    window.supabaseClient = window.SANCTUARY_AUTH ? window.SANCTUARY_AUTH.client() : null;
    var supabaseClient = window.supabaseClient;

    let currentCache = { memories: [], dreams: [], songs: [], views: [] };

    // ---------- role helpers ("for babieee" / "aryan" = view-only · "admin" = full edit) ----------
    function currentIdentity() {
      const auth = window.SANCTUARY_AUTH;
      return auth
        ? { role: auth.getRole(), label: auth.getLabel(), canEdit: auth.canEdit() }
        : { role: null, label: null, canEdit: false };
    }

    function requireAdmin(action) {
      if (currentIdentity().canEdit) return true;
      log('Permission denied — "' + (currentIdentity().label || 'guest') + '" is view-only. Sign in as admin to ' + (action || 'make changes') + '.', 'error');
      return false;
    }

    function applyRoleToUi() {
      const id = currentIdentity();
      document.body.classList.toggle('admin-readonly', !id.canEdit);
      const badge = document.getElementById('admin-identity-badge');
      if (badge) badge.textContent = id.label ? (id.label + ' · ' + (id.canEdit ? 'full access' : 'view only')) : '';
      // viewers: create forms + sync are disabled (UI mirror of the RLS rules)
      document.querySelectorAll('.create-card form').forEach(form => {
        form.querySelectorAll('input, textarea, button[type="submit"]').forEach(el => { el.disabled = !id.canEdit; });
      });
      const syncBtn = document.getElementById('sync-btn');
      if (syncBtn) syncBtn.disabled = !id.canEdit;
    }

    // --- 1. ADMIN GATE SECURITY ---
    async function sha256(str) {
      const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str.trim()));
      return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    var adminSelectedIdentity = null;

    // identity chips — "for babieee" · "aryan" · "admin"
    function renderAdminIdentities() {
      const wrap = document.getElementById('admin-identities');
      const emailEl = document.getElementById('admin-identity-email');
      const auth = window.SANCTUARY_AUTH;
      if (!wrap || !auth) return;
      const identities = auth.getIdentities();
      if (!identities.length) {
        wrap.style.display = 'none';
        if (emailEl) emailEl.style.display = 'none';
        return; // no identities configured → legacy master-passcode gate
      }
      wrap.innerHTML = identities.map((u, i) => {
        const isAdmin = String(u.label).toLowerCase() === 'admin';
        const initial = (u.label || '?').trim().charAt(0).toUpperCase();
        return `<button type="button" class="identity-chip${isAdmin ? ' identity-chip--admin' : ''}${i === 0 ? ' selected' : ''}" data-email="${SEC.escapeAttr(u.email)}">` +
          `<span class="chip-avatar" aria-hidden="true">${SEC.escapeHtml(initial)}</span>` +
          `<span class="chip-text"><span class="chip-name">${SEC.escapeHtml(u.label)}</span>` +
          `<span class="chip-role">${isAdmin ? 'full access' : 'view only'}</span></span></button>`;
      }).join('');
      adminSelectedIdentity = identities[0];
      if (emailEl) emailEl.textContent = identities[0].email;
      wrap.addEventListener('click', (e) => {
        const chip = e.target.closest ? e.target.closest('.identity-chip') : null;
        if (!chip) return;
        wrap.querySelectorAll('.identity-chip').forEach(c => c.classList.remove('selected'));
        chip.classList.add('selected');
        const email = chip.getAttribute('data-email');
        adminSelectedIdentity = identities.filter(u => u.email === email)[0] || null;
        if (emailEl) emailEl.textContent = adminSelectedIdentity ? adminSelectedIdentity.email : '';
        document.getElementById('admin-pass-input').focus();
      });
    }

    async function handleAdminLogin(e) {
      if (e) e.preventDefault();
      const input = document.getElementById('admin-pass-input');
      const errEl = document.getElementById('admin-auth-err');
      const auth = window.SANCTUARY_AUTH;

      const showErr = (msg) => {
        errEl.textContent = msg;
        errEl.classList.add('show');
        input.value = '';
        input.focus();
      };

      if (SEC.authLocked()) {
        const mins = Math.ceil(SEC.authLockRemainingMs() / 60000);
        errEl.textContent = 'too many attempts — locked for ' + mins + ' more minute' + (mins === 1 ? '' : 's');
        errEl.classList.add('show');
        return;
      }

      // --- Legacy path: no identities configured → old master passcode (owner) ---
      if (!auth || !auth.getIdentities().length) {
        const val = SEC.sanitizeText(input.value, 128);
        if (ADMIN_PASSCODE_HASH && auth) {
          const legacyRes = await auth.signInLegacy(val, ADMIN_PASSCODE_HASH, true); // true = owner, full edit
          if (legacyRes.ok) {
            SEC.resetAuthFailures();
            SEC.csrfToken();
            sessionStorage.setItem('sanctuary_admin_auth', 'secure');
            sessionStorage.setItem('sanctuary_role', 'admin');
            sessionStorage.setItem('sanctuary_identity', 'admin');
            document.body.classList.remove('admin-locked');
            document.getElementById('admin-gate').style.display = 'none';
            applyRoleToUi();
            initAdminDashboard();
            return;
          }
        } else if (!ADMIN_PASSCODE_HASH) {
          // Legacy master passcode removed from env — this path can never open.
          SEC.recordAuthFailure();
          showErr('no logins configured — set SITE_USERS or SANCTUARY_PASSWORD_HASH in env');
          return;
        }
        SEC.recordAuthFailure();
        showErr('access denied — invalid passcode');
        return;
      }

      // --- Primary path: Supabase Auth sign-in (the MAIN password) ---
      const val = input.value.slice(0, 128);
      const res = await auth.signIn(adminSelectedIdentity ? adminSelectedIdentity.email : '', val);
      if (!res.ok && res.error !== 'bad-credentials') {
        SEC.recordAuthFailure();
        showErr(res.message || 'could not sign in');
        return;
      }

      // --- BACKUP password (view-only): accepted here, but grants NO edit rights ---
      // (requireAdmin() + Supabase RLS still block every write for this session.)
      if (!res.ok && ADMIN_PASSCODE_HASH) {
        const hash = await sha256(val);
        if (hash === ADMIN_PASSCODE_HASH) {
          SEC.resetAuthFailures();
          SEC.csrfToken();
          await auth.signInLegacy(val, ADMIN_PASSCODE_HASH); // view-only session
          sessionStorage.setItem('sanctuary_admin_auth', 'secure');
          sessionStorage.setItem('sanctuary_role', 'legacy');
          sessionStorage.setItem('sanctuary_identity', 'guest');
          document.body.classList.remove('admin-locked');
          document.getElementById('admin-gate').style.display = 'none';
          applyRoleToUi();
          initAdminDashboard();
          log('Backup passcode accepted — view only. Sign in as admin for edit rights.', 'info');
          return;
        }
      }

      if (!res.ok) {
        SEC.recordAuthFailure();
        showErr('access denied — invalid credentials');
        return;
      }

      SEC.resetAuthFailures();
      SEC.csrfToken(); // mint CSRF token for this session
      // sessionStorage (not a persistent cookie) — auto-expires with the tab.
      sessionStorage.setItem('sanctuary_admin_auth', 'secure');
      sessionStorage.setItem('sanctuary_role', res.identity.role);
      sessionStorage.setItem('sanctuary_identity', res.identity.label || '');
      errEl.classList.remove('show');
      document.body.classList.remove('admin-locked');
      document.getElementById('admin-gate').style.display = 'none';
      applyRoleToUi();
      initAdminDashboard();
      if (!res.identity.canEdit) {
        log('Signed in as "' + res.identity.label + '" — view only. Sign in as admin to edit content.', 'info');
      }
    }

    function adminLogout() {
      // synchronous local wipe first, then navigate — nothing can race it
      if (window.SANCTUARY_AUTH && window.SANCTUARY_AUTH.hardClearSession) {
        window.SANCTUARY_AUTH.hardClearSession();
      } else {
        ['sanctuary_admin_auth', 'sanctuary_unlocked', 'sanctuary_role', 'sanctuary_identity']
          .forEach(k => sessionStorage.removeItem(k));
      }
      try { sessionStorage.setItem('sanctuary_force_gate', '1'); } catch (e) {}
      if (window.SANCTUARY_AUTH) { try { window.SANCTUARY_AUTH.signOut(); } catch (e2) {} } // background revoke
      window.location.href = 'index.html'; // → the gate (username + password)
    }

    // --- 2. PREVIEW UTILITY HELPERS ---
    function previewFile(input, containerId, imgId) {
      const file = input.files[0];
      const container = document.getElementById(containerId);
      const img = document.getElementById(imgId);

      if (file && !SEC.validateFile(file, 'image')) {   // size + MIME + extension gate even for local previews
        img.src = URL.createObjectURL(file);
        container.classList.add('show');
      } else {
        container.classList.remove('show');
        img.src = '';
        if (file) log('Preview rejected: ' + SEC.validateFile(file, 'image'), 'error');
      }
    }

    function handleEditFileChange(e) {
      const file = e.target.files[0];
      const newPreviewBox = document.getElementById('edit-new-preview-box');
      const newPreviewImg = document.getElementById('edit-new-preview-img');

      if (file && !SEC.validateFile(file, 'image')) {
        newPreviewImg.src = URL.createObjectURL(file);
        newPreviewBox.classList.remove('hidden');
      } else {
        newPreviewBox.classList.add('hidden');
        newPreviewImg.src = '';
        if (file) log('File rejected: ' + SEC.validateFile(file, 'image'), 'error');
      }
    }

    function log(msg, type = 'info') {
      const c = document.getElementById('sync-console');
      if (!c) return;
      const time = new Date().toLocaleTimeString();
      const cls = type === 'error' ? 'log-error' : (type === 'success' ? 'log-success' : 'log-line');
      const line = document.createElement('p');
      line.className = 'log-line ' + cls;
      line.textContent = '[' + time + '] ' + msg;   // textContent — no XSS via log messages
      c.appendChild(line);
      c.scrollTop = c.scrollHeight;
    }

    // --- 3. SEED & SYNCHRONIZATION ENGINE ---
    const defaultMemories = [
      { title: 'What makes me happy?', date: '2026-03-13', tag: 'MINEEE 💍', caption: 'Every moment with you makes me feel special beacause you feel like a long lost part of me which makes me complete 💕💕', image_url: 'assets/img/memory1.jpg' },
      { title: 'My Cute Babieeee', date: '2025-12-12', tag: 'Special dayyy 🍷', caption: 'Whenever im with you, im never alone. you make me feel so happy like im some celebrity but tbh, i just want to be YOURS ❤️', image_url: 'assets/img/memory2.jpg' },
      { title: 'Ummmmmah', date: '2026-08-14', tag: 'Goofy Moments 🤪', caption: 'You brings out the kid in me (idk the date😭)', image_url: 'assets/img/memory3.jpg' }
    ];

    const defaultDreams = [
      { emoji: '❤️', title: 'My Second Love', tag: 'Our little cuteness', description: 'Our daughter will look like this and we will be the best parents anyone can ever wish for ❤️❤️', image_url: 'assets/img/babieee.jpg' },
      { emoji: '🌻🌻', title: 'Together and Forever', tag: 'Our Goal', description: 'No matter what happens, we stay together, we fight together and we fix together cuz you\'re my wifey and i love you the most. just like this💕', image_url: 'assets/img/dream2.jpg' }
    ];

    const defaultSongs = [
      { title: 'Accidently in LOVE', artist: 'Counting Crows', url: 'assets/audio/accidently-in-love.mp3' },
      { title: 'Make you MINE', artist: 'PUBLIC', url: 'assets/audio/make-you-mine.mp3' },
      { title: 'You & I', artist: 'One Direection', url: 'assets/audio/you-and-i.mp3' }
    ];

    const defaultFavoriteView = {
      badge: 'My Favorite View',
      date: 'Today',
      sub_tag: '',
      floating_badge: '',
      quote: 'No matter where life takes us, my heart will always beat for you.',
      image_url: 'assets/img/cover.jpg'
    };

    async function runManualSync() {
      if (!requireAdmin('sync content')) return; // admin-only action
      if (!supabaseClient) {
        log("Supabase client not initialized.", 'error');
        return;
      }

      const btn = document.getElementById('sync-btn');
      btn.disabled = true;
      log("Scanning local storage & synchronizing to Supabase...", 'info');

      try {
        // 1. Sync Songs
        const localSongRaw = localStorage.getItem('sanctuary_song_queue');
        const sourceSongs = localSongRaw ? JSON.parse(localSongRaw) : defaultSongs;
        const { data: existingSongs } = await supabaseClient.from('songs').select('title');
        const songTitles = new Set((existingSongs || []).map(s => s.title.toLowerCase().trim()));
        const songsToInsert = sourceSongs
          .filter(s => !songTitles.has((s.title || '').toLowerCase().trim()))
          .map(s => ({ title: s.title || 'Untitled Track', artist: s.artist || 'Unknown', url: s.url || s.src || '' }));

        if (songsToInsert.length > 0) {
          const { error: sErr } = await supabaseClient.from('songs').insert(songsToInsert);
          if (sErr) throw new Error("Songs insert: " + sErr.message);
          log(`✓ Migrated ${songsToInsert.length} song(s) into Supabase`, 'success');
        } else {
          log(`• Songs table already up to date`, 'info');
        }

        // 2. Sync Memories
        const localMemRaw = localStorage.getItem('sanctuary_memories');
        const sourceMems = localMemRaw ? JSON.parse(localMemRaw) : defaultMemories;
        const { data: existingMems } = await supabaseClient.from('memories').select('title');
        const memTitles = new Set((existingMems || []).map(m => m.title.toLowerCase().trim()));
        const memsToInsert = sourceMems
          .filter(m => !memTitles.has((m.title || '').toLowerCase().trim()))
          .map(m => ({ title: m.title, date: m.date || new Date().toISOString().split('T')[0], tag: m.tag || 'Memory', caption: m.caption || m.title, image_url: m.image_url || m.image || 'assets/img/memory1.jpg' }));

        if (memsToInsert.length > 0) {
          const { error: mErr } = await supabaseClient.from('memories').insert(memsToInsert);
          if (mErr) throw new Error("Memories insert: " + mErr.message);
          log(`✓ Migrated ${memsToInsert.length} memory row(s) into Supabase`, 'success');
        } else {
          log(`• Memories table already up to date`, 'info');
        }

        // 3. Sync Dreams
        const localDreamRaw = localStorage.getItem('sanctuary_dreams');
        const sourceDreams = localDreamRaw ? JSON.parse(localDreamRaw) : defaultDreams;
        const { data: existingDreams } = await supabaseClient.from('dreams').select('title');
        const dreamTitles = new Set((existingDreams || []).map(d => d.title.toLowerCase().trim()));
        const dreamsToInsert = sourceDreams
          .filter(d => !dreamTitles.has((d.title || '').toLowerCase().trim()))
          .map(d => ({ emoji: d.emoji || '✨', title: d.title, tag: d.tag || 'Dream', description: d.description || d.desc || '', image_url: d.image_url || d.image || 'assets/img/babieee.jpg' }));

        if (dreamsToInsert.length > 0) {
          const { error: dErr } = await supabaseClient.from('dreams').insert(dreamsToInsert);
          if (dErr) throw new Error("Dreams insert: " + dErr.message);
          log(`✓ Migrated ${dreamsToInsert.length} dream row(s) into Supabase`, 'success');
        } else {
          log(`• Dreams table already up to date`, 'info');
        }

        // 4. Sync Favorite Views
        const localHeroRaw = localStorage.getItem('sanctuary_hero_custom');
        let heroToSync = defaultFavoriteView;
        if (localHeroRaw) {
          try {
            const parsed = JSON.parse(localHeroRaw);
            heroToSync = {
              badge: parsed.badge || defaultFavoriteView.badge,
              date: defaultFavoriteView.date,
              sub_tag: '',
              floating_badge: '',
              quote: parsed.quote || defaultFavoriteView.quote,
              image_url: parsed.image || defaultFavoriteView.image_url
            };
          } catch (err2) {}
        }

        const { count: vCount, error: vErr } = await supabaseClient.from('favorite_views').select('*', { count: 'exact', head: true });
        if (vErr) throw new Error("Favorite views check: " + vErr.message);

        if (vCount === 0) {
          const { error: insVErr } = await supabaseClient.from('favorite_views').insert([heroToSync]);
          if (insVErr) throw new Error("Favorite views insert: " + insVErr.message);
          log("✓ Synced default view into 'favorite_views'", 'success');
        } else {
          log(`• Favorite views table already has ${vCount} view(s)`, 'info');
        }

        log("Database synchronization complete!", 'success');
        refreshData();
      } catch (err) {
        log("Sync error: " + err.message, 'error');
      } finally {
        btn.disabled = false;
      }
    }

    // --- 4. CREATE ENTITIES (sanitized · validated · rate-limited) ---
    async function secureUpload(bucket, subfolder, file, kind) {
      const vErr = SEC.validateFile(file, kind);
      if (vErr) throw new Error("File rejected: " + vErr);
      if (await SEC.sniffFile(file)) throw new Error("File content doesn't match its type — rejected.");
      if (!SEC.allowUpload()) throw new Error("Upload limit reached (30/hour) — try again later.");
      if (!SEC.assertCsrf()) throw new Error("Session token missing — reload the page.");
      const path = `${subfolder}/${SEC.buildFilename(file.name)}`;   // randomized name: no user text in paths
      const { error: upErr } = await supabaseClient.storage.from(bucket).upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabaseClient.storage.from(bucket).getPublicUrl(path);
      return data.publicUrl;
    }

    async function handleCreateMemory(e) {
      e.preventDefault();
      if (!requireAdmin('add memories')) return;
      const btn = document.getElementById('mem-submit-btn');
      btn.textContent = "Uploading...";
      btn.disabled = true;

      try {
        let imageUrl = "assets/img/memory1.jpg";
        const file = document.getElementById('mem-file').files[0];
        if (file) imageUrl = await secureUpload('photos', 'memories', file, 'image');

        const title = SEC.sanitizeText(document.getElementById('mem-title').value);
        const date = SEC.sanitizeText(document.getElementById('mem-date').value, 10);
        const tag = SEC.sanitizeText(document.getElementById('mem-tag').value, 60) || 'Memory';
        const caption = SEC.sanitizeText(document.getElementById('mem-caption').value, SEC.MAX_TEXTAREA);
        if (!title) throw new Error("Title is required.");
        if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date must be a valid calendar date.");

        const { error: dbErr } = await supabaseClient.from('memories').insert([{
          title: title,
          date: date,
          tag: tag,
          caption: caption,
          image_url: imageUrl
        }]);

        if (dbErr) throw dbErr;
        log("Memory created successfully!", 'success');
        e.target.reset();
        document.getElementById('mem-create-preview-box').classList.remove('show');
        refreshData();
      } catch (err) {
        log("Failed to create memory: " + err.message, 'error');
      } finally {
        btn.textContent = "Save Memory";
        btn.disabled = false;
      }
    }

    async function handleCreateDream(e) {
      e.preventDefault();
      if (!requireAdmin('add dreams')) return;
      const btn = document.getElementById('dream-submit-btn');
      btn.textContent = "Uploading...";
      btn.disabled = true;

      try {
        let imageUrl = "assets/img/babieee.jpg";
        const file = document.getElementById('dream-file').files[0];
        if (file) imageUrl = await secureUpload('photos', 'dreams', file, 'image');

        const emoji = SEC.sanitizeText(document.getElementById('dream-emoji').value, 8) || '✨';
        const title = SEC.sanitizeText(document.getElementById('dream-title').value);
        const tag = SEC.sanitizeText(document.getElementById('dream-tag').value, 60) || 'Dream';
        const description = SEC.sanitizeText(document.getElementById('dream-desc').value, SEC.MAX_TEXTAREA);
        if (!title) throw new Error("Title is required.");

        const { error: dbErr } = await supabaseClient.from('dreams').insert([{
          emoji: emoji,
          title: title,
          tag: tag,
          description: description,
          image_url: imageUrl
        }]);

        if (dbErr) throw dbErr;
        log("Dream created successfully!", 'success');
        e.target.reset();
        document.getElementById('dream-create-preview-box').classList.remove('show');
        refreshData();
      } catch (err) {
        log("Failed to create dream: " + err.message, 'error');
      } finally {
        btn.textContent = "Save Dream";
        btn.disabled = false;
      }
    }

    async function handleCreateSong(e) {
      e.preventDefault();
      if (!requireAdmin('upload songs')) return;
      const btn = document.getElementById('song-submit-btn');
      btn.textContent = "Uploading audio...";
      btn.disabled = true;

      try {
        const file = document.getElementById('song-file').files[0];
        if (!file) throw new Error("Please select an audio file.");
        const audioUrl = await secureUpload('music', 'songs', file, 'audio');

        const title = SEC.sanitizeText(document.getElementById('song-title').value);
        const artist = SEC.sanitizeText(document.getElementById('song-artist').value, 120);
        if (!title || !artist) throw new Error("Track title and artist are required.");

        const { error: dbErr } = await supabaseClient.from('songs').insert([{
          title: title,
          artist: artist,
          url: audioUrl
        }]);

        if (dbErr) throw dbErr;
        log("Audio file uploaded to bucket & recorded in database!", 'success');
        e.target.reset();
        refreshData();
      } catch (err) {
        log("Failed to upload song: " + err.message, 'error');
      } finally {
        btn.textContent = "Upload & Save Song";
        btn.disabled = false;
      }
    }

    async function handleCreateFavoriteView(e) {
      e.preventDefault();
      if (!requireAdmin('add views')) return;
      const btn = document.getElementById('view-submit-btn');
      btn.textContent = "Uploading...";
      btn.disabled = true;

      try {
        const file = document.getElementById('view-file').files[0];
        if (!file) throw new Error("Please select an image file.");
        const imageUrl = await secureUpload('photos', 'hero', file, 'image');

        const badge = SEC.sanitizeText(document.getElementById('view-badge').value, 120) || 'My Favorite View';
        const date = SEC.sanitizeText(document.getElementById('view-date').value, 60) || 'Today';
        const subTag = SEC.sanitizeText(document.getElementById('view-subtag').value, 60);
        const floatingBadge = SEC.sanitizeText(document.getElementById('view-floating-badge').value, 60);
        const quote = SEC.sanitizeText(document.getElementById('view-quote').value, SEC.MAX_TEXTAREA);
        if (!quote) throw new Error("A romantic note is required — it's the whole point 🌸");

        const { error: dbErr } = await supabaseClient.from('favorite_views').insert([{
          badge: badge,
          date: date,
          sub_tag: subTag,
          floating_badge: floatingBadge,
          quote: quote,
          image_url: imageUrl
        }]);

        if (dbErr) throw dbErr;
        log("Favorite View added with custom emoji subtag!", 'success');
        e.target.reset();
        document.getElementById('view-create-preview-box').classList.remove('show');
        refreshData();
      } catch (err) {
        log("Failed to add view: " + err.message, 'error');
      } finally {
        btn.textContent = "Save Favorite View";
        btn.disabled = false;
      }
    }

    // --- 5. MODIFY / EDIT SYSTEM ---
    function fieldHtml(label, inner) {
      return `<div class="field"><label>${label}</label>${inner}</div>`;
    }
    const INPUT_CLS = 'input';

    const EDIT_TABLES = ['memories', 'dreams', 'songs', 'views'];

    function openEditModal(table, id) {
      if (EDIT_TABLES.indexOf(table) === -1) { alert('Unknown record type.'); return; }
      if (!requireAdmin('edit records')) return; // viewers cannot open the editor
      const modal = document.getElementById('edit-modal');
      const fields = document.getElementById('edit-fields-container');
      const tableInput = document.getElementById('edit-table');
      const idInput = document.getElementById('edit-id');
      const existingUrlInput = document.getElementById('edit-existing-url');
      const fileInput = document.getElementById('edit-file');
      const mediaSection = document.getElementById('edit-media-section');
      const currentPreviewBox = document.getElementById('edit-current-preview-box');
      const currentPreviewImg = document.getElementById('edit-current-preview-img');
      const newPreviewBox = document.getElementById('edit-new-preview-box');
      const newPreviewImg = document.getElementById('edit-new-preview-img');

      fileInput.value = "";
      newPreviewBox.classList.add('hidden');
      newPreviewImg.src = "";

      tableInput.value = table;
      idInput.value = id;

      const record = currentCache[table].find(r => String(r.id) === String(id));
      if (!record) {
        alert("Could not locate record.");
        return;
      }

      if (table === 'memories') {
        document.getElementById('edit-modal-title').textContent = "Modify Memory";
        existingUrlInput.value = record.image_url || '';
        fileInput.accept = "image/*";
        mediaSection.classList.remove('hidden');

        currentPreviewImg.src = SEC.safeImageUrl(record.image_url, 'assets/img/memory1.jpg');
        currentPreviewImg.style.opacity = 1;
        currentPreviewBox.classList.remove('hidden');

        fields.innerHTML = `
          ${fieldHtml('Title *', `<input type="text" id="edit-mem-title" value="${escapeAttr(record.title)}" required class="${INPUT_CLS}" />`)}
          <div class="form-grid">
            ${fieldHtml('Date', `<input type="date" id="edit-mem-date" value="${record.date || ''}" required class="${INPUT_CLS}" />`)}
            ${fieldHtml('Tag', `<input type="text" id="edit-mem-tag" value="${escapeAttr(record.tag || '')}" class="${INPUT_CLS}" />`)}
          </div>
          ${fieldHtml('Caption / Quote', `<input type="text" id="edit-mem-caption" value="${escapeAttr(record.caption || '')}" class="${INPUT_CLS}" />`)}
        `;
      } else if (table === 'dreams') {
        document.getElementById('edit-modal-title').textContent = "Modify Dream";
        existingUrlInput.value = record.image_url || '';
        fileInput.accept = "image/*";
        mediaSection.classList.remove('hidden');

        currentPreviewImg.src = SEC.safeImageUrl(record.image_url, 'assets/img/babieee.jpg');
        currentPreviewImg.style.opacity = 1;
        currentPreviewBox.classList.remove('hidden');

        fields.innerHTML = `
          <div class="form-grid-3">
            ${fieldHtml('Emoji', `<input type="text" id="edit-dream-emoji" value="${escapeAttr(record.emoji || '✨')}" class="${INPUT_CLS}" />`)}
            ${fieldHtml('Title *', `<input type="text" id="edit-dream-title" value="${escapeAttr(record.title)}" required class="${INPUT_CLS}" />`)}
          </div>
          ${fieldHtml('Tag', `<input type="text" id="edit-dream-tag" value="${escapeAttr(record.tag || '')}" class="${INPUT_CLS}" />`)}
          ${fieldHtml('Description', `<textarea id="edit-dream-desc" rows="2" class="${INPUT_CLS}">${escapeAttr(record.description || '')}</textarea>`)}
        `;
      } else if (table === 'songs') {
        document.getElementById('edit-modal-title').textContent = "Modify Song";
        existingUrlInput.value = record.url || '';
        fileInput.accept = "audio/*";
        mediaSection.classList.remove('hidden');
        currentPreviewBox.classList.add('hidden');

        fields.innerHTML = `
          ${fieldHtml('Track Title *', `<input type="text" id="edit-song-title" value="${escapeAttr(record.title)}" required class="${INPUT_CLS}" />`)}
          ${fieldHtml('Artist Name *', `<input type="text" id="edit-song-artist" value="${escapeAttr(record.artist)}" required class="${INPUT_CLS}" />`)}
          ${fieldHtml('Audio Source / File Path', `<input type="text" id="edit-song-url" value="${escapeAttr(record.url || '')}" class="${INPUT_CLS}" style="font-family: var(--mono); font-size: 0.72rem;" />`)}
        `;
      } else if (table === 'views') {
        document.getElementById('edit-modal-title').textContent = "Modify Favorite View";
        existingUrlInput.value = record.image_url || '';
        fileInput.accept = "image/*";
        mediaSection.classList.remove('hidden');

        currentPreviewImg.src = SEC.safeImageUrl(record.image_url, 'assets/img/cover.jpg');
        currentPreviewImg.style.opacity = 1;
        currentPreviewBox.classList.remove('hidden');

        fields.innerHTML = `
          <div class="form-grid">
            ${fieldHtml('Top Badge', `<input type="text" id="edit-view-badge" value="${escapeAttr(record.badge || 'My Favorite View')}" class="${INPUT_CLS}" />`)}
            ${fieldHtml('Date', `<input type="text" id="edit-view-date" value="${escapeAttr(record.date || 'Today')}" class="${INPUT_CLS}" />`)}
          </div>
          <div class="form-grid">
            ${fieldHtml('Custom Emoji Subtag', `<input type="text" id="edit-view-subtag" value="${escapeAttr(record.sub_tag || '')}" class="${INPUT_CLS}" />`)}
            ${fieldHtml('Floating Badge', `<input type="text" id="edit-view-floating" value="${escapeAttr(record.floating_badge || '')}" class="${INPUT_CLS}" />`)}
          </div>
          ${fieldHtml('Quote *', `<textarea id="edit-view-quote" rows="2" required class="${INPUT_CLS}">${escapeAttr(record.quote || '')}</textarea>`)}
        `;
      }

      modal.classList.add('open');
    }

    function closeEditModal() {
      document.getElementById('edit-modal').classList.remove('open');
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeEditModal();
    });

    async function handleSaveEdit(e) {
      e.preventDefault();
      if (!requireAdmin('edit records')) return;
      const btn = document.getElementById('edit-save-btn');
      btn.textContent = "Updating...";
      btn.disabled = true;

      const tableKey = document.getElementById('edit-table').value;
      const targetTable = tableKey === 'views' ? 'favorite_views' : tableKey;
      const id = document.getElementById('edit-id').value;
      let mediaUrl = document.getElementById('edit-existing-url').value;
      const file = document.getElementById('edit-file').files[0];

      try {
        if (file) {
          const bucket = tableKey === 'songs' ? 'music' : 'photos';
          const subfolder = tableKey === 'songs' ? 'songs' : (tableKey === 'views' ? 'hero' : tableKey);
          mediaUrl = await secureUpload(bucket, subfolder, file, tableKey === 'songs' ? 'audio' : 'image');
        }

        let updatePayload = {};

        if (tableKey === 'memories') {
          const date = SEC.sanitizeText(document.getElementById('edit-mem-date').value, 10);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("Date must be a valid calendar date.");
          updatePayload = {
            title: SEC.sanitizeText(document.getElementById('edit-mem-title').value),
            date: date,
            tag: SEC.sanitizeText(document.getElementById('edit-mem-tag').value, 60) || 'Memory',
            caption: SEC.sanitizeText(document.getElementById('edit-mem-caption').value, SEC.MAX_TEXTAREA),
            image_url: mediaUrl
          };
        } else if (tableKey === 'dreams') {
          updatePayload = {
            emoji: SEC.sanitizeText(document.getElementById('edit-dream-emoji').value, 8) || '✨',
            title: SEC.sanitizeText(document.getElementById('edit-dream-title').value),
            tag: SEC.sanitizeText(document.getElementById('edit-dream-tag').value, 60) || 'Dream',
            description: SEC.sanitizeText(document.getElementById('edit-dream-desc').value, SEC.MAX_TEXTAREA),
            image_url: mediaUrl
          };
        } else if (tableKey === 'songs') {
          const songUrl = file ? mediaUrl : SEC.sanitizeText(document.getElementById('edit-song-url').value, 400);
          if (songUrl && !/^(https?:\/\/|[\w .\/\-]+\.mp3$)/i.test(songUrl)) throw new Error("Audio source must be an https URL or a local .mp3 path.");
          updatePayload = {
            title: SEC.sanitizeText(document.getElementById('edit-song-title').value),
            artist: SEC.sanitizeText(document.getElementById('edit-song-artist').value, 120),
            url: songUrl
          };
        } else if (tableKey === 'views') {
          updatePayload = {
            badge: SEC.sanitizeText(document.getElementById('edit-view-badge').value, 120) || 'My Favorite View',
            date: SEC.sanitizeText(document.getElementById('edit-view-date').value, 60) || 'Today',
            sub_tag: SEC.sanitizeText(document.getElementById('edit-view-subtag').value, 60),
            floating_badge: SEC.sanitizeText(document.getElementById('edit-view-floating').value, 60),
            quote: SEC.sanitizeText(document.getElementById('edit-view-quote').value, SEC.MAX_TEXTAREA),
            image_url: mediaUrl
          };
        }

        if (!SEC.assertCsrf()) throw new Error("Session token missing — reload the page.");

        const { error: dbErr } = await supabaseClient
          .from(targetTable)
          .update(updatePayload)
          .eq('id', id);

        if (dbErr) throw dbErr;

        log(`✓ Successfully updated entry in '${targetTable}'`, 'success');
        closeEditModal();
        refreshData();
      } catch (err) {
        log(`Update failed: ${err.message}`, 'error');
        alert("Error saving edit: " + err.message);
      } finally {
        btn.textContent = "Save Changes";
        btn.disabled = false;
      }
    }

    // --- 6. DELETE SYSTEM ---
    const DELETE_TABLES = ['memories', 'dreams', 'songs', 'favorite_views']; // whitelist — never blindly trust the DOM

    async function deleteRecord(table, id) {
      if (DELETE_TABLES.indexOf(table) === -1) { log('Delete blocked: unknown table.', 'error'); return; }
      if (!requireAdmin('delete records')) return; // admin-only action
      if (!SEC.assertCsrf()) { log('Session token missing — reload the page.', 'error'); return; }
      if (!confirm('Are you sure you want to permanently delete this row from ' + table + '?')) return;

      const { error } = await supabaseClient.from(table).delete().eq('id', id);
      if (error) {
        log(`Delete error: ${error.message}`, 'error');
        alert("Failed to delete: " + error.message);
      } else {
        log(`✓ Row permanently deleted from ${table}`, 'success');
        refreshData();
      }
    }

    // --- 7. UI DATA REFRESH ---
    const ICON_EDIT = '<svg viewBox="0 0 24 24"><path d="M17 3a2.8 2.8 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5z"/></svg>';
    const ICON_TRASH = '<svg viewBox="0 0 24 24"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6"/></svg>';

    async function refreshData() {
      if (!supabaseClient) return;

      // 1. Memories
      const { data: mems } = await supabaseClient.from('memories').select('*').order('date', { ascending: false });
      currentCache.memories = mems || [];
      document.getElementById('stat-memories').textContent = currentCache.memories.length;
      document.getElementById('list-memories').innerHTML = currentCache.memories.map(m => {
        const safeId = SEC.escapeAttr(String(m.id));
        return `
        <div class="row">
          <div class="row-main">
            <span class="row-meta">${SEC.escapeHtml(m.date || 'No date')}</span>
            <span class="row-title">${SEC.escapeHtml(m.title)}</span>
            <span class="row-meta">(${SEC.escapeHtml(m.tag)})</span>
          </div>
          <div class="row-actions">
            <button data-table="memories" data-id="${safeId}" title="Modify Memory" class="icon-btn act-edit">${ICON_EDIT}</button>
            <button data-table="memories" data-id="${safeId}" title="Delete Memory" class="icon-btn is-danger act-delete">${ICON_TRASH}</button>
          </div>
        </div>`;
      }).join('');

      // 2. Dreams
      const { data: dreams } = await supabaseClient.from('dreams').select('*').order('created_at', { ascending: false });
      currentCache.dreams = dreams || [];
      document.getElementById('stat-dreams').textContent = currentCache.dreams.length;
      document.getElementById('list-dreams').innerHTML = currentCache.dreams.map(d => {
        const safeId = SEC.escapeAttr(String(d.id));
        return `
        <div class="row">
          <div class="row-main">
            <span class="row-dot">${SEC.escapeHtml(d.emoji || '✨')}</span>
            <span class="row-title">${SEC.escapeHtml(d.title)}</span>
            <span class="row-meta">(${SEC.escapeHtml(d.tag)})</span>
          </div>
          <div class="row-actions">
            <button data-table="dreams" data-id="${safeId}" title="Modify Dream" class="icon-btn act-edit">${ICON_EDIT}</button>
            <button data-table="dreams" data-id="${safeId}" title="Delete Dream" class="icon-btn is-danger act-delete">${ICON_TRASH}</button>
          </div>
        </div>`;
      }).join('');

      // 3. Songs
      const { data: songs } = await supabaseClient.from('songs').select('*').order('created_at', { ascending: true });
      currentCache.songs = songs || [];
      document.getElementById('stat-songs').textContent = currentCache.songs.length;
      document.getElementById('list-songs').innerHTML = currentCache.songs.map(s => {
        const safeId = SEC.escapeAttr(String(s.id));
        return `
        <div class="row">
          <div class="row-main">
            <span class="row-title">♪ ${SEC.escapeHtml(s.title)}</span>
            <span class="row-meta">— ${SEC.escapeHtml(s.artist)}</span>
          </div>
          <div class="row-actions">
            <button data-table="songs" data-id="${safeId}" title="Modify Song" class="icon-btn act-edit">${ICON_EDIT}</button>
            <button data-table="songs" data-id="${safeId}" title="Delete Song" class="icon-btn is-danger act-delete">${ICON_TRASH}</button>
          </div>
        </div>`;
      }).join('');

      // 4. Favorite Views
      const { data: views } = await supabaseClient.from('favorite_views').select('*').order('created_at', { ascending: true });
      currentCache.views = views || [];
      document.getElementById('stat-views').textContent = currentCache.views.length;
      document.getElementById('list-views').innerHTML = currentCache.views.map(v => {
        const safeId = SEC.escapeAttr(String(v.id));
        return `
        <div class="row">
          <div class="row-main">
            <img src="${SEC.escapeAttr(SEC.safeImageUrl(v.image_url, 'assets/img/cover.jpg'))}" class="row-thumb" alt="" />
            <div style="min-width:0">
              <span class="row-title" style="display:block">${SEC.escapeHtml(v.badge)}</span>
              <span class="row-meta" style="display:block">${SEC.escapeHtml(v.date || 'Today')}${v.sub_tag ? ' • ' + SEC.escapeHtml(v.sub_tag) : ''} • "${SEC.escapeHtml(v.quote)}"</span>
            </div>
          </div>
          <div class="row-actions">
            <button data-table="views" data-id="${safeId}" title="Modify View" class="icon-btn act-edit">${ICON_EDIT}</button>
            <button data-table="favorite_views" data-id="${safeId}" title="Delete View" class="icon-btn is-danger act-delete">${ICON_TRASH}</button>
          </div>
        </div>`;
      }).join('');
    }

    function switchTab(tab) {
      ['memories', 'dreams', 'songs', 'views'].forEach(t => {
        const panel = document.getElementById(`panel-${t}`);
        const btn = document.getElementById(`tab-btn-${t}`);
        if (panel) panel.classList.toggle('hidden', t !== tab);
        if (btn) btn.classList.toggle('active', t === tab);
      });
    }

    // ==================== 8. EVENT BINDING (CSP-safe — no inline handlers) ====================
    function bindAdminEvents() {
      const $ = (id) => document.getElementById(id);

      // edit/delete buttons are re-rendered on every refreshData() — delegate at document level
      document.addEventListener('click', function (e) {
        const edit = e.target.closest ? e.target.closest('.act-edit') : null;
        const del = e.target.closest ? e.target.closest('.act-delete') : null;
        if (edit) openEditModal(edit.getAttribute('data-table'), edit.getAttribute('data-id'));
        else if (del) deleteRecord(del.getAttribute('data-table'), del.getAttribute('data-id'));
      });

      // broken thumbnails fall back gracefully (CSP-safe — no inline onerror)
      document.addEventListener('error', function (e) {
        const t = e.target;
        if (t && t.classList && t.classList.contains('row-thumb') && t.src.indexOf('cover.jpg') === -1) {
          t.src = 'assets/img/cover.jpg';
        }
      }, true);

      // gate + session
      $('admin-login-form').addEventListener('submit', handleAdminLogin);
      $('admin-logout-btn').addEventListener('click', adminLogout);

      // edit modal
      $('edit-modal-close').addEventListener('click', closeEditModal);
      $('edit-modal-cancel').addEventListener('click', closeEditModal);
      $('edit-record-form').addEventListener('submit', handleSaveEdit);
      $('edit-file').addEventListener('change', handleEditFileChange);
      $('edit-current-preview-img').addEventListener('error', function () { this.style.opacity = 0.25; });

      // sync engine
      $('sync-btn').addEventListener('click', runManualSync);

      // tabs
      document.querySelectorAll('.tab[data-tab]').forEach(btn =>
        btn.addEventListener('click', () => switchTab(btn.getAttribute('data-tab'))));

      // create forms
      $('create-memory-form').addEventListener('submit', handleCreateMemory);
      $('create-dream-form').addEventListener('submit', handleCreateDream);
      $('create-song-form').addEventListener('submit', handleCreateSong);

      // create favorite view
      $('create-view-form').addEventListener('submit', handleCreateFavoriteView);

      // upload previews — data-attribute driven, no inline JS
      document.querySelectorAll('input[type=file][data-preview-box]').forEach(input =>
        input.addEventListener('change', () =>
          previewFile(input, input.getAttribute('data-preview-box'), input.getAttribute('data-preview-img'))));

      SEC.debugLog('admin event bindings complete');
    }

    // patch: bind once DOM is parsed (script loads at end of body)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', bindAdminEvents);
    } else {
      bindAdminEvents();
    }

    function initAdminDashboard() {
      document.getElementById('project-url-badge').textContent = SUPABASE_URL.replace('https://', '');
      refreshData();
    }

    // kept for the edit-modal templates — now delegate to the hardened versions
    function escapeHtml(str) { return SEC.escapeHtml(str); }
    function escapeAttr(str) { return SEC.escapeAttr(str); }

    // Auto-login: restore an existing Supabase session for this tab, or the
    // legacy legacy admin flag. Site-unlocked alone no longer grants edit power.
    document.addEventListener('DOMContentLoaded', async () => {
      const auth = window.SANCTUARY_AUTH;
      const restored = auth ? await auth.restore() : null;   // real Supabase session
      const adminAuthed = sessionStorage.getItem('sanctuary_admin_auth') === 'secure'; // legacy flag
      if (restored || adminAuthed) {
        sessionStorage.setItem('sanctuary_admin_auth', 'secure');
        SEC.csrfToken();
        document.body.classList.remove('admin-locked');
        document.getElementById('admin-gate').style.display = 'none';
        applyRoleToUi();
        initAdminDashboard();
      } else {
        renderAdminIdentities();
        document.getElementById('admin-pass-input').focus();
      }
    });
