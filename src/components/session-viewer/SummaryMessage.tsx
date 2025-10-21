'use client'

import React from 'react'
import { Card } from '@/components/ui/card'
import { FileText } from 'lucide-react'

interface SummaryMessageProps {
  data: any
  locale?: 'ko' | 'en'
}

export const SummaryMessage: React.FC<SummaryMessageProps> = ({
  data,
  locale = 'ko'
}) => {
  const summary = data.summary || ''
  const leafUuid = data.leafUuid

  const formatMarkdown = (text: string) => {
    return text
      // 헤딩 처리
      .replace(/^### (.*$)/gim, '<h3 class="text-base font-semibold text-foreground mb-1 mt-2">$1</h3>')
      .replace(/^## (.*$)/gim, '<h2 class="text-lg font-bold text-foreground mb-2 mt-3">$1</h2>')

      // 체크박스 리스트
      .replace(/^- \[x\] (.*$)/gim, '<div class="flex items-start gap-2 mb-1 text-sm"><input type="checkbox" class="mt-0.5 rounded" checked disabled /><span>$1</span></div>')
      .replace(/^- \[ \] (.*$)/gim, '<div class="flex items-start gap-2 mb-1 text-sm"><input type="checkbox" class="mt-0.5 rounded" disabled /><span>$1</span></div>')

      // 볼드 텍스트
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')

      // 일반 리스트
      .replace(/^- ((?!\[).*$)/gim, '<div class="flex items-start gap-2 mb-1 text-sm"><span class="text-muted-foreground mt-0.5">•</span><span>$1</span></div>')

      // 줄바꿈 처리
      .replace(/\n\n/g, '<br><br>')
      .replace(/\n/g, '<br>')
  }

  return (
    <Card className="p-4 bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
            <FileText className="h-4 w-4 text-white" />
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">
              {locale === 'ko' ? '세션 요약' : 'Session Summary'}
            </span>
            {leafUuid && (
              <span className="text-xs text-muted-foreground font-mono">
                {leafUuid.substring(0, 8)}...
              </span>
            )}
          </div>

          <div
            className="text-sm text-foreground"
            dangerouslySetInnerHTML={{ __html: formatMarkdown(summary) }}
          />
        </div>
      </div>
    </Card>
  )
}

export default SummaryMessage
