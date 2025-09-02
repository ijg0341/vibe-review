import { type NextRequest, NextResponse } from 'next/server'

// API 서버 기반 인증으로 변경 - Supabase 미들웨어 제거
export async function middleware(request: NextRequest) {
  // 현재는 모든 요청을 통과시킴 (API 서버에서 인증 처리)
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}