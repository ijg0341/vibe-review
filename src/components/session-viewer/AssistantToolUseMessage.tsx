'use client'

import React from 'react'
import { 
  Terminal, FileText, PenTool, Search, Globe, CheckSquare, 
  FolderOpen, Code, AlertCircle, Wrench, Play,
  FileEdit, FilePlus, FolderSearch, Hash, Link, Brain,
  Zap, Clock
} from 'lucide-react'
import { formatTimestamp, extractFileName, extractCommand, formatTokenUsage, calculateDuration } from './utils'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'

// Tool 아이콘 및 스타일 매핑
const TOOL_CONFIG: Record<string, { 
  icon: any, 
  color: string, 
  bgColor: string,
  label: string 
}> = {
  'Bash': { 
    icon: Terminal, 
    color: 'text-purple-600 dark:text-purple-400', 
    bgColor: 'bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800',
    label: 'Terminal' 
  },
  'Read': { 
    icon: FileText, 
    color: 'text-blue-600 dark:text-blue-400', 
    bgColor: 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800',
    label: 'Read File' 
  },
  'Write': { 
    icon: FilePlus, 
    color: 'text-green-600 dark:text-green-400', 
    bgColor: 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800',
    label: 'Write File' 
  },
  'Edit': { 
    icon: FileEdit, 
    color: 'text-yellow-600 dark:text-yellow-400', 
    bgColor: 'bg-yellow-50 dark:bg-yellow-950/30 border-yellow-200 dark:border-yellow-800',
    label: 'Edit File' 
  },
  'MultiEdit': { 
    icon: Code, 
    color: 'text-orange-600 dark:text-orange-400', 
    bgColor: 'bg-orange-50 dark:bg-orange-950/30 border-orange-200 dark:border-orange-800',
    label: 'Multi Edit' 
  },
  'Grep': { 
    icon: Search, 
    color: 'text-teal-600 dark:text-teal-400', 
    bgColor: 'bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800',
    label: 'Search' 
  },
  'Glob': { 
    icon: FolderSearch, 
    color: 'text-cyan-600 dark:text-cyan-400', 
    bgColor: 'bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800',
    label: 'Find Files' 
  },
  'TodoWrite': { 
    icon: CheckSquare, 
    color: 'text-indigo-600 dark:text-indigo-400', 
    bgColor: 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800',
    label: 'Todo List' 
  },
  'WebSearch': { 
    icon: Globe, 
    color: 'text-pink-600 dark:text-pink-400', 
    bgColor: 'bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800',
    label: 'Web Search' 
  },
  'WebFetch': { 
    icon: Link, 
    color: 'text-rose-600 dark:text-rose-400', 
    bgColor: 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800',
    label: 'Fetch URL' 
  },
  'Task': { 
    icon: Brain, 
    color: 'text-violet-600 dark:text-violet-400', 
    bgColor: 'bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800',
    label: 'AI Agent' 
  },
  'LS': { 
    icon: FolderOpen, 
    color: 'text-emerald-600 dark:text-emerald-400', 
    bgColor: 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800',
    label: 'List Files' 
  }
}

// Default tool config
const DEFAULT_TOOL = { 
  icon: Wrench, 
  color: 'text-gray-600 dark:text-gray-400', 
  bgColor: 'bg-gray-50 dark:bg-gray-950/30 border-gray-200 dark:border-gray-800',
  label: 'Tool' 
}

interface AssistantToolUseMessageProps {
  data: any
  locale?: 'ko' | 'en'
}

