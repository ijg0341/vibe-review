'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
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
  const [project, setProject] = useState<Project | null>(null)
  const [members, setMembers] = useState<ProjectMember[]>([])
  const [sessions, setSessions] = useState<ProjectSession[]>([])
  const [reviews, setReviews] = useState<ProjectReview[]>([])
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [showReviewModal, setShowReviewModal] = useState(false)
  const [selectedSessionsForReview, setSelectedSessionsForReview] = useState<string[]>([])
  
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const supabase = createClient()
  
  const projectId = params.projectId as string
  const activeTab = searchParams.get('tab') || 'overview'

  // 탭 변경 시 URL 업데이트
  const setActiveTab = (tab: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/projects/${projectId}?${params.toString()}`)
  }

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

  // 프로젝트 리뷰 조회
  const fetchReviews = async () => {
    try {
      // First fetch project reviews
      const { data: reviewsData, error: reviewsError } = await supabase
        .from('project_reviews')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false })

      if (reviewsError) {
        console.error('Error fetching reviews:', reviewsError)
        return
      }

      if (!reviewsData || reviewsData.length === 0) {
        setReviews([])
        return
      }

      // Then fetch profiles for each reviewer
      const reviewerIds = [...new Set(reviewsData.map(r => r.reviewer_id))]
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select('id, email, display_name, avatar_url')
        .in('id', reviewerIds)

      if (profilesError) {
        console.error('Error fetching reviewer profiles:', profilesError)
        setReviews(reviewsData.map(r => ({
          ...r,
          profiles: { email: '', display_name: '', avatar_url: '' }
        })))
        return
      }

      // Combine reviews with reviewer profiles
      const reviewsWithProfiles = reviewsData.map(review => ({
        ...review,
        profiles: profilesData.find(p => p.id === review.reviewer_id) || {
          email: '',
          display_name: '',
          avatar_url: ''
        }
      }))

      setReviews(reviewsWithProfiles)
    } catch (error) {
      console.error('Error in fetchReviews:', error)
    }
  }

  // 초기 데이터 로드
  useEffect(() => {
    const loadData = async () => {
      setLoading(true)
      await Promise.all([
        fetchProject(),
        fetchMembers(),
        fetchSessions(),
        fetchReviews()
      ])
      setLoading(false)
    }

    if (projectId) {
      loadData()
    }
  }, [projectId])

  // 프로젝트 경로를 Claude 히스토리 경로로 변환 (사용자별로 다른 경로)
  const getClaudeHistoryPath = () => {
    // Claude 히스토리는 사용자의 홈 디렉토리 기반
    // 프로젝트 경로 그대로 사용하되, 슬래시를 대시로 변환
    const cleanPath = project?.folder_path
      ?.replace(/^~/, '') // 홈 디렉토리 기호 제거
      ?.replace(/\/$/, '') // 끝 슬래시 제거
      ?.replace(/\//g, '-') // 모든 슬래시를 대시로 변환
    
    return `~/.claude/projects/${cleanPath}`
  }

  // CLI 명령어 생성
  const getCLICommand = () => {
    if (!project) return ''
    const claudePath = getClaudeHistoryPath()
    return `vibe-upload ${claudePath} --project-id ${project.id}`
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
              <TabsTrigger value="reviews">
                <MessageSquare className="mr-2 h-4 w-4" />
                {locale === 'ko' ? '리뷰' : 'Reviews'} ({reviews.length})
              </TabsTrigger>
              <TabsTrigger value="members">
                <Users className="mr-2 h-4 w-4" />
                {locale === 'ko' ? '멤버' : 'Members'} ({members.length})
              </TabsTrigger>
            </TabsList>

            {/* 개요 탭 */}
            <TabsContent value="overview" className="space-y-6">
              <div className="grid gap-4 md:grid-cols-4">
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
                      {locale === 'ko' ? '총 리뷰' : 'Total Reviews'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{reviews.length}</div>
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
                                    {getUserInitials(session.profiles?.email || '', session.profiles?.display_name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-sm font-medium">
                                  {session.profiles?.display_name || session.profiles?.email}
                                </span>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {session.session_name || session.file_name || `Session #${session.session_count}`}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(session.uploaded_at)}
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
                                          i < review.rating
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
                <Button
                  onClick={() => {
                    // 오늘 대화한 세션들로 리뷰 작성 모달 열기
                    const today = new Date().toISOString().split('T')[0]
                    const todaySessions = sessions.filter(s => {
                      const sessionDate = s.session_end_date || s.session_start_date || s.uploaded_at.split('T')[0]
                      return sessionDate === today
                    })
                    if (todaySessions.length > 0) {
                      setSelectedSessionsForReview(todaySessions.map(s => s.id))
                      setShowReviewModal(true)
                    } else {
                      alert(locale === 'ko' 
                        ? '오늘 작업한 세션이 없습니다.' 
                        : 'No sessions worked on today.')
                    }
                  }}
                >
                  <PenSquare className="mr-2 h-4 w-4" />
                  {locale === 'ko' ? '오늘 작업 리뷰' : 'Review Today\'s Work'}
                </Button>
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
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {(() => {
                    // 세션을 실제 대화 날짜별로 그룹화
                    const sessionsByDate = filteredSessions.reduce((acc, session) => {
                      // 실제 세션 날짜 사용 (session_end_date 또는 session_start_date가 있는 경우만)
                      const date = session.session_end_date || session.session_start_date
                      const groupKey = date || 'no-date' // 날짜가 없으면 'no-date' 그룹으로
                      
                      if (!acc[groupKey]) {
                        acc[groupKey] = []
                      }
                      acc[groupKey].push(session)
                      return acc
                    }, {} as Record<string, typeof filteredSessions>)

                    // 날짜 내림차순 정렬 (날짜없음은 맨 뒤로)
                    const sortedDates = Object.keys(sessionsByDate).sort((a, b) => {
                      if (a === 'no-date') return 1
                      if (b === 'no-date') return -1
                      return b.localeCompare(a)
                    })

                    return sortedDates.map(date => {
                      const dateSessions = sessionsByDate[date]
                      
                      // 유저별 세션 수 계산
                      const userStats = dateSessions.reduce((acc, session) => {
                        const userId = session.user_id
                        if (!acc[userId]) {
                          acc[userId] = {
                            user: session.profiles,
                            count: 0
                          }
                        }
                        acc[userId].count++
                        return acc
                      }, {} as Record<string, { user: any; count: number }>)
                      
                      const uniqueUsers = Object.keys(userStats).length
                      const isNoDate = date === 'no-date'
                      const isToday = !isNoDate && date === new Date().toISOString().split('T')[0]
                      const isYesterday = !isNoDate && date === new Date(Date.now() - 86400000).toISOString().split('T')[0]

                      return (
                        <Card 
                          key={date}
                          className={`hover:shadow-lg transition-all cursor-pointer group ${isNoDate ? 'opacity-75' : ''}`}
                          onClick={() => !isNoDate && router.push(`/projects/${projectId}/sessions?date=${date}`)}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <Calendar className={`h-5 w-5 ${isNoDate ? 'text-muted-foreground' : 'text-primary'}`} />
                                {isNoDate && (
                                  <Badge variant="outline" className="text-xs">
                                    {locale === 'ko' ? '날짜없음' : 'No Date'}
                                  </Badge>
                                )}
                                {isToday && (
                                  <Badge variant="default" className="text-xs">
                                    {locale === 'ko' ? '오늘' : 'Today'}
                                  </Badge>
                                )}
                                {isYesterday && (
                                  <Badge variant="secondary" className="text-xs">
                                    {locale === 'ko' ? '어제' : 'Yesterday'}
                                  </Badge>
                                )}
                              </div>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  setSelectedSessionsForReview(dateSessions.map(s => s.id))
                                  setShowReviewModal(true)
                                }}
                              >
                                <PenSquare className="h-4 w-4" />
                              </Button>
                            </div>
                            <CardTitle className="text-lg">
                              {isNoDate 
                                ? (locale === 'ko' ? '날짜 정보 없음' : 'Date Unknown')
                                : new Date(date + 'T00:00:00').toLocaleDateString(
                                    locale === 'ko' ? 'ko-KR' : 'en-US',
                                    { weekday: 'long', month: 'long', day: 'numeric' }
                                  )
                              }
                            </CardTitle>
                            <CardDescription className="mt-1">
                              {isNoDate 
                                ? (locale === 'ko' ? '세션 날짜를 확인할 수 없습니다' : 'Session date unavailable')
                                : new Date(date + 'T00:00:00').toLocaleDateString(
                                    locale === 'ko' ? 'ko-KR' : 'en-US',
                                    { year: 'numeric' }
                                  )
                              }
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {dateSessions.length} {locale === 'ko' ? '세션' : 'sessions'}
                                  </span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Users className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-sm font-medium">
                                    {uniqueUsers} {locale === 'ko' ? '명' : uniqueUsers === 1 ? 'user' : 'users'}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="space-y-2">
                                {Object.entries(userStats).slice(0, 3).map(([userId, stats]) => (
                                  <div key={userId} className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                      <Avatar className="h-6 w-6">
                                        <AvatarFallback className="text-xs">
                                          {getUserInitials(
                                            stats.user?.email || '',
                                            stats.user?.display_name
                                          )}
                                        </AvatarFallback>
                                      </Avatar>
                                      <span className="text-xs text-muted-foreground">
                                        {stats.user?.display_name || stats.user?.email}
                                      </span>
                                    </div>
                                    <Badge variant="outline" className="text-xs">
                                      {stats.count}
                                    </Badge>
                                  </div>
                                ))}
                                {Object.keys(userStats).length > 3 && (
                                  <div className="text-xs text-muted-foreground text-center">
                                    {locale === 'ko' 
                                      ? `+ ${Object.keys(userStats).length - 3}명 더...` 
                                      : `+ ${Object.keys(userStats).length - 3} more...`}
                                  </div>
                                )}
                              </div>
                              
                              <div className="pt-2 flex items-center justify-center text-xs text-muted-foreground group-hover:text-primary transition-colors">
                                {!isNoDate && (
                                  <>
                                    <span>{locale === 'ko' ? '클릭하여 세션 보기' : 'Click to view sessions'}</span>
                                    <ChevronRight className="h-3 w-3 ml-1" />
                                  </>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })
                  })()}
                </div>
              )}
            </TabsContent>

            {/* 리뷰 탭 */}
            <TabsContent value="reviews" className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={locale === 'ko' ? '리뷰 검색...' : 'Search reviews...'}
                    className="pl-10"
                  />
                </div>
                <Button
                  onClick={() => {
                    // 오늘 세션들을 선택하여 리뷰 작성 모달 열기
                    const today = new Date().toISOString().split('T')[0]
                    const todaySessions = sessions.filter(s => 
                      s.uploaded_at.split('T')[0] === today && 
                      s.user_id === user?.id
                    )
                    if (todaySessions.length > 0) {
                      setSelectedSessionsForReview(todaySessions.map(s => s.id))
                      setShowReviewModal(true)
                    } else {
                      alert(locale === 'ko' 
                        ? '오늘 업로드한 세션이 없습니다.' 
                        : 'No sessions uploaded today.')
                    }
                  }}
                >
                  <PenSquare className="mr-2 h-4 w-4" />
                  {locale === 'ko' ? '리뷰 작성' : 'Write Review'}
                </Button>
              </div>

              {reviews.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center">
                      <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="text-lg font-medium mb-2">
                        {locale === 'ko' ? '아직 리뷰가 없습니다' : 'No reviews yet'}
                      </h3>
                      <p className="text-muted-foreground mb-4">
                        {locale === 'ko' 
                          ? '하루 동안의 작업을 정리하고 리뷰를 작성해보세요.'
                          : 'Summarize your daily work and write a review.'}
                      </p>
                      {sessions.filter(s => s.user_id === user?.id).length > 0 && (
                        <Button
                          variant="outline"
                          onClick={() => {
                            const userSessions = sessions
                              .filter(s => s.user_id === user?.id)
                              .sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime())
                            
                            if (userSessions.length > 0) {
                              const latestSessionDate = userSessions[0].uploaded_at.split('T')[0]
                              const sessionsForDate = userSessions.filter(s => 
                                s.uploaded_at.split('T')[0] === latestSessionDate
                              )
                              setSelectedSessionsForReview(sessionsForDate.map(s => s.id))
                              setShowReviewModal(true)
                            }
                          }}
                        >
                          <PenSquare className="mr-2 h-4 w-4" />
                          {locale === 'ko' ? '첫 리뷰 작성하기' : 'Write Your First Review'}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid gap-4">
                  {reviews.map((review) => (
                    <Card key={review.id}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={review.profiles?.avatar_url} />
                              <AvatarFallback>
                                {getUserInitials(
                                  review.profiles?.email || '',
                                  review.profiles?.display_name
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {review.profiles?.display_name || review.profiles?.email}
                              </p>
                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                <span>{formatDate(review.created_at)}</span>
                                <span>•</span>
                                <span>
                                  {locale === 'ko' 
                                    ? `${review.session_ids.length}개 세션 리뷰` 
                                    : `Review of ${review.session_ids.length} sessions`}
                                </span>
                              </div>
                            </div>
                          </div>
                          {review.rating && (
                            <div className="flex items-center">
                              {[...Array(5)].map((_, i) => (
                                <Star
                                  key={i}
                                  className={`h-4 w-4 ${
                                    i < review.rating
                                      ? 'fill-yellow-400 text-yellow-400'
                                      : 'text-gray-300'
                                  }`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                        {review.review_title && (
                          <h4 className="font-semibold mb-2">{review.review_title}</h4>
                        )}
                        <p className="text-sm whitespace-pre-wrap">{review.review_content}</p>
                        <div className="mt-4 pt-4 border-t">
                          <p className="text-xs text-muted-foreground">
                            {locale === 'ko' ? '리뷰 날짜' : 'Review Date'}: {
                              new Date(review.review_date).toLocaleDateString(
                                locale === 'ko' ? 'ko-KR' : 'en-US'
                              )
                            }
                          </p>
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

        {/* 리뷰 요청 모달 */}
        <ReviewRequestModal
          open={showReviewModal}
          onOpenChange={setShowReviewModal}
          preSelectedSessions={selectedSessionsForReview}
          projectId={projectId}
        />
      </DashboardLayout>
    </ProtectedRoute>
  )
}