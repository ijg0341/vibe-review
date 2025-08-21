'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { Sidebar } from '@/components/layout/sidebar'
import { Header } from '@/components/layout/header'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  FileText, 
  ArrowLeft,
  Clock,
  Download,
  Eye,
  Folder,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Filter,
  User,
  Bot,
  Terminal,
  Brain,
  Wrench
} from 'lucide-react'
import { SessionViewerV2 } from '@/components/session-viewer/SessionViewerV2'

interface Project {
  id: string
  project_name: string
  project_path: string
  session_count: number
  uploaded_at: string
}

interface SessionFile {
  id: string
  file_name: string
  file_path: string
  file_size: number
  uploaded_at: string
  processing_status?: string
  processed_lines?: number
  firstMessage?: string // 첫 번째 대화 내용
  sessionTimestamp?: number // 세션 타임스탬프 (정렬용)
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

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const projectId = params.projectId as string
  
  const [project, setProject] = useState<Project | null>(null)
  const [sessionFiles, setSessionFiles] = useState<SessionFile[]>([])
  const [selectedFile, setSelectedFile] = useState<SessionFile | null>(null)
  const [sessionLines, setSessionLines] = useState<SessionLine[]>([])
  const [loading, setLoading] = useState(true)
  const [linesLoading, setLinesLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalLines, setTotalLines] = useState(0)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)
  const [messageTypeFilter, setMessageTypeFilter] = useState<string[]>([]) // 빈 배열 = 모두 표시
  const [allSessionLines, setAllSessionLines] = useState<SessionLine[]>([]) // 필터링 전 전체 데이터
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const supabase = createClient()
  
  const ITEMS_PER_PAGE = 50

  // 프로젝트 정보 및 파일 목록 조회
  const fetchProjectData = async () => {
    if (!user?.id || !projectId) return

    try {
      setLoading(true)
      
      // 프로젝트 정보 조회
      const { data: projectData, error: projectError } = await supabase
        .from('uploads')
        .select('*')
        .eq('id', projectId)
        .eq('user_id', user.id)
        .single()

      if (projectError) {
        console.error('Error fetching project:', projectError)
        router.push('/my-prompts')
        return
      }

      setProject(projectData)

      // 세션 파일 목록 조회
      const { data: filesData, error: filesError } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('upload_id', projectId)
        .order('uploaded_at', { ascending: false })

      if (filesError) {
        console.error('Error fetching files:', filesError)
        return
      }

      // 각 파일의 첫 번째 대화와 타임스탬프 가져오기
      const filesWithMetadata = await Promise.all(
        (filesData || []).map(async (file) => {
          try {
            // 첫 번째와 마지막 라인 가져오기 (타임스탬프 확인용)
            const [firstLineResult, lastLineResult] = await Promise.all([
              supabase
                .from('session_lines')
                .select('content')
                .eq('file_id', file.id)
                .order('line_number', { ascending: true })
                .limit(1)
                .single(),
              supabase
                .from('session_lines')
                .select('content')
                .eq('file_id', file.id)
                .order('line_number', { ascending: false })
                .limit(1)
                .single()
            ])
            
            let firstMessage = ''
            let sessionTimestamp = 0
            
            // 마지막 메시지의 타임스탬프 추출 (최신 세션 판단용)
            if (lastLineResult.data?.content) {
              const lastContent = lastLineResult.data.content
              // 타임스탬프 추출
              if (lastContent.timestamp) {
                sessionTimestamp = new Date(lastContent.timestamp).getTime()
              }
            }
            
            // 타임스탬프가 없으면 파일명에서 추출 시도
            if (!sessionTimestamp) {
              // 파일명 패턴 분석 (예: 2024-01-15_14-30-00.jsonl 또는 session_1705324200000.jsonl)
              const dateMatch = file.file_name.match(/(\d{4})[-_](\d{2})[-_](\d{2})[-_]?(\d{2})?[-:]?(\d{2})?[-:]?(\d{2})?/)
              if (dateMatch) {
                const [_, year, month, day, hour = '00', minute = '00', second = '00'] = dateMatch
                sessionTimestamp = new Date(`${year}-${month}-${day}T${hour}:${minute}:${second}`).getTime()
              } else {
                // 타임스탬프 숫자 패턴 찾기
                const timestampMatch = file.file_name.match(/(\d{10,13})/)
                if (timestampMatch) {
                  sessionTimestamp = parseInt(timestampMatch[1])
                  // 10자리면 초 단위이므로 밀리초로 변환
                  if (sessionTimestamp < 10000000000) {
                    sessionTimestamp *= 1000
                  }
                }
              }
            }
            
            // 그래도 없으면 uploaded_at 사용
            if (!sessionTimestamp) {
              sessionTimestamp = new Date(file.uploaded_at).getTime()
            }
            
            // 첫 번째 메시지 추출
            if (firstLineResult.data?.content) {
              const content = firstLineResult.data.content
              
              // 사용자 메시지인 경우
              if (content.type === 'user' && content.message?.content) {
                const msgContent = content.message.content
                if (typeof msgContent === 'string') {
                  firstMessage = msgContent
                } else if (Array.isArray(msgContent)) {
                  const textContent = msgContent.find(item => item.type === 'text')
                  if (textContent?.text) {
                    firstMessage = textContent.text
                  }
                }
              }
              // Assistant 메시지인 경우
              else if (content.type === 'assistant' && content.message?.content) {
                const msgContent = content.message.content
                if (Array.isArray(msgContent)) {
                  const textContent = msgContent.find(item => item.type === 'text')
                  if (textContent?.text) {
                    firstMessage = textContent.text
                  }
                }
              }
              
              // 긴 텍스트 잘라내기
              if (firstMessage.length > 100) {
                firstMessage = firstMessage.substring(0, 100) + '...'
              }
            }
            
            return { ...file, firstMessage, sessionTimestamp }
          } catch (error) {
            console.error('Error fetching metadata for file:', file.id, error)
            return { ...file, sessionTimestamp: new Date(file.uploaded_at).getTime() }
          }
        })
      )

      // 세션 타임스탬프로 정렬 (최신이 먼저)
      const sortedFiles = filesWithMetadata.sort((a, b) => {
        return (b.sessionTimestamp || 0) - (a.sessionTimestamp || 0)
      })

      setSessionFiles(sortedFiles)
      
      // 첫 번째 파일 자동 선택 (정렬된 파일 중 첫 번째)
      if (sortedFiles && sortedFiles.length > 0) {
        setSelectedFile(sortedFiles[0])
      }
    } catch (error) {
      console.error('Error in fetchProjectData:', error)
    } finally {
      setLoading(false)
    }
  }

  // 세션 라인 조회 (무한 스크롤)
  const fetchSessionLines = async (fileId: string, page: number = 1, search?: string, append: boolean = false) => {
    try {
      if (!append) {
        setLinesLoading(true)
      } else {
        setIsLoadingMore(true)
      }
      
      // 먼저 총 라인 수와 페이지 정보 가져오기
      if (page === 1) {
        const { data: infoData, error: infoError } = await supabase
          .rpc('get_session_lines_info', {
            p_file_id: fileId,
            p_search: search || null
          })
        
        if (infoError) {
          console.error('Error fetching lines info:', infoError)
          return
        }
        
        if (infoData && infoData.length > 0) {
          setTotalLines(infoData[0].total_lines)
          setTotalPages(infoData[0].total_pages)
        }
      }
      
      // 실제 라인 데이터 가져오기
      const { data, error } = await supabase
        .rpc('get_session_lines', {
          p_file_id: fileId,
          p_page: page,
          p_limit: ITEMS_PER_PAGE,
          p_search: search || null
        })
      
      if (error) {
        console.error('Error fetching session lines:', error)
        if (!append) setSessionLines([])
        return
      }
      
      if (data) {
        if (append) {
          setAllSessionLines(prev => [...prev, ...data])
          setSessionLines(prev => [...prev, ...data])
        } else {
          setAllSessionLines(data)
          setSessionLines(data)
        }
        setHasMore(data.length === ITEMS_PER_PAGE && page < totalPages)
      } else {
        if (!append) {
          setAllSessionLines([])
          setSessionLines([])
        }
        setHasMore(false)
      }
      
      setCurrentPage(page)
    } catch (error) {
      console.error('Error in fetchSessionLines:', error)
      if (!append) setSessionLines([])
    } finally {
      setLinesLoading(false)
      setIsLoadingMore(false)
    }
  }
  
  // 더 많은 데이터 로드
  const loadMore = () => {
    if (!isLoadingMore && hasMore && selectedFile) {
      fetchSessionLines(selectedFile.id, currentPage + 1, searchQuery, true)
    }
  }

  // 메시지 타입 추출 함수
  const getMessageType = (line: SessionLine): string => {
    const data = line.content || {}
    
    if (data.type === 'user') {
      const content = data.message?.content
      if (Array.isArray(content) && content.some(item => item.type === 'tool_result')) {
        return 'tool_result'
      }
      return 'user_text'
    }
    
    if (data.type === 'assistant') {
      const content = data.message?.content
      if (Array.isArray(content)) {
        if (content.some(item => item.type === 'thinking')) return 'thinking'
        if (content.some(item => item.type === 'tool_use')) return 'tool_use'
        if (content.some(item => item.type === 'text')) return 'assistant_text'
      }
    }
    
    return 'other'
  }
  
  // 필터링 effect
  useEffect(() => {
    if (messageTypeFilter.length === 0) {
      // 필터가 없으면 전체 표시
      setSessionLines(allSessionLines)
    } else {
      // 필터링 적용
      const filtered = allSessionLines.filter(line => {
        const type = getMessageType(line)
        return messageTypeFilter.includes(type)
      })
      setSessionLines(filtered)
    }
  }, [messageTypeFilter, allSessionLines])
  
  // 파일 선택 시 세션 라인 로드
  useEffect(() => {
    if (selectedFile?.id) {
      setCurrentPage(1)
      setHasMore(true)
      setSessionLines([])
      setAllSessionLines([])
      setMessageTypeFilter([]) // 필터 초기화
      fetchSessionLines(selectedFile.id, 1, searchQuery)
    }
  }, [selectedFile?.id])

  // 검색어 변경 시 디바운스 처리
  useEffect(() => {
    if (!selectedFile?.id) return
    
    const timer = setTimeout(() => {
      setCurrentPage(1)
      setHasMore(true)
      setSessionLines([])
      fetchSessionLines(selectedFile.id, 1, searchQuery)
    }, 500)
    
    return () => clearTimeout(timer)
  }, [searchQuery])

  useEffect(() => {
    fetchProjectData()
  }, [user?.id, projectId])

  // 날짜 포맷팅
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B'
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  }


  // 처리 상태 배지
  const ProcessingStatusBadge = ({ status, processedLines }: { status?: string; processedLines?: number }) => {
    if (status === 'completed') {
      return (
        <Badge variant="default" className="text-xs">
          <CheckCircle2 className="h-3 w-3 mr-1" />
          {processedLines} lines
        </Badge>
      )
    } else if (status === 'processing') {
      return (
        <Badge variant="secondary" className="text-xs">
          <Loader2 className="h-3 w-3 mr-1 animate-spin" />
          Processing...
        </Badge>
      )
    } else if (status === 'error') {
      return (
        <Badge variant="destructive" className="text-xs">
          <AlertCircle className="h-3 w-3 mr-1" />
          Error
        </Badge>
      )
    }
    return null
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex h-screen overflow-hidden">
          <Sidebar 
            isCollapsed={isCollapsed} 
            onToggle={() => setIsCollapsed(!isCollapsed)} 
          />
          <div className="flex flex-1 flex-col overflow-hidden">
            <Header />
            <main className="flex-1 overflow-auto bg-muted/10">
              <div className="flex items-center justify-center min-h-[60vh]">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    {locale === 'ko' ? '프로젝트를 불러오는 중...' : 'Loading project...'}
                  </p>
                </div>
              </div>
            </main>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="flex h-screen overflow-hidden">
        <Sidebar 
          isCollapsed={isCollapsed} 
          onToggle={() => setIsCollapsed(!isCollapsed)} 
        />
        <div className="flex flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-hidden bg-muted/10">
            <div className="flex flex-col h-full">
              {/* 컴팩트한 헤더 */}
              <div className="flex items-center justify-between px-4 py-2 border-b bg-background">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2"
                onClick={() => router.push('/my-prompts')}
              >
                <ArrowLeft className="h-3 w-3 mr-1" />
                {locale === 'ko' ? '뒤로' : 'Back'}
              </Button>
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-muted-foreground" />
                <h1 className="text-base font-semibold">{project?.project_name}</h1>
                <span className="text-sm text-muted-foreground">
                  ({sessionFiles.length} files)
                </span>
              </div>
            </div>
              </div>

              <div className="flex flex-1 overflow-hidden">
            {/* 파일 목록 - 왼쪽 사이드바 */}
            <div className="w-80 border-r bg-muted/10 flex flex-col">
              <div className="p-4 border-b">
                <h2 className="text-lg font-semibold">
                  {locale === 'ko' ? '세션 파일' : 'Session Files'}
                </h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {locale === 'ko' ? '파일을 선택하여 내용을 확인하세요' : 'Select a file to view its content'}
                </p>
              </div>
              <div className="flex-1 overflow-y-auto p-4">
                <div className="space-y-2">
                  {sessionFiles.length === 0 ? (
                    <div className="text-center py-8">
                      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {locale === 'ko' ? '세션 파일이 없습니다' : 'No session files'}
                      </p>
                    </div>
                  ) : (
                    sessionFiles.map((file) => (
                      <div
                        key={file.id}
                        onClick={() => setSelectedFile(file)}
                        className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                          selectedFile?.id === file.id ? 'bg-muted/50 border-primary' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 w-full">
                            <FileText className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
                            <div className="space-y-1 flex-1 min-w-0">
                              {/* 첫 번째 대화 내용 표시 */}
                              {file.firstMessage ? (
                                <p className="text-sm font-medium overflow-hidden" 
                                   style={{ 
                                     display: '-webkit-box',
                                     WebkitLineClamp: 2,
                                     WebkitBoxOrient: 'vertical',
                                     overflow: 'hidden'
                                   }}>
                                  {file.firstMessage}
                                </p>
                              ) : (
                                <p className="text-sm font-medium text-muted-foreground italic">
                                  {locale === 'ko' ? '내용 없음' : 'No content'}
                                </p>
                              )}
                              {/* 파일 정보 */}
                              <div className="flex items-center gap-2 flex-wrap">
                                {/* 세션 시간 표시 */}
                                {file.sessionTimestamp && (
                                  <span className="text-xs text-muted-foreground">
                                    <Clock className="inline h-3 w-3 mr-1" />
                                    {new Date(file.sessionTimestamp).toLocaleString(
                                      locale === 'ko' ? 'ko-KR' : 'en-US', 
                                      { 
                                        month: 'short', 
                                        day: 'numeric', 
                                        hour: '2-digit', 
                                        minute: '2-digit' 
                                      }
                                    )}
                                  </span>
                                )}
                                <span className="text-xs text-muted-foreground truncate">
                                  {file.file_name}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  {formatFileSize(file.file_size)}
                                </span>
                                <ProcessingStatusBadge 
                                  status={file.processing_status} 
                                  processedLines={file.processed_lines}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* 세션 내용 뷰어 - 오른쪽 메인 영역 */}
            <div className="flex-1 flex flex-col overflow-hidden">
              <div className="flex-1 flex flex-col overflow-hidden p-4">
                {selectedFile ? (
                  <div className="flex flex-col h-full">
                    {/* 검색 바와 필터 */}
                    <div className="space-y-3 mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={locale === 'ko' ? '내용 검색...' : 'Search content...'}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                      
                      {/* 메시지 타입 필터 버튼들 */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Filter className="h-3 w-3" />
                          {locale === 'ko' ? '필터:' : 'Filter:'}
                        </span>
                        
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
                          <Bot className="h-3 w-3 mr-1" />
                          Claude
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
                          <Wrench className="h-3 w-3 mr-1" />
                          {locale === 'ko' ? '도구' : 'Tools'}
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
                          <Terminal className="h-3 w-3 mr-1" />
                          {locale === 'ko' ? '결과' : 'Results'}
                        </Button>
                        
                        <Button
                          variant={messageTypeFilter.includes('thinking') ? 'default' : 'outline'}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => {
                            setMessageTypeFilter(prev => 
                              prev.includes('thinking') 
                                ? prev.filter(t => t !== 'thinking')
                                : [...prev, 'thinking']
                            )
                          }}
                        >
                          <Brain className="h-3 w-3 mr-1" />
                          {locale === 'ko' ? '사고' : 'Thinking'}
                        </Button>
                        
                        {messageTypeFilter.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs text-muted-foreground"
                            onClick={() => setMessageTypeFilter([])}
                          >
                            {locale === 'ko' ? '필터 초기화' : 'Clear filters'}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* 콘텐츠 영역 */}
                    {linesLoading ? (
                      <div className="flex items-center justify-center flex-1">
                        <div className="text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto mb-2" />
                          <p className="text-sm text-muted-foreground">
                            {locale === 'ko' ? '로딩 중...' : 'Loading...'}
                          </p>
                        </div>
                      </div>
                    ) : sessionLines.length > 0 ? (
                      <>
                        <div 
                          className="flex-1 overflow-y-auto pr-2"
                          onScroll={(e) => {
                            const target = e.currentTarget
                            const threshold = 100
                            if (
                              target.scrollHeight - target.scrollTop - target.clientHeight < threshold &&
                              hasMore &&
                              !isLoadingMore
                            ) {
                              loadMore()
                            }
                          }}
                        >
                          <SessionViewerV2 
                            lines={sessionLines}
                            viewMode="structured"
                            locale={locale}
                          />
                          
                          {/* 더 로드 중 표시기 */}
                          {isLoadingMore && (
                            <div className="flex items-center justify-center py-4">
                              <Loader2 className="h-5 w-5 animate-spin mr-2" />
                              <span className="text-sm text-muted-foreground">
                                {locale === 'ko' ? '더 불러오는 중...' : 'Loading more...'}
                              </span>
                            </div>
                          )}
                          
                          {/* 모든 데이터 로드 완료 */}
                          {!hasMore && sessionLines.length > 0 && (
                            <div className="text-center py-4 text-sm text-muted-foreground">
                              {locale === 'ko' ? '모든 내용을 불러왔습니다' : 'All content loaded'}
                            </div>
                          )}
                        </div>

                        {/* 하단 정보 바 */}
                        <div className="flex items-center justify-between pt-3 mt-3 border-t text-sm text-muted-foreground">
                          <div>
                            {selectedFile && (
                              <span className="font-medium">{selectedFile.file_name}</span>
                            )}
                            <span className="mx-2">•</span>
                            {locale === 'ko' 
                              ? `${totalLines}개 라인` 
                              : `${totalLines} lines`}
                            {currentPage > 1 && (
                              <>
                                <span className="mx-2">•</span>
                                {locale === 'ko' 
                                  ? `${currentPage}페이지 로드됨` 
                                  : `Page ${currentPage} loaded`}
                              </>
                            )}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center flex-1">
                        <div className="text-center">
                          <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                          <p className="text-muted-foreground">
                            {searchQuery 
                              ? (locale === 'ko' ? '검색 결과가 없습니다' : 'No search results')
                              : (selectedFile.processing_status === 'pending' || selectedFile.processing_status === 'processing'
                                ? (locale === 'ko' ? '파일을 처리 중입니다...' : 'Processing file...')
                                : (locale === 'ko' ? '내용이 없습니다' : 'No content available'))
                            }
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center flex-1">
                    <div className="text-center">
                      <Eye className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {locale === 'ko' ? '파일을 선택하여 내용을 확인하세요' : 'Select a file to view its content'}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  )
}