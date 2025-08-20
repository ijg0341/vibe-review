// 유틸리티 함수들

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export function truncateText(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength) + '...';
}

export function extractFileName(path: string): string {
  return path.split('/').pop() || path;
}

export function extractCommand(command: string): string {
  // Extract the main command from a bash command
  const parts = command.trim().split(/\s+/);
  return parts[0] || command;
}

export function countLines(text: string): number {
  return text.split('\n').length;
}

export function formatTokenUsage(usage?: any): string {
  if (!usage) return '';
  
  const parts = [];
  if (usage.input_tokens) parts.push(`↓ ${usage.input_tokens.toLocaleString()}`);
  if (usage.output_tokens) parts.push(`↑ ${usage.output_tokens.toLocaleString()}`);
  if (usage.cache_read_input_tokens) parts.push(`💾 ${usage.cache_read_input_tokens.toLocaleString()}`);
  
  return parts.join(' ');
}

export function getRelativeTime(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}일 전`;
  if (hours > 0) return `${hours}시간 전`;
  if (minutes > 0) return `${minutes}분 전`;
  return `${seconds}초 전`;
}