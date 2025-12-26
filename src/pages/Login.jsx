import { useState } from 'react'
import { Lock, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { ThemeToggle } from '../components/ThemeToggle'
import { PageContainer } from '../components/ui/PageContainer'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const login = useAuthStore((state) => state.login)
  const loading = useAuthStore((state) => state.loading)
  const { toast } = useToast()
  const { t } = useTranslation()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast({
        title: t('toast.loginSuccess.title'),
        description: t('toast.loginSuccess.description'),
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: t('toast.loginError.title'),
        description: error.message,
        variant: 'error',
      })
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
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-base font-semibold uppercase text-primary-foreground shadow-inner shadow-primary/30">
              {t('login.brand.badge')}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-foreground/70 dark:text-primary/80">
                {t('login.brand.title')}
              </p>
              <p className="text-sm text-muted-foreground">{t('login.brand.subtitle')}</p>
            </div>
          </div>

          <div className="mb-6 space-y-2">
            <h1 className="text-[22px] font-semibold leading-tight">{t('login.title')}</h1>
            <p className="text-sm text-muted-foreground">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/80" htmlFor="email">
                {t('login.emailLabel')}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                  <Mail className="h-5 w-5" />
                </span>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-[54px] rounded-2xl border border-border/80 bg-background/70 pl-12 pr-4 text-[15px] shadow-[0_16px_40px_-28px_rgba(62,82,152,0.45)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:bg-input/80"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-foreground/80" htmlFor="password">
                {t('login.passwordLabel')}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
                  <Lock className="h-5 w-5 fill-amber-500 text-amber-500" />
                </span>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
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

            <div className="flex items-center justify-end">
              <button
                type="button"
                className="text-xs font-semibold text-muted-foreground underline-offset-4 transition hover:text-foreground"
              >
                {t('login.forgotPassword')}
              </button>
            </div>

            <Button
              type="submit"
              className="mt-2 h-[48px] w-full rounded-full shadow-[0_18px_40px_-22px_rgba(62,82,152,0.6)] hover:-translate-y-0.5 hover:shadow-[0_22px_52px_-24px_rgba(62,82,152,0.7)] focus-visible:ring-offset-0"
              disabled={loading}
            >
              {loading ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-card text-[10px] font-semibold text-foreground shadow-sm">
            {t('login.footerBadge')}
          </div>
          <div className="space-y-0.5 text-center">
            <p>{t('login.sessionCopy')}</p>
            <p className="text-[11px] text-muted-foreground">{t('login.uiCredits')}</p>
          </div>
          <ShieldCheck className="h-4 w-4 text-primary" />
        </div>
        </div>
      </PageContainer>
    </div>
  )
}
