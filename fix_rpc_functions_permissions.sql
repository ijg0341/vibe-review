-- RPC 함수들의 권한을 확인하고 수정

-- 1. get_session_lines_info 함수 재생성 (보안 설정 변경)
DROP FUNCTION IF EXISTS get_session_lines_info;

CREATE OR REPLACE FUNCTION get_session_lines_info(
  p_file_id UUID,
  p_search TEXT DEFAULT NULL
)
RETURNS TABLE(total_lines BIGINT, total_pages INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER -- 함수 소유자 권한으로 실행
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_lines,
    CEIL(COUNT(*) / 50.0)::INTEGER as total_pages
  FROM session_lines
  WHERE file_id = p_file_id
    AND (p_search IS NULL OR raw_text ILIKE '%' || p_search || '%');
END;
$$;

-- 2. get_session_lines 함수 재생성 (보안 설정 변경)
DROP FUNCTION IF EXISTS get_session_lines;

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
SECURITY DEFINER -- 함수 소유자 권한으로 실행
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

-- 3. 함수들에 대한 권한 부여
GRANT EXECUTE ON FUNCTION get_session_lines_info(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_lines_info(UUID, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_session_lines(UUID, INTEGER, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION get_session_lines(UUID, INTEGER, INTEGER, TEXT) TO anon;

-- 4. get_or_create_user_settings 함수도 확인
DROP FUNCTION IF EXISTS get_or_create_user_settings;

CREATE OR REPLACE FUNCTION get_or_create_user_settings()
RETURNS TABLE(
  user_id UUID,
  project_path TEXT,
  claude_path TEXT,
  updated_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 현재 사용자 ID 가져오기
  v_user_id := auth.uid();
  
  -- user_settings 테이블이 없으면 null 반환
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'user_settings'
  ) THEN
    RETURN;
  END IF;
  
  -- 설정이 없으면 생성
  INSERT INTO user_settings (user_id, project_path, claude_path, updated_at)
  VALUES (v_user_id, '', '~/.claude/projects', NOW())
  ON CONFLICT (user_id) DO NOTHING;
  
  -- 설정 반환
  RETURN QUERY
  SELECT 
    us.user_id,
    us.project_path,
    us.claude_path,
    us.updated_at
  FROM user_settings us
  WHERE us.user_id = v_user_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_or_create_user_settings() TO authenticated;
GRANT EXECUTE ON FUNCTION get_or_create_user_settings() TO anon;