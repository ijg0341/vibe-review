'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Loader2 } from 'lucide-react'
import { useLocaleStore } from '@/lib/locale-store'
import { useTranslation } from '@/lib/translations'
import { LanguageToggle } from '@/components/language-toggle'
import { ThemeToggle } from '@/components/theme-toggle'
import { AuthRedirect } from '@/components/auth/auth-redirect'

export default function LoginPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { signIn } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  
  const locale = useLocaleStore((state) => state.locale)
  const t = useTranslation(locale)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const result = await signIn(email, password)

      if (result.success) {
        toast({
          title: locale === 'ko' ? '로그인 성공' : 'Login successful',
          description: locale === 'ko' ? '환영합니다!' : 'Welcome back!',
        })
        router.push('/dashboard')
        router.refresh()
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Login failed',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: t.auth.login.loginError,
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
            {locale === 'ko' ? '로그인' : 'Sign in'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {locale === 'ko' ? '계정에 로그인하세요' : 'Sign in to your account'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="email">{locale === 'ko' ? '이메일' : 'Email'}</Label>
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
              <Label htmlFor="password">{locale === 'ko' ? '비밀번호' : 'Password'}</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember-me"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={isLoading}
              />
              <label
                htmlFor="remember-me"
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {locale === 'ko' ? '로그인 상태 유지' : 'Remember me'}
              </label>
            </div>

            <Link
              href="/forgot-password"
              className="text-sm text-primary hover:underline"
            >
              {locale === 'ko' ? '비밀번호를 잊으셨나요?' : 'Forgot your password?'}
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
              locale === 'ko' ? '로그인' : 'Sign in'
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {locale === 'ko' ? '계정이 없나요?' : 'Don\'t have an account?'}{' '}
            <Link
              href="/signup"
              className="font-medium text-primary hover:underline"
            >
              {locale === 'ko' ? '회원가입' : 'Sign up'}
            </Link>
          </p>
        </form>
        </div>
      </div>
    </AuthRedirect>
  )
}