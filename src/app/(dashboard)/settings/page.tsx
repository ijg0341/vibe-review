'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useSettings } from '@/hooks/use-api'
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
import { Settings as SettingsIcon, Folder, Globe, Save, Key, AlertCircle, Plus, Copy, Eye, EyeOff, Trash2 } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  key_prefix?: string
  full_key?: string
  created_at: string
  last_used?: string
  is_active: boolean
}

export default function SettingsPage() {
  const [projectPath, setProjectPath] = useState('')
  const [saving, setSaving] = useState(false)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [showFullKey, setShowFullKey] = useState<Record<string, boolean>>({})
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const { toast } = useToast()
  const { settings, loading, fetchSettings, updateSettings } = useSettings()

  // 설정 로드
  useEffect(() => {
    if (user?.id) {
      fetchSettings()
      fetchApiKeys()
    }
  }, [user?.id, fetchSettings])

  // 설정 데이터가 로드되면 폼에 반영
  useEffect(() => {
    if (settings) {
      setProjectPath(settings.default_project_path || '')
    }
  }, [settings])

  // API 키 목록 조회
  const fetchApiKeys = async () => {
    setApiKeysLoading(true)
    try {
      const response = await apiClient.getApiKeys()
      if (response.success && response.data) {
        setApiKeys(response.data.keys || response.data || [])
      }
    } catch (error) {
      console.error('Failed to fetch API keys:', error)
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
      if (response.success) {
        toast({
          title: locale === 'ko' ? 'API 키 생성됨' : 'API key created',
          description: locale === 'ko' ? '새 API 키가 생성되었습니다' : 'New API key has been created',
        })
        setNewKeyName('')
        fetchApiKeys()
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
      
      const result = await updateSettings({
        default_project_path: projectPath,
        locale: locale
      })

      if (result.success) {
        toast({
          title: locale === 'ko' ? '설정 저장됨' : 'Settings saved',
          description: locale === 'ko' ? '설정이 성공적으로 저장되었습니다' : 'Your settings have been saved successfully',
        })
      } else {
        toast({
          variant: 'destructive',
          title: locale === 'ko' ? '저장 실패' : 'Save failed',
          description: result.error || 'Failed to save settings',
        })
      }
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
                  disabled={loading}
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
                disabled={saving || loading}
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

          {/* API 키 관리 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  {locale === 'ko' ? 'API 키 관리' : 'API Key Management'}
                </div>
                <Button 
                  size="sm" 
                  onClick={handleCreateApiKey}
                  disabled={creatingKey || !newKeyName.trim()}
                >
                  {creatingKey ? (
                    <>
                      <Save className="mr-2 h-4 w-4 animate-spin" />
                      {locale === 'ko' ? '생성 중...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" />
                      {locale === 'ko' ? '새 키 생성' : 'Create Key'}
                    </>
                  )}
                </Button>
              </CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? 'CLI 도구 연동을 위한 API 키를 관리하세요' 
                  : 'Manage API keys for CLI tool integration'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* 새 키 생성 입력 */}
              <div className="flex gap-2">
                <Input
                  placeholder={locale === 'ko' ? 'API 키 이름 (예: CLI Tool)' : 'API key name (e.g., CLI Tool)'}
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  disabled={creatingKey}
                />
              </div>

              {/* API 키 목록 */}
              <div className="space-y-3">
                {apiKeysLoading ? (
                  <div className="text-center py-4">
                    <Save className="h-6 w-6 animate-spin mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {locale === 'ko' ? 'API 키를 불러오는 중...' : 'Loading API keys...'}
                    </p>
                  </div>
                ) : apiKeys.length === 0 ? (
                  <div className="text-center py-6 border-2 border-dashed border-muted-foreground/20 rounded-lg">
                    <Key className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">
                      {locale === 'ko' ? '생성된 API 키가 없습니다' : 'No API keys created'}
                    </p>
                  </div>
                ) : (
                  apiKeys.map((apiKey) => (
                    <div key={apiKey.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{apiKey.name}</span>
                          <Badge variant={apiKey.is_active ? 'default' : 'secondary'}>
                            {apiKey.is_active ? (locale === 'ko' ? '활성' : 'Active') : (locale === 'ko' ? '비활성' : 'Inactive')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-2">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {showFullKey[apiKey.id] 
                              ? (apiKey.full_key || `${apiKey.key_prefix}...`) 
                              : `${apiKey.key_prefix}${'*'.repeat(20)}`
                            }
                          </code>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setShowFullKey(prev => ({ ...prev, [apiKey.id]: !prev[apiKey.id] }))}
                          >
                            {showFullKey[apiKey.id] ? (
                              <EyeOff className="h-3 w-3" />
                            ) : (
                              <Eye className="h-3 w-3" />
                            )}
                          </Button>
                          {(showFullKey[apiKey.id] || apiKey.full_key) && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyApiKey(apiKey.full_key || `${apiKey.key_prefix}...`)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {locale === 'ko' ? '생성일' : 'Created'}: {new Date(apiKey.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US')}
                          {apiKey.last_used && (
                            <> • {locale === 'ko' ? '마지막 사용' : 'Last used'}: {new Date(apiKey.last_used).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US')}</>
                          )}
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteApiKey(apiKey.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
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
                  http://localhost:3001
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