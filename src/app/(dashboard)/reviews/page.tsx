'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { ReviewRequestModal } from '@/components/projects/review-request-modal'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  PenSquare,
  MessageSquare,
  Clock,
  Calendar,
  User,
  FileText,
  Folder,
  Search,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  Send,
  ChevronRight,
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
    project?: {
      name: string
    }
  }>
  reviews?: Array<{
    id: string
    reviewer_id: string
    content: string
    rating?: number
    created_at: string
    reviewer?: {
      email: string
      display_name?: string
      avatar_url?: string
    }
  }>
}

export default function ReviewsPage() {
  const [allRequests, setAllRequests] = useState<ReviewRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [showRequestModal, setShowRequestModal] = useState(false)
  const [selectedRequest, setSelectedRequest] = useState<ReviewRequest | null>(null)
  const [reviewContent, setReviewContent] = useState('')
  const [reviewRating, setReviewRating] = useState(0)
  const [submittingReview, setSubmittingReview] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const supabase = createClient()

  // 리뷰 요청 목록 가져오기
  const fetchReviewRequests = async () => {
    if (!user) return

    setLoading(true)
    try {
      // 모든 리뷰 요청 가져오기
      const { data: requestsData } = await supabase
        .from('review_requests')
        .select(`
          *,
          requester:profiles!review_requests_requester_id_fkey(id, email, display_name, avatar_url)
        `)
        .order('created_at', { ascending: false })

      // 세션 정보 가져오기
      const enrichRequests = async (requests: any[]) => {
        return Promise.all(requests.map(async (request) => {
          // 세션 정보
          if (request.session_ids?.length > 0) {
            const { data: sessions } = await supabase
              .from('project_sessions')
              .select(`
                id,
                session_name,
                file_name,
                project:projects(name)
              `)
              .in('id', request.session_ids)
            
            // 첫 번째 사용자 프롬프트 가져오기
            const sessionsWithPrompts = await Promise.all((sessions || []).map(async (session) => {
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
                
                firstPrompt = firstPrompt.replace(/\n/g, ' ').trim().substring(0, 100)
                if (firstPrompt.length === 100) firstPrompt += '...'
              }

              return {
                ...session,
                first_user_prompt: firstPrompt || session.file_name || session.session_name || 'Session'
              }
            }))

            request.sessions = sessionsWithPrompts
          }

          // 리뷰 가져오기
          const { data: reviews } = await supabase
            .from('review_responses')
            .select(`
              *,
              reviewer:profiles!review_responses_reviewer_id_fkey(email, display_name, avatar_url)
            `)
            .eq('request_id', request.id)
            .order('created_at', { ascending: false })

          request.reviews = reviews || []

          return request
        }))
      }

      const enrichedRequests = await enrichRequests(requestsData || [])
      setAllRequests(enrichedRequests)
    } catch (error) {
      console.error('Error fetching review requests:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReviewRequests()
  }, [user])

  // 리뷰 제출
  const submitReview = async () => {
    if (!user || !selectedRequest || !reviewContent.trim()) return

    setSubmittingReview(true)
    try {
      const { error } = await supabase
        .from('review_responses')
        .insert({
          request_id: selectedRequest.id,
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
        .eq('id', selectedRequest.id)

      alert(locale === 'ko' ? '리뷰가 제출되었습니다' : 'Review submitted')
      setSelectedRequest(null)
      setReviewContent('')
      setReviewRating(0)
      fetchReviewRequests()
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />{locale === 'ko' ? '대기중' : 'Pending'}</Badge>
      case 'in_progress':
        return <Badge variant="default"><MessageSquare className="h-3 w-3 mr-1" />{locale === 'ko' ? '진행중' : 'In Progress'}</Badge>
      case 'completed':
        return <Badge variant="success"><CheckCircle className="h-3 w-3 mr-1" />{locale === 'ko' ? '완료' : 'Completed'}</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const filteredRequests = allRequests.filter(req => 
    searchQuery ? (
      req.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requester?.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      req.requester?.email.toLowerCase().includes(searchQuery.toLowerCase())
    ) : true
  )
  
  const isMyRequest = (request: ReviewRequest) => request.requester_id === user?.id

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                {locale === 'ko' ? '리뷰 요청을 불러오는 중...' : 'Loading review requests...'}
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
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <MessageSquare className="h-8 w-8" />
                {locale === 'ko' ? '리뷰' : 'Reviews'}
              </h1>
              <p className="text-muted-foreground mt-1">
                {locale === 'ko' 
                  ? '팀원들과 코드 리뷰를 주고받으세요' 
                  : 'Exchange code reviews with your team'}
              </p>
            </div>
            <Button onClick={() => setShowRequestModal(true)}>
              <PenSquare className="mr-2 h-4 w-4" />
              {locale === 'ko' ? '리뷰 요청하기' : 'Request Review'}
            </Button>
          </div>

          {/* 검색 */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={locale === 'ko' ? '리뷰 요청 검색...' : 'Search review requests...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 리뷰 요청 목록 */}
          <div className="space-y-4">
              {filteredRequests.length === 0 ? (
                <Card>
                  <CardContent className="py-8">
                    <div className="text-center">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground mb-4">
                        {locale === 'ko' ? '아직 리뷰 요청이 없습니다' : 'No review requests yet'}
                      </p>
                      <Button onClick={() => setShowRequestModal(true)}>
                        <PenSquare className="mr-2 h-4 w-4" />
                        {locale === 'ko' ? '첫 리뷰 요청하기' : 'Create First Request'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                filteredRequests.map(request => (
                  <Card key={request.id} className="hover:shadow-lg transition-all">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <CardTitle className="text-lg flex items-center gap-2">
                            {request.title}
                            {isMyRequest(request) && (
                              <Badge variant="secondary" className="text-xs">
                                {locale === 'ko' ? '내 요청' : 'My Request'}
                              </Badge>
                            )}
                          </CardTitle>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={request.requester?.avatar_url} />
                              <AvatarFallback className="text-xs">
                                {getUserInitials(
                                  request.requester?.email || '',
                                  request.requester?.display_name
                                )}
                              </AvatarFallback>
                            </Avatar>
                            <span>{request.requester?.display_name || request.requester?.email}</span>
                            <span>•</span>
                            <span>{formatDate(request.created_at)}</span>
                          </div>
                        </div>
                        {getStatusBadge(request.status)}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm">{request.content}</p>
                      
                      {/* 세션 목록 */}
                      {request.sessions && request.sessions.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-sm font-medium">
                            {locale === 'ko' ? '관련 세션' : 'Related Sessions'} ({request.sessions.length})
                          </p>
                          <div className="space-y-1">
                            {request.sessions.slice(0, 3).map(session => (
                              <div key={session.id} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <FileText className="h-3 w-3" />
                                <span className="truncate">{session.first_user_prompt}</span>
                                {session.project && (
                                  <>
                                    <span>•</span>
                                    <Folder className="h-3 w-3" />
                                    <span>{session.project.name}</span>
                                  </>
                                )}
                              </div>
                            ))}
                            {request.sessions.length > 3 && (
                              <p className="text-xs text-muted-foreground">
                                {locale === 'ko' 
                                  ? `+${request.sessions.length - 3}개 더...` 
                                  : `+${request.sessions.length - 3} more...`}
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* 기존 리뷰 */}
                      {request.reviews && request.reviews.length > 0 && (
                        <div className="pt-2 border-t">
                          <p className="text-sm font-medium mb-2">
                            {locale === 'ko' ? '리뷰' : 'Reviews'} ({request.reviews.length})
                          </p>
                          {request.reviews.slice(0, 2).map(review => (
                            <div key={review.id} className="mb-2 p-2 bg-muted/50 rounded">
                              <div className="flex items-center gap-2 mb-1">
                                <Avatar className="h-4 w-4">
                                  <AvatarFallback className="text-xs">
                                    {getUserInitials(
                                      review.reviewer?.email || '',
                                      review.reviewer?.display_name
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs font-medium">
                                  {review.reviewer?.display_name || review.reviewer?.email}
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
                                <span className="text-xs text-muted-foreground ml-auto">
                                  {formatDate(review.created_at)}
                                </span>
                              </div>
                              <p className="text-xs line-clamp-2">{review.content}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 리뷰 작성 - 내가 요청한 것이 아닌 경우에만 */}
                      {!isMyRequest(request) && selectedRequest?.id === request.id ? (
                        <div className="space-y-3 pt-2 border-t">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">
                              {locale === 'ko' ? '평점' : 'Rating'}
                            </span>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4, 5].map(rating => (
                                <button
                                  key={rating}
                                  onClick={() => setReviewRating(rating)}
                                  className="p-1"
                                >
                                  <Star
                                    className={`h-4 w-4 ${
                                      rating <= reviewRating
                                        ? 'fill-yellow-400 text-yellow-400'
                                        : 'text-gray-300 hover:text-yellow-400'
                                    }`}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>
                          <Textarea
                            placeholder={locale === 'ko' 
                              ? '리뷰를 작성해주세요...' 
                              : 'Write your review...'}
                            value={reviewContent}
                            onChange={(e) => setReviewContent(e.target.value)}
                            rows={3}
                          />
                          <div className="flex items-center gap-2">
                            <Button
                              size="sm"
                              onClick={submitReview}
                              disabled={submittingReview || !reviewContent.trim()}
                            >
                              {submittingReview && <Loader2 className="mr-2 h-3 w-3 animate-spin" />}
                              <Send className="mr-1 h-3 w-3" />
                              {locale === 'ko' ? '제출' : 'Submit'}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedRequest(null)
                                setReviewContent('')
                                setReviewRating(0)
                              }}
                            >
                              {locale === 'ko' ? '취소' : 'Cancel'}
                            </Button>
                          </div>
                        </div>
                      ) : !isMyRequest(request) ? (
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => setSelectedRequest(request)}
                        >
                          <PenSquare className="mr-2 h-4 w-4" />
                          {locale === 'ko' ? '리뷰 작성' : 'Write Review'}
                        </Button>
                      ) : null}
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

        {/* 리뷰 요청 모달 */}
        <ReviewRequestModal
          open={showRequestModal}
          onOpenChange={setShowRequestModal}
        />
      </DashboardLayout>
    </ProtectedRoute>
  )
}