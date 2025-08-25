-- user_profiles 테이블 문제 해결

-- 1. user_profiles 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles';

-- 2. 현재 user_profiles 데이터 확인
SELECT * FROM user_profiles;

-- 3. auth.users와 user_profiles 비교 (누락된 사용자 찾기)
SELECT 
  au.id,
  au.email,
  au.created_at,
  up.id as profile_id
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- 4. 누락된 사용자들의 프로필 생성
INSERT INTO user_profiles (id, email, created_at, updated_at)
SELECT 
  id,
  email,
  created_at,
  NOW()
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
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
    INSERT INTO user_profiles (id, email, created_at, updated_at)
    VALUES (user_id, 'alsdn2606@gmail.com', NOW(), NOW())
    ON CONFLICT (id) DO UPDATE 
    SET email = EXCLUDED.email,
        updated_at = NOW();
    
    RAISE NOTICE 'Profile created/updated for alsdn2606@gmail.com with ID: %', user_id;
  ELSE
    RAISE NOTICE 'User alsdn2606@gmail.com not found in auth.users';
  END IF;
END $$;

-- 6. user_profiles 테이블의 RLS 정책 확인 및 수정
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view all profiles" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;
DROP POLICY IF EXISTS "Enable read access for all users" ON user_profiles;
DROP POLICY IF EXISTS "Enable insert for users based on user_id" ON user_profiles;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON user_profiles;

-- 새 정책 생성 (모든 사용자가 모든 프로필 조회 가능)
CREATE POLICY "anyone_can_view_profiles" 
  ON user_profiles 
  FOR SELECT 
  USING (true);

CREATE POLICY "users_can_insert_own_profile" 
  ON user_profiles 
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

CREATE POLICY "users_can_update_own_profile" 
  ON user_profiles 
  FOR UPDATE 
  USING (auth.uid() = id);

-- 7. 프로필 자동 생성 트리거 생성 (앞으로 새 사용자 가입 시 자동 생성)
CREATE OR REPLACE FUNCTION public.handle_new_user_profiles()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, created_at, updated_at)
  VALUES (new.id, new.email, NOW(), NOW())
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;
CREATE TRIGGER on_auth_user_created_profiles
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profiles();

-- 8. 모든 사용자에 대한 프로필 생성 (컬럼이 다를 수 있으므로 안전하게 처리)
DO $$
BEGIN
  -- user_profiles 테이블의 컬럼 확인
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' 
    AND column_name = 'email'
  ) THEN
    -- email 컬럼이 있는 경우
    INSERT INTO user_profiles (id, email, created_at, updated_at)
    SELECT id, email, NOW(), NOW()
    FROM auth.users
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        updated_at = NOW();
  ELSE
    -- email 컬럼이 없는 경우 (id만 삽입)
    INSERT INTO user_profiles (id, created_at, updated_at)
    SELECT id, NOW(), NOW()
    FROM auth.users
    ON CONFLICT (id) DO NOTHING;
  END IF;
END $$;

-- 9. 결과 확인
SELECT 
  up.*,
  au.email as auth_email
FROM user_profiles up
JOIN auth.users au ON up.id = au.id
ORDER BY up.created_at DESC;

-- 10. 업로드 데이터와 프로필 연결 확인
SELECT 
  u.user_id,
  u.project_name,
  u.uploaded_at,
  au.email as auth_email,
  CASE WHEN up.id IS NOT NULL THEN 'Profile Exists' ELSE 'No Profile' END as profile_status
FROM uploads u
LEFT JOIN user_profiles up ON u.user_id = up.id
LEFT JOIN auth.users au ON u.user_id = au.id
WHERE au.email IN ('alsdn2606@gmail.com', 'ijg0341@gmail.com')
ORDER BY u.uploaded_at DESC;

-- 11. 완료 메시지
DO $$
DECLARE
  profile_count INTEGER;
  user_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM user_profiles;
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Profile sync complete!';
  RAISE NOTICE 'Total users: %', user_count;
  RAISE NOTICE 'Total profiles: %', profile_count;
  RAISE NOTICE '====================================';
  
  IF profile_count = user_count THEN
    RAISE NOTICE '✓ SUCCESS: All users now have profiles!';
  ELSE
    RAISE NOTICE '⚠ WARNING: Profile count does not match user count';
    RAISE NOTICE 'Missing profiles: %', user_count - profile_count;
  END IF;
END $$;