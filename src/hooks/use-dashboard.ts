// 대시보드 데이터 관리를 위한 React Query 훅들
'use client'

import { useQuery } from '@tanstack/react-query'
import { apiClient, type PersonalStats, type TeamTotalStats, type TeamRankings } from '@/lib/api-client'

/**
 * 개인 일별 통계 조회 훅
 */
export function usePersonalStats(date?: string) {
  return useQuery({
    queryKey: ['personal-stats', date],
    queryFn: async () => {
      const response = await apiClient.getPersonalStats(date)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch personal stats')
      }
      return response.data!
    },
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시
    refetchOnWindowFocus: false,
    retry: 2
  })
}

/**
 * 팀 전체 통계 조회 훅
 */
export function useTeamTotalStats(date?: string) {
  return useQuery({
    queryKey: ['team-total-stats', date],
    queryFn: async () => {
      const response = await apiClient.getTeamTotalStats(date)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch team total stats')
      }
      return response.data!
    },
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시
    refetchOnWindowFocus: false,
    retry: 2
  })
}

/**
 * 팀 랭킹 조회 훅
 */
export function useTeamRankings(date?: string) {
  return useQuery({
    queryKey: ['team-rankings', date],
    queryFn: async () => {
      const response = await apiClient.getTeamRankings(date)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch team rankings')
      }
      return response.data!
    },
    staleTime: 5 * 60 * 1000, // 5분 동안 캐시
    refetchOnWindowFocus: false,
    retry: 2
  })
}

/**
 * 대시보드 전체 데이터 조회 (팀 전체 통계 + 팀 랭킹)
 */
export function useDashboardData(date?: string) {
  const teamTotalStats = useTeamTotalStats(date)
  const teamRankings = useTeamRankings(date)

  return {
    teamTotalStats: teamTotalStats.data,
    teamRankings: teamRankings.data,
    isLoading: teamTotalStats.isLoading || teamRankings.isLoading,
    isError: teamTotalStats.isError || teamRankings.isError,
    error: teamTotalStats.error || teamRankings.error,
    refetch: () => {
      teamTotalStats.refetch()
      teamRankings.refetch()
    }
  }
}

/**
 * 실시간 대시보드 데이터 (30초마다 자동 새로고침)
 */
export function useRealtimeDashboard(date?: string) {
  const teamTotalStats = useQuery({
    queryKey: ['team-total-stats-realtime', date],
    queryFn: async () => {
      const response = await apiClient.getTeamTotalStats(date)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch team total stats')
      }
      return response.data!
    },
    refetchInterval: 30 * 1000, // 30초마다 자동 새로고침
    staleTime: 1 * 60 * 1000, // 1분 동안 캐시
    refetchOnWindowFocus: true,
    retry: 2
  })

  const teamRankings = useQuery({
    queryKey: ['team-rankings-realtime', date],
    queryFn: async () => {
      const response = await apiClient.getTeamRankings(date)
      if (!response.success) {
        throw new Error(response.error || 'Failed to fetch team rankings')
      }
      return response.data!
    },
    refetchInterval: 30 * 1000, // 30초마다 자동 새로고침
    staleTime: 1 * 60 * 1000, // 1분 동안 캐시
    refetchOnWindowFocus: true,
    retry: 2
  })

  return {
    teamTotalStats: teamTotalStats.data,
    teamRankings: teamRankings.data,
    isLoading: teamTotalStats.isLoading || teamRankings.isLoading,
    isError: teamTotalStats.isError || teamRankings.isError,
    error: teamTotalStats.error || teamRankings.error,
    refetch: () => {
      teamTotalStats.refetch()
      teamRankings.refetch()
    }
  }
}