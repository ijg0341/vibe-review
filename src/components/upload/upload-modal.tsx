'use client'

import { useState, useCallback } from 'react'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/auth-context'
import { JSONLProcessor } from '@/lib/jsonl-processor'
import { 
  FolderOpen, 
  Upload, 
  CheckCircle2, 
  FileText,
  Loader2,
  Folder,
  Search
} from 'lucide-react'


interface UploadModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function UploadModal({ open, onOpenChange }: UploadModalProps) {
  const [step, setStep] = useState<'select' | 'configure' | 'preview' | 'uploading' | 'complete'>('select')
  const [uploadProgress, setUploadProgress] = useState(0)
  const [uploadedCount, setUploadedCount] = useState(0)
  const [totalFiles, setTotalFiles] = useState(0)
  const [isScanning, setIsScanning] = useState(false)
  const [projectsDirectoryHandle, setProjectsDirectoryHandle] = useState<any>(null)
  const [workingDirectory, setWorkingDirectory] = useState('')
  const [discoveredProjects, setDiscoveredProjects] = useState<any[]>([])
  const [selectedProjects, setSelectedProjects] = useState<Set<string>>(new Set())
  
  const { toast } = useToast()
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const { user } = useAuth()
  const supabase = createClient()

  // 디렉토리에서 JSONL 파일 재귀적으로 스캔
  const scanDirectoryForJsonl = useCallback(async (dirHandle: any, dirPath: string): Promise<any[]> => {
    const files: any[] = []
    
    try {
      for await (const [name, handle] of dirHandle.entries()) {
        if (handle.kind === 'file' && name.endsWith('.jsonl')) {
          files.push({ name, handle, path: dirPath })
        } else if (handle.kind === 'directory') {
          // 재귀적으로 하위 디렉토리 스캔
          const subFiles = await scanDirectoryForJsonl(handle, `${dirPath}/${name}`)
          files.push(...subFiles)
        }
      }
    } catch (error) {
      console.warn(`Could not scan directory ${dirPath}:`, error)
    }
    
    return files
  }, [])

