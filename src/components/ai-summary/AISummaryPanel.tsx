'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Calendar,
  Loader2,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Folder
} from 'lucide-react'
import { WorkCategoryChart } from './WorkCategoryChart'
import { ProjectTodoList } from './ProjectTodoList'
import { QualityScore } from './QualityScore'

interface WorkCategoryData {
  minutes: number
  percentage: number
  description: string | null
}

interface WorkCategories {
  planning: WorkCategoryData
  frontend: WorkCategoryData
  backend: WorkCategoryData
  qa: WorkCategoryData
  devops: WorkCategoryData
  research: WorkCategoryData
  other: WorkCategoryData
}

interface TodoItem {
  text: string
  category: 'planning' | 'frontend' | 'backend' | 'qa' | 'devops' | 'research' | 'other'
}

interface ProjectTodo {
  project_id: string | null
  project_name: string
  todos: TodoItem[]
}

interface ProjectTodos {
  [projectSlug: string]: ProjectTodo
}

interface ProjectSummary {
  [projectSlug: string]: string
}

interface ParsedSummaryData {
  summary: ProjectSummary
  work_categories: WorkCategories
  project_todos: ProjectTodos
  quality_score: number
  quality_score_explanation: string
}

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
  sessionLines?: any
}

export const AISummaryPanel: React.FC<AISummaryPanelProps> = ({
  userId,
  date,
  locale = 'ko',
  sessions = [],
  sessionLines = []
}) => {
  const [summary, setSummary] = useState<string>('')
  const [parsedData, setParsedData] = useState<ParsedSummaryData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isCached, setIsCached] = useState(false)

  const generateSummary = async (forceRegenerate = false) => {
    try {
      console.log('[AISummaryPanel] Starting summary generation...', { userId, date, forceRegenerate })
      setLoading(true)
      setError(null)
      setSummary('')
      setParsedData(null)

      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/teams/generate-summary`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('vibereview_token')}`,
        },
        body: JSON.stringify({ userId, date, forceRegenerate }),
      })

      console.log('[AISummaryPanel] Response received:', response.status)

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate summary')
      }

      const { data } = result

      console.log('[AISummaryPanel] Summary received', data)

      setIsCached(data.cached || false)
      setSummary(data.summary)

      // 파싱된 데이터 저장
      if (data.work_categories && data.project_todos && data.quality_score !== undefined) {
        setParsedData({
          summary: data.daily_summary || {},
          work_categories: data.work_categories,
          project_todos: data.project_todos,
          quality_score: data.quality_score,
          quality_score_explanation: data.quality_score_explanation || ''
        })
      }

      setLoading(false)
    } catch (err) {
      console.error('[AISummaryPanel] Error generating summary:', err)
      setError(locale === 'ko' ? '요약 생성에 실패했습니다.' : 'Failed to generate summary')
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

  return (
    <div className="h-full flex flex-col">
      <CardHeader className="pb-3 flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            {locale === 'ko' ? '오늘의 성과' : 'Today\'s Achievement'}
          </CardTitle>
          <Button
            onClick={() => generateSummary(true)}
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
          ) : parsedData ? (
            <div className="prose prose-sm max-w-none dark:prose-invert space-y-6">
              {/* 1. 업무 요약 (프로젝트별 총평) */}
              {parsedData.summary && typeof parsedData.summary === 'object' && Object.keys(parsedData.summary).length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                    📝 {locale === 'ko' ? '오늘의 업무 요약' : 'Daily Summary'}
                  </h2>
                  <div className="space-y-3">
                    {Object.entries(parsedData.summary).map(([projectSlug, projectSummary]) => {
                      // 타입 검증: projectSummary가 문자열인지 확인
                      const summaryText = typeof projectSummary === 'string'
                        ? projectSummary
                        : JSON.stringify(projectSummary)

                      return (
                        <div key={projectSlug} className="bg-muted/30 rounded-lg p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Folder className="h-4 w-4 text-primary" />
                            <h3 className="font-semibold text-sm text-foreground">
                              {parsedData.project_todos[projectSlug]?.project_name || projectSlug}
                            </h3>
                          </div>
                          <p className="text-sm text-foreground leading-relaxed pl-6">
                            {summaryText}
                          </p>
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              <Separator className="my-4" />

              {/* 2. 프로젝트별 Todo 리스트 */}
              {parsedData.project_todos && Object.keys(parsedData.project_todos).length > 0 && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                    ✅ {locale === 'ko' ? '프로젝트별 작업 내역' : 'Project Tasks'}
                  </h2>
                  <ProjectTodoList projectTodos={parsedData.project_todos} locale={locale} />
                </section>
              )}

              <Separator className="my-4" />

              {/* 3. 업무 카테고리 차트 */}
              {parsedData.work_categories && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                    📊 {locale === 'ko' ? '업무 카테고리 분류' : 'Work Categories'}
                  </h2>
                  <WorkCategoryChart workCategories={parsedData.work_categories} locale={locale} />
                </section>
              )}

              <Separator className="my-4" />

              {/* 4. 품질 점수 */}
              {parsedData.quality_score !== undefined && (
                <section>
                  <h2 className="text-lg font-bold text-foreground mb-3 flex items-center gap-2 border-b pb-2">
                    ⭐ {locale === 'ko' ? '프롬프트 품질 점수' : 'Prompt Quality Score'}
                  </h2>
                  <QualityScore
                    qualityScore={parsedData.quality_score}
                    qualityScoreExplanation={parsedData.quality_score_explanation}
                    locale={locale}
                  />
                </section>
              )}
            </div>
          ) : summary ? (
            <div className="flex flex-col items-center justify-center h-40 text-center">
              <Loader2 className="h-8 w-8 mb-4 text-muted-foreground animate-spin" />
              <p className="text-sm text-muted-foreground">
                {locale === 'ko'
                  ? '데이터를 파싱하는 중...'
                  : 'Parsing data...'}
              </p>
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
