'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SessionViewer } from '@/components/sessions/SessionViewer'
import { AISummaryPanel } from '@/components/ai-summary/AISummaryPanel'
import {
  FileText,
  Clock,
  Loader2,
  Database,
  ChevronRight,
  ChevronDown,
  Code,
  Folder,
  User
} from 'lucide-react'

interface GuestUser {
  id: string
  email: string
  full_name: string
  upload_count: number
  total_file_size: number
  created_at: string
  last_upload_at: string | null
}

interface Session {
  id: string
  session_id: string | null
  file_id: string
  filename: string
  file_name: string
  tool_name: string
  file_size: number
  upload_status: string
  upload_time: string
  created_at: string
  start_timestamp: string | null
  end_timestamp: string | null
  start_time: string | null
  end_time: string | null
  total_messages: number
  total_tokens: number
  prompt_count: number
  project: string
  project_name: string
  session_content: {
    messages: Array<{
      type: string
      content: any
      timestamp: string
      uuid: string
      sequence: number
      is_sidechain: boolean
      subagent_name: string | null
      subagent_type: string | null
    }>
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

interface GuestData {
  guest: GuestUser
  sessions: Session[]
}

export default function GuestViewPage() {
  const params = useParams()
  const guestUserId = params.guestUserId as string

  const [data, setData] = useState<GuestData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null)
  const [sessionLines, setSessionLines] = useState<SessionLine[]>([])
  const [linesLoading, setLinesLoading] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set())
  const [rightPanelWidth, setRightPanelWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)

