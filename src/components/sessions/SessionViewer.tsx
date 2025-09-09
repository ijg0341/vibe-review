'use client'

import React, { useState } from 'react'
import { SessionViewerV2 } from '../session-viewer/SessionViewerV2'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Filter, 
  User, 
  Bot, 
  Terminal, 
  Brain, 
  Wrench,
  Clock,
  AlertCircle,
  Loader2
} from 'lucide-react'

interface SessionLine {
  id: number
  line_number: number
  content: any
  raw_text: string
  message_type?: string
  message_timestamp?: string
  metadata?: any
}

interface SessionViewerProps {
  lines: SessionLine[]
  loading?: boolean
  sessionTitle?: string
  sessionInfo?: {
    user?: string
    uploadTime?: string
    processedLines?: number
  }
  locale?: 'ko' | 'en'
  viewMode?: 'structured' | 'raw'
  showFilter?: boolean // 필터 표시 여부 (기본값: true)
}

export const SessionViewer: React.FC<SessionViewerProps> = ({
  lines,
  loading = false,
  sessionTitle,
  sessionInfo,
  locale = 'ko',
  viewMode = 'structured',
  showFilter = true // 기본적으로 필터 표시
}) => {
  const [messageTypeFilter, setMessageTypeFilter] = useState<string[]>([])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(
      locale === 'ko' ? 'ko-KR' : 'en-US',
      { hour: '2-digit', minute: '2-digit' }
    )
  }

  return (
    <Card className="h-full flex flex-col max-w-full overflow-hidden">
      {(sessionTitle || sessionInfo) && (
        <CardHeader className="pb-3 flex-shrink-0">
          <div className="flex items-center justify-between">
            {sessionTitle && (
              <CardTitle className="text-lg truncate max-w-md">
                {sessionTitle}
              </CardTitle>
            )}
            {sessionInfo && (
              <div className="flex items-center gap-2">
                {sessionInfo.user && (
                  <Badge variant="secondary">
                    <User className="h-3 w-3 mr-1" />
                    {sessionInfo.user}
                  </Badge>
                )}
                {sessionInfo.uploadTime && (
                  <Badge variant="outline">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatDate(sessionInfo.uploadTime)}
                  </Badge>
                )}
              </div>
            )}
          </div>
        </CardHeader>
      )}
      
      {showFilter && !loading && lines.length > 0 && (
        <div className="px-4 py-2 border-b bg-muted/5 flex-shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Filter className="h-3 w-3" />
              {locale === 'ko' ? '필터:' : 'Filter:'}
            </span>
            
            <Button
              variant={messageTypeFilter.includes('user_text') ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setMessageTypeFilter(prev => 
                  prev.includes('user_text') 
                    ? prev.filter(t => t !== 'user_text')
                    : [...prev, 'user_text']
                )
              }}
            >
              <User className="h-3 w-3 mr-1" />
              {locale === 'ko' ? '사용자' : 'User'}
            </Button>
            
            <Button
              variant={messageTypeFilter.includes('assistant_text') ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setMessageTypeFilter(prev => 
                  prev.includes('assistant_text') 
                    ? prev.filter(t => t !== 'assistant_text')
                    : [...prev, 'assistant_text']
                )
              }}
            >
              <Bot className="h-3 w-3 mr-1" />
              Claude
            </Button>
            
            <Button
              variant={messageTypeFilter.includes('tool_use') ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setMessageTypeFilter(prev => 
                  prev.includes('tool_use') 
                    ? prev.filter(t => t !== 'tool_use')
                    : [...prev, 'tool_use']
                )
              }}
            >
              <Wrench className="h-3 w-3 mr-1" />
              {locale === 'ko' ? '도구' : 'Tools'}
            </Button>
            
            <Button
              variant={messageTypeFilter.includes('tool_result') ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setMessageTypeFilter(prev => 
                  prev.includes('tool_result') 
                    ? prev.filter(t => t !== 'tool_result')
                    : [...prev, 'tool_result']
                )
              }}
            >
              <Terminal className="h-3 w-3 mr-1" />
              {locale === 'ko' ? '결과' : 'Results'}
            </Button>
            
            <Button
              variant={messageTypeFilter.includes('thinking') ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setMessageTypeFilter(prev => 
                  prev.includes('thinking') 
                    ? prev.filter(t => t !== 'thinking')
                    : [...prev, 'thinking']
                )
              }}
            >
              <Brain className="h-3 w-3 mr-1" />
              {locale === 'ko' ? '사고' : 'Thinking'}
            </Button>
            
            {/* 구분선 */}
            <div className="h-4 w-px bg-border mx-2" />
            
            <Button
              variant={messageTypeFilter.includes('main-only') ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setMessageTypeFilter(prev => 
                  prev.includes('main-only') 
                    ? prev.filter(t => t !== 'main-only')
                    : [...prev.filter(t => t !== 'subagent-only'), 'main-only']
                )
              }}
            >
              <User className="h-3 w-3 mr-1" />
              {locale === 'ko' ? '메인 대화만' : 'Main Only'}
            </Button>
            
            <Button
              variant={messageTypeFilter.includes('subagent-only') ? 'default' : 'outline'}
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                setMessageTypeFilter(prev => 
                  prev.includes('subagent-only') 
                    ? prev.filter(t => t !== 'subagent-only')
                    : [...prev.filter(t => t !== 'main-only'), 'subagent-only']
                )
              }}
            >
              <Bot className="h-3 w-3 mr-1" />
              {locale === 'ko' ? '서브에이전트만' : 'Subagents Only'}
            </Button>
            
            {messageTypeFilter.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setMessageTypeFilter([])}
              >
                {locale === 'ko' ? '필터 초기화' : 'Clear filters'}
              </Button>
            )}
          </div>
        </div>
      )}
      
      <CardContent className="flex-1 overflow-auto p-4 max-w-full">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : lines.length > 0 ? (
          <SessionViewerV2 
            lines={lines} 
            viewMode={viewMode}
            locale={locale}
            messageTypeFilter={messageTypeFilter}
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <AlertCircle className="h-8 w-8 mb-2" />
            <p>{locale === 'ko' ? '세션 데이터가 없습니다' : 'No session data available'}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default SessionViewer