/* Copy me to env.js and fill in — or just run: node api/generate-env.js
   ⚠ env.js is gitignored. NEVER commit the filled-in version. */

window.SANCTUARY_CONFIG = {
  // Supabase project (Dashboard → Settings → API)
  SUPABASE_URL: "https://YOUR-PROJECT.supabase.co",
  SUPABASE_ANON_KEY: "your-publishable-anon-key",

  // SHA-256 of your passcode (echo -n "yourpasscode" | sha256sum)
  SANCTUARY_PASSWORD_HASH: "your-sha256-passcode-hash",

  // Verbose console logs — keep false in production (auto-disabled there)
  DEBUG: false
};
