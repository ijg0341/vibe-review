-- 권한 문제 디버깅: 왜 특정 계정만 모든 데이터를 볼 수 있는가?

-- 1. 현재 사용자 확인 (이 쿼리를 각 계정에서 실행해보세요)
SELECT 
  auth.uid() as current_user_id,
  auth.role() as current_role,
  auth.email() as current_email;

-- 2. RLS 정책 상태 확인
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename IN ('uploads', 'uploaded_files', 'session_lines')
ORDER BY tablename, policyname;

-- 3. 테이블별 RLS 활성화 상태 확인
SELECT 
  schemaname,
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename IN ('uploads', 'uploaded_files', 'session_lines', 'user_profiles');

-- 4. ijg0341@gmail.com 사용자의 특별한 권한 확인
DO $$
DECLARE
  ijg_user_id UUID;
  alsdn_user_id UUID;
BEGIN
  SELECT id INTO ijg_user_id FROM auth.users WHERE email = 'ijg0341@gmail.com';
  SELECT id INTO alsdn_user_id FROM auth.users WHERE email = 'alsdn2606@gmail.com';
  
  RAISE NOTICE 'ijg0341 user ID: %', ijg_user_id;
  RAISE NOTICE 'alsdn2606 user ID: %', alsdn_user_id;
END $$;

-- 5. 데이터베이스 소유자 및 권한 확인
SELECT 
  rolname,
  rolsuper,
  rolinherit,
  rolcreaterole,
  rolcreatedb,
  rolcanlogin,
  rolreplication,
  rolbypassrls
FROM pg_roles
WHERE rolname IN ('postgres', 'authenticator', 'authenticated', 'anon', 'service_role');

-- 6. 특정 사용자의 업로드 데이터 확인
SELECT 
  au.email,
  u.id as upload_id,
  u.project_name,
  u.uploaded_at,
  COUNT(uf.id) as file_count
FROM auth.users au
JOIN uploads u ON au.id = u.user_id
LEFT JOIN uploaded_files uf ON u.id = uf.upload_id
WHERE au.email IN ('ijg0341@gmail.com', 'alsdn2606@gmail.com')
GROUP BY au.email, u.id, u.project_name, u.uploaded_at
ORDER BY au.email, u.uploaded_at DESC;

-- 7. 최근 session_lines 데이터 소유자 확인
WITH recent_sessions AS (
  SELECT 
    sl.id,
    sl.file_id,
    sl.created_at,
    uf.upload_id,
    u.user_id,
    au.email
  FROM session_lines sl
  JOIN uploaded_files uf ON sl.file_id = uf.id
  JOIN uploads u ON uf.upload_id = u.id
  JOIN auth.users au ON u.user_id = au.id
  ORDER BY sl.created_at DESC
  LIMIT 20
)
SELECT 
  email,
  COUNT(*) as recent_session_count
FROM recent_sessions
GROUP BY email;

-- 8. RLS 정책 무시 테스트 - SECURITY DEFINER 함수 확인
SELECT 
  n.nspname as schema,
  p.proname as function_name,
  p.prosecdef as security_definer,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('get_session_lines', 'get_session_lines_info')
  AND p.prosecdef = true;

-- 9. 문제 해결: RLS 정책 완전 재설정
-- 모든 테이블의 RLS를 비활성화 후 재활성화
DO $$
BEGIN
  -- RLS 비활성화
  ALTER TABLE uploads DISABLE ROW LEVEL SECURITY;
  ALTER TABLE uploaded_files DISABLE ROW LEVEL SECURITY;
  ALTER TABLE session_lines DISABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE 'RLS disabled for all tables';
  
  -- RLS 재활성화
  ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
  ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
  ALTER TABLE session_lines ENABLE ROW LEVEL SECURITY;
  
  RAISE NOTICE 'RLS re-enabled for all tables';
END $$;

-- 10. 모든 기존 정책 삭제
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- uploads 정책 삭제
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'uploads'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON uploads', pol.policyname);
        RAISE NOTICE 'Dropped policy % on uploads', pol.policyname;
    END LOOP;
    
    -- uploaded_files 정책 삭제
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'uploaded_files'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON uploaded_files', pol.policyname);
        RAISE NOTICE 'Dropped policy % on uploaded_files', pol.policyname;
    END LOOP;
    
    -- session_lines 정책 삭제
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'session_lines'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON session_lines', pol.policyname);
        RAISE NOTICE 'Dropped policy % on session_lines', pol.policyname;
    END LOOP;
END $$;

-- 11. 새로운 완전 개방 정책 생성 (USING true로 모든 사용자 허용)
-- uploads
CREATE POLICY "completely_open_uploads" 
  ON uploads 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- uploaded_files
CREATE POLICY "completely_open_uploaded_files" 
  ON uploaded_files 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- session_lines
CREATE POLICY "completely_open_session_lines" 
  ON session_lines 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 12. 정책 적용 확인
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('uploads', 'uploaded_files', 'session_lines')
ORDER BY tablename;

-- 13. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'RLS policies have been completely reset';
  RAISE NOTICE 'All tables now have OPEN policies (true for all)';
  RAISE NOTICE 'All authenticated users should be able to see all data';
  RAISE NOTICE '====================================';
  RAISE NOTICE 'If the problem persists:';
  RAISE NOTICE '1. Check if Supabase project has service_role key being used';
  RAISE NOTICE '2. Clear browser cache and re-login';
  RAISE NOTICE '3. Check if there are any client-side filters';
END $$;