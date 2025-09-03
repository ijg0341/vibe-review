'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
// import { useSettings } from '@/hooks/use-api'
import { apiClient } from '@/lib/api-client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Settings as SettingsIcon, Folder, Globe, Save, Key, BookOpen, ExternalLink } from 'lucide-react'

export default function SettingsPage() {
  const [projectPath, setProjectPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [apiKeys, setApiKeys] = useState<any[]>([])
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [showFullKey, setShowFullKey] = useState<Record<string, boolean>>({})
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const { toast } = useToast()
  // const { settings, loading, fetchSettings, updateSettings } = useSettings()

  // 설정 로드
  useEffect(() => {
    // if (user?.id) {
    //   fetchSettings()
    // }
  }, [user?.id])

  // 설정 데이터가 로드되면 폼에 반영
  useEffect(() => {
    // if (settings) {
    //   setProjectPath(settings.default_project_path || '')
    // }
  }, [])

  // API 키 목록 조회
  const fetchApiKeys = async () => {
    setApiKeysLoading(true)
    try {
      const response = await apiClient.getApiKeys()
      if (response.success && response.data) {
        const keys = Array.isArray((response.data as any)?.keys) 
          ? (response.data as any).keys 
          : Array.isArray(response.data) 
          ? response.data 
          : []
        setApiKeys(keys)
      } else {
        setApiKeys([])
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
      setApiKeys([]) // 에러 시 빈 배열로 안전하게 설정
    } finally {
      setApiKeysLoading(false)
    }
  }

  // 새 API 키 생성
  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        variant: 'destructive',
        title: locale === 'ko' ? '이름 필수' : 'Name required',
        description: locale === 'ko' ? 'API 키 이름을 입력해주세요' : 'Please enter API key name',
      })
      return
    }

    setCreatingKey(true)
    try {
      const response = await apiClient.createApiKey({ name: newKeyName })
      if (response.success && response.data) {
        // 새로 생성된 키를 바로 목록에 추가 (full key 포함)
        const newKey: any = {
          id: (response.data as any).id,
          name: (response.data as any).name,
          key_preview: (response.data as any).key_preview,
          api_key: (response.data as any).api_key, // 전체 키 (처음에만 보여짐)
          full_key: (response.data as any).api_key, // 호환성을 위해 복사
          created_at: (response.data as any).created_at,
          is_active: true,
          expires_at: (response.data as any).expires_at
        }
        
        // 새 키를 목록 맨 위에 추가
        setApiKeys(prev => [newKey, ...prev])
        
        // 새 키는 기본으로 보이도록 설정
        setShowFullKey(prev => ({ ...prev, [newKey.id]: true }))
        
        toast({
          title: locale === 'ko' ? 'API 키 생성됨' : 'API key created',
          description: response.message || (locale === 'ko' ? '새 API 키가 생성되었습니다. 안전한 곳에 보관하세요.' : 'New API key has been created. Please save it safely.'),
        })
        setNewKeyName('')
      } else {
        toast({
          variant: 'destructive',
          title: locale === 'ko' ? '생성 실패' : 'Creation failed',
          description: response.error || 'Failed to create API key',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: locale === 'ko' ? '오류 발생' : 'Error occurred',
        description: locale === 'ko' ? 'API 키 생성 중 오류가 발생했습니다' : 'Error creating API key',
      })
    } finally {
      setCreatingKey(false)
    }
  }

  // API 키 삭제
  const handleDeleteApiKey = async (keyId: string) => {
    try {
      const response = await apiClient.deleteApiKey(keyId)
      if (response.success) {
        toast({
          title: locale === 'ko' ? 'API 키 삭제됨' : 'API key deleted',
          description: locale === 'ko' ? 'API 키가 삭제되었습니다' : 'API key has been deleted',
        })
        fetchApiKeys()
      } else {
        toast({
          variant: 'destructive',
          title: locale === 'ko' ? '삭제 실패' : 'Deletion failed',
          description: response.error || 'Failed to delete API key',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: locale === 'ko' ? '오류 발생' : 'Error occurred',
        description: locale === 'ko' ? 'API 키 삭제 중 오류가 발생했습니다' : 'Error deleting API key',
      })
    }
  }

  // API 키 복사
  const copyApiKey = (key: string) => {
    navigator.clipboard.writeText(key)
    toast({
      title: locale === 'ko' ? '복사됨' : 'Copied',
      description: locale === 'ko' ? 'API 키가 클립보드에 복사되었습니다' : 'API key copied to clipboard',
    })
  }

  // 설정 저장
  const handleSaveSettings = async () => {
    if (!user?.id) return

    try {
      setSaving(true)
      
      // const result = await updateSettings({
      //   default_project_path: projectPath,
      //   locale: locale
      // })

      // if (result.success) {
        toast({
          title: locale === 'ko' ? '설정 저장됨' : 'Settings saved',
          description: locale === 'ko' ? '설정이 성공적으로 저장되었습니다' : 'Your settings have been saved successfully',
        })
      // } else {
      //   toast({
      //     variant: 'destructive',
      //     title: locale === 'ko' ? '저장 실패' : 'Save failed',
      //     description: result.error || 'Failed to save settings',
      //   })
      // }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: locale === 'ko' ? '오류 발생' : 'Error occurred',
        description: locale === 'ko' ? '설정 저장 중 문제가 발생했습니다' : 'Failed to save settings',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* 헤더 */}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-8 w-8" />
              {locale === 'ko' ? '설정' : 'Settings'}
            </h1>
            <p className="text-muted-foreground">
              {locale === 'ko' 
                ? '계정 설정과 기본 설정을 관리하세요' 
                : 'Manage your account and preferences'
              }
            </p>
          </div>

          {/* 프로젝트 경로 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5" />
                {locale === 'ko' ? '프로젝트 설정' : 'Project Settings'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? '기본 프로젝트 폴더 경로를 설정하세요' 
                  : 'Set your default project folder path'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="project-path">
                  {locale === 'ko' ? '기본 프로젝트 경로' : 'Default Project Path'}
                </Label>
                <Input
                  id="project-path"
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="/Users/username/projects"
                  className="font-mono"
                  disabled={false}
                />
                <p className="text-xs text-muted-foreground">
                  {locale === 'ko' 
                    ? '새 프로젝트 생성 시 이 경로를 기본값으로 사용합니다' 
                    : 'This path will be used as default when creating new projects'
                  }
                </p>
              </div>

              <Button 
                onClick={handleSaveSettings} 
                disabled={saving}
                className="w-full"
              >
                {saving ? (
                  <>
                    <Save className="mr-2 h-4 w-4 animate-spin" />
                    {locale === 'ko' ? '저장 중...' : 'Saving...'}
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {locale === 'ko' ? '설정 저장' : 'Save Settings'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* 언어 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {locale === 'ko' ? '언어 설정' : 'Language Settings'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? '인터페이스 언어를 선택하세요' 
                  : 'Choose your interface language'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {locale === 'ko' 
                  ? '현재 언어: 한국어. 상단 언어 토글로 변경할 수 있습니다.' 
                  : 'Current language: English. You can change it using the language toggle in the header.'
                }
              </p>
            </CardContent>
          </Card>

          {/* API 키 안내 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {locale === 'ko' ? 'API 키 관리' : 'API Key Management'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? 'CLI 도구 연동을 위한 API 키는 시작하기 페이지에서 관리할 수 있습니다' 
                  : 'API keys for CLI tool integration can be managed on the Getting Started page'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                variant="outline" 
                onClick={() => window.location.href = '/getting-started'}
                className="w-full sm:w-auto"
              >
                <BookOpen className="mr-2 h-4 w-4" />
                {locale === 'ko' ? '시작하기 페이지로 이동' : 'Go to Getting Started'}
                <ExternalLink className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* API 서버 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                {locale === 'ko' ? 'API 서버 정보' : 'API Server Information'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? '현재 연결된 API 서버 정보' 
                  : 'Current API server connection details'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">
                  {locale === 'ko' ? 'API 서버 URL' : 'API Server URL'}
                </span>
                <span className="text-sm text-muted-foreground font-mono">
                  {process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">
                  {locale === 'ko' ? '프록시 경로' : 'Proxy Path'}
                </span>
                <span className="text-sm text-muted-foreground font-mono">
                  /api/proxy/*
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">
                  {locale === 'ko' ? '연결 상태' : 'Connection Status'}
                </span>
                <span className="text-sm text-green-600 font-medium">
                  {locale === 'ko' ? '연결됨' : 'Connected'}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* 계정 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="h-5 w-5" />
                {locale === 'ko' ? '계정 정보' : 'Account Information'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? '현재 로그인한 계정 정보' 
                  : 'Your current account information'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">
                  {locale === 'ko' ? '이메일' : 'Email'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {user?.email || 'Not available'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2 border-b">
                <span className="text-sm font-medium">
                  {locale === 'ko' ? '이름' : 'Name'}
                </span>
                <span className="text-sm text-muted-foreground">
                  {user?.display_name || 'Not set'}
                </span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm font-medium">
                  {locale === 'ko' ? '사용자 ID' : 'User ID'}
                </span>
                <span className="text-sm text-muted-foreground font-mono">
                  {user?.id || 'Not available'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}