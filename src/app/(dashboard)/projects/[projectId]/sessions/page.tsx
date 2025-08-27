'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { SessionViewerV2 } from '@/components/session-viewer/SessionViewerV2'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  ArrowLeft,
  Calendar,
  FileText,
  User,
  Clock,
  Loader2,
  AlertCircle
} from 'lucide-react'

interface ProjectSession {
  id: string
  project_id: string
  user_id: string
  session_name?: string
  session_count: number
  uploaded_at: string
  session_start_date?: string
  session_end_date?: string
  file_name?: string
  processed_lines?: number
  first_user_prompt?: string
  profiles?: {
    email: string
    display_name?: string
    avatar_url?: string
  }
}

interface SessionLine {
  id: number
  line_number: number
  content: any
  raw_text: string
  message_type?: string
  message_timestamp?: string
}

export default function DateSessionsPage() {
  const [sessions, setSessions] = useState<ProjectSession[]>([])
  const [selectedSession, setSelectedSession] = useState<ProjectSession | null>(null)
  const [sessionLines, setSessionLines] = useState<SessionLine[]>([])
  const [loading, setLoading] = useState(true)
  const [linesLoading, setLinesLoading] = useState(false)
  
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const supabase = createClient()
  
  const projectId = params.projectId as string
  const date = searchParams.get('date')

  // 세션 목록 조회
  const fetchSessions = async () => {
    if (!projectId || !date) return

    try {
      setLoading(true)
      
      // 먼저 모든 세션을 가져온 다음 날짜로 필터링
      const { data: allSessionsData, error: sessionsError } = await supabase
        .from('project_sessions')
        .select('*')
        .eq('project_id', projectId)
        .order('uploaded_at', { ascending: false })

      if (sessionsError) {
        console.error('Error fetching sessions:', sessionsError)
        return
      }

      // 날짜별 필터링 (session_end_date, session_start_date, uploaded_at 순서로 확인)
      const filteredSessions = allSessionsData?.filter(session => {
        const sessionDate = session.session_end_date || 
                           session.session_start_date || 
                           session.uploaded_at?.split('T')[0]
        return sessionDate === date
      }) || []

      // 각 세션의 유저 정보 조회 및 첫 번째 사용자 프롬프트 가져오기
      if (filteredSessions.length > 0) {
        const userIds = [...new Set(filteredSessions.map(s => s.user_id))]
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, email, display_name, avatar_url')
          .in('id', userIds)

        // 각 세션의 첫 번째 사용자 프롬프트 가져오기
        const sessionsWithDetails = await Promise.all(filteredSessions.map(async (session) => {
          // 첫 번째 사용자 메시지 가져오기
          const { data: firstUserMessage, error } = await supabase
            .from('session_lines')
            .select('content, raw_text, message_type')
            .eq('upload_id', session.id)
            .order('line_number', { ascending: true })
            .limit(50) // 처음 50줄 가져오기

          console.log(`Session ${session.id}: fetched ${firstUserMessage?.length || 0} lines`)
          
          // 첫 번째 사용자 메시지 찾기
          const userMessage = firstUserMessage?.find(line => 
            line.message_type === 'user' || 
            line.message_type === 'human' ||
            (line.content && typeof line.content === 'object' && 
             (line.content.role === 'user' || line.content.role === 'human'))
          )

          let firstPrompt = ''
          if (userMessage) {
            console.log('Found user message:', userMessage)
            
            // raw_text에서 JSON 파싱 시도
            try {
              const parsed = JSON.parse(userMessage.raw_text)
              // Claude Code의 사용자 메시지 구조에서 text 추출
              // message.content 필드 확인 (Claude Code 구조)
              if (parsed.message && parsed.message.content) {
                firstPrompt = parsed.message.content
              } else if (parsed.text) {
                firstPrompt = parsed.text
              } else if (parsed.content) {
                firstPrompt = parsed.content
              } else if (userMessage.content && typeof userMessage.content === 'object') {
                firstPrompt = userMessage.content.text || userMessage.content.content || ''
              } else if (typeof userMessage.content === 'string') {
                firstPrompt = userMessage.content
              }
            } catch (e) {
              // JSON 파싱 실패시 content 필드 사용
              if (userMessage.content && typeof userMessage.content === 'object') {
                firstPrompt = userMessage.content.text || userMessage.content.content || ''
              } else if (typeof userMessage.content === 'string') {
                firstPrompt = userMessage.content
              } else {
                firstPrompt = userMessage.raw_text || ''
              }
            }
            
            // 첫 100자만 사용하고 줄바꿈 제거
            firstPrompt = firstPrompt.replace(/\n/g, ' ').trim().substring(0, 100)
            if (firstPrompt.length === 100) firstPrompt += '...'
          } else {
            console.log('No user message found for session:', session.id)
          }

          return {
            ...session,
            profiles: profilesData?.find(p => p.id === session.user_id),
            first_user_prompt: firstPrompt || session.file_name || session.session_name || `Session ${session.session_count}`
          }
        }))

        setSessions(sessionsWithDetails)
        
        // 첫 번째 세션 자동 선택
        if (sessionsWithDetails.length > 0) {
          setSelectedSession(sessionsWithDetails[0])
        }
      } else {
        setSessions([])
      }
    } catch (error) {
      console.error('Error in fetchSessions:', error)
    } finally {
      setLoading(false)
    }
  }

  // 세션 라인 조회
  const fetchSessionLines = async (sessionId: string) => {
    try {
      setLinesLoading(true)
      
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
      console.error('Error in fetchSessionLines:', error)
    } finally {
      setLinesLoading(false)
    }
  }

  useEffect(() => {
    fetchSessions()
  }, [projectId, date])

  useEffect(() => {
    if (selectedSession) {
      fetchSessionLines(selectedSession.id)
    }
  }, [selectedSession])

  const getUserInitials = (email: string, name?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(
      locale === 'ko' ? 'ko-KR' : 'en-US',
      { hour: '2-digit', minute: '2-digit' }
    )
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                {locale === 'ko' ? '세션을 불러오는 중...' : 'Loading sessions...'}
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
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => router.push(`/projects/${projectId}?tab=sessions`)}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-2xl font-bold flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {date && new Date(date + 'T00:00:00').toLocaleDateString(
                    locale === 'ko' ? 'ko-KR' : 'en-US',
                    { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }
                  )}
                </h1>
                <p className="text-sm text-muted-foreground">
                  {sessions.length} {locale === 'ko' ? '개의 세션' : 'sessions'}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* 세션 목록 */}
            <div className="lg:col-span-1 space-y-3">
              <h2 className="text-lg font-semibold">
                {locale === 'ko' ? '세션 목록' : 'Session List'}
              </h2>
              <div className="space-y-2">
                {sessions.map(session => (
                  <Card
                    key={session.id}
                    className={`cursor-pointer transition-all ${
                      selectedSession?.id === session.id 
                        ? 'ring-2 ring-primary shadow-md' 
                        : 'hover:shadow-sm'
                    }`}
                    onClick={() => setSelectedSession(session)}
                  >
                    <CardHeader className="p-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-8 w-8 flex-shrink-0">
                            <AvatarFallback className="text-xs">
                              {getUserInitials(
                                session.profiles?.email || '',
                                session.profiles?.display_name
                              )}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-muted-foreground truncate">
                              {session.profiles?.display_name || session.profiles?.email}
                            </p>
                          </div>
                        </div>
                        <div className="w-full">
                          <p className="font-medium text-sm line-clamp-2">
                            {session.first_user_prompt}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <Badge variant="outline" className="text-xs">
                          <FileText className="h-3 w-3 mr-1" />
                          {session.processed_lines || 0}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(session.uploaded_at)}
                        </span>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            </div>

            {/* 세션 뷰어 */}
            <div className="lg:col-span-3">
              {selectedSession ? (
                <Card className="h-[calc(100vh-12rem)]">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg truncate max-w-md">
                        {selectedSession.first_user_prompt}
                      </CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">
                          <User className="h-3 w-3 mr-1" />
                          {selectedSession.profiles?.display_name || selectedSession.profiles?.email}
                        </Badge>
                        <Badge variant="outline">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(selectedSession.uploaded_at)}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="h-[calc(100%-4rem)] overflow-auto">
                    {linesLoading ? (
                      <div className="flex items-center justify-center h-full">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : sessionLines.length > 0 ? (
                      <SessionViewerV2 lines={sessionLines} />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                        <AlertCircle className="h-8 w-8 mb-2" />
                        <p>{locale === 'ko' ? '세션 데이터가 없습니다' : 'No session data available'}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card className="h-[calc(100vh-12rem)] flex items-center justify-center">
                  <div className="text-center text-muted-foreground">
                    <FileText className="h-12 w-12 mx-auto mb-3" />
                    <p>{locale === 'ko' ? '세션을 선택해주세요' : 'Please select a session'}</p>
                  </div>
                </Card>
              )}
            </div>
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}