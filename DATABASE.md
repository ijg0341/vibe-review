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

## 관계 다이어그램

```
profiles (1) ─────┬──── (N) user_profiles
                  │
                  ├──── (N) user_settings
                  │
                  ├──── (N) projects (owner)
                  │
                  └──── (N) project_members
                              │
projects (1) ─────┬──────────┤
                  │
                  └──── (N) project_sessions
                              │
                              └──── (N) session_lines
```

## 인덱스 및 제약사항

- 모든 테이블의 ID는 UUID 타입 사용
- Foreign Key 제약으로 데이터 무결성 보장
- RLS (Row Level Security) 정책으로 데이터 접근 제어
- project_stats는 실시간 집계를 위한 뷰

## 주요 사용 패턴

1. **프로젝트 생성**: projects 테이블에 레코드 생성 후 project_members에 owner 추가
2. **세션 업로드**: project_sessions 생성 후 session_lines에 JSONL 데이터 저장
3. **팀 협업**: project_members를 통한 권한 관리
4. **통계 조회**: project_stats 뷰를 통한 실시간 통계 확인