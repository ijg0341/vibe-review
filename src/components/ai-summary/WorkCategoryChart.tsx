'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts'
import { Badge } from '@/components/ui/badge'

interface WorkCategoryData {
  minutes: number
  percentage: number
  description: string | null
}

interface WorkCategories {
  planning: WorkCategoryData
  frontend: WorkCategoryData
  backend: WorkCategoryData
  qa: WorkCategoryData
  devops: WorkCategoryData
  research: WorkCategoryData
  other: WorkCategoryData
}

interface WorkCategoryChartProps {
  workCategories: WorkCategories
  locale?: 'ko' | 'en'
}

const CATEGORY_CONFIG = {
  planning: {
    ko: '기획/설계',
    en: 'Planning',
    color: '#8b5cf6', // violet
    icon: '📋'
  },
  frontend: {
    ko: '프론트엔드',
    en: 'Frontend',
    color: '#3b82f6', // blue
    icon: '🎨'
  },
  backend: {
    ko: '백엔드',
    en: 'Backend',
    color: '#10b981', // green
    icon: '⚙️'
  },
  qa: {
    ko: 'QA/테스트',
    en: 'QA/Testing',
    color: '#f59e0b', // amber
    icon: '🧪'
  },
  devops: {
    ko: 'DevOps',
    en: 'DevOps',
    color: '#ef4444', // red
    icon: '🚀'
  },
  research: {
    ko: '리서치/학습',
    en: 'Research',
    color: '#06b6d4', // cyan
    icon: '📚'
  },
  other: {
    ko: '기타',
    en: 'Other',
    color: '#64748b', // slate
    icon: '📦'
  }
}

export const WorkCategoryChart: React.FC<WorkCategoryChartProps> = ({
  workCategories,
  locale = 'ko'
}) => {
  // 차트 데이터 준비 (percentage > 0인 것만)
  const chartData = Object.entries(workCategories)
    .filter(([_, data]) => data.percentage > 0)
    .map(([category, data]) => ({
      name: CATEGORY_CONFIG[category as keyof WorkCategories][locale],
      value: data.percentage,
      minutes: data.minutes,
      color: CATEGORY_CONFIG[category as keyof WorkCategories].color,
      icon: CATEGORY_CONFIG[category as keyof WorkCategories].icon,
      description: data.description
    }))

  // 데이터가 없는 경우
  if (chartData.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-8">
        {locale === 'ko' ? '데이터가 없습니다' : 'No data available'}
      </p>
    )
  }

  // 커스텀 라벨 렌더링
  const renderCustomLabel = (entry: any) => {
    return `${entry.value.toFixed(1)}%`
  }

  return (
    <div>
        {/* 도넛 차트 */}
        <div className="h-64 mb-4">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={renderCustomLabel}
                outerRadius={80}
                innerRadius={50}
                fill="#8884d8"
                dataKey="value"
                paddingAngle={2}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                content={({ payload }) => {
                  if (payload && payload.length > 0) {
                    const data = payload[0].payload
                    return (
                      <div className="bg-background border rounded-lg p-3 shadow-lg">
                        <p className="font-semibold text-sm mb-1">
                          {data.icon} {data.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {data.minutes}{locale === 'ko' ? '분' : ' min'} · {data.value.toFixed(1)}%
                        </p>
                        {data.description && (
                          <p className="text-xs text-muted-foreground mt-1 max-w-xs">
                            {data.description}
                          </p>
                        )}
                      </div>
                    )
                  }
                  return null
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* 카테고리별 상세 정보 */}
        <div className="space-y-2">
          {chartData.map((item, index) => (
            <div key={index} className="flex items-start gap-2 text-sm">
              <div
                className="w-3 h-3 rounded-full mt-0.5 flex-shrink-0"
                style={{ backgroundColor: item.color }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="font-medium">
                    {item.icon} {item.name}
                  </span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="secondary" className="text-xs">
                      {item.minutes}{locale === 'ko' ? '분' : 'm'}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {item.value.toFixed(1)}%
                    </span>
                  </div>
                </div>
                {item.description && (
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
    </div>
  )
}

export default WorkCategoryChart
