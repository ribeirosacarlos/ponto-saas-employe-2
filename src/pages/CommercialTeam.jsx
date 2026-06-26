import { useCallback, useEffect, useMemo, useState } from 'react'
import { Search, Shield, Users2, X } from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { formControlClass } from '../components/ui/form-controls'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { cn } from '../lib/utils'
import { listAllEmployees, updateEmployee } from '../services/modules/employees'

const ACCESS_REQUIRES = { anyOf: ['super_admin'] }

const COMMERCIAL_ROLES = ['commercial_manager', 'commercial_agent']

const ROLE_LABELS = {
  commercial_manager: 'Gerente Comercial',
  commercial_agent: 'Agente Comercial',
  employee: 'Funcionário',
  area_manager: 'Gestor de Área',
  manager: 'Gerente',
  admin: 'Admin',
  super_admin: 'Super Admin',
}

const ROLE_BADGE = {
  commercial_manager: 'bg-violet-500/15 text-violet-600',
  commercial_agent: 'bg-sky-500/15 text-sky-600',
  employee: 'bg-muted text-muted-foreground',
  area_manager: 'bg-amber-500/15 text-amber-600',
  manager: 'bg-blue-500/15 text-blue-600',
  admin: 'bg-primary/15 text-primary',
  super_admin: 'bg-emerald-500/15 text-emerald-600',
}

