import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiClient, type ApiResponse, type PaginationParams } from '@/lib/api-client'

// 쿼리 키 팩토리
export const queryKeys = {
  // Auth
  session: ['session'],
  profile: ['profile'],
  settings: ['settings'],
  
  // Projects
  projects: (filters?: PaginationParams & { search?: string }) => 
    ['projects', filters],
  project: (id: string) => ['project', id],
  projectSessions: (projectId: string, filters?: PaginationParams) => 
    ['projects', projectId, 'sessions', filters],
  
  // Files
  files: (filters?: PaginationParams & { 
    search?: string
    project_id?: string 
    file_type?: string
    upload_status?: string
  }) => ['files', filters],
  file: (id: string) => ['file', id],
  uploadStatus: (fileId: string) => ['upload', 'status', fileId],
  
  // Stats
  dashboardStats: ['stats', 'dashboard'],
  projectStats: (projectId: string) => ['stats', 'project', projectId],
  userStats: (userId: string) => ['stats', 'user', userId],
  teamStats: ['stats', 'team'],
  
  // API Keys
  apiKeys: ['api-keys'],
  
  // Team
  teamMembers: ['team', 'members'],
  teamMember: (userId: string) => ['team', 'member', userId],
  teamMemberDaily: (userId: string, date: string) => ['team', 'member', userId, 'daily', date],
  teamFiles: (filters?: PaginationParams) => ['team', 'files', filters],
  teamProjects: (filters?: PaginationParams) => ['team', 'projects', filters],
}

// 인증 훅들
export const useSession = () => {
  return useQuery({
    queryKey: queryKeys.session,
    queryFn: () => apiClient.getSession(),
  })
}

export const useProfile = () => {
  return useQuery({
    queryKey: queryKeys.profile,
    queryFn: () => apiClient.getProfile(),
  })
}

export const useSettings = () => {
  return useQuery({
    queryKey: queryKeys.settings,
    queryFn: () => apiClient.getSettings(),
  })
}

// 프로젝트 훅들
export const useProjects = (filters?: PaginationParams & { search?: string }) => {
  return useQuery({
    queryKey: queryKeys.projects(filters),
    queryFn: () => apiClient.getProjects(filters),
  })
}

export const useProject = (id: string) => {
  return useQuery({
    queryKey: queryKeys.project(id),
    queryFn: () => apiClient.getProject(id),
    enabled: !!id,
  })
}

export const useProjectSessions = (projectId: string, filters?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.projectSessions(projectId, filters),
    queryFn: () => apiClient.getProjectSessions(projectId, filters),
    enabled: !!projectId,
  })
}

// 파일 훅들
export const useFiles = (filters?: PaginationParams & { 
  search?: string
  project_id?: string 
  file_type?: string
  upload_status?: string
}) => {
  return useQuery({
    queryKey: queryKeys.files(filters),
    queryFn: () => apiClient.getFiles(filters),
  })
}

export const useFile = (id: string) => {
  return useQuery({
    queryKey: queryKeys.file(id),
    queryFn: () => apiClient.getFile(id),
    enabled: !!id,
  })
}

export const useUploadStatus = (fileId: string) => {
  return useQuery({
    queryKey: queryKeys.uploadStatus(fileId),
    queryFn: () => apiClient.getUploadStatus(fileId),
    enabled: !!fileId,
    refetchInterval: (data) => {
      // 업로드가 완료되지 않았으면 계속 폴링
      if ((data as any)?.data?.upload_status === 'processing' || (data as any)?.data?.upload_status === 'uploaded') {
        return 1000 // 1초마다
      }
      return false
    },
  })
}

// 통계 훅들
export const useDashboardStats = () => {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: () => apiClient.getDashboardStats(),
  })
}

export const useProjectStats = (projectId: string) => {
  return useQuery({
    queryKey: queryKeys.projectStats(projectId),
    queryFn: () => apiClient.getProjectStats(projectId),
    enabled: !!projectId,
  })
}

