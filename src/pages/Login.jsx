import { useState } from 'react'
import { LogIn, ShieldCheck, Sparkles } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card'
import { ThemeToggle } from '../components/ThemeToggle'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const login = useAuthStore((state) => state.login)
  const loading = useAuthStore((state) => state.loading)
  const { toast } = useToast()

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      await login(email, password)
      toast({
        title: 'Bem-vindo!',
        description: 'Autenticação realizada com sucesso.',
        variant: 'success',
      })
    } catch (error) {
      toast({
        title: 'Erro ao autenticar',
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
            <p className="text-xs uppercase tracking-[0.2em] text-primary">Ponto SaaS</p>
            <p className="text-sm text-muted-foreground">
              Jornada segura e alinhada com a CLT
            </p>
          </div>
        </div>
        <ThemeToggle />
      </div>

      <div className="grid w-full max-w-5xl gap-6 rounded-[28px] border border-border/70 bg-card/70 p-8 shadow-[0_30px_80px_-50px_rgba(16,185,129,0.6)] backdrop-blur-lg md:grid-cols-[1.3fr,1fr]">
        <div className="space-y-6">
          <p className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
            <ShieldCheck className="h-4 w-4" />
            Conectado ao backend
          </p>
          <h1 className="text-3xl font-bold leading-tight sm:text-4xl">
            Controle de ponto moderno com foco no colaborador
          </h1>
          <p className="text-base text-muted-foreground">
            Faça login para registrar batidas, solicitar ajustes e acompanhar seu histórico com uma
            interface rápida e responsiva.
          </p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[
              'Registro de entrada e saída',
              'Ajustes com justificativa',
              'Histórico de batidas',
              'Modo claro e escuro',
            ].map((item) => (
              <div
                key={item}
                className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/60 px-3 py-2 text-sm text-muted-foreground"
              >
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-primary/15 text-primary">
                  ✓
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
              Acessar conta
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Use seu e-mail corporativo e senha para autenticar. O token retornado será usado para
              acessar as rotas protegidas.
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="seu.email@empresa.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? 'Autenticando...' : 'Entrar e acessar dashboard'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
