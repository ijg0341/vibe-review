'use client'

import { useState, useEffect } from 'react'
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
  CheckCircle2
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
  const [viewMode, setViewMode] = useState<'structured' | 'raw'>('structured')
  const [isCollapsed, setIsCollapsed] = useState(false)
  
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

      setSessionFiles(filesData || [])
      
      // 첫 번째 파일 자동 선택
      if (filesData && filesData.length > 0) {
        setSelectedFile(filesData[0])
      }
    } catch (error) {
      console.error('Error in fetchProjectData:', error)
    } finally {
      setLoading(false)
    }
  }

  // 세션 라인 조회 (페이지네이션)
  const fetchSessionLines = async (fileId: string, page: number = 1, search?: string) => {
    try {
      setLinesLoading(true)
      
      // 먼저 총 라인 수와 페이지 정보 가져오기
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
        setSessionLines([])
        return
      }
      
      setSessionLines(data || [])
      setCurrentPage(page)
    } catch (error) {
      console.error('Error in fetchSessionLines:', error)
      setSessionLines([])
    } finally {
      setLinesLoading(false)
    }
  }

  // 파일 선택 시 세션 라인 로드
  useEffect(() => {
    if (selectedFile?.id) {
      setCurrentPage(1)
      fetchSessionLines(selectedFile.id, 1, searchQuery)
    }
  }, [selectedFile?.id])

  // 검색어 변경 시 디바운스 처리
  useEffect(() => {
    if (!selectedFile?.id) return
    
    const timer = setTimeout(() => {
      setCurrentPage(1)
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
        <Badge variant="success" className="text-xs">
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
              {/* 헤더 */}
              <div className="flex items-center justify-between p-4 border-b bg-background">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/my-prompts')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {locale === 'ko' ? '돌아가기' : 'Back'}
              </Button>
              <div>
                <h1 className="text-2xl font-bold">{project?.project_name}</h1>
                <p className="text-sm text-muted-foreground">
                  {sessionFiles.length} {locale === 'ko' ? '개의 세션 파일' : 'session files'}
                </p>
              </div>
            </div>
            <Badge variant="secondary">
              <Folder className="h-3 w-3 mr-1" />
              {locale === 'ko' ? '프로젝트' : 'Project'}
            </Badge>
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
                          <div className="flex items-start gap-3">
                            <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium break-all">{file.file_name}</p>
                              <div className="flex items-center gap-2">
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
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {selectedFile ? selectedFile.file_name : (locale === 'ko' ? '세션 내용' : 'Session Content')}
                    </h2>
                    {selectedFile && (
                      <p className="text-sm text-muted-foreground mt-1">
                        {locale === 'ko' ? `${totalLines}개 라인` : `${totalLines} lines`} • 
                        {locale === 'ko' ? ` ${totalPages}페이지` : ` ${totalPages} pages`}
                      </p>
                    )}
                  </div>
                  {selectedFile && (
                    <div className="flex items-center gap-2">
                      <Button
                        variant={viewMode === 'structured' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('structured')}
                      >
                        {locale === 'ko' ? '구조화' : 'Structured'}
                      </Button>
                      <Button
                        variant={viewMode === 'raw' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('raw')}
                      >
                        {locale === 'ko' ? '원본' : 'Raw'}
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex-1 flex flex-col overflow-hidden p-4">
                {selectedFile ? (
                  <div className="flex flex-col h-full">
                    {/* 검색 바 */}
                    <div className="relative mb-4">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder={locale === 'ko' ? '내용 검색...' : 'Search content...'}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
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
                        <div className="flex-1 overflow-y-auto pr-2">
                          <SessionViewerV2 
                            lines={sessionLines}
                            viewMode={viewMode}
                            locale={locale}
                          />
                        </div>

                        {/* 페이지네이션 */}
                        {totalPages > 1 && (
                          <div className="flex items-center justify-between pt-4 mt-4 border-t">
                            <p className="text-sm text-muted-foreground">
                              {locale === 'ko' 
                                ? `페이지 ${currentPage} / ${totalPages}` 
                                : `Page ${currentPage} of ${totalPages}`}
                            </p>
                            <div className="flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchSessionLines(selectedFile.id, currentPage - 1, searchQuery)}
                                disabled={currentPage <= 1}
                              >
                                <ChevronLeft className="h-4 w-4" />
                                {locale === 'ko' ? '이전' : 'Previous'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => fetchSessionLines(selectedFile.id, currentPage + 1, searchQuery)}
                                disabled={currentPage >= totalPages}
                              >
                                {locale === 'ko' ? '다음' : 'Next'}
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        )}
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