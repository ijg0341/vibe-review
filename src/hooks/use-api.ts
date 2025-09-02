import { useState, useCallback } from 'react'
import { apiClient, type ApiResponse } from '@/lib/api-client'

// API 호출 상태를 관리하는 훅 (Supabase 의존성 완전 제거)
export function useApi<T = any>() {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // API 호출 실행 함수
  const execute = useCallback(async (
    apiCall: () => Promise<ApiResponse<T>>
  ): Promise<ApiResponse<T>> => {
    setLoading(true)
    setError(null)

    try {
      const response = await apiCall()
      
      if (response.success && response.data !== undefined) {
        setData(response.data)
      } else {
        setError(response.error || 'API call failed')
      }
      
      return response
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setLoading(false)
    }
  }, [])

  // 수동 데이터 설정
  const setManualData = useCallback((newData: T) => {
    setData(newData)
    setError(null)
  }, [])

  // 상태 초기화
  const reset = useCallback(() => {
    setData(null)
    setError(null)
    setLoading(false)
  }, [])

  return {
    data,
    loading,
    error,
    execute,
    setData: setManualData,
    reset
  }
}

// API 서버 기반 프로젝트 관리 훅
export function useProjects() {
  const api = useApi<{ projects: any[]; total: number }>()

  const fetchProjects = useCallback(async (filters = {}) => {
    return api.execute(() => apiClient.getProjects(filters))
  }, [api])

  const createProject = useCallback(async (projectData: {
    name: string
    description?: string
    folder_path?: string
  }) => {
    return api.execute(() => apiClient.createProject(projectData))
  }, [api])

  return {
    projects: api.data?.projects || [],
    total: api.data?.total || 0,
    loading: api.loading,
    error: api.error,
    fetchProjects,
    createProject,
    setProjectsData: api.setData,
    reset: api.reset
  }
}

// API 서버 기반 단일 프로젝트 훅
export function useProject(projectId: string) {
  const projectApi = useApi<any>()
  const sessionsApi = useApi<{ sessions: any[]; project_id: string; project_name: string }>()

  const fetchProject = useCallback(async () => {
    if (!projectId) return
    return projectApi.execute(() => apiClient.getProject(projectId))
  }, [projectApi, projectId])

  const fetchSessions = useCallback(async (filters = {}) => {
    if (!projectId) return
    return sessionsApi.execute(() => apiClient.getProjectSessions(projectId, filters))
  }, [sessionsApi, projectId])

  const updateProject = useCallback(async (data: {
    name?: string
    description?: string
    folder_path?: string
  }) => {
    return projectApi.execute(() => apiClient.updateProject(projectId, data))
  }, [projectApi, projectId])

  const deleteProject = useCallback(async () => {
    return projectApi.execute(() => apiClient.deleteProject(projectId))
  }, [projectApi, projectId])

  return {
    project: projectApi.data,
    sessions: sessionsApi.data?.sessions || [],
    projectLoading: projectApi.loading,
    sessionsLoading: sessionsApi.loading,
    projectError: projectApi.error,
    sessionsError: sessionsApi.error,
    fetchProject,
    fetchSessions,
    updateProject,
    deleteProject,
    setProject: projectApi.setData,
    setSessions: sessionsApi.setData,
    reset: () => {
      projectApi.reset()
      sessionsApi.reset()
    }
  }
}

// API 서버 기반 사용자 프로필 훅
export function useProfile() {
  const api = useApi<any>()

  const fetchProfile = useCallback(async () => {
    return api.execute(() => apiClient.getProfile())
  }, [api])

  const updateProfile = useCallback(async (data: {
    display_name?: string
    avatar_url?: string
  }) => {
    return api.execute(() => apiClient.updateProfile(data))
  }, [api])

  return {
    profile: api.data,
    loading: api.loading,
    error: api.error,
    fetchProfile,
    updateProfile,
    setProfile: api.setData,
    reset: api.reset
  }
}

// API 서버 기반 사용자 설정 훅
export function useSettings() {
  const api = useApi<any>()

  const fetchSettings = useCallback(async () => {
    return api.execute(() => apiClient.getSettings())
  }, [api])

  const updateSettings = useCallback(async (data: {
    default_project_path?: string
    locale?: string
  }) => {
    return api.execute(() => apiClient.updateSettings(data))
  }, [api])

  return {
    settings: api.data,
    loading: api.loading,
    error: api.error,
    fetchSettings,
    updateSettings,
    setSettings: api.setData,
    reset: api.reset
  }
}

// API 서버 기반 파일 업로드 훅
export function useUpload() {
  const api = useApi<any>()
  const [uploadProgress, setUploadProgress] = useState(0)

  const uploadFile = useCallback(async (formData: FormData) => {
    setUploadProgress(0)
    const result = await api.execute(() => apiClient.uploadFile(formData))
    if (result.success) {
      setUploadProgress(100)
    }
    return result
  }, [api])

  const uploadBatch = useCallback(async (formData: FormData) => {
    setUploadProgress(0)
    const result = await api.execute(() => apiClient.uploadBatch(formData))
    if (result.success) {
      setUploadProgress(100)
    }
    return result
  }, [api])

  return {
    uploadResult: api.data,
    uploading: api.loading,
    uploadError: api.error,
    uploadProgress,
    uploadFile,
    uploadBatch,
    reset: () => {
      api.reset()
      setUploadProgress(0)
    }
  }
}

// API 서버 기반 통계 훅
export function useStats() {
  const dashboardApi = useApi<any>()

  const fetchDashboardStats = useCallback(async () => {
    return dashboardApi.execute(() => apiClient.getDashboardStats())
  }, [dashboardApi])

  return {
    dashboardStats: dashboardApi.data,
    loading: dashboardApi.loading,
    error: dashboardApi.error,
    fetchDashboardStats,
    reset: dashboardApi.reset
  }
}

// API 서버 기반 파일 관리 훅
export function useFiles() {
  const api = useApi<{ files: any[]; total: number }>()

  const fetchFiles = useCallback(async (filters = {}) => {
    return api.execute(() => apiClient.getFiles(filters))
  }, [api])

  const deleteFile = useCallback(async (fileId: string) => {
    return api.execute(() => apiClient.deleteFile(fileId))
  }, [api])

  return {
    files: api.data?.files || [],
    total: api.data?.total || 0,
    loading: api.loading,
    error: api.error,
    fetchFiles,
    deleteFile,
    reset: api.reset
  }
}