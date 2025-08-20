'use client'

import React from 'react'
import { User, MessageSquare } from 'lucide-react'
import { formatTimestamp, truncateText } from './utils'
import { Badge } from '@/components/ui/badge'

interface UserDirectTextMessageProps {
  data: any
  locale?: 'ko' | 'en'
}

export const UserDirectTextMessage: React.FC<UserDirectTextMessageProps> = ({ 
  data, 
  locale = 'ko' 
}) => {
  const content = data.message?.content || ''
  const timestamp = data.timestamp
  const isLongMessage = content.length > 200
  const [expanded, setExpanded] = React.useState(!isLongMessage)
  
  return (
    <div className="flex gap-3">
      {/* User Avatar */}
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-sm">
          <User className="h-4 w-4 text-white" />
        </div>
      </div>
      
      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {locale === 'ko' ? '사용자' : 'User'}
          </span>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimestamp(timestamp)}
          </span>
          {/* Dev Component Name */}
          <Badge variant="outline" className="text-xs h-4 bg-blue-50 dark:bg-blue-950/30">
            UserDirectText
          </Badge>
        </div>
        
        {/* Message Body */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3 shadow-sm">
          <div className="flex items-start gap-2">
            <MessageSquare className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                {expanded ? content : truncateText(content, 200)}
              </div>
              
              {isLongMessage && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {expanded ? '접기' : '더 보기'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

UserDirectTextMessage.displayName = 'UserDirectTextMessage'