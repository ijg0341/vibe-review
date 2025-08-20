'use client'

import React from 'react'
import { Terminal, CheckCircle, XCircle, AlertCircle, ChevronDown, ChevronRight, Copy, Check } from 'lucide-react'
import { formatTimestamp, countLines, truncateText } from './utils'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

interface UserToolResultMessageProps {
  data: any
  locale?: 'ko' | 'en'
}

export const UserToolResultMessage: React.FC<UserToolResultMessageProps> = ({ 
  data, 
  locale = 'ko' 
}) => {
  const [expanded, setExpanded] = React.useState(false)
  const [copied, setCopied] = React.useState(false)
  
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
  
  const handleCopy = () => {
    const textToCopy = stderr ? `${stdout}\n---ERROR---\n${stderr}` : stdout
    navigator.clipboard.writeText(textToCopy)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  
  return (
    <div className="flex gap-3">
      {/* Terminal Icon */}
      <div className="flex-shrink-0 mt-1">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center shadow-sm ${
          isError 
            ? 'bg-gradient-to-br from-red-500 to-red-600' 
            : 'bg-gradient-to-br from-gray-600 to-gray-700'
        }`}>
          <Terminal className="h-4 w-4 text-white" />
        </div>
      </div>
      
      {/* Result Content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {locale === 'ko' ? '실행 결과' : 'Execution Result'}
          </span>
          {isError ? (
            <Badge variant="destructive" className="h-5">
              <XCircle className="h-3 w-3 mr-1" />
              Error
            </Badge>
          ) : (
            <Badge variant="success" className="h-5">
              <CheckCircle className="h-3 w-3 mr-1" />
              Success
            </Badge>
          )}
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimestamp(data.timestamp)}
          </span>
          {/* Dev Component Name */}
          <Badge variant="outline" className="text-xs h-4 bg-gray-50 dark:bg-gray-950/30">
            UserToolResult
          </Badge>
        </div>
        
        {/* Output Container */}
        {hasOutput ? (
          <div className="bg-gray-900 dark:bg-black rounded-lg border border-gray-700 dark:border-gray-800 overflow-hidden">
            {/* Output Header */}
            <div className="bg-gray-800 dark:bg-gray-900 px-3 py-2 border-b border-gray-700 dark:border-gray-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="flex items-center gap-1 text-xs text-gray-400 hover:text-gray-200 transition-colors"
                >
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                  <span>{lineCount} lines</span>
                </button>
                {stderr && (
                  <Badge variant="destructive" className="text-xs h-5">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Has Errors
                  </Badge>
                )}
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-7 px-2"
              >
                {copied ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3" />
                )}
              </Button>
            </div>
            
            {/* Output Body */}
            {(expanded || !isLongOutput) && (
              <div className="p-3 font-mono text-xs">
                {stdout && (
                  <div className="text-gray-300 whitespace-pre-wrap break-all">
                    {isLongOutput && !expanded ? truncateText(stdout, 500) : stdout}
                  </div>
                )}
                {stderr && (
                  <div className="text-red-400 whitespace-pre-wrap break-all mt-2 pt-2 border-t border-gray-800">
                    <div className="font-sans text-xs text-red-500 mb-1">⚠ Error Output:</div>
                    {isLongOutput && !expanded ? truncateText(stderr, 200) : stderr}
                  </div>
                )}
              </div>
            )}
            
            {/* Show More Button */}
            {isLongOutput && !expanded && (
              <div className="px-3 pb-2">
                <button
                  onClick={() => setExpanded(true)}
                  className="text-xs text-blue-400 hover:text-blue-300"
                >
                  {locale === 'ko' ? '전체 출력 보기' : 'Show full output'}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-3">
            <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
              <CheckCircle className="h-4 w-4" />
              <span>
                {locale === 'ko' ? '출력 없음 (성공적으로 실행됨)' : 'No output (executed successfully)'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

UserToolResultMessage.displayName = 'UserToolResultMessage'