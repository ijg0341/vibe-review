'use client'

import React, { useState } from 'react'
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
  messageTypeFilter?: string[]
}

export const SessionViewerV2: React.FC<SessionViewerV2Props> = ({ 
  lines, 
  viewMode = 'structured',
  locale = 'ko',
  messageTypeFilter = []
}) => {
  
  // Helper to get subagent name directly from data
  const getSubagentName = (message: any): string | null => {
    
    // content 레벨에서 우선 확인 (실제 데이터 구조)
    if (message.content?.subagent_name) {
      return message.content.subagent_name;
    }
    
    // message.message 안에 있는지 확인 (JSONB 중첩 구조)
    if (message.message?.subagent_name) {
      return message.message.subagent_name;
    }
    
    // message.message.messages 안에 있는지 확인 (더 깊은 중첩)
    if (message.message?.messages?.subagent_name) {
      return message.message.messages.subagent_name;
    }
    
    // message_content 내부 확인
    if (message.message_content?.subagent_name) {
      return message.message_content.subagent_name;
    }
    
    // 최상위 레벨에서 확인
    if (message.subagent_name) {
      return message.subagent_name;
    }
    
    return null;
  }

  // Helper to detect subagent type - prioritize normalized data
  const getSubagentType = (message: any): string | null => {
    // content 레벨에서 우선 확인 (실제 데이터 구조)
    if (message.content?.subagent_name) {
      return message.content.subagent_name;
    }
    
    if (message.content?.is_sidechain !== undefined) {
      return message.content.is_sidechain ? 'unknown-subagent' : null;
    }
    
    // 정규화된 데이터 우선 사용 - message_content 내부 확인
    if (message.message_content?.subagent_name) {
      return message.message_content.subagent_name;
    }
    
    if (message.message_content?.is_sidechain !== undefined) {
      return message.message_content.is_sidechain ? 'unknown-subagent' : null;
    }
    
    // 최상위 레벨에서도 확인
    if (message.subagent_name) {
      return message.subagent_name;
    }
    
    if (message.is_sidechain !== undefined) {
      return message.is_sidechain ? 'unknown-subagent' : null;
    }
    
    // 기존 원본 데이터 파싱 로직은 fallback으로 유지
    if (!message.isSidechain) return null;
    
    // Try to find Task tool usage in previous messages to get subagent_type
    const toolUseContent = message.message?.content?.find((c: any) => c.type === 'tool_use' && c.name === 'Task');
    if (toolUseContent?.input?.subagent_type) {
      return toolUseContent.input.subagent_type;
    }
    
    // Detect from MCP tool usage patterns
    const mcpTool = message.message?.content?.find((c: any) => c.type === 'tool_use' && c.name?.startsWith('mcp__'));
    if (mcpTool?.name?.includes('figma')) return 'figma-design-analyst';
    if (mcpTool?.name?.includes('code')) return 'code-reviewer';
    
    return 'unknown-subagent';
  }
  
  // Helper to get subagent styling and info
  const getSubagentInfo = (subagentType: string) => {
    const config: Record<string, {
      icon: string;
      label: string;
      bgClass: string;
      borderClass: string;
      textClass: string;
    }> = {
      'figma-design-analyst': { 
        icon: '🎨', 
        label: 'Figma Design Analyst',
        bgClass: 'bg-purple-50 dark:bg-purple-950/20',
        borderClass: 'border-l-4 border-purple-500',
        textClass: 'text-purple-700 dark:text-purple-300'
      },
      'code-reviewer': { 
        icon: '🔍', 
        label: 'Code Reviewer',
        bgClass: 'bg-blue-50 dark:bg-blue-950/20',
        borderClass: 'border-l-4 border-blue-500',
        textClass: 'text-blue-700 dark:text-blue-300'
      },
      'general-purpose': { 
        icon: '⚙️', 
        label: 'General Purpose Agent',
        bgClass: 'bg-green-50 dark:bg-green-950/20',
        borderClass: 'border-l-4 border-green-500',
        textClass: 'text-green-700 dark:text-green-300'
      },
      'unknown-subagent': { 
        icon: '🤖', 
        label: 'Sub Agent',
        bgClass: 'bg-orange-50 dark:bg-orange-950/20',
        borderClass: 'border-l-4 border-orange-500',
        textClass: 'text-orange-700 dark:text-orange-300'
      }
    };
    return config[subagentType] || config['unknown-subagent'];
  }
  
  // Helper to get message type for filtering
  const getMessageType = (data: any): string => {
    if (data.type === 'user') {
      const content = data.message?.content
      if (Array.isArray(content) && content.some(item => item.type === 'tool_result')) {
        return 'tool_result'
      }
      return 'user_text'
    }
    
    if (data.type === 'assistant') {
      const content = data.message?.content
      if (Array.isArray(content)) {
        if (content.some(item => item.type === 'thinking')) return 'thinking'
        if (content.some(item => item.type === 'tool_use')) return 'tool_use'
        if (content.some(item => item.type === 'text')) return 'assistant_text'
      }
    }
    
    return 'other'
  }
  
  
  const renderStructuredLine = (line: SessionLine) => {
    try {
      // Parse the JSON data
      const data = line.content || JSON.parse(line.raw_text)
      
      // Apply message type filter if provided
      if (messageTypeFilter.length > 0) {
        const messageType = getMessageType(data)
        const isSubagent = data.is_sidechain === true || data.isSidechain === true
        
        // Handle subagent filtering - check content first
        const isSubagentFiltered = data.content?.is_sidechain === true || 
                                  data.message_content?.is_sidechain === true || 
                                  data.is_sidechain === true || 
                                  data.isSidechain === true
        
        if (messageTypeFilter.includes('main-only') && isSubagentFiltered) {
          return null
        }
        if (messageTypeFilter.includes('subagent-only') && !isSubagentFiltered) {
          return null
        }
        
        // Handle other message type filtering (exclude subagent filters)
        const otherFilters = messageTypeFilter.filter(f => f !== 'main-only' && f !== 'subagent-only')
        if (otherFilters.length > 0 && !otherFilters.includes(messageType)) {
          return null
        }
      }
      
      // Check if this is a subagent message - check content first
      const subagentType = getSubagentType(data)
      const subagentName = getSubagentName(data)
      const isSubagent = data.content?.is_sidechain === true || 
                        data.message_content?.is_sidechain === true || 
                        data.is_sidechain === true || 
                        data.isSidechain === true
      const subagentInfo = subagentType ? getSubagentInfo(subagentType) : null
      
      // Determine message type and render appropriate component
      if (data.type === 'user') {
        const content = data.message?.content
        
        // User Direct Text Message
        if (typeof content === 'string') {
          return <UserDirectTextMessage 
            key={line.id} 
            data={data} 
            locale={locale}
            subagentInfo={isSubagent ? { type: subagentType, name: subagentName } : undefined}
          />
        }
        
        // User Tool Result Message
        if (Array.isArray(content)) {
          const hasToolResult = content.some(item => item.type === 'tool_result')
          if (hasToolResult) {
            return <UserToolResultMessage 
              key={line.id} 
              data={data} 
              locale={locale}
              subagentInfo={isSubagent ? { type: subagentType, name: subagentName } : undefined}
            />
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
          const subagentProps = isSubagent ? { type: subagentType, name: subagentName } : undefined

          return (
            <React.Fragment key={line.id}>
              {hasThinking && <AssistantThinkingMessage data={data} locale={locale} subagentInfo={subagentProps} />}
              {hasText && <AssistantTextMessage data={data} locale={locale} subagentInfo={subagentProps} />}
              {hasToolUse && <AssistantToolUseMessage data={data} locale={locale} subagentInfo={subagentProps} />}
            </React.Fragment>
          )
        }
      }

      // Skip Summary and File History Snapshot messages (internal metadata)
      if (data.type === 'summary' || data.type === 'file-history-snapshot') {
        return null
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
              <pre className="text-xs text-red-500 dark:text-red-400 whitespace-pre-wrap break-words">
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
        <pre className="text-xs whitespace-pre-wrap break-words font-mono text-gray-300">
          {lines.map(line => line.raw_text).join('\n')}
        </pre>
      </Card>
    )
  }
  
  if (viewMode === 'raw') {
    return renderRawView()
  }
  
  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {lines.map(line => renderStructuredLine(line)).filter(Boolean)}
    </div>
  )
}

export default SessionViewerV2