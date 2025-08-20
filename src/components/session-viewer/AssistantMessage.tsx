'use client'

import React, { useState } from 'react'
import { Bot, ChevronDown, ChevronRight, Zap, Brain } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatTimestamp, formatTokenUsage, AssistantMessage as AssistantMessageType, ContentItem, TOOL_INFO } from './message-types'

interface AssistantMessageProps {
  data: AssistantMessageType
  locale?: 'ko' | 'en'
}

export const AssistantMessage: React.FC<AssistantMessageProps> = React.memo(({ data, locale = 'ko' }) => {
  const [expandedThinking, setExpandedThinking] = useState(false)
  
  const renderContentItem = (item: ContentItem, index: number) => {
    // 텍스트 메시지
    if (item.type === 'text') {
      return (
        <div key={index} className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
          {item.text}
        </div>
      )
    }
    
    // Tool 사용
    if (item.type === 'tool_use') {
      const toolInfo = TOOL_INFO[item.name] || { 
        icon: '🔧', 
        label: item.name, 
        color: 'bg-gray-100 dark:bg-gray-800/30 border-gray-300 dark:border-gray-700' 
      }
      
      return (
        <Card key={index} className={`p-3 ${toolInfo.color}`}>
          <div className="flex items-start gap-3">
            <span className="text-xl">{toolInfo.icon}</span>
            <div className="flex-1 space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{toolInfo.label}</span>
                <Badge variant="outline" className="text-xs">
                  {item.name}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {item.id.slice(0, 8)}...
                </span>
              </div>
              
              {/* Tool 입력 파라미터 */}
              <div className="bg-white/50 dark:bg-black/20 rounded p-2">
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(item.input, null, 2)}
                </pre>
              </div>
            </div>
          </div>
        </Card>
      )
    }
    
    // Thinking (사고 과정)
    if (item.type === 'thinking') {
      return (
        <Card key={index} className="bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800 p-3">
          <div className="space-y-2">
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start p-0 h-auto hover:bg-transparent"
              onClick={() => setExpandedThinking(!expandedThinking)}
            >
              <div className="flex items-center gap-2">
                {expandedThinking ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
                <Brain className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm font-medium text-purple-900 dark:text-purple-100">
                  {locale === 'ko' ? '사고 과정' : 'Thinking Process'}
                </span>
                <Badge variant="outline" className="text-xs">
                  {item.text.length} chars
                </Badge>
              </div>
            </Button>
            
            {expandedThinking && (
              <div className="pl-6 pt-2">
                <pre className="text-xs text-purple-800 dark:text-purple-200 whitespace-pre-wrap">
                  {item.text}
                </pre>
              </div>
            )}
          </div>
        </Card>
      )
    }
    
    // 기타 content 타입
    return (
      <div key={index} className="text-sm text-gray-900 dark:text-gray-100">
        {JSON.stringify(item)}
      </div>
    )
  }
  
  return (
    <div className="flex gap-3 group">
      {/* 아바타 */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
          <Bot className="h-4 w-4 text-green-600 dark:text-green-400" />
        </div>
      </div>
      
      {/* 메시지 내용 */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            Claude
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(data.timestamp)}
          </span>
          {data.message.model && (
            <Badge variant="outline" className="text-xs h-5">
              {data.message.model.split('-').slice(0, 2).join('-')}
            </Badge>
          )}
          {data.parentUuid && (
            <Badge variant="outline" className="text-xs h-5">
              Reply
            </Badge>
          )}
        </div>
        
        <div className="space-y-2">
          {data.message.content.map((item, index) => renderContentItem(item, index))}
        </div>
        
        {/* 토큰 사용량 및 메타데이터 */}
        <div className="hidden group-hover:flex items-center gap-3 text-xs text-muted-foreground pt-1">
          {data.message.usage && (
            <div className="flex items-center gap-1">
              <Zap className="h-3 w-3" />
              <span>{formatTokenUsage(data.message.usage)}</span>
            </div>
          )}
          {data.requestId && (
            <span className="opacity-50">
              Req: {data.requestId.slice(0, 8)}...
            </span>
          )}
          <span className="text-xs opacity-50">
            {data.uuid.slice(0, 8)}...
          </span>
        </div>
      </div>
    </div>
  )
})

AssistantMessage.displayName = 'AssistantMessage'