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

// POST: JSONL 파일 업로드
export async function POST(request: NextRequest) {
  console.log('=== Upload API called ===')
  try {
    // 헤더에서 API 키 추출
    const authHeader = request.headers.get('authorization')
    console.log('Auth header:', authHeader ? 'Present' : 'Missing')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }
    
    const apiKey = authHeader.replace('Bearer ', '')
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
    
    // 프로젝트 이름에서 작업 디렉토리 prefix 제거
    if (userSettings?.project_path) {
      const workingDirPrefix = userSettings.project_path.replace(/\//g, '-').replace(/^-/, '-')
      if (projectName.startsWith(workingDirPrefix)) {
        const cleanProjectName = projectName.substring(workingDirPrefix.length).replace(/^-/, '')
        console.log(`Cleaning project name: ${projectName} -> ${cleanProjectName}`)
        projectName = cleanProjectName || 'root'
      }
    }
    
    // 필수 필드 검증
    if (!projectName || !fileName || !content) {
      console.log('Missing required fields')
      return NextResponse.json(
        { error: 'Missing required fields: projectName, fileName, content' },
        { status: 400 }
      )
    }
    
    // projectId가 제공되지 않으면 에러
    if (!projectId) {
      console.log('No projectId provided, upload rejected')
      return NextResponse.json(
        { 
          error: 'Project ID is required',
          details: 'Please use --project-id option when uploading. Example: vibe-upload [path] --project-id=YOUR_PROJECT_ID'
        },
        { status: 400 }
      )
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
      
      // 세션 업데이트
      await supabase
        .from('project_sessions')
        .update({
          uploaded_at: new Date().toISOString()
        })
        .eq('id', sessionId)
    } else {
      // 새 세션 생성
      const { data: newSession, error: sessionError } = await supabase
        .from('project_sessions')
        .insert({
          project_id: projectId,
          user_id: verification.userId,
          session_name: sessionName,
          session_count: 0,
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
    
    // uploadId는 이제 sessionId를 사용
    const uploadId = sessionId
    
    // 파일 처리
    console.log('Looking for existing file:', fileName)
    const { data: existingFile, error: fileQueryError } = await supabase
      .from('uploaded_files')
      .select('*')
      .eq('upload_id', uploadId)
      .eq('file_name', fileName)
      .maybeSingle()
      
    console.log('File query result:', { existingFile, error: fileQueryError })
    
    let fileId: string
    let existingLineCount = 0
    
    if (existingFile) {
      fileId = existingFile.id
      existingLineCount = existingFile.processed_lines || 0
      
      // 파일 정보 업데이트
      await supabase
        .from('uploaded_files')
        .update({
          file_size: content.length,
          uploaded_at: new Date().toISOString(),
          processing_status: 'pending'
        })
        .eq('id', fileId)
    } else {
      // 새 파일 레코드 생성
      console.log('Creating new file record...', {
        user_id: verification.userId,
        upload_id: uploadId,
        file_name: fileName,
        file_path: `${projectName}/${fileName}`,
        file_size: content.length
      })
      
      const { data: newFile, error: fileError } = await supabase
        .from('uploaded_files')
        .insert({
          user_id: verification.userId,
          upload_id: uploadId,
          file_name: fileName,
          file_path: `${projectName}/${fileName}`,
          file_size: content.length,
          uploaded_at: new Date().toISOString(),
          processing_status: 'pending',
          project_session_id: sessionId
        })
        .select()
        .single()
      
      console.log('File creation result:', { newFile, fileError })
      
      if (fileError || !newFile) {
        console.error('Failed to create file record:', fileError)
        return NextResponse.json(
          { error: 'Failed to create file record', details: fileError?.message || 'Unknown error' },
          { status: 500 }
        )
      }
      
      fileId = newFile.id
      console.log('New file created with ID:', fileId)
    }
    
    // JSONL 처리 (서버 사이드 클라이언트 사용)
    console.log('Creating JSONLProcessor...')
    const jsonlProcessor = new JSONLProcessor(supabase)
    console.log('Starting JSONL processing...', { fileId, uploadId, existingLineCount })
    const result = await jsonlProcessor.processJSONLFile(
      content,
      fileId,
      uploadId,
      existingLineCount
    )
    console.log('JSONL processing result:', result)
    
    // 세션 카운트 업데이트
    const { data: fileCount } = await supabase
      .from('uploaded_files')
      .select('id', { count: 'exact' })
      .eq('upload_id', uploadId)
    
    await supabase
      .from('uploads')
      .update({
        session_count: fileCount?.length || 0
      })
      .eq('id', uploadId)
    
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
      projectId: uploadId,
      fileId: fileId,
      processedLines: result.processedLines,
      newLines: result.newLines,
      errors: result.errors
    })
    
  } catch (error) {
    console.error('Upload API error:', error)
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace')
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

// GET: 업로드 상태 확인
export async function GET(request: NextRequest) {
  try {
    // 헤더에서 API 키 추출
    const authHeader = request.headers.get('authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Missing or invalid authorization header' },
        { status: 401 }
      )
    }
    
    const apiKey = authHeader.replace('Bearer ', '')
    
    // API 키 검증
    const verification = await verifyApiKey(apiKey)
    if (!verification.isValid) {
      return NextResponse.json(
        { error: verification.message || 'Invalid API key' },
        { status: 401 }
      )
    }
    
    const supabase = await createClient()
    
    // 사용자의 프로젝트 목록 조회
    const { data: uploads, error } = await supabase
      .from('uploads')
      .select(`
        *,
        uploaded_files (
          id,
          file_name,
          file_size,
          processed_lines,
          processing_status,
          uploaded_at
        )
      `)
      .eq('user_id', verification.userId)
      .order('uploaded_at', { ascending: false })
    
    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch uploads' },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      uploads: uploads || []
    })
    
  } catch (error) {
    console.error('Status API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}