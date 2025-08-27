# Database Schema Documentation

## Overview
This document describes the database schema for the SecondTeam Vibe Review application.

## Core Tables

### 1. profiles
**Purpose**: Supabase Auth 연동 사용자 기본 프로필
```sql
- id (uuid, PK): 사용자 고유 ID (Supabase Auth UID)
- email (text): 사용자 이메일
- display_name (text): 표시 이름
- avatar_url (text): 프로필 이미지 URL
- created_at (timestamp): 생성 시간
- updated_at (timestamp): 수정 시간
```

### 2. user_profiles
**Purpose**: 사용자 상세 프로필 정보
```sql
- id (uuid, PK): 프로필 ID
- full_name (varchar): 전체 이름
- phone (varchar): 전화번호
- avatar_url (text): 아바타 이미지 URL
- role (varchar): 사용자 역할
- is_active (boolean): 활성화 상태
- created_at (timestamp): 생성 시간
- updated_at (timestamp): 수정 시간
```

### 3. user_settings
**Purpose**: 사용자별 설정 정보 (CLI 연동 등)
```sql
- id (uuid, PK): 설정 ID
- user_id (uuid, FK): 사용자 ID
- project_path (text): 프로젝트 경로
- claude_path (text): Claude 경로
- auto_upload_enabled (boolean): 자동 업로드 활성화
- upload_schedule (text): 업로드 스케줄
- created_at (timestamp): 생성 시간
- updated_at (timestamp): 수정 시간
```

### 4. projects
**Purpose**: 프로젝트 기본 정보
```sql
- id (uuid, PK): 프로젝트 ID
- name (varchar): 프로젝트 이름
- folder_path (varchar): 폴더 경로
- description (text): 프로젝트 설명
- owner_id (uuid, FK): 소유자 ID
- created_at (timestamp): 생성 시간
- updated_at (timestamp): 수정 시간
```

### 5. project_members
**Purpose**: 프로젝트 멤버 관리
```sql
- id (uuid, PK): 멤버십 ID
- project_id (uuid, FK): 프로젝트 ID
- user_id (uuid, FK): 사용자 ID
- role (varchar): 역할 (owner, admin, member, viewer)
- joined_at (timestamp): 참여 시간
```

### 6. project_sessions
**Purpose**: 프로젝트별 업로드 세션 관리
```sql
- id (uuid, PK): 세션 ID
- project_id (uuid, FK): 프로젝트 ID
- user_id (uuid, FK): 업로드한 사용자 ID
- session_name (varchar): 세션 이름
- session_count (integer): 세션 번호
- uploaded_at (timestamp): 업로드 시간
- metadata (jsonb): 추가 메타데이터
```

### 7. session_lines
**Purpose**: JSONL 파일의 실제 라인 데이터 저장
```sql
- id (bigint, PK): 라인 ID
- upload_id (uuid, FK): project_sessions.id 참조
- file_id (uuid): 파일 ID
- line_number (integer): 라인 번호
- content (jsonb): JSONL 파싱된 내용
- raw_text (text): 원본 텍스트
- message_type (text): 메시지 타입
- message_timestamp (timestamp): 메시지 시간
- metadata (jsonb): 추가 메타데이터
- created_at (timestamp): 생성 시간
```

### 8. project_stats (View)
**Purpose**: 프로젝트 통계 정보 뷰
```sql
- id (uuid): 프로젝트 ID
- name (varchar): 프로젝트 이름
- folder_path (varchar): 폴더 경로
- description (text): 설명
- owner_id (uuid): 소유자 ID
- created_at (timestamp): 생성 시간
- member_count (bigint): 멤버 수
- session_count (bigint): 세션 수
- last_activity (timestamp): 최근 활동 시간
```

### 9. api_keys
**Purpose**: API 키 관리
```sql
- id (uuid, PK): API 키 ID
- user_id (uuid, FK): 사용자 ID (auth.users 참조)
- key_hash (text, UNIQUE): 해시된 API 키
- key_prefix (text): API 키 접두사 (표시용)
- name (text): API 키 이름
- description (text): API 키 설명
- last_used_at (timestamp): 마지막 사용 시간
- usage_count (integer): 사용 횟수
- is_active (boolean): 활성화 상태
- created_at (timestamp): 생성 시간
- expires_at (timestamp): 만료 시간
```

