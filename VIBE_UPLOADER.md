# vibe-uploader CLI

> Claude Code 세션 파일을 바이브리뷰 서버로 자동 업로드하는 명령줄 도구

## 📋 개요

vibe-uploader는 Claude Code가 생성한 세션 파일(.jsonl)을 바이브리뷰 플랫폼으로 자동 업로드하는 CLI 도구입니다. 
개발자의 작업 플로우에 자연스럽게 통합되어 세션 데이터를 실시간으로 수집하고 분석할 수 있게 해줍니다.

---

## 🎯 주요 기능

### 1. 자동 세션 파일 감지
- Claude Code 세션 파일 (.jsonl) 자동 발견
- 파일 시스템 감시를 통한 실시간 감지
- 새로운 세션 완료 시 즉시 업로드

### 2. 프로젝트 자동 관리
- 작업 디렉토리 기준으로 프로젝트 자동 생성
- 기존 프로젝트에 새 세션 자동 추가
- 폴더 구조 기반 프로젝트 분류

### 3. 안전한 인증
- 사용자별 고유 API 키 인증
- 토큰 기반 안전한 데이터 전송
- 키 만료 및 갱신 관리

### 4. 백그라운드 처리
- 개발 작업 방해 없는 백그라운드 실행
- 업로드 진행률 표시
- 에러 발생 시 재시도 로직

---

## 🛠️ 설치 및 설정

### 설치
```bash
# npm을 통한 글로벌 설치
npm install -g vibe-uploader

# 또는 yarn
yarn global add vibe-uploader
```

### 초기 설정
```bash
# API 키 설정 (바이브리뷰 웹에서 생성한 키 사용)
vibe-uploader config --api-key vibe_xxxxxxxxxxxxx

# 서버 URL 설정 (기본값: https://api.vibereview.com)
vibe-uploader config --server-url https://your-server.com

# 작업 디렉토리 설정
vibe-uploader config --workspace ~/workspace
```

---

## 📖 사용법

### 기본 명령어

#### 설정 확인
```bash
vibe-uploader config --show
```

#### 수동 업로드
```bash
# 특정 파일 업로드
vibe-uploader upload ./my-project/session-2025-01-15.jsonl

# 디렉토리 내 모든 세션 파일 업로드
vibe-uploader upload ./my-project --recursive
```

#### 자동 감시 모드
```bash
# 특정 디렉토리 감시
vibe-uploader watch ./workspace

# 백그라운드 실행
vibe-uploader watch ./workspace --daemon

# 감시 중지
vibe-uploader stop
```

#### 상태 확인
```bash
# 업로드 히스토리
vibe-uploader history

# 현재 상태
vibe-uploader status
```

---

## ⚙️ 고급 설정

### 설정 파일 (config.json)
```json
{
  "apiKey": "vibe_xxxxxxxxxxxxx",
  "serverUrl": "https://api.vibereview.com",
  "workspace": "~/workspace",
  "autoUpload": true,
  "excludePatterns": [
    "node_modules/**",
    ".git/**",
    "*.tmp"
  ],
  "retryAttempts": 3,
  "uploadDelay": 5000
}
```

### 환경변수
```bash
export VIBE_API_KEY=vibe_xxxxxxxxxxxxx
export VIBE_SERVER_URL=https://api.vibereview.com
export VIBE_WORKSPACE=~/workspace
```

---

## 🔄 작업 플로우

### 전형적인 사용 시나리오
```bash
# 1. 프로젝트 시작 시
cd my-new-project
vibe-uploader watch . --daemon

# 2. Claude Code로 작업
claude-code "implement user authentication"

# 3. 세션 완료 시 자동 업로드
# ✅ session-2025-01-15-14-30.jsonl 자동 업로드됨
# ✅ 바이브리뷰에서 실시간 확인 가능

# 4. 작업 종료 시
vibe-uploader stop
```

---

## 🔍 API 연동

vibe-uploader가 호출하는 바이브리뷰 API:

### 인증 및 검증
- `POST /api-keys/verify` - API 키 유효성 검증

### 프로젝트 관리  
- `POST /projects/find-or-create` - 폴더명 기준 프로젝트 자동 생성/찾기

### 파일 업로드
- `POST /upload` - 세션 파일 업로드 및 파싱

---

## 🛡️ 보안 고려사항

### API 키 보안
- API 키는 로컬 설정 파일에 암호화 저장
- 네트워크 전송 시 HTTPS 강제 사용
- 키 노출 방지를 위한 마스킹 처리

### 데이터 보안
- 업로드 전 민감 정보 스캔 및 제거
- 파일 크기 및 형식 검증
- 비정상 파일 업로드 차단

---

## 🐛 문제 해결

### 자주 발생하는 이슈

#### API 키 오류
```bash
# 키 유효성 확인
vibe-uploader config --verify

# 새 키 설정
vibe-uploader config --api-key NEW_KEY
```

#### 업로드 실패
```bash
# 로그 확인
vibe-uploader logs

# 수동 재시도
vibe-uploader retry
```

#### 파일 감지 문제
```bash
# 권한 확인
ls -la ~/.claude-sessions/

# 감시 디렉토리 변경
vibe-uploader config --workspace /new/path
```

---

## 🔧 로그 및 디버깅

### 상세 로그 확인
```bash
# 상세 로그 활성화
vibe-uploader --verbose watch ./workspace

# 로그 파일 위치
# macOS: ~/Library/Logs/vibe-uploader/
# Linux: ~/.local/share/vibe-uploader/logs/
# Windows: %APPDATA%/vibe-uploader/logs/
```

### 설정 파일 위치
```bash
# macOS: ~/Library/Application Support/vibe-uploader/
# Linux: ~/.config/vibe-uploader/
# Windows: %APPDATA%/vibe-uploader/
```

