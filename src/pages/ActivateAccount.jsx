import { useState } from 'react'
import { Hash, Lock, Mail, ShieldCheck } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../components/ui/use-toast'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { ThemeToggle } from '../components/ThemeToggle'
import { api } from '../lib/api'
import { PageContainer } from '../components/ui/PageContainer'
import { BrandSignature } from '../components/BrandSignature'

export default function ActivateAccount() {
  const [email, setEmail] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showPasswordConfirmation, setShowPasswordConfirmation] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { toast } = useToast()
  const { t, i18n } = useTranslation()

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')

    if (inviteCode.trim().length !== 8) {
      const codeErrorByLang = {
        'pt-BR': 'Código de ativação deve ter 8 caracteres.',
        es: 'El código de activación debe tener 8 caracteres.',
        en: 'Activation code must have 8 characters.',
      }
      const codeError = codeErrorByLang[i18n.language] || codeErrorByLang.en
      setErrorMessage(codeError)
      toast({
        title: t('activateAccount.error'),
        description: codeError,
        variant: 'error',
      })
      return
    }

    if (password !== passwordConfirmation) {
      const confirmErrorByLang = {
        'pt-BR': 'As senhas não conferem.',
        es: 'Las contraseñas no coinciden.',
        en: 'Passwords do not match.',
      }
      const confirmError = confirmErrorByLang[i18n.language] || confirmErrorByLang.en
      setErrorMessage(confirmError)
      toast({
        title: t('activateAccount.error'),
        description: confirmError,
        variant: 'error',
      })
      return
    }

    setLoading(true)
    try {
      const { data } = await api.post('/v1/invites/accept', {
        email,
        invite_code: inviteCode.trim(),
        password,
        password_confirmation: passwordConfirmation,
      })

      const successMessage = data?.message || t('activateAccount.success')

      toast({
        title: t('activateAccount.success'),
        description: successMessage,
        variant: 'success',
      })

      window.setTimeout(() => {
        window.location.href = '/login'
      }, 600)
    } catch (error) {
      const apiMessage = error?.response?.data?.message
      const fallbackMessage = t('activateAccount.error')
      const message = apiMessage || fallbackMessage
      setErrorMessage(message)
      toast({
        title: t('activateAccount.error'),
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
            <h1 className="text-[22px] font-semibold leading-tight">{t('activateAccount.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('activateAccount.subtitle')}</p>
          </div>

          {errorMessage ? (
            <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              {errorMessage}
            </div>
          ) : null}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/80" htmlFor="email">
                {t('activateAccount.email')}
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
              <Label className="text-xs font-semibold text-foreground/80" htmlFor="inviteCode">
                {t('activateAccount.code')}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
                  <Hash className="h-5 w-5" />
                </span>
                <Input
                  id="inviteCode"
                  type="text"
                  inputMode="text"
                  autoComplete="one-time-code"
                  placeholder="XXXXXXXX"
                  value={inviteCode}
                  onChange={(e) => setInviteCode(e.target.value)}
                  minLength={8}
                  maxLength={8}
                  required
                  className="h-[54px] rounded-2xl border border-border/80 bg-background/70 pl-12 pr-4 text-[15px] uppercase tracking-[0.12em] shadow-[0_16px_40px_-28px_rgba(62,82,152,0.45)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-input/80"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/80" htmlFor="password">
                {t('activateAccount.password')}
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
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/80" htmlFor="passwordConfirmation">
                {t('activateAccount.passwordConfirm')}
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
              {loading ? t('login.submitting') : t('activateAccount.submit')}
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
