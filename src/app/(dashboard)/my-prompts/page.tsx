'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLocaleStore } from '@/lib/locale-store'
import { FileText, AlertCircle } from 'lucide-react'

export default function MyPromptsPage() {
  const locale = useLocaleStore(state => state.locale)

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <FileText className="h-8 w-8" />
              {locale === 'ko' ? '내 프롬프트' : 'My Prompts'}
            </h1>
            <p className="text-muted-foreground">
              {locale === 'ko' ? '내가 작업한 프롬프트들을 확인하세요' : 'View your prompts and sessions'}
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {locale === 'ko' 
                ? 'API 서버 마이그레이션 완료 후 프롬프트 기능이 활성화됩니다.' 
                : 'Prompts features will be activated after API server migration is complete.'
              }
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>{locale === 'ko' ? '프롬프트 기능 준비 중' : 'Prompts Features Coming Soon'}</CardTitle>
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
                  ? '개별 프롬프트 분석, 세션 검색 등의 기능이 곧 추가됩니다.' 
                  : 'Individual prompt analysis, session search and more features coming soon.'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}