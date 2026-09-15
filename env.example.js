/* Copy me to env.js and fill in — or just run: node api/generate-env.js
   ⚠ env.js is gitignored. NEVER commit the filled-in version. */

window.SANCTUARY_CONFIG = {
  // Supabase project (Dashboard → Settings → API)
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "your-publishable-anon-key",

  // The 3 named logins shown on the gate (labels are displayed, emails are
  // the Supabase Auth identities). Passwords live in Supabase Auth, NOT here:
  //   1. "for babieee" → read-only viewer
  //   2. "aryan"       → read-only viewer
  //   3. "admin"       → full backend edit access
  // Generate env.js with:
  //   SITE_USERS='[{"label":"for babieee","email":"babieee@yoursite.com"},{"label":"aryan","email":"aryan@yoursite.com"},{"label":"admin","email":"admin@yoursite.com"}]' node api/generate-env.js
  SITE_USERS: [
    { label: "for babieee", email: "babieee@yoursite.com" },
    { label: "aryan", email: "aryan@yoursite.com" },
    { label: "admin", email: "admin@yoursite.com" }
  ],

  // OPTIONAL legacy fallback: SHA-256 of the old shared passcode
  // (echo -n "yourpasscode" | sha256sum). Used only if Supabase Auth
  // is unreachable. Leave empty to force real Supabase logins.
  SANCTUARY_PASSWORD_HASH: "",

  // Verbose console logs — keep false in production (auto-disabled there)
  DEBUG: false
};
