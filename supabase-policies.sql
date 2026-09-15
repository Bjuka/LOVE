-- ============================================================
-- SANCTUARY · secure edition — Supabase hardening pack v2
-- Run in Supabase Dashboard → SQL Editor (one time).
-- Real enforcement lives HERE, not in the browser.
--
-- LOGIN MODEL (3 named users, one shared password):
--   1. "for babieee" → app_metadata.role = "viewer" (read-only)
--   2. "aryan"       → app_metadata.role = "viewer" (read-only)
--   3. "admin"       → app_metadata.role = "admin"  (full edit power)
--
-- Role is stored in auth.users.app_metadata, which users cannot
-- edit themselves — only the service_role / dashboard can.
-- ============================================================

-- ------------------------------------------------------------
-- 1. Enable RLS everywhere (idempotent)
-- ------------------------------------------------------------
ALTER TABLE memories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE dreams          ENABLE ROW LEVEL SECURITY;
ALTER TABLE songs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE favorite_views  ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 2. Role helper — reads the caller's app_metadata.role
--    ("admin" → can edit · anything else / absent → viewer)
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.sanctuary_role() RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = auth, public AS $$
  SELECT COALESCE(
    (SELECT (m->>'role') FROM auth.users u, LATERAL (SELECT u.app_metadata AS m) x WHERE u.id = auth.uid()),
    'viewer'
  );
$$;

CREATE OR REPLACE FUNCTION public.is_sanctuary_admin() RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT public.sanctuary_role() = 'admin';
$$;

-- ------------------------------------------------------------
-- 3. Content tables — replace the v1 blanket policies
--    • anon          → nothing (the film only loads for signed-in tabs)
--    • authenticated → SELECT for everyone · INSERT/UPDATE/DELETE for admin only
-- ------------------------------------------------------------
DROP POLICY IF EXISTS "public read memories"           ON memories;
DROP POLICY IF EXISTS "public read dreams"             ON dreams;
DROP POLICY IF EXISTS "public read songs"              ON songs;
DROP POLICY IF EXISTS "public read favorite_views"     ON favorite_views;
DROP POLICY IF EXISTS "auth write memories"            ON memories;
DROP POLICY IF EXISTS "auth write dreams"              ON dreams;
DROP POLICY IF EXISTS "auth write songs"               ON songs;
DROP POLICY IF EXISTS "auth write favorite_views"      ON favorite_views;

CREATE POLICY "users read memories"       ON memories       FOR SELECT TO authenticated USING (true);
CREATE POLICY "users read dreams"         ON dreams         FOR SELECT TO authenticated USING (true);
CREATE POLICY "users read songs"          ON songs          FOR SELECT TO authenticated USING (true);
CREATE POLICY "users read favorite_views" ON favorite_views FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin insert memories"       ON memories       FOR INSERT TO authenticated WITH CHECK (public.is_sanctuary_admin());
CREATE POLICY "admin update memories"       ON memories       FOR UPDATE TO authenticated USING (public.is_sanctuary_admin()) WITH CHECK (public.is_sanctuary_admin());
CREATE POLICY "admin delete memories"       ON memories       FOR DELETE TO authenticated USING (public.is_sanctuary_admin());

CREATE POLICY "admin insert dreams"         ON dreams         FOR INSERT TO authenticated WITH CHECK (public.is_sanctuary_admin());
CREATE POLICY "admin update dreams"         ON dreams         FOR UPDATE TO authenticated USING (public.is_sanctuary_admin()) WITH CHECK (public.is_sanctuary_admin());
CREATE POLICY "admin delete dreams"         ON dreams         FOR DELETE TO authenticated USING (public.is_sanctuary_admin());

CREATE POLICY "admin insert songs"          ON songs          FOR INSERT TO authenticated WITH CHECK (public.is_sanctuary_admin());
CREATE POLICY "admin update songs"          ON songs          FOR UPDATE TO authenticated USING (public.is_sanctuary_admin()) WITH CHECK (public.is_sanctuary_admin());
CREATE POLICY "admin delete songs"          ON songs          FOR DELETE TO authenticated USING (public.is_sanctuary_admin());

CREATE POLICY "admin insert favorite_views" ON favorite_views FOR INSERT TO authenticated WITH CHECK (public.is_sanctuary_admin());
CREATE POLICY "admin update favorite_views" ON favorite_views FOR UPDATE TO authenticated USING (public.is_sanctuary_admin()) WITH CHECK (public.is_sanctuary_admin());
CREATE POLICY "admin delete favorite_views" ON favorite_views FOR DELETE TO authenticated USING (public.is_sanctuary_admin());

-- ------------------------------------------------------------
-- 4. Storage buckets (secure file upload, DB side)
--    photos: images ≤ 8MB · music: audio ≤ 15MB
--    • read:  signed-in users (viewers + admin)
--    • write: ADMIN only — viewers cannot upload/delete objects
-- ------------------------------------------------------------
UPDATE storage.buckets SET file_size_limit = 8388608,  allowed_mime_types
  = ARRAY['image/jpeg','image/png','image/webp','image/gif']
WHERE id = 'photos';

