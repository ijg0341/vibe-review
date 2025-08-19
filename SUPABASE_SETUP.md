# Supabase Setup Guide

## 1. Supabase 프로젝트 생성

1. [Supabase Dashboard](https://app.supabase.com)에 접속
2. "New Project" 클릭
3. 프로젝트 정보 입력:
   - Name: `secondteam-vibe-review`
   - Database Password: 강력한 비밀번호 설정
   - Region: 가까운 지역 선택 (예: Northeast Asia - Seoul)
4. "Create new project" 클릭

## 2. 데이터베이스 스키마 설정

1. Supabase Dashboard에서 SQL Editor 열기
2. `supabase/schema.sql` 파일의 내용을 복사하여 실행
3. `supabase/storage.sql` 파일의 내용을 복사하여 실행

## 3. Authentication 설정

### Email 인증 활성화
1. Authentication > Providers 메뉴로 이동
2. Email 활성화 확인

### 소셜 로그인 설정 (선택사항)
#### Google OAuth
1. [Google Cloud Console](https://console.cloud.google.com)에서 OAuth 2.0 클라이언트 ID 생성
2. Authorized redirect URIs에 추가:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
3. Client ID와 Client Secret을 Supabase Dashboard의 Google provider 설정에 입력

#### GitHub OAuth
1. GitHub Settings > Developer settings > OAuth Apps에서 새 앱 생성
2. Authorization callback URL:
   ```
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
3. Client ID와 Client Secret을 Supabase Dashboard의 GitHub provider 설정에 입력

## 4. 환경 변수 설정

1. Supabase Dashboard > Settings > API에서 다음 정보 확인:
   - Project URL
   - Anon/Public Key
   - Service Role Key (서버사이드용)

2. `.env.local` 파일 생성:
```bash
cp .env.local.example .env.local
```

3. `.env.local` 파일에 값 입력:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## 5. Storage 설정

1. Storage > Buckets 메뉴에서 `project-files` 버킷 확인
2. 필요시 파일 크기 제한 설정 (Settings > File size limit)
3. CORS 설정 확인 (Settings > CORS configuration)

## 6. 테스트

프로젝트 실행 후 다음 사항 확인:
- 회원가입/로그인 기능
- 파일 업로드
- 데이터베이스 연결

```bash
npm run dev
```

## 7. 추가 보안 설정 (Production)

### Rate Limiting
1. Dashboard > Settings > API
2. Rate limiting 활성화

### Email Templates
1. Authentication > Email Templates
2. 각 템플릿 커스터마이징

### Domain 설정
1. Authentication > URL Configuration
2. Site URL과 Redirect URLs 설정

## 문제 해결

### RLS (Row Level Security) 에러
- SQL Editor에서 정책 확인
- 테이블별 RLS 활성화 상태 확인

### Storage 업로드 실패
- 버킷 정책 확인
- 파일 크기 제한 확인
- CORS 설정 확인

### Authentication 에러
- Redirect URL 설정 확인
- OAuth provider 설정 확인
- Email 템플릿 설정 확인