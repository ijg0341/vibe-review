-- user_profile 테이블 문제 해결

-- 1. user_profile 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profile';

-- 2. 현재 user_profile 데이터 확인
SELECT * FROM user_profile;

-- 3. auth.users와 user_profile 비교 (누락된 사용자 찾기)
SELECT 
  au.id,
  au.email,
  au.created_at,
  up.id as profile_id
FROM auth.users au
LEFT JOIN user_profile up ON au.id = up.id
WHERE up.id IS NULL;

-- 4. 누락된 사용자들의 프로필 생성
INSERT INTO user_profile (id, email, created_at, updated_at)
SELECT 
  id,
  email,
  created_at,
  NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profile)
ON CONFLICT (id) DO NOTHING;

-- 5. 특히 alsdn2606@gmail.com 사용자 확인 및 생성
DO $$
DECLARE
  user_id UUID;
BEGIN
  -- 사용자 ID 찾기
  SELECT id INTO user_id FROM auth.users WHERE email = 'alsdn2606@gmail.com';
  
  IF user_id IS NOT NULL THEN
    -- 프로필이 없으면 생성
    INSERT INTO user_profile (id, email, created_at, updated_at)
    VALUES (user_id, 'alsdn2606@gmail.com', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email,
        updated_at = NOW();
    
    RAISE NOTICE 'Profile created/updated for alsdn2606@gmail.com with ID: %', user_id;
  ELSE
    RAISE NOTICE 'User alsdn2606@gmail.com not found in auth.users';
  END IF;
END $$;

-- 6. user_profile 테이블의 RLS 정책 확인 및 수정
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profile;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profile;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profile;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profile;

-- 새 정책 생성 (모든 사용자가 모든 프로필 조회 가능)
CREATE POLICY "anyone_can_view_profiles" 
  ON user_profile 
  FOR SELECT 
  USING (true);

CREATE POLICY "users_can_insert_own_profile" 
  ON user_profile 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile" 
  ON user_profile 
  FOR UPDATE 
  USING (auth.uid() = id);

-- 7. 프로필 자동 생성 트리거 생성 (앞으로 새 사용자 가입 시 자동 생성)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profile (id, email, created_at, updated_at)
  VALUES (new.id, new.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created_profile ON auth.users;
CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profile();

-- 8. 결과 확인
SELECT 
  up.*,
  au.email as auth_email
FROM user_profile up
JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at DESC;

-- 9. 업로드 데이터와 프로필 연결 확인
SELECT 
  u.user_id,
  u.project_name,
  u.uploaded_at,
  up.email,
  au.email as auth_email
FROM uploads u
LEFT JOIN user_profile up ON u.user_id = up.id
LEFT JOIN auth.users au ON u.user_id = au.id
WHERE au.email = 'alsdn2606@gmail.com'
   OR au.email = 'ijg0341@gmail.com'
ORDER BY u.uploaded_at DESC;

-- 10. 완료 메시지
DO $$
DECLARE
  profile_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM user_profile;
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  RAISE NOTICE 'Profile sync complete!';
  RAISE NOTICE 'Total users: %, Total profiles: %', user_count, profile_count;
  RAISE NOTICE 'If numbers match, all users now have profiles';
END $$;