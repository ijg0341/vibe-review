'use client'

import React from 'react'
import { Card, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { FileText, Clock } from 'lucide-react'

interface Session {
  id: string
  project_id?: string
  user_id?: string
  session_name?: string
  file_name?: string
  session_count?: number
  uploaded_at: string
  session_start_date?: string
  session_end_date?: string
  processed_lines?: number
  first_user_prompt?: string
  profiles?: {
    email: string
    display_name?: string
    avatar_url?: string
  }
}

interface SessionListProps {
  sessions: Session[]
  selectedSessionId?: string
  onSessionSelect: (session: Session) => void
  locale?: 'ko' | 'en'
}

export const SessionList: React.FC<SessionListProps> = ({ 
  sessions, 
  selectedSessionId, 
  onSessionSelect, 
  locale = 'ko' 
}) => {
  
  const getUserInitials = (email: string, name?: string) => {
    if (name) {
      return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    }
    return email.slice(0, 2).toUpperCase()
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(
      locale === 'ko' ? 'ko-KR' : 'en-US',
      { hour: '2-digit', minute: '2-digit' }
    )
  }

  const getSessionDisplayName = (session: Session) => {
    return session.first_user_prompt || 
           session.session_name || 
           session.file_name || 
           `Session ${session.session_count || ''}`
  }

  return (
    <div className="space-y-2">
      {sessions.map(session => (
          <Card
            key={session.id}
            className={`cursor-pointer transition-all ${
              selectedSessionId === session.id 
                ? 'ring-2 ring-primary shadow-md' 
                : 'hover:shadow-sm'
            }`}
            onClick={() => onSessionSelect(session)}
          >
            <CardHeader className="p-3">
              <div className="flex flex-col gap-2">
                {session.profiles && (
                  <div className="flex items-center gap-2">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="text-xs">
                        {getUserInitials(
                          session.profiles.email,
                          session.profiles.display_name
                        )}
                      </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground truncate">
                        {session.profiles.display_name || session.profiles.email}
                      </p>
                    </div>
                  </div>
                )}
                <div className="w-full">
                  <p className="font-medium text-sm line-clamp-2">
                    {getSessionDisplayName(session)}
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-between mt-2">
                <Badge variant="outline" className="text-xs">
                  <FileText className="h-3 w-3 mr-1" />
                  {session.processed_lines || 0}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  <Clock className="h-2 w-2 inline mr-1" />
                  {formatDate(session.uploaded_at)}
                </span>
              </div>
            </CardHeader>
          </Card>
        ))}
    </div>
  )
}

export default SessionList