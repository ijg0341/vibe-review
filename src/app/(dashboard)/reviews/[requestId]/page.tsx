'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { SessionViewerV2 } from '@/components/session-viewer/SessionViewerV2'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  MessageSquare,
  Clock,
  Calendar,
  User,
  FileText,
  Folder,
  Loader2,
  Send,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  Hash,
  MessageCircle,
  Star
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'

interface ReviewRequest {
  id: string
  requester_id: string
  title: string
  content: string
  session_ids: string[]
  reviewer_ids: string[]
  status: string
  created_at: string
  updated_at: string
  requester?: {
    id: string
    email: string
    display_name?: string
    avatar_url?: string
  }
  sessions?: Array<{
    id: string
    session_name?: string
    file_name?: string
    first_user_prompt?: string
    session_start_date?: string
    session_end_date?: string
    uploaded_at: string
    project?: {
      id: string
      name: string
    }
    profiles?: {
      email: string
      display_name?: string
    }
  }>
  reviews?: Array<{
    id: string
    reviewer_id: string
    content: string
    rating?: number
    created_at: string
    reviewer?: {
      id: string
      email: string
      display_name?: string
      avatar_url?: string
    }
  }>
}

interface SessionLine {
  id: string
  line_number: number
  message_type: string
  raw_text: string
  created_at: string
}

