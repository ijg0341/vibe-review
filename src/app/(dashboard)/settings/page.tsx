'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { createClient } from '@/lib/supabase/client'
import { ApiKeyManager } from '@/lib/api-key-manager'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { 
  Key, 
  Copy, 
  Download,
  Terminal,
  Code,
  FileText,
  CheckCircle2,
  AlertCircle,
  Settings as SettingsIcon,
  Folder,
  Globe,
  Eye,
  EyeOff,
  Clock,
  Upload
} from 'lucide-react'

interface UserSettings {
  project_path?: string
}

export default function SettingsPage() {
  const [apiKey, setApiKey] = useState<string>('')
  const [apiKeyPrefix, setApiKeyPrefix] = useState<string>('')
  const [showFullKey, setShowFullKey] = useState(false)
  const [projectPath, setProjectPath] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const supabase = createClient()
  const { toast } = useToast()
  const apiKeyManager = new ApiKeyManager()

  const serverUrl = typeof window !== 'undefined' ? window.location.origin : ''

  // API 키 조회
  const fetchApiKey = async () => {
    if (!user?.id) return

    try {
      const result = await apiKeyManager.getActiveApiKey(user.id)
      
      if (result.error) {
        console.log('No existing API key found')
        return
      }
      
      if (result.keyPrefix) {
        setApiKeyPrefix(result.keyPrefix)
      }
    } catch (error) {
      console.error('Error fetching API key:', error)
    }
  }

  // 새 API 키 생성
  const generateNewApiKey = async () => {
    if (!user?.id) return

    try {
      // 기존 키 삭제
      await supabase
        .from('api_keys')
        .delete()
        .eq('user_id', user.id)
        .eq('name', 'Default CLI Key')
      
      // 새 키 생성
      const result = await apiKeyManager.getOrCreateDefaultApiKey(user.id)
      
      if (result.error) {
        console.error('Error creating API key:', result.error)
        toast({
          variant: 'destructive',
          title: locale === 'ko' ? 'API 키 생성 실패' : 'Failed to create API key',
          description: result.error
        })
        return
      }
      
      if (result.key) {
        setApiKey(result.key)
        setApiKeyPrefix(result.keyPrefix || '')
        
        toast({
          title: locale === 'ko' ? 'API 키 생성됨' : 'API key created',
          description: locale === 'ko' 
            ? '새 API 키가 생성되었습니다. 이 키는 다시 표시되지 않으니 안전한 곳에 저장하세요.' 
            : 'New API key created. This key will not be shown again, please save it securely.'
        })
      }
    } catch (error) {
      console.error('Error generating API key:', error)
    }
  }

  // 사용자 설정 조회
  const fetchUserSettings = async () => {
    if (!user?.id) return

    try {
      setLoading(true)
      
      // user_settings 테이블에서 설정 조회 - RPC 대신 직접 쿼리
      const { data: settings, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single()
      
      if (error) {
        console.error('Error fetching settings:', error)
        // 테이블이 없는 경우 프로젝트에서 폴백
        const { data: projectMembers } = await supabase
          .from('project_members')
          .select('project_id')
          .eq('user_id', user.id)
          .limit(1)

        if (projectMembers && projectMembers.length > 0) {
          const { data: project } = await supabase
            .from('projects')
            .select('folder_path')
            .eq('id', projectMembers[0].project_id)
            .single()
          
          if (project?.folder_path) {
            setProjectPath(project.folder_path)
          }
        }
      } else if (settings) {
        setProjectPath(settings.project_path || '')
      }
      
    } catch (error) {
      console.error('Error fetching settings:', error)
    } finally {
      setLoading(false)
    }
  }

  // 설정 저장
  const saveSettings = async () => {
    if (!user?.id) return

    try {
      setSaving(true)
      
      // user_settings 테이블에 저장
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          project_path: projectPath,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })
      
      if (error) {
        console.error('Database save error:', error)
        // 폴백: 로컬 스토리지에 저장
        localStorage.setItem('vibe_project_path', projectPath)
      } else {
        // 로컬 스토리지에도 저장 (캐시용)
        localStorage.setItem('vibe_project_path', projectPath)
      }
      
      toast({
        title: locale === 'ko' ? '설정이 저장되었습니다' : 'Settings saved',
      })
    } catch (error) {
      console.error('Error saving settings:', error)
      toast({
        variant: 'destructive',
        title: locale === 'ko' ? '설정 저장 실패' : 'Failed to save settings',
      })
    } finally {
      setSaving(false)
    }
  }

  // 클립보드 복사
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    toast({
      title: locale === 'ko' ? '클립보드에 복사됨' : 'Copied to clipboard',
    })
  }

  // 스크립트 다운로드
  const downloadScript = (scriptName: string) => {
    let content = ''
    
    if (scriptName === 'auto-upload.sh') {
      // 실제 API 키 사용 (전체 키가 있으면 사용, 없으면 placeholder)
      const apiKeyValue = apiKey || (apiKeyPrefix ? `${apiKeyPrefix}...` : 'YOUR_API_KEY')
      
      content = `#!/bin/bash
# Vibe Upload Script
# Auto-generated for ${user?.email}
# Generated at: ${new Date().toISOString()}

# Configuration
API_KEY="${apiKeyValue}"  # ${apiKey ? 'This is your actual API key' : 'Replace with your actual API key'}
SERVER_URL="${serverUrl}"
PROJECT_PATH="${projectPath || '~/projects'}"

# Colors for output
RED='\\033[0;31m'
GREEN='\\033[0;32m'
YELLOW='\\033[1;33m'
BLUE='\\033[0;34m'
NC='\\033[0m' # No Color

echo -e "\${BLUE}╔════════════════════════════════╗\${NC}"
echo -e "\${BLUE}║   Vibe Upload Auto Script      ║\${NC}"
echo -e "\${BLUE}╚════════════════════════════════╝\${NC}"
echo ""

# Check if vibe-upload CLI is installed
if ! command -v vibe-upload &> /dev/null; then
  echo -e "\${YELLOW}Installing vibe-upload CLI...\${NC}"
  npm install -g vibe-upload-cli
fi

# Configure CLI
echo -e "\${BLUE}Configuring CLI...\${NC}"
vibe-upload config --api-key "\$API_KEY" --server-url "\$SERVER_URL"

# Upload from project path
echo -e "\${BLUE}Uploading from \$PROJECT_PATH...\${NC}"
vibe-upload "\$PROJECT_PATH"

echo -e "\${GREEN}✨ Upload complete!\${NC}"
`
    } else if (scriptName === 'viberc') {
      const apiKeyValue = apiKey || (apiKeyPrefix ? `${apiKeyPrefix}...` : 'YOUR_API_KEY')
      
      content = JSON.stringify({
        apiKey: apiKeyValue,
        serverUrl: serverUrl,
        projectPath: projectPath || '~/projects'
      }, null, 2)
    }

    // 다운로드 트리거
    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = scriptName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    toast({
      title: locale === 'ko' ? '다운로드 시작됨' : 'Download started',
      description: scriptName,
    })
  }

  // 설치 명령어 생성
  const getInstallCommand = () => {
    const apiKeyValue = apiKey || (apiKeyPrefix ? `${apiKeyPrefix}...` : 'YOUR_API_KEY')
    return `curl -o vibe-upload.js "${serverUrl}/api/download/cli?type=script" && \\
chmod +x vibe-upload.js && \\
sudo mv vibe-upload.js /usr/local/bin/vibe-upload && \\
vibe-upload config --api-key ${apiKeyValue} --server-url ${serverUrl}`
  }

  // 업로드 명령어 생성
  const getUploadCommand = () => {
    // Claude 세션이 저장되는 기본 경로 사용
    return `vibe-upload ~/.claude/projects`
  }

  useEffect(() => {
    fetchApiKey()
    fetchUserSettings()
  }, [user?.id])

  useEffect(() => {
    // 로컬 스토리지에서 설정 불러오기
    const savedProjectPath = localStorage.getItem('vibe_project_path')
    
    if (savedProjectPath) setProjectPath(savedProjectPath)
  }, [])

  return (
    <ProtectedRoute>
      <DashboardLayout>
        <div className="space-y-6">
          {/* 헤더 */}
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <SettingsIcon className="h-8 w-8" />
              {locale === 'ko' ? 'CLI 설정' : 'CLI Settings'}
            </h1>
            <p className="text-muted-foreground">
              {locale === 'ko' 
                ? 'CLI 도구 및 자동 업로드 설정' 
                : 'Configure CLI tools and automatic uploads'
              }
            </p>
          </div>

          {/* 1. API 설정 섹션 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Key className="h-5 w-5" />
                {locale === 'ko' ? 'API 설정' : 'API Configuration'}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  {locale === 'ko' ? 'API 키' : 'API Key'}
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-muted rounded font-mono text-sm break-all">
                    {apiKey || (apiKeyPrefix ? `${apiKeyPrefix}...` : 'No API key found')}
                  </code>
                  {(apiKey || apiKeyPrefix) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(apiKey || apiKeyPrefix || '')}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                {(!apiKey && !apiKeyPrefix) || apiKeyPrefix ? (
                  <Button
                    className="mt-2"
                    variant="outline"
                    size="sm"
                    onClick={generateNewApiKey}
                  >
                    <Key className="mr-2 h-3 w-3" />
                    {locale === 'ko' ? '새 API 키 생성' : 'Generate New API Key'}
                  </Button>
                ) : null}
                
                {showFullKey && apiKey && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    {locale === 'ko' 
                      ? '⚠️ 이 키는 10초 후 자동으로 숨겨집니다. 안전한 곳에 저장하세요.' 
                      : '⚠️ This key will be hidden automatically in 10 seconds. Save it securely.'
                    }
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium">
                  {locale === 'ko' ? '서버 URL' : 'Server URL'}
                </label>
                <div className="flex items-center gap-2 mt-1">
                  <code className="flex-1 p-2 bg-muted rounded font-mono text-sm">
                    {serverUrl}
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => copyToClipboard(serverUrl)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 2. 경로 설정 섹션 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Folder className="h-5 w-5" />
                {locale === 'ko' ? '경로 설정' : 'Path Configuration'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? '프로젝트 이름을 결정하는 중요한 설정입니다' 
                  : 'Important setting that determines project names'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium">
                  {locale === 'ko' ? '작업 디렉토리' : 'Working Directory'}
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  {locale === 'ko' 
                    ? '프로젝트들이 위치한 기본 디렉토리 (예: /Users/username/projects)' 
                    : 'Base directory where your projects are located'
                  }
                </p>
                <Input
                  value={projectPath}
                  onChange={(e) => setProjectPath(e.target.value)}
                  placeholder="/Users/username/projects"
                />
              </div>

              <Button onClick={saveSettings} disabled={saving}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {saving 
                  ? (locale === 'ko' ? '저장 중...' : 'Saving...') 
                  : (locale === 'ko' ? '설정 저장' : 'Save Settings')
                }
              </Button>

              <div className="p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {locale === 'ko' 
                    ? '💡 작업 디렉토리를 설정하면 프로젝트 이름이 자동으로 추출됩니다.' 
                    : '💡 Setting working directory helps extract project names automatically.'
                  }
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                  {locale === 'ko' 
                    ? '예: /Users/john/work → work 폴더의 프로젝트들이 올바른 이름으로 업로드됩니다' 
                    : 'Example: /Users/john/work → Projects in work folder will be uploaded with correct names'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 3. CLI 설치 및 설정 섹션 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Terminal className="h-5 w-5" />
                {locale === 'ko' ? 'CLI 설치 및 설정' : 'CLI Installation & Setup'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? 'CLI 도구를 다운로드하고 설정하세요' 
                  : 'Download and configure the CLI tool'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-medium mb-2">
                    {locale === 'ko' ? '1. CLI 다운로드 및 설치' : '1. Download and install CLI'}
                  </p>
                  <div className="relative">
                    <pre className="p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                      <code>{`# Download CLI
curl -o vibe-upload.js "${serverUrl}/api/download/cli?type=script"
chmod +x vibe-upload.js
sudo mv vibe-upload.js /usr/local/bin/vibe-upload`}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => copyToClipboard(`curl -o vibe-upload.js "${serverUrl}/api/download/cli?type=script" && chmod +x vibe-upload.js && sudo mv vibe-upload.js /usr/local/bin/vibe-upload`)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium mb-2">
                    {locale === 'ko' ? '2. API 키 설정' : '2. Configure API key'}
                  </p>
                  <div className="relative">
                    <pre className="p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                      <code>{`vibe-upload config --api-key ${apiKey || apiKeyPrefix || 'YOUR_API_KEY'} --server-url ${serverUrl}`}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => copyToClipboard(`vibe-upload config --api-key ${apiKey || apiKeyPrefix || 'YOUR_API_KEY'} --server-url ${serverUrl}`)}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium mb-2">
                    {locale === 'ko' ? '3. 업로드 실행' : '3. Run upload'}
                  </p>
                  <div className="relative">
                    <pre className="p-3 bg-gray-900 text-gray-100 rounded text-xs overflow-x-auto">
                      <code>{getUploadCommand()}</code>
                    </pre>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="absolute top-1 right-1"
                      onClick={() => copyToClipboard(getUploadCommand())}
                    >
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
              
              {showFullKey && apiKey && (
                <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-green-700 dark:text-green-300">
                      {locale === 'ko' 
                        ? '새 API 키가 생성되었습니다!' 
                        : 'New API key created!'
                      }
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {locale === 'ko' 
                        ? '위 명령어에 자동으로 포함되었습니다. 이 키는 10초 후 숨겨집니다.' 
                        : 'Automatically included in the command above. This key will be hidden in 10 seconds.'
                      }
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. 고급 설정 - 수동 업로드 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                {locale === 'ko' ? '수동 업로드' : 'Manual Upload'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? '특정 프로젝트를 수동으로 업로드하세요' 
                  : 'Manually upload specific projects'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">
                  {locale === 'ko' ? '전체 세션 업로드' : 'Upload All Sessions'}
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  {locale === 'ko' 
                    ? 'Claude의 모든 프로젝트 세션을 한 번에 업로드합니다' 
                    : 'Upload all Claude project sessions at once'
                  }
                </p>
                <div className="relative">
                  <pre className="p-3 bg-muted rounded text-sm font-mono">
                    vibe-upload ~/.claude/projects
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1"
                    onClick={() => copyToClipboard('vibe-upload ~/.claude/projects')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">
                  {locale === 'ko' ? '특정 프로젝트 업로드' : 'Upload Specific Project'}
                </label>
                <p className="text-xs text-muted-foreground mb-2">
                  {locale === 'ko' 
                    ? 'project-session을 실제 프로젝트 폴더명으로 바꿔주세요' 
                    : 'Replace project-session with your actual project folder name'
                  }
                </p>
                <div className="relative">
                  <pre className="p-3 bg-muted rounded text-sm font-mono">
                    vibe-upload ~/.claude/projects/[project-session]/
                  </pre>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-1 right-1"
                    onClick={() => copyToClipboard('vibe-upload ~/.claude/projects/[project-session]/')}
                  >
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5. 자동 업로드 설정 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                {locale === 'ko' ? '자동 업로드 설정 (Cron)' : 'Automatic Upload (Cron)'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? '정기적으로 자동 업로드를 실행하도록 설정하세요' 
                  : 'Configure periodic automatic uploads'
                }
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">
                    {locale === 'ko' ? '매시간' : 'Every Hour'}
                  </label>
                  <pre className="p-2 bg-muted rounded text-xs font-mono mt-1">
                    0 * * * * vibe-upload ~/.claude/projects
                  </pre>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {locale === 'ko' ? '매일 자정' : 'Daily at Midnight'}
                  </label>
                  <pre className="p-2 bg-muted rounded text-xs font-mono mt-1">
                    0 0 * * * vibe-upload ~/.claude/projects
                  </pre>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    {locale === 'ko' ? '30분마다' : 'Every 30 minutes'}
                  </label>
                  <pre className="p-2 bg-muted rounded text-xs font-mono mt-1">
                    */30 * * * * vibe-upload ~/.claude/projects
                  </pre>
                </div>
              </div>

              <div className="p-3 bg-amber-50 dark:bg-amber-950 rounded-lg">
                <p className="text-sm text-amber-700 dark:text-amber-300">
                  {locale === 'ko' 
                    ? '💡 crontab -e 명령어로 크론탭을 열고 위 설정을 추가하세요' 
                    : '💡 Open crontab with crontab -e command and add the above configuration'
                  }
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 6. API 직접 호출 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Code className="h-5 w-5" />
                {locale === 'ko' ? 'API 직접 호출' : 'Direct API Call'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? 'cURL을 사용한 직접 API 호출 예제' 
                  : 'Direct API call example using cURL'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="p-4 bg-gray-900 text-gray-100 rounded-lg text-xs overflow-x-auto">
                <code>{`curl -X POST ${serverUrl}/api/upload \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "projectName": "my-project",
    "fileName": "session.jsonl",
    "content": "{\\"type\\":\\"user\\",\\"message\\":{\\"content\\":\\"Hello\\"}}"
  }'`}</code>
              </pre>
            </CardContent>
          </Card>

          {/* 7. 다운로드 섹션 */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                {locale === 'ko' ? '다운로드' : 'Downloads'}
              </CardTitle>
              <CardDescription>
                {locale === 'ko' 
                  ? 'CLI 도구와 자동화 스크립트를 다운로드하세요' 
                  : 'Download CLI tool and automation scripts'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-3 md:grid-cols-3">
                <Button
                  variant="outline"
                  onClick={() => window.location.href = '/api/download/cli?type=script'}
                >
                  <Terminal className="mr-2 h-4 w-4" />
                  {locale === 'ko' ? 'CLI 도구' : 'CLI Tool'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadScript('auto-upload.sh')}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  {locale === 'ko' ? '자동 스크립트' : 'Auto Script'}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => downloadScript('viberc')}
                >
                  <Code className="mr-2 h-4 w-4" />
                  {locale === 'ko' ? '설정 파일' : 'Config File'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </DashboardLayout>
    </ProtectedRoute>
  )
}