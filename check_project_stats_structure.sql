-- project_stats 테이블 구조 확인

-- 1. project_stats 테이블의 컬럼 정보
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'project_stats'
ORDER BY ordinal_position;

-- 2. project_stats 테이블의 데이터 샘플 확인
SELECT * FROM project_stats LIMIT 5;

-- 3. 현재 존재하는 모든 테이블 목록
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 4. project_sessions 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'project_sessions'
ORDER BY ordinal_position;