-- session_lines 테이블 구조 및 RPC 함수 완전 수정

-- 1. session_lines 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  udt_name,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'session_lines'
ORDER BY ordinal_position;

-- 2. 기존 함수 삭제
DROP FUNCTION IF EXISTS get_session_lines_info CASCADE;
DROP FUNCTION IF EXISTS get_session_lines CASCADE;

-- 3. session_lines 테이블 id 컬럼이 INTEGER인 경우 BIGINT로 변경
ALTER TABLE session_lines 
ALTER COLUMN id TYPE BIGINT USING id::BIGINT;

-- 4. get_session_lines_info 함수 재생성 (확실한 BIGINT 캐스팅)
CREATE OR REPLACE FUNCTION public.get_session_lines_info(
  p_file_id UUID,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(total_lines BIGINT, total_pages BIGINT)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT 
    COUNT(*)::BIGINT as total_lines,
    CEIL(COUNT(*)::NUMERIC / 50)::BIGINT as total_pages
  FROM session_lines
  WHERE file_id = p_file_id
    AND (p_search IS NULL OR raw_text ILIKE '%' || p_search || '%');
$$;

-- 5. get_session_lines 함수 재생성
CREATE OR REPLACE FUNCTION public.get_session_lines(
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
LANGUAGE sql
STABLE
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
GRANT EXECUTE ON FUNCTION public.get_session_lines_info TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_lines_info TO anon;
GRANT EXECUTE ON FUNCTION public.get_session_lines_info TO service_role;

GRANT EXECUTE ON FUNCTION public.get_session_lines TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_session_lines TO anon;
GRANT EXECUTE ON FUNCTION public.get_session_lines TO service_role;

-- 7. 함수 테스트
DO $$
DECLARE
  test_file_id UUID;
  test_result RECORD;
BEGIN
  -- 테스트용 파일 ID 가져오기
  SELECT file_id INTO test_file_id 
  FROM session_lines 
  LIMIT 1;
  
  IF test_file_id IS NOT NULL THEN
    -- get_session_lines_info 테스트
    SELECT * INTO test_result 
    FROM get_session_lines_info(test_file_id);
    
    RAISE NOTICE 'get_session_lines_info test: total_lines=%, total_pages=%', 
      test_result.total_lines, test_result.total_pages;
    
    -- get_session_lines 테스트
    PERFORM * FROM get_session_lines(test_file_id, 1, 10);
    RAISE NOTICE 'get_session_lines test: Success';
  ELSE
    RAISE NOTICE 'No test data available';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Test failed: %', SQLERRM;
END $$;

-- 8. 최종 확인
SELECT 
  proname as function_name,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname IN ('get_session_lines_info', 'get_session_lines')
ORDER BY proname;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Session lines functions fixed!';
  RAISE NOTICE '- Table id column converted to BIGINT';
  RAISE NOTICE '- Functions use SQL language for simplicity';
  RAISE NOTICE '- Explicit type casting applied';
  RAISE NOTICE '====================================';
END $$;