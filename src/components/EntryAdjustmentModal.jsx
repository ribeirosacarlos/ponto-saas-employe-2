import { useEffect, useState } from 'react'
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

export function EntryAdjustmentModal({
  entry,
  trigger,
  onSubmit,
  isSubmitting,
  defaultDate,
  hideOriginalTime = false,
}) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    date: '',
    correctedTime: '',
    reason: '',
  })

  const dateValue = entry?.clockedAt || entry?.clocked_at || entry?.date || entry?.timestamp || ''
  const fallbackDate = defaultDate ? new Date(defaultDate) : null
  const formattedDate = dateValue
    ? format(new Date(dateValue), 'yyyy-MM-dd')
    : fallbackDate
      ? format(fallbackDate, 'yyyy-MM-dd')
      : ''
  const formattedTime = dateValue ? format(new Date(dateValue), 'HH:mm') : ''

  useEffect(() => {
    if (!open) return
    setForm((prev) => ({
      ...prev,
      date: formattedDate || prev.date || '',
      correctedTime: formattedTime || prev.correctedTime || '',
    }))
  }, [formattedDate, formattedTime, open])

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    const correctedDateTime =
      form.date && form.correctedTime
        ? `${form.date} ${form.correctedTime.length === 5 ? `${form.correctedTime}:00` : form.correctedTime}`
        : ''

    if (!correctedDateTime) return

    const payload = {
      corrected_time: correctedDateTime,
      reason: form.reason,
      ...(dateValue ? { original_time: dateValue } : {}),
    }

    await onSubmit?.(payload, () => setOpen(false), () =>
      setForm({
        date: formattedDate || '',
        correctedTime: '',
        reason: '',
      }),
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span
          className={cn(
            'inline-flex w-full min-w-0 sm:w-auto',
            isSubmitting && 'pointer-events-none opacity-80',
          )}
        >
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
              <Label htmlFor="date">{t('historyPage.adjustment.date')}</Label>
              <Input
                id="date"
                name="date"
                type="date"
                required
                value={form.date}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="correctedTime">{t('historyPage.adjustment.desiredTime')}</Label>
              <Input
                id="correctedTime"
                name="correctedTime"
                type="time"
                required
                value={form.correctedTime}
                onChange={handleChange}
              />
            </div>
          </div>

          {!hideOriginalTime && (formattedDate || formattedTime) ? (
            <div className="space-y-2">
              <Label>{t('historyPage.adjustment.originalTime')}</Label>
              <Input value={[formattedDate, formattedTime].filter(Boolean).join(' ')} readOnly />
            </div>
          ) : null}

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
