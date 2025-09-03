'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { apiClient } from '@/lib/api-client'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { 
  BookOpen, 
  Download, 
  Key, 
  Settings, 
  Terminal, 
  Upload, 
  CheckCircle, 
  ArrowRight,
  ExternalLink,
  Copy,
  Server,
  Globe,
  Eye,
  EyeOff,
  Plus,
  Save,
  Trash2
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface ApiKey {
  id: string
  name: string
  key_prefix?: string
  key_preview?: string
  api_key?: string
  full_key?: string
  created_at: string
  last_used?: string
  is_active: boolean
  expires_at?: string
}

export default function GettingStartedPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [apiKeysLoading, setApiKeysLoading] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [creatingKey, setCreatingKey] = useState(false)
  const [showFullKey, setShowFullKey] = useState<Record<string, boolean>>({})
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const { toast } = useToast()

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
      setApiKeys([])
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
        const newKey: ApiKey = {
          id: (response.data as any).id,
          name: (response.data as any).name,
          key_preview: (response.data as any).key_preview,
          api_key: (response.data as any).api_key,
          full_key: (response.data as any).api_key,
          created_at: (response.data as any).created_at,
          is_active: true,
          expires_at: (response.data as any).expires_at
        }
        
        setApiKeys(prev => [newKey, ...prev])
        setShowFullKey(prev => ({ ...prev, [newKey.id]: true }))
        
        toast({
          title: locale === 'ko' ? 'API 키 생성됨' : 'API key created',
          description: response.message || (locale === 'ko' ? '새 API 키가 생성되었습니다. 안전한 곳에 보관하세요.' : 'New API key has been created. Please save it safely.'),
        })
        setNewKeyName('')
        
        // API 키 생성이 완료되면 다음 단계로 진행
        setCurrentStep(Math.max(1, currentStep))
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

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: locale === 'ko' ? '복사됨' : 'Copied',
      description: `${label} ${locale === 'ko' ? '이 클립보드에 복사되었습니다' : 'copied to clipboard'}`,
    })
  }

  // 컴포넌트 마운트 시 API 키 목록 로드
  useEffect(() => {
    if (user?.id) {
      fetchApiKeys()
    }
  }, [user?.id])

  const steps = [
    {
      id: 'api-key',
      title: locale === 'ko' ? 'API 키 생성' : 'Create API Key',
      description: locale === 'ko' ? 'CLI 도구와 연동하기 위한 API 키를 생성하세요' : 'Generate an API key to connect with CLI tools',
      icon: Key,
      completed: false
    },
    {
      id: 'cli-install',
      title: locale === 'ko' ? 'CLI 도구 설치' : 'Install CLI Tool',
      description: locale === 'ko' ? 'VibeReview Uploader CLI를 설치하세요' : 'Install the VibeReview Uploader CLI',
      icon: Download,
      completed: false
    },
    {
      id: 'cli-config',
      title: locale === 'ko' ? 'CLI 설정' : 'Configure CLI',
      description: locale === 'ko' ? 'CLI 도구를 설정하고 인증하세요' : 'Set up and authenticate the CLI tool',
      icon: Settings,
      completed: false
    },
    {
      id: 'upload-sessions',
      title: locale === 'ko' ? '세션 업로드' : 'Upload Sessions',
      description: locale === 'ko' ? 'Claude Code 세션 파일을 업로드하세요' : 'Upload your Claude Code session files',
      icon: Upload,
      completed: false
    }
  ]

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-8">
          {/* 헤더 */}
          <div className="text-center space-y-4">
            <div className="flex items-center justify-center gap-2">
              <BookOpen className="h-8 w-8 text-primary" />
              <h1 className="text-3xl font-bold">
                {locale === 'ko' ? '시작하기' : 'Getting Started'}
              </h1>
            </div>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              {locale === 'ko' 
                ? 'VibeReview를 사용하여 Claude Code 세션을 분석하고 팀과 협업해보세요. 아래 단계를 따라 설정을 완료하세요.' 
                : 'Use VibeReview to analyze your Claude Code sessions and collaborate with your team. Follow the steps below to get started.'
              }
            </p>
          </div>

          {/* 진행 상황 표시 */}
          <div className="flex justify-center">
            <div className="flex items-center space-x-2">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full border-2 ${
                    index <= currentStep 
                      ? 'bg-primary text-primary-foreground border-primary' 
                      : 'border-muted-foreground text-muted-foreground'
                  }`}>
                    {step.completed ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <span className="text-sm font-medium">{index + 1}</span>
                    )}
                  </div>
                  {index < steps.length - 1 && (
                    <ArrowRight className={`h-4 w-4 mx-2 ${
                      index < currentStep ? 'text-primary' : 'text-muted-foreground'
                    }`} />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 단계별 가이드 */}
          <div className="grid gap-6">
            
            {/* 1단계: API 키 생성 */}
            <Card className={currentStep >= 0 ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  {locale === 'ko' ? '1단계: API 키 생성' : 'Step 1: Create API Key'}
                </CardTitle>
                <CardDescription>
                  {locale === 'ko' 
                    ? 'CLI 도구가 VibeReview API 서버에 접근할 수 있도록 API 키를 생성하세요.' 
                    : 'Generate an API key so the CLI tool can access the VibeReview API server.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert>
                  <Key className="h-4 w-4" />
                  <AlertDescription>
                    {locale === 'ko' 
                      ? 'API 키는 한 번만 표시되므로 안전한 곳에 보관하세요.' 
                      : 'API keys are only shown once, so store them safely.'
                    }
                  </AlertDescription>
                </Alert>
                
                {/* 새 키 생성 입력 */}
                <div className="space-y-4">
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <Label htmlFor="api-key-name" className="text-sm font-medium">
                        {locale === 'ko' ? 'API 키 이름' : 'API Key Name'}
                      </Label>
                      <Input
                        id="api-key-name"
                        placeholder={locale === 'ko' ? 'CLI Tool' : 'CLI Tool'}
                        value={newKeyName}
                        onChange={(e) => setNewKeyName(e.target.value)}
                        disabled={creatingKey}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
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
                            {locale === 'ko' ? '생성' : 'Create'}
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
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
                      <div key={apiKey.id} className="flex items-center justify-between p-3 border rounded-lg bg-muted/30">
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{apiKey.name}</span>
                            <Badge variant={apiKey.is_active ? 'default' : 'secondary'}>
                              {apiKey.is_active ? (locale === 'ko' ? '활성' : 'Active') : (locale === 'ko' ? '비활성' : 'Inactive')}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-background px-2 py-1 rounded font-mono">
                              {showFullKey[apiKey.id] 
                                ? (apiKey.api_key || apiKey.full_key || apiKey.key_preview || 'Hidden') 
                                : (apiKey.key_preview || `${apiKey.key_prefix || 'vr_'}${'*'.repeat(20)}`)
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
                            {(showFullKey[apiKey.id] || apiKey.api_key || apiKey.full_key) && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => copyToClipboard(apiKey.api_key || apiKey.full_key || apiKey.key_preview || '', 'API key')}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">
                            {locale === 'ko' ? '생성일' : 'Created'}: {new Date(apiKey.created_at).toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US')}
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

                {apiKeys.length > 0 && (
                  <Button 
                    onClick={() => setCurrentStep(Math.max(1, currentStep))}
                    className="w-full sm:w-auto"
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    {locale === 'ko' ? 'API 키 준비 완료' : 'API Key Ready'}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* 2단계: CLI 도구 설치 */}
            <Card className={currentStep >= 1 ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  {locale === 'ko' ? '2단계: CLI 도구 설치' : 'Step 2: Install CLI Tool'}
                </CardTitle>
                <CardDescription>
                  {locale === 'ko' 
                    ? 'VibeReview Uploader를 전역으로 설치하여 어디서든 사용할 수 있게 하세요.' 
                    : 'Install VibeReview Uploader globally to use it from anywhere.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">NPM</Badge>
                    <span className="text-sm font-medium">
                      {locale === 'ko' ? '권장 설치 방법' : 'Recommended Installation'}
                    </span>
                  </div>
                  
                  <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                    <div className="flex items-center justify-between">
                      <code>npm install -g vibereview-uploader</code>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => copyToClipboard('npm install -g vibereview-uploader', 'Install command')}
                      >
                        <Copy className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {locale === 'ko' ? '설치 확인:' : 'Verify Installation:'}
                    </p>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                      <div className="flex items-center justify-between">
                        <code>vibe-uploader --version</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('vibe-uploader --version', 'Version command')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Terminal className="h-4 w-4" />
                    <AlertDescription>
                      {locale === 'ko' 
                        ? 'Node.js 18 이상이 필요합니다. node --version으로 확인하세요.' 
                        : 'Node.js 18+ is required. Check with node --version.'
                      }
                    </AlertDescription>
                  </Alert>
                </div>

                <Button 
                  onClick={() => setCurrentStep(Math.max(2, currentStep))}
                  className="w-full sm:w-auto"
                  disabled={currentStep < 1}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {locale === 'ko' ? 'CLI 설치 완료' : 'CLI Installed'}
                </Button>
              </CardContent>
            </Card>

            {/* 3단계: CLI 설정 */}
            <Card className={currentStep >= 2 ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  {locale === 'ko' ? '3단계: CLI 설정' : 'Step 3: Configure CLI'}
                </CardTitle>
                <CardDescription>
                  {locale === 'ko' 
                    ? 'CLI 도구를 초기화하고 API 키로 인증하세요.' 
                    : 'Initialize the CLI tool and authenticate with your API key.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {locale === 'ko' ? '1. 초기화:' : '1. Initialize:'}
                    </p>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                      <div className="flex items-center justify-between">
                        <code>vibe-uploader init</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('vibe-uploader init', 'Init command')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {locale === 'ko' ? '2. API 서버 URL 설정:' : '2. Set API Server URL:'}
                    </p>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                      <div className="flex items-center justify-between">
                        <code>{process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard(process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001', 'API Server URL')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {locale === 'ko' ? '3. 로그인 (API 키 입력):' : '3. Login (Enter API Key):'}
                    </p>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                      <div className="flex items-center justify-between">
                        <code>vibe-uploader login</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('vibe-uploader login', 'Login command')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <Alert>
                    <Server className="h-4 w-4" />
                    <AlertDescription>
                      {locale === 'ko' 
                        ? '로컬 개발 환경에서는 http://localhost:3001을 사용하세요. 프로덕션 환경에서는 실제 서버 URL을 입력하세요.' 
                        : 'Use http://localhost:3001 for local development. Enter the actual server URL for production.'
                      }
                    </AlertDescription>
                  </Alert>
                </div>

                <Button 
                  onClick={() => setCurrentStep(Math.max(3, currentStep))}
                  className="w-full sm:w-auto"
                  disabled={currentStep < 2}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {locale === 'ko' ? 'CLI 설정 완료' : 'CLI Configured'}
                </Button>
              </CardContent>
            </Card>

            {/* 4단계: 세션 업로드 */}
            <Card className={currentStep >= 3 ? 'ring-2 ring-primary' : ''}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {locale === 'ko' ? '4단계: 세션 업로드' : 'Step 4: Upload Sessions'}
                </CardTitle>
                <CardDescription>
                  {locale === 'ko' 
                    ? 'Claude Code 세션 파일을 업로드하여 분석을 시작하세요.' 
                    : 'Upload your Claude Code session files to start analyzing.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {locale === 'ko' ? '모든 세션 파일 업로드 (권장):' : 'Upload All Session Files (Recommended):'}
                    </p>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                      <div className="flex items-center justify-between">
                        <code>vibe-uploader upload-all</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('vibe-uploader upload-all', 'Upload all command')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {locale === 'ko' ? '최근 파일만 업로드:' : 'Upload Recent Files Only:'}
                    </p>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm space-y-1">
                      <div className="flex items-center justify-between">
                        <code>vibe-uploader upload-all --recent 24h</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('vibe-uploader upload-all --recent 24h', 'Recent 24h command')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="flex items-center justify-between">
                        <code>vibe-uploader upload-all --recent 7d</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('vibe-uploader upload-all --recent 7d', 'Recent 7d command')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm font-medium">
                      {locale === 'ko' ? '업로드 상태 확인:' : 'Check Upload Status:'}
                    </p>
                    <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                      <div className="flex items-center justify-between">
                        <code>vibe-uploader status</code>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => copyToClipboard('vibe-uploader status', 'Status command')}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Alert>
                      <Upload className="h-4 w-4" />
                      <AlertDescription>
                        {locale === 'ko' 
                          ? '지원 파일: session-*.jsonl, *.claude-session.jsonl' 
                          : 'Supported files: session-*.jsonl, *.claude-session.jsonl'
                        }
                      </AlertDescription>
                    </Alert>
                    <Alert>
                      <Globe className="h-4 w-4" />
                      <AlertDescription>
                        {locale === 'ko' 
                          ? '업로드된 데이터는 팀 단위로 안전하게 격리됩니다' 
                          : 'Uploaded data is securely isolated by team'
                        }
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>

                <Button 
                  onClick={() => setCurrentStep(4)}
                  className="w-full sm:w-auto"
                  disabled={currentStep < 3}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {locale === 'ko' ? '세션 업로드 완료' : 'Sessions Uploaded'}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* 완료 메시지 */}
          {currentStep >= 4 && (
            <Card className="bg-primary/5 border-primary">
              <CardContent className="pt-6">
                <div className="text-center space-y-4">
                  <CheckCircle className="h-12 w-12 text-primary mx-auto" />
                  <h3 className="text-xl font-semibold text-primary">
                    {locale === 'ko' ? '설정 완료! 🎉' : 'Setup Complete! 🎉'}
                  </h3>
                  <p className="text-muted-foreground">
                    {locale === 'ko' 
                      ? '이제 VibeReview에서 Claude Code 세션을 분석하고 팀과 협업할 수 있습니다.' 
                      : 'You can now analyze your Claude Code sessions and collaborate with your team on VibeReview.'
                    }
                  </p>
                  <div className="flex justify-center gap-4">
                    <Button onClick={() => window.location.href = '/projects'}>
                      {locale === 'ko' ? '프로젝트 보기' : 'View Projects'}
                    </Button>
                    <Button variant="outline" onClick={() => window.location.href = '/'}>
                      {locale === 'ko' ? '대시보드로 이동' : 'Go to Dashboard'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* 추가 리소스 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {locale === 'ko' ? '추가 리소스' : 'Additional Resources'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <h4 className="font-medium">
                    {locale === 'ko' ? 'CLI 도구 도움말' : 'CLI Tool Help'}
                  </h4>
                  <div className="bg-muted p-3 rounded font-mono text-sm">
                    <code>vibe-uploader --help</code>
                  </div>
                </div>
                <div className="space-y-2">
                  <h4 className="font-medium">
                    {locale === 'ko' ? '상세 로그 확인' : 'View Detailed Logs'}
                  </h4>
                  <div className="bg-muted p-3 rounded font-mono text-sm">
                    <code>vibe-uploader logs</code>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="text-sm text-muted-foreground">
                <p>
                  {locale === 'ko' 
                    ? '문제가 발생하면 설정을 다시 확인하거나 API 키를 새로 발급받아 보세요.' 
                    : 'If you encounter issues, double-check your configuration or generate a new API key.'
                  }
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}