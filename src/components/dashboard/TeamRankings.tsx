// 팀 랭킹 컴포넌트들 - 기존 디자인 패턴 따름  
'use client'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import type { TeamRankings as TeamRankingsType, TeamRankingUser } from '@/lib/api-client'
import { useLocaleStore } from '@/lib/locale-store'

interface TeamRankingsProps {
  rankings: TeamRankingsType | undefined
}

export function TeamRankings({ rankings }: TeamRankingsProps) {
  const locale = useLocaleStore(state => state.locale)

  if (!rankings) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-muted rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[1, 2, 3].map(j => (
                  <div key={j} className="h-4 bg-muted rounded"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
      {/* 토큰 사용량 랭킹 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🔢</span>
            {locale === 'ko' ? '토큰 사용량 TOP 20' : 'Token Usage TOP 20'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RankingList 
            title="토큰 사용량"
            users={rankings.token_ranking} 
            renderValue={(user) => (
              <div className="text-right">
                <p className="font-semibold">{user.formatted_value}</p>
                {user.estimated_cost && (
                  <p className="text-xs text-muted-foreground">
                    ${user.estimated_cost.toFixed(2)}
                  </p>
                )}
              </div>
            )}
          />
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {locale === 'ko' 
                ? '💡 AI와 가장 많이 소통한 팀원들입니다. 높은 토큰 사용량은 복잡한 작업이나 깊이 있는 대화를 의미합니다.'
                : '💡 Team members who communicated most with AI. High token usage indicates complex tasks or in-depth conversations.'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 프롬프트 횟수 랭킹 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💬</span>
            {locale === 'ko' ? '프롬프트 횟수 TOP 20' : 'Prompt Count TOP 20'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RankingList 
            title="프롬프트 횟수"
            users={rankings.prompt_ranking}
            renderValue={(user) => (
              <Badge variant="secondary">
                {user.formatted_value}
              </Badge>
            )}
          />
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {locale === 'ko'
                ? '💡 AI에게 가장 많은 질문을 한 팀원들입니다. 적극적으로 AI를 활용하여 문제를 해결하고 있습니다.'
                : '💡 Team members who asked the most questions to AI. They actively use AI to solve problems.'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 메시지량 랭킹 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📝</span>
            {locale === 'ko' ? '메시지량 TOP 20' : 'Message Volume TOP 20'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RankingList 
            title="메시지량"
            users={rankings.message_ranking}
            renderValue={(user) => (
              <Badge variant="secondary">
                {user.formatted_value}
              </Badge>
            )}
          />
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {locale === 'ko'
                ? '💡 AI에게 가장 상세한 설명을 한 팀원들입니다. 구체적이고 명확한 커뮤니케이션을 통해 더 나은 결과를 얻습니다.'
                : '💡 Team members who provided the most detailed descriptions to AI. Clear communication leads to better results.'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 비용 효율성 랭킹 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>💎</span>
            {locale === 'ko' ? '비용 효율성 TOP 20' : 'Cost Efficiency TOP 20'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RankingList 
            title="비용 효율성"
            users={rankings.cost_efficiency_ranking}
            renderValue={(user) => (
              <div className="text-right">
                <Badge variant="outline" className="text-emerald-600">
                  {user.formatted_value}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {locale === 'ko' ? '경제적 효율성' : 'economic efficiency'}
                </p>
              </div>
            )}
          />
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {locale === 'ko'
                ? '💡 같은 비용으로 가장 많은 토큰을 얻은 팀원들입니다. 예산 대비 최고의 성과를 내는 스마트한 AI 활용자들입니다.'
                : '💡 Team members who got the most tokens for the same cost. Smart AI users achieving maximum results per budget.'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 프롬프트 품질 랭킹 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🎯</span>
            {locale === 'ko' ? '프롬프트 품질 TOP 20' : 'Prompt Quality TOP 20'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RankingList 
            title="프롬프트 품질"
            users={rankings.prompt_quality_ranking}
            renderValue={(user) => (
              <div className="text-right">
                <Badge variant="outline" className="text-blue-600">
                  {user.formatted_value}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {locale === 'ko' ? '효율적인 질문 능력' : 'effective questioning'}
                </p>
              </div>
            )}
          />
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {locale === 'ko'
                ? '💡 적은 입력으로 풍부한 결과를 얻는 팀원들입니다. 핵심을 찌르는 질문으로 AI의 잠재력을 최대한 끌어냅니다.'
                : '💡 Team members who get rich results with minimal input. They unlock AI potential with precise questions.'
              }
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 종합 AI 활용도 랭킹 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🏆</span>
            {locale === 'ko' ? '종합 AI 활용도 TOP 20' : 'Overall AI Usage TOP 20'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <RankingList 
            title="종합 AI 활용도"
            users={rankings.overall_ai_score_ranking}
            renderValue={(user) => (
              <div className="text-right">
                <Badge variant="default" className="bg-gradient-to-r from-purple-500 to-pink-500">
                  {user.formatted_value}
                </Badge>
                <p className="text-xs text-muted-foreground mt-1">
                  {locale === 'ko' ? 'AI 마스터 지수' : 'AI mastery index'}
                </p>
              </div>
            )}
          />
          <div className="mt-4 pt-3 border-t">
            <p className="text-xs text-muted-foreground leading-relaxed">
              {locale === 'ko'
                ? '🏆 토큰량, 프롬프트수, 메시지량을 종합해서 가장 AI를 잘 활용한 팀원들입니다. 진정한 AI 마스터들이에요!'
                : '🏆 Team members who best utilize AI based on combined metrics. These are the true AI masters!'
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

/**
 * 랭킹 리스트 컴포넌트 - 기존 팀 멤버 카드 스타일
 */
interface RankingListProps {
  users: TeamRankingUser[]
  renderValue: (user: TeamRankingUser) => React.ReactNode
  title: string
}

function RankingList({ users, renderValue, title }: RankingListProps) {
  const locale = useLocaleStore(state => state.locale)

  if (!users || users.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>{locale === 'ko' ? '오늘 활동한 팀원이 없습니다' : 'No team activity today'}</p>
      </div>
    )
  }

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '🥇'
      case 2: return '🥈' 
      case 3: return '🥉'
      default: return `${rank}위`
    }
  }

  const getUserInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  return (
    <div className="max-h-[500px] overflow-y-auto pr-2">
      <div className="space-y-2">
        {users.map((user, index) => (
          <div 
            key={user.user_email} 
            className="flex items-center justify-between p-3 rounded-lg border bg-background hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="text-lg min-w-[32px]">
                {getRankEmoji(user.rank)}
              </div>
              <Avatar className="h-8 w-8">
                <AvatarFallback className="text-xs">
                  {getUserInitials(user.user_name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm truncate">
                  {user.user_name}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.user_email}
                </p>
              </div>
            </div>
            <div className="text-right ml-2">
              {renderValue(user)}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}