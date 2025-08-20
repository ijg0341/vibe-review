'use client'

import React from 'react'
import { User, Terminal, AlertCircle, CheckCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { formatTimestamp, UserMessage as UserMessageType, ContentItem } from './message-types'

interface UserMessageProps {
  data: UserMessageType
  locale?: 'ko' | 'en'
}

export const UserMessage: React.FC<UserMessageProps> = React.memo(({ data, locale = 'ko' }) => {
  const renderContent = () => {
    const content = data.message.content
    
    // 단순 텍스트 메시지
    if (typeof content === 'string') {
      return (
        <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap">
          {content}
        </div>
      )
    }
    
    // ContentItem 배열
    if (Array.isArray(content)) {
      return content.map((item: ContentItem, index) => {
        if (item.type === 'tool_result') {
          return (
            <div key={index} className="space-y-2">
              <div className="flex items-center gap-2">
                {item.is_error ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <Badge variant={item.is_error ? 'destructive' : 'success'} className="text-xs">
                  Tool Result
                </Badge>
                <span className="text-xs text-muted-foreground">
                  ID: {item.tool_use_id.slice(0, 8)}...
                </span>
              </div>
              
              {/* Tool 실행 결과 내용 */}
              {data.toolUseResult && (
                <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3 space-y-2">
                  {data.toolUseResult.stdout && (
                    <div>
                      <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                        {locale === 'ko' ? '출력:' : 'Output:'}
                      </div>
                      <pre className="text-xs bg-white dark:bg-gray-950 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto">
                        {data.toolUseResult.stdout}
                      </pre>
                    </div>
                  )}
                  
                  {data.toolUseResult.stderr && (
                    <div>
                      <div className="text-xs font-medium text-red-600 dark:text-red-400 mb-1">
                        {locale === 'ko' ? '에러:' : 'Error:'}
                      </div>
                      <pre className="text-xs bg-red-50 dark:bg-red-950/30 text-red-800 dark:text-red-200 rounded p-2 overflow-x-auto">
                        {data.toolUseResult.stderr}
                      </pre>
                    </div>
                  )}
                </div>
              )}
              
              {/* Raw content (fallback) */}
              {!data.toolUseResult && item.content && (
                <pre className="text-xs bg-gray-50 dark:bg-gray-900/50 rounded p-2 overflow-x-auto max-h-48 overflow-y-auto">
                  {typeof item.content === 'string' ? item.content : JSON.stringify(item.content, null, 2)}
                </pre>
              )}
            </div>
          )
        }
        
        // 기타 content 타입
        return (
          <div key={index} className="text-sm text-gray-900 dark:text-gray-100">
            {JSON.stringify(item)}
          </div>
        )
      })
    }
    
    return null
  }
  
  return (
    <div className="flex gap-3 group">
      {/* 아바타 */}
      <div className="flex-shrink-0">
        <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
          <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        </div>
      </div>
      
      {/* 메시지 내용 */}
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900 dark:text-gray-100">
            {locale === 'ko' ? '사용자' : 'User'}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatTimestamp(data.timestamp)}
          </span>
          {data.parentUuid && (
            <Badge variant="outline" className="text-xs h-5">
              Reply
            </Badge>
          )}
        </div>
        
        <Card className="bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800 p-3">
          {renderContent()}
        </Card>
        
        {/* 메타데이터 (hover 시 표시) */}
        <div className="hidden group-hover:flex items-center gap-3 text-xs text-muted-foreground pt-1">
          {data.cwd && (
            <div className="flex items-center gap-1">
              <Terminal className="h-3 w-3" />
              <span className="truncate max-w-xs" title={data.cwd}>
                {data.cwd.split('/').pop()}
              </span>
            </div>
          )}
          {data.gitBranch && (
            <Badge variant="outline" className="text-xs h-4">
              {data.gitBranch}
            </Badge>
          )}
          <span className="text-xs opacity-50">
            {data.uuid.slice(0, 8)}...
          </span>
        </div>
      </div>
    </div>
  )
})

UserMessage.displayName = 'UserMessage'