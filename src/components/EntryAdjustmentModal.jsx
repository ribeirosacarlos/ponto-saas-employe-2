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

export function EntryAdjustmentModal({
  entry,
  entries = [],
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
  const [selectedEntryId, setSelectedEntryId] = useState('')

  const availableEntries = useMemo(
    () =>
      (entries || [])
        .filter((item) => item?.id || item?.uuid)
        .map((item) => {
          const dateValue = item.clockedAt || item.clocked_at || item.date || item.timestamp
          const id = item.id || item.uuid
          const labelDate = dateValue ? format(new Date(dateValue), 'dd/MM/yyyy') : id
          const labelTime = dateValue ? format(new Date(dateValue), 'HH:mm') : ''
          const labelType = item.type ? `· ${item.type}` : ''
          return {
            id,
            type: item.type,
            raw: item,
            label: [labelDate, labelTime, labelType].filter(Boolean).join(' '),
          }
        }),
    [entries],
  )

  const activeEntry =
    entry ||
    availableEntries.find((item) => item.id === selectedEntryId)?.raw ||
    availableEntries[0]?.raw ||
    null

  const dateValue = activeEntry?.clockedAt || activeEntry?.clocked_at || activeEntry?.date || activeEntry?.timestamp || ''
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

  useEffect(() => {
    if (!open) return
    const fallbackId = entry?.id || entry?.uuid || availableEntries[0]?.id || ''
    setSelectedEntryId((prev) => prev || fallbackId)
  }, [availableEntries, entry?.id, entry?.uuid, open])

  const handleSubmit = async (event) => {
    event.preventDefault()

    const timeEntryId =
      activeEntry?.id || activeEntry?.uuid || selectedEntryId || availableEntries[0]?.id || ''

    const correctedDateTime =
      form.date && form.correctedTime
        ? `${form.date} ${form.correctedTime.length === 5 ? `${form.correctedTime}:00` : form.correctedTime}`
        : ''

    if (!correctedDateTime) return

    const payload = {
      timeEntryId,
      proposed_clocked_at: correctedDateTime,
      proposed_type:
        activeEntry?.proposed_type ||
        activeEntry?.proposedType ||
        activeEntry?.type ||
        availableEntries.find((item) => item.id === timeEntryId)?.type,
      reason: form.reason,
      entry: activeEntry,
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
            'inline-flex w-full min-w-0',
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
          {!entry ? (
            <div className="space-y-2">
              <Label htmlFor="timeEntry">{t('historyPage.adjustment.entryLabel', 'Registro a ajustar')}</Label>
              <select
                id="timeEntry"
                name="timeEntry"
                required
                value={selectedEntryId || availableEntries[0]?.id || ''}
                onChange={(event) => setSelectedEntryId(event.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
              >
                {availableEntries.length === 0 ? (
                  <option value="">{t('historyPage.adjustment.noEntries', 'Nenhum registro carregado')}</option>
                ) : (
                  availableEntries.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.label}
                    </option>
                  ))
                )}
              </select>
            </div>
          ) : null}

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
