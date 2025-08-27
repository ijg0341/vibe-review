# Claude Code Instructions

## 통합 세션 컴포넌트 가이드

### SessionList 컴포넌트
세션 목록을 표시하는 통합 컴포넌트입니다.

**위치**: `/src/components/sessions/SessionList.tsx`

**사용 예시**:
```tsx
import { SessionList } from '@/components/sessions/SessionList'

<SessionList 
  sessions={sessions}
  selectedSessionId={selectedSession?.id}
  onSessionSelect={handleSessionSelect}
  locale={locale}
/>
```

### SessionViewer 컴포넌트
세션 내용을 표시하는 통합 뷰어 컴포넌트입니다. **필터링 기능이 기본으로 포함**되어 있습니다.

**위치**: `/src/components/sessions/SessionViewer.tsx`

**사용 예시**:
```tsx
import { SessionViewer } from '@/components/sessions/SessionViewer'

<SessionViewer
  lines={sessionLines}
  loading={linesLoading}
  sessionTitle={session.session_name}
  sessionInfo={{
    user: session.profiles?.display_name,
    uploadTime: session.uploaded_at,
    processedLines: session.processed_lines
  }}
  locale={locale}
  showFilter={true} // 기본값: true, 필터 항상 표시
/>
```

### 중요 원칙
1. **통합 컴포넌트 사용**: 세션 목록과 뷰어는 항상 위의 통합 컴포넌트를 사용합니다.
2. **필터링 기본 탑재**: SessionViewer에는 필터링 기능이 기본으로 포함되며, `showFilter` prop으로 제어할 수 있습니다.
3. **재사용성**: 모든 세션 관련 페이지에서 동일한 컴포넌트를 사용하여 일관성을 유지합니다.

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