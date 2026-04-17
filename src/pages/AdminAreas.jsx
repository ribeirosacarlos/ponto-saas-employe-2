import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  Loader2,
  Pencil,
  Plus,
  RefreshCcw,
  Trash2,
} from 'lucide-react'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Label } from '../components/ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { useAreas } from '../hooks/useAreas'
import { createArea, deleteArea, updateArea } from '../services/modules/areas'
import { cn } from '../lib/utils'

const MANAGEMENT_REQUIRES = { anyOf: ['admin', 'super_admin'] }

const buildAreaForm = (area = null) => ({
  id: area?.id ?? '',
  name: area?.name ?? '',
})

export default function AdminAreas() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasManagementAccess = useMemo(
    () => canRenderCard(capabilities, MANAGEMENT_REQUIRES),
    [capabilities],
  )
  const { areas, loading, error, reload } = useAreas({
    enabled: hasManagementAccess,
    onError: (message) => {
      toast({
        title: t('adminAreasPage.toasts.loadError.title'),
        description: message || t('adminAreasPage.toasts.loadError.description'),
        variant: 'error',
      })
    },
  })

  const [dialogOpen, setDialogOpen] = useState(false)
  const [formMode, setFormMode] = useState('create')
  const [formState, setFormState] = useState(() => buildAreaForm())
  const [saving, setSaving] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)

  const handleOpenCreate = () => {
    setFormMode('create')
    setFormState(buildAreaForm())
    setDialogOpen(true)
  }

  const handleOpenEdit = (area) => {
    setFormMode('edit')
    setFormState(buildAreaForm(area))
    setDialogOpen(true)
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!formState.name.trim()) {
      toast({
        title: t('adminAreasPage.toasts.nameRequired.title'),
        description: t('adminAreasPage.toasts.nameRequired.description'),
        variant: 'error',
      })
      return
    }

    setSaving(true)
    try {
      if (formMode === 'edit' && formState.id) {
        await updateArea(formState.id, { name: formState.name.trim() })
      } else {
        await createArea({ name: formState.name.trim() })
      }

      await reload()
      setDialogOpen(false)
      setFormState(buildAreaForm())
      toast({
        title:
          formMode === 'edit'
            ? t('adminAreasPage.toasts.updated.title')
            : t('adminAreasPage.toasts.created.title'),
        description:
          formMode === 'edit'
            ? t('adminAreasPage.toasts.updated.description')
            : t('adminAreasPage.toasts.created.description'),
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: t('adminAreasPage.toasts.saveError.title'),
        description:
          err?.response?.data?.message ||
          t('adminAreasPage.toasts.saveError.description'),
        variant: 'error',
      })
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget?.id) return

    setDeleting(true)
    try {
      await deleteArea(deleteTarget.id)
      await reload()
      toast({
        title: t('adminAreasPage.toasts.deleted.title'),
        description: t('adminAreasPage.toasts.deleted.description', {
          name: deleteTarget.name || t('adminAreasPage.states.cardFallback'),
        }),
        variant: 'success',
      })
    } catch (err) {
      toast({
        title: t('adminAreasPage.toasts.deleteError.title'),
        description:
          err?.response?.data?.message ||
          t('adminAreasPage.toasts.deleteError.description'),
        variant: 'error',
      })
    } finally {
      setDeleting(false)
      setDeleteTarget(null)
    }
  }

  const renderContent = () => {
    if (!hasManagementAccess) {
      return (
        <div className="rounded-2xl border border-border/70 bg-card/90 p-6 text-sm text-muted-foreground">
          <p className="text-base font-semibold text-foreground">
            {t('adminAreasPage.states.noPermissionTitle')}
          </p>
          <p className="mt-1">{t('adminAreasPage.states.noPermissionDescription')}</p>
        </div>
      )
    }

    if (loading) {
      return (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {[1, 2, 3].map((item) => (
            <div
              key={item}
              className="h-36 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
            />
          ))}
        </div>
      )
    }

    if (error) {
      return (
        <div className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600 dark:border-rose-500/30 dark:text-rose-100">
          <p className="font-semibold">{t('adminAreasPage.states.errorTitle')}</p>
          <p className="mt-1">{error}</p>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="mt-3 rounded-full px-3 text-xs"
            onClick={reload}
          >
            {t('adminAreasPage.actions.refresh')}
          </Button>
        </div>
      )
    }

    if (!areas.length) {
      return (
        <div className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-5 py-6 text-sm text-muted-foreground">
          <p className="font-semibold text-foreground">{t('adminAreasPage.states.emptyTitle')}</p>
          <p className="mt-1">{t('adminAreasPage.states.emptyDescription')}</p>
          <Button
            type="button"
            size="sm"
            className="mt-3 rounded-full px-4"
            onClick={handleOpenCreate}
          >
            <Plus className="h-4 w-4" />
            {t('adminAreasPage.actions.create')}
          </Button>
        </div>
      )
    }

    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {areas.map((area) => (
          <div
            key={area.id}
            className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_30px_90px_-70px_rgba(62,82,152,0.45)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3">
                  <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <Building2 className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-foreground">
                      {area.name || t('adminAreasPage.states.cardFallback')}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="rounded-full px-3 text-xs"
                onClick={() => handleOpenEdit(area)}
              >
                <Pencil className="h-3.5 w-3.5" />
                {t('adminAreasPage.actions.edit')}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="rounded-full px-3 text-xs"
                onClick={() => setDeleteTarget(area)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('adminAreasPage.actions.delete')}
              </Button>
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <PageContainer className="space-y-6 py-5 sm:py-6">
      <AppTopBar
        icon={<Building2 className="h-5 w-5" />}
        eyebrow={t('sidebar.sections.admin')}
        title={t('adminAreasPage.title')}
        subtitle={t('adminAreasPage.subtitle')}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-border bg-background/80 px-3 text-sm"
              onClick={reload}
              disabled={loading}
            >
              <RefreshCcw className={cn('h-4 w-4 text-primary', loading && 'animate-spin')} />
              {t('adminAreasPage.actions.refresh')}
            </Button>
            <Button
              type="button"
              className="rounded-full px-4 text-sm"
              onClick={handleOpenCreate}
              disabled={!hasManagementAccess}
            >
              <Plus className="h-4 w-4" />
              {t('adminAreasPage.actions.create')}
            </Button>
          </>
        }
      />

      {renderContent()}

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open)
          if (!open) {
            setFormMode('create')
            setFormState(buildAreaForm())
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {formMode === 'edit'
                ? t('adminAreasPage.dialog.editTitle')
                : t('adminAreasPage.dialog.createTitle')}
            </DialogTitle>
            <DialogDescription>
              {t('adminAreasPage.dialog.description')}
            </DialogDescription>
          </DialogHeader>

          <form className="space-y-4 pt-2" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="area-name">{t('adminAreasPage.form.nameLabel')}</Label>
              <Input
                id="area-name"
                name="name"
                value={formState.name}
                onChange={(event) =>
                  setFormState((prev) => ({ ...prev, name: event.target.value }))
                }
                placeholder={t('adminAreasPage.form.namePlaceholder')}
                required
              />
            </div>
            <div className="flex items-center justify-end gap-3 pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={saving} className="min-w-[140px]">
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('common.loading')}
                  </>
                ) : (
                  t('common.actions.submit')
                )}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('adminAreasPage.dialog.deleteTitle')}</DialogTitle>
            <DialogDescription>
              {t('adminAreasPage.dialog.deleteDescription', {
                name: deleteTarget?.name || t('adminAreasPage.states.cardFallback'),
              })}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-3 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.actions.cancel')}
              </Button>
            </DialogClose>
            <Button
              type="button"
              variant="destructive"
              disabled={deleting}
              onClick={handleDelete}
            >
              {deleting ? t('common.loading') : t('adminAreasPage.actions.delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}
