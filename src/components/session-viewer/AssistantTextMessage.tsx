'use client'

import React from 'react'
import { Bot, Zap, Clock } from 'lucide-react'
import { formatTimestamp, formatTokenUsage, calculateDuration } from './utils'
import { Badge } from '@/components/ui/badge'

interface AssistantTextMessageProps {
  data: any
  locale?: 'ko' | 'en'
}

export const AssistantTextMessage: React.FC<AssistantTextMessageProps> = ({ 
  data, 
  locale = 'ko' 
}) => {
  const content = data.message?.content
  const textContent = Array.isArray(content) ? content.find(item => item.type === 'text') : null
  const text = textContent?.text || ''
  const usage = data.message?.usage
  const model = data.message?.model
  const duration = calculateDuration(data.timestamp, data.completedAt)
  
  const [expanded, setExpanded] = React.useState(text.length <= 500)
  
  // Parse markdown-like code blocks
  const renderFormattedText = (text: string) => {
    const parts = text.split(/(```[\s\S]*?```|`[^`]+`)/g)
    
    return parts.map((part, index) => {
      if (part.startsWith('```')) {
        // Code block
        const code = part.slice(3, -3)
        const [lang, ...codeLines] = code.split('\n')
        return (
          <pre key={index} className="bg-gray-900 dark:bg-black rounded-md p-3 my-2 overflow-x-auto">
            <code className="text-xs text-gray-300 font-mono">
              {codeLines.join('\n')}
            </code>
          </pre>
        )
      } else if (part.startsWith('`') && part.endsWith('`')) {
        // Inline code
        return (
          <code key={index} className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm text-pink-600 dark:text-pink-400">
            {part.slice(1, -1)}
          </code>
        )
      } else {
        // Regular text
        return <span key={index}>{part}</span>
      }
    })
  }
  
  return (
    <div className="flex gap-3">
      {/* Claude Avatar */}
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 rounded-full bg-purple-500 flex items-center justify-center">
          <Bot className="h-4 w-4 text-white" />
        </div>
      </div>
      
      {/* Message Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            Claude
          </span>
          {model && (
            <Badge variant="outline" className="h-5 text-xs">
              {model.includes('opus') ? '🎭 Opus' : 
               model.includes('sonnet') ? '🎵 Sonnet' : 
               model.includes('haiku') ? '🍃 Haiku' : 
               model.split('-').slice(0, 2).join('-')}
            </Badge>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimestamp(data.timestamp)}
          </span>
          {/* Dev Component Name */}
          <Badge variant="outline" className="text-xs h-4 bg-purple-50 dark:bg-purple-950/30">
            AssistantText
          </Badge>
        </div>
        
        {/* Simple Message */}
        <div className="text-sm text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
          {expanded ? renderFormattedText(text) : renderFormattedText(text.substring(0, 500) + '...')}
        </div>
        
        {text.length > 500 && (
          <button
            onClick={() => setExpanded(!expanded)}
            className="mt-2 text-xs text-purple-600 dark:text-purple-400 hover:underline"
          >
            {expanded ? '접기' : '더 보기'}
          </button>
        )}
        
        {/* Token Usage & Duration */}
        {(usage || duration) && (
          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
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
        )}
      </div>
    </div>
  )
}

AssistantTextMessage.displayName = 'AssistantTextMessage'