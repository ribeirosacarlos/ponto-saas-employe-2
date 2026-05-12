import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Pencil } from 'lucide-react'
import { EntryAdjustmentModal } from './EntryAdjustmentModal'
import { Button } from './ui/button'
import { useToast } from './ui/use-toast'
import { requestAdjustment } from '../services/modules/employee'
import { cn } from '../lib/utils'

export function RequestAdjustmentButton({
  entry,
  entries = [],
  defaultDate,
  onSuccess,
  onSubmit: externalOnSubmit,
  isSubmitting: externalIsSubmitting,
  label,
  variant = 'default',
  size,
  className,
  hideOriginalTime,
}) {
  const { t } = useTranslation()
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)

  const isSubmitting = externalIsSubmitting !== undefined ? externalIsSubmitting : submitting

  const handleSubmit = async (payload, closeModal, resetForm) => {
    if (externalOnSubmit) {
      return externalOnSubmit(payload, closeModal, resetForm)
    }

    const timeEntryId =
      payload.timeEntryId ||
      payload.time_entry_id ||
      payload.entry_id ||
      payload.entry?.id ||
      payload.entry?.uuid

    setSubmitting(true)
    try {
      await requestAdjustment(timeEntryId ? { ...payload, timeEntryId } : payload)
      toast({
        title: t('toast.adjustmentSuccess.title'),
        description: t('toast.adjustmentSuccess.description'),
        variant: 'success',
      })
      closeModal?.()
      resetForm?.()
      onSuccess?.()
    } catch (err) {
      toast({
        title: t('historyPage.adjustment.errorTitle'),
        description:
          err.response?.data?.message || err.message || t('historyPage.adjustment.errorDescription'),
        variant: 'error',
      })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <EntryAdjustmentModal
      entry={entry}
      entries={entries}
      defaultDate={defaultDate}
      hideOriginalTime={hideOriginalTime}
      onSubmit={handleSubmit}
      isSubmitting={isSubmitting}
      trigger={
        <Button type="button" variant={variant} size={size} className={cn(className)}>
          <Pencil className="mr-2 h-4 w-4" />
          {label ?? t('historyPage.adjustment.cta')}
        </Button>
      }
    />
  )
}