export default function CommercialTeam() {
  const { toast } = useToast()
  const roles = useAuthStore((s) => s.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, ACCESS_REQUIRES), [capabilities])

  const [allEmployees, setAllEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Dialog de atribuição
  const [assignTarget, setAssignTarget] = useState(null)
  const [assignRole, setAssignRole] = useState('commercial_agent')
  const [assigning, setAssigning] = useState(false)

  // Dialog de remoção
  const [removeTarget, setRemoveTarget] = useState(null)
  const [removing, setRemoving] = useState(false)

  const load = useCallback(async () => {
    if (!hasAccess) return
    setLoading(true)
    try {
      const raw = await listAllEmployees({ perPage: 200 })
      const data = (Array.isArray(raw) ? raw : []).map((emp) => ({
        ...emp,
        role: typeof emp.role === 'object' && emp.role !== null
          ? (emp.role.name ?? emp.role.id ?? emp.role.display_name)
          : emp.role,
      }))
      setAllEmployees(data)
    } catch (err) {
      console.error('[CommercialTeam]', err)
      toast({ title: 'Erro', description: 'Não foi possível carregar os funcionários.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [hasAccess, toast])

  useEffect(() => { load() }, [load])

  // Membros atuais do comercial
  const commercialMembers = useMemo(
    () => allEmployees.filter((e) => COMMERCIAL_ROLES.includes(e.role)),
    [allEmployees],
  )

  // Outros usuários (candidatos para adicionar)
  const otherEmployees = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allEmployees
      .filter((e) => !COMMERCIAL_ROLES.includes(e.role))
      .filter((e) => {
        if (!q) return true
        return (
          (e.name ?? '').toLowerCase().includes(q) ||
          (e.email ?? '').toLowerCase().includes(q)
        )
      })
  }, [allEmployees, search])

  const handleAssign = async () => {
    if (!assignTarget) return
    setAssigning(true)
    try {
      await updateEmployee(assignTarget.id, { role: assignRole })
      toast({
        title: 'Role atribuída',
        description: `${assignTarget.name} agora é ${ROLE_LABELS[assignRole]}.`,
      })
      setAssignTarget(null)
      await load()
    } catch (err) {
      toast({
        title: 'Erro',
        description: err?.response?.data?.message ?? 'Falha ao atribuir role.',
        variant: 'error',
      })
    } finally {
      setAssigning(false)
    }
  }

  const handleRemove = async () => {
    if (!removeTarget) return
    setRemoving(true)
    try {
      await updateEmployee(removeTarget.id, { role: 'employee' })
      toast({
        title: 'Acesso removido',
        description: `${removeTarget.name} voltou para a role Funcionário.`,
      })
      setRemoveTarget(null)
      await load()
    } catch (err) {
      toast({
        title: 'Erro',
        description: err?.response?.data?.message ?? 'Falha ao remover acesso.',
        variant: 'error',
      })
    } finally {
      setRemoving(false)
    }
  }

  if (!hasAccess) {
    return (
      <PageContainer>
        <p className="mt-10 text-center text-sm text-muted-foreground">Acesso negado.</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-6">
        <AppTopBar
          icon={<Users2 className="h-3.5 w-3.5" />}
          eyebrow="Comercial"
          title="Equipe Comercial"
          subtitle="Gerencie quem tem acesso ao módulo comercial"
        />

        {/* Membros atuais */}
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
            <Shield className="h-3.5 w-3.5" />
            Membros com acesso comercial
            <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium">
              {commercialMembers.length}
            </span>
          </h2>

          {loading && (
            <p className="text-center text-sm text-muted-foreground py-6">Carregando...</p>
          )}

          {!loading && commercialMembers.length === 0 && (
            <div className="rounded-[14px] border border-border/60 bg-muted/30 px-4 py-5 text-center text-[12px] text-muted-foreground">
              Nenhum usuário com role comercial ainda. Adicione alguém abaixo.
            </div>
          )}

          {!loading && commercialMembers.length > 0 && (
            <div className="flex flex-col gap-2">
              {commercialMembers.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 rounded-[14px] border border-border/70 bg-card/80 px-4 py-3 backdrop-blur-xl"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-[12px] font-bold text-primary">
                    {(emp.name ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold">{emp.name}</p>
                    <p className="text-[11px] text-muted-foreground">{emp.email}</p>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-semibold', ROLE_BADGE[emp.role] ?? 'bg-muted text-muted-foreground')}>
                    {ROLE_LABELS[emp.role] ?? emp.role}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    title="Remover acesso comercial"
                    onClick={() => setRemoveTarget(emp)}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Adicionar novo membro */}
        <section>
          <h2 className="mb-2 flex items-center gap-1.5 text-[12px] font-semibold text-muted-foreground uppercase tracking-wide">
            Adicionar funcionário ao comercial
          </h2>

          <div className="relative mb-3">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <input
              className={cn(formControlClass, 'pl-8 w-full max-w-sm')}
              placeholder="Buscar por nome ou e-mail..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {!loading && otherEmployees.length === 0 && (
            <p className="text-[12px] text-muted-foreground">
              {search ? 'Nenhum resultado para a busca.' : 'Todos os funcionários já têm acesso comercial.'}
            </p>
          )}

          {!loading && otherEmployees.length > 0 && (
            <div className="flex flex-col gap-2">
              {otherEmployees.map((emp) => (
                <div
                  key={emp.id}
                  className="flex items-center gap-3 rounded-[14px] border border-border/60 bg-card/60 px-4 py-3 backdrop-blur-xl"
                >
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-[12px] font-bold text-muted-foreground">
                    {(emp.name ?? '?')[0].toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold">{emp.name}</p>
                    <p className="text-[11px] text-muted-foreground">{emp.email}</p>
                  </div>
                  <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', ROLE_BADGE[emp.role] ?? 'bg-muted text-muted-foreground')}>
                    {ROLE_LABELS[emp.role] ?? emp.role}
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => { setAssignTarget(emp); setAssignRole('commercial_agent') }}
                  >
                    Atribuir role
                  </Button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Dialog — atribuir role */}
      <Dialog open={!!assignTarget} onOpenChange={() => setAssignTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Atribuir role comercial — {assignTarget?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <p className="text-[12px] text-muted-foreground">
              Selecione qual role este usuário terá no módulo comercial. A role anterior (
              <strong>{ROLE_LABELS[assignTarget?.role] ?? assignTarget?.role}</strong>) será substituída.
            </p>
            <div className="flex flex-col gap-1">
              <label className="text-[11px] font-medium text-muted-foreground">Role</label>
              <select
                className={formControlClass}
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value)}
              >
                <option value="commercial_agent">Agente Comercial — vê apenas os próprios leads</option>
                <option value="commercial_manager">Gerente Comercial — acesso completo ao módulo</option>
              </select>
            </div>
            <div className="rounded-xl border border-amber-300/40 bg-amber-500/10 px-3 py-2 text-[11px] text-amber-700">
              ⚠️ Isso substitui a role atual do usuário. Se ele for um gerente de área ou admin, perderá esse acesso.
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setAssignTarget(null)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleAssign} disabled={assigning}>
              {assigning ? 'Atribuindo...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog — remover acesso */}
      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remover acesso comercial — {removeTarget?.name}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            <strong>{removeTarget?.name}</strong> voltará para a role{' '}
            <strong>Funcionário</strong> e perderá o acesso ao módulo comercial.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setRemoveTarget(null)}>
              Cancelar
            </Button>
            <Button variant="destructive" size="sm" onClick={handleRemove} disabled={removing}>
              {removing ? 'Removendo...' : 'Remover acesso'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
