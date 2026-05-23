import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react'
import { Eraser, PenLine } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Label } from './ui/label'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { cn } from '../lib/utils'

const CANVAS_W = 800
const CANVAS_H = 280

const SignatureCanvas = forwardRef(function SignatureCanvas({ onChangeEmpty }, ref) {
  const canvasRef = useRef(null)
  const drawing = useRef(false)
  const lastPos = useRef(null)
  const isEmpty = useRef(true)

  useImperativeHandle(ref, () => ({
    getDataURL() {
      const canvas = canvasRef.current
      if (!canvas || isEmpty.current) return null
      return canvas.toDataURL('image/png')
    },
    clear() {
      const canvas = canvasRef.current
      const ctx = canvas?.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      isEmpty.current = true
      onChangeEmpty(true)
    },
  }))

  const getPos = (e, canvas) => {
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    const src = e.touches ? e.touches[0] : e
    return {
      x: (src.clientX - rect.left) * scaleX,
      y: (src.clientY - rect.top) * scaleY,
    }
  }

  const startDraw = useCallback((e) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    drawing.current = true
    lastPos.current = getPos(e, canvas)
  }, [])

  const draw = useCallback((e) => {
    e.preventDefault()
    if (!drawing.current) return
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!ctx) return
    const pos = getPos(e, canvas)
    ctx.beginPath()
    ctx.moveTo(lastPos.current.x, lastPos.current.y)
    ctx.lineTo(pos.x, pos.y)
    ctx.strokeStyle = '#1e293b'
    ctx.lineWidth = 3.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    lastPos.current = pos
    if (isEmpty.current) {
      isEmpty.current = false
      onChangeEmpty(false)
    }
  }, [onChangeEmpty])

  const stopDraw = useCallback(() => {
    drawing.current = false
    lastPos.current = null
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.addEventListener('touchstart', startDraw, { passive: false })
    canvas.addEventListener('touchmove', draw, { passive: false })
    canvas.addEventListener('touchend', stopDraw)
    return () => {
      canvas.removeEventListener('touchstart', startDraw)
      canvas.removeEventListener('touchmove', draw)
      canvas.removeEventListener('touchend', stopDraw)
    }
  }, [draw, startDraw, stopDraw])

  return (
    <div className="space-y-1.5">
      <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-border/70 bg-white dark:bg-slate-950">
        <canvas
          ref={canvasRef}
          width={CANVAS_W}
          height={CANVAS_H}
          className="block w-full cursor-crosshair touch-none select-none"
          style={{ height: `${CANVAS_H}px` }}
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={stopDraw}
          onMouseLeave={stopDraw}
        />
        <p className="pointer-events-none absolute inset-0 flex items-center justify-center text-[12px] text-muted-foreground/30 select-none">
          Desenhe sua assinatura aqui
        </p>
      </div>
    </div>
  )
})

export function SignTimesheetDialog({ open, onOpenChange, onConfirm, loading }) {
  const sigRef = useRef(null)
  const [signatureEmpty, setSignatureEmpty] = useState(true)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!open) {
      setSignatureEmpty(true)
      setAcceptedTerms(false)
      setPassword('')
      setErrors({})
      sigRef.current?.clear()
    }
  }, [open])

  const handleSubmit = () => {
    const next = {}
    const dataURL = sigRef.current?.getDataURL()
    if (!dataURL) next.signature = 'Desenhe sua assinatura antes de continuar.'
    if (!acceptedTerms) next.terms = 'Você precisa aceitar os termos para assinar.'
    if (!password.trim()) next.password = 'Informe sua senha para confirmar a assinatura.'
    setErrors(next)
    if (Object.keys(next).length > 0) return
    onConfirm({ signatureImage: dataURL, acceptedTerms: true, password })
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!loading) onOpenChange(v) }}>
      <DialogContent className="w-[95vw] max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PenLine className="h-4 w-4 text-primary" />
            Assinar folha de ponto
          </DialogTitle>
          <DialogDescription>
            Desenhe sua assinatura, aceite os termos e confirme com sua senha para assinar eletronicamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Assinatura */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-[12px]">Assinatura</Label>
              <button
                type="button"
                onClick={() => {
                  sigRef.current?.clear()
                  setSignatureEmpty(true)
                  setErrors((prev) => ({ ...prev, signature: undefined }))
                }}
                className="inline-flex items-center gap-1 text-[11px] text-muted-foreground underline-offset-2 hover:underline"
              >
                <Eraser className="h-3 w-3" />
                Limpar
              </button>
            </div>
            <SignatureCanvas
              ref={sigRef}
              onChangeEmpty={(empty) => {
                setSignatureEmpty(empty)
                if (!empty) setErrors((prev) => ({ ...prev, signature: undefined }))
              }}
            />
            {errors.signature ? (
              <p className="text-[11px] font-semibold text-rose-500">{errors.signature}</p>
            ) : null}
          </div>

          {/* Aceite dos termos */}
          <div className="space-y-1.5">
            <label className="flex cursor-pointer items-start gap-3">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => {
                  setAcceptedTerms(e.target.checked)
                  if (e.target.checked) setErrors((prev) => ({ ...prev, terms: undefined }))
                }}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-primary"
              />
              <span className="text-[12px] leading-relaxed text-muted-foreground">
                Declaro que as informações desta folha de ponto estão corretas e concordo com o{' '}
                <span className="font-semibold text-foreground">registro eletrônico de ponto</span>{' '}
                referente ao período indicado.
              </span>
            </label>
            {errors.terms ? (
              <p className="text-[11px] font-semibold text-rose-500">{errors.terms}</p>
            ) : null}
          </div>

          {/* Senha */}
          <div className="space-y-1.5">
            <Label htmlFor="sign-password" className="text-[12px]">
              Confirmar com senha
            </Label>
            <Input
              id="sign-password"
              type="password"
              value={password}
              placeholder="Sua senha de acesso"
              onChange={(e) => {
                setPassword(e.target.value)
                if (e.target.value) setErrors((prev) => ({ ...prev, password: undefined }))
              }}
              className={cn(errors.password && 'border-rose-400 focus-visible:ring-rose-400')}
            />
            {errors.password ? (
              <p className="text-[11px] font-semibold text-rose-500">{errors.password}</p>
            ) : null}
          </div>

          <div className="flex items-center justify-end gap-3 border-t border-border/70 pt-4">
            <DialogClose asChild>
              <Button type="button" variant="ghost" disabled={loading}>
                Cancelar
              </Button>
            </DialogClose>
            <Button type="button" onClick={handleSubmit} disabled={loading}>
              {loading ? 'Assinando...' : 'Confirmar assinatura'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
