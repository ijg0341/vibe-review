'use client'

import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useLocaleStore } from '@/lib/locale-store'
import { Key, AlertCircle } from 'lucide-react'

export default function ApiKeysPage() {
  const locale = useLocaleStore(state => state.locale)

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Key className="h-8 w-8" />
              {locale === 'ko' ? 'API 키' : 'API Keys'}
            </h1>
            <p className="text-muted-foreground">
              {locale === 'ko' ? 'API 키를 관리하고 외부 도구를 연동하세요' : 'Manage API keys for external tool integration'}
            </p>
          </div>

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              {locale === 'ko' 
                ? 'API 서버 마이그레이션 완료 후 API 키 관리 기능이 활성화됩니다.' 
                : 'API key management features will be activated after API server migration is complete.'
              }
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>{locale === 'ko' ? 'API 키 기능 준비 중' : 'API Keys Features Coming Soon'}</CardTitle>
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
                  ? 'API 키 생성, 관리, CLI 도구 연동 등의 기능이 곧 추가됩니다.' 
                  : 'API key generation, management, CLI tool integration and more features coming soon.'
                }
              </p>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}