-- 잘못 업로드된 데이터 확인 및 삭제
-- 예전 vibe-upload로 잘못 올라간 데이터 정리

-- 1. 최근에 업로드된 project_sessions 확인 (uploaded_files 테이블에 관련된 것)
SELECT 
  ps.id,
  ps.session_name,
  ps.file_name,
  ps.uploaded_at,
  ps.project_id,
  p.name as project_name,
  ps.user_id,
  ps.processing_status
FROM project_sessions ps
LEFT JOIN projects p ON p.id = ps.project_id
WHERE ps.uploaded_at > NOW() - INTERVAL '1 hour'
ORDER BY ps.uploaded_at DESC;

-- 2. uploaded_files 테이블에 잘못 들어간 데이터 확인
SELECT 
  uf.id,
  uf.file_name,
  uf.uploaded_at,
  uf.upload_id,
  uf.project_session_id
FROM uploaded_files uf
WHERE uf.uploaded_at > NOW() - INTERVAL '1 hour'
ORDER BY uf.uploaded_at DESC;

-- 3. 잘못된 데이터 삭제 (필요시 주석 해제)
-- uploaded_files 테이블의 최근 데이터 삭제
-- DELETE FROM uploaded_files 
-- WHERE uploaded_at > NOW() - INTERVAL '1 hour';

-- session_lines 테이블에서 잘못된 file_id 참조 삭제
-- DELETE FROM session_lines
-- WHERE file_id IN (
--   SELECT id FROM uploaded_files 
--   WHERE uploaded_at > NOW() - INTERVAL '1 hour'
-- );

-- uploads 테이블의 최근 데이터 삭제 (있다면)
-- DELETE FROM uploads 
-- WHERE uploaded_at > NOW() - INTERVAL '1 hour';

-- 4. 또는 특정 project_id나 session_id로 삭제
-- DELETE FROM session_lines WHERE upload_id = 'YOUR_SESSION_ID';
-- DELETE FROM project_sessions WHERE id = 'YOUR_SESSION_ID';
-- DELETE FROM uploaded_files WHERE upload_id = 'YOUR_UPLOAD_ID';
-- DELETE FROM uploads WHERE id = 'YOUR_UPLOAD_ID';