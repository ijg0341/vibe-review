'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Loader2 } from 'lucide-react'

interface AuthRedirectProps {
  children: React.ReactNode
  redirectPath?: string
}

export function AuthRedirect({ 
  children, 
  redirectPath = '/dashboard' 
}: AuthRedirectProps) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && user) {
      router.push(redirectPath)
    }
  }, [user, loading, router, redirectPath])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (user) {
    return null
  }

  return <>{children}</>
}