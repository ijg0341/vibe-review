'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { apiClient } from '@/lib/api-client'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useToast } from '@/hooks/use-toast'
import { 
  Folder,
  Terminal,
  Copy,
  Check,
  AlertCircle,
  Loader2,
  Info
} from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface CreateProjectModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onProjectCreated?: (project: any) => void
}

export function CreateProjectModal({ open, onOpenChange, onProjectCreated }: CreateProjectModalProps) {
  const [projectName, setProjectName] = useState('')
  const [folderPath, setFolderPath] = useState('')
  const [description, setDescription] = useState('')
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [createdProject, setCreatedProject] = useState<any>(null)
  const [baseProjectPath, setBaseProjectPath] = useState('')
  
  const { user } = useAuth()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const { toast } = useToast()

  // API에서 사용자 설정 불러오기
  useEffect(() => {
    const fetchUserSettings = async () => {
      if (!user?.id || !open) return
      
      try {
        const response = await apiClient.getSettings()
        
        if (response.success && response.data?.default_project_path) {
          setBaseProjectPath(response.data.default_project_path)
          // 기본 경로가 있고 폴더 경로가 비어있으면 자동 설정
          if (!folderPath) {
            setFolderPath(response.data.default_project_path + '/')
          }
        }
      } catch (error) {
        console.error('Error fetching user settings:', error)
      }
    }
    
    fetchUserSettings()
  }, [open, user?.id, folderPath]) // folderPath 의존성 추가

  // 프로젝트 경로를 Claude 히스토리 경로로 변환
  const convertToClaudePath = (projectPath: string) => {
    // /Users/goalle/vibework/secondteam-agent → -Users-goalle-vibework-secondteam-agent
    const cleanPath = projectPath
      .replace(/\/$/, '') // 끝 슬래시 제거
      .replace(/\//g, '-') // 모든 슬래시를 대시로 변환 (맨 앞 슬래시도 포함)
    
    // ~/.claude/projects/-Users-goalle-vibework-secondteam-agent
    return `~/.claude/projects/${cleanPath}`
  }

  // 폴더 경로에서 프로젝트 이름 추출
  const extractProjectName = (path: string) => {
    // 경로에서 마지막 폴더명 추출
    const parts = path.split('/').filter(Boolean)
    return parts[parts.length - 1] || ''
  }

  // 폴더 경로 입력 시 프로젝트 이름 자동 설정
  const handleFolderPathChange = (path: string) => {
    setFolderPath(path)
    if (!projectName || projectName === extractProjectName(folderPath)) {
      setProjectName(extractProjectName(path))
    }
  }


  // 프로젝트 생성
  const handleCreateProject = async () => {
    if (!projectName || !folderPath || !user?.id) return

    try {
      setCreating(true)

      // API를 통한 프로젝트 생성/찾기
      const response = await apiClient.findOrCreateProject({
        folder_path: folderPath
      })

      if (!response.success) {
        console.error('Error creating project:', response.error)
        toast({
          variant: 'destructive',
          title: locale === 'ko' ? '프로젝트 생성 실패' : 'Failed to create project',
          description: response.error || 'Unknown error occurred'
        })
        return
      }

      if (response.data) {
        const project = response.data
        setCreatedProject({
          id: project.id || project.project_id,
          name: project.name || project.project_name || projectName,
          folder_path: folderPath,
          is_new: project.is_new !== false // 새 프로젝트로 간주
        })

        toast({
          title: project.is_new !== false
            ? (locale === 'ko' ? '프로젝트 생성됨' : 'Project created')
            : (locale === 'ko' ? '기존 프로젝트 찾음' : 'Existing project found'),
          description: project.is_new !== false
            ? (locale === 'ko' ? '새 프로젝트가 생성되었습니다' : 'New project has been created')
            : (locale === 'ko' ? '동일한 이름의 프로젝트가 이미 있습니다' : 'A project with the same name already exists')
        })

        if (onProjectCreated) {
          onProjectCreated(project)
        }
      }
    } catch (error) {
      console.error('Error in handleCreateProject:', error)
      toast({
        variant: 'destructive',
        title: locale === 'ko' ? '오류 발생' : 'Error occurred',
        description: locale === 'ko' ? '프로젝트 생성 중 문제가 발생했습니다' : 'Failed to create project'
      })
    } finally {
      setCreating(false)
    }
  }

  // CLI 명령어 복사
  const copyCLICommand = () => {
    if (!createdProject) return
    
    const claudePath = convertToClaudePath(createdProject.folder_path || folderPath)
    const command = `vibe-upload ${claudePath} --project-id=${createdProject.id}`
    navigator.clipboard.writeText(command)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
    
    toast({
      title: locale === 'ko' ? '복사됨' : 'Copied',
      description: locale === 'ko' ? 'CLI 명령어가 클립보드에 복사되었습니다' : 'CLI command copied to clipboard'
    })
  }

  // 모달 닫기 시 상태 초기화
  const handleClose = () => {
    setProjectName('')
    setFolderPath('')
    setDescription('')
    setCreatedProject(null)
    setCopied(false)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="h-5 w-5" />
            {createdProject 
              ? (locale === 'ko' ? '프로젝트 준비 완료' : 'Project Ready')
              : (locale === 'ko' ? '새 프로젝트 만들기' : 'Create New Project')
            }
          </DialogTitle>
          <DialogDescription>
            {createdProject
              ? (locale === 'ko' 
                  ? 'CLI 명령어를 사용하여 프롬프트를 업로드하세요' 
                  : 'Use the CLI command to upload your prompts')
              : (locale === 'ko' 
                  ? '프로젝트 폴더를 선택하고 정보를 입력하세요' 
                  : 'Select a project folder and enter information')
            }
          </DialogDescription>
        </DialogHeader>

        {!createdProject ? (
          <>
            <div className="grid gap-4 py-4">
              {baseProjectPath && (
                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    {locale === 'ko' 
                      ? `기본 프로젝트 경로: ${baseProjectPath}` 
                      : `Base project path: ${baseProjectPath}`
                    }
                  </AlertDescription>
                </Alert>
              )}

              <div className="grid gap-2">
                <Label htmlFor="folderPath">
                  {locale === 'ko' ? '프로젝트 전체 경로' : 'Project Full Path'}
                </Label>
                <Input
                  id="folderPath"
                  placeholder="/Users/username/projects/my-project"
                  value={folderPath}
                  onChange={(e) => handleFolderPathChange(e.target.value)}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  {locale === 'ko' 
                    ? '프로젝트 폴더의 전체 경로를 입력하세요 (예: /Users/goalle/vibework/project-name)' 
                    : 'Enter the full path to your project folder (e.g., /Users/goalle/vibework/project-name)'
                  }
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="projectName">
                  {locale === 'ko' ? '프로젝트 이름' : 'Project Name'}
                </Label>
                <Input
                  id="projectName"
                  placeholder={locale === 'ko' ? '프로젝트 이름' : 'Project name'}
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  {locale === 'ko' 
                    ? '폴더명에서 자동으로 추출됩니다' 
                    : 'Automatically extracted from folder name'
                  }
                </p>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">
                  {locale === 'ko' ? '설명 (선택)' : 'Description (Optional)'}
                </Label>
                <Textarea
                  id="description"
                  placeholder={locale === 'ko' 
                    ? '프로젝트에 대한 간단한 설명을 입력하세요' 
                    : 'Enter a brief description of the project'
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>
                {locale === 'ko' ? '취소' : 'Cancel'}
              </Button>
              <Button 
                onClick={handleCreateProject} 
                disabled={!projectName || !folderPath || creating}
              >
                {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {locale === 'ko' ? '프로젝트 생성' : 'Create Project'}
              </Button>
            </DialogFooter>
          </>
        ) : (
          <>
            <div className="py-4 space-y-4">
              <Alert>
                <Check className="h-4 w-4" />
                <AlertDescription>
                  {createdProject.is_new
                    ? (locale === 'ko' 
                        ? `"${createdProject.name}" 프로젝트가 생성되었습니다!` 
                        : `Project "${createdProject.name}" has been created!`)
                    : (locale === 'ko' 
                        ? `"${createdProject.name}" 프로젝트를 찾았습니다!` 
                        : `Found existing project "${createdProject.name}"!`)
                  }
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label>{locale === 'ko' ? 'CLI 업로드 명령어' : 'CLI Upload Command'}</Label>
                <div className="relative">
                  <pre className="p-4 bg-muted rounded-lg text-sm font-mono overflow-x-auto">
                    <code>vibe-upload {convertToClaudePath(createdProject.folder_path || folderPath)} --project-id={createdProject.id}</code>
                  </pre>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="absolute top-2 right-2"
                    onClick={copyCLICommand}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <Alert>
                <Terminal className="h-4 w-4" />
                <AlertDescription className="space-y-2">
                  <p className="font-medium">
                    {locale === 'ko' ? '다음 단계:' : 'Next steps:'}
                  </p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>{locale === 'ko' ? '터미널을 열고 위 명령어를 실행하세요' : 'Open terminal and run the command above'}</li>
                    <li>{locale === 'ko' ? 'Claude 세션 파일들이 자동으로 업로드됩니다' : 'Claude session files will be uploaded automatically'}</li>
                    <li>{locale === 'ko' ? '팀 멤버들과 프로젝트를 공유할 수 있습니다' : 'You can share the project with team members'}</li>
                  </ol>
                </AlertDescription>
              </Alert>
            </div>

            <DialogFooter>
              <Button onClick={handleClose}>
                {locale === 'ko' ? '완료' : 'Done'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}