-- 완전한 함수 재생성 스크립트

-- 1. 모든 스키마에서 모든 버전의 함수 찾기
SELECT 
  n.nspname as schema_name,
  p.proname as function_name,
  pg_get_function_identity_arguments(p.oid) as arguments,
  pg_get_function_result(p.oid) as return_type
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('get_session_lines_info', 'get_session_lines')
ORDER BY n.nspname, p.proname;

-- 2. 모든 가능한 버전의 함수 삭제 (모든 파라미터 조합)
DROP FUNCTION IF EXISTS public.get_session_lines_info(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_session_lines_info(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_session_lines_info CASCADE;

DROP FUNCTION IF EXISTS public.get_session_lines(UUID, INTEGER, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS public.get_session_lines(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_session_lines(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS public.get_session_lines(UUID) CASCADE;
DROP FUNCTION IF EXISTS public.get_session_lines CASCADE;

-- 다른 스키마에도 있을 수 있으니 확인
DROP FUNCTION IF EXISTS get_session_lines_info(UUID, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_session_lines_info(UUID) CASCADE;
DROP FUNCTION IF EXISTS get_session_lines(UUID, INTEGER, INTEGER, TEXT) CASCADE;
DROP FUNCTION IF EXISTS get_session_lines(UUID, INTEGER, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_session_lines(UUID, INTEGER) CASCADE;
DROP FUNCTION IF EXISTS get_session_lines(UUID) CASCADE;

-- 3. 함수가 완전히 삭제되었는지 확인
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc WHERE proname IN ('get_session_lines_info', 'get_session_lines')
  ) THEN
    RAISE WARNING 'Functions still exist after deletion attempt!';
  ELSE
    RAISE NOTICE 'All functions successfully deleted.';
  END IF;
END $$;

-- 4. session_lines 테이블 구조 확인 및 수정
DO $$
DECLARE
  v_data_type TEXT;
BEGIN
  -- id 컬럼의 현재 타입 확인
  SELECT data_type INTO v_data_type
  FROM information_schema.columns
  WHERE table_name = 'session_lines' AND column_name = 'id';
  
  RAISE NOTICE 'Current id column type: %', v_data_type;
  
  -- INTEGER면 BIGINT로 변경
  IF v_data_type = 'integer' THEN
    ALTER TABLE session_lines ALTER COLUMN id TYPE BIGINT;
    RAISE NOTICE 'Changed id column from INTEGER to BIGINT';
  END IF;
END $$;

-- 5. get_session_lines_info 함수 새로 생성 (명확한 타입 정의)
CREATE OR REPLACE FUNCTION public.get_session_lines_info(
  p_file_id UUID,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(
  total_lines BIGINT,
  total_pages BIGINT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(COUNT(*), 0)::BIGINT as total_lines,
    COALESCE(CEIL(COUNT(*)::NUMERIC / 50.0), 0)::BIGINT as total_pages
  FROM session_lines
  WHERE file_id = p_file_id
    AND (p_search IS NULL OR raw_text ILIKE '%' || p_search || '%');
END;
$$;

-- 6. get_session_lines 함수 새로 생성
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
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_offset INTEGER;
BEGIN
  v_offset := GREATEST(0, (p_page - 1) * p_limit);
  
  RETURN QUERY
  SELECT 
    sl.id::BIGINT,
    sl.line_number::INTEGER,
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

-- 7. 권한 부여
GRANT EXECUTE ON FUNCTION public.get_session_lines_info(UUID, TEXT) TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION public.get_session_lines(UUID, INTEGER, INTEGER, TEXT) TO authenticated, anon, service_role;

-- 8. 함수 검증
DO $$
DECLARE
  test_file_id UUID;
  test_total_lines BIGINT;
  test_total_pages BIGINT;
  test_record RECORD;
BEGIN
  -- 테스트 데이터 찾기
  SELECT file_id INTO test_file_id FROM session_lines LIMIT 1;
  
  IF test_file_id IS NOT NULL THEN
    -- get_session_lines_info 테스트
    BEGIN
      SELECT * INTO test_total_lines, test_total_pages 
      FROM public.get_session_lines_info(test_file_id, NULL);
      
      RAISE NOTICE 'get_session_lines_info SUCCESS: lines=%, pages=%', test_total_lines, test_total_pages;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'get_session_lines_info FAILED: %', SQLERRM;
    END;
    
    -- get_session_lines 테스트
    BEGIN
      FOR test_record IN 
        SELECT * FROM public.get_session_lines(test_file_id, 1, 1, NULL) LIMIT 1
      LOOP
        RAISE NOTICE 'get_session_lines SUCCESS: id=% (type: %)', test_record.id, pg_typeof(test_record.id);
      END LOOP;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'get_session_lines FAILED: %', SQLERRM;
    END;
  ELSE
    RAISE NOTICE 'No test data available';
  END IF;
END $$;

-- 9. 최종 함수 상태 확인
SELECT 
  n.nspname as schema,
  p.proname as function,
  pg_get_function_identity_arguments(p.oid) as params,
  pg_get_function_result(p.oid) as returns
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname IN ('get_session_lines_info', 'get_session_lines')
ORDER BY p.proname;

-- 10. 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'FUNCTION RECREATION COMPLETE!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Actions taken:';
  RAISE NOTICE '1. Deleted ALL versions of functions';
  RAISE NOTICE '2. Changed session_lines.id to BIGINT';
  RAISE NOTICE '3. Created new functions with correct types';
  RAISE NOTICE '4. Granted proper permissions';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;