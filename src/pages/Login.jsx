import { useState } from 'react'
import { Check, LogIn, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { ThemeToggle } from '../components/ThemeToggle'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'
import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../components/LanguageSwitcher'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useAuthStore((state) => state.login)
  const loading = useAuthStore((state) => state.loading)
  const { toast } = useToast()
  const { t } = useTranslation()

  const features = t('login.features', { returnObjects: true })

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
    <div className="container flex min-h-screen flex-col items-center justify-center py-10">
      <div className="mb-6 flex w-full items-center justify-between">
        <div className="flex items-center gap-2 text-muted-foreground">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-primary">{t('common.brand')}</p>
            <p className="text-sm text-muted-foreground">{t('common.brandSubtitle')}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </div>

      <div className="grid w-full max-w-5xl gap-6 rounded-[22px] border border-border/70 bg-card/70 p-8 shadow-[0_30px_80px_-50px_rgba(16,185,129,0.6)] backdrop-blur-lg md:grid-cols-[1.3fr,1fr]">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <ShieldCheck className="h-4 w-4" />
            {t('common.connectedBadge')}
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">{t('login.heroTitle')}</h1>
          <p className="text-base text-muted-foreground">{t('login.heroDescription')}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {features.map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                  <Check className="h-4 w-4" />
                </span>
                {item}
              </div>
            ))}
          </div>
        </div>

        <Card className="bg-background/80">
          <CardHeader className="space-y-2">
            <CardTitle className="flex items-center gap-2 text-2xl font-bold">
              <LogIn className="h-5 w-5 text-primary" />
              {t('login.cardTitle')}
            </CardTitle>
            <p className="text-sm text-muted-foreground">{t('login.cardDescription')}</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('login.emailLabel')}</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder={t('login.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">{t('login.passwordLabel')}</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder={t('login.passwordPlaceholder')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('login.submitting') : t('login.submit')}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
