'use client'

import React from 'react'
import { AlertCircle } from 'lucide-react'
import { UserDirectTextMessage } from './UserDirectTextMessage'
import { UserToolResultMessage } from './UserToolResultMessage'
import { AssistantTextMessage } from './AssistantTextMessage'
import { AssistantToolUseMessage } from './AssistantToolUseMessage'
import { AssistantThinkingMessage } from './AssistantThinkingMessage'
import { Card } from '@/components/ui/card'

interface SessionLine {
  id: number
  line_number: number
  content: any
  raw_text: string
  message_type?: string
  message_timestamp?: string
  metadata?: any
}

interface SessionViewerV2Props {
  lines: SessionLine[]
  viewMode?: 'structured' | 'raw'
  locale?: 'ko' | 'en'
}

export const SessionViewerV2: React.FC<SessionViewerV2Props> = ({ 
  lines, 
  viewMode = 'structured',
  locale = 'ko' 
}) => {
  
  const renderStructuredLine = (line: SessionLine) => {
    try {
      // Parse the JSON data
      const data = line.content || JSON.parse(line.raw_text)
      
      // Determine message type and render appropriate component
      if (data.type === 'user') {
        const content = data.message?.content
        
        // User Direct Text Message
        if (typeof content === 'string') {
          return <UserDirectTextMessage key={line.id} data={data} locale={locale} />
        }
        
        // User Tool Result Message
        if (Array.isArray(content)) {
          const hasToolResult = content.some(item => item.type === 'tool_result')
          if (hasToolResult) {
            return <UserToolResultMessage key={line.id} data={data} locale={locale} />
          }
        }
      }
      
      if (data.type === 'assistant') {
        const content = data.message?.content
        
        if (Array.isArray(content)) {
          // Check content types
          const hasText = content.some(item => item.type === 'text')
          const hasToolUse = content.some(item => item.type === 'tool_use')
          const hasThinking = content.some(item => item.type === 'thinking')
          
          // Render components based on content
          // Note: A message can have multiple content types, so we render all
          return (
            <React.Fragment key={line.id}>
              {hasThinking && <AssistantThinkingMessage data={data} locale={locale} />}
              {hasText && <AssistantTextMessage data={data} locale={locale} />}
              {hasToolUse && <AssistantToolUseMessage data={data} locale={locale} />}
            </React.Fragment>
          )
        }
      }
      
      // Fallback for unknown message types
      return (
        <Card key={line.id} className="p-4 bg-gray-50 dark:bg-gray-900/50 border-gray-200 dark:border-gray-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-gray-500 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                Unknown Message Type (Line {line.line_number})
              </div>
              <pre className="text-xs text-gray-500 dark:text-gray-400 overflow-x-auto">
                {JSON.stringify(data, null, 2).substring(0, 500)}...
              </pre>
            </div>
          </div>
        </Card>
      )
      
    } catch (error) {
      // Error parsing JSON
      return (
        <Card key={line.id} className="p-4 bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-red-500 mt-0.5" />
            <div className="flex-1">
              <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                Parse Error (Line {line.line_number})
              </div>
              <pre className="text-xs text-red-500 dark:text-red-400 overflow-x-auto">
                {line.raw_text.substring(0, 500)}...
              </pre>
            </div>
          </div>
        </Card>
      )
    }
  }
  
  const renderRawView = () => {
    return (
      <Card className="p-4 bg-gray-900 dark:bg-black border-gray-700 dark:border-gray-800">
        <pre className="text-xs whitespace-pre-wrap break-all font-mono text-gray-300">
          {lines.map(line => line.raw_text).join('\n')}
        </pre>
      </Card>
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

export default SessionViewerV2