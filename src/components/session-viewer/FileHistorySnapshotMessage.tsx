'use client'

import React, { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Database, ChevronDown, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ko, enUS } from 'date-fns/locale'

interface FileHistorySnapshotMessageProps {
  data: any
  locale?: 'ko' | 'en'
}

export const FileHistorySnapshotMessage: React.FC<FileHistorySnapshotMessageProps> = ({
  data,
  locale = 'ko'
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const messageId = data.messageId
  const snapshot = data.snapshot || {}
  const isSnapshotUpdate = data.isSnapshotUpdate
  const trackedFileCount = Object.keys(snapshot.trackedFileBackups || {}).length
  const snapshotTime = snapshot.timestamp ? new Date(snapshot.timestamp) : null

  const formatTime = (date: Date) => {
    return format(date, 'PPpp', { locale: locale === 'ko' ? ko : enUS })
  }

  return (
    <Card className="p-3 bg-gray-50 dark:bg-gray-900/30 border-gray-200 dark:border-gray-800">
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex-shrink-0">
          <Database className="h-4 w-4 text-gray-500" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
              {locale === 'ko' ? '파일 히스토리 스냅샷' : 'File History Snapshot'}
            </span>
            {isSnapshotUpdate && (
              <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded">
                {locale === 'ko' ? '업데이트' : 'Update'}
              </span>
            )}
            <span className="text-xs text-muted-foreground">
              {trackedFileCount} {locale === 'ko' ? '개 파일' : 'files'}
            </span>
          </div>
        </div>

        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="mt-3 ml-6 space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <span className="text-muted-foreground">Message ID:</span>
              <div className="font-mono text-gray-700 dark:text-gray-300 break-all">
                {messageId}
              </div>
            </div>

            {snapshotTime && (
              <div>
                <span className="text-muted-foreground">
                  {locale === 'ko' ? '생성 시간:' : 'Created:'}
                </span>
                <div className="text-gray-700 dark:text-gray-300">
                  {formatTime(snapshotTime)}
                </div>
              </div>
            )}
          </div>

          {trackedFileCount > 0 && (
            <div>
              <span className="text-muted-foreground">
                {locale === 'ko' ? '추적 파일:' : 'Tracked Files:'}
              </span>
              <pre className="mt-1 p-2 bg-gray-100 dark:bg-gray-800 rounded text-xs overflow-x-auto">
                {JSON.stringify(snapshot.trackedFileBackups, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export default FileHistorySnapshotMessage
