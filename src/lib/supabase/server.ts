// Supabase 서버 클라이언트 비활성화 - API 서버 기반 마이그레이션 완료
export async function createClient() {
  throw new Error('Supabase server client has been disabled. Use API client instead.')
}