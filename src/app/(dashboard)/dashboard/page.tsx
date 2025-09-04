// 팀 대시보드 메인 페이지
'use client'

import { useDashboardData } from '@/hooks/use-dashboard'
import { PersonalStatsCards } from '@/components/dashboard/PersonalStats'
import { TeamRankings } from '@/components/dashboard/TeamRankings'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, BarChart3 } from 'lucide-react'

export default function DashboardPage() {
  const today = new Date().toISOString().split('T')[0]
  const { teamTotalStats, teamRankings, isLoading, isError, error } = useDashboardData(today)
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)

  if (isLoading) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p className="text-muted-foreground">
                {locale === 'ko' ? '대시보드를 불러오는 중...' : 'Loading dashboard...'}
              </p>
            </div>
          </div>
        </DashboardLayout>
      </ProtectedRoute>
    )
  }

  if (isError) {
    return (
      <ProtectedRoute>
        <DashboardLayout>
          <div className="space-y-6">
            <Card>
              <CardContent className="py-16">
                <div className="text-center">
                  <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h2 className="text-xl font-semibold text-red-600 mb-2">
                    {locale === 'ko' ? '데이터를 불러올 수 없습니다' : 'Failed to load data'}
                  </h2>
                  <p className="text-muted-foreground">
                    {error?.message || (locale === 'ko' ? '알 수 없는 오류가 발생했습니다.' : 'An unknown error occurred.')}
                  </p>
                </div>
              </CardContent>
            </Card>
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
              <BarChart3 className="h-8 w-8" />
              {locale === 'ko' ? '팀 대시보드' : 'Team Dashboard'}
            </h1>
            <p className="text-muted-foreground">
              {locale === 'ko' 
                ? `오늘(${today})의 AI 도구 사용량 및 팀 랭킹을 확인하세요`
                : `View today's (${today}) AI tool usage and team rankings`
              }
            </p>
          </div>

          {/* 상단 - 팀 전체 통계 카드들 */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              📊 {locale === 'ko' ? '팀 전체 사용량 (오늘)' : 'Team Total Usage (Today)'}
            </h2>
            <PersonalStatsCards stats={teamTotalStats} />
          </div>

          {/* 하단 - 팀 랭킹 */}
          <div>
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              🏆 {locale === 'ko' ? '팀 랭킹 (오늘)' : 'Team Rankings (Today)'}
            </h2>
            <TeamRankings rankings={teamRankings} />
          </div>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}