import { useState } from 'react'
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
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Textarea } from './ui/textarea'
import { cn } from '../lib/utils'

export function AjusteModal({ onSubmit, trigger, isSubmitting }) {
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    original_time: '',
    corrected_time: '',
    reason: '',
  })

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    await onSubmit(form, () => setOpen(false), () =>
      setForm({ original_time: '', corrected_time: '', reason: '' }),
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
          <DialogTitle>Solicitar ajuste</DialogTitle>
          <DialogDescription>
            Preencha os horários e descreva o motivo da solicitação de ajuste.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label htmlFor="original_time">Horário original</Label>
            <Input
              id="original_time"
              name="original_time"
              type="datetime-local"
              value={form.original_time}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="corrected_time">Horário correto</Label>
            <Input
              id="corrected_time"
              name="corrected_time"
              type="datetime-local"
              value={form.corrected_time}
              onChange={handleChange}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="reason">Justificativa</Label>
            <Textarea
              id="reason"
              name="reason"
              placeholder="Descreva o que ocorreu..."
              value={form.reason}
              onChange={handleChange}
              required
            />
          </div>
          <div className="flex items-center justify-end gap-3 pt-2">
            <DialogClose asChild>
              <Button variant="ghost" type="button">
                Cancelar
              </Button>
            </DialogClose>
            <Button type="submit" disabled={isSubmitting} className="min-w-[140px]">
              {isSubmitting ? 'Enviando...' : 'Enviar ajuste'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
