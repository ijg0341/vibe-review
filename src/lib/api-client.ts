// API 서버 전용 클라이언트 - Supabase 의존성 완전 제거
// Next.js rewrites를 통한 API 프록시

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '' // 환경변수 사용, rewrites가 있으면 빈 문자열

interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  details?: any
}

interface PaginationParams {
  page?: number
  limit?: number
  sort?: string
  order?: 'asc' | 'desc'
}

// 대시보드 관련 타입들
export interface PersonalStats {
  date: string
  total_tokens: number
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  estimated_cost: number
  prompt_count: number
  message_chars: number
  tool_breakdown: Array<{
    tool_name: string
    tokens: number
    cost: number
    model: string
  }>
}

export interface TeamTotalStats {
  date: string
  total_tokens: number
  input_tokens: number
  output_tokens: number
  cached_tokens: number
  estimated_cost: number
  prompt_count: number
  message_chars: number
  session_count: number
  active_members: number
  tool_breakdown: Array<{
    tool_name: string
    tokens: number
    cost: number
    model: string
  }>
}

export interface TeamRankingUser {
  rank: number
  user_id?: string
  user_name: string
  user_email: string
  value: number
  formatted_value: string
  estimated_cost?: number
}

export interface TeamRankings {
  date: string
  token_ranking: TeamRankingUser[]
  prompt_ranking: TeamRankingUser[]
  message_ranking: TeamRankingUser[]
  // AI 활용 능력 지표 랭킹들
  cost_efficiency_ranking: TeamRankingUser[]   // 비용 효율성 (1달러당 토큰량)
  prompt_quality_ranking: TeamRankingUser[]    // 프롬프트 품질 지수
  overall_ai_score_ranking: TeamRankingUser[]  // 종합 AI 활용도 점수
}

// JWT 토큰 관리
class TokenManager {
  private static TOKEN_KEY = 'vibereview_token'
  
  static getToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(this.TOKEN_KEY)
  }
  
  static setToken(token: string): void {
    if (typeof window === 'undefined') return
    localStorage.setItem(this.TOKEN_KEY, token)
  }
  
  static removeToken(): void {
    if (typeof window === 'undefined') return
    localStorage.removeItem(this.TOKEN_KEY)
  }

  // JWT 토큰 디코딩 (간단한 Base64 디코딩)
  static decodeToken(token: string): any {
    try {
      const base64Url = token.split('.')[1]
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      )
      return JSON.parse(jsonPayload)
    } catch (error) {
      console.error('Failed to decode JWT:', error)
      return null
    }
  }

  // 토큰에서 사용자 정보 추출
  static getUserFromToken(): any {
    const token = this.getToken()
    if (!token) return null

    const payload = this.decodeToken(token)
    if (!payload) return null

    return {
      id: payload.sub,
      email: payload.email,
      display_name: payload.user_metadata?.full_name,
      avatar_url: payload.user_metadata?.avatar_url,
      created_at: payload.iat ? new Date(payload.iat * 1000).toISOString() : undefined
    }
  }
}

// API 클라이언트 (순수 API 서버 전용)
class ApiClient {
  private baseURL: string

  constructor(baseURL: string = API_BASE_URL) {
    this.baseURL = baseURL
  }

