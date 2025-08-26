-- projects 테이블이 없다면 생성
CREATE TABLE IF NOT EXISTS projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  folder_path TEXT NOT NULL,
  claude_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name);

-- RLS 활성화
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- RLS 정책
CREATE POLICY "Users can view their own projects" ON projects
  FOR SELECT USING (owner_id = auth.uid());

CREATE POLICY "Users can create projects" ON projects
  FOR INSERT WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Users can update their own projects" ON projects
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Users can delete their own projects" ON projects
  FOR DELETE USING (owner_id = auth.uid());

-- 멤버가 있는 프로젝트도 볼 수 있도록 추가 정책
CREATE POLICY "Members can view projects" ON projects
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM project_members 
      WHERE project_members.project_id = projects.id 
      AND project_members.user_id = auth.uid()
    )
  );