export const AssistantToolUseMessage: React.FC<AssistantToolUseMessageProps> = ({ 
  data, 
  locale = 'ko' 
}) => {
  const content = data.message?.content
  const toolUse = Array.isArray(content) ? content.find(item => item.type === 'tool_use') : null
  
  if (!toolUse) return null
  
  const toolName = toolUse.name
  const toolInput = toolUse.input
  const toolConfig = TOOL_CONFIG[toolName] || DEFAULT_TOOL
  const Icon = toolConfig.icon
  const usage = data.message?.usage
  const duration = calculateDuration(data.timestamp, data.completedAt)
  
  // Extract key information based on tool type
  const getToolSummary = () => {
    switch (toolName) {
      case 'Bash':
        return {
          primary: extractCommand(toolInput.command || ''),
          secondary: toolInput.description || toolInput.command
        }
      case 'Read':
      case 'Write':
        return {
          primary: extractFileName(toolInput.file_path || ''),
          secondary: toolInput.file_path
        }
      case 'Edit':
        return {
          primary: extractFileName(toolInput.file_path || ''),
          secondary: `Replace: "${toolInput.old_string?.substring(0, 30)}..."`
        }
      case 'Grep':
        return {
          primary: toolInput.pattern,
          secondary: toolInput.path || 'Current directory'
        }
      case 'WebSearch':
        return {
          primary: toolInput.query,
          secondary: 'Searching the web...'
        }
      case 'TodoWrite':
        const todos = toolInput.todos || []
        return {
          primary: `${todos.length} items`,
          secondary: todos.map((t: any) => t.content).slice(0, 2).join(', ')
        }
      default:
        return {
          primary: toolName,
          secondary: JSON.stringify(toolInput).substring(0, 50) + '...'
        }
    }
  }
  
  const summary = getToolSummary()
  const [showDetails, setShowDetails] = React.useState(false)
  
  // TodoList 전용 렌더링
  if (toolName === 'TodoWrite') {
    const todos = toolInput.todos || []
    return (
      <div className="ml-11">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <CheckSquare className={`h-4 w-4 ${toolConfig.color}`} />
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
              Todo List
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(data.timestamp)}
            </span>
            <Badge variant="outline" className="text-xs h-4 bg-orange-50 dark:bg-orange-950/30">
              AssistantToolUse
            </Badge>
          </div>
          
          {/* Todo List Items */}
          <div className="mt-2 space-y-1">
            {todos.map((todo: any, index: number) => (
              <div key={todo.id || index} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 ${
                  todo.status === 'completed' ? 'text-green-600 dark:text-green-400' :
                  todo.status === 'in_progress' ? 'text-blue-600 dark:text-blue-400' :
                  'text-gray-400'
                }`}>
                  {todo.status === 'completed' ? '✓' : 
                   todo.status === 'in_progress' ? '◌' : '○'}
                </span>
                <span className={`${
                  todo.status === 'completed' ? 'line-through text-gray-500 dark:text-gray-400' : 
                  'text-gray-900 dark:text-gray-100'
                }`}>
                  {todo.content}
                </span>
              </div>
            ))}
          </div>
          
          {/* Token & Duration */}
          {(usage || duration) && (
            <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
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
  
  // Bash/Terminal 전용 렌더링
  if (toolName === 'Bash') {
    return (
      <div className="ml-11">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Terminal className={`h-4 w-4 ${toolConfig.color}`} />
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
              Terminal
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(data.timestamp)}
            </span>
            <Badge variant="outline" className="text-xs h-4 bg-orange-50 dark:bg-orange-950/30">
              AssistantToolUse
            </Badge>
          </div>
          
          {/* Command Display */}
          <div className="mt-2">
            <div className="bg-gray-900 dark:bg-black rounded-md p-2">
              <code className="text-xs text-green-400 font-mono">
                $ {toolInput.command}
              </code>
            </div>
            {toolInput.description && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                {toolInput.description}
              </p>
            )}
          </div>
          
          {/* Token & Duration */}
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
  
  // Read, Glob 등 단순 파일 작업 렌더링
  if (toolName === 'Read' || toolName === 'Glob' || toolName === 'LS') {
    return (
      <div className="ml-11">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <Icon className={`h-4 w-4 ${toolConfig.color}`} />
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {toolConfig.label}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(data.timestamp)}
            </span>
            <Badge variant="outline" className="text-xs h-4 bg-orange-50 dark:bg-orange-950/30">
              AssistantToolUse
            </Badge>
          </div>
          
          {/* File Path or Pattern */}
          <div className="mt-1 text-sm text-gray-700 dark:text-gray-300">
            {toolName === 'Glob' ? (
              <span className="font-mono">{toolInput.pattern}</span>
            ) : (
              <span className="font-mono">{extractFileName(toolInput.file_path || toolInput.path || '')}</span>
            )}
          </div>
          
          {/* Token & Duration */}
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
  
  // Edit 툴 전용 diff 렌더링
  if (toolName === 'Edit' || toolName === 'MultiEdit') {
    const isMultiEdit = toolName === 'MultiEdit'
    const edits = isMultiEdit ? toolInput.edits : [{ old_string: toolInput.old_string, new_string: toolInput.new_string }]
    
    return (
      <div className="ml-11">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center gap-2 mb-1">
            <FileEdit className={`h-4 w-4 ${toolConfig.color}`} />
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
              {toolConfig.label}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {formatTimestamp(data.timestamp)}
            </span>
            <Badge variant="outline" className="text-xs h-4 bg-orange-50 dark:bg-orange-950/30">
              AssistantToolUse
            </Badge>
          </div>
          
          {/* File Path */}
          <div className="text-sm font-mono text-gray-700 dark:text-gray-300 mb-2">
            {extractFileName(toolInput.file_path)}
          </div>
          
          {/* Code Diff */}
          <div className="border border-gray-200 dark:border-gray-700 rounded-md overflow-hidden">
            {edits.map((edit: any, index: number) => (
              <div key={index} className={index > 0 ? 'border-t border-gray-200 dark:border-gray-700' : ''}>
                {/* Old Code (Remove) */}
                {edit.old_string && (
                  <div className="bg-red-50 dark:bg-red-950/20 p-2">
                    <div className="flex items-start gap-2">
                      <span className="text-red-600 dark:text-red-400 font-mono text-xs select-none">-</span>
                      <pre className="flex-1 text-xs font-mono text-red-700 dark:text-red-300 whitespace-pre-wrap break-all">
                        {edit.old_string.length > 200 ? 
                          edit.old_string.substring(0, 100) + '\n...\n' + edit.old_string.substring(edit.old_string.length - 100) : 
                          edit.old_string}
                      </pre>
                    </div>
                  </div>
                )}
                
                {/* New Code (Add) */}
                {edit.new_string && (
                  <div className="bg-green-50 dark:bg-green-950/20 p-2">
                    <div className="flex items-start gap-2">
                      <span className="text-green-600 dark:text-green-400 font-mono text-xs select-none">+</span>
                      <pre className="flex-1 text-xs font-mono text-green-700 dark:text-green-300 whitespace-pre-wrap break-all">
                        {edit.new_string.length > 200 ? 
                          edit.new_string.substring(0, 100) + '\n...\n' + edit.new_string.substring(edit.new_string.length - 100) : 
                          edit.new_string}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Token & Duration */}
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
  
  // 기본 렌더링 (Write, WebSearch 등)
  return (
    <div className="ml-11">
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <Icon className={`h-4 w-4 ${toolConfig.color}`} />
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            {toolConfig.label}
          </span>
          <Badge variant="outline" className="h-5 text-xs">
            {toolName}
          </Badge>
          <span className="text-xs text-gray-500 dark:text-gray-400">
            {formatTimestamp(data.timestamp)}
          </span>
          {/* Dev Component Name */}
          <Badge variant="outline" className="text-xs h-4 bg-orange-50 dark:bg-orange-950/30">
            AssistantToolUse
          </Badge>
        </div>
        
        {/* Tool Card Body */}
        <Card className={`${toolConfig.bgColor} border overflow-hidden`}>
          <div className="p-3">
            <div className="flex items-start gap-2">
              {/* Tool Icon */}
              <div className={`p-1.5 rounded bg-white/50 dark:bg-black/20 ${toolConfig.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              
              {/* Tool Info */}
              <div className="flex-1 min-w-0">
                {/* Primary Info */}
                <div className="font-mono text-sm text-gray-900 dark:text-gray-100">
                  {summary.primary}
                </div>
                
                {/* Secondary Info */}
                <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                  {summary.secondary}
                </div>
                
                {/* Show/Hide Details Button - WebSearch만 */}
                {toolName === 'WebSearch' && (
                  <button
                    onClick={() => setShowDetails(!showDetails)}
                    className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    {showDetails ? '세부사항 숨기기' : '세부사항 보기'}
                  </button>
                )}
              </div>
            </div>
            
            {/* Detailed Input (collapsible) */}
            {showDetails && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <pre className="bg-white/50 dark:bg-black/20 rounded p-2 text-xs overflow-x-hidden whitespace-pre-wrap break-words">
                  {JSON.stringify(toolInput, null, 2)}
                </pre>
              </div>
            )}
          </div>
          
          {/* Token & Duration for Card-based tools */}
          {(usage || duration) && (
            <div className="px-3 pb-3">
              <div className="flex items-center gap-4 text-xs text-gray-500 dark:text-gray-400">
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
          )}
        </Card>
      </div>
    </div>
  )
}

AssistantToolUseMessage.displayName = 'AssistantToolUseMessage'