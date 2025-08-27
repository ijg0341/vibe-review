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

interface ProjectSession {
  id: string
  project_id: string
  session_name: string
  file_name?: string
  file_path?: string
  uploaded_at: string
  user_id: string
  project?: {
    id: string
    name: string
    description?: string
  }
}

export default function TeamPage() {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null)
  const [memberSessions, setMemberSessions] = useState<ProjectSession[]>([])
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
            // 세션 수와 마지막 업로드 시간 조회
            const { data: sessions, error: sessionsError } = await supabase
              .from('project_sessions')
              .select('uploaded_at')
              .eq('user_id', profile.id)
              .order('uploaded_at', { ascending: false })

            if (sessionsError) {
              console.error('Error fetching sessions for user:', profile.id, sessionsError)
              return {
                ...profile,
                project_count: 0,
                last_upload: null
              }
            }

            return {
              ...profile,
              project_count: sessions?.length || 0,
              last_upload: sessions?.[0]?.uploaded_at || null
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

  // 선택한 멤버의 세션 가져오기
  const fetchMemberSessions = async (memberId: string) => {
    try {
      setProjectsLoading(true)
      
      const { data: sessions, error } = await supabase
        .from('project_sessions')
        .select(`
          *,
          project:projects(*)
        `)
        .eq('user_id', memberId)
        .order('uploaded_at', { ascending: false })

      if (error) {
        console.error('Error fetching member sessions:', error)
        return
      }

      setMemberSessions(sessions || [])
    } catch (error) {
      console.error('Error in fetchMemberSessions:', error)
    } finally {
      setProjectsLoading(false)
    }
  }

  // 멤버 선택 핸들러
  const handleSelectMember = (member: TeamMember) => {
    setSelectedMember(member)
    fetchMemberSessions(member.id)
  }

  // 세션 상세 페이지로 이동
  const handleViewSession = (sessionId: string) => {
    // 팀 세션 보기용 별도 경로 사용
    router.push(`/team/${selectedMember?.id}/${sessionId}`)
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

          {/* 검색 바 */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={locale === 'ko' ? '멤버 검색...' : 'Search members...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* 팀 멤버 카드 그리드 (3개씩) */}
          {filteredMembers.length === 0 ? (
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {locale === 'ko' ? '팀 멤버가 없습니다' : 'No team members found'}
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMembers.map((member) => (
                <Card 
                  key={member.id}
                  className="hover:shadow-lg transition-all cursor-pointer group"
                  onClick={() => router.push(`/team/${member.id}`)}
                >
                  <CardContent className="p-6">
                    {/* 프로필 섹션 */}
                    <div className="flex flex-col items-center text-center mb-4">
                      <Avatar className="h-20 w-20 mb-3">
                        <AvatarImage src={member.avatar_url} />
                        <AvatarFallback className="text-lg">
                          {getUserInitials(member.email, member.display_name)}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-lg">
                        {member.display_name || member.email.split('@')[0]}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <Mail className="h-3 w-3" />
                        {member.email}
                      </p>
                    </div>

                    {/* 통계 섹션 */}
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Folder className="h-4 w-4" />
                          {locale === 'ko' ? '프로젝트' : 'Projects'}
                        </span>
                        <Badge variant="secondary">
                          {member.project_count || 0}
                        </Badge>
                      </div>
                      
                      {member.last_upload && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {locale === 'ko' ? '최근 업로드' : 'Last upload'}
                          </span>
                          <span className="text-sm text-right">
                            {formatDate(member.last_upload)}
                          </span>
                        </div>
                      )}

                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {locale === 'ko' ? '가입일' : 'Joined'}
                        </span>
                        <span className="text-sm text-right">
                          {formatDate(member.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* 액션 버튼 */}
                    <Button 
                      className="w-full mt-4 group-hover:bg-primary group-hover:text-primary-foreground"
                      variant="outline"
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/team/${member.id}`)
                      }}
                    >
                      {locale === 'ko' ? '세션 보기' : 'View Sessions'}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}