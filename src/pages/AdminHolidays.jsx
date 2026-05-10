import { useEffect, useMemo, useState } from 'react'
import { CalendarDays, Plus, RefreshCcw, Search, Trash2, Pencil } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { actionIconButtonClass } from '../components/ui/form-controls'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { cn } from '../lib/utils'
import { useToast } from '../components/ui/use-toast'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { useAuthStore } from '../store/useAuth'
import { createHoliday, deleteHoliday, listHolidays, updateHoliday } from '../services/adminHolidaysService'

const SCOPE_OPTIONS = [
  { value: 'all', labelKey: 'holidaysPage.scopes.all' },
  { value: 'national', labelKey: 'holidaysPage.scopes.national' },
  { value: 'regional', labelKey: 'holidaysPage.scopes.regional' },
  { value: 'local', labelKey: 'holidaysPage.scopes.local' },
  { value: 'company', labelKey: 'holidaysPage.scopes.company' },
]

const SCOPE_TONES = {
  national: 'border-blue-200/70 bg-blue-500/10 text-blue-700',
  regional: 'border-violet-200/70 bg-violet-500/10 text-violet-700',
  local: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
  company: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
}

const ALLOWED_ROLES = { anyOf: ['manager', 'area_manager', 'admin', 'super_admin'] }
const skeletonRows = Array.from({ length: 6 }).map((_, i) => i)

const EMPTY_FORM = { date: '', name: '', scope: 'national' }

const formatDate = (value, locale = 'pt-BR') => {
  if (!value) return '-'
  const [year, month, day] = String(value).slice(0, 10).split('-').map(Number)
  const date = new Date(year, month - 1, day)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
}

function ScopeBadge({ scope, label }) {
  const tone = SCOPE_TONES[scope] || 'border-border/60 text-foreground'
  return (
    <span
      className={cn(
        'inline-flex w-fit items-center rounded-full border px-3 py-1 text-[11px] font-semibold whitespace-nowrap',
        tone,
      )}
    >
      {label}
    </span>
  )
}

