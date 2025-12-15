import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useTranslation } from 'react-i18next'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Button } from './ui/button'
import { Label } from './ui/label'
import { Input } from './ui/input'
import { Textarea } from './ui/textarea'
import { cn } from '../lib/utils'

export function EntryAdjustmentModal({ entry, trigger, onSubmit, isSubmitting }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    type: entry?.type || '',
    desiredTime: '',
    reason: '',
  })

  const dateValue = entry?.clockedAt || entry?.clocked_at || entry?.date || entry?.timestamp || ''
  const formattedDate = dateValue ? format(new Date(dateValue), 'yyyy-MM-dd') : ''
  const formattedTime = dateValue ? format(new Date(dateValue), 'HH:mm') : ''

  const typeOptions = useMemo(() => {
    const base = [
      { value: 'in', label: t('types.in') },
      { value: 'out', label: t('types.out') },
      { value: 'break_start', label: t('historyPage.adjustment.types.breakStart') },
      { value: 'break_end', label: t('historyPage.adjustment.types.breakEnd') },
    ]
    const existing = entry?.type
      ? [{ value: entry.type, label: entry.type }].filter(
          (option) => !base.find((item) => item.value === option.value),
        )
      : []
    return [...existing, ...base]
  }, [entry?.type, t])

  useEffect(() => {
    if (!open) return
    setForm((prev) => ({
      ...prev,
      type: entry?.type || prev.type || 'in',
      desiredTime: formattedTime,
    }))
  }, [entry?.type, formattedTime, open])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    const payload = {
      entry_id: entry?.id,
      date: formattedDate,
      type: form.type || entry?.type,
      desired_time: form.desiredTime,
      reason: form.reason,
      original_time: dateValue,
      notes: entry?.notes,
      status: entry?.status,
      // TODO: align with API shape when backend contract is available
    }

    await onSubmit?.(payload, () => setOpen(false), () =>
      setForm({
        type: entry?.type || '',
        desiredTime: '',
        reason: '',
      }),
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span className={cn('inline-flex w-full', isSubmitting && 'pointer-events-none opacity-80')}>
          {trigger}
        </span>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('historyPage.adjustment.modalTitle')}</DialogTitle>
          <DialogDescription>{t('historyPage.adjustment.modalDescription')}</DialogDescription>
        </DialogHeader>

        <form className="space-y-4 pt-2" onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t('historyPage.adjustment.date')}</Label>
              <Input value={formattedDate} readOnly />
            </div>
            <div className="space-y-2">
              <Label>{t('historyPage.adjustment.originalTime')}</Label>
              <Input value={formattedTime} readOnly />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">{t('historyPage.adjustment.type')}</Label>
              <select
                id="type"
                name="type"
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                value={form.type}
                onChange={handleChange}
              >
                {typeOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="desiredTime">{t('historyPage.adjustment.desiredTime')}</Label>
              <Input
                id="desiredTime"
                name="desiredTime"
                type="time"
                required
                value={form.desiredTime}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">{t('historyPage.adjustment.reason')}</Label>
            <Textarea
              id="reason"
              name="reason"
              required
              rows={3}
              placeholder={t('historyPage.adjustment.reasonPlaceholder')}
              value={form.reason}
              onChange={handleChange}
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <DialogClose asChild>
              <Button type="button" variant="ghost">
                {t('common.actions.cancel')}
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
              {isSubmitting ? t('historyPage.adjustment.submitting') : t('historyPage.adjustment.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
