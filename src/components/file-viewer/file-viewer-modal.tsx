'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { 
  FileText, 
  User, 
  Bot, 
  Clock, 
  Copy,
  Download,
  X
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

interface FileViewerModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  filePath: string
  fileName: string
}

interface ChatMessage {
  role: 'human' | 'assistant'
  content: string
  timestamp?: string
}

interface SessionData {
  messages: ChatMessage[]
  metadata?: {
    session_id?: string
    created_at?: string
    model?: string
  }
}

export function FileViewerModal({ open, onOpenChange, filePath, fileName }: FileViewerModalProps) {
  const [loading, setLoading] = useState(false)
  const [sessionData, setSessionData] = useState<SessionData | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const locale = useLocaleStore(state => state.locale)
  const t = useTranslation(locale)
  const { toast } = useToast()
  const supabase = createClient()

  // 파일 내용 로드
  const loadFileContent = async () => {
    if (!filePath || !open) return

    try {
      setLoading(true)
      setError(null)
      
      console.log('Loading file:', filePath)
      
      // Supabase Storage에서 파일 다운로드
      const { data, error } = await supabase.storage
        .from('session-files')
        .download(filePath)

      if (error) {
        console.error('File download error:', error)
        setError('Failed to load file')
        return
      }

      // Blob을 텍스트로 변환
      const fileContent = await data.text()
      console.log('File content loaded, length:', fileContent.length)

      // JSONL 파싱 (각 라인이 별도의 JSON)
      const lines = fileContent.split('\n').filter(line => line.trim())
      const messages: ChatMessage[] = []
      let metadata = {}

      for (const line of lines) {
        try {
          const parsed = JSON.parse(line)
          
          // Claude Code 세션의 일반적인 구조 처리
          if (parsed.type === 'message' && parsed.role && parsed.content) {
            messages.push({
              role: parsed.role,
              content: parsed.content,
              timestamp: parsed.timestamp
            })
          } else if (parsed.type === 'session_metadata') {
            metadata = parsed
          } else if (parsed.role && parsed.content) {
            // 직접적인 메시지 형태
            messages.push({
              role: parsed.role,
              content: parsed.content,
              timestamp: parsed.timestamp
            })
          }
        } catch (parseError) {
          console.warn('Failed to parse line:', line, parseError)
        }
      }

      setSessionData({
        messages,
        metadata
      })

    } catch (error) {
      console.error('Error loading file:', error)
      setError('Failed to load file content')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (open && filePath) {
      loadFileContent()
    }
  }, [open, filePath])

  // 내용 복사
  const copyContent = (content: string) => {
    navigator.clipboard.writeText(content)
    toast({
      title: locale === 'ko' ? '복사됨' : 'Copied',
      description: locale === 'ko' ? '내용이 클립보드에 복사되었습니다' : 'Content copied to clipboard',
    })
  }

  // 전체 세션 다운로드
  const downloadSession = () => {
    if (!sessionData) return

    const content = sessionData.messages.map(msg => 
      `[${msg.role.toUpperCase()}]\n${msg.content}\n\n`
    ).join('')

    const blob = new Blob([content], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fileName.replace('.jsonl', '.txt')
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              <DialogTitle>{fileName}</DialogTitle>
            </div>
            <div className="flex items-center gap-2">
              {sessionData && (
                <>
                  <Button variant="outline" size="sm" onClick={downloadSession}>
                    <Download className="h-4 w-4 mr-1" />
                    {locale === 'ko' ? '다운로드' : 'Download'}
                  </Button>
                </>
              )}
              <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogDescription>
            {locale === 'ko' ? 'Claude Code 세션 내용' : 'Claude Code session content'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          {loading && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">
                  {locale === 'ko' ? '파일을 불러오는 중...' : 'Loading file...'}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-destructive mb-2">{error}</p>
                <Button variant="outline" onClick={loadFileContent}>
                  {locale === 'ko' ? '다시 시도' : 'Retry'}
                </Button>
              </div>
            </div>
          )}

          {sessionData && (
            <ScrollArea className="h-full">
              <div className="space-y-4 p-4">
                {/* 메타데이터 */}
                {sessionData.metadata && (
                  <div className="bg-muted/50 rounded-lg p-4 mb-6">
                    <h3 className="font-medium mb-2">
                      {locale === 'ko' ? '세션 정보' : 'Session Info'}
                    </h3>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {sessionData.metadata.session_id && (
                        <div>
                          <span className="text-muted-foreground">ID:</span>
                          <span className="ml-2 font-mono">{sessionData.metadata.session_id}</span>
                        </div>
                      )}
                      {sessionData.metadata.model && (
                        <div>
                          <span className="text-muted-foreground">Model:</span>
                          <span className="ml-2">{sessionData.metadata.model}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 메시지 목록 */}
                <div className="space-y-4">
                  {sessionData.messages.length === 0 ? (
                    <p className="text-center text-muted-foreground py-8">
                      {locale === 'ko' ? '메시지가 없습니다' : 'No messages found'}
                    </p>
                  ) : (
                    sessionData.messages.map((message, index) => (
                      <div key={index} className="group">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0">
                            {message.role === 'human' ? (
                              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center">
                                <User className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                              </div>
                            ) : (
                              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                                <Bot className="h-4 w-4 text-green-600 dark:text-green-400" />
                              </div>
                            )}
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <Badge variant={message.role === 'human' ? 'default' : 'secondary'}>
                                {message.role === 'human' ? 
                                  (locale === 'ko' ? '사용자' : 'Human') : 
                                  (locale === 'ko' ? '어시스턴트' : 'Assistant')
                                }
                              </Badge>
                              {message.timestamp && (
                                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                  <Clock className="h-3 w-3" />
                                  {new Date(message.timestamp).toLocaleString()}
                                </div>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => copyContent(message.content)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </div>
                            
                            <div className="bg-card border rounded-lg p-4">
                              <pre className="whitespace-pre-wrap text-sm font-sans">
                                {message.content}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}