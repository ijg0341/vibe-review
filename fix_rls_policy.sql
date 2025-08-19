-- 기존 정책들 삭제
DROP POLICY IF EXISTS "Users can view own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can update own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can delete own uploads" ON uploads;

-- 새로운 정책들 생성 (더 유연한 방식)
CREATE POLICY "Users can view own uploads" ON uploads
  FOR SELECT USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can insert own uploads" ON uploads
  FOR INSERT WITH CHECK (auth.uid()::text = user_id::text);

CREATE POLICY "Users can update own uploads" ON uploads
  FOR UPDATE USING (auth.uid()::text = user_id::text);

CREATE POLICY "Users can delete own uploads" ON uploads
  FOR DELETE USING (auth.uid()::text = user_id::text);

-- 또는 임시로 RLS를 비활성화 (개발 중에만 사용)
-- ALTER TABLE uploads DISABLE ROW LEVEL SECURITY;