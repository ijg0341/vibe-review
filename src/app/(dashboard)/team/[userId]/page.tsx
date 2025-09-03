'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useTeamMember } from '@/hooks/use-query-api'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { useRouter, useParams } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { 
  ArrowLeft,
  Folder,
  FileText,
  Calendar,
  Clock,
  User,
  Mail,
  Loader2,
  FolderOpen,
  Eye,
  Database,
  Activity,
  CalendarDays,
  FolderTree,
  ChevronRight,
  ChevronDown,
  TrendingUp,
  Wrench
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'

interface TeamMember {
  id: string
  full_name?: string
  username?: string
  role: 'admin' | 'member'
  joined_at: string
}

interface Insights {
  overview: {
    total_files: number
    total_size: number
    average_file_size: number
    recent_activity: number
    activity_percentage: number
  }
  patterns: {
    favorite_tools: Array<{ tool: string; count: number }>
    most_active_weekday: string
    current_streak: number
  }
  productivity: {
    daily_average: number
    size_efficiency: number
    consistency_score: number
    recent_trend: 'increasing' | 'decreasing' | 'stable'
  }
  milestones: {
    first_upload: string
    largest_session: {
      id: string
      filename: string
      file_size: number
      created_at: string
    }
    most_productive_day: {
      date: string
      sessions: number
      size: number
    }
    total_projects: number
  }
}

interface DailyCard {
  date: string
  session_count: number
  total_tokens: number
  total_duration: number
  tools_used: string[]
  projects: string[]
}

type ViewMode = 'date' | 'project'

interface GroupedSessions {
  [key: string]: {
    sessions: any[]
    count: number
    totalLines: number
  }
}

