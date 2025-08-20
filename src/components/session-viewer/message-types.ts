// Claude Code JSONL 메시지 타입 정의

export interface BaseMessage {
  uuid: string;
  parentUuid: string | null;
  timestamp: string;
  sessionId: string;
  version?: string;
  cwd?: string;
  gitBranch?: string;
  type: 'user' | 'assistant';
  isSidechain?: boolean;
}

// Content Types
export interface TextContent {
  type: 'text';
  text: string;
}

export interface ToolUseContent {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, any>;
}

export interface ToolResultContent {
  type: 'tool_result';
  tool_use_id: string;
  content: string;
  is_error: boolean;
}

export interface ThinkingContent {
  type: 'thinking';
  text: string;
}

export interface ImageContent {
  type: 'image';
  source: {
    type: 'base64';
    media_type: string;
    data: string;
  };
}

export type ContentItem = TextContent | ToolUseContent | ToolResultContent | ThinkingContent | ImageContent;

// User Message
export interface UserMessage extends BaseMessage {
  type: 'user';
  userType?: string;
  message: {
    role: 'user';
    content: string | ContentItem[];
  };
  toolUseResult?: {
    stdout: string;
    stderr: string;
    interrupted: boolean;
    isImage: boolean;
  };
}

// Assistant Message
export interface AssistantMessage extends BaseMessage {
  type: 'assistant';
  requestId?: string;
  message: {
    id: string;
    type: 'message';
    role: 'assistant';
    model: string;
    content: ContentItem[];
    stop_reason?: string | null;
    stop_sequence?: string | null;
    usage?: {
      input_tokens: number;
      output_tokens: number;
      cache_creation_input_tokens?: number;
      cache_read_input_tokens?: number;
      cache_creation?: {
        ephemeral_5m_input_tokens?: number;
        ephemeral_1h_input_tokens?: number;
      };
      service_tier?: string;
    };
  };
}

export type ClaudeMessage = UserMessage | AssistantMessage;

// Tool 정보
export const TOOL_INFO: Record<string, { icon: string; label: string; color: string }> = {
  'Bash': { icon: '💻', label: 'Terminal', color: 'bg-purple-100 dark:bg-purple-900/30 border-purple-300 dark:border-purple-700' },
  'Read': { icon: '📖', label: 'Read File', color: 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700' },
  'Write': { icon: '✏️', label: 'Write File', color: 'bg-green-100 dark:bg-green-900/30 border-green-300 dark:border-green-700' },
  'Edit': { icon: '✂️', label: 'Edit File', color: 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700' },
  'MultiEdit': { icon: '📝', label: 'Multi Edit', color: 'bg-orange-100 dark:bg-orange-900/30 border-orange-300 dark:border-orange-700' },
  'TodoWrite': { icon: '✅', label: 'Todo List', color: 'bg-indigo-100 dark:bg-indigo-900/30 border-indigo-300 dark:border-indigo-700' },
  'Grep': { icon: '🔍', label: 'Search', color: 'bg-teal-100 dark:bg-teal-900/30 border-teal-300 dark:border-teal-700' },
  'Glob': { icon: '📁', label: 'Find Files', color: 'bg-cyan-100 dark:bg-cyan-900/30 border-cyan-300 dark:border-cyan-700' },
  'WebSearch': { icon: '🌐', label: 'Web Search', color: 'bg-pink-100 dark:bg-pink-900/30 border-pink-300 dark:border-pink-700' },
  'WebFetch': { icon: '🔗', label: 'Fetch URL', color: 'bg-rose-100 dark:bg-rose-900/30 border-rose-300 dark:border-rose-700' },
  'ExitPlanMode': { icon: '📋', label: 'Exit Plan', color: 'bg-gray-100 dark:bg-gray-800/30 border-gray-300 dark:border-gray-700' },
  'Task': { icon: '🤖', label: 'Agent Task', color: 'bg-violet-100 dark:bg-violet-900/30 border-violet-300 dark:border-violet-700' },
  'BashOutput': { icon: '📟', label: 'Output', color: 'bg-slate-100 dark:bg-slate-800/30 border-slate-300 dark:border-slate-700' },
  'KillBash': { icon: '⛔', label: 'Kill Process', color: 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700' },
  'LS': { icon: '📂', label: 'List Files', color: 'bg-emerald-100 dark:bg-emerald-900/30 border-emerald-300 dark:border-emerald-700' },
  'NotebookEdit': { icon: '📓', label: 'Notebook', color: 'bg-amber-100 dark:bg-amber-900/30 border-amber-300 dark:border-amber-700' },
};

// 메시지 타입 판별 함수
export function getMessageType(data: any): 'user' | 'assistant' | 'unknown' {
  if (data.type === 'user' || data.type === 'assistant') {
    return data.type;
  }
  return 'unknown';
}

// Content 타입 판별 함수
export function getContentType(content: any): string {
  if (typeof content === 'string') return 'text';
  if (Array.isArray(content)) {
    const types = content.map(item => item.type || 'unknown');
    return types.join(', ');
  }
  if (content && typeof content === 'object') {
    return content.type || 'unknown';
  }
  return 'unknown';
}

// 시간 포맷팅
export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// 토큰 정보 포맷팅
export function formatTokenUsage(usage?: any): string {
  if (!usage) return '';
  
  const parts = [];
  if (usage.input_tokens) parts.push(`In: ${usage.input_tokens}`);
  if (usage.output_tokens) parts.push(`Out: ${usage.output_tokens}`);
  if (usage.cache_read_input_tokens) parts.push(`Cache: ${usage.cache_read_input_tokens}`);
  
  return parts.join(' | ');
}