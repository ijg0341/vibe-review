# Claude Code JSONL 상세 타입 분류 가이드

## 📌 핵심 이해 사항

Claude Code의 JSONL 파일은 **대화 흐름(conversation flow)**을 기록합니다. 각 줄은 독립적인 JSON 객체이며, `type`과 `message.content` 구조에 따라 다양한 패턴을 가집니다.

## 🎯 메시지 타입 계층 구조

```
Root Type (type)
├── user
│   ├── Direct Text (content: string)
│   └── Tool Result (content: array[{type: "tool_result"}])
└── assistant
    ├── Text Response (content: array[{type: "text"}])
    ├── Tool Use (content: array[{type: "tool_use"}])
    └── Thinking (content: array[{type: "thinking"}])
```

## 📊 상세 타입 분류

### 1. User 메시지 타입

#### 1-1. User Direct Text (사용자 직접 입력)
사용자가 Claude에게 직접 입력한 텍스트 메시지

```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": "커밋한번 해줘"  // STRING 타입
  }
}
```

**렌더링 제안**: 
- 💬 말풍선 UI
- 사용자 아바타
- 타임스탬프 표시

#### 1-2. User Tool Result (도구 실행 결과)
Claude가 실행한 도구의 결과를 전달받는 메시지

```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": [{  // ARRAY 타입
      "type": "tool_result",
      "tool_use_id": "toolu_xxx",
      "content": "실행 결과 내용",
      "is_error": false
    }]
  },
  "toolUseResult": {  // 추가 메타데이터
    "stdout": "표준 출력",
    "stderr": "표준 에러",
    "interrupted": false,
    "isImage": false
  }
}
```

**렌더링 제안**:
- ✅/❌ 성공/실패 아이콘
- 접을 수 있는 결과 박스
- stdout/stderr 구분 표시
- 코드 하이라이팅

### 2. Assistant 메시지 타입

#### 2-1. Assistant Text Response (일반 텍스트 응답)
Claude의 일반적인 텍스트 응답

```json
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [{  // ARRAY 타입
      "type": "text",
      "text": "현재 변경사항들을 확인하고 커밋하겠습니다."
    }]
  }
}
```

**렌더링 제안**:
- 🤖 AI 아바타
- 마크다운 렌더링
- 코드 블록 하이라이팅

#### 2-2. Assistant Tool Use (도구 사용)
Claude가 도구를 사용하려는 액션

```json
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [{
      "type": "tool_use",
      "id": "toolu_xxx",
      "name": "Bash",
      "input": {
        "command": "git status",
        "description": "Check git status"
      }
    }]
  }
}
```

**렌더링 제안**:
- 도구별 커스텀 아이콘
- 액션 카드 UI
- 파라미터 표시
- 실행 중 애니메이션

#### 2-3. Assistant Thinking (사고 과정)
Claude의 내부 사고 과정 (보통 숨김 처리)

```json
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [{
      "type": "thinking",
      "text": "사용자가 커밋을 요청했으니 먼저 현재 상태를 확인하고..."
    }]
  }
}
```

**렌더링 제안**:
- 🧠 사고 아이콘
- 접기/펼치기 가능
- 회색 배경
- 이탤릭체 텍스트

### 3. Summary 타입 (세션 요약)

#### 3-1. Summary Message
대화 세션의 전체 요약 메시지

```json
{
  "type": "summary",
  "summary": "I apologize, but no conversation was provided for me to summarize. Could you please share the conversation text?",
  "leafUuid": "9c044e84-f314-4d67-9cec-c2486e381f2b"
}
```

**필드 설명**:
- `type`: "summary" (고정값)
- `summary`: 세션 대화의 요약 텍스트
- `leafUuid`: 대화 체인의 마지막 메시지 UUID

**렌더링 제안**:
- 📋 요약 아이콘
- 박스형 카드 UI
- 연한 배경색 (하이라이트)
- 마크다운 렌더링 지원

### 4. File History Snapshot 타입

#### 4-1. File History Snapshot Message
파일 변경 이력 스냅샷 메시지 (내부 추적용)

```json
{
  "type": "file-history-snapshot",
  "messageId": "5db384c8-436f-491b-852c-61c952793306",
  "snapshot": {
    "messageId": "5db384c8-436f-491b-852c-61c952793306",
    "trackedFileBackups": {},
    "timestamp": "2025-10-21T02:17:25.104Z"
  },
  "isSnapshotUpdate": false
}
```

**필드 설명**:
- `type`: "file-history-snapshot" (고정값)
- `messageId`: 스냅샷과 연결된 메시지 ID
- `snapshot`: 스냅샷 데이터
  - `messageId`: 메시지 ID
  - `trackedFileBackups`: 추적된 파일들의 백업 정보 (객체)
  - `timestamp`: 스냅샷 생성 시간 (ISO 8601)
- `isSnapshotUpdate`: 스냅샷 업데이트 여부

**렌더링 제안**:
- 💾 스냅샷 아이콘
- 접을 수 있는 작은 카드 (기본 숨김)
- 회색 배경, 작은 텍스트
- 타임스탬프 표시
- 파일 백업 개수 표시

### 5. 혼합 컨텐츠 타입

하나의 메시지에 여러 content type이 포함될 수 있음:

```json
{
  "type": "assistant",
  "message": {
    "content": [
      {"type": "thinking", "text": "먼저 파일을 읽어야..."},
      {"type": "text", "text": "파일을 확인하겠습니다."},
      {"type": "tool_use", "name": "Read", "input": {...}}
    ]
  }
}
```