  // 데이터 로드
  useEffect(() => {
    async function fetchGuestData() {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'
        const response = await fetch(`${apiUrl}/api/guest/${guestUserId}`)

        if (!response.ok) {
          throw new Error('게스트 정보를 불러올 수 없습니다')
        }

        const result = await response.json()
        if (result.success) {
          setData(result.data)
        } else {
          throw new Error(result.error || '데이터 로드 실패')
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : '알 수 없는 오류')
      } finally {
        setLoading(false)
      }
    }

    fetchGuestData()
  }, [guestUserId])

  // 세션 자동 선택 및 프로젝트 확장
  useEffect(() => {
    if (data && data.sessions.length > 0) {
      const projectIds = Object.keys(sessionsByProject)
      setExpandedProjects(new Set(projectIds))

      if (data.sessions[0]) {
        selectSession(data.sessions[0].id)
      }
    }
  }, [data])

  // 리사이즈 핸들러
  useEffect(() => {
    if (isResizing) {
      const handleMouseMove = (e: MouseEvent) => {
        requestAnimationFrame(() => {
          const newWidth = window.innerWidth - e.clientX - 10
          setRightPanelWidth(Math.min(Math.max(280, newWidth), 600))
        })
      }

      const handleMouseUp = () => {
        setIsResizing(false)
      }

      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)

      return () => {
        document.removeEventListener('mousemove', handleMouseMove)
        document.removeEventListener('mouseup', handleMouseUp)
      }
    }
  }, [isResizing])

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  const selectSession = (sessionId: string) => {
    setSelectedSessionId(sessionId)
    setLinesLoading(true)

    try {
      const session = data?.sessions.find(s => s.id === sessionId)

      if (session?.session_content?.messages) {
        const convertedLines = session.session_content.messages.map((message, index) => ({
          id: index + 1,
          line_number: index + 1,
          content: {
            type: message.type,
            message: {
              content: message.content
            },
            timestamp: message.timestamp,
            uuid: message.uuid,
            sequence: message.sequence,
            is_sidechain: message.is_sidechain,
            subagent_name: message.subagent_name
          },
          raw_text: typeof message.content === 'string' ? message.content : JSON.stringify(message.content),
          message_type: message.type,
          message_timestamp: message.timestamp
        }))

        setSessionLines(convertedLines)
      } else {
        setSessionLines([])
      }
    } catch (error) {
      console.error('Error in selectSession:', error)
      setSessionLines([])
    } finally {
      setLinesLoading(false)
    }
  }

  const toggleProjectExpand = (projectId: string) => {
    const newExpanded = new Set(expandedProjects)
    if (newExpanded.has(projectId)) {
      newExpanded.delete(projectId)
    } else {
      newExpanded.add(projectId)
    }
    setExpandedProjects(newExpanded)
  }

  // 프로젝트별 세션 그룹화
  const sessionsByProject = (data?.sessions || []).reduce((acc: any, session: Session) => {
    const projectId = session.project_name || session.project || 'no-project'
    if (!acc[projectId]) {
      acc[projectId] = []
    }
    acc[projectId].push(session)
    return acc
  }, {})

  const selectedSession = data?.sessions.find(s => s.id === selectedSessionId)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">로딩 중...</p>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="text-center max-w-md">
          <h2 className="text-xl font-bold text-red-500 mb-2">오류</h2>
          <p className="text-muted-foreground">{error || '데이터를 불러올 수 없습니다'}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className={`flex h-screen overflow-hidden ${isResizing ? 'select-none cursor-col-resize' : ''}`}>
        {/* 왼쪽 - 세션 목록 */}
        <div className="w-80 border-r bg-muted/10 flex-shrink-0 flex flex-col">
          {/* 헤더 */}
          <div className="p-4 border-b">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <User className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h2 className="font-semibold">{data.guest.full_name}</h2>
                <p className="text-sm text-muted-foreground">{data.guest.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {data.guest.upload_count} 세션
              </span>
              <span className="flex items-center gap-1">
                <Database className="h-3 w-3" />
                {formatFileSize(data.guest.total_file_size)}
              </span>
            </div>
          </div>

          {/* 세션 목록 타이틀 */}
          <div className="px-4 py-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              세션 목록
            </h3>
          </div>

          {/* 프로젝트별 세션 목록 */}
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-4">
              {Object.entries(sessionsByProject).map(([projectId, projectSessions]: [string, any]) => {
                const isExpanded = expandedProjects.has(projectId)
                const projectName = projectId === 'no-project' ? '프로젝트 없음' : projectId

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
                        {projectName}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {projectSessions.length}
                      </Badge>
                    </div>

                    {/* 세션 목록 */}
                    {isExpanded && (
                      <div className="ml-2 space-y-1">
                        {projectSessions.map((session: Session, idx: number) => {
                          // 첫 번째 사용자 메시지 찾기
                          let firstUserMessage = ''
                          if (session.session_content?.messages) {
                            const userMessage = session.session_content.messages.find(msg => msg.type === 'user')
                            if (userMessage?.content) {
                              const content = typeof userMessage.content === 'string'
                                ? userMessage.content
                                : JSON.stringify(userMessage.content)
                              firstUserMessage = content.length > 60
                                ? content.substring(0, 60) + '...'
                                : content
                            }
                          }

                          return (
                            <div
                              key={`${projectId}-${session.file_id || session.id || idx}`}
                              className={`
                                p-3 rounded-lg border cursor-pointer transition-colors
                                ${selectedSessionId === session.id
                                  ? 'bg-primary/10 border-primary'
                                  : 'hover:bg-muted/50'
                                }
                              `}
                              onClick={() => selectSession(session.id)}
                            >
                              <div className="space-y-2">
                                <p className="font-medium text-sm">{session.project_name}</p>

                                {firstUserMessage && (
                                  <p className="text-xs text-muted-foreground italic bg-muted/30 p-2 rounded">
                                    "{firstUserMessage}"
                                  </p>
                                )}

                                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                  <span className="flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    {session.start_time} - {session.end_time}
                                  </span>
                                </div>

                                <div className="flex items-center gap-2 text-xs">
                                  <Badge variant="secondary" className="text-xs">
                                    {session.total_messages} messages
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {session.total_tokens} tokens
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {session.prompt_count} prompts
                                  </Badge>
                                </div>
                              </div>
                            </div>
                          )
                        })}
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
                      {selectedSession.filename}
                    </h1>
                    <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Folder className="h-3 w-3" />
                        {selectedSession.project_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Database className="h-3 w-3" />
                        {formatFileSize(selectedSession.file_size)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(selectedSession.upload_time).toLocaleString('ko-KR')}
                      </span>
                      <Badge variant={selectedSession.upload_status === 'processed' ? 'default' : 'secondary'}>
                        {selectedSession.upload_status}
                      </Badge>
                    </div>
                  </div>
                </div>
              </div>

              {/* 세션 뷰어 */}
              <div className="flex-1 overflow-hidden min-h-0">
                <SessionViewer
                  lines={sessionLines}
                  loading={linesLoading}
                  sessionTitle={undefined}
                  sessionInfo={{
                    user: undefined,
                    uploadTime: selectedSession.upload_time,
                    processedLines: selectedSession.file_size
                  }}
                  locale="ko"
                  showFilter={true}
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  왼쪽에서 세션을 선택하세요
                </p>
              </div>
            </div>
          )}
        </div>

        {/* 리사이즈 핸들 */}
        <div
          className="relative w-0 flex items-center justify-center"
          onMouseDown={(e) => {
            e.preventDefault()
            setIsResizing(true)
          }}
        >
          <div className={`
            absolute h-full w-1
            ${isResizing ? 'bg-primary' : 'bg-border hover:bg-primary/50'}
            transition-colors cursor-col-resize
          `}>
            <div className="absolute inset-y-0 -left-2 -right-2 z-10" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1 h-10 bg-border rounded-full opacity-50" />
          </div>
        </div>

        {/* 오른쪽 - AI 요약 */}
        <div
          className="border-l bg-background flex-shrink-0 transition-none overflow-hidden"
          style={{
            width: `${rightPanelWidth}px`,
            willChange: isResizing ? 'width' : 'auto'
          }}
        >
          {selectedSession ? (
            <AISummaryPanel
              userId={guestUserId}
              date={selectedSession.start_timestamp
                ? new Date(selectedSession.start_timestamp).toISOString().split('T')[0]
                : new Date(selectedSession.created_at).toISOString().split('T')[0]
              }
              locale="ko"
              isGuestMode={true}
              sessions={data?.sessions
                .filter(s => s.id === selectedSession.id)
                .map(session => ({
                  id: session.id,
                  filename: session.filename,
                  project: session.project,
                  project_name: session.project_name,
                  session_content: {
                    messages: session.session_content.messages.map(msg => ({
                      type: (msg.type === 'user' || msg.type === 'assistant') ? msg.type : 'user',
                      content: msg.content,
                      timestamp: msg.timestamp
                    }))
                  }
                })) || []}
              sessionLines={sessionLines}
            />
          ) : (
            <div className="p-4">
              <h3 className="font-semibold mb-4">AI 요약</h3>
              <p className="text-sm text-muted-foreground">
                세션을 선택하면 AI 요약이 표시됩니다.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
