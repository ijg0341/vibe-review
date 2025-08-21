-- 1. uploads 테이블의 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can view all uploads" ON uploads;
DROP POLICY IF EXISTS "Authenticated users can view all uploads" ON uploads;
DROP POLICY IF EXISTS "Users can insert own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can update own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can delete own uploads" ON uploads;

-- 2. uploaded_files 테이블의 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own uploaded files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can insert own uploaded files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can update own uploaded files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can delete own uploaded files" ON uploaded_files;
DROP POLICY IF EXISTS "Authenticated users can view all uploaded files" ON uploaded_files;

-- 3. session_lines 테이블의 모든 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own session lines" ON session_lines;
DROP POLICY IF EXISTS "Users can insert own session lines" ON session_lines;
DROP POLICY IF EXISTS "Users can update own session lines" ON session_lines;
DROP POLICY IF EXISTS "Users can delete own session lines" ON session_lines;
DROP POLICY IF EXISTS "Authenticated users can view all session lines" ON session_lines;

-- 4. uploads 테이블에 새로운 정책 생성
CREATE POLICY "uploads_select_policy" 
  ON uploads FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "uploads_insert_policy" 
  ON uploads FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "uploads_update_policy" 
  ON uploads FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "uploads_delete_policy" 
  ON uploads FOR DELETE 
  USING (auth.uid() = user_id);

-- 5. uploaded_files 테이블에 새로운 정책 생성
CREATE POLICY "uploaded_files_select_policy" 
  ON uploaded_files FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "uploaded_files_insert_policy" 
  ON uploaded_files FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM uploads 
      WHERE uploads.id = uploaded_files.upload_id 
      AND uploads.user_id = auth.uid()
    )
  );

CREATE POLICY "uploaded_files_update_policy" 
  ON uploaded_files FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM uploads 
      WHERE uploads.id = uploaded_files.upload_id 
      AND uploads.user_id = auth.uid()
    )
  );

CREATE POLICY "uploaded_files_delete_policy" 
  ON uploaded_files FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM uploads 
      WHERE uploads.id = uploaded_files.upload_id 
      AND uploads.user_id = auth.uid()
    )
  );

-- 6. session_lines 테이블에 새로운 정책 생성
CREATE POLICY "session_lines_select_policy" 
  ON session_lines FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "session_lines_insert_policy" 
  ON session_lines FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM uploaded_files uf
      JOIN uploads u ON u.id = uf.upload_id
      WHERE uf.id = session_lines.file_id 
      AND u.user_id = auth.uid()
    )
  );

CREATE POLICY "session_lines_update_policy" 
  ON session_lines FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM uploaded_files uf
      JOIN uploads u ON u.id = uf.upload_id
      WHERE uf.id = session_lines.file_id 
      AND u.user_id = auth.uid()
    )
  );

CREATE POLICY "session_lines_delete_policy" 
  ON session_lines FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM uploaded_files uf
      JOIN uploads u ON u.id = uf.upload_id
      WHERE uf.id = session_lines.file_id 
      AND u.user_id = auth.uid()
    )
  );

-- 7. RLS 함수들도 인증된 사용자가 접근 가능하도록 확인
-- get_session_lines 함수 권한 부여
GRANT EXECUTE ON FUNCTION get_session_lines TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_lines_info TO authenticated;