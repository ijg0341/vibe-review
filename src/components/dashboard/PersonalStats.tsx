// 개인 통계 카드 컴포넌트들 - 기존 디자인 패턴 따름
'use client'

import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { PersonalStats, TeamTotalStats } from '@/lib/api-client'
import { useLocaleStore } from '@/lib/locale-store'

interface PersonalStatsCardsProps {
  stats: PersonalStats | TeamTotalStats | undefined
}

export function PersonalStatsCards({ stats }: PersonalStatsCardsProps) {
  const locale = useLocaleStore(state => state.locale)

  if (!stats) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map(i => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-8 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  // 팀 전체 통계인지 개인 통계인지 구분
  const isTeamStats = 'active_members' in stats
  
  const cards = isTeamStats ? [
    {
      title: locale === 'ko' ? '팀 토큰 사용량' : 'Team Token Usage',
      value: formatTokens(stats.total_tokens),
      subtitle: `Input: ${formatTokens(stats.input_tokens)} | Output: ${formatTokens(stats.output_tokens)}`,
      icon: '🔢',
      color: 'text-blue-600'
    },
    {
      title: locale === 'ko' ? '팀 예상 비용' : 'Team Estimated Cost',
      value: `$${stats.estimated_cost.toFixed(2)}`,
      subtitle: `${(stats as TeamTotalStats).active_members}${locale === 'ko' ? '명 활동' : ' active members'}`,
      icon: '💰',
      color: 'text-green-600'
    },
    {
      title: locale === 'ko' ? '팀 프롬프트 횟수' : 'Team Prompts',
      value: stats.prompt_count.toLocaleString(),
      subtitle: `${(stats as TeamTotalStats).session_count}${locale === 'ko' ? '개 세션' : ' sessions'}`,
      icon: '💬',
      color: 'text-purple-600'
    },
    {
      title: locale === 'ko' ? '팀 메시지량' : 'Team Messages',
      value: formatMessageChars(stats.message_chars),
      subtitle: `${stats.tool_breakdown.length}${locale === 'ko' ? '개 도구 사용' : ' tools used'}`,
      icon: '📝',
      color: 'text-orange-600'
    }
  ] : [
    {
      title: locale === 'ko' ? '토큰 사용량' : 'Token Usage',
      value: formatTokens(stats.total_tokens),
      subtitle: `Input: ${formatTokens(stats.input_tokens)} | Output: ${formatTokens(stats.output_tokens)}`,
      icon: '🔢',
      color: 'text-blue-600'
    },
    {
      title: locale === 'ko' ? '예상 비용' : 'Estimated Cost',
      value: `$${stats.estimated_cost.toFixed(2)}`,
      subtitle: `${stats.tool_breakdown.map(t => t.model).join(', ')} ${locale === 'ko' ? '기준' : 'basis'}`,
      icon: '💰',
      color: 'text-green-600'
    },
    {
      title: locale === 'ko' ? '프롬프트 횟수' : 'Prompt Count',
      value: stats.prompt_count.toLocaleString(),
      subtitle: `${stats.tool_breakdown.length}${locale === 'ko' ? '개 도구 사용' : ' tools used'}`,
      icon: '💬',
      color: 'text-purple-600'
    },
    {
      title: locale === 'ko' ? '작성한 문자수' : 'Characters Written',
      value: formatMessageChars(stats.message_chars),
      subtitle: locale === 'ko' ? '사용자 입력 기준' : 'User input only',
      icon: '📝',
      color: 'text-orange-600'
    }
  ]

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {cards.map((card, index) => (
        <Card key={index} className="hover:shadow-lg transition-all cursor-default">
          <CardContent className="p-6">
            {/* 기존 팀 페이지 스타일을 따르는 구조 */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground flex items-center gap-1">
                  <span className="text-base">{card.icon}</span>
                  {card.title}
                </span>
                <Badge variant="secondary" className={card.color}>
                  {card.value}
                </Badge>
              </div>
              
              <div className="pt-2 border-t">
                <p className="text-xs text-muted-foreground">
                  {card.subtitle}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * 토큰 수를 읽기 쉽게 포맷팅
 */
function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`
  } else if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`
  }
  return tokens.toLocaleString()
}

/**
 * 문자수를 읽기 쉽게 포맷팅
 */
function formatMessageChars(chars: number): string {
  if (chars >= 1000000) {
    return `${(chars / 1000000).toFixed(1)}M`
  } else if (chars >= 1000) {
    return `${(chars / 1000).toFixed(1)}K`
  }
  return chars.toLocaleString()
}