'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
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
  email: string
  display_name?: string
  avatar_url?: string
}

interface Project {
  id: string
  name: string
  description?: string
  folder_path: string
}

interface ProjectSession {
  id: string
  project_id: string
  session_name: string
  file_name?: string
  file_path?: string
  uploaded_at: string
  session_count: number
  processed_lines: number
  session_start_date?: string
  session_end_date?: string
  project?: Project
  first_user_prompt?: string
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
  const [member, setMember] = useState<TeamMember | null>(null)
  const [sessions, setSessions] = useState<ProjectSession[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionLines, setSessionLines] = useState<SessionLine[]>([])
  const [allSessionLines, setAllSessionLines] = useState<SessionLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [rightPanelWidth, setRightPanelWidth] = useState(320) // 기본 너비 320px
  const [isResizing, setIsResizing] = useState(false)
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  
  const userId = params.userId as string
  const dateStr = params.date as string
  const targetDate = dateStr ? parseISO(dateStr) : new Date()

  // 멤버 정보 가져오기
  const fetchMemberInfo = async () => {
    if (!userId) return

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single()

      if (error) {
        console.error('Error fetching member:', error)
        return
      }

      setMember(data)
    } catch (error) {
      console.error('Error in fetchMemberInfo:', error)
    }
  }

  // 특정 날짜의 세션 가져오기
  const fetchDateSessions = async () => {
    if (!userId || !dateStr) return

    try {
      setLoading(true)
      
      const { data: sessionsData, error } = await supabase
        .from('project_sessions')
        .select(`
          *,
          project:projects(*)
        `)
        .eq('user_id', userId)
        .order('uploaded_at', { ascending: false })

      if (error) {
        console.error('Error fetching sessions:', error)
        return
      }

      // 날짜로 필터링 및 빈 세션 제외
      const filteredSessions = (sessionsData || []).filter(session => {
        // 데이터가 없는 세션 제외
        if (!session.processed_lines || session.processed_lines === 0) {
          return false
        }
        
        const sessionDate = session.session_end_date || 
                           session.session_start_date || 
                           session.uploaded_at
        return sessionDate.startsWith(dateStr)
      })

      // 각 세션의 첫 번째 사용자 메시지 가져오기
      const sessionsWithFirstMessage = await Promise.all(
        filteredSessions.map(async (session) => {
          try {
            // 첫 번째 사용자 메시지 찾기
            const { data: lines, error } = await supabase
              .from('session_lines')
              .select('content, raw_text, message_type')
              .eq('upload_id', session.id)
              .order('line_number', { ascending: true })
              .limit(20) // 처음 20줄에서 찾기
            
            let firstUserPrompt = ''
            if (lines) {
              for (const line of lines) {
                const content = line.content || {}
                if (content.type === 'user' && content.message?.content) {
                  const msgContent = content.message.content
                  if (typeof msgContent === 'string') {
                    firstUserPrompt = msgContent.substring(0, 100)
                    if (msgContent.length > 100) firstUserPrompt += '...'
                    break
                  } else if (Array.isArray(msgContent)) {
                    const textItem = msgContent.find(item => item.type === 'text')
                    if (textItem?.text) {
                      firstUserPrompt = textItem.text.substring(0, 100)
                      if (textItem.text.length > 100) firstUserPrompt += '...'
                      break
                    }
                  }
                }
              }
            }
            
            return {
              ...session,
              first_user_prompt: firstUserPrompt || session.session_name || session.file_name || `Session ${session.session_count || ''}`
            }
          } catch (error) {
            console.error('Error fetching first message:', error)
            return {
              ...session,
              first_user_prompt: session.session_name || session.file_name || `Session ${session.session_count || ''}`
            }
          }
        })
      )
      
      setSessions(sessionsWithFirstMessage)
      
      // 프로젝트 목록 추출
      const projectMap = new Map<string, Project>()
      sessionsWithFirstMessage.forEach(session => {
        if (session.project) {
          projectMap.set(session.project.id, session.project)
        }
      })
      setProjects(Array.from(projectMap.values()))
      
      // 모든 프로젝트 기본 확장
      setExpandedProjects(new Set(Array.from(projectMap.keys())))
      
      // 모든 세션의 라인 데이터 가져오기
      await fetchAllSessionLines(sessionsWithFirstMessage)
      
      // 첫 번째 세션 자동 선택
      if (sessionsWithFirstMessage.length > 0) {
        selectSession(sessionsWithFirstMessage[0].id)
      }
      
    } catch (error) {
      console.error('Error in fetchDateSessions:', error)
    } finally {
      setLoading(false)
    }
  }

  // 모든 세션의 라인 데이터 가져오기
  const fetchAllSessionLines = async (sessions: ProjectSession[]) => {
    try {
      const allLinesPromises = sessions.map(async (session) => {
        const { data, error } = await supabase
          .from('session_lines')
          .select('*')
          .eq('upload_id', session.id)
          .order('line_number', { ascending: true })
        
        if (error) {
          console.error(`Error fetching lines for session ${session.id}:`, error)
          return []
        }
        
        return (data || []).map(line => ({
          ...line,
          upload_id: session.id
        }))
      })
      
      const allLinesArrays = await Promise.all(allLinesPromises)
      const allLines = allLinesArrays.flat()
      setAllSessionLines(allLines)
    } catch (error) {
      console.error('Error fetching all session lines:', error)
    }
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

  // 세션 선택 및 라인 데이터 가져오기
  const selectSession = async (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setLinesLoading(true)
    
    try {
      const { data, error } = await supabase
        .from('session_lines')
        .select('*')
        .eq('upload_id', sessionId)
        .order('line_number', { ascending: true })
      
      if (error) {
        console.error('Error fetching session lines:', error)
        return
      }
      
      setSessionLines(data || [])
    } catch (error) {
      console.error('Error in selectSession:', error)
    } finally {
      setLinesLoading(false)
    }
  }

  // 리사이즈 핸들러
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsResizing(true)
  }

  const handleMouseMove = (e: MouseEvent) => {
    if (!isResizing) return
    
    // requestAnimationFrame으로 부드럽게 처리
    requestAnimationFrame(() => {
      const newWidth = window.innerWidth - e.clientX - 10 // 10px 오프셋으로 더 자연스럽게
      setRightPanelWidth(Math.min(Math.max(280, newWidth), 600)) // 최소 280px, 최대 600px
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

  useEffect(() => {
    fetchMemberInfo()
    fetchDateSessions()
  }, [userId, dateStr])

  // 프로젝트별 세션 그룹화
  const sessionsByProject = sessions.reduce((acc, session) => {
    const projectId = session.project?.id || 'no-project'
    if (!acc[projectId]) {
      acc[projectId] = []
    }
    acc[projectId].push(session)
    return acc
  }, {} as Record<string, ProjectSession[]>)

  // 날짜 포맷팅
  const formatDateTitle = () => {
    if (locale === 'ko') {
      return format(targetDate, 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })
    }
    return format(targetDate, 'EEEE, MMMM dd, yyyy', { locale: enUS })
  }

  // 통계 정보
  const totalSessions = sessions.length
  const totalLines = sessions.reduce((sum, s) => sum + (s.processed_lines || 0), 0)
  const selectedSession = sessions.find(s => s.id === selectedSessionId)

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
                {member.display_name || member.email.split('@')[0]}
              </Button>
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                <h2 className="font-semibold">{formatDateTitle()}</h2>
              </div>
              <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  {totalSessions} {locale === 'ko' ? '세션' : 'sessions'}
                </span>
                <span className="flex items-center gap-1">
                  <Database className="h-3 w-3" />
                  {totalLines.toLocaleString()} {locale === 'ko' ? '라인' : 'lines'}
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
                {Object.entries(sessionsByProject).map(([projectId, projectSessions]) => {
                  const project = projects.find(p => p.id === projectId)
                  const isExpanded = expandedProjects.has(projectId)
                  
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
                          {project?.name || 'No Project'}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {projectSessions.length}
                        </Badge>
                      </div>

                      {/* 세션 목록 - 통합 컴포넌트 사용 */}
                      {isExpanded && (
                        <div className="ml-2">
                          <SessionList
                            sessions={projectSessions.map(session => ({
                              ...session,
                              profiles: {
                                email: member?.email || '',
                                display_name: member?.display_name,
                                avatar_url: member?.avatar_url
                              }
                            }))}
                            selectedSessionId={selectedSessionId}
                            onSessionSelect={(session) => selectSession(session.id)}
                            locale={locale}
                          />
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
                        {selectedSession.session_name || selectedSession.file_name}
                      </h1>
                      <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                        {selectedSession.project && (
                          <span className="flex items-center gap-1">
                            <Folder className="h-3 w-3" />
                            {selectedSession.project.name}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Database className="h-3 w-3" />
                          {selectedSession.processed_lines?.toLocaleString()} {locale === 'ko' ? '라인' : 'lines'}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {format(new Date(selectedSession.uploaded_at), 'HH:mm')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 세션 뷰어 - 통합 컴포넌트 사용 */}
                <div className="flex-1 overflow-hidden min-h-0">
                  <SessionViewer
                    lines={sessionLines}
                    loading={linesLoading}
                    sessionTitle={null} // 제목 중복 방지
                    sessionInfo={{
                      user: null, // 이미 사이드바에 표시됨
                      uploadTime: selectedSession.uploaded_at,
                      processedLines: selectedSession.processed_lines
                    }}
                    locale={locale}
                    showFilter={true} // 필터 항상 표시
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
              sessionLines={allSessionLines}
            />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}