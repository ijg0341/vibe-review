'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { useRouter } from 'next/navigation'
import { useTeamMembers } from '@/hooks/use-query-api'
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
  full_name?: string
  username?: string
  avatar_url?: string
  role: 'admin' | 'member'
  created_at: string
  activity_summary: {
    total_files: number
    total_size: number
    last_upload?: string
    favorite_tool?: string
    projects_count: number
    average_file_size: number
  }
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
  const [searchQuery, setSearchQuery] = useState('')
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const router = useRouter()
  
  // 실제 API 호출로 팀 멤버 데이터 가져오기
  const { data: teamData, isLoading: loading, error } = useTeamMembers()
  
  // API 응답에서 팀 멤버들 추출 (fallback 포함)
  const teamMembers = teamData?.success ? (teamData.data as any)?.members || [] : []
  
  // API 서버 연결 실패 시 기본 사용자 정보로 fallback
  const fallbackMembers = user ? [{
    id: user.id,
    full_name: user.display_name || user.email.split('@')[0],
    username: user.email.split('@')[0],
    role: 'admin' as const,
    created_at: new Date().toISOString(),
    activity_summary: {
      total_files: 0,
      total_size: 0,
      projects_count: 0,
      average_file_size: 0
    }
  }] : []
  
  const displayMembers = teamMembers.length > 0 ? teamMembers : fallbackMembers

  // 필터링된 멤버 목록
  const filteredMembers = displayMembers.filter((member: TeamMember) => {
    const query = searchQuery.toLowerCase()
    return (
      (member.full_name?.toLowerCase().includes(query)) ||
      (member.username?.toLowerCase().includes(query))
    )
  })

  // 날짜 포맷팅 (안전한 버전)
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return locale === 'ko' ? '날짜 정보 없음' : 'No date'
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return locale === 'ko' ? '잘못된 날짜' : 'Invalid date'
      }
      
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: locale === 'ko' ? ko : enUS
      })
    } catch (error) {
      console.error('Date formatting error:', error, dateString)
      return locale === 'ko' ? '날짜 오류' : 'Date error'
    }
  }

  // 사용자 이니셜 생성
  const getUserInitials = (fullName?: string, username?: string) => {
    if (fullName) {
      return fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    if (username) {
      return username.slice(0, 2).toUpperCase()
    }
    return '??'
  }

  // 파일 크기 포맷팅
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
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
              {filteredMembers.map((member: any) => (
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
                          {getUserInitials(member.full_name, member.username)}
                        </AvatarFallback>
                      </Avatar>
                      <h3 className="font-semibold text-lg">
                        {member.full_name || member.username || 'Unknown'}
                      </h3>
                      <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                        <User className="h-3 w-3" />
                        @{member.username || 'unknown'}
                      </p>
                      {member.role && (
                        <Badge variant={member.role === 'admin' ? 'default' : 'secondary'} className="mt-2">
                          {member.role === 'admin' ? (locale === 'ko' ? '관리자' : 'Admin') : (locale === 'ko' ? '멤버' : 'Member')}
                        </Badge>
                      )}
                    </div>

                    {/* 통계 섹션 */}
                    <div className="space-y-3 border-t pt-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <Folder className="h-4 w-4" />
                          {locale === 'ko' ? '프로젝트' : 'Projects'}
                        </span>
                        <Badge variant="secondary">
                          {member.activity_summary.projects_count}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {locale === 'ko' ? '세션' : 'Sessions'}
                        </span>
                        <span className="text-sm text-right">
                          {member.activity_summary.total_files}개
                        </span>
                      </div>

                      
                      {member.activity_summary.last_upload && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {locale === 'ko' ? '최근 업로드' : 'Last upload'}
                          </span>
                          <span className="text-sm text-right">
                            {formatDate(member.activity_summary.last_upload)}
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