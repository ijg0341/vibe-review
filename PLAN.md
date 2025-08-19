# SecondTeam Vibe Review - Project Plan

## 프로젝트 개요
Claude Code 사용자들이 `.claude/projects` 폴더에 있는 작업 히스토리를 업로드하고 서로 리뷰할 수 있는 협업 도구

## 핵심 기능

### 1. 사용자 인증 시스템
- Supabase Auth를 사용한 이메일/패스워드 인증
- 소셜 로그인 (Google, GitHub)
- 사용자 프로필 관리

### 2. 히스토리 업로드 기능
- `.claude/projects` 폴더 자동 감지
- 드래그 앤 드롭 파일 업로드
- 대량 업로드 지원 (여러 프로젝트 동시 업로드)
- 파일 형식: .jsonl, .html 지원

### 3. 히스토리 뷰어
- JSON Lines 파일 파싱 및 렌더링
- HTML 세션 파일 표시
- 대화 타임라인 뷰
- 코드 블록 신택스 하이라이팅
- 검색 및 필터링 기능

### 4. 리뷰 시스템
- 코드/대화에 대한 코멘트 기능
- 라인별 피드백
- 리뷰 스레드
- 리뷰 상태 관리 (pending, reviewed, resolved)

### 5. 실시간 동기화
- 주기적인 세션 파일 업데이트
- WebSocket을 통한 실시간 알림
- 자동 백업 기능

## 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v3 + shadcn/ui
- **Animations**: Framer Motion
- **State Management**: Zustand
- **API Client**: Tanstack Query

### Backend & Infrastructure
- **Database**: Supabase (PostgreSQL)
- **Storage**: Supabase Storage
- **Authentication**: Supabase Auth
- **Real-time**: Supabase Realtime

## 데이터베이스 스키마

### Tables

#### users
- id (uuid, primary key)
- email (text, unique)
- username (text, unique)
- avatar_url (text)
- created_at (timestamp)
- updated_at (timestamp)

#### projects
- id (uuid, primary key)
- user_id (uuid, foreign key)
- name (text)
- path (text)
- description (text)
- created_at (timestamp)
- updated_at (timestamp)
- last_synced_at (timestamp)

#### sessions
- id (uuid, primary key)
- project_id (uuid, foreign key)
- session_id (text, unique)
- file_type (enum: 'jsonl', 'html')
- file_path (text)
- content (jsonb)
- created_at (timestamp)
- updated_at (timestamp)

#### reviews
- id (uuid, primary key)
- session_id (uuid, foreign key)
- reviewer_id (uuid, foreign key)
- content (text)
- line_number (integer, nullable)
- status (enum: 'pending', 'resolved')
- created_at (timestamp)
- updated_at (timestamp)

#### review_threads
- id (uuid, primary key)
- review_id (uuid, foreign key)
- user_id (uuid, foreign key)
- content (text)
- created_at (timestamp)

## Storage Structure

```
/users/{user_id}/
  /projects/{project_name}/
    /sessions/
      - {session_id}.jsonl
      - {session_id}.html
    /metadata.json
```

## API Endpoints

### Authentication
- POST /api/auth/signup
- POST /api/auth/login
- POST /api/auth/logout
- GET /api/auth/user

### Projects
- GET /api/projects
- POST /api/projects
- GET /api/projects/:id
- PUT /api/projects/:id
- DELETE /api/projects/:id

### Sessions
- GET /api/sessions
- POST /api/sessions/upload
- GET /api/sessions/:id
- DELETE /api/sessions/:id

### Reviews
- GET /api/reviews
- POST /api/reviews
- PUT /api/reviews/:id
- DELETE /api/reviews/:id

## UI Components

### Layout Components
- Header with navigation
- Sidebar with project list
- Main content area

### Feature Components
- FileUploader
- SessionViewer
- CodeBlock with syntax highlighting
- ReviewPanel
- CommentThread
- UserAvatar
- ProjectCard

### UI Components (shadcn/ui)
- Button
- Card
- Dialog
- Select
- Input
- Textarea
- Avatar
- Badge
- Tabs
- ScrollArea

## Development Phases

### Phase 1: Foundation (완료)
- [x] Next.js 프로젝트 설정
- [x] Tailwind CSS + shadcn/ui 설정
- [x] 프로젝트 계획 문서 작성

### Phase 2: Authentication & Base UI
- [ ] Supabase 프로젝트 설정
- [ ] 환경변수 구성
- [ ] 인증 시스템 구현
- [ ] 기본 레이아웃 구성

### Phase 3: Core Features
- [ ] 파일 업로드 컴포넌트
- [ ] 히스토리 뷰어 구현
- [ ] 세션 데이터 파싱 로직

### Phase 4: Review System
- [ ] 리뷰 컴포넌트 개발
- [ ] 코멘트 시스템
- [ ] 실시간 업데이트

### Phase 5: Polish & Deploy
- [ ] 성능 최적화
- [ ] 에러 핸들링
- [ ] 배포 준비

## 보안 고려사항
- Row Level Security (RLS) 정책 설정
- 파일 업로드 크기 제한
- Rate limiting
- Input validation
- XSS protection

## 성능 최적화
- 대용량 파일 처리를 위한 스트리밍
- 가상 스크롤링 (대량 세션 데이터)
- 이미지 최적화
- 코드 스플리팅
- 캐싱 전략