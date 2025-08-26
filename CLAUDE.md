# Claude Code Instructions

## Database Queries

데이터베이스 작업이 필요한 경우, 아래 접속 정보를 사용하여 직접 PostgreSQL 쿼리를 실행합니다:

```
postgresql://postgres.oprwxbtukrafehaotgqm:[YOUR-PASSWORD]@aws-0-us-east-2.pooler.supabase.com:5432/postgres
```

**중요**: 
- 데이터베이스 관련 작업 시 항상 위 접속 정보를 사용하여 psql 또는 다른 PostgreSQL 클라이언트로 직접 쿼리를 실행합니다. 비밀번호는 CLAUDE.local.md 파일에서 확인하세요.
- 데이터베이스 구조는 DATABASE.md 파일에서 확인할 수 있습니다.
- **데이터베이스 스키마 변경 시 반드시 DATABASE.md 파일도 함께 업데이트해야 합니다.**

## Linting and Type Checking

코드 작성 완료 후 항상 다음 명령어를 실행하여 코드 품질을 확인합니다:

```bash
npm run lint
npm run typecheck
```

## Project Structure

이 프로젝트는 Next.js 14 App Router를 사용하며, Supabase를 백엔드로 사용합니다.

## Important Notes

- 데이터베이스 쿼리는 항상 직접 실행
- 코드 변경 후 lint와 typecheck 실행
- 커밋은 사용자가 명시적으로 요청할 때만 수행