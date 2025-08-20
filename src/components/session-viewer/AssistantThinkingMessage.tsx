'use client'

import React from 'react'
import { Brain, Zap, Clock } from 'lucide-react'
import { formatTimestamp, truncateText, countLines, formatTokenUsage, calculateDuration } from './utils'
import { Badge } from '@/components/ui/badge'

interface AssistantThinkingMessageProps {
  data: any
  locale?: 'ko' | 'en'
}

export const AssistantThinkingMessage: React.FC<AssistantThinkingMessageProps> = ({ 
  data, 
  locale = 'ko' 
}) => {
  const content = data.message?.content
  const thinkingContent = Array.isArray(content) ? content.find(item => item.type === 'thinking') : null
  
  if (!thinkingContent) return null
  
  const thinkingText = thinkingContent.thinking || thinkingContent.text || ''
  const lineCount = countLines(thinkingText)
  const charCount = thinkingText.length
  const isLong = charCount > 500
  const usage = data.message?.usage
  const duration = calculateDuration(data.timestamp, data.completedAt)
  const [expanded, setExpanded] = React.useState(!isLong)
  
  return (
    <div className="flex gap-3">
      {/* Claude Avatar */}
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
          <Brain className="h-4 w-4 text-white" />
        </div>
      </div>
      
      {/* Thinking Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            Claude
          </span>
          <Badge variant="secondary" className="h-5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
            <Brain className="h-3 w-3 mr-1" />
            {locale === 'ko' ? '사고 과정' : 'Thinking'}
          </Badge>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimestamp(data.timestamp)}
          </span>
          {/* Dev Component Name */}
          <Badge variant="outline" className="text-xs h-4 bg-violet-50 dark:bg-violet-950/30">
            AssistantThinking
          </Badge>
        </div>
        
        {/* Simple Thinking Message */}
        <div className="text-sm text-gray-600 dark:text-gray-400 italic whitespace-pre-wrap break-words">
          {expanded || !isLong ? thinkingText : truncateText(thinkingText, 500)}
        </div>
        
        {isLong && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            {expanded ? '접기' : '더 보기'}
          </button>
        )}
        
        {/* Metadata: Line count, Tokens, Duration */}
        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center gap-4">
            <span>{lineCount} lines • {charCount} characters</span>
            {usage && (
              <div className="flex items-center gap-1">
                <Zap className="h-3 w-3" />
                <span>{formatTokenUsage(usage)}</span>
              </div>
            )}
            {duration && (
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>{duration}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

AssistantThinkingMessage.displayName = 'AssistantThinkingMessage'