'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/auth-context'
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
  const { signUp } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  
  const locale = useLocaleStore((state) => state.locale)
  const t = useTranslation(locale)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (password !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: locale === 'ko' ? '비밀번호가 일치하지 않습니다' : 'Passwords do not match',
      })
      return
    }

    setIsLoading(true)

    try {
      const result = await signUp(email, password, name)

      if (result.success) {
        toast({
          title: locale === 'ko' ? '회원가입 완료' : 'Signup successful',
          description: locale === 'ko' ? '로그인 페이지로 이동합니다' : 'Redirecting to login page',
        })
        router.push('/login')
      } else {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: result.error || 'Signup failed',
        })
      }
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'An unexpected error occurred',
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
            {locale === 'ko' ? '회원가입' : 'Sign up'}
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {locale === 'ko' ? '새로운 계정을 만드세요' : 'Create a new account'}
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <Label htmlFor="name">{locale === 'ko' ? '이름' : 'Name'}</Label>
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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1"
                disabled={isLoading}
              />
            </div>

            <div>
              <Label htmlFor="confirm-password">{locale === 'ko' ? '비밀번호 확인' : 'Confirm Password'}</Label>
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
            {locale === 'ko' ? '가입함으로써' : 'By signing up, you agree to our'}{' '}
            <Link href="/terms" className="text-primary hover:underline">
              {locale === 'ko' ? '이용약관' : 'Terms'}
            </Link>{' '}
            {locale === 'ko' ? '및' : 'and'}{' '}
            <Link href="/privacy" className="text-primary hover:underline">
              {locale === 'ko' ? '개인정보처리방침' : 'Privacy Policy'}
            </Link>
            {locale === 'ko' ? '에 동의합니다.' : '.'}
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
              locale === 'ko' ? '계정 만들기' : 'Create Account'
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {locale === 'ko' ? '이미 계정이 있나요?' : 'Already have an account?'}{' '}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              {locale === 'ko' ? '로그인' : 'Sign in'}
            </Link>
          </p>
        </form>
        </div>
      </div>
    </AuthRedirect>
  )
}