'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { AuthRedirect } from '@/components/auth/auth-redirect'

export default function SignupPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const locale = useLocaleStore((state) => state.locale)
  const t = useTranslation(locale)
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: t.auth.signup.passwordMismatch,
      })
      return
    }

    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
          },
        },
      })

      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message || t.auth.signup.signupError,
        })
      } else {
        toast({
          title: 'Success',
          description: 'Please check your email to confirm your account.',
        })
        router.push('/login')
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: t.auth.signup.signupError,
      })
    } finally {
      setIsLoading(false)
    }
  }


  return (
    <AuthRedirect>
      <div className="min-h-screen flex items-center justify-center bg-background px-4 sm:px-6 lg:px-8">
      <div className="absolute top-4 right-4 flex items-center gap-2">
        <LanguageToggle />
        <ThemeToggle />
      </div>
      
      <div className="w-full max-w-md space-y-8">
        <div className="text-center">
          <h2 className="text-3xl font-bold tracking-tight">
            {t.auth.signup.title}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {t.auth.signup.subtitle}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{t.auth.signup.name}</Label>
              <Input
                id="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="email">{t.auth.signup.email}</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="password">{t.auth.signup.password}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="confirm-password">{t.auth.signup.confirmPassword}</Label>
              <Input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="text-xs text-muted-foreground text-center">
            {t.auth.signup.termsAgree}{' '}
            <Link href="/terms" className="text-primary hover:underline">
              {t.auth.signup.terms}
            </Link>{' '}
            {t.auth.signup.and}{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              {t.auth.signup.privacy}
            </Link>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading...
              </>
            ) : (
              t.auth.signup.createAccount
            )}
          </Button>


          <p className="text-center text-sm text-muted-foreground">
            {t.auth.signup.haveAccount}{' '}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              {t.auth.signup.signIn}
            </Link>
          </p>
        </form>
        </div>
      </div>
    </AuthRedirect>
  )
}