import { useState } from 'react'
import { Hash, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../components/ui/use-toast'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { ThemeToggle } from '../components/ThemeToggle'
import { PageContainer } from '../components/ui/PageContainer'
import { BrandSignature } from '../components/BrandSignature'
import { resetPasswordRequest } from '../services/modules/auth'

const getPasswordChecks = (password) => ({
  length: password.length >= 8,
  uppercase: /[A-Z]/.test(password),
  number: /\d/.test(password),
  symbol: /[^A-Za-z0-9]/.test(password),
})

const getStrengthKey = (password) => {
  if (!password) return 'weak'
  const checks = getPasswordChecks(password)
  const passed = Object.values(checks).filter(Boolean).length
  if (passed >= 4) return 'strong'
  if (passed >= 2) return 'medium'
  return 'weak'
}

const strengthStyles = {
  weak: {
    value: 1,
    bar: 'bg-rose-500/80 dark:bg-rose-400/80',
    text: 'text-rose-600 dark:text-rose-300',
  },
  medium: {
    value: 2,
    bar: 'bg-amber-500/80 dark:bg-amber-400/80',
    text: 'text-amber-600 dark:text-amber-300',
  },
  strong: {
    value: 3,
    bar: 'bg-emerald-500/80 dark:bg-emerald-400/80',
    text: 'text-emerald-600 dark:text-emerald-300',
  },
}

const getPasswordErrorKey = (password, confirmation, email) => {
  const checks = getPasswordChecks(password)

  if (!checks.length || !checks.uppercase || !checks.number || !checks.symbol) {
    return 'resetPassword.errors.passwordRules'
  }

  const normalizedEmail = email?.trim().toLowerCase()
  if (normalizedEmail && password.toLowerCase().includes(normalizedEmail)) {
    return 'resetPassword.errors.passwordContainsEmail'
  }

  if (password !== confirmation) {
    return 'resetPassword.errors.passwordMismatch'
  }

  return ''
}

export default function ResetPassword() {
  const [email, setEmail] = useState(() => {
    if (typeof window === 'undefined') return ''
    const params = new URLSearchParams(window.location.search)
    return params.get('email') || ''
  })
  const [verificationCode, setVerificationCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { toast } = useToast()
  const { t } = useTranslation()

  const strengthKey = getStrengthKey(password)
  const strengthConfig = strengthStyles[strengthKey]
  const strengthWidth = password ? `${(strengthConfig.value / 3) * 100}%` : '0%'

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    if (!email.trim()) {
      const message = t('forgotPassword.errors.emailRequired')
      setErrorMessage(message)
      toast({
        title: t('resetPassword.errorTitle'),
        description: message,
        variant: 'error',
      })
      return
    }

    if (!verificationCode.trim()) {
      const message = t('resetPassword.errors.codeRequired')
      setErrorMessage(message)
      toast({
        title: t('resetPassword.errorTitle'),
        description: message,
        variant: 'error',
      })
      return
    }

    const passwordErrorKey = getPasswordErrorKey(password, passwordConfirmation, email)
    if (passwordErrorKey) {
      const message = t(passwordErrorKey)
      setErrorMessage(message)
      toast({
        title: t('resetPassword.errorTitle'),
        description: message,
        variant: 'error',
      })
      return
    }

    setLoading(true)
    try {
      const payload = {
        token: verificationCode.trim(),
        email: email.trim(),
        password,
        password_confirmation: passwordConfirmation,
      }

      const response = await resetPasswordRequest(payload)
      const apiMessage = response?.message || t('resetPassword.successDescription')

      toast({
        title: t('resetPassword.successTitle'),
        description: apiMessage,
        variant: 'success',
      })

      setErrorMessage('')
      setVerificationCode('')
      setPassword('')
      setPasswordConfirmation('')

      if (typeof window !== 'undefined') {
        window.setTimeout(() => {
          window.location.href = '/'
        }, 800)
      }
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      const fallbackMessage = t('resetPassword.errorTitle')
      const message = apiMessage || fallbackMessage
      setErrorMessage(message)
      toast({
        title: t('resetPassword.errorTitle'),
        description: message,
        variant: 'error',
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-[-10%] top-10 h-48 w-48 rounded-full bg-primary/14 blur-[120px] dark:bg-primary/22" />
        <div className="absolute right-[-12%] top-1/4 h-56 w-56 rounded-full bg-sky-200/30 blur-[130px] dark:bg-sky-400/14" />
        <div className="absolute bottom-[-15%] left-1/4 h-56 w-56 rounded-full bg-indigo-100/25 blur-[140px] dark:bg-indigo-600/12" />
      </div>

      <PageContainer className="relative z-10 flex min-h-screen items-center justify-center py-10">
        <div className="w-full max-w-md">
        <div className="mb-6 flex justify-end gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>

        <div className="rounded-[28px] border border-border/70 bg-card/90 p-8 shadow-[0_28px_70px_-35px_rgba(62,82,152,0.45)] backdrop-blur-xl transition-colors dark:shadow-[0_30px_80px_-42px_rgba(0,0,0,0.75)]">
          <div className="mb-8">
            <BrandSignature size="md" titleKey="login.brand.title" subtitleKey="login.brand.subtitle" />
          </div>

          <div className="mb-6 space-y-2">
            <h1 className="text-[22px] font-semibold leading-tight">{t('resetPassword.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('resetPassword.subtitle')}</p>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/80" htmlFor="email">
                {t('forgotPassword.emailLabel')}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail className="h-5 w-5" />
                </span>
                <Input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-[54px] rounded-2xl border border-border/80 bg-background/70 pl-12 pr-4 text-[15px] shadow-[0_16px_40px_-28px_rgba(62,82,152,0.45)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-input/80"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/80" htmlFor="verificationCode">
                {t('resetPassword.codeLabel')}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
                  <Hash className="h-5 w-5" />
                </span>
                <Input
                  id="verificationCode"
                  type="text"
                  inputMode="text"
                  autoComplete="one-time-code"
                  placeholder={t('resetPassword.codePlaceholder')}
                  value={verificationCode}
                  onChange={(e) => setVerificationCode(e.target.value)}
                  minLength={8}
                  maxLength={8}
                  required
                  className="h-[54px] rounded-2xl border border-border/80 bg-background/70 pl-12 pr-4 text-[15px] uppercase tracking-[0.12em] shadow-[0_16px_40px_-28px_rgba(62,82,152,0.45)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-input/80"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/80" htmlFor="password">
                {t('resetPassword.passwordLabel')}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
                  <Lock className="h-5 w-5 fill-amber-500 text-amber-500" />
                </span>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  minLength={8}
                  autoComplete="new-password"
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-[54px] rounded-2xl border border-border/80 bg-background/70 pl-12 pr-16 text-[15px] shadow-[0_16px_40px_-28px_rgba(62,82,152,0.45)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-input/80"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                  aria-pressed={showPassword}
                  aria-label={t('login.togglePasswordAlt')}
                >
                  {showPassword ? t('login.hide') : t('login.show')}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t('resetPassword.passwordHelper')}</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t('resetPassword.strength.label')}</span>
                  <span className={`font-semibold ${strengthConfig.text}`}>
                    {t(`resetPassword.strength.${strengthKey}`)}
                  </span>
                </div>
                <div className="h-2 w-full rounded-full bg-muted/70 shadow-inner dark:bg-muted/40">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${strengthConfig.bar}`}
                    style={{ width: strengthWidth }}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/80" htmlFor="passwordConfirmation">
                {t('resetPassword.passwordConfirmLabel')}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
                  <Lock className="h-5 w-5 fill-amber-500 text-amber-500" />
                </span>
                <Input
                  id="passwordConfirmation"
                  type={showPasswordConfirmation ? 'text' : 'password'}
                  minLength={8}
                  autoComplete="new-password"
                  placeholder={t('login.passwordPlaceholder')}
                  value={passwordConfirmation}
                  onChange={(e) => setPasswordConfirmation(e.target.value)}
                  required
                  className="h-[54px] rounded-2xl border border-border/80 bg-background/70 pl-12 pr-16 text-[15px] shadow-[0_16px_40px_-28px_rgba(62,82,152,0.45)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-input/80"
                />
                <button
                  type="button"
                  onClick={() => setShowPasswordConfirmation((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                  aria-pressed={showPasswordConfirmation}
                  aria-label={t('login.togglePasswordAlt')}
                >
                  {showPasswordConfirmation ? t('login.hide') : t('login.show')}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="mt-2 h-[48px] w-full rounded-full shadow-[0_18px_40px_-22px_rgba(62,82,152,0.6)] hover:-translate-y-0.5 hover:shadow-[0_22px_52px_-24px_rgba(62,82,152,0.7)] focus-visible:ring-offset-0"
              disabled={loading}
            >
              {loading ? t('resetPassword.submitting') : t('resetPassword.submit')}
            </Button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-card text-[10px] font-semibold text-foreground shadow-sm">
            {t('login.footerBadge')}
          </div>
          <div className="space-y-0.5 text-center">
            <p>{t('login.sessionCopy')}</p>
          </div>
          <ShieldCheck className="h-4 w-4 text-primary" />
        </div>
        </div>
      </PageContainer>
    </div>
  )
}
