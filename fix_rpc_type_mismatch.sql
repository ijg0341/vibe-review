-- RPC 함수 타입 불일치 문제 해결

-- 1. 기존 함수들 삭제
DROP FUNCTION IF EXISTS get_session_lines_info(UUID, TEXT);
DROP FUNCTION IF EXISTS get_session_lines(UUID, INTEGER, INTEGER, TEXT);

-- 2. get_session_lines_info 함수 재생성 (타입 수정: INTEGER -> BIGINT)
CREATE OR REPLACE FUNCTION get_session_lines_info(
  p_file_id UUID,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(total_lines BIGINT, total_pages BIGINT)  -- INTEGER를 BIGINT로 변경
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT as total_lines,  -- 명시적으로 BIGINT 캐스팅
    CEIL(COUNT(*) / 50.0)::BIGINT as total_pages  -- 명시적으로 BIGINT 캐스팅
  FROM session_lines
  WHERE file_id = p_file_id
    AND (p_search IS NULL OR raw_text ILIKE '%' || p_search || '%');
END;
$$;

-- 3. get_session_lines 함수 재생성 (타입 일관성 확보)
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

-- 4. 함수들에 대한 권한 부여
GRANT EXECUTE ON FUNCTION get_session_lines_info(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_lines_info(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_session_lines_info(UUID, TEXT) TO service_role;

GRANT EXECUTE ON FUNCTION get_session_lines(UUID, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_lines(UUID, INTEGER, INTEGER, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_session_lines(UUID, INTEGER, INTEGER, TEXT) TO service_role;

-- 5. 함수 테스트 (타입 확인)
DO $$
DECLARE
  test_file_id UUID;
  test_total_lines BIGINT;
  test_total_pages BIGINT;
BEGIN
  -- 테스트용 파일 ID 가져오기
  SELECT id INTO test_file_id FROM uploaded_files LIMIT 1;
  
  IF test_file_id IS NOT NULL THEN
    -- 함수 호출 테스트
    SELECT total_lines, total_pages 
    INTO test_total_lines, test_total_pages
    FROM get_session_lines_info(test_file_id, NULL);
    
    RAISE NOTICE 'Function test successful!';
    RAISE NOTICE 'Test file ID: %', test_file_id;
    RAISE NOTICE 'Total lines: %, Total pages: %', test_total_lines, test_total_pages;
  ELSE
    RAISE NOTICE 'No uploaded files found for testing';
  END IF;
END $$;

-- 6. session_lines 테이블 구조 확인 (id 컬럼 타입 확인)
SELECT 
  column_name,
  data_type,
  udt_name
FROM information_schema.columns
WHERE table_name = 'session_lines'
  AND column_name IN ('id', 'line_number')
ORDER BY ordinal_position;

-- 7. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'RPC function type mismatch fixed!';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes made:';
  RAISE NOTICE '- get_session_lines_info now returns BIGINT instead of INTEGER';
  RAISE NOTICE '- All type castings are explicit';
  RAISE NOTICE '- Functions have proper permissions';
  RAISE NOTICE '';
  RAISE NOTICE 'The error "Returned type integer does not match expected type bigint" should be resolved';
  RAISE NOTICE '====================================';
END $$;