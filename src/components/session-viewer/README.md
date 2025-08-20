# Session Viewer 컴포넌트

Claude Code JSONL 세션 파일을 시각적으로 렌더링하는 컴포넌트 세트입니다.

## 구조

```
session-viewer/
├── message-types.ts      # 타입 정의 및 유틸리티
├── UserMessage.tsx        # 사용자 메시지 렌더링
├── AssistantMessage.tsx   # 어시스턴트 메시지 렌더링
├── ToolCard.tsx          # 도구 사용 카드
├── ThinkingBlock.tsx     # 사고 과정 블록
└── SessionViewer.tsx     # 메인 뷰어 컴포넌트
```

## 사용법

```tsx
import { SessionViewer } from '@/components/session-viewer/SessionViewer'

// 데이터베이스에서 가져온 세션 라인들
const sessionLines = [
  {
    id: 1,
    line_number: 1,
    content: { type: 'user', message: { role: 'user', content: '안녕' } },
    raw_text: '...',
    message_type: 'user'
  },
  // ...
]

<SessionViewer 
  lines={sessionLines}
  viewMode="structured"  // 또는 "raw"
  locale="ko"
/>
```

## 특징

### 메시지 타입별 렌더링
- **User 메시지**: 파란색 배경, 사용자 아이콘
- **Assistant 메시지**: 초록색 배경, AI 아이콘
- **Tool 사용**: 도구별 커스텀 아이콘과 색상
- **Thinking**: 접을 수 있는 사고 과정 박스

### 도구 시각화
각 도구는 고유한 아이콘과 색상으로 표시됩니다:
- 💻 Bash (Terminal)
- 📖 Read (파일 읽기)
- ✏️ Write (파일 쓰기)
- ✂️ Edit (파일 수정)
- 🔍 Grep (검색)
- 📁 Glob (파일 찾기)
- 🌐 WebSearch (웹 검색)
- ✅ TodoWrite (할 일 목록)

### 다크모드 지원
모든 컴포넌트는 다크모드를 완벽하게 지원합니다.

### 성능 최적화
- React.memo를 사용한 불필요한 리렌더링 방지
- 가상 스크롤링 지원 (대용량 세션)
- 지연 로딩 (Lazy Loading)

## 커스터마이징

색상이나 스타일을 변경하려면 `message-types.ts`의 `TOOL_INFO` 객체를 수정하세요.

```typescript
export const TOOL_INFO = {
  'CustomTool': { 
    icon: '🔧', 
    label: 'Custom', 
    color: 'bg-custom-100 border-custom-300' 
  }
}
```