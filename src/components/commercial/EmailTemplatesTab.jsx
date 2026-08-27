import { useCallback, useEffect, useRef, useState } from 'react'
import { Pencil, Plus } from 'lucide-react'
import { Button } from '../ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog'
import { formControlClass, textareaControlClass } from '../ui/form-controls'
import { useToast } from '../ui/use-toast'
import { cn } from '../../lib/utils'
import { createEmailTemplate, listEmailTemplates, updateEmailTemplate } from '../../services/modules/commercialEmails'

const CATEGORY_SUGGESTIONS = ['cold_open', 'follow_up', 'last_call', 'custom']

const VARIABLES = [
  'contact_name', 'first_name', 'company_name', 'email', 'phone', 'whatsapp',
  'website', 'country', 'city', 'segment', 'sender_name', 'unsubscribe_url',
]

const slugify = (value) =>
  value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')

const buildTemplateForm = (t = null) => ({
  id: t?.id ?? '',
  name: t?.name ?? '',
  slug: t?.slug ?? '',
  category: t?.category ?? '',
  subject: t?.subject ?? '',
  body_html: t?.body_html ?? '',
  body_text: t?.body_text ?? '',
  is_active: t?.is_active ?? true,
})

export function EmailTemplatesTab() {
  const { toast } = useToast()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)

  const [formOpen, setFormOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [form, setForm] = useState(() => buildTemplateForm())
  const [slugTouched, setSlugTouched] = useState(false)
  const [saving, setSaving] = useState(false)
  const [activeField, setActiveField] = useState('body_html')

  const subjectRef = useRef(null)
  const bodyHtmlRef = useRef(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const result = await listEmailTemplates()
      setTemplates(result)
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível carregar os templates.', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [toast])

  useEffect(() => { load() }, [load])

  const handleOpenCreate = () => {
    setFormMode('create')
    setForm(buildTemplateForm())
    setSlugTouched(false)
    setFormOpen(true)
  }

  const handleOpenEdit = (template) => {
    setFormMode('edit')
    setForm(buildTemplateForm(template))
    setSlugTouched(true)
    setFormOpen(true)
  }

  const handleNameChange = (value) => {
    setForm((f) => ({
      ...f,
      name: value,
      slug: slugTouched ? f.slug : slugify(value),
    }))
  }

  const insertVariable = (variable) => {
    const field = activeField
    const ref = field === 'subject' ? subjectRef.current : bodyHtmlRef.current
    const token = `{{${variable}}}`
    const value = form[field] ?? ''
    if (!ref) {
      setForm((f) => ({ ...f, [field]: value + token }))
      return
    }
    const start = ref.selectionStart ?? value.length
    const end = ref.selectionEnd ?? value.length
    const next = value.slice(0, start) + token + value.slice(end)
    setForm((f) => ({ ...f, [field]: next }))
    requestAnimationFrame(() => {
      ref.focus()
      const pos = start + token.length
      ref.setSelectionRange(pos, pos)
    })
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.slug.trim() || !form.subject.trim() || !form.body_html.trim()) return
    setSaving(true)
    try {
      const payload = {
        name: form.name.trim(),
        slug: form.slug.trim(),
        subject: form.subject,
        body_html: form.body_html,
        ...(form.category.trim() && { category: form.category.trim() }),
        ...(form.body_text.trim() && { body_text: form.body_text }),
        is_active: form.is_active,
      }
      if (formMode === 'create') {
        await createEmailTemplate(payload)
        toast({ title: 'Template criado' })
      } else {
        await updateEmailTemplate(form.id, payload)
        toast({ title: 'Template atualizado' })
      }
      setFormOpen(false)
      await load()
    } catch (err) {
      toast({ title: 'Erro', description: err?.response?.data?.message ?? 'Falha ao salvar template.', variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  const handleToggleActive = async (template) => {
    try {
      await updateEmailTemplate(template.id, { is_active: !template.is_active })
      await load()
    } catch {
      toast({ title: 'Erro', description: 'Falha ao atualizar template.', variant: 'error' })
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">
          Textos reutilizáveis com variáveis dinâmicas para os passos das sequências.
        </p>
        <Button size="sm" onClick={handleOpenCreate}>
          <Plus className="mr-1.5 h-3.5 w-3.5" />
          Novo template
        </Button>
      </div>

      {loading && <p className="text-center text-sm text-muted-foreground py-10">Carregando...</p>}
      {!loading && templates.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-10">Nenhum template criado ainda.</p>
      )}

      {!loading && templates.length > 0 && (
        <div className="flex flex-col gap-2">
          {templates.map((t) => (
            <div key={t.id} className="flex flex-col gap-1.5 rounded-[14px] border border-border/70 bg-card/80 px-4 py-3 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-[13px] font-semibold">{t.name}</span>
                  {t.category && (
                    <span className="rounded-full bg-muted px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {t.category}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => handleToggleActive(t)}
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide transition',
                      t.is_active ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted text-muted-foreground',
                    )}
                    title="Clique para alternar"
                  >
                    {t.is_active ? 'Ativo' : 'Inativo'}
                  </button>
                </div>
                <Button variant="ghost" size="icon" className="h-7 w-7" title="Editar" onClick={() => handleOpenEdit(t)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground">{t.slug}</p>
              <p className="text-[11px] text-muted-foreground truncate">{t.subject}</p>
            </div>
          ))}
        </div>
      )}

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{formMode === 'create' ? 'Novo template' : 'Editar template'}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Nome *</label>
                <input className={formControlClass} value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="Primeiro contato" />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Slug *</label>
                <input
                  className={formControlClass}
                  value={form.slug}
                  onChange={(e) => { setSlugTouched(true); setForm((f) => ({ ...f, slug: e.target.value })) }}
                  placeholder="primeiro-contato"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Categoria</label>
                <input
                  className={formControlClass}
                  list="template-category-suggestions"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  placeholder="cold_open"
                />
                <datalist id="template-category-suggestions">
                  {CATEGORY_SUGGESTIONS.map((c) => <option key={c} value={c} />)}
                </datalist>
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Assunto *</label>
                <input
                  ref={subjectRef}
                  className={formControlClass}
                  value={form.subject}
                  onFocus={() => setActiveField('subject')}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  placeholder="Olá {{contact_name}}"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Corpo (HTML) *</label>
                <textarea
                  ref={bodyHtmlRef}
                  className={cn(textareaControlClass, 'h-48 font-mono')}
                  value={form.body_html}
                  onFocus={() => setActiveField('body_html')}
                  onChange={(e) => setForm((f) => ({ ...f, body_html: e.target.value }))}
                  placeholder="<p>Olá {{contact_name}}, ...</p>"
                />
              </div>
              <div className="col-span-2 flex flex-col gap-1">
                <label className="text-[11px] font-medium text-muted-foreground">Corpo (texto puro, opcional)</label>
                <textarea
                  className={cn(textareaControlClass, 'h-20')}
                  value={form.body_text}
                  onChange={(e) => setForm((f) => ({ ...f, body_text: e.target.value }))}
                  placeholder="Fallback em texto puro..."
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                Variáveis — clique para inserir no campo em foco ({activeField === 'subject' ? 'Assunto' : 'Corpo HTML'})
              </p>
              <div className="flex flex-wrap gap-1.5">
                {VARIABLES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => insertVariable(v)}
                    className="rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[10px] font-mono text-foreground transition hover:bg-muted"
                  >
                    {`{{${v}}}`}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} />
              Template ativo
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setFormOpen(false)}>Cancelar</Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !form.name.trim() || !form.slug.trim() || !form.subject.trim() || !form.body_html.trim()}
            >
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
