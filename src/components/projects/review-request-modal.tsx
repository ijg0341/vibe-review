'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Calendar,
  FileText,
  Folder,
  Users,
  Loader2,
  AlertCircle,
  Check,
  Search,
  User,
  Clock
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'

interface SessionWithProject {
  id: string
  project_id: string
  user_id: string
  session_name?: string
  file_name?: string
  session_count: number
  uploaded_at: string
  session_start_date?: string
  session_end_date?: string
  processed_lines?: number
  first_user_prompt?: string
  project?: {
    id: string
    name: string
    folder_path: string
  }
}

interface ReviewRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  preSelectedSessions?: string[]
  projectId?: string
}

export function ReviewRequestModal({
  open,
  onOpenChange,
  preSelectedSessions = [],
  projectId
}: ReviewRequestModalProps) {
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [selectedSessions, setSelectedSessions] = useState<string[]>(preSelectedSessions)
  const [selectedDates, setSelectedDates] = useState<string[]>([])
  const [sessions, setSessions] = useState<SessionWithProject[]>([])
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedTab, setSelectedTab] = useState('recent')
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const supabase = createClient()

  // 사용자의 모든 세션 가져오기
  const fetchUserSessions = async () => {
    if (!user) return
    
    setLoading(true)
    try {
      // 프로젝트 정보와 함께 세션 가져오기
      const { data: sessionsData, error } = await supabase
        .from('project_sessions')
        .select(`
          *,
          project:projects(id, name, folder_path)
        `)
        .eq('user_id', user.id)
        .order('uploaded_at', { ascending: false })
        .limit(100)

      if (error) {
        console.error('Error fetching sessions:', error)
        return
      }

      // 각 세션의 첫 번째 사용자 프롬프트 가져오기
      const sessionsWithPrompts = await Promise.all((sessionsData || []).map(async (session) => {
        // 첫 번째 사용자 메시지 가져오기
        const { data: sessionLines } = await supabase
          .from('session_lines')
          .select('content, raw_text, message_type')
          .eq('upload_id', session.id)
          .order('line_number', { ascending: true })
          .limit(50)

        const userMessage = sessionLines?.find(line => 
          line.message_type === 'user' || 
          line.message_type === 'human'
        )

        let firstPrompt = ''
        if (userMessage) {
          try {
            const parsed = JSON.parse(userMessage.raw_text)
            if (parsed.message && parsed.message.content) {
              firstPrompt = parsed.message.content
            } else if (parsed.text) {
              firstPrompt = parsed.text
            } else if (parsed.content) {
              firstPrompt = parsed.content
            }
          } catch (e) {
            // JSON 파싱 실패 시 무시
          }
          
          // firstPrompt가 문자열인지 확인
          if (typeof firstPrompt === 'string' && firstPrompt) {
            firstPrompt = firstPrompt.replace(/\n/g, ' ').trim().substring(0, 100)
            if (firstPrompt.length === 100) firstPrompt += '...'
          } else {
            firstPrompt = ''
          }
        }

        return {
          ...session,
          first_user_prompt: firstPrompt || session.file_name || session.session_name || `Session #${session.session_count}`
        }
      }))

      setSessions(sessionsWithPrompts)
    } catch (error) {
      console.error('Error in fetchUserSessions:', error)
    } finally {
      setLoading(false)
    }
  }


  useEffect(() => {
    if (open) {
      fetchUserSessions()
    } else {
      // 모달이 닫힐 때 상태 초기화
      setTitle('')
      setContent('')
      setSelectedSessions([])
      setSelectedDates([])
      setSearchQuery('')
      setSelectedTab('recent')
    }
  }, [open])

  useEffect(() => {
    if (preSelectedSessions && preSelectedSessions.length > 0) {
      setSelectedSessions(preSelectedSessions)
    }
  }, [preSelectedSessions])

  const handleSubmit = async () => {
    if (!user || selectedSessions.length === 0 || !title || !content) {
      return
    }

    setSubmitting(true)
    try {
      // 리뷰 요청 생성
      const { data: reviewRequest, error: requestError } = await supabase
        .from('review_requests')
        .insert({
          requester_id: user.id,
          session_ids: selectedSessions,
          title: title,
          content: content,
          reviewer_ids: [], // 빈 배열 = 모든 사용자가 리뷰 가능
          status: 'pending',
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (requestError) {
        console.error('Error creating review request:', requestError)
        alert(locale === 'ko' ? '리뷰 요청 생성 실패' : 'Failed to create review request')
        return
      }

      // 성공 시 상태 초기화
      setTitle('')
      setContent('')
      setSelectedSessions([])
      setSelectedDates([])
      
      alert(locale === 'ko' ? '리뷰 요청이 생성되었습니다' : 'Review request created')
      
      // 모달 닫기
      onOpenChange(false)
    } catch (error) {
      console.error('Error submitting review request:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const toggleSession = (sessionId: string) => {
    setSelectedSessions(prev => 
      prev.includes(sessionId)
        ? prev.filter(id => id !== sessionId)
        : [...prev, sessionId]
    )
  }

  const toggleDate = (date: string) => {
    const dateProjects = sessionsByDate[date]
    if (!dateProjects) return

    const dateSessionIds = Object.values(dateProjects).flat().map(s => s.id)
    const allSelected = dateSessionIds.every(id => selectedSessions.includes(id))

    if (allSelected) {
      // 날짜의 모든 세션이 선택되어 있으면 해제
      setSelectedSessions(prev => prev.filter(id => !dateSessionIds.includes(id)))
      setSelectedDates(prev => prev.filter(d => d !== date))
    } else {
      // 하나라도 선택되지 않았으면 모두 선택
      setSelectedSessions(prev => [...new Set([...prev, ...dateSessionIds])])
      setSelectedDates(prev => [...new Set([...prev, date])])
    }
  }

  const toggleProject = (date: string, projectName: string) => {
    const projectSessions = sessionsByDate[date]?.[projectName]
    if (!projectSessions) return

    const projectSessionIds = projectSessions.map(s => s.id)
    const allSelected = projectSessionIds.every(id => selectedSessions.includes(id))

    if (allSelected) {
      // 프로젝트의 모든 세션이 선택되어 있으면 해제
      setSelectedSessions(prev => prev.filter(id => !projectSessionIds.includes(id)))
    } else {
      // 하나라도 선택되지 않았으면 모두 선택
      setSelectedSessions(prev => [...new Set([...prev, ...projectSessionIds])])
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

  // 세션 필터링
  const filteredSessions = sessions.filter(session => {
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      return (
        session.first_user_prompt?.toLowerCase().includes(query) ||
        session.project?.name.toLowerCase().includes(query)
      )
    }
    
    if (selectedTab === 'today') {
      const today = new Date().toISOString().split('T')[0]
      const sessionDate = session.session_end_date || session.session_start_date || session.uploaded_at.split('T')[0]
      return sessionDate === today
    }
    
    if (selectedTab === 'week') {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const sessionDate = new Date(session.session_end_date || session.session_start_date || session.uploaded_at)
      return sessionDate >= weekAgo
    }
    
    return true // recent tab shows all
  })

  // 날짜별로 그룹화하고, 각 날짜 내에서 프로젝트별로 다시 그룹화
  const sessionsByDate = filteredSessions.reduce((acc, session) => {
    const date = session.session_end_date || 
                 session.session_start_date || 
                 session.uploaded_at.split('T')[0]
    if (!acc[date]) {
      acc[date] = {}
    }
    
    const projectName = session.project?.name || 'Unknown Project'
    if (!acc[date][projectName]) {
      acc[date][projectName] = []
    }
    acc[date][projectName].push(session)
    
    return acc
  }, {} as Record<string, Record<string, SessionWithProject[]>>)

  const sortedDates = Object.keys(sessionsByDate).sort((a, b) => b.localeCompare(a))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[90vw] max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>
            {locale === 'ko' ? '리뷰 요청하기' : 'Request Review'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'ko' 
              ? '리뷰를 받고 싶은 세션을 선택하고 내용을 작성해주세요.'
              : 'Select sessions you want to be reviewed and write your request.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-6 py-4 max-h-[calc(90vh-12rem)] overflow-hidden">
          {/* 왼쪽: 입력 폼 */}
          <div className="space-y-4 overflow-y-auto pr-2">
            {/* 제목 입력 */}
            <div className="grid gap-2">
              <Label htmlFor="title">
                {locale === 'ko' ? '제목' : 'Title'}
              </Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={locale === 'ko' 
                  ? '리뷰 요청 제목을 입력하세요' 
                  : 'Enter review request title'}
              />
            </div>

            {/* 내용 입력 */}
            <div className="grid gap-2">
              <Label htmlFor="content">
                {locale === 'ko' ? '내용' : 'Content'}
              </Label>
              <Textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder={locale === 'ko' 
                  ? '어떤 부분을 중점적으로 리뷰받고 싶은지 작성해주세요' 
                  : 'Write what you want to be reviewed'}
                rows={8}
              />
            </div>
          </div>

          {/* 오른쪽: 세션 선택 */}
          <div className="flex flex-col h-full">
            <div className="mb-3">
              <Label className="text-lg font-semibold">
                {locale === 'ko' ? '세션 선택' : 'Select Sessions'} 
                <Badge className="ml-2" variant="secondary">{selectedSessions.length}</Badge>
              </Label>
            </div>
            
            <div className="flex items-center gap-2 mb-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={locale === 'ko' ? '세션 검색...' : 'Search sessions...'}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Tabs value={selectedTab} onValueChange={setSelectedTab}>
                <TabsList>
                  <TabsTrigger value="recent">
                    {locale === 'ko' ? '최근' : 'Recent'}
                  </TabsTrigger>
                  <TabsTrigger value="today">
                    {locale === 'ko' ? '오늘' : 'Today'}
                  </TabsTrigger>
                  <TabsTrigger value="week">
                    {locale === 'ko' ? '일주일' : 'Week'}
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            <ScrollArea className="flex-1 w-full rounded-md border p-4">
              {loading ? (
                <div className="flex items-center justify-center h-full">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : sortedDates.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                  <FileText className="h-8 w-8 mb-2" />
                  <p>{locale === 'ko' ? '세션이 없습니다' : 'No sessions available'}</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {sortedDates.map(date => {
                    const dateProjects = sessionsByDate[date]
                    const allDateSessions = Object.values(dateProjects).flat()
                    const dateSessionIds = allDateSessions.map(s => s.id)
                    const allDateSelected = dateSessionIds.every(id => selectedSessions.includes(id))
                    const someDateSelected = dateSessionIds.some(id => selectedSessions.includes(id))
                    
                    return (
                      <div key={date}>
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="relative">
                              <Checkbox
                                checked={allDateSelected}
                                onCheckedChange={() => toggleDate(date)}
                              />
                              {someDateSelected && !allDateSelected && (
                                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                  <div className="w-2 h-0.5 bg-primary"></div>
                                </div>
                              )}
                            </div>
                            <button
                              onClick={() => toggleDate(date)}
                              className="flex items-center gap-2 hover:text-primary transition-colors"
                            >
                              <Calendar className="h-4 w-4" />
                              <span className="text-sm font-medium">
                                {new Date(date + 'T00:00:00').toLocaleDateString(
                                  locale === 'ko' ? 'ko-KR' : 'en-US',
                                  { month: 'short', day: 'numeric', weekday: 'short' }
                                )}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {allDateSessions.length}
                              </Badge>
                            </button>
                          </div>
                        </div>
                        
                        {/* 프로젝트별 그룹 */}
                        <div className="ml-6 space-y-3">
                          {Object.entries(dateProjects).map(([projectName, projectSessions]) => {
                            const projectSessionIds = projectSessions.map(s => s.id)
                            const allProjectSelected = projectSessionIds.every(id => selectedSessions.includes(id))
                            const someProjectSelected = projectSessionIds.some(id => selectedSessions.includes(id))
                            
                            return (
                              <div key={`${date}-${projectName}`} className="space-y-2">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="relative">
                                    <Checkbox
                                      checked={allProjectSelected}
                                      onCheckedChange={() => toggleProject(date, projectName)}
                                    />
                                    {someProjectSelected && !allProjectSelected && (
                                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <div className="w-2 h-0.5 bg-primary"></div>
                                      </div>
                                    )}
                                  </div>
                                  <button
                                    onClick={() => toggleProject(date, projectName)}
                                    className="flex items-center gap-2 hover:text-primary transition-colors"
                                  >
                                    <Folder className="h-3 w-3" />
                                    <span className="text-xs font-medium">{projectName}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {projectSessions.length}
                                    </Badge>
                                  </button>
                                </div>
                                
                                <div className="space-y-2 ml-6">
                                  {projectSessions.map(session => (
                                    <Card 
                                      key={session.id}
                                      className={`cursor-pointer transition-colors ${
                                        selectedSessions.includes(session.id) 
                                          ? 'border-primary bg-primary/5' 
                                          : 'hover:bg-accent'
                                      }`}
                                      onClick={() => toggleSession(session.id)}
                                    >
                                      <CardContent className="p-2">
                                        <div className="flex items-start justify-between">
                                          <div className="flex items-start gap-2 flex-1">
                                            <Checkbox
                                              checked={selectedSessions.includes(session.id)}
                                              onCheckedChange={() => toggleSession(session.id)}
                                              onClick={(e) => e.stopPropagation()}
                                            />
                                            <div className="space-y-1 flex-1 min-w-0">
                                              <p className="text-xs font-medium line-clamp-1">
                                                {session.first_user_prompt}
                                              </p>
                                              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <div className="flex items-center gap-1">
                                                  <FileText className="h-3 w-3" />
                                                  <span>{session.processed_lines || 0} lines</span>
                                                </div>
                                                <span>•</span>
                                                <span>{formatDate(session.uploaded_at)}</span>
                                              </div>
                                            </div>
                                          </div>
                                        </div>
                                      </CardContent>
                                    </Card>
                                  ))}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </ScrollArea>
          </div>

        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {locale === 'ko' ? '취소' : 'Cancel'}
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={
              submitting || 
              selectedSessions.length === 0 || 
              !title.trim() || 
              !content.trim()
            }
          >
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {locale === 'ko' ? '리뷰 요청' : 'Request Review'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}