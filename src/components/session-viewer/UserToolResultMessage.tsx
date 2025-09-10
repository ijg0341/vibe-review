'use client'

import React from 'react'
import { Clock } from 'lucide-react'
import { formatTimestamp, countLines, truncateText, calculateDuration } from './utils'
import { Badge } from '@/components/ui/badge'

interface SubagentInfo {
  type: string | null
  name: string | undefined
}

interface UserToolResultMessageProps {
  data: any
  locale?: 'ko' | 'en'
  subagentInfo?: SubagentInfo
}

export const UserToolResultMessage: React.FC<UserToolResultMessageProps> = ({ 
  data, 
  locale = 'ko',
  subagentInfo
}) => {
  const [expanded, setExpanded] = React.useState(false) // 기본적으로 접혀있음
  
  // Extract tool result from content array
  const content = data.message?.content
  const toolResult = Array.isArray(content) ? content[0] : null
  const toolUseResult = data.toolUseResult
  
  if (!toolResult || !toolUseResult) return null
  
  const isError = toolResult.is_error
  const stdout = toolUseResult.stdout || ''
  const stderr = toolUseResult.stderr || ''
  const hasOutput = stdout.length > 0 || stderr.length > 0
  const lineCount = countLines(stdout) + countLines(stderr)
  const isLongOutput = lineCount > 10 || stdout.length > 500 || stderr.length > 500
  const duration = calculateDuration(data.timestamp, data.completedAt) || 
                   (toolUseResult.duration ? `${toolUseResult.duration}ms` : null)
  
  return (
    <div className="ml-11">
      <div className="flex-1 min-w-0">
        {/* Simple Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimestamp(data.timestamp)}
          </span>
          {duration && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
              <Clock className="h-3 w-3" />
              <span>{duration}</span>
            </div>
          )}
          {/* Dev Component Name */}
          <Badge variant="outline" className="text-xs h-4 bg-gray-50 dark:bg-gray-950/30">
            UserToolResult
          </Badge>
          {subagentInfo && (
            <Badge variant="outline" className="text-xs h-4 bg-purple-50 dark:bg-purple-950/30 text-purple-700 dark:text-purple-300">
              SubAgent ({subagentInfo.name})
            </Badge>
          )}
        </div>
        
        {/* Simple Output */}
        {hasOutput ? (
          <div>
            {/* Toggle Button */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
            >
              {expanded ? '▼' : '▶'} {isError ? 
                <span className="text-red-600 dark:text-red-400">{locale === 'ko' ? '실행 오류' : 'Execution error'}</span> : 
                <span>{locale === 'ko' ? '실행 결과' : 'Execution result'}</span>
              } ({lineCount} lines)
            </button>
            
            {/* Expandable Output */}
            {expanded && (
              <div className="font-mono text-xs mt-2 ml-3">
                {stdout && (
                  <div className={`whitespace-pre-wrap break-all ${
                    isError ? 'text-gray-600 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'
                  }`}>
                    {stdout}
                  </div>
                )}
                {stderr && (
                  <div className="text-red-600 dark:text-red-400 whitespace-pre-wrap break-all mt-1">
                    {stderr}
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-500 dark:text-gray-400">
            ✓ {locale === 'ko' ? '실행 완료' : 'Execution completed'}
          </div>
        )}
      </div>
    </div>
  )
}

UserToolResultMessage.displayName = 'UserToolResultMessage'