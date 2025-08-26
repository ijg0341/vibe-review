-- project_stats 뷰 또는 테이블 삭제

-- 1. 먼저 뷰인지 확인
SELECT table_name, table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'project_stats';

-- 2. 뷰라면 삭제
DROP VIEW IF EXISTS project_stats CASCADE;

-- 3. 테이블이라면 삭제 (주의: 데이터가 삭제됩니다!)
-- DROP TABLE IF EXISTS project_stats CASCADE;

-- 4. 관련 권한 제거 (이미 삭제되었다면 무시됨)
REVOKE ALL ON project_stats FROM authenticated;

-- 5. 확인 - 삭제 후 테이블 목록
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
AND table_name LIKE 'project%'
ORDER BY table_name;