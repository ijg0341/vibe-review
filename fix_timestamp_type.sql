-- timestamp 타입 불일치 문제 해결

-- 1. session_lines 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'session_lines'
  AND column_name = 'message_timestamp';

-- 2. 기존 함수 삭제
DROP FUNCTION IF EXISTS get_session_lines CASCADE;
DROP FUNCTION IF EXISTS get_session_lines_info CASCADE;

-- 3. message_timestamp 컬럼을 TIMESTAMPTZ로 변경
ALTER TABLE session_lines 
ALTER COLUMN message_timestamp TYPE TIMESTAMPTZ 
USING message_timestamp AT TIME ZONE 'UTC';

-- 4. get_session_lines_info 함수 재생성
CREATE OR REPLACE FUNCTION get_session_lines_info(
  p_file_id UUID,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(total_lines BIGINT, total_pages BIGINT)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(*)::BIGINT,
    CEIL(COUNT(*)::NUMERIC / 50)::BIGINT
  FROM session_lines
  WHERE file_id = p_file_id
    AND (p_search IS NULL OR raw_text ILIKE '%' || p_search || '%');
$$;

-- 5. get_session_lines 함수 재생성 (TIMESTAMPTZ 사용)
CREATE OR REPLACE FUNCTION get_session_lines(
  p_file_id UUID,
  p_page INTEGER DEFAULT 1,
  p_limit INTEGER DEFAULT 50,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(
  id BIGINT,
  line_number INTEGER,
  content JSONB,
  raw_text TEXT,
  message_type TEXT,
  message_timestamp TIMESTAMPTZ,  -- TIMESTAMPTZ로 명시
  metadata JSONB
)
LANGUAGE sql
SECURITY DEFINER
AS $$
  SELECT 
    id::BIGINT,
    line_number,
    content,
    raw_text,
    message_type,
    message_timestamp,
    metadata
  FROM session_lines
  WHERE file_id = p_file_id
    AND (p_search IS NULL OR raw_text ILIKE '%' || p_search || '%')
  ORDER BY line_number
  LIMIT p_limit
  OFFSET (p_page - 1) * p_limit;
$$;

-- 6. 권한 부여
GRANT EXECUTE ON FUNCTION get_session_lines_info TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_lines TO authenticated;

-- 7. 확인
SELECT 'Timestamp type fixed!' as status;