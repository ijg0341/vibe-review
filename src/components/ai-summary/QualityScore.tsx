'use client'

import React from 'react'
import { Progress } from '@/components/ui/progress'
import { Star } from 'lucide-react'

interface QualityScoreProps {
  qualityScore: number
  qualityScoreExplanation?: string
  locale?: 'ko' | 'en'
}

export const QualityScore: React.FC<QualityScoreProps> = ({
  qualityScore,
  qualityScoreExplanation,
  locale = 'ko'
}) => {
  // 점수를 100점 만점으로 변환
  const scorePercentage = Math.round(qualityScore * 100)

  // 점수에 따른 등급 계산
  const getGrade = (score: number) => {
    if (score >= 0.9) return { text: locale === 'ko' ? '최고' : 'Excellent', color: 'text-green-600' }
    if (score >= 0.8) return { text: locale === 'ko' ? '우수' : 'Great', color: 'text-blue-600' }
    if (score >= 0.7) return { text: locale === 'ko' ? '양호' : 'Good', color: 'text-yellow-600' }
    if (score >= 0.6) return { text: locale === 'ko' ? '보통' : 'Fair', color: 'text-orange-600' }
    return { text: locale === 'ko' ? '개선 필요' : 'Needs Improvement', color: 'text-red-600' }
  }

  // 별점 계산 (5점 만점)
  const starCount = Math.round(qualityScore * 5)

  const grade = getGrade(qualityScore)

  return (
    <div className="space-y-4">
      {/* 점수 근거 */}
      {qualityScoreExplanation && (
        <p className="text-sm text-muted-foreground leading-relaxed">
          {qualityScoreExplanation}
        </p>
      )}

        {/* 점수 표시 */}
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-2">
            <span className={`text-4xl font-bold ${grade.color}`}>
              {scorePercentage}
            </span>
            <span className="text-2xl text-muted-foreground">/100</span>
          </div>
          <div className={`text-lg font-semibold ${grade.color}`}>
            {grade.text}
          </div>
        </div>

        {/* 프로그레스 바 */}
        <Progress
          value={scorePercentage}
          className="h-3"
        />

        {/* 별점 표시 */}
        <div className="flex items-center gap-1 justify-center py-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-6 w-6 ${
                star <= starCount
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-muted-foreground'
              }`}
            />
          ))}
        </div>

        {/* 개선 제안 (낮은 점수일 때) */}
        {qualityScore < 0.7 && (
          <div className="text-sm bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg p-3">
            <p className="font-medium text-orange-800 dark:text-orange-200 mb-1">
              💡 {locale === 'ko' ? '개선 제안' : 'Improvement Tips'}
            </p>
            <p className="text-xs text-orange-700 dark:text-orange-300">
              {locale === 'ko'
                ? '더 구체적인 요청과 명확한 컨텍스트를 제공하면 AI의 응답 품질이 향상됩니다.'
                : 'Providing more specific requests and clear context will improve AI response quality.'}
            </p>
          </div>
        )}
    </div>
  )
}

export default QualityScore
