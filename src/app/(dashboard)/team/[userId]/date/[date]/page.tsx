'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useTeamMemberDaily } from '@/hooks/use-query-api'
import { apiClient } from '@/lib/api-client'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SessionViewer } from '@/components/sessions/SessionViewer'
import { SessionList } from '@/components/sessions/SessionList'
import { AISummaryPanel } from '@/components/ai-summary/AISummaryPanel'
import { 
  ArrowLeft,
  Folder,
  FileText,
  Calendar,
  Clock,
  Loader2,
  Database,
  ChevronRight,
  ChevronDown,
  Users,
  Code
} from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'

interface TeamMember {
  id: string
  full_name?: string
  username?: string
  role: 'admin' | 'member'
}

interface DailyStats {
  overview: {
    total_sessions: number
    total_size: number
    average_size: number
    unique_projects: number
  }
  tools: Record<string, number>
  hourly_distribution: Record<string, number>
  projects: string[]
  time_span: {
    first_session: string
    last_session: string
  }
}

interface DailySession {
  id: string
  filename: string
  upload_time: string
  file_size: number
  tool_name: string
  project: string
  project_name?: string
  upload_status: string
  metadata?: Record<string, any>
  session_data: {
    mime_type: string
    file_hash: string
    storage_path: string
  }
}

interface SessionLine {
  id: number
  line_number: number
  content: any
  raw_text: string
  message_type?: string
  message_timestamp?: string
  metadata?: any
}

