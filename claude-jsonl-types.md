# Claude Code JSONL 데이터 타입 분류

## 📁 파일 구조
Claude Code의 JSONL 파일은 각 줄이 독립적인 JSON 객체로 구성되어 있으며, 대화 세션의 시간순 기록을 담고 있습니다.

## 🎯 메인 타입 분류

### 1. User 메시지 (`type: "user"`)
사용자가 Claude에게 보낸 메시지

#### 1-1. 일반 텍스트 메시지
```json
{
  "type": "user",
  "parentUuid": null,
  "message": {
    "role": "user",
    "content": "커밋한번 해줘"
  },
  "uuid": "2e248a9a-351e-4eab-bbff-ce8489dd8fda",
  "timestamp": "2025-08-19T18:21:33.603Z",
  "sessionId": "b4173492-fc12-4fbf-8cbd-b35472ec00d5",
  "cwd": "/Users/goalle/vibework/secondteam-vibe-review",
  "gitBranch": "main"
}
```

#### 1-2. Tool 실행 결과
```json
{
  "type": "user",
  "parentUuid": "previous-uuid",
  "message": {
    "role": "user",
    "content": [{
      "tool_use_id": "toolu_01W1ywQhLJQHwdxZbaxrzzJw",
      "type": "tool_result",
      "content": "실행 결과 내용",
      "is_error": false
    }]
  },
  "toolUseResult": {
    "stdout": "표준 출력",
    "stderr": "표준 에러",
    "interrupted": false,
    "isImage": false
  }
}
```

### 2. Assistant 메시지 (`type: "assistant"`)
Claude의 응답 메시지

#### 2-1. 텍스트 응답
```json
{
  "type": "assistant",
  "parentUuid": "user-message-uuid",
  "message": {
    "id": "msg_01Ht7iTzjUbuk82BvCDhp8Cu",
    "type": "message",
    "role": "assistant",
    "model": "claude-opus-4-1-20250805",
    "content": [{
      "type": "text",
      "text": "현재 변경사항들을 확인하고 커밋하겠습니다."
    }],
    "usage": {
      "input_tokens": 4,
      "output_tokens": 1,
      "cache_creation_input_tokens": 3708,
      "cache_read_input_tokens": 11331
    }
  },
  "requestId": "req_011CSHXrbT7PYkgis2rjiWP9",
  "timestamp": "2025-08-19T18:21:37.552Z"
}
```

#### 2-2. Tool 사용
```json
{
  "type": "assistant",
  "message": {
    "content": [{
      "type": "tool_use",
      "id": "toolu_01W1ywQhLJQHwdxZbaxrzzJw",
      "name": "Bash",
      "input": {
        "command": "git status --short",
        "description": "Check current git status"
      }
    }]
  }
}
```

#### 2-3. Thinking (사고 과정)
```json
{
  "type": "assistant",
  "message": {
    "content": [{
      "type": "thinking",
      "text": "사용자가 커밋을 요청했으니 먼저 현재 상태를 확인해야..."
    }]
  }
}
```

## 📊 컨텐츠 타입별 분류

### Content Types
| 타입 | 설명 | 주요 필드 |
|------|------|----------|
| `text` | 일반 텍스트 메시지 | `text` |
| `tool_use` | 도구 사용 요청 | `name`, `input`, `id` |
| `tool_result` | 도구 실행 결과 | `content`, `is_error`, `tool_use_id` |
| `thinking` | Claude의 사고 과정 | `text` |
| `image` | 이미지 데이터 | `source`, `media_type` |

### Tool Types (자주 사용되는 도구들)
| 도구명 | 설명 | 주요 파라미터 |
|--------|------|--------------|
| `Bash` | 쉘 명령어 실행 | `command`, `description` |
| `Read` | 파일 읽기 | `file_path`, `limit`, `offset` |
| `Write` | 파일 작성 | `file_path`, `content` |
| `Edit` | 파일 수정 | `file_path`, `old_string`, `new_string` |
| `MultiEdit` | 다중 파일 수정 | `file_path`, `edits[]` |
| `TodoWrite` | 할 일 목록 관리 | `todos[]` |
| `Grep` | 파일 내용 검색 | `pattern`, `path` |
| `Glob` | 파일 패턴 검색 | `pattern`, `path` |
| `WebSearch` | 웹 검색 | `query` |
| `WebFetch` | 웹 페이지 가져오기 | `url`, `prompt` |
| `ExitPlanMode` | 계획 모드 종료 | `plan` |

## 🏷️ 메타데이터 필드

### 공통 필드
- `uuid`: 고유 식별자
- `parentUuid`: 부모 메시지 UUID (대화 체인 추적)
- `timestamp`: ISO 8601 형식의 시간
- `sessionId`: 세션 식별자
- `version`: Claude Code 버전
- `cwd`: 현재 작업 디렉토리
- `gitBranch`: Git 브랜치명

### Assistant 전용 필드
- `requestId`: API 요청 ID
- `model`: 사용된 모델명
- `usage`: 토큰 사용량 정보
  - `input_tokens`: 입력 토큰
  - `output_tokens`: 출력 토큰
  - `cache_creation_input_tokens`: 캐시 생성 토큰
  - `cache_read_input_tokens`: 캐시 읽기 토큰

### User 전용 필드
- `userType`: 사용자 타입 (예: "external")
- `isSidechain`: 사이드체인 여부
- `toolUseResult`: 도구 실행 결과 상세 정보

## 🎨 렌더링 컴포넌트 제안

### 1. `UserMessage` 컴포넌트
- 일반 텍스트: 심플한 메시지 박스
- Tool 결과: 코드 블록 또는 결과 카드

### 2. `AssistantMessage` 컴포넌트
- 텍스트: 마크다운 렌더러
- Tool 사용: 액션 카드 (아이콘 + 설명)
- Thinking: 접을 수 있는 사고 과정 박스

### 3. `ToolCard` 컴포넌트
- 도구별 커스텀 아이콘
- 입력 파라미터 표시
- 실행 결과 미리보기

### 4. `MetadataBar` 컴포넌트
- 타임스탬프
- 토큰 사용량
- 세션 정보

## 💡 구현 예시

```typescript
// 타입 정의
interface BaseMessage {
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  sessionId: string;
  type: 'user' | 'assistant';
}

interface UserMessage extends BaseMessage {
  type: 'user';
  message: {
    role: 'user';
    content: string | ToolResult[];
  };
  toolUseResult?: ToolExecutionResult;
}

interface AssistantMessage extends BaseMessage {
  type: 'assistant';
  message: {
    role: 'assistant';
    content: ContentItem[];
    model: string;
    usage: TokenUsage;
  };
  requestId: string;
}

type ContentItem = TextContent | ToolUseContent | ThinkingContent;

// 렌더링 함수
function renderMessage(line: SessionLine) {
  const data = line.content || JSON.parse(line.raw_text);
  
  switch(data.type) {
    case 'user':
      return <UserMessage data={data} />;
    case 'assistant':
      return <AssistantMessage data={data} />;
    default:
      return <RawMessage data={data} />;
  }
}
```

## 📈 통계 분석 기능 제안

1. **세션 요약**
   - 총 메시지 수
   - 사용된 도구 종류와 빈도
   - 총 토큰 사용량

2. **타임라인 뷰**
   - 시간별 대화 흐름
   - 도구 사용 패턴

3. **성능 메트릭**
   - 응답 시간
   - 캐시 히트율
   - 에러 발생률