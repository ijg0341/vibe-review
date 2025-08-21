-- uploaded_files 테이블에 대한 RLS 정책 수정
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own uploaded files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can insert own uploaded files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can update own uploaded files" ON uploaded_files;
DROP POLICY IF EXISTS "Users can delete own uploaded files" ON uploaded_files;

-- 새로운 정책 생성 (모든 인증된 사용자가 파일을 볼 수 있도록)
CREATE POLICY "Authenticated users can view all uploaded files" 
  ON uploaded_files FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own uploaded files" 
  ON uploaded_files FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM uploads 
      WHERE uploads.id = uploaded_files.upload_id 
      AND uploads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own uploaded files" 
  ON uploaded_files FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM uploads 
      WHERE uploads.id = uploaded_files.upload_id 
      AND uploads.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own uploaded files" 
  ON uploaded_files FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM uploads 
      WHERE uploads.id = uploaded_files.upload_id 
      AND uploads.user_id = auth.uid()
    )
  );

-- session_lines 테이블에 대한 RLS 정책 수정
-- 기존 정책 삭제
DROP POLICY IF EXISTS "Users can view own session lines" ON session_lines;
DROP POLICY IF EXISTS "Users can insert own session lines" ON session_lines;
DROP POLICY IF EXISTS "Users can update own session lines" ON session_lines;
DROP POLICY IF EXISTS "Users can delete own session lines" ON session_lines;

-- 새로운 정책 생성 (모든 인증된 사용자가 세션 라인을 볼 수 있도록)
CREATE POLICY "Authenticated users can view all session lines" 
  ON session_lines FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own session lines" 
  ON session_lines FOR INSERT 
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM uploaded_files uf
      JOIN uploads u ON u.id = uf.upload_id
      WHERE uf.id = session_lines.file_id 
      AND u.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update own session lines" 
  ON session_lines FOR UPDATE 
  USING (
    EXISTS (
      SELECT 1 FROM uploaded_files uf
      JOIN uploads u ON u.id = uf.upload_id
      WHERE uf.id = session_lines.file_id 
      AND u.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete own session lines" 
  ON session_lines FOR DELETE 
  USING (
    EXISTS (
      SELECT 1 FROM uploaded_files uf
      JOIN uploads u ON u.id = uf.upload_id
      WHERE uf.id = session_lines.file_id 
      AND u.user_id = auth.uid()
    )
  );

-- uploads 테이블도 확인 (이미 모든 인증된 사용자가 볼 수 있어야 함)
DROP POLICY IF EXISTS "Users can view own uploads" ON uploads;
DROP POLICY IF EXISTS "Users can view all uploads" ON uploads;

CREATE POLICY "Authenticated users can view all uploads" 
  ON uploads FOR SELECT 
  USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert own uploads" 
  ON uploads FOR INSERT 
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own uploads" 
  ON uploads FOR UPDATE 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own uploads" 
  ON uploads FOR DELETE 
  USING (auth.uid() = user_id);