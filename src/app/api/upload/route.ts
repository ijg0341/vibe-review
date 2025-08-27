import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { JSONLProcessor } from '@/lib/jsonl-processor'
import crypto from 'crypto'

// API 키 검증
async function verifyApiKey(apiKey: string): Promise<{ isValid: boolean; userId?: string; keyId?: string; message?: string }> {
  if (!apiKey || !apiKey.startsWith('vibe_')) {
    return { isValid: false, message: 'Invalid API key format' }
  }

  // API 키 해시 생성
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
  
  const supabase = await createClient()
  
  // verify_api_key 함수 호출
  const { data, error } = await supabase
    .rpc('verify_api_key', { p_key_hash: keyHash })
    .single()
  
  if (error || !data) {
    return { isValid: false, message: 'API key verification failed' }
  }
  
  return {
    isValid: (data as any).is_valid,
    userId: (data as any).user_id,
    keyId: (data as any).key_id,
    message: (data as any).message
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Upload API called ===')
    
    // API 키 확인
    const authHeader = request.headers.get('authorization')
    console.log('Auth header:', authHeader ? 'Present' : 'Missing')
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('No valid authorization header')
      return NextResponse.json(
        { error: 'API key required' },
        { status: 401 }
      )
    }
    
    const apiKey = authHeader.substring(7)
    console.log('API key extracted:', apiKey.substring(0, 12) + '...')
    
    // API 키 검증
    console.log('Verifying API key...')
    const verification = await verifyApiKey(apiKey)
    console.log('Verification result:', verification)
    if (!verification.isValid) {
      console.log('API key verification failed:', verification.message)
      return NextResponse.json(
        { error: verification.message || 'Invalid API key' },
        { status: 401 }
      )
    }
    
    // 요청 본문 파싱
    console.log('API key verified, parsing request body...')
    const body = await request.json()
    let { projectName, projectPath, fileName, content, projectId } = body
    console.log('Request body parsed:', { projectName, projectPath, fileName, contentLength: content?.length, projectId })
    
    // 서비스 역할 클라이언트 사용 (RLS 우회)
    const supabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    console.log('Supabase service client created')
    
    // 사용자 설정에서 작업 디렉토리 가져와서 프로젝트 이름 정리
    const { data: userSettings } = await supabase
      .from('user_settings')
      .select('project_path')
      .eq('user_id', verification.userId)
      .single()
    
    if (userSettings?.project_path && projectName) {
      // 프로젝트 이름에서 작업 디렉토리 prefix 제거
      const workingDirPrefix = userSettings.project_path.replace(/\//g, '-').replace(/^-/, '-')
      console.log('Cleaning project name:', projectName, 'with prefix:', workingDirPrefix)
      
      if (projectName.startsWith(workingDirPrefix)) {
        projectName = projectName.substring(workingDirPrefix.length).replace(/^-/, '')
        console.log('Cleaned project name:', projectName)
      }
    }
    
    // 입력 검증
    if (!fileName || !content) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      )
    }
    
    // projectId가 제공되지 않으면 프로젝트 이름 기반으로 프로젝트 생성 또는 조회
    if (!projectId) {
      console.log('No projectId provided, creating/finding project based on folder name')
      
      // 프로젝트 이름 정리 (경로 부분 제거, 빈 문자열이면 기본값 사용)
      const cleanProjectName = projectName || 'default-project'
      console.log('Using project name:', cleanProjectName)
      
      // 해당 이름의 프로젝트 찾기
      const { data: existingProject } = await supabase
        .from('projects')
        .select('id')
        .eq('owner_id', verification.userId)
        .eq('folder_path', cleanProjectName)  // folder_path로 프로젝트 구분
        .maybeSingle()
      
      if (existingProject) {
        projectId = existingProject.id
        console.log('Using existing project:', cleanProjectName, projectId)
      } else {
        // 프로젝트 생성
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            owner_id: verification.userId,
            name: cleanProjectName || 'My Sessions',  // 표시 이름
            description: `Claude sessions for ${cleanProjectName}`,
            folder_path: cleanProjectName  // 실제 프로젝트 식별자
          })
          .select('id')
          .single()
        
        if (projectError || !newProject) {
          console.error('Failed to create project:', projectError)
          return NextResponse.json(
            { error: 'Failed to create project', details: projectError?.message },
            { status: 500 }
          )
        }
        
        projectId = newProject.id
        console.log('Created new project:', cleanProjectName, projectId)
        
        // 프로젝트 멤버로 추가
        await supabase
          .from('project_members')
          .insert({
            project_id: projectId,
            user_id: verification.userId,
            role: 'owner'
          })
      }
    }
    
    // project_sessions 테이블에서 세션 찾기 또는 생성
    console.log('Using project-based upload with projectId:', projectId)
    
    const sessionName = fileName.replace('.jsonl', '')
    
    const { data: existingSession } = await supabase
      .from('project_sessions')
      .select('*')
      .eq('project_id', projectId)
      .eq('session_name', sessionName)
      .maybeSingle()
    
    let sessionId: string
    
    if (existingSession) {
      sessionId = existingSession.id
      console.log('Using existing session:', sessionId)
      
      // 세션 업데이트 (파일 정보 포함)
      await supabase
        .from('project_sessions')
        .update({
          file_name: fileName,
          file_path: `${projectName}/${fileName}`,
          file_size: content.length,
          processing_status: 'pending',
          uploaded_at: new Date().toISOString()
        })
        .eq('id', sessionId)
    } else {
      // 새 세션 생성 (파일 정보 포함)
      const { data: newSession, error: sessionError } = await supabase
        .from('project_sessions')
        .insert({
          project_id: projectId,
          user_id: verification.userId,
          session_name: sessionName,
          file_name: fileName,
          file_path: `${projectName}/${fileName}`,
          file_size: content.length,
          session_count: 0,
          processing_status: 'pending',
          processed_lines: 0,
          uploaded_at: new Date().toISOString()
        })
        .select()
        .single()
      
      if (sessionError || !newSession) {
        console.error('Failed to create session:', sessionError)
        return NextResponse.json(
          { error: 'Failed to create session', details: sessionError?.message },
          { status: 500 }
        )
      }
      
      sessionId = newSession.id
      console.log('Created new session:', sessionId)
    }
    
    // 기존 라인 수 확인
    const { count: existingLineCount } = await supabase
      .from('session_lines')
      .select('*', { count: 'exact', head: true })
      .eq('upload_id', sessionId)
    
    console.log('Existing line count for session:', existingLineCount || 0)
    
    // JSONL 처리 - 파일 크기에 따라 다른 처리 방식 선택
    console.log('Creating JSONLProcessor...')
    const jsonlProcessor = new JSONLProcessor(supabase)
    const fileSize = Buffer.byteLength(content, 'utf8')
    const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
    
    console.log(`File size: ${(fileSize / 1024 / 1024).toFixed(2)}MB`)
    
    let result
    if (fileSize > MAX_FILE_SIZE) {
      // 큰 파일은 스트리밍 방식으로 처리
      console.log('Using streaming processing for large file...')
      result = await jsonlProcessor.processLargeJSONLFile(
        content,
        sessionId,
        sessionId,
        existingLineCount || 0
      )
    } else {
      // 작은 파일은 일반 처리
      console.log('Starting standard JSONL processing...', { sessionId, existingLineCount })
      result = await jsonlProcessor.processJSONLFile(
        content,
        sessionId,
        sessionId,
        existingLineCount || 0
      )
    }
    console.log('JSONL processing result:', result)
    
    // 프로젝트 세션 상태 업데이트
    if (result.success) {
      await supabase
        .from('project_sessions')
        .update({ 
          session_count: result.processedLines || 0,
          processing_status: 'completed',
          processed_lines: result.processedLines || 0
        })
        .eq('id', sessionId)
    } else {
      await supabase
        .from('project_sessions')
        .update({ 
          processing_status: 'failed',
          processing_error: result.error || 'Unknown error'
        })
        .eq('id', sessionId)
    }
    
    // API 키 사용 로그 기록
    await supabase
      .from('api_key_logs')
      .insert({
        api_key_id: verification.keyId,
        action: 'upload',
        request_path: '/api/upload',
        request_method: 'POST',
        response_status: 200,
        ip_address: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip'),
        user_agent: request.headers.get('user-agent')
      })
    
    return NextResponse.json({
      success: true,
      message: 'File uploaded successfully',
      sessionId,
      processedLines: result.processedLines || 0,
      newLines: result.newLines || 0,
      errors: result.errors || 0
    })
    
  } catch (error) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { 
        error: 'Upload failed', 
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}