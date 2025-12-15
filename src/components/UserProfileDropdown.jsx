import { useEffect, useRef, useState } from 'react'
import { CircleHelp, LogOut, UserRound } from 'lucide-react'
import { cn } from '../lib/utils'

export function UserProfileDropdown({ user, onProfile, onHelp, onLogout, className }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const listener = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', listener)
    return () => document.removeEventListener('mousedown', listener)
  }, [])

  const initials = (user?.name || user?.email || 'US')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center gap-3 rounded-2xl border border-border bg-card/90 px-3 py-3 text-left shadow-[0_18px_42px_-28px_rgba(62,82,152,0.55)] transition hover:bg-muted/80 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:ring-offset-2 focus:ring-offset-background"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-inner shadow-primary/30">
          {initials || 'EU'}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-[12px] font-semibold">{user?.name || 'Admin Teste'}</p>
          <p className="truncate text-[10px] text-muted-foreground">{user?.email || 'admin@teste.com'}</p>
        </div>
      </button>

      {open && (
        <div className="absolute bottom-[110%] left-0 z-50 w-64 rounded-2xl border border-border bg-card/95 p-3 shadow-[0_26px_80px_-40px_rgba(62,82,152,0.45)] backdrop-blur-xl">
          <div className="flex items-center gap-3 rounded-xl bg-muted/80 px-3 py-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground shadow-inner shadow-primary/30">
              {initials || 'EU'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-[12px] font-semibold">{user?.name || 'Admin Teste'}</p>
              <p className="truncate text-[11px] text-muted-foreground">{user?.email || 'admin@teste.com'}</p>
            </div>
          </div>

          <div className="my-3 h-px bg-border" />

          <div className="space-y-1 text-[12px] font-semibold text-foreground">
            <button
              type="button"
              onClick={() => {
                onProfile?.()
                setOpen(false)
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted/80"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-primary">
                <UserRound className="h-4 w-4" />
              </span>
              <span>Perfil do tecnico</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onHelp?.()
                setOpen(false)
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted/80"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/12 text-primary">
                <CircleHelp className="h-4 w-4" />
              </span>
              <span>Solicitar ajuda</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onLogout?.()
                setOpen(false)
              }}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition hover:bg-muted/80"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-rose-500/15 text-rose-500">
                <LogOut className="h-4 w-4" />
              </span>
              <span>Sair da aplicacao</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