  // 기본 fetch 래퍼
  private async fetch<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    try {
      const token = TokenManager.getToken()
      console.log('Using token for', endpoint, ':', token ? token.substring(0, 20) + '...' : 'NO TOKEN')
      
      const headers: HeadersInit = {
        ...options.headers,
      }

      // body가 있는 요청에만 Content-Type 설정
      if (options.body || options.method === 'POST' || options.method === 'PUT') {
        (headers as any)['Content-Type'] = 'application/json'
      }

      if (token) {
        (headers as any).Authorization = `Bearer ${token}`
      } else {
        console.warn('No token available for API request:', endpoint)
      }

      const response = await fetch(endpoint, {
        ...options,
        headers,
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText.includes('<') ? 'Server returned HTML instead of JSON' : errorText }
        }

        // 401 Unauthorized 에러 시 자동 로그아웃 처리
        if (response.status === 401) {
          console.warn('Authentication failed, logging out user')
          
          // 전역 signOut 함수가 등록되어 있으면 사용
          if (globalSignOut) {
            try {
              await globalSignOut()
            } catch (error) {
              console.error('Error during automatic logout:', error)
              // fallback: 직접 토큰 제거 및 리다이렉트
              TokenManager.removeToken()
              if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
                window.location.href = '/login'
              }
            }
          } else {
            // fallback: 직접 토큰 제거 및 리다이렉트
            TokenManager.removeToken()
            if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
              window.location.href = '/login'
            }
          }
        }
        
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }

      // 응답 파싱 시 에러 처리 개선
      const responseText = await response.text()
      try {
        return JSON.parse(responseText)
      } catch (parseError) {
        console.error('JSON parse error:', parseError, 'Response:', responseText.substring(0, 200))
        throw new Error(responseText.includes('<') 
          ? 'Server returned HTML instead of JSON - check API server status' 
          : 'Invalid JSON response'
        )
      }
    } catch (error) {
      console.error(`API Error [${endpoint}]:`, error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      }
    }
  }

  // GET 요청
  private async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint
    if (params) {
      const searchParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value))
        }
      })
      if (searchParams.toString()) {
        url += '?' + searchParams.toString()
      }
    }
    
    return this.fetch<T>(url)
  }

  // POST 요청
  private async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  // PUT 요청
  private async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  // DELETE 요청
  private async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.fetch<T>(endpoint, {
      method: 'DELETE',
    })
  }

  // ====== 인증 관련 API ======
  
  async login(email: string, password: string) {
    const response = await this.post<{ access_token: string; user: any; session: any }>('/api/auth/login', { email, password })
    
    // API 서버는 access_token으로 응답
    const token = response.data?.access_token
    
    if (response.success && token) {
      console.log('Saving token:', token.substring(0, 20) + '...')
      TokenManager.setToken(token)
    } else {
      console.error('No access_token in login response:', response)
    }
    return response
  }

  async signup(email: string, password: string, displayName?: string) {
    return this.post('/api/auth/signup', { email, password, display_name: displayName })
  }

  async logout() {
    const result = await this.post('/api/auth/logout')
    TokenManager.removeToken()
    return result
  }

  async getSession() {
    return this.get('/api/auth/session')
  }

  // ====== 사용자 관리 API ======
  
  async getProfile() {
    return this.get('/api/users/profile')
  }

  async updateProfile(data: { display_name?: string; avatar_url?: string }) {
    return this.put('/api/users/profile', data)
  }

  async getSettings() {
    return this.get('/api/users/settings')
  }

  async updateSettings(data: { default_project_path?: string; locale?: string }) {
    return this.put('/api/users/settings', data)
  }

  // ====== 프로젝트 관리 API (uploaded_files 기반) ======
  
  async getProjects(filters: PaginationParams & { search?: string } = {}) {
    return this.get('/api/projects', filters)
  }

  async createProject(data: {
    name: string
    description?: string
    folder_path?: string
  }) {
    return this.post('/api/projects', data)
  }

  async getProject(id: string) {
    return this.get(`/api/projects/${id}`)
  }

  async updateProject(id: string, data: {
    name?: string
    description?: string
    folder_path?: string
  }) {
    return this.put(`/api/projects/${id}`, data)
  }

  async deleteProject(id: string) {
    return this.delete(`/api/projects/${id}`)
  }

  async getProjectSessions(projectId: string, filters: PaginationParams = {}) {
    return this.get(`/api/projects/${projectId}/sessions`, filters)
  }

  async findOrCreateProject(data: { folder_path: string }) {
    return this.post('/api/projects/find-or-create', data)
  }

  // ====== 파일 업로드 API ======
  
  async uploadFile(formData: FormData) {
    try {
      const token = TokenManager.getToken()
      const headers: HeadersInit = {}
      if (token) {
        (headers as any).Authorization = `Bearer ${token}`
      }

      const response = await fetch('/api/upload/file', {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        throw new Error(errorData.error || `Upload failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Upload Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Upload failed'
      }
    }
  }

  async uploadBatch(formData: FormData) {
    try {
      const token = TokenManager.getToken()
      const headers: HeadersInit = {}
      if (token) {
        (headers as any).Authorization = `Bearer ${token}`
      }

      const response = await fetch('/api/upload/batch', {
        method: 'POST',
        headers,
        body: formData,
      })

      if (!response.ok) {
        const errorText = await response.text()
        let errorData
        try {
          errorData = JSON.parse(errorText)
        } catch {
          errorData = { error: errorText }
        }
        throw new Error(errorData.error || `Batch upload failed: ${response.statusText}`)
      }

      return await response.json()
    } catch (error) {
      console.error('Batch Upload Error:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Batch upload failed'
      }
    }
  }

  async getUploadStatus(fileId: string) {
    return this.get(`/api/upload/status/${fileId}`)
  }

  // ====== 메타데이터 API ======
  
  async getFiles(filters: PaginationParams & { 
    search?: string
    project_id?: string 
    file_type?: string
    upload_status?: string
  } = {}) {
    return this.get('/api/metadata/files', filters)
  }

  async getFile(fileId: string) {
    return this.get(`/api/metadata/files/${fileId}`)
  }

  async deleteFile(fileId: string) {
    return this.delete(`/api/metadata/files/${fileId}`)
  }


  async downloadFile(fileId: string) {
    try {
      const token = TokenManager.getToken()
      const headers: HeadersInit = {}
      if (token) {
        (headers as any).Authorization = `Bearer ${token}`
      }

      const response = await fetch(`/api/metadata/files/${fileId}/download`, {
        headers,
      })

      if (!response.ok) {
        throw new Error(`Download failed: ${response.statusText}`)
      }

      return response.blob()
    } catch (error) {
      console.error('Download Error:', error)
      throw error
    }
  }

  // ====== 통계 API ======
  
  async getDashboardStats() {
    return this.get('/api/stats/dashboard')
  }

  async getProjectStats(projectId: string) {
    return this.get(`/api/stats/projects/${projectId}`)
  }

  async getUserStats(userId: string) {
    return this.get(`/api/stats/users/${userId}`)
  }

  // ====== API 키 관리 ======
  
  async getApiKeys() {
    return this.get('/api/api-keys')
  }

  async createApiKey(data: { name: string }) {
    return this.post('/api/api-keys', data)
  }

  async updateApiKey(keyId: string, data: { name?: string; is_active?: boolean }) {
    return this.put(`/api/api-keys/${keyId}`, data)
  }

  async deleteApiKey(keyId: string) {
    return this.delete(`/api/api-keys/${keyId}`)
  }

  async verifyApiKey(key: string) {
    return this.post('/api/api-keys/verify', { key })
  }

  // ====== 팀 관련 API ======
  
  async getTeamMembers() {
    return this.get('/api/teams/current/members')
  }

  async getTeamMember(userId: string) {
    return this.get(`/api/teams/current/members/${userId}`)
  }

  async getTeamMemberDaily(userId: string, date: string) {
    return this.get(`/api/teams/current/members/${userId}/daily/${date}`)
  }

  async getTeamStats() {
    return this.get('/api/stats/team')
  }
  
  async getTeamFiles(filters: PaginationParams = {}) {
    return this.get('/api/team/files', filters)
  }

  async getTeamProjects(filters: PaginationParams = {}) {
    return this.get('/api/team/projects', filters)
  }

  // ====== 세션 상세 API ======
  
  async getSessionContent(sessionId: string) {
    return this.get(`/api/sessions/${sessionId}/content`)
  }

  // ====== 대시보드 API ======
  
  async getPersonalStats(date?: string): Promise<ApiResponse<PersonalStats>> {
    const params = date ? { date } : {}
    return this.get('/api/stats/dashboard/personal-stats', params)
  }

  async getTeamTotalStats(date?: string): Promise<ApiResponse<TeamTotalStats>> {
    const params = date ? { date } : {}
    return this.get('/api/stats/dashboard/team-total-stats', params)
  }

  async getTeamRankings(date?: string): Promise<ApiResponse<TeamRankings>> {
    const params = date ? { date } : {}
    return this.get('/api/stats/dashboard/team-rankings', params)
  }
}

// 전역 로그아웃 핸들러
let globalSignOut: (() => Promise<void>) | null = null

export const setGlobalSignOut = (signOutFn: () => Promise<void>) => {
  globalSignOut = signOutFn
}

// 싱글톤 인스턴스 생성
export const apiClient = new ApiClient()

// 타입 정의 내보내기
export type { ApiResponse, PaginationParams }
export { ApiClient, TokenManager }