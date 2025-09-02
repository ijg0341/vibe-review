'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLocaleStore } from '@/lib/locale-store'
import { MessageSquare, AlertCircle } from 'lucide-react'

export default function ReviewsPage() {
  const locale = useLocaleStore(state => state.locale)

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <MessageSquare className="h-8 w-8" />
              {locale === 'ko' ? '리뷰' : 'Reviews'}
            </h1>
            <p className="text-muted-foreground">
              {locale === 'ko' ? '프로젝트 리뷰를 관리하세요' : 'Manage project reviews'}
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {locale === 'ko' 
                ? 'API 서버 마이그레이션 완료 후 리뷰 기능이 활성화됩니다.' 
                : 'Review features will be activated after API server migration is complete.'
              }
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>{locale === 'ko' ? '리뷰 기능 준비 중' : 'Review Features Coming Soon'}</CardTitle>
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
                  ? '일일 작업 리뷰, 팀 피드백, 코드 리뷰 등의 기능이 곧 추가됩니다.' 
                  : 'Daily work reviews, team feedback, code reviews and more features coming soon.'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}