### 10. api_key_logs
**Purpose**: API 키 사용 로그
```sql
- id (uuid, PK): 로그 ID
- api_key_id (uuid, FK): API 키 ID (api_keys.id 참조)
- action (text): 실행된 작업
- ip_address (inet): 요청 IP 주소
- user_agent (text): User Agent
- request_path (text): 요청 경로
- request_method (text): HTTP 메소드
- response_status (integer): 응답 상태 코드
- created_at (timestamp): 로그 생성 시간
```

### 11. project_reviews
**Purpose**: 프로젝트 세션 리뷰
```sql
- id (uuid, PK): 리뷰 ID
- project_id (uuid, FK): 프로젝트 ID (projects.id 참조)
- reviewer_id (uuid, FK): 리뷰어 ID (auth.users 참조)
- session_ids (uuid[]): 리뷰 대상 세션 ID 배열
- review_title (varchar): 리뷰 제목
- review_content (text): 리뷰 내용
- rating (integer): 평점 (1-5)
- review_date (date): 리뷰 대상 날짜
- created_at (timestamp): 생성 시간
- updated_at (timestamp): 수정 시간
```

### 12. review_requests
**Purpose**: 리뷰 요청 관리
```sql
- id (uuid, PK): 리뷰 요청 ID
- requester_id (uuid, FK): 요청자 ID (profiles.id 참조)
- title (varchar): 리뷰 요청 제목
- content (text): 리뷰 요청 내용
- session_ids (uuid[]): 관련 세션 ID 배열
- reviewer_ids (uuid[]): 지정된 리뷰어 ID 배열
- status (varchar): 상태 (pending, in_progress, completed, cancelled)
- created_at (timestamp): 생성 시간
- updated_at (timestamp): 수정 시간
```

### 13. review_responses
**Purpose**: 리뷰 요청에 대한 응답 (여러 개 작성 가능)
```sql
- id (uuid, PK): 리뷰 응답 ID
- request_id (uuid, FK): 리뷰 요청 ID (review_requests.id 참조)
- reviewer_id (uuid, FK): 리뷰어 ID (profiles.id 참조)
- content (text): 리뷰 내용
- rating (integer): 평점 (1-5)
- created_at (timestamp): 생성 시간
- updated_at (timestamp): 수정 시간
```

## 관계 다이어그램

```
auth.users (1) ───┬──── (1) profiles
                  │
                  └──── (N) api_keys
                              │
                              └──── (N) api_key_logs

profiles (1) ─────┬──── (N) user_profiles
                  │
                  ├──── (N) user_settings
                  │
                  ├──── (N) projects (owner)
                  │
                  ├──── (N) project_members
                  │
                  ├──── (N) review_requests (requester)
                  │
                  └──── (N) review_responses (reviewer)
                              │
projects (1) ─────┬──────────┤
                  │          │
                  │          └──── (N) project_reviews
                  │
                  └──── (N) project_sessions
                              │
                              └──── (N) session_lines

review_requests (1) ──── (N) review_responses
```

## 인덱스 및 제약사항

- 모든 테이블의 ID는 UUID 타입 사용
- Foreign Key 제약으로 데이터 무결성 보장
- RLS (Row Level Security) 정책으로 데이터 접근 제어
- project_stats는 실시간 집계를 위한 뷰
- api_keys.key_hash는 유니크 제약으로 중복 방지
- api_keys는 (user_id, name) 조합으로 유니크 제약

## 주요 사용 패턴

1. **프로젝트 생성**: projects 테이블에 레코드 생성 후 project_members에 owner 추가
2. **세션 업로드**: project_sessions 생성 후 session_lines에 JSONL 데이터 저장
3. **팀 협업**: project_members를 통한 권한 관리
4. **통계 조회**: project_stats 뷰를 통한 실시간 통계 확인
5. **API 인증**: api_keys를 통한 CLI/API 접근 인증
6. **API 사용 추적**: api_key_logs를 통한 사용 내역 모니터링
7. **세션 리뷰**: project_reviews를 통한 일별 세션 리뷰 및 피드백 관리
8. **리뷰 요청**: review_requests를 통한 특정 세션에 대한 리뷰 요청
9. **리뷰 응답**: review_responses를 통한 리뷰 요청에 대한 피드백 제공