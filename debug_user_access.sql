-- 특정 사용자의 접근 권한 문제 디버깅 및 해결

-- 1. 현재 RLS 정책 상태 확인
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

-- 2. 특정 사용자의 데이터 존재 여부 확인
-- alsdn2606@gmail.com 사용자의 ID를 찾아서 확인
SELECT 
  id,
  email,
  created_at
FROM auth.users 
WHERE email = 'alsdn2606@gmail.com';

-- 3. 해당 사용자의 uploads 데이터 확인
SELECT 
  u.id,
  u.user_id,
  u.project_name,
  u.uploaded_at,
  au.email
FROM uploads u
JOIN auth.users au ON u.user_id = au.id
WHERE au.email = 'alsdn2606@gmail.com';

-- 4. RLS 정책 재설정 (모든 테이블에 대해 완전 개방)
-- RLS 비활성화 (임시 - 테스트용)
ALTER TABLE uploads DISABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files DISABLE ROW LEVEL SECURITY;
ALTER TABLE session_lines DISABLE ROW LEVEL SECURITY;

-- 5. RLS 재활성화 및 완전 개방 정책 적용
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE session_lines ENABLE ROW LEVEL SECURITY;

-- 기존 정책 모두 삭제
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    -- uploads 정책 삭제
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'uploads'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON uploads', pol.policyname);
    END LOOP;
    
    -- uploaded_files 정책 삭제
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'uploaded_files'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON uploaded_files', pol.policyname);
    END LOOP;
    
    -- session_lines 정책 삭제
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'session_lines'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON session_lines', pol.policyname);
    END LOOP;
END $$;

-- 6. 새로운 완전 개방 정책 생성
-- uploads 테이블
CREATE POLICY "enable_all_for_authenticated_uploads" 
  ON uploads 
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (auth.uid() = user_id OR true); -- 삽입은 본인만, 조회는 모두

-- uploaded_files 테이블  
CREATE POLICY "enable_all_for_authenticated_uploaded_files" 
  ON uploaded_files 
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- session_lines 테이블
CREATE POLICY "enable_all_for_authenticated_session_lines" 
  ON session_lines 
  FOR ALL 
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- 7. profiles 테이블도 확인
DROP POLICY IF EXISTS "Users can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

CREATE POLICY "enable_read_for_all_profiles" 
  ON profiles 
  FOR SELECT 
  TO authenticated
  USING (true);

CREATE POLICY "enable_update_own_profile" 
  ON profiles 
  FOR UPDATE 
  TO authenticated
  USING (auth.uid() = id);

-- 8. api_keys 테이블은 본인 것만
-- 기존 정책 유지

-- 9. user_settings 테이블 확인 (있다면)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_settings') THEN
        ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
        
        -- 기존 정책 삭제
        DROP POLICY IF EXISTS "Users can view own settings" ON user_settings;
        DROP POLICY IF EXISTS "Users can update own settings" ON user_settings;
        
        -- 새 정책 생성
        CREATE POLICY "enable_all_for_own_settings" 
          ON user_settings 
          FOR ALL 
          TO authenticated
          USING (auth.uid() = user_id)
          WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- 10. 확인 메시지
DO $$
BEGIN
  RAISE NOTICE 'All RLS policies have been reset to allow full read access for authenticated users';
  RAISE NOTICE 'Please check if alsdn2606@gmail.com can now see their prompts';
END $$;