## 🛠️ 도구(Tool) 타입별 분류

### 파일 작업 도구
| Tool | 설명 | 주요 파라미터 | 아이콘 제안 |
|------|------|--------------|------------|
| `Read` | 파일 읽기 | file_path, limit, offset | 📖 |
| `Write` | 파일 생성/덮어쓰기 | file_path, content | ✏️ |
| `Edit` | 파일 수정 | file_path, old_string, new_string | ✂️ |
| `MultiEdit` | 다중 수정 | file_path, edits[] | 📝 |
| `NotebookEdit` | Jupyter 노트북 수정 | notebook_path, cell_id | 📓 |

### 검색/탐색 도구
| Tool | 설명 | 주요 파라미터 | 아이콘 제안 |
|------|------|--------------|------------|
| `Grep` | 내용 검색 | pattern, path | 🔍 |
| `Glob` | 파일 패턴 검색 | pattern, path | 📁 |
| `LS` | 디렉토리 목록 | path, ignore | 📂 |

### 실행 도구
| Tool | 설명 | 주요 파라미터 | 아이콘 제안 |
|------|------|--------------|------------|
| `Bash` | 쉘 명령 실행 | command, description | 💻 |
| `BashOutput` | 백그라운드 출력 확인 | bash_id, filter | 📟 |
| `KillBash` | 프로세스 종료 | shell_id | ⛔ |

### 웹/네트워크 도구
| Tool | 설명 | 주요 파라미터 | 아이콘 제안 |
|------|------|--------------|------------|
| `WebSearch` | 웹 검색 | query, allowed_domains | 🌐 |
| `WebFetch` | URL 콘텐츠 가져오기 | url, prompt | 🔗 |

### 작업 관리 도구
| Tool | 설명 | 주요 파라미터 | 아이콘 제안 |
|------|------|--------------|------------|
| `TodoWrite` | 할 일 목록 관리 | todos[] | ✅ |
| `Task` | 에이전트 작업 | description, prompt | 🤖 |
| `ExitPlanMode` | 계획 모드 종료 | plan | 📋 |

## 🏷️ 특수 필드 및 메타데이터

### 공통 필드
```typescript
{
  uuid: string           // 메시지 고유 ID
  parentUuid: string?    // 부모 메시지 ID (대화 체인)
  timestamp: string      // ISO 8601 시간
  sessionId: string      // 세션 ID
  type: "user" | "assistant"
  cwd: string           // 현재 작업 디렉토리
  gitBranch: string     // Git 브랜치
  version: string       // Claude Code 버전
  isSidechain: boolean  // 사이드체인 여부
}
```

### User 전용 필드
```typescript
{
  userType: "external"     // 사용자 타입
  toolUseResult?: {         // 도구 실행 결과
    stdout: string
    stderr: string
    interrupted: boolean
    isImage: boolean
  }
}
```

### Assistant 전용 필드
```typescript
{
  requestId: string         // API 요청 ID
  message: {
    id: string             // 메시지 ID
    model: string          // 모델명
    usage?: {              // 토큰 사용량
      input_tokens: number
      output_tokens: number
      cache_creation_input_tokens: number
      cache_read_input_tokens: number
    }
    stop_reason?: string
    stop_sequence?: string
  }
}
```

## 🎨 렌더링 컴포넌트 구조 제안

### 컴포넌트 계층
```
SessionViewer (메인)
├── UserMessage
│   ├── DirectTextMessage     // 사용자 직접 입력
│   └── ToolResultMessage     // 도구 실행 결과
│       ├── SuccessResult     // 성공
│       └── ErrorResult       // 에러
├── AssistantMessage
│   ├── TextMessage          // 일반 텍스트
│   ├── ToolUseCard          // 도구 사용
│   │   └── [도구별 커스텀 카드]
│   └── ThinkingBlock        // 사고 과정
└── MetadataBar              // 토큰, 시간 등
```

### 상태별 UI 변형
1. **로딩 상태**: 도구 실행 중 표시
2. **에러 상태**: 빨간색 배경, 에러 아이콘
3. **성공 상태**: 초록색 체크 아이콘
4. **접힌 상태**: 긴 내용 요약 표시

## 📈 통계 및 분석 기능 제안

### 세션 분석 메트릭
```typescript
interface SessionMetrics {
  totalMessages: number
  userMessages: number
  assistantMessages: number
  toolUsage: Record<string, number>  // 도구별 사용 횟수
  totalTokens: {
    input: number
    output: number
    cached: number
  }
  duration: number  // 세션 진행 시간
  errorRate: number // 에러 발생률
}
```

### 시각화 제안
1. **타임라인 뷰**: 시간순 메시지 흐름
2. **도구 사용 차트**: 파이 차트로 도구 사용 비율
3. **토큰 사용량 그래프**: 시간대별 토큰 사용
4. **에러 히트맵**: 에러 발생 패턴 분석

## ✅ 구현 체크리스트

- [ ] 메시지 타입 자동 감지 로직
- [ ] Content 배열/문자열 처리 분기
- [ ] Tool 타입별 커스텀 렌더링
- [ ] Thinking 접기/펼치기
- [ ] 에러 상태 표시
- [ ] 토큰 사용량 표시
- [ ] 다크모드 지원
- [ ] 검색 하이라이팅
- [ ] 성능 최적화 (가상 스크롤)
- [ ] 통계 대시보드