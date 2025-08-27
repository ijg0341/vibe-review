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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ScrollArea } from '@/components/ui/scroll-area'
import { SessionViewerV2 } from '@/components/session-viewer/SessionViewerV2'
import { 
  ArrowLeft,
  Folder,
  FileText,
  Calendar,
  Clock,
  Mail,
  Loader2,
  Database,
  Eye,
  ChevronRight,
  ChevronDown,
  Users,
  Code,
  FileCode
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
  const [linesLoading, setLinesLoading] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  
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
      
      // 해당 날짜의 모든 세션 가져오기
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

      // 날짜로 필터링
      const filteredSessions = (sessionsData || []).filter(session => {
        const sessionDate = session.session_end_date || 
                           session.session_start_date || 
                           session.uploaded_at
        return sessionDate.startsWith(dateStr)
      })

      setSessions(filteredSessions)
      
      // 프로젝트 목록 추출
      const projectMap = new Map<string, Project>()
      filteredSessions.forEach(session => {
        if (session.project) {
          projectMap.set(session.project.id, session.project)
        }
      })
      setProjects(Array.from(projectMap.values()))
      
      // 모든 프로젝트 기본 확장
      setExpandedProjects(new Set(Array.from(projectMap.keys())))
      
      // 첫 번째 세션 자동 선택
      if (filteredSessions.length > 0) {
        selectSession(filteredSessions[0].id)
      }
      
    } catch (error) {
      console.error('Error in fetchDateSessions:', error)
    } finally {
      setLoading(false)
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

  // 세션 상세 페이지로 이동 (사용하지 않음 - 같은 페이지에서 표시)
  const handleViewSession = (sessionId: string) => {
    selectSession(sessionId)
  }

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

  // 사용자 이니셜
  const getUserInitials = (email: string, name?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  // 통계 정보
  const totalSessions = sessions.length
  const totalLines = sessions.reduce((sum, s) => sum + (s.processed_lines || 0), 0)
  const totalProjects = Object.keys(sessionsByProject).length
  
  // 현재 선택된 세션 정보
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
      <DashboardLayout>
        <div className="flex h-[calc(100vh-4rem)] -m-6">
          {/* 헤더 */}
          <div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push(`/team/${userId}`)}
              className="mb-2"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              {member.display_name || member.email.split('@')[0]}
            </Button>
            <div className="flex items-center gap-4">
              <Calendar className="h-8 w-8 text-primary" />
              <div>
                <h1 className="text-3xl font-bold">
                  {formatDateTitle()}
                </h1>
                <p className="text-muted-foreground flex items-center gap-2 mt-1">
                  <Users className="h-4 w-4" />
                  {member.display_name || member.email}
                  {locale === 'ko' ? '님의 작업 내역' : "'s Work History"}
                </p>
              </div>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>{locale === 'ko' ? '세션' : 'Sessions'}</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {totalSessions}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>{locale === 'ko' ? '프로젝트' : 'Projects'}</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  {totalProjects}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>{locale === 'ko' ? '총 라인' : 'Total Lines'}</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  {totalLines.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* 프로젝트 필터 */}
          {projects.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    <CardTitle className="text-base">
                      {locale === 'ko' ? '프로젝트 필터' : 'Project Filter'}
                    </CardTitle>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={toggleAllProjects}
                  >
                    {showAllProjects ? 
                      (locale === 'ko' ? '모두 해제' : 'Deselect All') : 
                      (locale === 'ko' ? '모두 선택' : 'Select All')
                    }
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {projects.map(project => {
                    const isSelected = showAllProjects || !selectedProjects.has(project.id)
                    const sessionCount = sessionsByProject[project.id]?.length || 0
                    
                    return (
                      <Button
                        key={project.id}
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        onClick={() => toggleProjectFilter(project.id)}
                        className="gap-2"
                      >
                        {isSelected ? 
                          <CheckCircle2 className="h-3 w-3" /> : 
                          <Circle className="h-3 w-3" />
                        }
                        {project.name}
                        <Badge variant="secondary" className="ml-1">
                          {sessionCount}
                        </Badge>
                      </Button>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* 세션 목록 */}
          {filteredSessions.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {locale === 'ko' ? '세션이 없습니다' : 'No sessions found'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(sessionsByProject)
                .sort(([, a], [, b]) => b.length - a.length)
                .map(([projectId, projectSessions]) => {
                  const project = projects.find(p => p.id === projectId)
                  
                  return projectSessions.map(session => (
                    <Card 
                      key={session.id}
                      className="hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => handleViewSession(session.id, session.project_id)}
                    >
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardTitle className="text-base line-clamp-2">
                              {session.session_name || session.file_name}
                            </CardTitle>
                            <CardDescription className="mt-2">
                              <span className="flex items-center gap-1">
                                <Folder className="h-3 w-3" />
                                {project?.name || 'No Project'}
                              </span>
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewSession(session.id, session.project_id)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2 text-sm text-muted-foreground">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Database className="h-3 w-3" />
                              {locale === 'ko' ? '라인 수' : 'Lines'}
                            </span>
                            <span className="font-medium">
                              {session.processed_lines?.toLocaleString()}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {locale === 'ko' ? '업로드' : 'Uploaded'}
                            </span>
                            <span>
                              {format(new Date(session.uploaded_at), 'HH:mm')}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                })
                .flat()
              }
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}