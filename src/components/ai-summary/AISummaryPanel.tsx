'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { 
  Calendar, 
  Loader2, 
  RefreshCw, 
  Sparkles,
  AlertCircle 
} from 'lucide-react'

interface AISummaryPanelProps {
  userId: string
  date: string
  locale?: 'ko' | 'en'
  sessions?: Array<{
    id: string
    project?: { name: string }
    first_user_prompt?: string
    uploaded_at: string
    session_start_date?: string
    session_end_date?: string
  }>
  sessionLines?: Array<{
    id: number
    upload_id: string
    content: any
    message_type?: string
  }>
}

export const AISummaryPanel: React.FC<AISummaryPanelProps> = ({ 
  userId, 
  date, 
  locale = 'ko',
  sessions = [],
  sessionLines = []
}) => {
  const [summary, setSummary] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCached, setIsCached] = useState(false)

  const generateSummary = async (forceRegenerate = false) => {
    try {
      setLoading(true)
      setError(null)
      
      // 프로젝트별로 사용자 메시지 텍스트 정제
      const projectTexts = sessions.map(session => {
        // 해당 세션의 해당 날짜 사용자 메시지만 필터링
        const userTexts = sessionLines
          .filter(line => {
            const messageDate = (line as any).message_timestamp
            return line.upload_id === session.id && 
                   messageDate && 
                   messageDate.startsWith(date) &&
                   line.content?.type === 'user' &&
                   line.content?.message?.content
          })
          .map(line => {
            const msgContent = line.content.message.content
            if (typeof msgContent === 'string') {
              return msgContent.trim()
            } else if (Array.isArray(msgContent)) {
              const textItem = msgContent.find(item => item.type === 'text')
              return textItem?.text?.trim() || ''
            }
            return ''
          })
          .filter(text => text.length > 10) // 너무 짧은 메시지 제외
          .join('\n\n') // 텍스트들을 하나로 병합

        return {
          projectName: session.project?.name || 'Unknown Project',
          userText: userTexts
        }
      }).filter(project => project.userText.length > 0)

      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, date, projectTexts, forceRegenerate }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setSummary(data.summary)
      setIsCached(data.cached || false)
    } catch (err) {
      console.error('Error generating summary:', err)
      setError(locale === 'ko' ? '요약 생성에 실패했습니다.' : 'Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // 컴포넌트 마운트 시 자동으로 요약 생성 (캐시 우선 사용)
    if (userId && date && sessions.length > 0) {
      generateSummary(false) // 처음엔 캐시 데이터 사용
    }
  }, [userId, date, sessions])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString + 'T00:00:00')
    return date.toLocaleDateString(
      locale === 'ko' ? 'ko-KR' : 'en-US',
      { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric',
        weekday: 'long' 
      }
    )
  }

  const formatMarkdown = (text: string) => {
    return text
      // 헤딩 처리
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold text-foreground mb-1 mt-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-foreground mb-2 mt-3 flex items-center gap-2">$1</h2>')
      
      // 체크박스 리스트 (TODO)
      .replace(/^- \[ \] (.*$)/gim, '<div class="flex items-start gap-2 mb-0.5 text-sm"><input type="checkbox" class="mt-0.5 rounded border-muted-foreground/50" disabled /><span class="text-foreground">$1</span></div>')
      .replace(/^- \[x\] (.*$)/gim, '<div class="flex items-start gap-2 mb-0.5 text-sm"><input type="checkbox" class="mt-0.5 rounded border-muted-foreground/50" checked disabled /><span class="text-foreground text-muted-foreground">$1</span></div>')
      
      // 볼드 텍스트 (프로젝트 이름)
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-base text-foreground inline-block mt-3">$1</strong>')
      
      // 일반 리스트
      .replace(/^- ((?!\[).*$)/gim, '<div class="flex items-start gap-2 mb-0.5 text-sm"><span class="text-muted-foreground mt-0.5">•</span><span class="text-foreground">$1</span></div>')
      
      // 줄바꿈 처리
      .replace(/\n\n/g, '</div><div class="mb-1">')
      .replace(/\n/g, '<br>')
      
      // 전체를 div로 감싸기
      .replace(/^(.*)$/, '<div class="mb-1">$1</div>')
  }

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {locale === 'ko' ? '오늘의 성과' : 'Today\'s Achievement'}
          </CardTitle>
          <Button
            onClick={() => generateSummary(true)} // 새로고침 시 강제 재생성
            disabled={loading}
            size="sm"
            variant="outline"
            className="h-8"
            title={isCached ? (locale === 'ko' ? '캐시된 데이터. 클릭하여 새로 생성' : 'Cached data. Click to regenerate') : ''}
          >
            {loading ? (
              <Loader2 className="h-3 w-3 animate-spin mr-2" />
            ) : (
              <RefreshCw className="h-3 w-3 mr-2" />
            )}
            {locale === 'ko' ? '새로고침' : 'Refresh'}
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          <Calendar className="h-3 w-3 inline mr-1" />
          {formatDate(date)}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">
            {locale === 'ko' ? 'AI가 생성한 작업 요약' : 'AI-generated work summary'}
          </span>
          {isCached && summary && (
            <Badge variant="secondary" className="text-xs">
              {locale === 'ko' ? '캐시됨' : 'Cached'}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-hidden p-4">

        <ScrollArea className="h-full">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-40">
              <Loader2 className="h-8 w-8 animate-spin mb-4 text-primary" />
              <p className="text-sm text-muted-foreground text-center">
                {locale === 'ko' 
                  ? 'AI가 오늘의 작업을 분석하고 있습니다...' 
                  : 'AI is analyzing today\'s work...'}
              </p>
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-40">
              <AlertCircle className="h-8 w-8 mb-4 text-destructive" />
              <p className="text-sm text-destructive text-center mb-4">{error}</p>
              <Button onClick={() => generateSummary()} size="sm">
                {locale === 'ko' ? '다시 시도' : 'Try Again'}
              </Button>
            </div>
          ) : summary ? (
            <div className="prose prose-sm max-w-none dark:prose-invert">
              <div 
                className="markdown-content space-y-1 text-sm leading-snug"
                dangerouslySetInnerHTML={{ 
                  __html: formatMarkdown(summary) 
                }}
              />
              <style jsx>{`
                .markdown-content h2 {
                  border-bottom: 1px solid hsl(var(--border));
                  padding-bottom: 4px;
                }
                .markdown-content h3 {
                  color: hsl(var(--muted-foreground));
                }
                .markdown-content input[type="checkbox"] {
                  accent-color: hsl(var(--primary));
                }
                .markdown-content strong {
                  background: hsl(var(--muted) / 0.3);
                  padding: 1px 4px;
                  border-radius: 2px;
                }
              `}</style>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Sparkles className="h-8 w-8 mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                {locale === 'ko' 
                  ? '아직 요약이 생성되지 않았습니다.' 
                  : 'No summary generated yet.'}
              </p>
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </div>
  )
}

export default AISummaryPanel