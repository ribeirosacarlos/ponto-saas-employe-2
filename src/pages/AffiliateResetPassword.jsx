import { useState } from 'react'
import { ArrowLeft, Hash, Lock, Mail, ShieldCheck } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { useToast } from '../components/ui/use-toast'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { ThemeToggle } from '../components/ThemeToggle'
import { PageContainer } from '../components/ui/PageContainer'
import { BrandSignature } from '../components/BrandSignature'
import { affiliateResetPassword } from '../services/modules/affiliateAuth'
import { normalizeApiError } from '../lib/security/httpErrors'
import { runWithRequestLock } from '../lib/security/requestLock'

export default function AffiliateResetPassword() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirmation, setPasswordConfirmation] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const { toast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (loading || success) return

    setErrorMessage('')

    if (password !== passwordConfirmation) {
      setErrorMessage('As senhas não conferem.')
      return
    }

    if (password.length < 8) {
      setErrorMessage('A senha deve ter no mínimo 8 caracteres.')
      return
    }

    setLoading(true)
    try {
      await runWithRequestLock('affiliate:reset-password', () =>
        affiliateResetPassword({
          email: email.trim(),
          code: code.trim(),
          password,
          password_confirmation: passwordConfirmation,
        }),
      )

      setSuccess(true)
      toast({ title: 'Senha redefinida!', description: 'Faça login com sua nova senha.', variant: 'success' })

      setTimeout(() => {
        window.location.href = `/affiliate/login${email ? `?email=${encodeURIComponent(email.trim())}` : ''}`
      }, 1800)
    } catch (error) {
      const normalized = normalizeApiError(error, {
        fallbackMessage: 'Não foi possível redefinir a senha. Verifique os dados e tente novamente.',
        rateLimitMessage: 'Muitas tentativas em pouco tempo. Aguarde antes de tentar novamente.',
      })
      setErrorMessage(normalized.message)
      toast({ title: 'Erro', description: normalized.message, variant: 'error' })
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

            <div className="mb-6 space-y-1.5">
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-primary">
                Painel do Afiliado
              </span>
              <h1 className="text-[22px] font-semibold leading-tight">Redefinir senha</h1>
              <p className="text-sm text-muted-foreground">
                Insira o código recebido por e-mail e defina sua nova senha.
              </p>
            </div>

            {success && (
              <div className="mb-4 rounded-2xl border border-emerald-300/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400">
                Senha redefinida! Redirecionando para o login...
              </div>
            )}

            {errorMessage && !success && (
              <div className="mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {errorMessage}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80" htmlFor="email">
                  E-mail
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Mail className="h-5 w-5" />
                  </span>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-[54px] rounded-2xl border border-border/80 bg-background/70 pl-12 pr-4 text-[15px] shadow-[0_16px_40px_-28px_rgba(62,82,152,0.45)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-input/80"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80" htmlFor="code">
                  Código de verificação
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-amber-500">
                    <Hash className="h-5 w-5" />
                  </span>
                  <Input
                    id="code"
                    type="text"
                    autoComplete="one-time-code"
                    placeholder="Código recebido por e-mail"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    required
                    className="h-[54px] rounded-2xl border border-border/80 bg-background/70 pl-12 pr-4 text-[15px] shadow-[0_16px_40px_-28px_rgba(62,82,152,0.45)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-input/80"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80" htmlFor="password">
                  Nova senha
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock className="h-5 w-5" />
                  </span>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Mínimo 8 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="h-[54px] rounded-2xl border border-border/80 bg-background/70 pl-12 pr-16 text-[15px] shadow-[0_16px_40px_-28px_rgba(62,82,152,0.45)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-input/80"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                  >
                    {showPassword ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold text-foreground/80" htmlFor="passwordConfirm">
                  Confirmar nova senha
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                    <Lock className="h-5 w-5" />
                  </span>
                  <Input
                    id="passwordConfirm"
                    type={showConfirm ? 'text' : 'password'}
                    minLength={8}
                    autoComplete="new-password"
                    placeholder="Repita a senha"
                    value={passwordConfirmation}
                    onChange={(e) => setPasswordConfirmation(e.target.value)}
                    required
                    className="h-[54px] rounded-2xl border border-border/80 bg-background/70 pl-12 pr-16 text-[15px] shadow-[0_16px_40px_-28px_rgba(62,82,152,0.45)] placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 dark:bg-input/80"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-semibold text-muted-foreground transition hover:text-foreground"
                  >
                    {showConfirm ? 'Ocultar' : 'Mostrar'}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                className="mt-2 h-[48px] w-full rounded-full shadow-[0_18px_40px_-22px_rgba(62,82,152,0.6)] hover:-translate-y-0.5"
                disabled={loading || success}
              >
                {loading ? 'Redefinindo...' : 'Redefinir senha'}
              </Button>
            </form>

            <div className="mt-5 flex justify-center">
              <a
                href="/affiliate/login"
                className="inline-flex items-center gap-1.5 text-[12px] font-medium text-muted-foreground transition hover:text-foreground"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                Voltar ao login
              </a>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-center gap-3 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-primary" />
            <p>Acesso exclusivo para afiliados</p>
          </div>
        </div>
      </PageContainer>
    </div>
  )
}
