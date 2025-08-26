-- project_sessions 테이블에 파일 관련 컬럼 추가
ALTER TABLE project_sessions 
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_path TEXT,
ADD COLUMN IF NOT EXISTS file_size INTEGER,
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS processed_lines INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- 기존 uploaded_files 데이터를 project_sessions로 마이그레이션 (필요한 경우)
-- INSERT INTO project_sessions (id, project_id, user_id, session_name, file_name, file_path, file_size, processing_status, processed_lines, processing_error, uploaded_at)
-- SELECT 
--   uf.id,
--   COALESCE(uf.project_session_id, (SELECT id FROM projects WHERE projects.name = u.project_name LIMIT 1)),
--   uf.user_id,
--   REPLACE(uf.file_name, '.jsonl', ''),
--   uf.file_name,
--   uf.file_path,
--   uf.file_size,
--   uf.processing_status,
--   uf.processed_lines,
--   uf.processing_error,
--   uf.uploaded_at
-- FROM uploaded_files uf
-- LEFT JOIN uploads u ON u.id = uf.upload_id
-- WHERE uf.project_session_id IS NULL;

-- session_lines 테이블에서 upload_id를 session_id로 변경 (이미 되어있을 수도 있음)
-- ALTER TABLE session_lines RENAME COLUMN upload_id TO session_id;

-- 인덱스 추가
CREATE INDEX IF NOT EXISTS idx_project_sessions_file_name ON project_sessions(file_name);
CREATE INDEX IF NOT EXISTS idx_project_sessions_processing_status ON project_sessions(processing_status);

-- 불필요한 테이블 제거 (데이터 백업 후 실행)
-- DROP TABLE IF EXISTS uploads CASCADE;
-- DROP TABLE IF EXISTS uploaded_files CASCADE;