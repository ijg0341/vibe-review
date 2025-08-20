'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Key, 
  Copy, 
  Trash2, 
  Plus,
  Eye,
  EyeOff,
  Clock,
  Activity,
  Shield,
  AlertCircle
} from 'lucide-react'
import crypto from 'crypto'

interface ApiKey {
  id: string
  name: string
  description?: string
  key_prefix: string
  is_active: boolean
  last_used_at?: string
  usage_count: number
  created_at: string
  expires_at?: string
}

export default function ApiKeysPage() {
  const [apiKeys, setApiKeys] = useState<ApiKey[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyDescription, setNewKeyDescription] = useState('')
  const [generatedKey, setGeneratedKey] = useState<string | null>(null)
  const [showKey, setShowKey] = useState(false)
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const supabase = createClient()
  const { toast } = useToast()

  // API 키 목록 조회
  const fetchApiKeys = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      const { data, error } = await supabase
        .from('api_keys')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('Error fetching API keys:', error)
        toast({
          variant: 'destructive',
          title: locale === 'ko' ? 'API 키 조회 실패' : 'Failed to fetch API keys',
          description: error.message
        })
        return
      }

      setApiKeys(data || [])
    } catch (error) {
      console.error('Error in fetchApiKeys:', error)
    } finally {
      setLoading(false)
    }
  }

  // API 키 생성
  const createApiKey = async () => {
    if (!user?.id || !newKeyName.trim()) {
      toast({
        variant: 'destructive',
        title: locale === 'ko' ? '키 이름을 입력하세요' : 'Please enter a key name',
      })
      return
    }

    try {
      setCreating(true)
      
      // 실제 API 키 생성 (클라이언트 사이드)
      const randomBytes = crypto.getRandomValues(new Uint8Array(32))
      const randomString = Array.from(randomBytes)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      const apiKey = `vibe_${randomString.substring(0, 32)}`
      const keyHash = await crypto.subtle.digest(
        'SHA-256',
        new TextEncoder().encode(apiKey)
      )
      const hashHex = Array.from(new Uint8Array(keyHash))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')
      
      // DB에 저장
      const { data, error } = await supabase
        .from('api_keys')
        .insert({
          user_id: user.id,
          name: newKeyName,
          description: newKeyDescription || null,
          key_hash: hashHex,
          key_prefix: apiKey.substring(0, 12),
          is_active: true
        })
        .select()
        .single()

      if (error) {
        console.error('Error creating API key:', error)
        toast({
          variant: 'destructive',
          title: locale === 'ko' ? 'API 키 생성 실패' : 'Failed to create API key',
          description: error.message
        })
        return
      }

      // 생성된 키 표시
      setGeneratedKey(apiKey)
      setShowKey(true)
      
      // 입력 필드 초기화
      setNewKeyName('')
      setNewKeyDescription('')
      
      // 목록 새로고침
      await fetchApiKeys()
      
      toast({
        title: locale === 'ko' ? 'API 키 생성 완료' : 'API key created',
        description: locale === 'ko' ? 
          '이 키는 다시 볼 수 없으니 안전한 곳에 저장하세요.' : 
          'This key cannot be viewed again. Please save it securely.'
      })
    } catch (error) {
      console.error('Error in createApiKey:', error)
    } finally {
      setCreating(false)
    }
  }

  // API 키 삭제
  const deleteApiKey = async (keyId: string) => {
    if (!confirm(locale === 'ko' ? 
      '이 API 키를 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.' : 
      'Are you sure you want to delete this API key? This action cannot be undone.')) {
      return
    }

    try {
      const { error } = await supabase
        .from('api_keys')
        .delete()
        .eq('id', keyId)

      if (error) {
        console.error('Error deleting API key:', error)
        toast({
          variant: 'destructive',
          title: locale === 'ko' ? 'API 키 삭제 실패' : 'Failed to delete API key',
          description: error.message
        })
        return
      }

      toast({
        title: locale === 'ko' ? 'API 키 삭제 완료' : 'API key deleted',
      })
      
      await fetchApiKeys()
    } catch (error) {
      console.error('Error in deleteApiKey:', error)
    }
  }

  // API 키 활성화/비활성화 토글
  const toggleApiKey = async (keyId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('api_keys')
        .update({ is_active: !currentStatus })
        .eq('id', keyId)

      if (error) {
        console.error('Error toggling API key:', error)
        toast({
          variant: 'destructive',
          title: locale === 'ko' ? 'API 키 상태 변경 실패' : 'Failed to toggle API key',
          description: error.message
        })
        return
      }

      toast({
        title: locale === 'ko' ? 
          (currentStatus ? 'API 키 비활성화됨' : 'API 키 활성화됨') : 
          (currentStatus ? 'API key deactivated' : 'API key activated'),
      })
      
      await fetchApiKeys()
    } catch (error) {
      console.error('Error in toggleApiKey:', error)
    }
  }

  // 클립보드 복사
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: locale === 'ko' ? '클립보드에 복사됨' : 'Copied to clipboard',
    })
  }

  useEffect(() => {
    fetchApiKeys()
  }, [user?.id])

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString(locale === 'ko' ? 'ko-KR' : 'en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* 헤더 */}
          <div>
            <h1 className="text-3xl font-bold">
              {locale === 'ko' ? 'API 키 관리' : 'API Keys'}
            </h1>
            <p className="text-muted-foreground">
              {locale === 'ko' 
                ? 'CLI 및 자동화를 위한 API 키를 관리하세요' 
                : 'Manage API keys for CLI and automation'
              }
            </p>
          </div>

          {/* 새 API 키 생성 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {locale === 'ko' ? '새 API 키 생성' : 'Create New API Key'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? 'CLI 도구나 자동화 스크립트에서 사용할 API 키를 생성하세요' 
                  : 'Create an API key for use with CLI tools or automation scripts'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium">
                    {locale === 'ko' ? '키 이름' : 'Key Name'}
                  </label>
                  <Input
                    placeholder={locale === 'ko' ? '예: CLI 업로드 키' : 'e.g., CLI Upload Key'}
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    disabled={creating}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {locale === 'ko' ? '설명 (선택)' : 'Description (Optional)'}
                  </label>
                  <Input
                    placeholder={locale === 'ko' ? '키 용도 설명' : 'Describe the key purpose'}
                    value={newKeyDescription}
                    onChange={(e) => setNewKeyDescription(e.target.value)}
                    disabled={creating}
                  />
                </div>
              </div>
              
              <Button onClick={createApiKey} disabled={creating || !newKeyName.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                {creating ? 
                  (locale === 'ko' ? '생성 중...' : 'Creating...') : 
                  (locale === 'ko' ? 'API 키 생성' : 'Create API Key')
                }
              </Button>

              {/* 생성된 키 표시 */}
              {generatedKey && (
                <div className="p-4 bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800 rounded-lg">
                  <div className="flex items-start gap-2 mb-2">
                    <Shield className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-medium text-green-900 dark:text-green-100">
                        {locale === 'ko' ? 'API 키가 생성되었습니다!' : 'API Key Generated!'}
                      </p>
                      <p className="text-sm text-green-700 dark:text-green-300 mt-1">
                        {locale === 'ko' 
                          ? '이 키는 다시 표시되지 않으니 안전한 곳에 저장하세요.' 
                          : 'This key will not be shown again. Please save it securely.'
                        }
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <code className="flex-1 p-2 bg-white dark:bg-gray-900 rounded font-mono text-sm">
                      {showKey ? generatedKey : '••••••••••••••••••••••••••••••••'}
                    </code>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowKey(!showKey)}
                    >
                      {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(generatedKey)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* API 키 목록 */}
          <Card>
            <CardHeader>
              <CardTitle>
                {locale === 'ko' ? '내 API 키' : 'My API Keys'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? '생성된 API 키 목록과 사용 현황' 
                  : 'List of created API keys and usage status'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">
                    {locale === 'ko' ? 'API 키를 불러오는 중...' : 'Loading API keys...'}
                  </p>
                </div>
              ) : apiKeys.length === 0 ? (
                <div className="text-center py-8">
                  <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    {locale === 'ko' ? 'API 키가 없습니다' : 'No API keys'}
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {apiKeys.map((key) => (
                    <div
                      key={key.id}
                      className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <h3 className="font-medium">{key.name}</h3>
                            <Badge variant={key.is_active ? 'default' : 'secondary'}>
                              {key.is_active ? 
                                (locale === 'ko' ? '활성' : 'Active') : 
                                (locale === 'ko' ? '비활성' : 'Inactive')
                              }
                            </Badge>
                          </div>
                          
                          {key.description && (
                            <p className="text-sm text-muted-foreground mt-1">
                              {key.description}
                            </p>
                          )}
                          
                          <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                            <span className="font-mono">{key.key_prefix}...</span>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>
                                {locale === 'ko' ? '생성' : 'Created'}: {formatDate(key.created_at)}
                              </span>
                            </div>
                            {key.last_used_at && (
                              <div className="flex items-center gap-1">
                                <Activity className="h-3 w-3" />
                                <span>
                                  {locale === 'ko' ? '마지막 사용' : 'Last used'}: {formatDate(key.last_used_at)}
                                </span>
                              </div>
                            )}
                            <div className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              <span>
                                {locale === 'ko' ? '사용 횟수' : 'Usage'}: {key.usage_count}
                              </span>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleApiKey(key.id, key.is_active)}
                          >
                            {key.is_active ? 
                              (locale === 'ko' ? '비활성화' : 'Deactivate') : 
                              (locale === 'ko' ? '활성화' : 'Activate')
                            }
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteApiKey(key.id)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* 사용 가이드 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                {locale === 'ko' ? '사용 가이드' : 'Usage Guide'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">
                  {locale === 'ko' ? 'CLI에서 사용하기' : 'Using with CLI'}
                </h4>
                <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
                  <code>{`# Install CLI tool
npm install -g vibe-upload-cli

# Configure API key
vibe-upload config --api-key YOUR_API_KEY

# Upload JSONL files
vibe-upload ~/.claude/projects/*/`}</code>
                </pre>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">
                  {locale === 'ko' ? 'cURL로 직접 업로드' : 'Direct upload with cURL'}
                </h4>
                <pre className="p-3 bg-muted rounded-md text-sm overflow-x-auto">
                  <code>{`curl -X POST YOUR_SERVER_URL/api/upload \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectName": "my-project",
    "fileName": "session.jsonl",
    "content": "JSONL_FILE_CONTENT"
  }'`}</code>
                </pre>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}