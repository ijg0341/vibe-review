-- 모든 사용자가 모든 세션 내용을 조회할 수 있도록 RLS 정책 완전 개방

-- 1. uploads 테이블의 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can view all uploads" ON uploads;
DROP POLICY IF EXISTS "Authenticated users can view all uploads" ON uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can update own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can delete own uploads" ON uploads;
DROP POLICY IF EXISTS "uploads_select_policy" ON uploads;
DROP POLICY IF EXISTS "uploads_insert_policy" ON uploads;
DROP POLICY IF EXISTS "uploads_update_policy" ON uploads;
DROP POLICY IF EXISTS "uploads_delete_policy" ON uploads;

-- 2. uploaded_files 테이블의 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own uploaded files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can insert own uploaded files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can update own uploaded files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can delete own uploaded files" ON uploaded_files;
DROP POLICY IF EXISTS "Authenticated users can view all uploaded files" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_select_policy" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_insert_policy" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_update_policy" ON uploaded_files;
DROP POLICY IF EXISTS "uploaded_files_delete_policy" ON uploaded_files;

-- 3. session_lines 테이블의 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own session lines" ON session_lines;
DROP POLICY IF EXISTS "Users can insert own session lines" ON session_lines;
DROP POLICY IF EXISTS "Users can update own session lines" ON session_lines;
DROP POLICY IF EXISTS "Users can delete own session lines" ON session_lines;
DROP POLICY IF EXISTS "Authenticated users can view all session lines" ON session_lines;
DROP POLICY IF EXISTS "session_lines_select_policy" ON session_lines;
DROP POLICY IF EXISTS "session_lines_insert_policy" ON session_lines;
DROP POLICY IF EXISTS "session_lines_update_policy" ON session_lines;
DROP POLICY IF EXISTS "session_lines_delete_policy" ON session_lines;

-- 4. uploads 테이블에 새로운 정책 생성 (모든 인증된 사용자가 모든 것을 볼 수 있음)
CREATE POLICY "anyone_can_view_uploads" 
  ON uploads FOR SELECT 
  USING (true);  -- 모든 사용자 허용

CREATE POLICY "users_can_insert_own_uploads" 
  ON uploads FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_uploads" 
  ON uploads FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_uploads" 
  ON uploads FOR DELETE 
  USING (auth.uid() = user_id);

-- 5. uploaded_files 테이블에 새로운 정책 생성 (모든 인증된 사용자가 모든 것을 볼 수 있음)
CREATE POLICY "anyone_can_view_uploaded_files" 
  ON uploaded_files FOR SELECT 
  USING (true);  -- 모든 사용자 허용

CREATE POLICY "users_can_insert_own_uploaded_files" 
  ON uploaded_files FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM uploads 
      WHERE uploads.id = uploaded_files.upload_id 
      AND uploads.user_id = auth.uid()
    )
  );

CREATE POLICY "users_can_update_own_uploaded_files" 
  ON uploaded_files FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM uploads 
      WHERE uploads.id = uploaded_files.upload_id 
      AND uploads.user_id = auth.uid()
    )
  );

CREATE POLICY "users_can_delete_own_uploaded_files" 
  ON uploaded_files FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM uploads 
      WHERE uploads.id = uploaded_files.upload_id 
      AND uploads.user_id = auth.uid()
    )
  );

-- 6. session_lines 테이블에 새로운 정책 생성 (모든 인증된 사용자가 모든 것을 볼 수 있음)
CREATE POLICY "anyone_can_view_session_lines" 
  ON session_lines FOR SELECT 
  USING (true);  -- 모든 사용자 허용

CREATE POLICY "users_can_insert_own_session_lines" 
  ON session_lines FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM uploaded_files uf
      JOIN uploads u ON u.id = uf.upload_id
      WHERE uf.id = session_lines.file_id 
      AND u.user_id = auth.uid()
    )
  );

CREATE POLICY "users_can_update_own_session_lines" 
  ON session_lines FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM uploaded_files uf
      JOIN uploads u ON u.id = uf.upload_id
      WHERE uf.id = session_lines.file_id 
      AND u.user_id = auth.uid()
    )
  );

CREATE POLICY "users_can_delete_own_session_lines" 
  ON session_lines FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM uploaded_files uf
      JOIN uploads u ON u.id = uf.upload_id
      WHERE uf.id = session_lines.file_id 
      AND u.user_id = auth.uid()
    )
  );

-- 7. api_keys 테이블 확인 (이미 설정되어 있을 수 있음)
-- api_keys는 본인 것만 봐야 하므로 그대로 둠

-- 8. profiles 테이블 확인
-- profiles는 모든 사용자가 볼 수 있어야 함 (팀 기능)

-- 확인 메시지
DO $$
BEGIN
  RAISE NOTICE 'RLS policies have been updated to allow all authenticated users to view all session data';
END $$;