/* ------------------------------------------------------------
   SANCTUARY · secure edition — serverless config endpoint (Vercel)
   ------------------------------------------------------------
   THE "RIGHT" WAY TO HIDE KEYS: the anon key never ships to the
   browser at all. Vercel injects real values from its own env vars.
   Pair this with the /api proxy for DB calls if you go full-server.

   Status: OPTIONAL. The static env.js flow works today; this file
   shows the next step. It is ignored by the client unless you
   un-comment the /api/config script tag in index.html.
------------------------------------------------------------ */

export const config = { runtime: "edge" };

export default function handler() {
  const url = process.env.SUPABASE_URL || "";
  const key = process.env.SUPABASE_ANON_KEY || "";
  const hash = process.env.SANCTUARY_PASSWORD_HASH || "";
  const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";

  const body = JSON.stringify({
    SUPABASE_URL: url,
    SUPABASE_ANON_KEY: isProd && !url ? "" : key,
    SANCTUARY_PASSWORD_HASH: hash,
    DEBUG: false, // production never gets debug
    DEPLOYED_AT: new Date().toISOString()
  });

  return new Response(body, {
    status: url && key && hash ? 200 : 500,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
