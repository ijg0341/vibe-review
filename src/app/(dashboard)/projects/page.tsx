'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { useProjects } from '@/hooks/use-api'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { 
  FolderPlus,
  Search,
  Users,
  Clock,
  Folder,
  FileText,
  ChevronRight,
  Plus,
  FolderOpen
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'
import { CreateProjectModal } from '@/components/projects/create-project-modal'

// API 서버 기반 프로젝트 타입 (uploaded_files 기반)
interface Project {
  id: string
  name: string
  description?: string
  file_count: number
  total_size: number
  last_updated: string
  tool_name: string
}

export default function ProjectsPage() {
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [createModalOpen, setCreateModalOpen] = useState(false)
  
  const router = useRouter()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const { projects, total, loading, error, fetchProjects } = useProjects()

  // 검색 필터링
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredProjects(projects)
      return
    }

    const filtered = projects.filter(project => 
      project.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (project.description && project.description.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    setFilteredProjects(filtered)
  }, [searchQuery, projects])

  // 프로젝트 목록 로드 함수 메모이제이션
  const loadProjects = useCallback(() => {
    fetchProjects({ page: 1, limit: 50 })
  }, [fetchProjects])

  // 프로젝트 목록 로드
  useEffect(() => {
    loadProjects()
  }, [loadProjects])

  // 에러 처리  
  useEffect(() => {
    if (error) {
      console.error('Projects API Error:', error)
    }
  }, [error])

  // 날짜 포맷팅
  const formatDate = (dateString: string | null) => {
    if (!dateString) return locale === 'ko' ? '활동 없음' : 'No activity'
    const date = new Date(dateString)
    return formatDistanceToNow(date, {
      addSuffix: true,
      locale: locale === 'ko' ? ko : enUS
    })
  }


  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* 헤더 */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <Folder className="h-8 w-8" />
                {locale === 'ko' ? '프로젝트' : 'Projects'}
              </h1>
              <p className="text-muted-foreground">
                {locale === 'ko' 
                  ? '프로젝트를 관리하고 팀과 협업하세요' 
                  : 'Manage projects and collaborate with your team'
                }
              </p>
            </div>
            <Button onClick={() => setCreateModalOpen(true)}>
              <FolderPlus className="mr-2 h-4 w-4" />
              {locale === 'ko' ? '새 프로젝트' : 'New Project'}
            </Button>
          </div>

          {/* 통계 카드 - API 서버 스키마에 맞게 수정 */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {locale === 'ko' ? '총 프로젝트' : 'Total Projects'}
                </CardTitle>
                <Folder className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{total || projects.length}</div>
                <p className="text-xs text-muted-foreground">
                  {locale === 'ko' ? '활성 프로젝트' : 'Active projects'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {locale === 'ko' ? '총 파일' : 'Total Files'}
                </CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {projects.reduce((total, p) => total + (p.file_count || 0), 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {locale === 'ko' ? '업로드된 파일' : 'Uploaded files'}
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {locale === 'ko' ? '총 용량' : 'Total Size'}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {(projects.reduce((total, p) => total + (p.total_size || 0), 0) / 1024 / 1024).toFixed(1)}MB
                </div>
                <p className="text-xs text-muted-foreground">
                  {locale === 'ko' ? '파일 총 크기' : 'Total file size'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* 프로젝트 목록 */}
          <Card className="border-border/50">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>{locale === 'ko' ? '프로젝트 목록' : 'Project List'}</CardTitle>
                  <CardDescription>
                    {locale === 'ko' ? '참여 중인 모든 프로젝트' : 'All projects you are participating in'}
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
                      {locale === 'ko' ? '프로젝트를 불러오는 중...' : 'Loading projects...'}
                    </p>
                  </div>
                </div>
              ) : filteredProjects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium">
                    {searchQuery ? 
                      (locale === 'ko' ? '검색 결과가 없습니다' : 'No search results') :
                      (locale === 'ko' ? '프로젝트가 없습니다' : 'No projects yet')
                    }
                  </h3>
                  <p className="text-muted-foreground mt-2">
                    {searchQuery ? 
                      (locale === 'ko' ? '다른 키워드로 검색해보세요' : 'Try searching with different keywords') :
                      (locale === 'ko' ? '새 프로젝트를 만들어 시작하세요' : 'Create a new project to get started')
                    }
                  </p>
                  {!searchQuery && (
                    <Button className="mt-4" onClick={() => setCreateModalOpen(true)}>
                      <Plus className="mr-2 h-4 w-4" />
                      {locale === 'ko' ? '첫 프로젝트 만들기' : 'Create First Project'}
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {filteredProjects.map((project) => (
                    <Card 
                      key={project.id} 
                      className="hover:shadow-lg transition-all cursor-pointer group"
                      onClick={() => router.push(`/projects/${project.id}`)}
                    >
                      <CardContent className="p-5">
                        <div className="space-y-3">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarFallback className="bg-primary/10">
                                  <Folder className="h-5 w-5 text-primary" />
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 min-w-0">
                                <h3 className="font-semibold text-base truncate">{project.name}</h3>
                                {project.description && (
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {project.description}
                                  </p>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <FileText className="h-3 w-3" />
                              {project.file_count || 0}
                            </span>
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {project.tool_name}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formatDate(project.last_updated)}
                            </span>
                          </div>

                          <div className="pt-2 border-t space-y-1">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {locale === 'ko' ? 'AI 도구' : 'AI Tool'}
                              </span>
                              <span className="font-medium truncate max-w-[150px]">
                                {project.tool_name || 'Unknown'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-muted-foreground">
                                {locale === 'ko' ? '파일 크기' : 'File Size'}
                              </span>
                              <span className="font-medium truncate max-w-[150px]">
                                {((project.total_size || 0) / 1024 / 1024).toFixed(1)}MB
                              </span>
                            </div>
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

      {/* 프로젝트 생성 모달 */}
      <CreateProjectModal 
        open={createModalOpen} 
        onOpenChange={setCreateModalOpen}
        onProjectCreated={() => {
          loadProjects()
          setCreateModalOpen(false)
        }}
      />
    </ProtectedRoute>
  )
}