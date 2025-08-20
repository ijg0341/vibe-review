-- API Keys 테이블 생성
CREATE TABLE IF NOT EXISTS api_keys (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    key_hash TEXT UNIQUE NOT NULL, -- API 키의 해시값 저장
    key_prefix TEXT NOT NULL, -- 키의 앞 8자리 (식별용)
    name TEXT NOT NULL,
    description TEXT,
    last_used_at TIMESTAMP WITH TIME ZONE,
    usage_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    expires_at TIMESTAMP WITH TIME ZONE, -- 선택적 만료일
    
    -- 유니크 제약: 한 사용자가 같은 이름의 키를 중복 생성 방지
    UNIQUE(user_id, name)
);

-- 인덱스 생성
CREATE INDEX idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX idx_api_keys_key_hash ON api_keys(key_hash);
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);
CREATE INDEX idx_api_keys_is_active ON api_keys(is_active);

-- RLS 정책 활성화
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 API 키만 조회 가능
CREATE POLICY "Users can view own api keys" ON api_keys
    FOR SELECT
    USING (auth.uid() = user_id);

-- 사용자는 자신의 API 키만 생성 가능
CREATE POLICY "Users can create own api keys" ON api_keys
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 API 키만 업데이트 가능
CREATE POLICY "Users can update own api keys" ON api_keys
    FOR UPDATE
    USING (auth.uid() = user_id);

-- 사용자는 자신의 API 키만 삭제 가능
CREATE POLICY "Users can delete own api keys" ON api_keys
    FOR DELETE
    USING (auth.uid() = user_id);

-- API 키 사용 로그 테이블
CREATE TABLE IF NOT EXISTS api_key_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE,
    action TEXT NOT NULL, -- 'upload', 'query', etc.
    ip_address INET,
    user_agent TEXT,
    request_path TEXT,
    request_method TEXT,
    response_status INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- 로그 인덱스
CREATE INDEX idx_api_key_logs_api_key_id ON api_key_logs(api_key_id);
CREATE INDEX idx_api_key_logs_created_at ON api_key_logs(created_at);

-- API 키 검증 함수
CREATE OR REPLACE FUNCTION verify_api_key(p_key_hash TEXT)
RETURNS TABLE (
    user_id UUID,
    key_id UUID,
    is_valid BOOLEAN,
    message TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_api_key RECORD;
BEGIN
    -- API 키 조회
    SELECT 
        ak.id,
        ak.user_id,
        ak.is_active,
        ak.expires_at
    INTO v_api_key
    FROM api_keys ak
    WHERE ak.key_hash = p_key_hash
    LIMIT 1;
    
    -- 키가 존재하지 않음
    IF NOT FOUND THEN
        RETURN QUERY
        SELECT 
            NULL::UUID,
            NULL::UUID,
            false,
            'Invalid API key'::TEXT;
        RETURN;
    END IF;
    
    -- 키가 비활성화됨
    IF NOT v_api_key.is_active THEN
        RETURN QUERY
        SELECT 
            v_api_key.user_id,
            v_api_key.id,
            false,
            'API key is inactive'::TEXT;
        RETURN;
    END IF;
    
    -- 키가 만료됨
    IF v_api_key.expires_at IS NOT NULL AND v_api_key.expires_at < NOW() THEN
        RETURN QUERY
        SELECT 
            v_api_key.user_id,
            v_api_key.id,
            false,
            'API key has expired'::TEXT;
        RETURN;
    END IF;
    
    -- 사용 횟수 및 마지막 사용 시간 업데이트
    UPDATE api_keys
    SET 
        last_used_at = NOW(),
        usage_count = usage_count + 1
    WHERE id = v_api_key.id;
    
    -- 성공
    RETURN QUERY
    SELECT 
        v_api_key.user_id,
        v_api_key.id,
        true,
        'Valid API key'::TEXT;
END;
$$;

-- API 키 생성을 위한 헬퍼 함수 (프론트엔드에서 호출)
CREATE OR REPLACE FUNCTION generate_api_key_prefix()
RETURNS TEXT
LANGUAGE sql
AS $$
    SELECT 'vibe_' || substr(md5(random()::text), 1, 8);
$$;