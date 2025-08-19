# SecondTeam Vibe Review - Project Plan

## 프로젝트 개요
사내 개발팀이 Claude Code 사용 히스토리(`.claude/projects`)를 공유하고, 서로의 프롬프트 엔지니어링을 리뷰하며 학습할 수 있는 협업 플랫폼

## 프로젝트 목표
- 팀원 간 프롬프트 엔지니어링 노하우 공유
- Claude Code 사용 패턴 분석 및 개선
- 프로젝트별 프롬프트 히스토리 아카이빙
- 코드 리뷰처럼 프롬프트도 리뷰하는 문화 정착

## 핵심 기능

### 1. 사용자 인증 시스템
- Supabase Auth를 사용한 이메일/패스워드 인증
- 소셜 로그인 (Google, GitHub)
- 사용자 프로필 관리
- 팀/조직 단위 관리

### 2. 프롬프트 히스토리 관리
- `.claude/projects` 폴더 업로드
- JSONL/HTML 파일 파싱
- 프로젝트별 자동 분류
- 주기적 동기화 옵션

### 3. 대시보드 & 통계
- **개인 통계**
  - 주/월 단위 프롬프트 작성 현황
  - 리뷰 주고받은 횟수
  - 완료율 및 생산성 지표
- **팀 현황**
  - 팀원별 진행 중인 프로젝트
  - 최근 공유된 프롬프트
  - 인기 있는 프롬프트

### 4. 프롬프트 뷰어
- 전체 대화 컨텍스트 표시
- 코드 블록 신택스 하이라이팅
- 프롬프트-응답 쌍 시각화
- 타임라인 뷰
- 검색 및 필터링

### 5. 리뷰 시스템
- 프롬프트 단위 리뷰
- 라인별 코멘트
- 리뷰 스레드 및 토론
- 리뷰 상태 관리 (pending/resolved)
- 베스트 프랙티스 마킹

### 6. 다국어 지원 
- 한국어/영어 전환
- 언어별 샘플 데이터
- 사용자 선호 언어 저장

## 기술 스택

### Frontend
- **Framework**: Next.js 14 (App Router)
- **Styling**: Tailwind CSS v3 + shadcn/ui
- **Animations**: Framer Motion
- **State Management**: Zustand
- **국제화**: 커스텀 번역 시스템
- **API Client**: Tanstack Query (예정)

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
- preferred_language (text, default: 'ko')
- team_id (uuid, nullable)
- created_at (timestamp)
- updated_at (timestamp)

#### projects
- id (uuid, primary key)
- user_id (uuid, foreign key)
- name (text)
- path (text)
- description (text)
- is_public (boolean, default: true)
- created_at (timestamp)
- updated_at (timestamp)
- last_synced_at (timestamp)

#### prompts
- id (uuid, primary key)
- project_id (uuid, foreign key)
- session_id (text)
- prompt_text (text)
- response_text (text)
- prompt_order (integer)
- metadata (jsonb)
- created_at (timestamp)

#### reviews
- id (uuid, primary key)
- prompt_id (uuid, foreign key)
- reviewer_id (uuid, foreign key)
- content (text)
- rating (integer, 1-5)
- status (enum: 'pending', 'resolved')
- created_at (timestamp)
- updated_at (timestamp)

#### review_comments
- id (uuid, primary key)
- review_id (uuid, foreign key)
- user_id (uuid, foreign key)
- content (text)
- created_at (timestamp)

## UI 구조

### 페이지 구성
- **/** - 대시보드 (통계, 최근 활동)
- **/my-prompts** - 내 프롬프트 목록
- **/projects** - 팀 프로젝트 탐색
- **/projects/:id** - 프로젝트 상세 & 프롬프트 목록
- **/prompt/:id** - 프롬프트 상세 & 리뷰
- **/reviews** - 리뷰 관리 (받은/준 리뷰)
- **/upload** - 히스토리 업로드
- **/team** - 팀 멤버 & 활동
- **/settings** - 설정

### 주요 컴포넌트
- **DashboardLayout** - 메인 레이아웃
- **Sidebar** - 네비게이션 (접기/펼치기)
- **Header** - 검색, 알림, 언어 전환, 테마 전환
- **StatsCard** - 통계 카드
- **ProjectCard** - 프로젝트 카드
- **PromptViewer** - 프롬프트 뷰어
- **ReviewPanel** - 리뷰 작성/표시
- **FileUploader** - 파일 업로드
- **LanguageToggle** - 언어 전환
- **ThemeToggle** - 다크모드 전환

## 개발 현황

### 완료된 작업 ✅
- [x] Next.js 프로젝트 초기 설정
- [x] Tailwind CSS + shadcn/ui 설정
- [x] 기본 레이아웃 구성 (Sidebar + Header)
- [x] 다크모드 지원
- [x] 한글/영어 다국어 지원
- [x] 대시보드 UI 구현
- [x] 통계 카드 컴포넌트
- [x] 팀 프로젝트 목록
- [x] 리뷰 알림 패널
- [x] 프롬프트 목록 탭

### 진행 중 🔄
- [ ] Supabase 연동
- [ ] 실제 파일 업로드 기능

### 예정 작업 📋
- [ ] 프롬프트 상세 뷰어
- [ ] 리뷰 작성 인터페이스
- [ ] 실시간 알림
- [ ] 검색 & 필터링
- [ ] 사용자 프로필 페이지
- [ ] 팀 대시보드
- [ ] 프롬프트 통계 분석

## 보안 고려사항
- Row Level Security (RLS) 정책
- 파일 업로드 크기 제한 (10MB)
- Rate limiting
- Input validation
- XSS protection
- 팀 내부 데이터만 접근 가능

## 성능 최적화
- 대용량 JSONL 파일 스트리밍 파싱
- 가상 스크롤링 (긴 프롬프트 목록)
- 이미지 최적화
- 코드 스플리팅
- 프롬프트 데이터 캐싱
- Lazy loading

## 향후 계획
- AI 기반 프롬프트 품질 분석
- 프롬프트 템플릿 라이브러리
- 팀 간 프롬프트 공유 마켓플레이스
- Claude API 사용량 통계
- 프롬프트 버전 관리
- 협업 프롬프트 작성 기능