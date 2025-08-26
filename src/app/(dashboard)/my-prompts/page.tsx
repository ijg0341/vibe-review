'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  FileText, 
  Search, 
  Calendar, 
  Folder,
  Eye,
  Clock
} from 'lucide-react'

interface ProjectWithSessions {
  id: string
  name: string
  folder_path: string
  description?: string
  owner_id: string
  created_at: string
  sessions?: ProjectSession[]
  last_modified?: string // 가장 최근 세션의 업로드일
}

interface ProjectSession {
  id: string
  project_id: string
  user_id: string
  session_name?: string
  session_count: number
  uploaded_at: string
  metadata?: any
}

export default function MyPromptsPage() {
  const [projects, setProjects] = useState<ProjectWithSessions[]>([])
  const [filteredProjects, setFilteredProjects] = useState<ProjectWithSessions[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(true)
  
  const router = useRouter()
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const supabase = createClient()

  // 프로젝트 및 세션 목록 조회
  const fetchUploads = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      // 사용자가 멤버인 프로젝트 목록 조회
      const { data: memberData, error: memberError } = await supabase
        .from('project_members')
        .select('project_id')
        .eq('user_id', user.id)

      if (memberError) {
        console.error('Error fetching project members:', memberError)
        return
      }

      const projectIds = memberData?.map(m => m.project_id) || []
      
      if (projectIds.length === 0) {
        setProjects([])
        setFilteredProjects([])
        return
      }

      // 프로젝트 정보 조회
      const { data: projectsData, error: projectsError } = await supabase
        .from('projects')
        .select('*')
        .in('id', projectIds)
        .order('created_at', { ascending: false })

      if (projectsError) {
        console.error('Error fetching projects:', projectsError)
        return
      }

      // 각 프로젝트의 세션 목록도 함께 조회
      const projectsWithSessions = await Promise.all(
        (projectsData || []).map(async (project) => {
          const { data: sessionsData } = await supabase
            .from('project_sessions')
            .select('*')
            .eq('project_id', project.id)
            .order('uploaded_at', { ascending: false })

          // 가장 최근 세션의 uploaded_at을 last_modified로 사용
          const lastModified = sessionsData && sessionsData.length > 0 
            ? sessionsData[0].uploaded_at 
            : project.created_at

          return {
            ...project,
            sessions: sessionsData || [],
            last_modified: lastModified
          }
        })
      )

      setProjects(projectsWithSessions)
      setFilteredProjects(projectsWithSessions)
    } catch (error) {
      console.error('Error in fetchUploads:', error)
    } finally {
      setLoading(false)
    }
  }

  // 검색 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projects)
      return
    }

    const filtered = projects.filter(project => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.folder_path.toLowerCase().includes(searchQuery.toLowerCase()) ||
      project.sessions?.some(session => 
        session.session_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    )
    setFilteredProjects(filtered)
  }, [searchQuery, projects])

  useEffect(() => {
    fetchUploads()
  }, [user?.id])

  // 날짜 포맷팅 (YYYY-MM-DD 형식)
  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    })
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold">{t.sidebar.myPrompts}</h1>
              <p className="text-muted-foreground">
                {locale === 'ko' 
                  ? '업로드한 Claude Code 세션들을 확인하고 관리하세요' 
                  : 'View and manage your uploaded Claude Code sessions'
                }
              </p>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {locale === 'ko' ? '총 프로젝트' : 'Total Projects'}
                </CardTitle>
                <Folder className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{projects.length}</div>
                <p className="text-xs text-muted-foreground">
                  {locale === 'ko' ? '업로드된 프로젝트' : 'Uploaded projects'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {locale === 'ko' ? '총 세션' : 'Total Sessions'}
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {projects.reduce((total, project) => total + (project.sessions?.length || 0), 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {locale === 'ko' ? 'JSONL 파일' : 'JSONL files'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {locale === 'ko' ? '최근 업로드' : 'Recent Upload'}
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {projects.length > 0 && projects[0].last_modified ? formatDate(projects[0].last_modified) : '-'}
                </div>
                <p className="text-xs text-muted-foreground">
                  {projects.length > 0 ? projects[0].name : (locale === 'ko' ? '프로젝트 없음' : 'No projects')}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 메인 콘텐츠 */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{locale === 'ko' ? '내 프로젝트' : 'My Projects'}</CardTitle>
                  <CardDescription>
                    {locale === 'ko' ? '업로드된 Claude Code 세션들' : 'Your uploaded Claude Code sessions'}
                  </CardDescription>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder={locale === 'ko' ? '프로젝트 검색...' : 'Search projects...'}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                    <p className="text-muted-foreground">
                      {locale === 'ko' ? '프롬프트를 불러오는 중...' : 'Loading prompts...'}
                    </p>
                  </div>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">
                    {searchQuery ? 
                      (locale === 'ko' ? '검색 결과가 없습니다' : 'No search results') :
                      (locale === 'ko' ? '업로드된 프롬프트가 없습니다' : 'No prompts uploaded yet')
                    }
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    {searchQuery ? 
                      (locale === 'ko' ? '다른 키워드로 검색해보세요' : 'Try searching with different keywords') :
                      (locale === 'ko' ? '위의 업로드 버튼을 눌러 Claude Code 히스토리를 업로드해보세요' : 'Click the upload button above to upload your Claude Code history')
                    }
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredProjects.map((project) => (
                    <Card 
                      key={project.id} 
                      className="hover:shadow-lg transition-shadow cursor-pointer"
                      onClick={() => router.push(`/my-prompts/${project.id}`)}
                    >
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <Avatar className="h-10 w-10">
                            <AvatarFallback className="text-xs">
                              <Folder className="h-4 w-4" />
                            </AvatarFallback>
                          </Avatar>
                          <Badge variant="secondary" className="text-xs">
                            {project.sessions?.length || 0} {locale === 'ko' ? '세션' : 'sessions'}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        <h3 className="font-semibold text-lg truncate" title={project.name}>
                          {project.name}
                        </h3>
                        <div className="space-y-1 text-sm text-muted-foreground">
                          <div className="flex items-center gap-2">
                            <FileText className="h-3 w-3" />
                            <span>{project.sessions?.length || 0} {locale === 'ko' ? '세션' : 'sessions'}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3" />
                            <span>
                              {locale === 'ko' ? '최근 수정' : 'Last modified'}: {formatDate(project.last_modified || project.created_at)}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>

    </ProtectedRoute>
  )
}