'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { 
  Folder,
  Users,
  FileText,
  Clock,
  Terminal,
  Copy,
  Plus,
  UserPlus,
  Settings,
  ChevronRight,
  Calendar,
  Eye,
  Loader2,
  AlertCircle,
  Search
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface Project {
  id: string
  name: string
  folder_path: string
  description?: string
  owner_id: string
  created_at: string
}

interface ProjectMember {
  id: string
  user_id: string
  role: string
  joined_at: string
  profiles: {
    email: string
    display_name?: string
    avatar_url?: string
  }
}

interface ProjectSession {
  id: string
  user_id: string
  session_name?: string
  session_count: number
  uploaded_at: string
  profiles: {
    email: string
    display_name?: string
  }
}

export default function ProjectDetailPage() {
  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [sessions, setSessions] = useState<ProjectSession[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const supabase = createClient()
  
  const projectId = params.projectId as string

  // 프로젝트 정보 조회
  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single()

      if (error) {
        console.error('Error fetching project:', error)
        return
      }

      setProject(data)
    } catch (error) {
      console.error('Error in fetchProject:', error)
    }
  }

  // 프로젝트 멤버 조회
  const fetchMembers = async () => {
    try {
      // First fetch project members
      const { data: membersData, error: membersError } = await supabase
        .from('project_members')
        .select('*')
        .eq('project_id', projectId)
        .order('joined_at', { ascending: true })

      if (membersError) {
        console.error('Error fetching members:', membersError)
        return
      }

      if (!membersData || membersData.length === 0) {
        setMembers([])
        return
      }

      // Then fetch profiles for each member
      const userIds = membersData.map(m => m.user_id)
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url')
        .in('id', userIds)

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        // Set members without profile data
        setMembers(membersData.map(m => ({
          ...m,
          profiles: { email: '', display_name: '', avatar_url: '' }
        })))
        return
      }

      // Combine members with their profiles
      const membersWithProfiles = membersData.map(member => ({
        ...member,
        profiles: profilesData.find(p => p.id === member.user_id) || {
          email: '',
          display_name: '',
          avatar_url: ''
        }
      }))

      setMembers(membersWithProfiles)
    } catch (error) {
      console.error('Error in fetchMembers:', error)
    }
  }

  // 프로젝트 세션 조회
  const fetchSessions = async () => {
    try {
      // First fetch project sessions
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('project_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError)
        return
      }

      if (!sessionsData || sessionsData.length === 0) {
        setSessions([])
        return
      }

      // Then fetch profiles for each session
      const userIds = [...new Set(sessionsData.map(s => s.user_id))] // Get unique user IDs
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name')
        .in('id', userIds)

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        // Set sessions without profile data
        setSessions(sessionsData.map(s => ({
          ...s,
          profiles: { email: '', display_name: '' }
        })))
        return
      }

      // Combine sessions with their profiles
      const sessionsWithProfiles = sessionsData.map(session => ({
        ...session,
        profiles: profilesData.find(p => p.id === session.user_id) || {
          email: '',
          display_name: ''
        }
      }))

      setSessions(sessionsWithProfiles)
    } catch (error) {
      console.error('Error in fetchSessions:', error)
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchProject(),
        fetchMembers(),
        fetchSessions()
      ])
      setLoading(false)
    }

    if (projectId) {
      loadData()
    }
  }, [projectId])

  // 프로젝트 경로를 Claude 히스토리 경로로 변환
  const convertToClaudePath = (projectPath: string) => {
    const cleanPath = projectPath
      .replace(/\/$/, '') // 끝 슬래시 제거
      .replace(/\//g, '-') // 모든 슬래시를 대시로 변환 (맨 앞 슬래시도 포함)
    return `~/.claude/projects/${cleanPath}`
  }

  // CLI 명령어 복사
  const copyCLICommand = () => {
    if (!project) return
    
    const claudePath = convertToClaudePath(project.folder_path)
    const command = `vibe-upload ${claudePath} --project-id=${project.id}`
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return formatDistanceToNow(date, {
      addSuffix: true,
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

  // 필터링된 세션
  const filteredSessions = sessions.filter(session => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      session.session_name?.toLowerCase().includes(query) ||
      session.profiles?.email.toLowerCase().includes(query) ||
      session.profiles?.display_name?.toLowerCase().includes(query)
    )
  })

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                {locale === 'ko' ? '프로젝트를 불러오는 중...' : 'Loading project...'}
              </p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!project) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium">
                {locale === 'ko' ? '프로젝트를 찾을 수 없습니다' : 'Project not found'}
              </h3>
              <Button className="mt-4" onClick={() => router.push('/projects')}>
                {locale === 'ko' ? '프로젝트 목록으로' : 'Back to Projects'}
              </Button>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  const isOwner = project.owner_id === user?.id

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* 헤더 */}
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-primary/10">
                  <Folder className="h-8 w-8 text-primary" />
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-3xl font-bold">{project.name}</h1>
                  {isOwner && (
                    <Badge variant="secondary">{locale === 'ko' ? '소유자' : 'Owner'}</Badge>
                  )}
                </div>
                {project.description && (
                  <p className="text-muted-foreground mt-1">{project.description}</p>
                )}
                <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Terminal className="h-3 w-3" />
                    <code className="font-mono">{project.folder_path}</code>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {locale === 'ko' ? '생성일' : 'Created'}: {formatDate(project.created_at)}
                  </span>
                </div>
              </div>
            </div>
            {isOwner && (
              <Button variant="outline" size="sm">
                <Settings className="mr-2 h-4 w-4" />
                {locale === 'ko' ? '설정' : 'Settings'}
              </Button>
            )}
          </div>

          {/* CLI 명령어 카드 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                {locale === 'ko' ? 'CLI 업로드 명령어' : 'CLI Upload Command'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative">
                <pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
                  <code>vibe-upload {convertToClaudePath(project.folder_path)} --project-id={project.id}</code>
                </pre>
                <Button
                  size="sm"
                  variant="ghost"
                  className="absolute top-2 right-2"
                  onClick={copyCLICommand}
                >
                  {copied ? (
                    <span className="text-green-500 text-xs">{locale === 'ko' ? '복사됨!' : 'Copied!'}</span>
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* 탭 콘텐츠 */}
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList>
              <TabsTrigger value="overview">
                {locale === 'ko' ? '개요' : 'Overview'}
              </TabsTrigger>
              <TabsTrigger value="sessions">
                <FileText className="mr-2 h-4 w-4" />
                {locale === 'ko' ? '세션' : 'Sessions'} ({sessions.length})
              </TabsTrigger>
              <TabsTrigger value="members">
                <Users className="mr-2 h-4 w-4" />
                {locale === 'ko' ? '멤버' : 'Members'} ({members.length})
              </TabsTrigger>
            </TabsList>

            {/* 개요 탭 */}
            <TabsContent value="overview" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {locale === 'ko' ? '총 세션' : 'Total Sessions'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{sessions.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {locale === 'ko' ? '팀 멤버' : 'Team Members'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{members.length}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {locale === 'ko' ? '최근 활동' : 'Recent Activity'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm">
                      {sessions.length > 0 
                        ? formatDate(sessions[0].uploaded_at)
                        : (locale === 'ko' ? '활동 없음' : 'No activity')
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>

              {sessions.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    {locale === 'ko' 
                      ? '아직 업로드된 세션이 없습니다. 위의 CLI 명령어를 사용하여 첫 세션을 업로드하세요.' 
                      : 'No sessions uploaded yet. Use the CLI command above to upload your first session.'
                    }
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* 세션 탭 */}
            <TabsContent value="sessions" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={locale === 'ko' ? '세션 검색...' : 'Search sessions...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {filteredSessions.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {searchQuery
                          ? (locale === 'ko' ? '검색 결과가 없습니다' : 'No search results')
                          : (locale === 'ko' ? '업로드된 세션이 없습니다' : 'No sessions uploaded')
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {filteredSessions.map((session) => (
                    <Card 
                      key={session.id} 
                      className="hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => router.push(`/projects/${projectId}/sessions/${session.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarFallback>
                                {getUserInitials(
                                  session.profiles?.email || '',
                                  session.profiles?.display_name
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {session.session_name || `Session ${session.id.slice(0, 8)}`}
                              </p>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span>{session.profiles?.display_name || session.profiles?.email}</span>
                                <span>{session.session_count} {locale === 'ko' ? '항목' : 'items'}</span>
                                <span>{formatDate(session.uploaded_at)}</span>
                              </div>
                            </div>
                          </div>
                          <Button variant="ghost" size="sm">
                            <Eye className="mr-2 h-4 w-4" />
                            {locale === 'ko' ? '보기' : 'View'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* 멤버 탭 */}
            <TabsContent value="members" className="space-y-4">
              {isOwner && (
                <div className="flex justify-end">
                  <Button size="sm">
                    <UserPlus className="mr-2 h-4 w-4" />
                    {locale === 'ko' ? '멤버 초대' : 'Invite Member'}
                  </Button>
                </div>
              )}

              <div className="grid gap-4">
                {members.map((member) => (
                  <Card key={member.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Avatar>
                            <AvatarImage src={member.profiles?.avatar_url} />
                            <AvatarFallback>
                              {getUserInitials(
                                member.profiles?.email || '',
                                member.profiles?.display_name
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">
                              {member.profiles?.display_name || member.profiles?.email}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {member.profiles?.email}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant={member.role === 'owner' ? 'default' : 'secondary'}>
                            {member.role === 'owner' 
                              ? (locale === 'ko' ? '소유자' : 'Owner')
                              : (locale === 'ko' ? '멤버' : 'Member')
                            }
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {formatDate(member.joined_at)}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}