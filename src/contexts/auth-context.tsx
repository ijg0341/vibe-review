'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { apiClient, TokenManager, setGlobalSignOut } from '@/lib/api-client'

// API 서버 기반 사용자 타입
type User = {
  id: string
  email: string
  display_name?: string
  avatar_url?: string
  team_id?: string
  created_at?: string
}

type AuthContextType = {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>
  signUp: (email: string, password: string, displayName?: string) => Promise<{ success: boolean; error?: string }>
  signOut: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  signIn: async () => ({ success: false }),
  signUp: async () => ({ success: false }),
  signOut: async () => {},
  refreshUser: async () => {},
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider')
  }
  return context
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  const signOut = async () => {
    try {
      await apiClient.logout()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setUser(null)
      TokenManager.removeToken()
      
      // 로그인 페이지로 리다이렉트 (현재 페이지가 로그인 페이지가 아닌 경우에만)
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        window.location.href = '/login'
      }
    }
  }

  // 전역 signOut 함수 등록
  useEffect(() => {
    setGlobalSignOut(signOut)
  }, [])

  // 토큰 상태 변화 감지
  useEffect(() => {
    const checkAuthStatus = async () => {
      const token = TokenManager.getToken()
      console.log('🔍 Auth check - Token exists:', !!token)
      
      if (!token) {
        console.log('❌ No token found, setting user to null')
        setUser(null)
        setLoading(false)
        return
      }

      try {
        // 토큰에서 직접 사용자 정보 추출 (API 서버 호출 대신)
        const userFromToken = TokenManager.getUserFromToken()
        console.log('🎯 User from token:', userFromToken)
        
        if (userFromToken && userFromToken.id) {
          console.log('✅ Token valid, setting user from token')
          setUser(userFromToken)
        } else {
          console.log('❌ Invalid token, removing it')
          TokenManager.removeToken()
          setUser(null)
        }
      } catch (error) {
        console.error('🔥 Token decode failed:', error)
        TokenManager.removeToken()
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    checkAuthStatus()

    // 토큰 변화 감지를 위한 스토리지 이벤트 리스너
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'vibereview_token') {
        if (e.newValue) {
          checkAuthStatus()
        } else {
          setUser(null)
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    
    return () => {
      window.removeEventListener('storage', handleStorageChange)
    }
  }, [])

  const signIn = async (email: string, password: string) => {
    try {
      const response = await apiClient.login(email, password)
      console.log('🔐 Login response:', response)
      
      if (response.success && response.data?.access_token) {
        // JWT 토큰에서 사용자 정보 추출
        const userFromToken = TokenManager.getUserFromToken()
        
        console.log('✅ Login successful, user from token:', userFromToken)
        setUser(userFromToken)
        return { success: true }
      } else {
        return { success: false, error: response.error || 'Login failed' }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Login failed' 
      }
    }
  }

  const signUp = async (email: string, password: string, displayName?: string) => {
    try {
      const response = await apiClient.signup(email, password, displayName)
      if (response.success) {
        // 회원가입 후에는 바로 로그인하지 않고 이메일 확인 등을 기다림
        return { success: true }
      } else {
        return { success: false, error: response.error || 'Signup failed' }
      }
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Signup failed' 
      }
    }
  }

  const refreshUser = async () => {
    const token = TokenManager.getToken()
    if (!token) return

    try {
      const response = await apiClient.getSession()
      if (response.success && response.data) {
        setUser((response.data as any).user)
      }
    } catch (error) {
      console.error('Refresh user failed:', error)
    }
  }

  const value = {
    user,
    loading,
    signIn,
    signUp,
    signOut,
    refreshUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}