-- session_lines 조회 문제 해결

-- 1. 현재 session_lines 테이블의 RLS 상태 확인
SELECT 
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'session_lines';

-- 2. session_lines 테이블의 현재 정책 확인
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'session_lines';

-- 3. 최근 session_lines 데이터 확인 (누가 소유하고 있는지)
SELECT 
  sl.id,
  sl.file_id,
  sl.created_at,
  uf.upload_id,
  u.user_id,
  au.email as owner_email
FROM session_lines sl
JOIN uploaded_files uf ON sl.file_id = uf.id
JOIN uploads u ON uf.upload_id = u.id
JOIN auth.users au ON u.user_id = au.id
ORDER BY sl.created_at DESC
LIMIT 10;

-- 4. 특정 사용자가 볼 수 있는 session_lines 수 확인
DO $$
DECLARE
  ijg_count INTEGER;
  alsdn_count INTEGER;
  ijg_id UUID;
  alsdn_id UUID;
BEGIN
  SELECT id INTO ijg_id FROM auth.users WHERE email = 'ijg0341@gmail.com';
  SELECT id INTO alsdn_id FROM auth.users WHERE email = 'alsdn2606@gmail.com';
  
  -- ijg0341 소유 데이터
  SELECT COUNT(*) INTO ijg_count
  FROM session_lines sl
  JOIN uploaded_files uf ON sl.file_id = uf.id
  JOIN uploads u ON uf.upload_id = u.id
  WHERE u.user_id = ijg_id;
  
  -- alsdn2606 소유 데이터
  SELECT COUNT(*) INTO alsdn_count
  FROM session_lines sl
  JOIN uploaded_files uf ON sl.file_id = uf.id
  JOIN uploads u ON uf.upload_id = u.id
  WHERE u.user_id = alsdn_id;
  
  RAISE NOTICE 'ijg0341@gmail.com owns % session lines', ijg_count;
  RAISE NOTICE 'alsdn2606@gmail.com owns % session lines', alsdn_count;
END $$;

-- 5. session_lines 테이블의 모든 정책 삭제
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'session_lines'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON session_lines', pol.policyname);
        RAISE NOTICE 'Dropped policy: %', pol.policyname;
    END LOOP;
END $$;

-- 6. RLS 비활성화 후 재활성화 (깔끔하게 리셋)
ALTER TABLE session_lines DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_lines ENABLE ROW LEVEL SECURITY;

-- 7. 단순하고 명확한 정책 하나만 생성 (모든 사용자가 모든 것을 볼 수 있음)
CREATE POLICY "allow_all_for_session_lines" 
  ON session_lines 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 8. uploaded_files 테이블도 동일하게 처리
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'uploaded_files'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON uploaded_files', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE uploaded_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_for_uploaded_files" 
  ON uploaded_files 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 9. uploads 테이블도 동일하게 처리
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'uploads'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON uploads', pol.policyname);
    END LOOP;
END $$;

ALTER TABLE uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_all_for_uploads" 
  ON uploads 
  FOR ALL 
  USING (true)
  WITH CHECK (true);

-- 10. 정책이 제대로 적용되었는지 확인
SELECT 
  tablename,
  policyname,
  cmd,
  qual
FROM pg_policies 
WHERE tablename IN ('uploads', 'uploaded_files', 'session_lines')
ORDER BY tablename;

-- 11. 테스트: 모든 session_lines 개수 확인
SELECT 
  COUNT(*) as total_session_lines
FROM session_lines;

-- 12. 테스트: 각 사용자별 session_lines 개수
SELECT 
  au.email,
  COUNT(sl.id) as line_count
FROM auth.users au
LEFT JOIN uploads u ON au.id = u.user_id
LEFT JOIN uploaded_files uf ON u.id = uf.upload_id
LEFT JOIN session_lines sl ON uf.id = sl.file_id
GROUP BY au.email
ORDER BY line_count DESC;

-- 13. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Session lines visibility fix complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'All RLS policies have been simplified:';
  RAISE NOTICE '- All tables now use USING(true) WITH CHECK(true)';
  RAISE NOTICE '- This allows ALL users to see ALL data';
  RAISE NOTICE '';
  RAISE NOTICE 'If still not working:';
  RAISE NOTICE '1. Clear browser cache';
  RAISE NOTICE '2. Log out and log in again';
  RAISE NOTICE '3. Check browser console for errors';
  RAISE NOTICE '====================================';
END $$;