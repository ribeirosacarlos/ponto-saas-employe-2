import { useCallback, useEffect, useMemo, useState } from 'react'
import { Bell, RefreshCcw, Send } from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Textarea } from '../components/ui/textarea'
import { AppTopBar } from '../components/ui/AppTopBar'
import { useToast } from '../components/ui/use-toast'
import { normalizeAnnouncement } from '../services/announcementsService'
import {
  createAdminAnnouncement,
  listAdminAnnouncements,
} from '../services/announcementsService'
import { cn } from '../lib/utils'

const TYPE_OPTIONS = [
  { value: 'general', label: 'Geral' },
  { value: 'holiday', label: 'Feriado' },
  { value: 'vacation', label: 'Férias' },
  { value: 'tip', label: 'Dica' },
]

const defaultForm = {
  title: '',
  summary: '',
  body: '',
  type: 'general',
  sent_at: '',
}

export default function AdminAnnouncements({ sidebarOpen = false, onToggleSidebar = () => {} }) {
  const { toast } = useToast()
  const [form, setForm] = useState(defaultForm)
  const [submitting, setSubmitting] = useState(false)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState('')
  const [announcements, setAnnouncements] = useState([])

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const loadAnnouncements = useCallback(async () => {
    setListLoading(true)
    setListError('')
    try {
      const { data } = await listAdminAnnouncements({ page: 1, perPage: 20 })
      setAnnouncements(data || [])
    } catch (error) {
      console.error('[AdminAnnouncements] list error', error)
      setListError('Não foi possível carregar os comunicados.')
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAnnouncements()
  }, [loadAnnouncements])

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (!form.title) {
      toast({ title: 'Informe o título', description: 'O título é obrigatório.' })
      return
    }
    setSubmitting(true)
    try {
      const payload = {
        title: form.title,
        summary: form.summary || null,
        body: form.body || null,
        type: form.type || null,
      }
      if (form.sent_at) {
        const date = new Date(form.sent_at)
        payload.sent_at = Number.isNaN(date.getTime()) ? form.sent_at : date.toISOString()
      }
      const created = await createAdminAnnouncement(payload)
      toast({ title: 'Comunicado criado', description: 'Novo comunicado cadastrado com sucesso.' })
      setForm(defaultForm)
      setAnnouncements((prev) => [normalizeAnnouncement(created, 0), ...prev])
    } catch (error) {
      console.error('[AdminAnnouncements] create error', error)
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível criar o comunicado. Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSubmitting(false)
    }
  }

  const listContent = useMemo(() => {
    if (listLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={`admin-announcement-skel-${index}`}
              className="animate-pulse rounded-2xl border border-border/70 bg-card/80 px-4 py-4"
            >
              <div className="h-3 w-1/2 rounded-full bg-muted/80" />
              <div className="mt-2 h-3 w-full rounded-full bg-muted/60" />
              <div className="mt-2 h-3 w-2/3 rounded-full bg-muted/50" />
            </div>
          ))}
        </div>
      )
    }
    if (listError) {
      return (
        <div className="rounded-2xl border border-rose-200/70 bg-rose-50/70 px-4 py-4 text-sm text-rose-700">
          {listError}
          <div className="mt-3">
            <Button size="sm" variant="outline" onClick={loadAnnouncements}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Tentar novamente
            </Button>
          </div>
        </div>
      )
    }
    if (!announcements.length) {
      return (
        <div className="rounded-2xl border border-border/70 bg-card/90 px-4 py-5 text-sm text-muted-foreground">
          Nenhum comunicado cadastrado ainda.
        </div>
      )
    }
    return (
      <div className="space-y-3">
        {announcements.map((announcement, index) => {
          const tone =
            announcement.status === 'seen'
              ? 'border-emerald-200/80 bg-emerald-500/10 text-emerald-700'
              : 'border-amber-200/80 bg-amber-500/10 text-amber-700'
          return (
            <div
              key={announcement.id || `announcement-${index}`}
              className="rounded-2xl border border-border/70 bg-card/90 px-4 py-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="space-y-1">
                  <p className="text-sm font-semibold">{announcement.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {announcement.summary || announcement.body}
                  </p>
                  <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                    <span>{announcement.type || 'general'}</span>
                    {announcement.sentAt ? (
                      <>
                        <span className="text-muted-foreground/50">•</span>
                        <span>Enviado: {announcement.sentAt}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                <span
                  className={cn(
                    'rounded-full border px-3 py-1 text-[11px] font-semibold shadow-sm',
                    tone,
                  )}
                >
                  {announcement.status === 'seen' ? 'Lido' : 'Pendente'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    )
  }, [announcements, listError, listLoading, loadAnnouncements])

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-foreground">
      <div className="relative z-10 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1200px] flex-col gap-6">
          <AppTopBar
            icon={
              <button
                type="button"
                aria-label="Alternar menu"
                onClick={onToggleSidebar}
                className="flex h-full w-full items-center justify-center"
              >
                <Bell className="h-5 w-5" />
              </button>
            }
            eyebrow="Administração"
            title="Comunicados"
            subtitle="Crie e acompanhe comunicados enviados aos colaboradores."
            actions={
              <Button type="button" variant="outline" onClick={loadAnnouncements} className="border-border bg-background/80">
                <RefreshCcw className="mr-2 h-4 w-4 text-primary" />
                Atualizar lista
              </Button>
            }
          />

          <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-[24px] border border-border/80 bg-card/90 p-5 shadow-[0_25px_80px_-60px_rgba(62,82,152,0.55)]">
              <h2 className="text-lg font-semibold">Novo comunicado</h2>
              <p className="text-sm text-muted-foreground">
                Defina o conteúdo e tipo do comunicado. O título é obrigatório.
              </p>
              <form className="mt-4 space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Título*</label>
                  <Input
                    value={form.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    placeholder="Ex: Atualização de políticas"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Resumo</label>
                  <Input
                    value={form.summary}
                    onChange={(e) => handleChange('summary', e.target.value)}
                    placeholder="Opcional"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold">Conteúdo</label>
                  <Textarea
                    value={form.body}
                    onChange={(e) => handleChange('body', e.target.value)}
                    placeholder="Texto do comunicado"
                    rows={5}
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Tipo</label>
                    <Select
                      value={form.type}
                      onChange={(e) => handleChange('type', e.target.value)}
                    >
                      {TYPE_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Enviar em</label>
                    <Input
                      type="datetime-local"
                      value={form.sent_at}
                      onChange={(e) => handleChange('sent_at', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex justify-end">
                  <Button type="submit" disabled={submitting}>
                    <Send className="mr-2 h-4 w-4" />
                    {submitting ? 'Salvando...' : 'Criar comunicado'}
                  </Button>
                </div>
              </form>
            </section>

            <section className="rounded-[24px] border border-border/80 bg-card/90 p-5 shadow-[0_25px_80px_-60px_rgba(62,82,152,0.55)]">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold">Comunicados recentes</h2>
                <span className="text-[11px] font-semibold text-muted-foreground">
                  {announcements.length} itens
                </span>
              </div>
              <div className="mt-4">{listContent}</div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