export const useUserStats = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.userStats(userId),
    queryFn: () => apiClient.getUserStats(userId),
    enabled: !!userId,
  })
}

// API 키 훅들
export const useApiKeys = () => {
  return useQuery({
    queryKey: queryKeys.apiKeys,
    queryFn: () => apiClient.getApiKeys(),
  })
}

// Mutation 훅들
export const useLogin = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiClient.login(email, password),
    onSuccess: () => {
      // 로그인 성공 시 관련 쿼리들 무효화
      queryClient.invalidateQueries({ queryKey: queryKeys.session })
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: () => apiClient.logout(),
    onSuccess: () => {
      // 로그아웃 시 모든 캐시 클리어
      queryClient.clear()
    },
  })
}

export const useSignup = () => {
  return useMutation({
    mutationFn: ({ email, password, displayName }: { 
      email: string
      password: string
      displayName?: string 
    }) => apiClient.signup(email, password, displayName),
  })
}

export const useUpdateProfile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { display_name?: string; avatar_url?: string }) =>
      apiClient.updateProfile(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.profile })
    },
  })
}

export const useUpdateSettings = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { default_project_path?: string; locale?: string }) =>
      apiClient.updateSettings(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings })
    },
  })
}

export const useCreateProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: {
      name: string
      description?: string
      folder_path?: string
    }) => apiClient.createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export const useUpdateProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ id, data }: {
      id: string
      data: {
        name?: string
        description?: string
        folder_path?: string
      }
    }) => apiClient.updateProject(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      queryClient.invalidateQueries({ queryKey: queryKeys.project(id) })
    },
  })
}

export const useDeleteProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export const useFindOrCreateProject = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { folder_path: string }) => 
      apiClient.findOrCreateProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
    },
  })
}

export const useUploadFile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (formData: FormData) => apiClient.uploadFile(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

export const useUploadBatch = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (formData: FormData) => apiClient.uploadBatch(formData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

export const useDeleteFile = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (fileId: string) => apiClient.deleteFile(fileId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['files'] })
    },
  })
}

export const useCreateApiKey = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (data: { name: string }) => apiClient.createApiKey(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys })
    },
  })
}

export const useUpdateApiKey = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: ({ keyId, data }: {
      keyId: string
      data: { name?: string; is_active?: boolean }
    }) => apiClient.updateApiKey(keyId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys })
    },
  })
}

export const useDeleteApiKey = () => {
  const queryClient = useQueryClient()
  
  return useMutation({
    mutationFn: (keyId: string) => apiClient.deleteApiKey(keyId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.apiKeys })
    },
  })
}

// 팀 훅들
export const useTeamMembers = () => {
  return useQuery({
    queryKey: queryKeys.teamMembers,
    queryFn: () => apiClient.getTeamMembers(),
  })
}

export const useTeamMember = (userId: string) => {
  return useQuery({
    queryKey: queryKeys.teamMember(userId),
    queryFn: () => apiClient.getTeamMember(userId),
    enabled: !!userId,
  })
}

export const useTeamMemberDaily = (userId: string, date: string) => {
  return useQuery({
    queryKey: queryKeys.teamMemberDaily(userId, date),
    queryFn: () => apiClient.getTeamMemberDaily(userId, date),
    enabled: !!userId && !!date,
  })
}

export const useTeamStats = () => {
  return useQuery({
    queryKey: queryKeys.teamStats,
    queryFn: () => apiClient.getTeamStats(),
  })
}

export const useTeamFiles = (filters?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.teamFiles(filters),
    queryFn: () => apiClient.getTeamFiles(filters),
  })
}

export const useTeamProjects = (filters?: PaginationParams) => {
  return useQuery({
    queryKey: queryKeys.teamProjects(filters),
    queryFn: () => apiClient.getTeamProjects(filters),
  })
}