-- session_lines RPC 함수 타입 불일치 수정

-- 1. 기존 함수들 삭제
DROP FUNCTION IF EXISTS get_session_lines_info(UUID, TEXT);
DROP FUNCTION IF EXISTS get_session_lines(UUID, INTEGER, INTEGER, TEXT);

-- 2. get_session_lines_info 함수 재생성 (BIGINT 타입으로)
CREATE OR REPLACE FUNCTION get_session_lines_info(
  p_file_id UUID,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(total_lines BIGINT, total_pages BIGINT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_lines,
    CEIL(COUNT(*) / 50.0)::BIGINT as total_pages
  FROM session_lines
  WHERE file_id = p_file_id
    AND (p_search IS NULL OR raw_text ILIKE '%' || p_search || '%');
END;
$$;

-- 3. get_session_lines 함수 재생성
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
  message_timestamp TIMESTAMPTZ,
  metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := (p_page - 1) * p_limit;
  
  RETURN QUERY
  SELECT 
    sl.id,
    sl.line_number,
    sl.content,
    sl.raw_text,
    sl.message_type,
    sl.message_timestamp,
    sl.metadata
  FROM session_lines sl
  WHERE sl.file_id = p_file_id
    AND (p_search IS NULL OR sl.raw_text ILIKE '%' || p_search || '%')
  ORDER BY sl.line_number
  LIMIT p_limit
  OFFSET v_offset;
END;
$$;

-- 4. 권한 부여
GRANT EXECUTE ON FUNCTION get_session_lines_info(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_lines(UUID, INTEGER, INTEGER, TEXT) TO authenticated;

-- 5. 함수 반환 타입 확인
SELECT 
  proname,
  prorettype::regtype,
  proargnames,
  proargtypes::regtype[]
FROM pg_proc
WHERE proname IN ('get_session_lines_info', 'get_session_lines');

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE 'Functions recreated with BIGINT types!';
END $$;