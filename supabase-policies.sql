-- ============================================================
-- SANCTUARY · secure edition — Supabase hardening pack
-- Run in Supabase Dashboard → SQL Editor (one time).
-- Real enforcement lives HERE, not in the browser.
-- ============================================================

-- ------------------------------------------------------------
-- 0. Baseline safety: never allow anonymous writes
-- ------------------------------------------------------------
-- The site's public passcode gate is cosmetic; the DATABASE is the
-- real boundary. These policies turn it into one.

-- ------------------------------------------------------------
-- 1. Lock the default privileges for the anon role
-- ------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;
GRANT SELECT ON memories, dreams, songs, favorite_views TO anon;

-- ------------------------------------------------------------
-- 2. Enable RLS everywhere (idempotent)
-- ------------------------------------------------------------
ALTER TABLE memories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dreams          ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_views  ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 3. Public: read-only on the four content tables
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "public read memories"       ON memories;
DROP POLICY IF EXISTS "public read dreams"         ON dreams;
DROP POLICY IF EXISTS "public read songs"          ON songs;
DROP POLICY IF EXISTS "public read favorite_views" ON favorite_views;

CREATE POLICY "public read memories"       ON memories       FOR SELECT TO anon USING (true);
CREATE POLICY "public read dreams"         ON dreams         FOR SELECT TO anon USING (true);
CREATE POLICY "public read songs"          ON songs          FOR SELECT TO anon USING (true);
CREATE POLICY "public read favorite_views" ON favorite_views FOR SELECT TO anon USING (true);

-- ------------------------------------------------------------
-- 4. Writes require an authenticated Supabase user (user perms)
--    AND pass the row-level sanity checks (DB rules)
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "auth write memories"       ON memories;
DROP POLICY IF EXISTS "auth write dreams"         ON dreams;
DROP POLICY IF EXISTS "auth write songs"          ON songs;
DROP POLICY IF EXISTS "auth write favorite_views" ON favorite_views;

CREATE POLICY "auth write memories" ON memories FOR ALL TO authenticated
  USING (true) WITH CHECK (
    char_length(title) BETWEEN 1 AND 300
    AND date ~ '^\d{4}-\d{2}-\d{2}$'
    AND char_length(caption) <= 600
    AND char_length(tag) <= 60
  );

CREATE POLICY "auth write dreams" ON dreams FOR ALL TO authenticated
  USING (true) WITH CHECK (
    char_length(title) BETWEEN 1 AND 300
    AND char_length(description) <= 600
    AND char_length(tag) <= 60
  );

CREATE POLICY "auth write songs" ON songs FOR ALL TO authenticated
  USING (true) WITH CHECK (
    char_length(title) BETWEEN 1 AND 300
    AND char_length(artist) BETWEEN 1 AND 120
  );

CREATE POLICY "auth write favorite_views" ON favorite_views FOR ALL TO authenticated
  USING (true) WITH CHECK (
    char_length(quote) BETWEEN 1 AND 600
    AND char_length(badge) <= 120
  );

-- ------------------------------------------------------------
-- 5. Storage bucket rules (secure file upload, DB side)
--    photos: images ≤ 8MB · music: audio ≤ 15MB
-- ------------------------------------------------------------
UPDATE storage.buckets SET file_size_limit = 8388608,  allowed_mime_types
  = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'photos';

UPDATE storage.buckets SET file_size_limit = 15728640, allowed_mime_types
  = ARRAY['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/mp4','audio/x-m4a']
WHERE id = 'music';

-- Anyone can view published media; only authenticated users can upload.
CREATE POLICY "storage public read photos" ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'photos');
CREATE POLICY "storage public read music"  ON storage.objects FOR SELECT TO anon, authenticated
  USING (bucket_id = 'music');

CREATE POLICY "storage auth write photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'photos');
CREATE POLICY "storage auth write music"  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'music');

-- ------------------------------------------------------------
-- 6. Optional: one personal admin user
--    1) Dashboard → Authentication → Users → Add user (email + a strong password)
--
--    That's it — every write policy above targets TO authenticated, so the
--    user you just created is the admin. Sign in once with supabase-js
--    (supabaseClient.auth.signInWithPassword) and the writes will pass RLS.
-- ============================================================

-- ------------------------------------------------------------
-- 7. Re-check everything
-- ------------------------------------------------------------
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
-- (All four tables should show exactly: 1 SELECT for anon + 1 ALL for authenticated.)