export default function TeamMemberDetailPage() {
  const [viewMode, setViewMode] = useState<ViewMode>('date')
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set())
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const router = useRouter()
  const params = useParams()
  const userId = params.userId as string
  
  // 실제 API 호출로 멤버 상세 정보 가져오기
  const { data: memberData, isLoading: loading, error } = useTeamMember(userId)
  
  // API 응답에서 데이터 추출
  const member = memberData?.success ? (memberData.data as any)?.member : null
  const insights = memberData?.success ? (memberData.data as any)?.insights : null
  const dailyCards = memberData?.success ? (memberData.data as any)?.daily_cards || [] : []

  // 날짜 상세 페이지로 이동
  const handleViewDateDetail = (date: string) => {
    router.push(`/team/${userId}/date/${date}`)
  }

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

  const formatFullDate = (dateString: string | null | undefined) => {
    if (!dateString) return locale === 'ko' ? '날짜 정보 없음' : 'No date'
    
    try {
      const date = new Date(dateString)
      if (isNaN(date.getTime())) {
        return locale === 'ko' ? '잘못된 날짜' : 'Invalid date'
      }
      
      return format(date, 'PPP', {
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

  if (!member) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                {locale === 'ko' ? '멤버 정보를 불러오는 중...' : 'Loading member info...'}
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
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/team')}
                className="mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {locale === 'ko' ? '팀 목록으로' : 'Back to Team'}
              </Button>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={member.avatar_url} />
                  <AvatarFallback className="text-xl">
                    {getUserInitials(member.full_name, member.username)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="text-3xl font-bold">
                    {member.full_name || member.username || 'Unknown'}
                  </h1>
                  <div className="flex items-center gap-2">
                    <p className="text-muted-foreground flex items-center gap-2">
                      <User className="h-4 w-4" />
                      @{member.username || 'unknown'}
                    </p>
                    <Badge variant={member.role === 'admin' ? 'default' : 'secondary'}>
                      {member.role === 'admin' ? (locale === 'ko' ? '관리자' : 'Admin') : (locale === 'ko' ? '멤버' : 'Member')}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 통계 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-6">
                <CardDescription>{locale === 'ko' ? '프로젝트' : 'Projects'}</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <Folder className="h-5 w-5" />
                  {insights?.milestones.total_projects || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-6">
                <CardDescription>{locale === 'ko' ? '세션' : 'Sessions'}</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  {insights?.overview.total_sessions || insights?.overview.total_files || 0}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-6">
                <CardDescription>{locale === 'ko' ? '최근 활동 (30일)' : 'Recent Activity (30d)'}</CardDescription>
                <CardTitle className="text-2xl flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  {insights?.overview.recent_activity || 0}개
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-6">
                <CardDescription>{locale === 'ko' ? '가입일' : 'Member Since'}</CardDescription>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {formatFullDate(member.joined_at)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* 상세 통계 */}
          {insights && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* 총 토큰 */}
              <Card>
                <CardHeader className="pb-6">
                  <CardDescription>{locale === 'ko' ? '총 토큰' : 'Total Tokens'}</CardDescription>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    {insights.overview?.total_tokens?.toLocaleString() || '0'}
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* 평균 토큰 */}
              <Card>
                <CardHeader className="pb-6">
                  <CardDescription>{locale === 'ko' ? '평균 토큰' : 'Average Tokens'}</CardDescription>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    {insights.overview?.average_tokens?.toLocaleString() || '0'}
                  </CardTitle>
                </CardHeader>
              </Card>

              {/* 세션 진행률 */}
              <Card>
                <CardHeader className="pb-6">
                  <CardDescription>{locale === 'ko' ? '활동 진행률' : 'Activity Rate'}</CardDescription>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {insights.overview?.activity_percentage || 0}%
                  </CardTitle>
                </CardHeader>
              </Card>
            </div>
          )}

          {/* 일별 활동 카드 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5" />
                {locale === 'ko' ? '일별 활동' : 'Daily Activity'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' ? '최근 활동 내역을 날짜별로 확인하세요' : 'View recent activity by date'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {dailyCards.length === 0 ? (
                <div className="text-center py-8">
                  <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {locale === 'ko' ? '활동 내역이 없습니다' : 'No activity found'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {dailyCards.map((card: DailyCard) => (
                    <Card 
                      key={card.date} 
                      className="cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => handleViewDateDetail(card.date)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <CalendarDays className="h-5 w-5" />
                              <h4 className="font-medium">
                                {locale === 'ko' 
                                  ? format(new Date(card.date), 'yyyy년 MM월 dd일 (EEEE)', { locale: ko })
                                  : format(new Date(card.date), 'EEEE, MMM dd, yyyy', { locale: enUS })
                                }
                              </h4>
                            </div>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">{locale === 'ko' ? '세션' : 'Sessions'}</span>
                                <p className="font-medium">{card.session_count}개</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{locale === 'ko' ? '토큰' : 'Tokens'}</span>
                                <p className="font-medium">{card.total_tokens?.toLocaleString() || '0'}</p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{locale === 'ko' ? '세션 시간' : 'Session Time'}</span>
                                <p className="font-medium">
                                  {card.total_duration && card.total_duration > 0
                                    ? card.total_duration > 60 
                                      ? `${Math.round(card.total_duration / 60)}h`
                                      : `${card.total_duration}m`
                                    : locale === 'ko' ? '미측정' : 'N/A'
                                  }
                                </p>
                              </div>
                              <div>
                                <span className="text-muted-foreground">{locale === 'ko' ? '프로젝트' : 'Projects'}</span>
                                <div className="flex gap-1 flex-wrap">
                                  {(card.projects || []).slice(0, 2).map(project => (
                                    <Badge key={project} variant="outline" className="text-xs">{project}</Badge>
                                  ))}
                                  {(card.projects || []).length > 2 && (
                                    <Badge variant="outline" className="text-xs">+{card.projects.length - 2}</Badge>
                                  )}
                                </div>
                              </div>
                            </div>
                            
                            {/* 사용 도구 (별도 행) */}
                            <div className="pt-2 border-t">
                              <span className="text-xs text-muted-foreground">{locale === 'ko' ? '사용 도구: ' : 'Tools: '}</span>
                              <div className="flex gap-1 mt-1">
                                {(card.tools_used || []).map(tool => (
                                  <Badge key={tool} variant="secondary" className="text-xs">{tool}</Badge>
                                ))}
                              </div>
                            </div>
                          </div>
                          
                          <Button variant="ghost" size="sm">
                            <ChevronRight className="h-4 w-4" />
                          </Button>
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