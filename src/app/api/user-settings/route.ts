import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'crypto'

// API 키 검증
async function verifyApiKey(apiKey: string): Promise<{ isValid: boolean; userId?: string; keyId?: string; message?: string }> {
  if (!apiKey || !apiKey.startsWith('vibe_')) {
    return { isValid: false, message: 'Invalid API key format' }
  }

  // API 키 해시 생성
  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex')
  
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  
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

// GET: 사용자 설정 조회
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
    
    // 서비스 역할 클라이언트 사용
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )
    
    // 사용자 설정 조회
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('project_path, claude_path')
      .eq('user_id', verification.userId)
      .single()
    
    if (error) {
      // 설정이 없으면 기본값 반환
      return NextResponse.json({
        project_path: null,
        claude_path: '~/.claude/projects'
      })
    }
    
    return NextResponse.json({
      project_path: settings?.project_path || null,
      claude_path: settings?.claude_path || '~/.claude/projects'
    })
    
  } catch (error) {
    console.error('User settings API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}