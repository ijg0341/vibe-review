-- 현재 데이터베이스에 있는 테이블들 확인

-- 1. 모든 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- 2. projects 테이블 구조 확인
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'projects'
ORDER BY ordinal_position;

-- 3. project로 시작하는 모든 테이블 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name LIKE 'project%'
ORDER BY table_name;

-- 4. 뷰(View) 확인 - project_stats가 뷰일 가능성
SELECT table_name 
FROM information_schema.views 
WHERE table_schema = 'public'
AND table_name LIKE 'project%'
ORDER BY table_name;