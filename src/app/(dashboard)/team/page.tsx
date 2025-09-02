'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLocaleStore } from '@/lib/locale-store'
import { Users, AlertCircle } from 'lucide-react'

export default function TeamPage() {
  const locale = useLocaleStore(state => state.locale)

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
                ? '팀 멤버들의 활동을 확인하세요' 
                : 'Check your team members\' activities'
              }
            </p>
          </div>

          {/* 임시 메시지 */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {locale === 'ko' 
                ? 'API 서버 마이그레이션 완료 후 팀 기능이 활성화됩니다.' 
                : 'Team features will be activated after API server migration is complete.'
              }
            </AlertDescription>
          </Alert>

          {/* 기본 카드 */}
          <Card>
            <CardHeader>
              <CardTitle>{locale === 'ko' ? '팀 기능 준비 중' : 'Team Features Coming Soon'}</CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? '현재 API 서버 기반으로 마이그레이션 중입니다.' 
                  : 'Currently migrating to API server-based architecture.'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                {locale === 'ko' 
                  ? '팀 멤버 관리, 활동 추적 등의 기능이 곧 추가됩니다.' 
                  : 'Team member management, activity tracking and more features coming soon.'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}