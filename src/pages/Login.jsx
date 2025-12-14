import { useState } from 'react'
import { Lock, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../components/LanguageSwitcher'

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
    <div className="relative flex min-h-screen items-center justify-center bg-[#f4f5fb] px-4 py-10 text-foreground transition-colors dark:bg-[#070d1c]">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-[-10%] top-10 h-48 w-48 rounded-full bg-[#dfe6ff] blur-[120px] dark:bg-primary/10" />
        <div className="absolute right-[-12%] top-1/4 h-56 w-56 rounded-full bg-[#ced9ff] blur-[130px] dark:bg-[#142040]" />
        <div className="absolute bottom-[-15%] left-1/4 h-56 w-56 rounded-full bg-[#e9eeff] blur-[140px] dark:bg-[#0b1330]" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex justify-end">
          <LanguageSwitcher />
        </div>

        <div className="rounded-[28px] border border-border/60 bg-white p-8 shadow-[0_28px_70px_-35px_rgba(15,23,42,0.35)] transition-colors dark:border-border/50 dark:bg-[#0f172a] dark:shadow-[0_30px_80px_-38px_rgba(0,0,0,0.75)]">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#1d2f7a] text-base font-semibold uppercase text-white shadow-inner dark:bg-primary/80">
              {t('login.brand.badge')}
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-[#1c2c66] dark:text-primary/80">
                {t('login.brand.title')}
              </p>
              <p className="text-sm text-[#6f7690] dark:text-foreground/70">{t('login.brand.subtitle')}</p>
            </div>
          </div>

          <div className="mb-6 space-y-2">
            <h1 className="text-[22px] font-semibold leading-tight text-[#152147] dark:text-white">{t('login.title')}</h1>
            <p className="text-sm text-[#6f7690] dark:text-foreground/70">{t('login.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#2f3b59] dark:text-white/90" htmlFor="email">
                {t('login.emailLabel')}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9aa4c0] dark:text-foreground/60">
                  <Mail className="h-5 w-5" />
                </span>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="h-[54px] rounded-2xl border border-[#e2e5f2] bg-[#f5f6fb] pl-12 pr-4 text-[15px] text-[#2f3b59] placeholder:text-[#b0b7c9] shadow-[0_16px_40px_-28px_rgba(21,33,71,0.35)] focus-visible:border-[#c9d4ff] focus-visible:ring-2 focus-visible:ring-[#1d2f7a]/25 focus-visible:ring-offset-0 dark:border-[#1e2745] dark:bg-[#0c1325] dark:text-white dark:placeholder:text-[#667399]"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-semibold text-[#2f3b59] dark:text-white/90" htmlFor="password">
                {t('login.passwordLabel')}
              </Label>
              <div className="relative">
                <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#f4af21]">
                  <Lock className="h-5 w-5 fill-[#f4af21] text-[#f4af21]" />
                </span>
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="h-[54px] rounded-2xl border border-[#e2e5f2] bg-[#f5f6fb] pl-12 pr-16 text-[15px] text-[#2f3b59] placeholder:text-[#b0b7c9] shadow-[0_16px_40px_-28px_rgba(21,33,71,0.35)] focus-visible:border-[#c9d4ff] focus-visible:ring-2 focus-visible:ring-[#1d2f7a]/25 focus-visible:ring-offset-0 dark:border-[#1e2745] dark:bg-[#0c1325] dark:text-white dark:placeholder:text-[#667399]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-[#55608a] transition hover:text-[#1d2f7a] dark:text-foreground/80 dark:hover:text-white"
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
                className="text-xs font-semibold text-[#6f7690] underline-offset-4 transition hover:text-[#1d2f7a] dark:text-foreground/80 dark:hover:text-white"
              >
                {t('login.forgotPassword')}
              </button>
            </div>

            <Button
              type="submit"
              className="mt-2 h-[48px] w-full rounded-full bg-[#1c2c66] text-white shadow-[0_18px_40px_-22px_rgba(28,44,102,0.75)] transition hover:-translate-y-0.5 hover:shadow-[0_22px_50px_-24px_rgba(28,44,102,0.9)] focus-visible:ring-offset-0"
              disabled={loading}
            >
              {loading ? t('login.submitting') : t('login.submit')}
            </Button>
          </form>
        </div>

        <div className="mt-6 flex items-center justify-center gap-3 text-xs text-[#7c85a0] dark:text-foreground/70">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-border/70 bg-white text-[10px] font-semibold text-[#6b7aa6] shadow-sm dark:border-border/50 dark:bg-[#0f172a] dark:text-foreground">
            {t('login.footerBadge')}
          </div>
          <div className="space-y-0.5 text-center">
            <p>{t('login.sessionCopy')}</p>
            <p className="text-[11px] text-[#9aa4c0] dark:text-foreground/60">{t('login.uiCredits')}</p>
          </div>
          <ShieldCheck className="h-4 w-4 text-[#1c2c66] dark:text-primary/80" />
        </div>
      </div>
    </div>
  )
}
