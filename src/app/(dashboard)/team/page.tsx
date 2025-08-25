'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  Users, 
  Search,
  Folder,
  FileText,
  Calendar,
  Clock,
  ChevronRight,
  User,
  Mail,
  Loader2,
  FolderOpen,
  ArrowRight
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'

interface TeamMember {
  id: string
  email: string
  display_name?: string
  avatar_url?: string
  created_at: string
  project_count?: number
  last_upload?: string
}

interface Project {
  id: string
  project_name: string
  project_path: string
  session_count: number
  uploaded_at: string
  user_id: string
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [memberProjects, setMemberProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [projectsLoading, setProjectsLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const supabase = createClient()
  const router = useRouter()

  // 팀 멤버 목록 가져오기
  const fetchTeamMembers = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      // profiles 테이블에서 모든 사용자 가져오기 (본인 포함)
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false })

      if (profilesError) {
        console.error('Error fetching profiles:', profilesError)
        return
      }

      // 각 사용자의 프로젝트 수와 마지막 업로드 시간 가져오기
      const membersWithStats = await Promise.all(
        (profiles || []).map(async (profile) => {
          try {
            // 프로젝트 수와 마지막 업로드 시간 조회
            const { data: uploads, error: uploadsError } = await supabase
              .from('uploads')
              .select('uploaded_at')
              .eq('user_id', profile.id)
              .order('uploaded_at', { ascending: false })

            if (uploadsError) {
              console.error('Error fetching uploads for user:', profile.id, uploadsError)
              return {
                ...profile,
                project_count: 0,
                last_upload: null
              }
            }

            return {
              ...profile,
              project_count: uploads?.length || 0,
              last_upload: uploads?.[0]?.uploaded_at || null
            }
          } catch (error) {
            console.error('Error fetching stats for user:', profile.id, error)
            return {
              ...profile,
              project_count: 0,
              last_upload: null
            }
          }
        })
      )

