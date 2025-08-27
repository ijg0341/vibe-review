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
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  ArrowLeft,
  Folder,
  FileText,
  Calendar,
  Clock,
  User,
  Mail,
  Loader2,
  FolderOpen,
  Eye,
  Database,
  Activity,
  CalendarDays,
  FolderTree,
  ChevronRight,
  ChevronDown
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'

interface TeamMember {
  id: string
  email: string
  display_name?: string
  avatar_url?: string
  created_at: string
}

interface Project {
  id: string
  name: string
  description?: string
  folder_path: string
  created_at: string
  session_count?: number
  last_activity?: string
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

type ViewMode = 'date' | 'project'

interface GroupedSessions {
  [key: string]: {
    sessions: ProjectSession[]
    count: number
    totalLines: number
  }
}

export default function TeamMemberDetailPage() {
  const [member, setMember] = useState<TeamMember | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [sessions, setSessions] = useState<ProjectSession[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<ViewMode>('date')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const supabase = createClient()
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string

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

  // 멤버의 프로젝트 가져오기
  const fetchMemberProjects = async () => {
    if (!userId) return

    try {
      // 프로젝트 가져오기
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .eq('owner_id', userId)
        .order('created_at', { ascending: false })

      if (projectsError) {
        console.error('Error fetching projects:', projectsError)
        return
      }

      // 각 프로젝트의 세션 수와 최근 활동 가져오기
      const projectsWithStats = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { data: sessions, error } = await supabase
            .from('project_sessions')
            .select('uploaded_at')
            .eq('project_id', project.id)
            .order('uploaded_at', { ascending: false })

          return {
            ...project,
            session_count: sessions?.length || 0,
            last_activity: sessions?.[0]?.uploaded_at || project.created_at
          }
        })
      )

      setProjects(projectsWithStats)
    } catch (error) {
      console.error('Error in fetchMemberProjects:', error)
    }
  }

  // 멤버의 세션 가져오기
  const fetchMemberSessions = async () => {
    if (!userId) return

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

      setSessions(sessionsData || [])
      
      // 기본적으로 처음 3개 그룹 확장
      const grouped = groupSessions(sessionsData || [], viewMode)
      const firstGroups = Object.keys(grouped).slice(0, 3)
      setExpandedGroups(new Set(firstGroups))
    } catch (error) {
      console.error('Error in fetchMemberSessions:', error)
    } finally {
      setLoading(false)
    }
  }

  // 세션 상세 페이지로 이동
  const handleViewSession = (sessionId: string, projectId: string) => {
    router.push(`/team/${userId}/${projectId}`)
  }
  
  // 날짜 상세 페이지로 이동
  const handleViewDateDetail = (date: string) => {
    router.push(`/team/${userId}/date/${date}`)
  }

  useEffect(() => {
    fetchMemberInfo()
    fetchMemberProjects()
  }, [userId])

  useEffect(() => {
    fetchMemberSessions()
  }, [userId])
  
  // 그룹 토글
  const toggleGroup = (groupKey: string) => {
    const newExpanded = new Set(expandedGroups)
    if (newExpanded.has(groupKey)) {
      newExpanded.delete(groupKey)
    } else {
      newExpanded.add(groupKey)
    }
    setExpandedGroups(newExpanded)
  }

  // 세션 그룹화
  const groupSessions = (sessions: ProjectSession[], mode: ViewMode): GroupedSessions => {
    const grouped: GroupedSessions = {}
    
    sessions.forEach(session => {
      let key: string
      
      if (mode === 'date') {
        // 실제 작업 날짜별 그룹화 (session_end_date > session_start_date 우선)
        const workDate = session.session_end_date || session.session_start_date
        
        if (!workDate || workDate === 'null' || workDate === '') {
          // 날짜 정보가 없는 경우
          key = 'no-date'
        } else {
          const date = new Date(workDate)
          key = format(date, 'yyyy-MM-dd')
        }
      } else {
        // 프로젝트별 그룹화
        key = session.project?.id || 'no-project'
      }
      
      if (!grouped[key]) {
        grouped[key] = {
          sessions: [],
          count: 0,
          totalLines: 0
        }
      }
      
      grouped[key].sessions.push(session)
      grouped[key].count++
      grouped[key].totalLines += session.processed_lines || 0
    })
    
    return grouped
  }
  
  const groupedSessions = groupSessions(sessions, viewMode)

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: locale === 'ko' ? ko : enUS
    })
  }

  const formatFullDate = (dateString: string) => {
    const date = new Date(dateString)
    return format(date, 'PPP', {
      locale: locale === 'ko' ? ko : enUS
    })
  }

  // 사용자 이니셜 생성
  const getUserInitials = (email: string, name?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  // 전체 통계
  const totalSessions = sessions.length
  const totalLines = sessions.reduce((sum, s) => sum + (s.processed_lines || 0), 0)

  if (!member) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                {locale === 'ko' ? '멤버 정보를 불러오는 중...' : 'Loading member info...'}
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
        <div className="space-y-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/team')}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {locale === 'ko' ? '팀 목록으로' : 'Back to Team'}
              </Button>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback className="text-xl">
                    {getUserInitials(member.email, member.display_name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold">
                    {member.display_name || member.email.split('@')[0]}
                  </h1>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    {member.email}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>{locale === 'ko' ? '프로젝트' : 'Projects'}</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  {projects.length}
                </CardTitle>
              </CardHeader>
            </Card>
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
                <CardDescription>{locale === 'ko' ? '처리된 라인' : 'Processed Lines'}</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Database className="h-5 w-5" />
                  {totalLines.toLocaleString()}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription>{locale === 'ko' ? '가입일' : 'Member Since'}</CardDescription>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {formatFullDate(member.created_at)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* 뷰 모드 토글 */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'date' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('date')}
            >
              <CalendarDays className="h-4 w-4 mr-2" />
              {locale === 'ko' ? '날짜별' : 'By Date'}
            </Button>
            <Button
              variant={viewMode === 'project' ? "default" : "outline"}
              size="sm"
              onClick={() => setViewMode('project')}
            >
              <FolderTree className="h-4 w-4 mr-2" />
              {locale === 'ko' ? '프로젝트별' : 'By Project'}
            </Button>
          </div>

          {/* 세션 목록 */}
          {loading ? (
            <Card>
              <CardContent className="py-16">
                <div className="flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              </CardContent>
            </Card>
          ) : sessions.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {locale === 'ko' ? '세션이 없습니다' : 'No sessions found'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {Object.entries(groupedSessions)
                .sort((a, b) => {
                  // 날짜별 모드일 때는 최신 날짜 먼저, no-date는 마지막
                  if (viewMode === 'date') {
                    if (a[0] === 'no-date') return 1
                    if (b[0] === 'no-date') return -1
                    return b[0].localeCompare(a[0])
                  }
                  // 프로젝트별 모드일 때는 세션 수가 많은 순
                  return b[1].count - a[1].count
                })
                .map(([groupKey, group]) => {
                  const isExpanded = expandedGroups.has(groupKey)
                  let groupTitle = groupKey
                  let groupIcon = <Folder className="h-5 w-5" />
                  
                  if (viewMode === 'date') {
                    if (groupKey === 'no-date') {
                      groupTitle = locale === 'ko' ? '날짜 정보 없음' : 'No Date Information'
                      groupIcon = <CalendarDays className="h-5 w-5 text-muted-foreground" />
                    } else {
                      const date = new Date(groupKey)
                      // 한국어/영어에 맞는 날짜 형식
                      groupTitle = locale === 'ko' 
                        ? format(date, 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })
                        : format(date, 'EEEE, MMM dd, yyyy', { locale: enUS })
                      groupIcon = <CalendarDays className="h-5 w-5" />
                    }
                  } else {
                    const project = projects.find(p => p.id === groupKey)
                    groupTitle = project?.name || '프로젝트 없음'
                    groupIcon = <FolderTree className="h-5 w-5" />
                  }
                  
                  return (
                    <Card key={groupKey}>
                      <CardHeader 
                        className="cursor-pointer"
                        onClick={() => {
                          if (viewMode === 'date') {
                            // 날짜별 모드에서는 날짜 상세 페이지로 이동 (no-date 제외)
                            if (groupKey !== 'no-date') {
                              handleViewDateDetail(groupKey)
                            } else {
                              toggleGroup(groupKey)  // no-date는 토글 동작
                            }
                          } else {
                            // 프로젝트별 모드에서는 토글
                            toggleGroup(groupKey)
                          }
                        }}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            {(viewMode === 'project' || groupKey === 'no-date') ? 
                              (isExpanded ? <ChevronDown className="h-5 w-5" /> : <ChevronRight className="h-5 w-5" />) :
                              <ChevronRight className="h-5 w-5" />
                            }
                            {groupIcon}
                            <div>
                              <CardTitle className="text-lg">{groupTitle}</CardTitle>
                              <CardDescription>
                                {group.count} {locale === 'ko' ? '개 세션' : 'sessions'} • 
                                {group.totalLines.toLocaleString()} {locale === 'ko' ? '라인' : 'lines'}
                              </CardDescription>
                            </div>
                          </div>
                          {viewMode === 'date' && groupKey !== 'no-date' && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleViewDateDetail(groupKey)
                              }}
                            >
                              {locale === 'ko' ? '상세보기' : 'View Details'}
                              <ChevronRight className="ml-1 h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </CardHeader>
                      
                      {((viewMode === 'project' || groupKey === 'no-date') && isExpanded) && (
                        <CardContent>
                          <div className="space-y-2">
                            {group.sessions.map((session) => (
                              <div
                                key={session.id}
                                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 cursor-pointer transition-colors"
                                onClick={() => handleViewSession(session.id, session.project_id)}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <div className="flex-1">
                                    <p className="font-medium">{session.session_name || session.file_name}</p>
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
                                      {viewMode === 'date' && session.project && (
                                        <span className="flex items-center gap-1">
                                          <Folder className="h-3 w-3" />
                                          {session.project.name}
                                        </span>
                                      )}
                                      {viewMode === 'project' && (
                                        <span className="flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {format(new Date(session.session_end_date || session.session_start_date || session.uploaded_at), 
                                            locale === 'ko' ? 'MM/dd' : 'MMM dd'
                                          )}
                                        </span>
                                      )}
                                      <span className="flex items-center gap-1">
                                        <Clock className="h-3 w-3" />
                                        {locale === 'ko' ? '업로드: ' : 'Uploaded: '}
                                        {format(new Date(session.uploaded_at), 'HH:mm')}
                                      </span>
                                      <span className="flex items-center gap-1">
                                        <Database className="h-3 w-3" />
                                        {session.processed_lines?.toLocaleString()} {locale === 'ko' ? '라인' : 'lines'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewSession(session.id, session.project_id)
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        </CardContent>
                      )}
                    </Card>
                  )
              })}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}