-- 개별 파일 정보를 저장하는 테이블
CREATE TABLE uploaded_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- 직접적인 유저 구분
  upload_id UUID REFERENCES uploads(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Storage에서의 전체 경로 (user_id/project_name/file_name)
  file_size BIGINT,
  content_type TEXT DEFAULT 'application/jsonl',
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS 정책 활성화
ALTER TABLE uploaded_files ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 파일만 조회 가능 (직접 user_id로)
CREATE POLICY "Users can view own files" ON uploaded_files
  FOR SELECT USING (auth.uid() = user_id);

-- 사용자는 자신의 파일만 삽입 가능
CREATE POLICY "Users can insert own files" ON uploaded_files
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 파일만 업데이트 가능
CREATE POLICY "Users can update own files" ON uploaded_files
  FOR UPDATE USING (auth.uid() = user_id);

-- 사용자는 자신의 파일만 삭제 가능
CREATE POLICY "Users can delete own files" ON uploaded_files
  FOR DELETE USING (auth.uid() = user_id);

-- 인덱스 추가
CREATE INDEX idx_uploaded_files_user_id ON uploaded_files(user_id);
CREATE INDEX idx_uploaded_files_upload_id ON uploaded_files(upload_id);
CREATE INDEX idx_uploaded_files_file_path ON uploaded_files(file_path);