-- User Settings 테이블 생성
CREATE TABLE IF NOT EXISTS user_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    project_path TEXT, -- 사용자의 기본 프로젝트 경로 (예: /Users/username/projects)
    claude_path TEXT DEFAULT '~/.claude/projects', -- Claude 프로젝트 경로
    auto_upload_enabled BOOLEAN DEFAULT false, -- 자동 업로드 활성화 여부
    upload_schedule TEXT, -- cron 표현식 (예: '0 * * * *')
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    
    -- 사용자당 하나의 설정만 가능
    UNIQUE(user_id)
);

-- 인덱스 생성
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);

-- RLS 정책 활성화
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 설정만 조회 가능
CREATE POLICY "Users can view own settings" ON user_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- 사용자는 자신의 설정만 생성 가능
CREATE POLICY "Users can create own settings" ON user_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- 사용자는 자신의 설정만 업데이트 가능
CREATE POLICY "Users can update own settings" ON user_settings
    FOR UPDATE
    USING (auth.uid() = user_id);

-- 사용자는 자신의 설정만 삭제 가능
CREATE POLICY "Users can delete own settings" ON user_settings
    FOR DELETE
    USING (auth.uid() = user_id);

-- 설정 조회 또는 생성 함수
CREATE OR REPLACE FUNCTION get_or_create_user_settings()
RETURNS user_settings
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_settings user_settings;
BEGIN
    -- 기존 설정 조회
    SELECT * INTO v_settings
    FROM user_settings
    WHERE user_id = auth.uid();
    
    -- 설정이 없으면 기본값으로 생성
    IF NOT FOUND THEN
        INSERT INTO user_settings (user_id)
        VALUES (auth.uid())
        RETURNING * INTO v_settings;
    END IF;
    
    RETURN v_settings;
END;
$$;

-- updated_at 자동 업데이트 트리거
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_settings_updated_at
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();