export default function ReviewDetailPage() {
  const params = useParams()
  const router = useRouter()
  const requestId = params.requestId as string

  const [request, setRequest] = useState<ReviewRequest | null>(null)
  const [selectedSession, setSelectedSession] = useState<string | null>(null)
  const [sessionLines, setSessionLines] = useState<SessionLine[]>([])
  const [loading, setLoading] = useState(true)
  const [sessionLoading, setSessionLoading] = useState(false)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [messageTypeFilter, setMessageTypeFilter] = useState<string[]>([]) // 빈 배열 = 모두 표시

  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const supabase = createClient()

  // 리뷰 요청 상세 정보 가져오기
  const fetchRequestDetail = async () => {
    if (!user || !requestId) return

    setLoading(true)
    try {
      // 리뷰 요청 정보
      const { data: requestData, error } = await supabase
        .from('review_requests')
        .select(`
          *,
          requester:profiles!review_requests_requester_id_fkey(id, email, display_name, avatar_url)
        `)
        .eq('id', requestId)
        .single()

      if (error) {
        console.error('Error fetching request:', error)
        router.push('/reviews')
        return
      }

      // 세션 정보 - session_ids 배열 정확히 파싱
      let sessionIds = requestData.session_ids || []
      
      // session_ids가 문자열인 경우 파싱
      if (typeof sessionIds === 'string') {
        try {
          sessionIds = JSON.parse(sessionIds)
        } catch (e) {
          console.error('Error parsing session_ids:', e)
          sessionIds = []
        }
      }

      console.log('Session IDs:', sessionIds)

      if (sessionIds.length > 0) {
        const { data: sessions, error: sessionError } = await supabase
          .from('project_sessions')
          .select(`
            id,
            session_name,
            file_name,
            session_start_date,
            session_end_date,
            uploaded_at,
            user_id,
            project:projects(id, name)
          `)
          .in('id', sessionIds)

        console.log('Fetched sessions:', sessions, 'Error:', sessionError)
        
        // 각 세션에 대한 프로필 정보 가져오기
        const sessionsWithProfiles = await Promise.all((sessions || []).map(async (session) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, display_name')
            .eq('id', session.user_id)
            .single()
          
          return {
            ...session,
            profiles: profile
          }
        }))
        
        // 첫 번째 사용자 프롬프트 가져오기
        const sessionsWithPrompts = await Promise.all(sessionsWithProfiles.map(async (session) => {
          const { data: sessionLines } = await supabase
            .from('session_lines')
            .select('raw_text, message_type')
            .eq('upload_id', session.id)
            .order('line_number', { ascending: true })
            .limit(50)

          const userMessage = sessionLines?.find(line => 
            line.message_type === 'user' || line.message_type === 'human'
          )

          let firstPrompt = ''
          if (userMessage) {
            try {
              const parsed = JSON.parse(userMessage.raw_text)
              if (parsed.message && parsed.message.content) {
                firstPrompt = parsed.message.content
              }
            } catch (e) {}
            
            if (typeof firstPrompt === 'string' && firstPrompt) {
              firstPrompt = firstPrompt.replace(/\n/g, ' ').trim().substring(0, 100)
              if (firstPrompt.length === 100) firstPrompt += '...'
            } else {
              firstPrompt = ''
            }
          }

          return {
            ...session,
            first_user_prompt: firstPrompt || session.file_name || session.session_name || 'Session'
          }
        }))

        // first_user_prompt가 있는 세션을 위로, 없는 세션을 아래로 정렬
        const sortedSessions = sessionsWithPrompts.sort((a, b) => {
          const aHasPrompt = a.first_user_prompt && a.first_user_prompt !== a.file_name && a.first_user_prompt !== a.session_name
          const bHasPrompt = b.first_user_prompt && b.first_user_prompt !== b.file_name && b.first_user_prompt !== b.session_name
          
          if (aHasPrompt && !bHasPrompt) return -1
          if (!aHasPrompt && bHasPrompt) return 1
          return 0
        })
        
        requestData.sessions = sortedSessions
        
        // 첫 번째 세션 자동 선택
        if (sortedSessions.length > 0) {
          setSelectedSession(sortedSessions[0].id)
        }
      }

      // 리뷰 가져오기
      const { data: reviews } = await supabase
        .from('review_responses')
        .select(`
          *,
          reviewer:profiles!review_responses_reviewer_id_fkey(id, email, display_name, avatar_url)
        `)
        .eq('request_id', requestId)
        .order('created_at', { ascending: false })

      requestData.reviews = reviews || []
      setRequest(requestData)
    } catch (error) {
      console.error('Error fetching request detail:', error)
    } finally {
      setLoading(false)
    }
  }

  // 세션 라인 가져오기
  const fetchSessionLines = async (sessionId: string) => {
    setSessionLoading(true)
    try {
      const { data, error } = await supabase
        .from('session_lines')
        .select('*')
        .eq('upload_id', sessionId)
        .order('line_number', { ascending: true })

      if (!error && data) {
        setSessionLines(data)
      }
    } catch (error) {
      console.error('Error fetching session lines:', error)
    } finally {
      setSessionLoading(false)
    }
  }

  useEffect(() => {
    fetchRequestDetail()
  }, [user, requestId])

  useEffect(() => {
    if (selectedSession) {
      fetchSessionLines(selectedSession)
    }
  }, [selectedSession])

  // 리뷰 제출 (여러 번 가능)
  const submitReview = async () => {
    if (!user || !request || !reviewContent.trim()) return

    setSubmittingReview(true)
    try {
      const { error } = await supabase
        .from('review_responses')
        .insert({
          request_id: requestId,
          reviewer_id: user.id,
          content: reviewContent,
          rating: reviewRating || null,
          created_at: new Date().toISOString()
        })

      if (error) {
        console.error('Error submitting review:', error)
        alert(locale === 'ko' ? '리뷰 제출 실패' : 'Failed to submit review')
        return
      }

      // 상태 업데이트
      await supabase
        .from('review_requests')
        .update({ 
          status: 'in_progress',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId)

      alert(locale === 'ko' ? '리뷰가 제출되었습니다' : 'Review submitted')
      setReviewContent('')
      setReviewRating(0)
      fetchRequestDetail() // 리뷰 목록 새로고침
    } catch (error) {
      console.error('Error in submitReview:', error)
    } finally {
      setSubmittingReview(false)
    }
  }

  const formatDate = (dateString: string) => {
    return formatDistanceToNow(new Date(dateString), {
      addSuffix: true,
      locale: locale === 'ko' ? ko : enUS
    })
  }

  const getUserInitials = (email: string, name?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  // 필터링된 세션 라인
  const filteredSessionLines = React.useMemo(() => {
    if (messageTypeFilter.length === 0) {
      return sessionLines
    }

    return sessionLines.filter(line => {
      const data = (line as any).content || JSON.parse((line as any).raw_text || '{}')
      let type = 'unknown'
      
      if (data.type === 'user') {
        const content = data.message?.content
        if (typeof content === 'string') {
          type = 'user_text'
        } else if (Array.isArray(content)) {
          type = 'tool_result'
        }
      } else if (data.type === 'assistant') {
        const content = data.message?.content
        if (typeof content === 'string') {
          type = 'assistant_text'
        } else if (Array.isArray(content)) {
          const hasToolUse = content.some(item => item.type === 'tool_use')
          const hasThinking = content.some(item => item.type === 'thinking')
          if (hasThinking) {
            type = 'thinking'
          } else if (hasToolUse) {
            type = 'tool_use'
          }
        }
      }
      
      return messageTypeFilter.includes(type)
    })
  }, [messageTypeFilter, sessionLines])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{locale === 'ko' ? '대기중' : 'Pending'}</Badge>
      case 'in_progress':
        return <Badge variant="default"><MessageSquare className="h-3 w-3 mr-1" />{locale === 'ko' ? '진행중' : 'In Progress'}</Badge>
      case 'completed':
        return <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />{locale === 'ko' ? '완료' : 'Completed'}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const isMyRequest = request?.requester_id === user?.id

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                {locale === 'ko' ? '리뷰 요청을 불러오는 중...' : 'Loading review request...'}
              </p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (!request) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              {locale === 'ko' ? '리뷰 요청을 찾을 수 없습니다' : 'Review request not found'}
            </p>
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push('/reviews')}
            >
              <ChevronLeft className="h-4 w-4 mr-1" />
              {locale === 'ko' ? '목록으로' : 'Back to List'}
            </Button>
          </div>

          {/* 리뷰 요청 정보 */}
          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <CardTitle className="text-2xl">{request.title}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={request.requester?.avatar_url} />
                        <AvatarFallback className="text-xs">
                          {getUserInitials(
                            request.requester?.email || '',
                            request.requester?.display_name
                          )}
                        </AvatarFallback>
                      </Avatar>
                      <span>{request.requester?.display_name || request.requester?.email}</span>
                    </div>
                    <span>•</span>
                    <div className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(request.created_at)}</span>
                    </div>
                  </div>
                </div>
                {getStatusBadge(request.status)}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{request.content}</p>
            </CardContent>
          </Card>

          {/* 세션 섹션 */}
          <div className="space-y-6">
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {locale === 'ko' ? '세션' : 'Sessions'} ({request.sessions?.length || 0})
              </h2>
              {request.sessions && request.sessions.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* 세션 목록 */}
                  <div className="lg:col-span-3 space-y-2">
                    <h3 className="font-medium mb-3">
                      {locale === 'ko' ? '세션 목록' : 'Session List'}
                    </h3>
                    <ScrollArea className="h-[600px] pr-4">
                      <div className="space-y-2">
                        {request.sessions.map((session) => {
                          const hasUserPrompt = session.first_user_prompt && 
                            session.first_user_prompt !== session.file_name && 
                            session.first_user_prompt !== session.session_name
                          
                          return (
                            <Card
                              key={session.id}
                              className={`cursor-pointer transition-all ${
                                selectedSession === session.id 
                                  ? 'ring-2 ring-primary' 
                                  : hasUserPrompt 
                                    ? 'hover:shadow-md' 
                                    : 'hover:shadow-md opacity-60'
                              }`}
                              onClick={() => setSelectedSession(session.id)}
                            >
                              <CardContent className="p-3">
                                <div className="space-y-1">
                                  <p className={`text-sm font-medium line-clamp-2 ${
                                    hasUserPrompt ? '' : 'text-muted-foreground italic'
                                  }`}>
                                    {hasUserPrompt 
                                      ? session.first_user_prompt
                                      : (session.file_name || session.session_name || 'Unknown Session')
                                    }
                                  </p>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Folder className="h-3 w-3" />
                                    <span>{session.project?.name}</span>
                                  </div>
                                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                    <Clock className="h-3 w-3" />
                                    <span>{formatDate(session.uploaded_at)}</span>
                                  </div>
                                  {!hasUserPrompt && (
                                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                      <AlertCircle className="h-3 w-3" />
                                      <span className="italic">
                                        {locale === 'ko' ? '메시지 없음' : 'No messages'}
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </CardContent>
                            </Card>
                          )
                        })}
                      </div>
                    </ScrollArea>
                  </div>

                  {/* 세션 뷰어 */}
                  <div className="lg:col-span-9">
                    {selectedSession ? (
                      sessionLoading ? (
                        <div className="flex items-center justify-center h-[600px]">
                          <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                      ) : (
                        <Card className="h-[700px]">
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <CardTitle className="text-lg">
                                {locale === 'ko' ? '세션 내용' : 'Session Content'}
                              </CardTitle>
                            </div>
                            {/* 메시지 타입 필터 */}
                            <div className="flex items-center gap-2 mt-3">
                              <span className="text-sm text-muted-foreground">
                                {locale === 'ko' ? '필터:' : 'Filter:'}
                              </span>
                              <div className="flex gap-2 flex-wrap">
                                <Button
                                  variant={messageTypeFilter.includes('user_text') ? 'default' : 'outline'}
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setMessageTypeFilter(prev => 
                                      prev.includes('user_text') 
                                        ? prev.filter(t => t !== 'user_text')
                                        : [...prev, 'user_text']
                                    )
                                  }}
                                >
                                  <User className="h-3 w-3 mr-1" />
                                  {locale === 'ko' ? '사용자' : 'User'}
                                </Button>
                                <Button
                                  variant={messageTypeFilter.includes('assistant_text') ? 'default' : 'outline'}
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setMessageTypeFilter(prev => 
                                      prev.includes('assistant_text') 
                                        ? prev.filter(t => t !== 'assistant_text')
                                        : [...prev, 'assistant_text']
                                    )
                                  }}
                                >
                                  <MessageCircle className="h-3 w-3 mr-1" />
                                  {locale === 'ko' ? '어시스턴트' : 'Assistant'}
                                </Button>
                                <Button
                                  variant={messageTypeFilter.includes('tool_use') ? 'default' : 'outline'}
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setMessageTypeFilter(prev => 
                                      prev.includes('tool_use') 
                                        ? prev.filter(t => t !== 'tool_use')
                                        : [...prev, 'tool_use']
                                    )
                                  }}
                                >
                                  <Hash className="h-3 w-3 mr-1" />
                                  {locale === 'ko' ? '도구 사용' : 'Tool Use'}
                                </Button>
                                <Button
                                  variant={messageTypeFilter.includes('tool_result') ? 'default' : 'outline'}
                                  size="sm"
                                  className="h-7 text-xs"
                                  onClick={() => {
                                    setMessageTypeFilter(prev => 
                                      prev.includes('tool_result') 
                                        ? prev.filter(t => t !== 'tool_result')
                                        : [...prev, 'tool_result']
                                    )
                                  }}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  {locale === 'ko' ? '도구 결과' : 'Tool Result'}
                                </Button>
                                {messageTypeFilter.length > 0 && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 text-xs"
                                    onClick={() => setMessageTypeFilter([])}
                                  >
                                    {locale === 'ko' ? '전체' : 'All'}
                                  </Button>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="p-4">
                            <ScrollArea className="h-[500px] w-full">
                              <SessionViewerV2 
                                lines={filteredSessionLines as any}
                                viewMode="structured"
                                locale={locale}
                              />
                            </ScrollArea>
                          </CardContent>
                        </Card>
                      )
                    ) : (
                      <Card className="h-[600px] flex items-center justify-center">
                        <div className="text-center">
                          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            {locale === 'ko' 
                              ? '왼쪽에서 세션을 선택하세요' 
                              : 'Select a session from the left'}
                          </p>
                        </div>
                      </Card>
                    )}
                  </div>
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {locale === 'ko' ? '관련 세션이 없습니다' : 'No related sessions'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            <Separator />

            {/* 리뷰 섹션 */}
            <div>
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                {locale === 'ko' ? '리뷰' : 'Reviews'} ({request.reviews?.length || 0})
              </h2>
              
              {/* 리뷰 작성 폼 */}
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {locale === 'ko' ? '리뷰 작성' : 'Write Review'}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {locale === 'ko' ? '평점' : 'Rating'}
                    </span>
                    <div className="flex items-center gap-1">
                      {[1, 2, 3, 4, 5].map(rating => (
                        <button
                          key={rating}
                          onClick={() => setReviewRating(rating)}
                          className="p-1 hover:scale-110 transition-transform"
                        >
                          <Star
                            className={`h-5 w-5 ${
                              rating <= reviewRating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-gray-300 hover:text-yellow-400'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                    {reviewRating > 0 && (
                      <span className="text-sm text-muted-foreground ml-2">
                        {reviewRating === 5 && (locale === 'ko' ? '완벽해요!' : 'Perfect!')}
                        {reviewRating === 4 && (locale === 'ko' ? '좋아요' : 'Good')}
                        {reviewRating === 3 && (locale === 'ko' ? '보통이에요' : 'Average')}
                        {reviewRating === 2 && (locale === 'ko' ? '아쉬워요' : 'Poor')}
                        {reviewRating === 1 && (locale === 'ko' ? '별로에요' : 'Bad')}
                      </span>
                    )}
                  </div>
                  <Textarea
                    placeholder={locale === 'ko' 
                      ? '리뷰를 작성해주세요...' 
                      : 'Write your review...'}
                    value={reviewContent}
                    onChange={(e) => setReviewContent(e.target.value)}
                    rows={4}
                  />
                  <Button
                    onClick={submitReview}
                    disabled={submittingReview || !reviewContent.trim()}
                    className="w-full"
                  >
                    {submittingReview && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Send className="mr-2 h-4 w-4" />
                    {locale === 'ko' ? '리뷰 제출' : 'Submit Review'}
                  </Button>
                </CardContent>
              </Card>

              {/* 리뷰 목록 */}
              {request.reviews && request.reviews.length > 0 ? (
                <div className="space-y-3">
                  {request.reviews.map(review => (
                    <Card key={review.id}>
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={review.reviewer?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {getUserInitials(
                                  review.reviewer?.email || '',
                                  review.reviewer?.display_name
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-medium text-sm">
                                  {review.reviewer?.display_name || review.reviewer?.email}
                                </p>
                                <span className="text-xs text-muted-foreground">
                                  {formatDate(review.created_at)}
                                </span>
                              </div>
                              {review.rating && (
                                <div className="flex items-center gap-1 mt-1">
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
                                  <span className="text-xs text-muted-foreground ml-1">
                                    ({review.rating}/5)
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="pt-2">
                        <p className="text-sm whitespace-pre-wrap">{review.content}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center">
                      <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {locale === 'ko' 
                          ? '아직 리뷰가 없습니다' 
                          : 'No reviews yet'}
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}