  // .claude/projects 폴더 선택
  const selectProjectsDirectory = useCallback(async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: t.upload.modal.errors.browserNotSupported,
        })
        return
      }

      setIsScanning(true)
      
      const projectsHandle = await (window as any).showDirectoryPicker({
        mode: 'read'
      })

      // .claude/projects 폴더인지 확인
      if (!projectsHandle.name.includes('projects')) {
        toast({
          variant: 'destructive',
          title: 'Invalid Folder',
          description: locale === 'ko' ? '.claude/projects 폴더를 선택해주세요.' : 'Please select the .claude/projects folder.',
        })
        setIsScanning(false)
        return
      }

      setProjectsDirectoryHandle(projectsHandle)
      console.log('Selected .claude/projects folder:', projectsHandle.name)
      
      setStep('configure')
      setIsScanning(false)

    } catch (error: any) {
      console.error('Directory selection error:', error)
      if (error.name !== 'AbortError') {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: t.upload.modal.errors.selectionFailed,
        })
      }
      setIsScanning(false)
    }
  }, [toast, t.upload.modal.errors, locale])

  // 프로젝트 스캔
  const scanForProjects = useCallback(async (workDirName?: string) => {
    const dirToScan = workDirName || workingDirectory
    if (!projectsDirectoryHandle || !dirToScan) return

    try {
      setIsScanning(true)
      
      // 작업 디렉토리 경로를 Claude 패턴으로 변환
      // 전체 경로를 추정하여 패턴 생성
      // 예: "vibework" -> 패턴 매칭을 위해 다양한 경로 조합 시도
      const patterns = [
        dirToScan.replace(/\//g, '-'),
        `-${dirToScan}`,
        dirToScan,
        `Users-.*-${dirToScan}` // 정규식 패턴
      ]
      
      console.log('Scanning for patterns:', patterns)
      
      const projects = []
      
      // .claude/projects 폴더 내의 모든 폴더 스캔
      for await (const [name, handle] of projectsDirectoryHandle.entries()) {
        if (handle.kind === 'directory') {
          // 다양한 패턴으로 매칭 시도
          const isMatch = patterns.some(pattern => {
            if (pattern.includes('.*')) {
              // 정규식 패턴
              return new RegExp(pattern).test(name)
            }
            // 단순 포함 확인
            return name.includes(pattern)
          })
          
          if (isMatch) {
            console.log('Found matching folder:', name)
            
            // 프로젝트명 추출 (작업 디렉토리 이름 뒤의 텍스트)
            // 예: -Users-goalle-vibework-secondteam-vibe-review -> secondteam-vibe-review
            const projectNameMatch = name.match(new RegExp(`${dirToScan}[^a-zA-Z0-9]*(.+)$`))
            const projectName = projectNameMatch ? projectNameMatch[1] : name
          
            // 해당 폴더에서 JSONL 파일 스캔
            const files = await scanDirectoryForJsonl(handle, name)
            
            if (files.length > 0) {
              projects.push({
                folderName: name,
                projectName: projectName,
                files: files,
                handle: handle
              })
            }
          }
        }
      }
      
      console.log('Discovered projects:', projects)
      setDiscoveredProjects(projects)
      
      // 모든 프로젝트를 기본 선택
      setSelectedProjects(new Set(projects.map(p => p.folderName)))
      
      setStep('preview')
      setIsScanning(false)
      
      if (projects.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Projects Found',
          description: locale === 'ko' ? 
            '해당 경로와 매칭되는 프로젝트를 찾을 수 없습니다.' : 
            'No projects found matching the specified path.',
        })
      }

    } catch (error) {
      console.error('Project scanning error:', error)
      toast({
        variant: 'destructive',
        title: 'Scan Failed',
        description: locale === 'ko' ? '프로젝트 스캔에 실패했습니다.' : 'Failed to scan for projects.',
      })
      setIsScanning(false)
    }
  }, [projectsDirectoryHandle, workingDirectory, locale, toast])

  // 작업 디렉토리 폴더 선택
  const selectWorkingDirectory = useCallback(async () => {
    try {
      if (!('showDirectoryPicker' in window)) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: t.upload.modal.errors.browserNotSupported,
        })
        return
      }

      const workDirHandle = await (window as any).showDirectoryPicker({
        mode: 'read'
      })

      // 선택된 폴더의 전체 경로 구성
      // Handle에서는 직접 경로를 얻을 수 없으므로, 사용자에게 보여주기 위한 경로 생성
      let fullPath = workDirHandle.name
      
      // 부모 경로를 역추적하여 전체 경로 구성 시도
      // 브라우저 보안상 제한이 있지만, 폴더명은 사용 가능
      setWorkingDirectory(fullPath)
      console.log('Selected working directory:', fullPath)
      
      // 자동으로 프로젝트 스캔 시작
      await scanForProjects(fullPath)

    } catch (error: any) {
      console.error('Working directory selection error:', error)
      if (error.name !== 'AbortError') {
        toast({
          variant: 'destructive', 
          title: 'Error',
          description: locale === 'ko' ? '작업 디렉토리 선택에 실패했습니다.' : 'Failed to select working directory.',
        })
      }
    }
  }, [toast, t.upload.modal.errors, locale, scanForProjects])


  // 파일 처리 (Storage 없이 직접 처리)
  const processFileDirectly = useCallback(async (
    fileHandle: any, 
    projectName: string,
    uploadId: string
  ): Promise<{ fileId: string | null; newLines: number }> => {
    try {
      console.log('Reading file from handle...')
      
      if (!user?.id) {
        console.error('No user ID available')
        return { fileId: null, newLines: 0 }
      }
      
      // 파일 읽기
      const file = await fileHandle.getFile()
      const fileContent = await file.text()
      
      console.log(`File read: ${file.name}, size: ${file.size}, content length: ${fileContent.length}`)
      
      // 기존 파일이 있는지 확인 (파일명과 upload_id 기준)
      const { data: existingFile } = await supabase
        .from('uploaded_files')
        .select('*')
        .eq('upload_id', uploadId)
        .eq('file_name', file.name)
        .single()
      
      let fileId: string
      let existingLineCount = 0
      
      if (existingFile) {
        // 기존 파일이 있으면 재사용
        console.log('Existing file found, will update:', existingFile.id)
        fileId = existingFile.id
        existingLineCount = existingFile.processed_lines || 0
        
        // 파일 정보 업데이트
        await supabase
          .from('uploaded_files')
          .update({
            file_size: file.size,
            uploaded_at: new Date().toISOString(),
            processing_status: 'pending'
          })
          .eq('id', fileId)
      } else {
        // 새 파일 레코드 생성
        const { data: newFile, error: fileError } = await supabase
          .from('uploaded_files')
          .insert({
            user_id: user.id,
            upload_id: uploadId,
            file_name: file.name,
            file_path: `${projectName}/${file.name}`, // Storage 없이 가상 경로
            file_size: file.size,
            uploaded_at: new Date().toISOString(),
            processing_status: 'pending'
          })
          .select()
          .single()
        
        if (fileError || !newFile) {
          console.error('File record creation error:', fileError)
          return { fileId: null, newLines: 0 }
        }
        
        fileId = newFile.id
      }
      
      // JSONL 처리 (증분 업데이트 지원)
      const jsonlProcessor = new JSONLProcessor()
      const result = await jsonlProcessor.processJSONLFile(
        fileContent, 
        fileId, 
        uploadId,
        existingLineCount // 기존 라인 수 전달
      )
      
      console.log(`JSONL processing result: ${result.processedLines} lines (${result.newLines} new)`)
      
      return { fileId, newLines: result.newLines || result.processedLines }
    } catch (error) {
      console.error('File processing error:', error)
      return { fileId: null, newLines: 0 }
    }
  }, [user, supabase])

  // 프로젝트 선택/해제
  const toggleProjectSelection = useCallback((folderName: string) => {
    const newSelection = new Set(selectedProjects)
    if (newSelection.has(folderName)) {
      newSelection.delete(folderName)
    } else {
      newSelection.add(folderName)
    }
    setSelectedProjects(newSelection)
  }, [selectedProjects])

  // 업로드 시작
  const startUpload = useCallback(async () => {
    if (!user) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'User not authenticated',
      })
      return
    }

    const selectedProjectList = discoveredProjects.filter(project => 
      selectedProjects.has(project.folderName)
    )

    if (selectedProjectList.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: t.upload.modal.errors.noProjectsSelected,
      })
      return
    }

    setStep('uploading')
    setUploadProgress(0)
    setUploadedCount(0)
    
    let totalSuccessCount = 0
    const totalFiles = selectedProjectList.reduce((sum, project) => sum + project.files.length, 0)
    let processedFiles = 0
    
    try {
      console.log('Starting upload for projects:', selectedProjectList)
      
      // 각 프로젝트별로 처리
      for (const project of selectedProjectList) {
        console.log(`Processing project: ${project.projectName}`)
        
        // 먼저 기존 프로젝트가 있는지 확인
        const { data: existingUpload } = await supabase
          .from('uploads')
          .select('*')
          .eq('user_id', user.id)
          .eq('project_name', project.projectName)
          .eq('project_path', project.folderName)
          .single()
        
        let uploadId: string
        
        if (existingUpload) {
          // 기존 프로젝트가 있으면 재사용
          console.log('Using existing project:', existingUpload.id)
          uploadId = existingUpload.id
          
          // 업로드 시간만 업데이트
          await supabase
            .from('uploads')
            .update({
              uploaded_at: new Date().toISOString()
            })
            .eq('id', uploadId)
        } else {
          // 새 프로젝트 생성
          const projectMetadata = {
            user_id: user.id,
            project_name: project.projectName,
            project_path: project.folderName,
            session_count: 0, // 나중에 업데이트
            uploaded_at: new Date().toISOString()
          }
          
          const { data: newUpload, error: uploadError } = await supabase
            .from('uploads')
            .insert([projectMetadata])
            .select()
            .single()
          
          if (uploadError || !newUpload) {
            console.error('Project creation error:', uploadError)
            continue
          }
          
          uploadId = newUpload.id
        }
        
        let projectSuccessCount = 0
        let totalNewLines = 0
        
        // 프로젝트 내 파일들 처리
        for (const file of project.files) {
          processedFiles++
          console.log(`Processing file ${processedFiles}/${totalFiles}: ${file.name}`)
          
          const result = await processFileDirectly(
            file.handle, 
            project.projectName,
            uploadId
          )
          
          if (result.fileId) {
            projectSuccessCount++
            totalSuccessCount++
            totalNewLines += result.newLines
            console.log(`File ${file.name} processed: ${result.newLines} new lines`)
          }
          
          // 진행률 업데이트
          setUploadedCount(totalSuccessCount)
          setUploadProgress(Math.floor((processedFiles / totalFiles) * 100))
        }
        
        // 프로젝트의 session_count 업데이트
        if (projectSuccessCount > 0) {
          await supabase
            .from('uploads')
            .update({
              session_count: projectSuccessCount
            })
            .eq('id', uploadId)
          
          console.log(`Project ${project.projectName}: ${projectSuccessCount} files, ${totalNewLines} new lines`)
        }
      }
      
      console.log(`Total files processed: ${totalFiles}, Success: ${totalSuccessCount}`)
      
      setStep('complete')
      
      if (totalSuccessCount === totalFiles) {
        toast({
          title: 'Upload Complete',
          description: `Successfully uploaded all ${totalSuccessCount} files from ${selectedProjectList.length} projects`,
        })
      } else if (totalSuccessCount > 0) {
        toast({
          title: 'Partial Upload',
          description: `Successfully uploaded ${totalSuccessCount} of ${totalFiles} files`,
        })
      } else {
        toast({
          variant: 'destructive',
          title: 'Upload Failed',
          description: 'No files were uploaded successfully',
        })
      }
      
    } catch (error) {
      console.error('Upload failed:', error)
      toast({
        variant: 'destructive',
        title: 'Upload Failed',
        description: 'An error occurred during upload. Please try again.',
      })
      setStep('select')
    }
  }, [discoveredProjects, selectedProjects, toast, t.upload.modal.errors, user, processFileDirectly, supabase])


  // 모달 닫기 및 리셋
  const closeModal = useCallback(() => {
    onOpenChange(false)
    setTimeout(() => {
      setStep('select')
      setProjectsDirectoryHandle(null)
      setWorkingDirectory('')
      setDiscoveredProjects([])
      setSelectedProjects(new Set())
      setUploadProgress(0)
      setUploadedCount(0)
      setTotalFiles(0)
    }, 300)
  }, [onOpenChange])


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t.upload.modal.title}
          </DialogTitle>
          <DialogDescription>
            {t.upload.modal.subtitle}
          </DialogDescription>
        </DialogHeader>

        {/* Step 1: .claude/projects 폴더 선택 */}
        {step === 'select' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                <FolderOpen className="h-12 w-12 text-muted-foreground" />
              </div>
              <div>
                <h3 className="text-lg font-medium">
                  {locale === 'ko' ? '.claude/projects 폴더 선택' : 'Select .claude/projects folder'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {locale === 'ko' ? 
                    'Claude Code의 전체 프로젝트 폴더를 선택해주세요' : 
                    'Select your Claude Code projects folder'
                  }
                </p>
              </div>
            </div>

            {/* 숨김 폴더 접근 안내 */}
            <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-2">
                {locale === 'ko' ? '.claude/projects 폴더 찾는 방법:' : 'How to find .claude/projects folder:'}
              </h4>
              <div className="space-y-1 text-xs text-blue-700 dark:text-blue-300">
                <div>• {t.upload.modal.select.instructions.windows}</div>
                <div>• {t.upload.modal.select.instructions.mac}</div>
                <div>• {locale === 'ko' ? '폴더명에 "projects"가 포함된 폴더를 선택하세요' : 'Select folder containing "projects" in the name'}</div>
              </div>
            </div>
            
            <Button 
              onClick={selectProjectsDirectory} 
              className="w-full" 
              size="lg"
              disabled={isScanning}
            >
              {isScanning ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t.upload.modal.select.scanning}
                </>
              ) : (
                <>
                  <FolderOpen className="mr-2 h-4 w-4" />
                  {locale === 'ko' ? '.claude/projects 폴더 선택' : 'Select .claude/projects folder'}
                </>
              )}
            </Button>
          </div>
        )}

        {/* Step 2: 작업 디렉토리 설정 */}
        {step === 'configure' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-24 h-24 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium">
                  {locale === 'ko' ? '작업 디렉토리 선택' : 'Select Working Directory'}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {locale === 'ko' ? 
                    '프로젝트들이 위치한 작업 디렉토리를 선택해주세요' : 
                    'Select the directory where your projects are located'
                  }
                </p>
              </div>
            </div>

            <div className="space-y-4">
              {workingDirectory ? (
                <div className="p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Folder className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium">{workingDirectory}</p>
                        <p className="text-xs text-muted-foreground">
                          {locale === 'ko' ? '선택된 작업 디렉토리' : 'Selected working directory'}
                        </p>
                      </div>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={selectWorkingDirectory}
                    >
                      {locale === 'ko' ? '변경' : 'Change'}
                    </Button>
                  </div>
                </div>
              ) : (
                <Button 
                  onClick={selectWorkingDirectory} 
                  className="w-full" 
                  size="lg"
                  variant="outline"
                >
                  <FolderOpen className="mr-2 h-4 w-4" />
                  {locale === 'ko' ? '작업 디렉토리 선택' : 'Select Working Directory'}
                </Button>
              )}
              
              <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg">
                <p className="text-xs text-amber-700 dark:text-amber-300">
                  {locale === 'ko' ? 
                    '💡 예시: /Users/goalle/vibework 폴더를 선택하면 vibework에 속한 모든 Claude 프로젝트를 찾습니다.' : 
                    '💡 Example: Select /Users/yourname/projects to find all Claude projects in that directory.'
                  }
                </p>
              </div>
            </div>

            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setStep('select')}
                className="flex-1"
              >
                {locale === 'ko' ? '이전' : 'Back'}
              </Button>
              <Button 
                onClick={() => scanForProjects()}
                className="flex-1"
                disabled={!workingDirectory || isScanning}
              >
                {isScanning ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {locale === 'ko' ? '스캔 중...' : 'Scanning...'}
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    {locale === 'ko' ? '프로젝트 찾기' : 'Find Projects'}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: 프로젝트 선택 */}
        {step === 'preview' && (
          <div className="space-y-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-24 h-24 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                <Folder className="h-12 w-12 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <h3 className="text-lg font-medium">
                  {locale === 'ko' ? 
                    `${discoveredProjects.length}개의 프로젝트를 찾았습니다` : 
                    `Found ${discoveredProjects.length} projects`
                  }
                </h3>
                <p className="text-sm text-muted-foreground">
                  {locale === 'ko' ? 
                    '업로드할 프로젝트를 선택하세요' : 
                    'Select projects to upload'
                  }
                </p>
              </div>
            </div>

            {/* 프로젝트 목록 */}
            <div className="max-h-64 overflow-y-auto border rounded-lg">
              {discoveredProjects.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {locale === 'ko' ? '프로젝트를 찾을 수 없습니다' : 'No projects found'}
                </div>
              ) : (
                <div className="space-y-1 p-2">
                  {discoveredProjects.map((project) => (
                    <div key={project.folderName} className="flex items-center space-x-3 p-3 rounded-lg hover:bg-muted/50">
                      <Checkbox 
                        checked={selectedProjects.has(project.folderName)}
                        onCheckedChange={() => toggleProjectSelection(project.folderName)}
                      />
                      <Folder className="h-4 w-4 text-blue-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{project.projectName}</p>
                        <p className="text-xs text-muted-foreground">
                          {project.files.length} {locale === 'ko' ? '파일' : 'files'} • {project.folderName}
                        </p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {project.files.length}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 선택 요약 및 업로드 버튼 */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-md">
              <div className="text-sm">
                <div className="font-medium">{t.upload.modal.preview.readyToUpload}</div>
                <div className="text-muted-foreground">
                  {selectedProjects.size} {t.upload.modal.preview.projects} • {
                    discoveredProjects
                      .filter(p => selectedProjects.has(p.folderName))
                      .reduce((sum, p) => sum + p.files.length, 0)
                  } {t.upload.modal.preview.sessionFiles}
                </div>
              </div>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => setStep('configure')}
                >
                  {locale === 'ko' ? '이전' : 'Back'}
                </Button>
                <Button 
                  onClick={startUpload} 
                  disabled={selectedProjects.size === 0}
                >
                  <Upload className="mr-2 h-4 w-4" />
                  {t.upload.modal.preview.startUpload}
                </Button>
              </div>
            </div>
          </div>
        )}

        {step === 'uploading' && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-primary animate-spin" />
              </div>
              <h3 className="text-lg font-medium">{t.upload.modal.uploading.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.upload.modal.uploading.description}
              </p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>{t.upload.modal.uploading.progress}</span>
                <span>{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} />
              <p className="text-xs text-muted-foreground">
                {locale === 'ko' ? 
                  `${uploadedCount}개 파일 업로드 완료` : 
                  `${uploadedCount} files uploaded`
                }
              </p>
            </div>
          </div>
        )}

        {step === 'complete' && (
          <div className="space-y-6 text-center">
            <div className="space-y-2">
              <div className="mx-auto w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-lg font-medium">{t.upload.modal.complete.title}</h3>
              <p className="text-sm text-muted-foreground">
                {t.upload.modal.complete.description}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 text-center">
              <div className="p-4 bg-muted rounded-md">
                <div className="text-2xl font-bold text-primary">{selectedProjects.size}</div>
                <div className="text-sm text-muted-foreground">{t.upload.modal.complete.projects}</div>
              </div>
              <div className="p-4 bg-muted rounded-md">
                <div className="text-2xl font-bold text-primary">{uploadedCount}</div>
                <div className="text-sm text-muted-foreground">{t.upload.modal.complete.sessions}</div>
              </div>
            </div>
            
            <Button onClick={closeModal} className="w-full">
              {t.upload.modal.complete.close}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}