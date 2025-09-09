'use client'

import React, { useState, useMemo } from 'react'
import { AlertCircle, Filter, ChevronDown, ChevronUp } from 'lucide-react'
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

type ConversationFilter = 'all' | 'main-only' | 'subagent-only';
type SubagentTypeFilter = 'all' | string;

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
  const [conversationFilter, setConversationFilter] = useState<ConversationFilter>('all')
  const [subagentTypeFilter, setSubagentTypeFilter] = useState<SubagentTypeFilter>('all')
  const [collapsedSubagents, setCollapsedSubagents] = useState<Set<string>>(new Set())
  
  // Helper to detect subagent type - prioritize normalized data
  const getSubagentType = (message: any): string | null => {
    // 정규화된 데이터 우선 사용
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
  
  // Get unique subagent types for filter dropdown
  const availableSubagentTypes = useMemo(() => {
    const types = new Set<string>()
    lines.forEach(line => {
      try {
        const data = line.content || JSON.parse(line.raw_text)
        const subagentType = getSubagentType(data)
        if (subagentType && subagentType !== 'unknown-subagent') {
          types.add(subagentType)
        }
      } catch (e) {
        // Skip invalid lines
      }
    })
    return Array.from(types)
  }, [lines])
  
  // Filter messages based on conversation and subagent type filters
  const filteredLines = useMemo(() => {
    return lines.filter(line => {
      try {
        const data = line.content || JSON.parse(line.raw_text)
        const isSubagent = data.is_sidechain === true || data.isSidechain === true
        const subagentType = getSubagentType(data)
        
        // Apply conversation filter
        if (conversationFilter === 'main-only' && isSubagent) return false
        if (conversationFilter === 'subagent-only' && !isSubagent) return false
        
        // Apply subagent type filter
        if (subagentTypeFilter !== 'all' && isSubagent && subagentType !== subagentTypeFilter) {
          return false
        }
        
        return true
      } catch (e) {
        return true // Keep invalid lines
      }
    })
  }, [lines, conversationFilter, subagentTypeFilter])
  
  // Toggle collapse state for subagent groups
  const toggleSubagentCollapse = (subagentType: string) => {
    const newCollapsed = new Set(collapsedSubagents)
    if (newCollapsed.has(subagentType)) {
      newCollapsed.delete(subagentType)
    } else {
      newCollapsed.add(subagentType)
    }
    setCollapsedSubagents(newCollapsed)
  }
  
  // Helper to wrap subagent messages with distinctive styling
  const renderSubagentWrapper = (component: React.ReactNode, subagentInfo: any, subagentType: string) => {
    if (!subagentInfo) return component
    
    const isCollapsed = collapsedSubagents.has(subagentType)
    
    return (
      <div className={`${subagentInfo.bgClass} ${subagentInfo.borderClass} rounded-lg p-4 my-2`}>
        <div 
          className="flex items-center gap-2 mb-3 pb-2 border-b border-gray-200 dark:border-gray-700 cursor-pointer"
          onClick={() => toggleSubagentCollapse(subagentType)}
        >
          <span className="text-lg">{subagentInfo.icon}</span>
          <span className={`text-sm font-medium ${subagentInfo.textClass}`}>
            {subagentInfo.label}
          </span>
          <div className="flex-1"></div>
          <span className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-gray-800 px-2 py-1 rounded-full">
            Sub Agent
          </span>
          {isCollapsed ? (
            <ChevronDown className="h-4 w-4 text-gray-400" />
          ) : (
            <ChevronUp className="h-4 w-4 text-gray-400" />
          )}
        </div>
        {!isCollapsed && (
          <div className="ml-2">
            {component}
          </div>
        )}
      </div>
    )
  }
  
  const renderStructuredLine = (line: SessionLine) => {
    try {
      // Parse the JSON data
      const data = line.content || JSON.parse(line.raw_text)
      
      // Apply message type filter if provided
      if (messageTypeFilter.length > 0) {
        const messageType = getMessageType(data)
        if (!messageTypeFilter.includes(messageType)) {
          return null
        }
      }
      
      // Check if this is a subagent message
      const subagentType = getSubagentType(data)
      const isSubagent = data.is_sidechain === true || data.isSidechain === true
      const subagentInfo = subagentType ? getSubagentInfo(subagentType) : null
      
      // Determine message type and render appropriate component
      if (data.type === 'user') {
        const content = data.message?.content
        
        // User Direct Text Message
        if (typeof content === 'string') {
          const component = <UserDirectTextMessage key={line.id} data={data} locale={locale} />
          return isSubagent ? renderSubagentWrapper(component, subagentInfo, subagentType || 'unknown-subagent') : component
        }
        
        // User Tool Result Message
        if (Array.isArray(content)) {
          const hasToolResult = content.some(item => item.type === 'tool_result')
          if (hasToolResult) {
            const component = <UserToolResultMessage key={line.id} data={data} locale={locale} />
            return isSubagent ? renderSubagentWrapper(component, subagentInfo, subagentType || 'unknown-subagent') : component
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
          const components = (
            <React.Fragment key={line.id}>
              {hasThinking && <AssistantThinkingMessage data={data} locale={locale} />}
              {hasText && <AssistantTextMessage data={data} locale={locale} />}
              {hasToolUse && <AssistantToolUseMessage data={data} locale={locale} />}
            </React.Fragment>
          )
          
          return isSubagent ? renderSubagentWrapper(components, subagentInfo, subagentType || 'unknown-subagent') : components
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
  
  // Render filtering UI
  const renderFilterControls = () => {
    return (
      <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">필터:</span>
          </div>
          
          {/* Conversation Type Filter */}
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">대화 유형:</span>
            <select 
              value={conversationFilter} 
              onChange={(e) => setConversationFilter(e.target.value as ConversationFilter)}
              className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
            >
              <option value="all">전체</option>
              <option value="main-only">메인 대화만</option>
              <option value="subagent-only">서브에이전트만</option>
            </select>
          </div>
          
          {/* Subagent Type Filter */}
          {availableSubagentTypes.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">서브에이전트 타입:</span>
              <select 
                value={subagentTypeFilter} 
                onChange={(e) => setSubagentTypeFilter(e.target.value as SubagentTypeFilter)}
                className="text-sm border border-gray-300 dark:border-gray-600 rounded px-2 py-1 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                disabled={conversationFilter === 'main-only'}
              >
                <option value="all">전체</option>
                {availableSubagentTypes.map(type => (
                  <option key={type} value={type}>
                    {getSubagentInfo(type).label}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Stats */}
          <div className="ml-auto text-sm text-gray-500 dark:text-gray-400">
            {filteredLines.length} / {lines.length} 메시지
          </div>
        </div>
      </div>
    )
  }

  if (viewMode === 'raw') {
    return renderRawView()
  }
  
  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      {renderFilterControls()}
      {filteredLines.map(line => renderStructuredLine(line)).filter(Boolean)}
    </div>
  )
}

export default SessionViewerV2