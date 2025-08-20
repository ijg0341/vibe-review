'use client'

import React from 'react'
import { 
  Terminal, FileText, PenTool, Search, Globe, CheckSquare, 
  FolderOpen, Code, AlertCircle, Wrench, Bot, Play,
  FileEdit, FilePlus, FolderSearch, Hash, Link, Brain
} from 'lucide-react'
import { formatTimestamp, extractFileName, extractCommand } from './utils'
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
  
  return (
    <div className="flex gap-3">
      {/* Tool Icon */}
      <div className="flex-shrink-0 mt-1">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-sm">
          <Bot className="h-4 w-4 text-white" />
        </div>
      </div>
      
      {/* Tool Card */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
            Claude
          </span>
          <Badge variant="secondary" className="h-5">
            <Play className="h-3 w-3 mr-1" />
            {locale === 'ko' ? '도구 사용' : 'Tool Use'}
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
          <div className="p-4">
            <div className="flex items-start gap-3">
              {/* Tool Icon */}
              <div className={`p-2 rounded-lg bg-white/50 dark:bg-black/20 ${toolConfig.color}`}>
                <Icon className="h-5 w-5" />
              </div>
              
              {/* Tool Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold text-sm">
                    {toolConfig.label}
                  </span>
                  <Badge variant="outline" className="text-xs">
                    {toolName}
                  </Badge>
                </div>
                
                {/* Primary Info */}
                <div className="font-mono text-sm text-gray-900 dark:text-gray-100 mb-1">
                  {summary.primary}
                </div>
                
                {/* Secondary Info */}
                <div className="text-xs text-gray-600 dark:text-gray-400 truncate">
                  {summary.secondary}
                </div>
                
                {/* Show/Hide Details Button */}
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showDetails ? '세부사항 숨기기' : '세부사항 보기'}
                </button>
              </div>
            </div>
            
            {/* Detailed Input (collapsible) */}
            {showDetails && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
                <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                  Input Parameters:
                </div>
                <pre className="bg-white/50 dark:bg-black/20 rounded p-2 text-xs overflow-x-auto">
                  {JSON.stringify(toolInput, null, 2)}
                </pre>
              </div>
            )}
          </div>
          
          {/* Tool ID Footer */}
          <div className="bg-white/30 dark:bg-black/10 px-4 py-1 border-t border-gray-200 dark:border-gray-700">
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ID: {toolUse.id?.slice(0, 20)}...
            </span>
          </div>
        </Card>
      </div>
    </div>
  )
}

AssistantToolUseMessage.displayName = 'AssistantToolUseMessage'