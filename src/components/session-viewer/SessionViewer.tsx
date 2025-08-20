'use client'

import React from 'react'
import { MessageSquare, FileText } from 'lucide-react'
import { UserMessage } from './UserMessage'
import { AssistantMessage } from './AssistantMessage'
import { getMessageType, ClaudeMessage } from './message-types'

interface SessionLine {
  id: number
  line_number: number
  content: any
  raw_text: string
  message_type?: string
  message_timestamp?: string
  metadata?: any
}

interface SessionViewerProps {
  lines: SessionLine[]
  viewMode?: 'structured' | 'raw'
  locale?: 'ko' | 'en'
}

export const SessionViewer: React.FC<SessionViewerProps> = ({ 
  lines, 
  viewMode = 'structured',
  locale = 'ko' 
}) => {
  
  const renderStructuredLine = (line: SessionLine) => {
    try {
      // content가 이미 파싱된 객체이거나 raw_text를 파싱
      const data = line.content || JSON.parse(line.raw_text)
      const messageType = getMessageType(data)
      
      // Claude 메시지 타입에 맞게 렌더링
      if (messageType === 'user') {
        return <UserMessage key={line.id} data={data as ClaudeMessage} locale={locale} />
      }
      
      if (messageType === 'assistant') {
        return <AssistantMessage key={line.id} data={data as ClaudeMessage} locale={locale} />
      }
      
      // 알 수 없는 타입은 기본 렌더링
      return (
        <div key={line.id} className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
              <MessageSquare className="h-4 w-4 text-gray-600 dark:text-gray-400" />
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
              Line {line.line_number} • Type: {messageType}
            </div>
            <pre className="text-xs bg-gray-50 dark:bg-gray-900/50 rounded p-2 overflow-x-auto">
              {typeof data === 'string' ? data : JSON.stringify(data, null, 2)}
            </pre>
          </div>
        </div>
      )
    } catch (error) {
      // 파싱 실패 시 raw 텍스트 표시
      return (
        <div key={line.id} className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
            </div>
          </div>
          <div className="flex-1">
            <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
              Line {line.line_number} • Parse Error
            </div>
            <pre className="text-xs bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 rounded p-2 overflow-x-auto">
              {line.raw_text}
            </pre>
          </div>
        </div>
      )
    }
  }
  
  const renderRawView = () => {
    return (
      <div className="bg-muted/50 dark:bg-muted/20 rounded-lg p-4">
        <pre className="text-xs whitespace-pre-wrap break-all font-mono text-foreground">
          {lines.map(line => line.raw_text).join('\n')}
        </pre>
      </div>
    )
  }
  
  if (viewMode === 'raw') {
    return renderRawView()
  }
  
  return (
    <div className="space-y-4">
      {lines.map(line => renderStructuredLine(line))}
    </div>
  )
}

export default SessionViewer