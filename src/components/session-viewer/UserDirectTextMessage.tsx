'use client'

import React from 'react'
import { User, Bot } from 'lucide-react'
import { formatTimestamp, truncateText } from './utils'
import { Badge } from '@/components/ui/badge'

interface SubagentInfo {
  type: string | null
  name: string | undefined
}

interface UserDirectTextMessageProps {
  data: any
  locale?: 'ko' | 'en'
  subagentInfo?: SubagentInfo
}

export const UserDirectTextMessage: React.FC<UserDirectTextMessageProps> = ({ 
  data, 
  locale = 'ko',
  subagentInfo
}) => {
  const content = data.message?.content || ''
  const timestamp = data.timestamp
  const isLongMessage = content.length > 200
  const [expanded, setExpanded] = React.useState(!isLongMessage)
  
  return (
    <div className="flex gap-3">
      {/* User Avatar */}
      <div className="flex-shrink-0 mt-1">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
          subagentInfo ? 'bg-purple-500' : 'bg-blue-500'
        }`}>
          {subagentInfo ? (
            <Bot className="h-4 w-4 text-white" />
          ) : (
            <User className="h-4 w-4 text-white" />
          )}
        </div>
      </div>
      
      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {locale === 'ko' ? '사용자' : 'User'}
            {subagentInfo?.name && (
              <span className="text-purple-600 dark:text-purple-400 font-normal">
                {' '}({subagentInfo.name})
              </span>
            )}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimestamp(timestamp)}
          </span>
          {/* Dev Component Name */}
          <Badge variant="outline" className="text-xs h-4 bg-blue-50 dark:bg-blue-950/30">
            UserDirectText
          </Badge>
          {subagentInfo && (
            <Badge variant="outline" className="text-xs h-4 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300">
              SubAgent
            </Badge>
          )}
        </div>
        
        {/* Simple Message */}
        <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
          {expanded ? content : truncateText(content, 500)}
        </div>
        
        {isLongMessage && content.length > 500 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
          >
            {expanded ? '접기' : '더 보기'}
          </button>
        )}
      </div>
    </div>
  )
}

UserDirectTextMessage.displayName = 'UserDirectTextMessage'