      setTeamMembers(membersWithStats)
    } catch (error) {
      console.error('Error in fetchTeamMembers:', error)
    } finally {
      setLoading(false)
    }
  }

  // 선택한 멤버의 프로젝트 가져오기
  const fetchMemberProjects = async (memberId: string) => {
    try {
      setProjectsLoading(true)
      
      const { data: projects, error } = await supabase
        .from('uploads')
        .select('*')
        .eq('user_id', memberId)
        .order('uploaded_at', { ascending: false })

      if (error) {
        console.error('Error fetching member projects:', error)
        return
      }

      setMemberProjects(projects || [])
    } catch (error) {
      console.error('Error in fetchMemberProjects:', error)
    } finally {
      setProjectsLoading(false)
    }
  }

  // 멤버 선택 핸들러
  const handleSelectMember = (member: TeamMember) => {
    setSelectedMember(member)
    fetchMemberProjects(member.id)
  }

  // 프로젝트 상세 페이지로 이동
  const handleViewProject = (projectId: string) => {
    // 팀 프로젝트 보기용 별도 경로 사용
    router.push(`/team/${selectedMember?.id}/${projectId}`)
  }

  useEffect(() => {
    fetchTeamMembers()
  }, [user?.id])

  // 필터링된 멤버 목록
  const filteredMembers = teamMembers.filter(member => {
    const query = searchQuery.toLowerCase()
    return (
      member.email.toLowerCase().includes(query) ||
      member.display_name?.toLowerCase().includes(query)
    )
  })

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

  if (loading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                {locale === 'ko' ? '팀 멤버를 불러오는 중...' : 'Loading team members...'}
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
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Users className="h-8 w-8" />
              {locale === 'ko' ? '팀' : 'Team'}
            </h1>
            <p className="text-muted-foreground">
              {locale === 'ko' 
                ? '팀 멤버들의 프롬프트를 확인하고 공유하세요' 
                : 'View and share prompts with your team members'
              }
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 왼쪽: 팀 멤버 목록 */}
            <div className="lg:col-span-1">
              <Card>
                <CardHeader>
                  <CardTitle>{locale === 'ko' ? '팀 멤버' : 'Team Members'}</CardTitle>
                  <CardDescription>
                    {locale === 'ko' 
                      ? `${teamMembers.length}명의 멤버` 
                      : `${teamMembers.length} members`
                    }
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* 검색 바 */}
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder={locale === 'ko' ? '멤버 검색...' : 'Search members...'}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* 멤버 리스트 */}
                  <div className="space-y-2 max-h-[500px] overflow-y-auto">
                    {filteredMembers.length === 0 ? (
                      <div className="text-center py-8">
                        <User className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          {locale === 'ko' ? '팀 멤버가 없습니다' : 'No team members found'}
                        </p>
                      </div>
                    ) : (
                      filteredMembers.map((member) => (
                        <div
                          key={member.id}
                          onClick={() => handleSelectMember(member)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-muted/50 ${
                            selectedMember?.id === member.id ? 'bg-muted/50 border-primary' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={member.avatar_url} />
                              <AvatarFallback>
                                {getUserInitials(member.email, member.display_name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium truncate">
                                {member.display_name || member.email}
                              </p>
                              {member.display_name && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {member.email}
                                </p>
                              )}
                              <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-muted-foreground">
                                  <Folder className="inline h-3 w-3 mr-1" />
                                  {member.project_count} {locale === 'ko' ? '프로젝트' : 'projects'}
                                </span>
                                {member.last_upload && (
                                  <span className="text-xs text-muted-foreground">
                                    <Clock className="inline h-3 w-3 mr-1" />
                                    {formatDate(member.last_upload)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 오른쪽: 선택한 멤버의 프로젝트 */}
            <div className="lg:col-span-2">
              {selectedMember ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={selectedMember.avatar_url} />
                          <AvatarFallback>
                            {getUserInitials(selectedMember.email, selectedMember.display_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <CardTitle>
                            {selectedMember.display_name || selectedMember.email}
                            {locale === 'ko' ? '님의 프로젝트' : "'s Projects"}
                          </CardTitle>
                          <CardDescription>
                            {memberProjects.length} {locale === 'ko' ? '개의 프로젝트' : 'projects'}
                          </CardDescription>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {projectsLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-6 w-6 animate-spin" />
                      </div>
                    ) : memberProjects.length === 0 ? (
                      <div className="text-center py-12">
                        <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                        <p className="text-muted-foreground">
                          {locale === 'ko' ? '프로젝트가 없습니다' : 'No projects found'}
                        </p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {memberProjects.map((project) => (
                          <Card 
                            key={project.id}
                            className="hover:shadow-md transition-shadow cursor-pointer"
                            onClick={() => handleViewProject(project.id)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-start gap-3 flex-1">
                                  <Folder className="h-5 w-5 text-muted-foreground mt-0.5" />
                                  <div className="flex-1">
                                    <h3 className="font-semibold">{project.project_name}</h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                      {project.project_path}
                                    </p>
                                    <div className="flex items-center gap-4 mt-2">
                                      <span className="text-xs text-muted-foreground">
                                        <FileText className="inline h-3 w-3 mr-1" />
                                        {project.session_count} {locale === 'ko' ? '세션' : 'sessions'}
                                      </span>
                                      <span className="text-xs text-muted-foreground">
                                        <Calendar className="inline h-3 w-3 mr-1" />
                                        {formatDate(project.uploaded_at)}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleViewProject(project.id)
                                  }}
                                >
                                  {locale === 'ko' ? '보기' : 'View'}
                                  <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="py-16">
                    <div className="text-center">
                      <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-muted-foreground">
                        {locale === 'ko' 
                          ? '팀 멤버를 선택하여 프로젝트를 확인하세요' 
                          : 'Select a team member to view their projects'
                        }
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