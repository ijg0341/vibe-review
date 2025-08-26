-- 프로젝트 중심 구조로 전환하는 마이그레이션 스크립트

-- 1. 프로젝트 테이블 생성
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  folder_path VARCHAR(500) NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name, owner_id) -- 같은 소유자는 같은 이름의 프로젝트를 가질 수 없음
);

-- 2. 프로젝트 멤버 테이블 생성
CREATE TABLE IF NOT EXISTS project_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role VARCHAR(50) DEFAULT 'member' CHECK (role IN ('owner', 'member', 'viewer')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, user_id)
);

-- 3. 프로젝트 세션 테이블 생성 (기존 uploads 테이블 대체)
CREATE TABLE IF NOT EXISTS project_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  session_name VARCHAR(255),
  session_count INTEGER DEFAULT 0,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  metadata JSONB
);

-- 4. 세션 파일 테이블 수정 (기존 uploaded_files와 연결)
ALTER TABLE uploaded_files 
ADD COLUMN IF NOT EXISTS project_session_id UUID REFERENCES project_sessions(id) ON DELETE CASCADE;

-- 5. 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_sessions_project_id ON project_sessions(project_id);
CREATE INDEX IF NOT EXISTS idx_project_sessions_user_id ON project_sessions(user_id);

-- 6. RLS (Row Level Security) 정책 설정
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_sessions ENABLE ROW LEVEL SECURITY;

-- Projects 정책
CREATE POLICY "Users can view projects they are members of" ON projects
  FOR SELECT USING (
    auth.uid() = owner_id OR 
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = projects.id 
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create their own projects" ON projects
  FOR INSERT WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Owners can update their projects" ON projects
  FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY "Owners can delete their projects" ON projects
  FOR DELETE USING (auth.uid() = owner_id);

-- Project Members 정책
CREATE POLICY "Members can view project members" ON project_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members pm
      WHERE pm.project_id = project_members.project_id 
      AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "Project owners can manage members" ON project_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects 
      WHERE projects.id = project_members.project_id 
      AND projects.owner_id = auth.uid()
    )
  );

-- Project Sessions 정책
CREATE POLICY "Members can view project sessions" ON project_sessions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = project_sessions.project_id 
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Members can create sessions" ON project_sessions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = project_sessions.project_id 
      AND project_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own sessions" ON project_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON project_sessions
  FOR DELETE USING (auth.uid() = user_id);

-- 7. 함수: 프로젝트 생성 시 자동으로 owner를 member로 추가
CREATE OR REPLACE FUNCTION add_owner_as_member()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER add_owner_as_member_trigger
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION add_owner_as_member();

-- 8. 함수: 프로젝트 찾기 또는 생성
CREATE OR REPLACE FUNCTION find_or_create_project(
  p_name VARCHAR(255),
  p_folder_path VARCHAR(500),
  p_user_id UUID,
  p_description TEXT DEFAULT NULL
)
RETURNS TABLE(
  project_id UUID,
  is_new BOOLEAN,
  project_name VARCHAR(255)
) AS $$
DECLARE
  v_project_id UUID;
  v_is_new BOOLEAN := FALSE;
BEGIN
  -- 먼저 기존 프로젝트 찾기
  SELECT id INTO v_project_id
  FROM projects
  WHERE name = p_name AND owner_id = p_user_id;
  
  -- 없으면 새로 생성
  IF v_project_id IS NULL THEN
    INSERT INTO projects (name, folder_path, description, owner_id)
    VALUES (p_name, p_folder_path, p_description, p_user_id)
    RETURNING id INTO v_project_id;
    
    v_is_new := TRUE;
  END IF;
  
  RETURN QUERY SELECT v_project_id, v_is_new, p_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 9. 함수: 프로젝트 멤버 추가
CREATE OR REPLACE FUNCTION add_project_member(
  p_project_id UUID,
  p_user_email VARCHAR(255),
  p_role VARCHAR(50) DEFAULT 'member'
)
RETURNS BOOLEAN AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 이메일로 사용자 ID 찾기
  SELECT id INTO v_user_id
  FROM auth.users
  WHERE email = p_user_email;
  
  IF v_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  
  -- 멤버 추가 (이미 있으면 무시)
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (p_project_id, v_user_id, p_role)
  ON CONFLICT (project_id, user_id) DO NOTHING;
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. 뷰: 프로젝트 통계
CREATE OR REPLACE VIEW project_stats AS
SELECT 
  p.id,
  p.name,
  p.folder_path,
  p.description,
  p.owner_id,
  p.created_at,
  COUNT(DISTINCT pm.user_id) as member_count,
  COUNT(DISTINCT ps.id) as session_count,
  MAX(ps.uploaded_at) as last_activity
FROM projects p
LEFT JOIN project_members pm ON p.id = pm.project_id
LEFT JOIN project_sessions ps ON p.id = ps.project_id
GROUP BY p.id, p.name, p.folder_path, p.description, p.owner_id, p.created_at;

-- 권한 부여
GRANT ALL ON projects TO authenticated;
GRANT ALL ON project_members TO authenticated;
GRANT ALL ON project_sessions TO authenticated;
GRANT SELECT ON project_stats TO authenticated;
GRANT EXECUTE ON FUNCTION find_or_create_project TO authenticated;
GRANT EXECUTE ON FUNCTION add_project_member TO authenticated;

-- 완료 메시지
DO $$
BEGIN
  RAISE NOTICE '====================================';
  RAISE NOTICE 'Project structure migration complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'New tables created:';
  RAISE NOTICE '- projects';
  RAISE NOTICE '- project_members';
  RAISE NOTICE '- project_sessions';
  RAISE NOTICE '';
  RAISE NOTICE 'Functions created:';
  RAISE NOTICE '- find_or_create_project()';
  RAISE NOTICE '- add_project_member()';
  RAISE NOTICE '====================================';
END $$;