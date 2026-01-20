import { useMemo, useRef, useState } from 'react'
import { CalendarClock } from 'lucide-react'
import { Button } from './ui/button'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { cn } from '../lib/utils'
import { useTranslation } from 'react-i18next'

export function AjusteModal({ onSubmit, trigger, isSubmitting, originalTime }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    corrected_time: '',
    reason: '',
  })
  const correctedInputRef = useRef(null)
  const { t } = useTranslation()

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const openDatePicker = () => {
    const input = correctedInputRef.current
    if (!input) return
    if (input.showPicker) {
      input.showPicker()
    } else {
      input.focus()
    }
  }

  const formattedCorrectedTime = useMemo(() => {
    if (!form.corrected_time) return t('adjustment.pickDateTime', 'Selecione data e hora')
    const parsed = new Date(form.corrected_time)
    if (Number.isNaN(parsed.getTime())) return form.corrected_time
    return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(parsed)
  }, [form.corrected_time, t])

  const handleSubmit = async (e) => {
    e.preventDefault()

    await onSubmit(
      {
        corrected_time: form.corrected_time,
        reason: form.reason,
      },
      () => setOpen(false),
      () => setForm({ corrected_time: '', reason: '' }),
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
          <DialogTitle>{t('adjustment.dialogTitle')}</DialogTitle>
          <DialogDescription>{t('adjustment.dialogDescription')}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {originalTime ? (
            <div className="space-y-2">
              <Label>{t('adjustment.original')}</Label>
              <Input value={originalTime} disabled />
            </div>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="corrected_time">{t('adjustment.corrected')}</Label>
            <div className="group relative rounded-2xl border border-border/70 bg-gradient-to-r from-background/95 via-muted/60 to-background/90 shadow-[0_16px_60px_-40px_rgba(82,110,255,0.55)] transition hover:border-primary/60 hover:shadow-[0_20px_70px_-40px_rgba(82,110,255,0.65)]">
              <Input
                id="corrected_time"
              name="corrected_time"
                type="datetime-local"
                value={form.corrected_time}
                onChange={handleChange}
                ref={correctedInputRef}
                required
                style={{ colorScheme: 'dark' }}
                className="absolute inset-0 z-10 h-full w-full cursor-pointer opacity-0"
                onClick={openDatePicker}
              />
              <div className="pointer-events-none flex items-center justify-between gap-3 px-4 py-3 sm:px-5">
                <div className="flex flex-col">
                  <span className="text-[11px] uppercase tracking-wide text-muted-foreground">
                    {t('adjustment.corrected')}
                  </span>
                  <span
                    className={cn(
                      'text-sm font-semibold transition-colors',
                      form.corrected_time ? 'text-foreground' : 'text-muted-foreground',
                    )}
                  >
                    {formattedCorrectedTime}
                  </span>
                </div>
                <span className="flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-primary ring-1 ring-primary/15 transition group-hover:bg-primary/15">
                  <CalendarClock className="h-5 w-5" />
                  <span className="hidden text-xs font-medium sm:inline">
                    {t('adjustment.openPicker', 'Escolher')}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">{t('adjustment.reason')}</Label>
            <Textarea
              id="reason"
              name="reason"
              placeholder={t('adjustment.placeholder')}
              value={form.reason}
              onChange={handleChange}
              required
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <DialogClose asChild>
              <Button variant="ghost" type="button">
                {t('adjustment.cancel')}
              </Button>
            </DialogClose>

            <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
              {isSubmitting ? t('adjustment.submitting') : t('adjustment.submit')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