export default function TeamDateDetailPage() {
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionLines, setSessionLines] = useState<SessionLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [rightPanelWidth, setRightPanelWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const router = useRouter()
  const params = useParams()
  
  const userId = params.userId as string
  const dateStr = params.date as string
  const targetDate = dateStr ? parseISO(dateStr) : new Date()
  
  // 실제 API 호출로 해당 날짜의 멤버 활동 데이터 가져오기
  const { data: dailyData, isLoading: loading, error } = useTeamMemberDaily(userId, dateStr)
  
  // API 응답에서 데이터 추출
  const member = dailyData?.success ? (dailyData.data as any)?.member : null
  const dailyStats = dailyData?.success ? (dailyData.data as any)?.daily_stats : null
  const sessions = dailyData?.success ? (dailyData.data as any)?.sessions || [] : []
  
  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // 세션 선택 핸들러 - 실제 API 연동
  const selectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setLinesLoading(true)
    
    try {
      // 선택된 세션의 인덱스를 찾아서 해당 세션의 session_content.message 사용
      const selectedSessionIndex = sessions.findIndex((s: any) => s.id === sessionId)
      
      if (selectedSessionIndex !== -1) {
        // dailyData에서 해당 세션의 session_content.message 가져오기
        const sessionData = (dailyData?.data as any)?.sessions[selectedSessionIndex]
        
        if (sessionData?.session_content?.messages) {
          // session_content.messages를 SessionViewer가 이해할 수 있는 형태로 변환
          const convertedLines = sessionData.session_content.messages.map((message: any, index: number) => ({
            id: index + 1,
            line_number: index + 1,
            content: {
              type: message.type,
              message: {
                content: message.content
              },
              timestamp: message.timestamp,
              uuid: message.uuid,
              sequence: message.sequence
            },
            raw_text: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
            message_type: message.type,
            message_timestamp: message.timestamp
          }))
          
          setSessionLines(convertedLines)
        } else {
          console.error('No session_content.messages found for session:', sessionId)
          setSessionLines([])
        }
      } else {
        console.error('Session not found:', sessionId)
        setSessionLines([])
      }
    } catch (error) {
      console.error('Error in selectSession:', error)
      setSessionLines([])
    } finally {
      setLinesLoading(false)
    }
  }

  // 리사이즈 핸들러들
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return
    requestAnimationFrame(() => {
      const newWidth = window.innerWidth - e.clientX - 10
      setRightPanelWidth(Math.min(Math.max(280, newWidth), 600))
    })
  }

  const handleMouseUp = () => {
    setIsResizing(false)
  }

  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing])

  // 프로젝트별 세션 그룹화
  const sessionsByProject = sessions.reduce((acc: any, session: any) => {
    const projectId = session.project_name || session.project || 'no-project'
    if (!acc[projectId]) {
      acc[projectId] = []
    }
    acc[projectId].push(session)
    return acc
  }, {} as any)

  // 자동으로 모든 프로젝트 확장하고 첫 번째 세션 선택
  useEffect(() => {
    if (sessions.length > 0) {
      const projectIds = Object.keys(sessionsByProject)
      setExpandedProjects(new Set(projectIds))
      
      if (sessions[0]) {
        selectSession(sessions[0].id)
      }
    }
  }, [sessions])

  // 날짜 포맷팅
  const formatDateTitle = () => {
    if (locale === 'ko') {
      return format(targetDate, 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })
    }
    return format(targetDate, 'EEEE, MMMM dd, yyyy', { locale: enUS })
  }

  // 프로젝트 확장/축소 토글
  const toggleProjectExpand = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  // 통계 정보
  const selectedSession = sessions.find((s: any) => s.id === selectedSessionId)

  if (loading || !member) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                {locale === 'ko' ? '데이터를 불러오는 중...' : 'Loading data...'}
              </p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <DashboardLayout fullWidth>
        <div className={`flex h-full max-w-full overflow-hidden ${isResizing ? 'select-none cursor-col-resize' : ''}`}>
          {/* 왼쪽 - 세션 목록 */}
          <div className="w-80 border-r bg-muted/10 flex-shrink-0">
            {/* 사이드바 헤더 */}
            <div className="p-4 border-b">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push(`/team/${userId}`)}
                className="mb-2 -ml-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {member.full_name || member.username || 'Unknown'}
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">{formatDateTitle()}</h2>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {dailyStats?.overview?.total_sessions || 0} {locale === 'ko' ? '세션' : 'sessions'}
                </span>
                <span className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  {dailyStats?.overview ? formatFileSize(dailyStats.overview.total_size) : '0 B'}
                </span>
              </div>
            </div>

            {/* 세션 목록 타이틀 */}
            <div className="px-4 pb-2">
              <h3 className="text-sm font-semibold text-muted-foreground">
                {locale === 'ko' ? '세션 목록' : 'Session List'}
              </h3>
            </div>
            
            {/* 프로젝트별 세션 목록 */}
            <ScrollArea className="h-[calc(100%-150px)]">
              <div className="p-2 space-y-4">
                {Object.entries(sessionsByProject).map(([projectId, projectSessions]: [string, any]) => {
                  const isExpanded = expandedProjects.has(projectId)
                  const projectName = projectId === 'no-project' 
                    ? (locale === 'ko' ? '프로젝트 없음' : 'No Project')
                    : projectId
                  
                  return (
                    <div key={projectId}>
                      {/* 프로젝트 헤더 */}
                      <div
                        className="flex items-center gap-2 px-2 py-1.5 hover:bg-muted/50 rounded cursor-pointer mb-2"
                        onClick={() => toggleProjectExpand(projectId)}
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <Folder className="h-4 w-4" />
                        <span className="font-medium text-sm flex-1">
                          {projectName}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {projectSessions.length}
                        </Badge>
                      </div>

                      {/* 세션 목록 */}
                      {isExpanded && (
                        <div className="ml-2 space-y-1">
                          {projectSessions.map((session: any, index: number) => {
                            // dailyData에서 해당 세션의 인덱스 찾기
                            const sessionIndex = sessions.findIndex((s: any) => s.id === session.id)
                            const sessionData = (dailyData?.data as any)?.sessions[sessionIndex]
                            
                            // 첫 번째 사용자 메시지 찾기 (새로운 API 구조)
                            let firstUserMessage = ''
                            if (session.session_content?.messages) {
                              const userMessage = session.session_content.messages.find((msg: any) => msg.type === 'user')
                              if (userMessage?.content) {
                                const content = typeof userMessage.content === 'string' 
                                  ? userMessage.content 
                                  : JSON.stringify(userMessage.content)
                                firstUserMessage = content.length > 60 
                                  ? content.substring(0, 60) + '...' 
                                  : content
                              }
                            }
                            
                            return (
                              <div
                                key={`${projectId}-${session.id}-${index}`}
                                className={`
                                  p-3 rounded-lg border cursor-pointer transition-colors
                                  ${selectedSessionId === session.id 
                                    ? 'bg-primary/10 border-primary' 
                                    : 'hover:bg-muted/50'
                                  }
                                `}
                                onClick={() => selectSession(session.id)}
                              >
                                <div className="space-y-2">
                                  <p className="font-medium text-sm">{session.project_name || 'Session'}</p>
                                  
                                  {/* 첫 번째 사용자 메시지 미리보기 */}
                                  {firstUserMessage && (
                                    <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                                      "{firstUserMessage}"
                                    </p>
                                  )}
                                  
                                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {session.start_time} - {session.end_time}
                                    </span>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 text-xs">
                                    <Badge variant="secondary" className="text-xs">
                                      {session.total_messages || 0} messages
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {session.total_tokens || 0} tokens
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {session.prompt_count || 0} prompts
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* 중앙 - 세션 상세 */}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {selectedSession ? (
              <>
                {/* 세션 헤더 */}
                <div className="p-4 border-b bg-background">
                  <div className="flex items-start justify-between">
                    <div>
                      <h1 className="text-xl font-semibold flex items-center gap-2">
                        <Code className="h-5 w-5" />
                        {selectedSession.filename}
                      </h1>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Folder className="h-3 w-3" />
                          {selectedSession.project_name || selectedSession.project}
                        </span>
                        <span className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {formatFileSize(selectedSession.file_size)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {selectedSession.upload_time}
                        </span>
                        <Badge variant={selectedSession.upload_status === 'processed' ? 'default' : 'secondary'}>
                          {selectedSession.upload_status}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 세션 뷰어 - 통합 컴포넌트 사용 */}
                <div className="flex-1 overflow-hidden min-h-0">
                  <SessionViewer
                    lines={sessionLines}
                    loading={linesLoading}
                    sessionTitle={undefined}
                    sessionInfo={{
                      user: undefined,
                      uploadTime: selectedSession.upload_time,
                      processedLines: selectedSession.file_size
                    }}
                    locale={locale}
                    showFilter={true}
                  />
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {locale === 'ko' 
                      ? '왼쪽에서 세션을 선택하세요' 
                      : 'Select a session from the left'}
                  </p>
                </div>
              </div>
            )}
          </div>
          
          {/* 리사이즈 핸들 */}
          <div 
            className="relative w-0 flex items-center justify-center"
            onMouseDown={handleMouseDown}
          >
            <div className={`
              absolute h-full w-1 
              ${isResizing ? 'bg-primary' : 'bg-border hover:bg-primary/50'} 
              transition-colors cursor-col-resize
            `}>
              <div className="absolute inset-y-0 -left-2 -right-2 z-10" />
              {/* 중앙 그립 인디케이터 */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-10 bg-border rounded-full opacity-50" />
            </div>
          </div>
          
          {/* 오른쪽 - AI 요약 */}
          <div 
            className="border-l bg-background flex-shrink-0 transition-none"
            style={{ 
              width: `${rightPanelWidth}px`,
              willChange: isResizing ? 'width' : 'auto'
            }}
          >
            <AISummaryPanel
              userId={userId}
              date={dateStr}
              locale={locale}
              sessions={sessions}
              sessionLines={sessionLines as any}
            />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}