-- Session lines 테이블 생성 (JSONL 파일의 각 줄을 저장)
CREATE TABLE IF NOT EXISTS session_lines (
    id SERIAL PRIMARY KEY,
    upload_id UUID NOT NULL REFERENCES uploads(id) ON DELETE CASCADE,
    file_id UUID NOT NULL REFERENCES uploaded_files(id) ON DELETE CASCADE,
    line_number INT NOT NULL,
    content JSONB,
    raw_text TEXT NOT NULL,
    message_type TEXT, -- 'user', 'assistant', 'system' 등
    message_timestamp TIMESTAMP,
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- 복합 유니크 키 (같은 파일의 같은 줄 번호는 중복 불가)
    UNIQUE(file_id, line_number)
);

-- 검색 및 쿼리 성능을 위한 인덱스
CREATE INDEX idx_session_lines_upload_id ON session_lines(upload_id);
CREATE INDEX idx_session_lines_file_id ON session_lines(file_id);
CREATE INDEX idx_session_lines_line_number ON session_lines(line_number);
CREATE INDEX idx_session_lines_content_gin ON session_lines USING gin(content);
CREATE INDEX idx_session_lines_fulltext ON session_lines USING gin(to_tsvector('english', raw_text));
CREATE INDEX idx_session_lines_message_type ON session_lines(message_type);
CREATE INDEX idx_session_lines_message_timestamp ON session_lines(message_timestamp);

-- RLS 정책
ALTER TABLE session_lines ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 업로드에 속한 session_lines만 볼 수 있음
CREATE POLICY "Users can view their own session lines" ON session_lines
    FOR SELECT
    USING (
        upload_id IN (
            SELECT id FROM uploads WHERE user_id = auth.uid()
        )
    );

-- 사용자는 자신의 업로드에 대한 session_lines를 추가할 수 있음
CREATE POLICY "Users can insert their own session lines" ON session_lines
    FOR INSERT
    WITH CHECK (
        upload_id IN (
            SELECT id FROM uploads WHERE user_id = auth.uid()
        )
    );

-- 사용자는 자신의 session_lines를 삭제할 수 있음
CREATE POLICY "Users can delete their own session lines" ON session_lines
    FOR DELETE
    USING (
        upload_id IN (
            SELECT id FROM uploads WHERE user_id = auth.uid()
        )
    );

-- 페이지네이션과 검색을 위한 RPC 함수
CREATE OR REPLACE FUNCTION get_session_lines(
    p_file_id UUID,
    p_page INT DEFAULT 1,
    p_limit INT DEFAULT 50,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    id INT,
    line_number INT,
    content JSONB,
    raw_text TEXT,
    message_type TEXT,
    message_timestamp TIMESTAMP,
    metadata JSONB
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- 권한 체크: 사용자가 이 파일에 접근할 수 있는지 확인
    IF NOT EXISTS (
        SELECT 1 FROM uploaded_files f
        JOIN uploads u ON f.upload_id = u.id
        WHERE f.id = p_file_id AND u.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized access to file';
    END IF;

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
    OFFSET (p_page - 1) * p_limit;
END;
$$;

-- 총 줄 수와 페이지 정보를 가져오는 함수
CREATE OR REPLACE FUNCTION get_session_lines_info(
    p_file_id UUID,
    p_search TEXT DEFAULT NULL
)
RETURNS TABLE (
    total_lines INT,
    total_pages INT,
    has_content BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_total_lines INT;
    v_page_size INT := 50;
BEGIN
    -- 권한 체크
    IF NOT EXISTS (
        SELECT 1 FROM uploaded_files f
        JOIN uploads u ON f.upload_id = u.id
        WHERE f.id = p_file_id AND u.user_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'Unauthorized access to file';
    END IF;

    -- 총 줄 수 계산
    SELECT COUNT(*)
    INTO v_total_lines
    FROM session_lines sl
    WHERE sl.file_id = p_file_id
        AND (p_search IS NULL OR sl.raw_text ILIKE '%' || p_search || '%');

    RETURN QUERY
    SELECT 
        v_total_lines,
        CEIL(v_total_lines::FLOAT / v_page_size)::INT,
        v_total_lines > 0;
END;
$$;

-- 파일 처리 상태를 추가하기 위한 컬럼 추가
ALTER TABLE uploaded_files 
ADD COLUMN IF NOT EXISTS processing_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS processed_lines INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS processing_error TEXT;

-- Processing status: 'pending', 'processing', 'completed', 'error'