export default function AdminHolidays() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, ALLOWED_ROLES), [capabilities])

  const [holidays, setHolidays] = useState([])
  const [meta, setMeta] = useState({ currentPage: 1, total: 0, perPage: 50, lastPage: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ search: '', scope: 'all', start: '', end: '' })

  const [formOpen, setFormOpen] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const getScopeLabel = (scope) => {
    const labelKey = SCOPE_OPTIONS.find((option) => option.value === scope)?.labelKey
    return labelKey ? t(labelKey) : scope
  }

  const fetchHolidays = async (overrides = {}) => {
    if (!hasAccess) return
    setLoading(true)
    setError('')
    const params = {
      scope: overrides.scope ?? filters.scope,
      start: overrides.start ?? filters.start,
      end: overrides.end ?? filters.end,
    }
    try {
      const { data, meta: responseMeta } = await listHolidays(params)
      const search = (overrides.search ?? filters.search).toLowerCase().trim()
      const filtered = search ? data.filter((h) => h.name.toLowerCase().includes(search)) : data
      setHolidays(filtered)
      setMeta({
        currentPage: responseMeta.currentPage ?? 1,
        perPage: responseMeta.perPage ?? 50,
        total: filtered.length,
        lastPage: responseMeta.lastPage ?? 1,
      })
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || t('holidaysPage.states.loadError')
      setError(message)
      toast({ title: t('holidaysPage.toasts.loadErrorTitle'), description: message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchHolidays()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.scope, filters.start, filters.end])

  const handleSearchChange = (e) => {
    const value = e.target.value
    setFilters((prev) => ({ ...prev, search: value }))
    const search = value.toLowerCase().trim()
    setHolidays((prev) =>
      search
        ? prev.filter((h) => h.name.toLowerCase().includes(search))
        : prev,
    )
    if (!value) fetchHolidays({ search: '' })
  }

  const openCreate = () => {
    setEditTarget(null)
    setForm(EMPTY_FORM)
    setFormOpen(true)
  }

  const openEdit = (holiday) => {
    setEditTarget(holiday)
    setForm({ date: holiday.date, name: holiday.name, scope: holiday.scope })
    setFormOpen(true)
  }

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setSaving(true)
    try {
      if (editTarget) {
        await updateHoliday(editTarget.id, form)
        toast({ title: t('holidaysPage.toasts.updateSuccess') })
      } else {
        await createHoliday(form)
        toast({ title: t('holidaysPage.toasts.createSuccess') })
      }
      setFormOpen(false)
      setEditTarget(null)
      setForm(EMPTY_FORM)
      fetchHolidays()
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || t('holidaysPage.toasts.saveError')
      toast({ title: t('holidaysPage.toasts.saveErrorTitle'), description: message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteHoliday(deleteTarget.id)
      toast({ title: t('holidaysPage.toasts.deleteSuccess') })
      setDeleteTarget(null)
      fetchHolidays()
    } catch (err) {
      const message = err?.response?.data?.message || err?.message || t('holidaysPage.toasts.deleteError')
      toast({ title: t('holidaysPage.toasts.deleteErrorTitle'), description: message, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  if (!hasAccess) {
    return (
      <PageContainer className="py-10">
        <div className="rounded-2xl border border-border/70 bg-card/90 p-6 text-center text-sm text-muted-foreground">
          {t('holidaysPage.states.noPermission')}
        </div>
      </PageContainer>
    )
  }

  const emptyState = !loading && holidays.length === 0

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-foreground">
      <PageContainer className="relative z-10 flex flex-col gap-5 py-6">
        <AppTopBar
          icon={<CalendarDays className="h-5 w-5" />}
          eyebrow={t('holidaysPage.tag')}
          title={t('holidaysPage.title')}
          subtitle={t('holidaysPage.subtitle')}
          filters={
            error ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/80 px-3 py-1 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
                {error}
              </div>
            ) : null
          }
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchHolidays()}
                className="rounded-full border-border bg-background/80 px-3 text-sm"
              >
                <RefreshCcw className="h-4 w-4 text-primary" />
                {t('holidaysPage.actions.refresh')}
              </Button>
              <Button type="button" onClick={openCreate}>
                <Plus className="h-4 w-4" />
                {t('holidaysPage.actions.create')}
              </Button>
            </>
          }
        />

        <section className="grid gap-4 overflow-hidden rounded-[28px] border border-border/80 bg-card/90 p-5 shadow-[0_18px_90px_-60px_rgba(62,82,152,0.55)]">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t('holidaysPage.filters.searchPlaceholder')}
                value={filters.search}
                onChange={handleSearchChange}
              />
            </div>
            <Select
              value={filters.scope}
              onChange={(e) => setFilters((prev) => ({ ...prev, scope: e.target.value }))}
            >
              {SCOPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </Select>
            <Input
              type="date"
              value={filters.start}
              onChange={(e) => setFilters((prev) => ({ ...prev, start: e.target.value }))}
              placeholder={t('holidaysPage.filters.startDate')}
              title={t('holidaysPage.filters.startDate')}
            />
            <Input
              type="date"
              value={filters.end}
              onChange={(e) => setFilters((prev) => ({ ...prev, end: e.target.value }))}
              placeholder={t('holidaysPage.filters.endDate')}
              title={t('holidaysPage.filters.endDate')}
            />
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {meta?.total ? <span>{t('holidaysPage.listCount', { count: meta.total })}</span> : null}
          </div>

          {/* Desktop table */}
          <div className="hidden md:block overflow-hidden rounded-[24px] border border-border/70 bg-card/95 shadow-[0_30px_90px_-60px_rgba(62,82,152,0.55)]">
            <div className="w-full overflow-x-auto">
              <div className="min-w-[780px]">
                <div className="grid grid-cols-[72px_160px_minmax(260px,1.8fr)_160px_104px] gap-4 rounded-t-3xl border-b border-border/70 bg-background/80 px-5 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <span className="text-center">#</span>
                  <span className="text-center">{t('holidaysPage.table.date')}</span>
                  <span className="text-center">{t('holidaysPage.table.name')}</span>
                  <span className="text-center">{t('holidaysPage.table.scope')}</span>
                  <span className="text-center">{t('holidaysPage.table.actions')}</span>
                </div>
                <div className="divide-y divide-border/60">
                  {loading
                    ? skeletonRows.map((key) => (
                        <div key={key} className="grid grid-cols-[72px_160px_minmax(260px,1.8fr)_160px_104px] gap-4 px-5 py-4">
                          {[0, 1, 2, 3, 4].map((i) => (
                            <div key={i} className="h-4 animate-pulse rounded bg-muted/50" />
                          ))}
                        </div>
                      ))
                    : null}

                  {!loading && emptyState ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {t('holidaysPage.states.empty')}
                    </div>
                  ) : null}

                  {!loading &&
                    holidays.map((holiday, index) => (
                      <div
                        key={holiday.id}
                        className="grid grid-cols-[72px_160px_minmax(260px,1.8fr)_160px_104px] items-center gap-4 px-5 py-4 text-sm"
                      >
                        <span className="text-center font-medium tabular-nums text-muted-foreground">
                          {(Math.max((meta?.currentPage ?? 1) - 1, 0) * (meta?.perPage ?? holidays.length ?? 1)) + index + 1}
                        </span>
                        <span className="text-center font-medium tabular-nums">
                          {formatDate(holiday.date, i18n.language)}
                        </span>
                        <span className="min-w-0 truncate text-center font-semibold">{holiday.name}</span>
                        <div className="flex justify-center">
                          <ScopeBadge scope={holiday.scope} label={getScopeLabel(holiday.scope)} />
                        </div>
                        <div className="flex justify-center gap-2">
                          <button
                            type="button"
                            className={actionIconButtonClass}
                            title={t('holidaysPage.actions.edit')}
                            onClick={() => openEdit(holiday)}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className={actionIconButtonClass}
                            title={t('holidaysPage.actions.delete')}
                            onClick={() => setDeleteTarget(holiday)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Mobile cards */}
          <div className="md:hidden space-y-3">
            {loading
              ? skeletonRows.map((key) => (
                  <div key={key} className="h-20 animate-pulse rounded-2xl border border-border/70 bg-muted/40" />
                ))
              : null}
            {!loading && emptyState ? (
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                {t('holidaysPage.states.empty')}
              </div>
            ) : null}
            {!loading &&
              holidays.map((holiday) => (
                <div key={holiday.id} className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{holiday.name}</p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatDate(holiday.date, i18n.language)}
                      </p>
                    </div>
                    <ScopeBadge scope={holiday.scope} label={getScopeLabel(holiday.scope)} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button type="button" size="sm" variant="outline" onClick={() => openEdit(holiday)}>
                      <Pencil className="h-4 w-4" />
                      {t('holidaysPage.actions.edit')}
                    </Button>
                    <Button type="button" size="sm" variant="outline" onClick={() => setDeleteTarget(holiday)}>
                      <Trash2 className="h-4 w-4" />
                      {t('holidaysPage.actions.delete')}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </section>
      </PageContainer>

      {/* Create / Edit dialog */}
      <Dialog open={formOpen} onOpenChange={(open) => { setFormOpen(open); if (!open) { setEditTarget(null); setForm(EMPTY_FORM) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editTarget ? t('holidaysPage.form.editTitle') : t('holidaysPage.form.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {editTarget ? t('holidaysPage.form.editDescription') : t('holidaysPage.form.createDescription')}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleFormSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-semibold">{t('holidaysPage.form.dateLabel')}</label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm((prev) => ({ ...prev, date: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">{t('holidaysPage.form.nameLabel')}</label>
              <Input
                value={form.name}
                onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                placeholder={t('holidaysPage.form.namePlaceholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-semibold">{t('holidaysPage.form.scopeLabel')}</label>
              <Select
                value={form.scope}
                onChange={(e) => setForm((prev) => ({ ...prev, scope: e.target.value }))}
              >
                {SCOPE_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {t(opt.labelKey)}
                  </option>
                ))}
              </Select>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving} className="min-w-[140px]">
                {saving ? t('holidaysPage.form.saving') : t('holidaysPage.form.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('holidaysPage.delete.title')}</DialogTitle>
            <DialogDescription>
              {t('holidaysPage.delete.description', { name: deleteTarget?.name ?? '' })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.actions.cancel')}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              className="min-w-[140px]"
              onClick={handleDelete}
            >
              {deleting ? t('holidaysPage.delete.deleting') : t('holidaysPage.delete.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
