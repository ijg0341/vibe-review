-- Fix infinite recursion in RLS policies for project tables
-- Drop existing policies first to avoid conflicts

-- Drop existing policies for projects table
DROP POLICY IF EXISTS "Users can view projects they are members of" ON projects;
DROP POLICY IF EXISTS "Users can create projects" ON projects;
DROP POLICY IF EXISTS "Project owners can update their projects" ON projects;
DROP POLICY IF EXISTS "Project owners can delete their projects" ON projects;

-- Drop existing policies for project_members table
DROP POLICY IF EXISTS "Users can view members of their projects" ON project_members;
DROP POLICY IF EXISTS "Project owners can add members" ON project_members;
DROP POLICY IF EXISTS "Project owners can remove members" ON project_members;

-- Drop existing policies for project_sessions table
DROP POLICY IF EXISTS "Users can view sessions of their projects" ON project_sessions;
DROP POLICY IF EXISTS "Users can upload sessions to their projects" ON project_sessions;
DROP POLICY IF EXISTS "Users can delete their own sessions" ON project_sessions;

-- Create simplified policies for projects table
CREATE POLICY "Users can view projects they are members of"
ON projects FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = projects.id
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can create projects"
ON projects FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Project owners can update their projects"
ON projects FOR UPDATE
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Project owners can delete their projects"
ON projects FOR DELETE
USING (auth.uid() = owner_id);

-- Create simplified policies for project_members table
CREATE POLICY "Users can view project members"
ON project_members FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM project_members pm2
    WHERE pm2.project_id = project_members.project_id
  )
);

CREATE POLICY "Project owners can manage members"
ON project_members FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = project_members.project_id
    AND projects.owner_id = auth.uid()
  )
);

-- Create simplified policies for project_sessions table
CREATE POLICY "Users can view project sessions"
ON project_sessions FOR SELECT
USING (
  auth.uid() IN (
    SELECT user_id FROM project_members
    WHERE project_members.project_id = project_sessions.project_id
  )
);

CREATE POLICY "Users can upload sessions to their projects"
ON project_sessions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members
    WHERE project_members.project_id = project_sessions.project_id
    AND project_members.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete their own sessions"
ON project_sessions FOR DELETE
USING (auth.uid() = user_id);

-- Create a view for project stats that avoids recursion
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
LEFT JOIN project_members pm ON pm.project_id = p.id
LEFT JOIN project_sessions ps ON ps.project_id = p.id
GROUP BY p.id, p.name, p.folder_path, p.description, p.owner_id, p.created_at;

-- Grant access to the view
GRANT SELECT ON project_stats TO authenticated;