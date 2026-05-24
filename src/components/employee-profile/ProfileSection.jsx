import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '@/store/useAuth'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Lock, Pencil, Loader2 } from 'lucide-react'
import { updateEmployeeProfile } from '@/services/employeeProfileService'

const ROLE_LABELS = {
  employee: 'Funcionário',
  area_manager: 'Gestor de Área',
  manager: 'Gestor',
  admin: 'Administrador',
  super_admin: 'Super Administrador',
}

function ReadOnlyField({ label, value }) {
  const { t } = useTranslation()
  return (
    <div className="space-y-1.5">
      <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </label>
      <div className="flex items-center gap-2 rounded-md border border-border/60 bg-muted/40 px-2.5 py-2">
        <span className="flex-1 text-[12px] text-foreground">{value || '—'}</span>
        <Lock className="h-3 w-3 shrink-0 text-muted-foreground/60" />
      </div>
      <p className="text-[10px] text-muted-foreground">
        {t('profilePage.managedByAdmin', { defaultValue: 'Gerenciado pelo administrador' })}
      </p>
    </div>
  )
}

export function ProfileSection() {
  const { t } = useTranslation()
  const { toast } = useToast()
  const { user, roles, syncProfile } = useAuthStore()

  const [isEditing, setIsEditing] = useState(false)
  const [nameValue, setNameValue] = useState(user?.name || '')
  const [isSaving, setIsSaving] = useState(false)
  const [nameError, setNameError] = useState('')

  const initials = (user?.name || user?.email || 'EU')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  const primaryRole = Array.isArray(roles) && roles.length > 0 ? roles[0] : user?.role
  const roleLabel = ROLE_LABELS[primaryRole] || primaryRole || '—'
  const shiftName = user?.shift?.name || user?.shift_name || null

  const handleEdit = () => {
    setNameValue(user?.name || '')
    setNameError('')
    setIsEditing(true)
  }

  const handleCancel = () => {
    setIsEditing(false)
    setNameError('')
  }

  const handleSave = async () => {
    const trimmed = nameValue.trim()
    if (!trimmed) {
      setNameError(t('profilePage.fields.nameRequired', { defaultValue: 'O nome não pode estar vazio.' }))
      return
    }

    setIsSaving(true)
    setNameError('')
    try {
      const updatedUser = await updateEmployeeProfile({ name: trimmed })
      syncProfile({ ...user, ...updatedUser }, roles)
      setIsEditing(false)
      toast({
        title: t('profilePage.toast.successTitle', { defaultValue: 'Perfil atualizado' }),
        description: t('profilePage.toast.successDescription', { defaultValue: 'Seu nome foi atualizado com sucesso.' }),
        variant: 'success',
      })
    } catch (err) {
      const apiNameError = err?.response?.data?.errors?.name?.[0]
      const message = apiNameError || err?.response?.data?.message || err?.message || t('profilePage.toast.errorDescription', { defaultValue: 'Não foi possível salvar.' })
      setNameError(message)
      toast({
        title: t('profilePage.toast.errorTitle', { defaultValue: 'Erro ao salvar' }),
        description: message,
        variant: 'error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-[13px] font-semibold text-foreground">
          {t('profilePage.sections.profile.title', { defaultValue: 'Dados Pessoais' })}
        </h3>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t('profilePage.sections.profile.description', {
            defaultValue: 'Suas informações pessoais no sistema.',
          })}
        </p>
      </div>

      <Separator />

      <div className="flex items-center gap-4">
        <Avatar className="size-16 ring-2 ring-primary/20">
          <AvatarFallback className="bg-primary text-lg font-bold text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="text-[13px] font-semibold text-foreground">{user?.name || user?.email}</p>
          <p className="text-[11px] text-muted-foreground">{roleLabel}</p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {/* Nome — editável */}
        <div className="space-y-1.5 sm:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {t('profilePage.fields.name', { defaultValue: 'Nome completo' })}
            </label>
            {!isEditing && (
              <button
                type="button"
                onClick={handleEdit}
                className="flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors"
              >
                <Pencil className="h-3 w-3" />
                {t('common.actions.edit', { defaultValue: 'Editar' })}
              </button>
            )}
          </div>

          {isEditing ? (
            <div className="space-y-2">
              <Input
                value={nameValue}
                onChange={(e) => {
                  setNameValue(e.target.value)
                  setNameError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') handleCancel()
                }}
                disabled={isSaving}
                className="h-9"
                autoFocus
              />
              {nameError && <p className="text-[11px] text-rose-600">{nameError}</p>}
              <div className="flex items-center gap-2">
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      {t('common.actions.saving', { defaultValue: 'Salvando...' })}
                    </>
                  ) : (
                    t('common.actions.save', { defaultValue: 'Salvar' })
                  )}
                </Button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={isSaving}
                  className="text-[12px] font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                >
                  {t('common.actions.cancel', { defaultValue: 'Cancelar' })}
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 rounded-md border border-border/60 bg-background px-2.5 py-2">
              <span className="flex-1 text-[12px] text-foreground">{user?.name || '—'}</span>
            </div>
          )}
        </div>

        <ReadOnlyField
          label={t('profilePage.fields.email', { defaultValue: 'E-mail' })}
          value={user?.email}
        />
        <ReadOnlyField
          label={t('profilePage.fields.role', { defaultValue: 'Cargo' })}
          value={roleLabel}
        />
        <ReadOnlyField
          label={t('profilePage.fields.area', { defaultValue: 'Área' })}
          value={user?.area_name}
        />
        {shiftName && (
          <ReadOnlyField
            label={t('profilePage.fields.shift', { defaultValue: 'Turno' })}
            value={shiftName}
          />
        )}
      </div>
    </div>
  )
}
