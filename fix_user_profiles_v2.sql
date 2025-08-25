-- user_profiles 테이블 문제 해결 (email 컬럼 없는 경우)

-- 1. user_profiles 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'user_profiles'
ORDER BY ordinal_position;

-- 2. 현재 user_profiles 데이터 확인
SELECT * FROM user_profiles LIMIT 5;

-- 3. auth.users와 user_profiles 비교 (누락된 사용자 찾기)
SELECT 
  au.id,
  au.email,
  au.created_at,
  up.id as profile_id
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
WHERE up.id IS NULL;

-- 4. 누락된 사용자들의 프로필 생성 (email 컬럼 없이)
INSERT INTO user_profiles (id)
SELECT id
FROM auth.users
WHERE id NOT IN (SELECT id FROM user_profiles)
ON CONFLICT (id) DO NOTHING;

-- 5. 특히 alsdn2606@gmail.com 사용자 확인 및 생성
DO $$
DECLARE
  user_id UUID;
  profile_exists BOOLEAN;
BEGIN
  -- 사용자 ID 찾기
  SELECT id INTO user_id FROM auth.users WHERE email = 'alsdn2606@gmail.com';
  
  IF user_id IS NOT NULL THEN
    -- 프로필 존재 여부 확인
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = user_id) INTO profile_exists;
    
    IF NOT profile_exists THEN
      -- 프로필이 없으면 생성
      INSERT INTO user_profiles (id)
      VALUES (user_id)
      ON CONFLICT (id) DO NOTHING;
      
      RAISE NOTICE 'Profile created for alsdn2606@gmail.com with ID: %', user_id;
    ELSE
      RAISE NOTICE 'Profile already exists for alsdn2606@gmail.com with ID: %', user_id;
    END IF;
  ELSE
    RAISE NOTICE 'User alsdn2606@gmail.com not found in auth.users';
  END IF;
END $$;

-- 6. ijg0341@gmail.com 사용자도 확인
DO $$
DECLARE
  user_id UUID;
  profile_exists BOOLEAN;
BEGIN
  -- 사용자 ID 찾기
  SELECT id INTO user_id FROM auth.users WHERE email = 'ijg0341@gmail.com';
  
  IF user_id IS NOT NULL THEN
    -- 프로필 존재 여부 확인
    SELECT EXISTS(SELECT 1 FROM user_profiles WHERE id = user_id) INTO profile_exists;
    
    IF NOT profile_exists THEN
      -- 프로필이 없으면 생성
      INSERT INTO user_profiles (id)
      VALUES (user_id)
      ON CONFLICT (id) DO NOTHING;
      
      RAISE NOTICE 'Profile created for ijg0341@gmail.com with ID: %', user_id;
    ELSE
      RAISE NOTICE 'Profile already exists for ijg0341@gmail.com with ID: %', user_id;
    END IF;
  ELSE
    RAISE NOTICE 'User ijg0341@gmail.com not found in auth.users';
  END IF;
END $$;

-- 7. user_profiles 테이블의 RLS 정책 확인 및 수정
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- 기존 정책 모두 삭제
DO $$ 
DECLARE
    pol RECORD;
BEGIN
    FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'user_profiles'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON user_profiles', pol.policyname);
    END LOOP;
END $$;

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

-- 8. 프로필 자동 생성 트리거 생성 (앞으로 새 사용자 가입 시 자동 생성)
CREATE OR REPLACE FUNCTION public.handle_new_user_profiles()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_profiles (id)
  VALUES (new.id)
  ON CONFLICT (id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 기존 트리거 삭제 후 재생성
DROP TRIGGER IF EXISTS on_auth_user_created_profiles ON auth.users;
CREATE TRIGGER on_auth_user_created_profiles
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_profiles();

-- 9. 모든 auth.users에 대한 프로필 생성 확인
INSERT INTO user_profiles (id)
SELECT id FROM auth.users
ON CONFLICT (id) DO NOTHING;

-- 10. 결과 확인 - 프로필과 사용자 매칭
SELECT 
  au.id,
  au.email,
  CASE WHEN up.id IS NOT NULL THEN '✓ Profile Exists' ELSE '✗ No Profile' END as profile_status,
  au.created_at as user_created
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
ORDER BY au.email;

-- 11. 업로드 데이터와 프로필 연결 확인
SELECT 
  au.email,
  COUNT(u.id) as upload_count,
  CASE WHEN up.id IS NOT NULL THEN '✓ Has Profile' ELSE '✗ No Profile' END as profile_status
FROM auth.users au
LEFT JOIN user_profiles up ON au.id = up.id
LEFT JOIN uploads u ON au.id = u.user_id
WHERE au.email IN ('alsdn2606@gmail.com', 'ijg0341@gmail.com')
GROUP BY au.email, up.id
ORDER BY au.email;

-- 12. 완료 메시지
DO $$
DECLARE
  profile_count INTEGER;
  user_count INTEGER;
  missing_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO profile_count FROM user_profiles;
  SELECT COUNT(*) INTO user_count FROM auth.users;
  
  SELECT COUNT(*) INTO missing_profiles
  FROM auth.users au
  LEFT JOIN user_profiles up ON au.id = up.id
  WHERE up.id IS NULL;
  
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Profile sync complete!';
  RAISE NOTICE 'Total users: %', user_count;
  RAISE NOTICE 'Total profiles: %', profile_count;
  RAISE NOTICE 'Missing profiles: %', missing_profiles;
  RAISE NOTICE '====================================';
  
  IF missing_profiles = 0 THEN
    RAISE NOTICE '✓ SUCCESS: All users now have profiles!';
  ELSE
    RAISE NOTICE '⚠ WARNING: Some users still missing profiles';
  END IF;
END $$;