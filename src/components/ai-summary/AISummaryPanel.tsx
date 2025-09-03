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
    filename: string
    project: string
    project_name?: string
    session_content?: {
      messages: Array<{
        type: 'user' | 'assistant'
        content: string | any
        timestamp?: string
      }>
    }
  }>
  sessionLines?: any // 새로운 구조에서는 필요 없음
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
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vibereview_token')}`,
        },
        body: JSON.stringify({ userId, date, forceRegenerate }),
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      setSummary(data.data?.summary || data.summary)
      setIsCached(data.data?.cached || data.cached || false)
    } catch (err) {
      console.error('Error generating summary:', err)
      setError(locale === 'ko' ? '요약 생성에 실패했습니다.' : 'Failed to generate summary')
    } finally {
      setLoading(false)
    }
  }

  const [hasInitialized, setHasInitialized] = useState(false)
  
  useEffect(() => {
    if (userId && date && !hasInitialized && !loading && !summary) {
      console.log('AISummaryPanel: Initializing summary for', userId, date)
      setHasInitialized(true)
      generateSummary(false)
    }
  }, [userId, date])

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
      
      // 체크박스 리스트 (완료된 작업)
      .replace(/^- \[x\] (.*$)/gim, '<div class="flex items-start gap-2 mb-1 text-sm"><input type="checkbox" class="mt-0.5 rounded border-muted-foreground/50" checked disabled /><span class="text-foreground">$1</span></div>')
      .replace(/^- \[ \] (.*$)/gim, '<div class="flex items-start gap-2 mb-1 text-sm"><input type="checkbox" class="mt-0.5 rounded border-muted-foreground/50" disabled /><span class="text-foreground">$1</span></div>')
      
      // 볼드 텍스트 (프로젝트 이름)
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold text-base text-foreground inline-block mt-3 mb-1">$1</strong>')
      
      // 일반 리스트
      .replace(/^- ((?!\[).*$)/gim, '<div class="flex items-start gap-2 mb-1 text-sm"><span class="text-muted-foreground mt-0.5">•</span><span class="text-foreground">$1</span></div>')
      
      // 줄바꿈 처리
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
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