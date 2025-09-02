'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useProject } from '@/hooks/use-api'
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
  Search,
  Star,
  MessageSquare,
  PenSquare
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ReviewRequestModal } from '@/components/projects/review-request-modal'

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
  session_start_date?: string
  session_end_date?: string
  file_name?: string
  profiles: {
    email: string
    display_name?: string
  }
}

interface ProjectReview {
  id: string
  project_id: string
  reviewer_id: string
  session_ids: string[]
  review_title?: string
  review_content: string
  rating?: number
  review_date: string
  created_at: string
  updated_at: string
  profiles?: {
    email: string
    display_name?: string
    avatar_url?: string
  }
}

export default function ProjectDetailPage() {
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  
  const projectId = params.projectId as string
  const activeTab = searchParams.get('tab') || 'overview'
  
  const { 
    project, 
    sessions, 
    projectLoading, 
    sessionsLoading, 
    fetchProject, 
    fetchSessions 
  } = useProject(projectId)

  // 탭 변경 시 URL 업데이트
  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/projects/${projectId}?${params.toString()}`)
  }

  // 초기 데이터 로드
  useEffect(() => {
    if (projectId) {
      fetchProject()
      fetchSessions()
    }
  }, [projectId, fetchProject, fetchSessions])

  // CLI 명령어 생성 (API 서버 스키마 기반)
  const getCLICommand = () => {
    if (!project) return ''
    return `vibe-upload --project-name "${project.name}" --project-id ${project.id}`
  }

  // CLI 명령어 복사
  const copyCLICommand = () => {
    const command = getCLICommand()
    if (command) {
      navigator.clipboard.writeText(command)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
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

  // 필터링된 세션 (API 서버 스키마 기반)
  const filteredSessions = sessions.filter(session => {
    if (!searchQuery) return true
    const query = searchQuery.toLowerCase()
    return (
      session.name?.toLowerCase().includes(query) ||
      session.tool_name?.toLowerCase().includes(query)
    )
  })

  const loading = projectLoading || sessionsLoading

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

  const isOwner = true // API 서버에서는 모든 프로젝트가 현재 사용자 소유

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
                    <code className="font-mono">{project.tool_name}</code>
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {locale === 'ko' ? '파일 수' : 'Files'}: {project.file_count || 0}
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
                  <code>{getCLICommand()}</code>
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
              <Alert className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  {locale === 'ko' 
                    ? '이 명령어는 현재 프로젝트 경로를 기반으로 생성됩니다. Claude 히스토리 경로는 사용자의 실제 프로젝트 위치에 따라 자동으로 결정됩니다.'
                    : 'This command is generated based on your project path. The Claude history path is automatically determined based on your actual project location.'}
                </AlertDescription>
              </Alert>
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
            </TabsList>

            {/* 개요 탭 */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {locale === 'ko' ? '총 파일' : 'Total Files'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{project?.file_count || 0}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {locale === 'ko' ? '총 크기' : 'Total Size'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {((project?.total_size || 0) / 1024 / 1024).toFixed(1)}MB
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">
                      {locale === 'ko' ? 'AI 도구' : 'AI Tool'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-sm font-medium">{project?.tool_name || 'Unknown'}</div>
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
                        ? formatDate(sessions[0].created_at || sessions[0].session_date)
                        : (locale === 'ko' ? '활동 없음' : 'No activity')
                      }
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {/* 최근 세션 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        {locale === 'ko' ? '최근 세션' : 'Recent Sessions'}
                      </span>
                      {sessions.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab('sessions')}
                        >
                          {locale === 'ko' ? '모두 보기' : 'View All'}
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {sessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        {locale === 'ko' ? '아직 업로드된 세션이 없습니다.' : 'No sessions uploaded yet.'}
                      </p>
                    ) : (
                      <div className="space-y-3">
                        {sessions.slice(0, 3).map(session => (
                          <div key={session.id} className="flex items-start justify-between p-3 rounded-lg border">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {session.tool_name?.slice(0, 2).toUpperCase() || 'AI'}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">
                                  {session.name || 'Unnamed Session'}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {session.tool_name} • {((session.file_size || 0) / 1024).toFixed(1)}KB
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(session.created_at || session.session_date)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* 최근 리뷰 */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center justify-between">
                      <span className="flex items-center gap-2">
                        <MessageSquare className="h-4 w-4" />
                        {locale === 'ko' ? '최근 리뷰' : 'Recent Reviews'}
                      </span>
                      {reviews.length > 3 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setActiveTab('reviews')}
                        >
                          {locale === 'ko' ? '모두 보기' : 'View All'}
                        </Button>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {reviews.length === 0 ? (
                      <div className="space-y-3">
                        <p className="text-sm text-muted-foreground">
                          {locale === 'ko' ? '아직 리뷰가 없습니다.' : 'No reviews yet.'}
                        </p>
                        {sessions.length > 0 && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => {
                              // 오늘 세션들을 선택하여 리뷰 요청 모달 열기
                              const today = new Date().toISOString().split('T')[0]
                              const todaySessions = sessions.filter(s => 
                                s.uploaded_at.split('T')[0] === today
                              )
                              if (todaySessions.length > 0) {
                                setSelectedSessionsForReview(todaySessions.map(s => s.id))
                                setShowReviewModal(true)
                              }
                            }}
                          >
                            <PenSquare className="mr-2 h-4 w-4" />
                            {locale === 'ko' ? '리뷰 요청하기' : 'Request Review'}
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {reviews.slice(0, 3).map(review => (
                          <div key={review.id} className="flex items-start justify-between p-3 rounded-lg border">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Avatar className="h-6 w-6">
                                  <AvatarFallback className="text-xs">
                                    {getUserInitials(review.profiles?.email || '', review.profiles?.display_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">
                                  {review.profiles?.display_name || review.profiles?.email}
                                </span>
                                {review.rating && (
                                  <div className="flex items-center">
                                    {[...Array(5)].map((_, i) => (
                                      <Star
                                        key={i}
                                        className={`h-3 w-3 ${
                                          i < (review.rating || 0)
                                            ? 'fill-yellow-400 text-yellow-400'
                                            : 'text-gray-300'
                                        }`}
                                      />
                                    ))}
                                  </div>
                                )}
                              </div>
                              <p className="text-xs text-muted-foreground line-clamp-2">
                                {review.review_title || review.review_content}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(review.created_at)}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
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
                      className="hover:shadow-lg transition-all cursor-pointer"
                      onClick={() => router.push(`/projects/${projectId}/sessions/${session.id}`)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="space-y-2">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">
                                  {session.tool_name?.slice(0, 2).toUpperCase() || 'AI'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <h4 className="font-medium">
                                  {session.name || 'Unnamed Session'}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  {session.tool_name} • {((session.file_size || 0) / 1024).toFixed(1)}KB
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <Badge variant="outline">
                                {session.upload_status || 'uploaded'}
                              </Badge>
                              <span>
                                {formatDate(session.created_at || session.session_date)}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}