UPDATE storage.buckets SET file_size_limit = 15728640, allowed_mime_types
  = ARRAY['audio/mpeg','audio/mp3','audio/wav','audio/x-wav','audio/wave','audio/mp4','audio/x-m4a']
WHERE id = 'music';

DROP POLICY IF EXISTS "storage public read photos"   ON storage.objects;
DROP POLICY IF EXISTS "storage public read music"    ON storage.objects;
DROP POLICY IF EXISTS "storage auth write photos"    ON storage.objects;
DROP POLICY IF EXISTS "storage auth write music"     ON storage.objects;

CREATE POLICY "storage users read photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'photos');
CREATE POLICY "storage users read music"  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'music');

CREATE POLICY "storage admin write photos" ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'photos' AND public.is_sanctuary_admin())
  WITH CHECK (bucket_id = 'photos' AND public.is_sanctuary_admin());
CREATE POLICY "storage admin write music"  ON storage.objects FOR ALL TO authenticated
  USING (bucket_id = 'music' AND public.is_sanctuary_admin())
  WITH CHECK (bucket_id = 'music' AND public.is_sanctuary_admin());

-- ------------------------------------------------------------
-- 5. Lock default privileges
-- ------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- ------------------------------------------------------------
-- 6. CREATE THE 3 USERS (one shared password for all three)
--    Run this AFTER enabling "Confirm email" is off (Auth → Providers
--    → Email → disable confirm) OR pre-mark them confirmed as below.
--    ⚠ CHANGE 'the-shared-password' to your real password first!
-- ------------------------------------------------------------
-- 6a. Create the users (idempotent — skips ones that already exist)
DO $$
DECLARE
  shared_password text := 'the-shared-password';  -- ⚠ change me
  u uuid;
BEGIN
  -- 1) "for babieee" — read-only viewer
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'aryansawant2265@gmail.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    )    VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'aryansawant2265@gmail.com', crypt(shared_password, gen_salt('bf')),
      now(), now(), now(),
      '{"role":"viewer","provider":"email","providers":["email"]}', '{}'
    );
  ELSE
    UPDATE auth.users
       SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"viewer"'),
           encrypted_password = crypt(shared_password, gen_salt('bf'))
     WHERE email = 'aryansawant2265@gmail.com';
  END IF;

  -- 2) "aryan" — read-only viewer
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'teddbans@gmail.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    )    VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'teddbans@gmail.com', crypt(shared_password, gen_salt('bf')),
      now(), now(), now(),
      '{"role":"viewer","provider":"email","providers":["email"]}', '{}'
    );
  ELSE
    UPDATE auth.users
       SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"viewer"'),
           encrypted_password = crypt(shared_password, gen_salt('bf'))
     WHERE email = 'teddbans@gmail.com';
  END IF;

  -- 3) "admin" — full backend edit power
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'kositakira@gmail.com') THEN
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data
    )    VALUES (
      '00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
      'kositakira@gmail.com', crypt(shared_password, gen_salt('bf')),
      now(), now(), now(),
      '{"role":"admin","provider":"email","providers":["email"]}', '{}'
    );
  ELSE
    UPDATE auth.users
       SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"admin"'),
           encrypted_password = crypt(shared_password, gen_salt('bf'))
     WHERE email = 'kositakira@gmail.com';
  END IF;
END $$;

-- 6b. Every auth.users row needs a matching auth.identities row,
--     or password sign-in fails. (When users are created via the Auth
--     dashboard or the GoTrue admin API, GoTrue writes this row itself —
--     this block only matters for pure-SQL created users.)
INSERT INTO auth.identities (
  user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at
)
SELECT
  u.id,
  'email',
  'email',
  jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
  now(), now(), now()
FROM auth.users u
WHERE u.email IN ('aryansawant2265@gmail.com', 'teddbans@gmail.com', 'kositakira@gmail.com')
  AND NOT EXISTS (
    SELECT 1 FROM auth.identities i
    WHERE i.user_id = u.id AND i.provider_id = 'email'
  );

-- 6c. Or skip the SQL and create them by hand:
--     Dashboard → Authentication → Users → "Add user" →
--       • aryansawant2265@gmail.com  (Auto Confirm User ✓)  → role "viewer"
--       • teddbans@gmail.com         (Auto Confirm User ✓)  → role "viewer"
--       • kositakira@gmail.com       (Auto Confirm User ✓)  → role "admin"
--     Then set each user's role with:
--       UPDATE auth.users
--          SET raw_app_meta_data = jsonb_set(raw_app_meta_data, '{role}', '"admin"')
--        WHERE email = 'kositakira@gmail.com';  -- repeat with "viewer" for the other two

-- ------------------------------------------------------------
-- 7. Re-check everything
-- ------------------------------------------------------------
-- SELECT * FROM pg_policies WHERE schemaname = 'public';
-- (Each content table should show: 1 SELECT for authenticated
--  + INSERT/UPDATE/DELETE policies gated on is_sanctuary_admin().)
--
-- SELECT email, raw_app_meta_data->>'role' AS role FROM auth.users
--  WHERE email IN ('aryansawant2265@gmail.com','teddbans@gmail.com','kositakira@gmail.com');
-- (Should list: aryansawant2265→viewer, teddbans→viewer, kositakira→admin.)
-- ============================================================
