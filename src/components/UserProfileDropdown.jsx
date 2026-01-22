import { useEffect, useRef, useState } from 'react'
import { CircleHelp, LogOut, MoreHorizontal, UserRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'
import { ThemeToggle } from './ThemeToggle'
import { LanguageSwitcher } from './LanguageSwitcher'
import { useDateTime } from '../hooks/useDateTime'

export function UserProfileDropdown({ user, onProfile, onHelp, onLogout, className, collapsed = false }) {
  const { t } = useTranslation()
  const { tz } = useDateTime()
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

  const displayName = user?.name || user?.email || 'admin@teste.com'

  return (
    <div className={cn('relative', className)} ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={displayName}
        className={cn(
          'flex w-full items-center gap-2 rounded-full border border-border bg-muted/80 px-2.5 py-1.5 text-left text-[12px] font-semibold text-foreground shadow-[0_14px_32px_-28px_rgba(0,0,0,0.35)] transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary/30 focus:ring-offset-2 focus:ring-offset-background',
          collapsed ? 'justify-center px-2' : '',
        )}
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-[11px] font-semibold text-primary-foreground shadow-inner shadow-primary/30">
          {initials || 'EU'}
        </div>
        <span className={cn('min-w-0 flex-1 truncate', collapsed ? 'sr-only' : 'block')}>
          {displayName}
        </span>
        {collapsed ? null : <MoreHorizontal className="h-4 w-4 text-muted-foreground" />}
      </button>

      {open && (
        <div className="absolute bottom-[108%] left-0 z-50 w-64 rounded-2xl border border-border bg-card/95 p-2.5 shadow-[0_22px_70px_-36px_rgba(0,0,0,0.5)] backdrop-blur-xl">
          <div className="space-y-1 text-[12px] font-semibold text-foreground">
            <button
              type="button"
              onClick={() => {
                onProfile?.()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-muted/80"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-muted/80"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <CircleHelp className="h-4 w-4" />
              </span>
              <span>Solicitar ajuda</span>
            </button>
            <div className="mt-1 space-y-1 rounded-xl bg-muted/50 p-2">
              <ThemeToggle iconOnly={false} className="w-full" />
              <LanguageSwitcher iconOnly={false} className="w-full" />
            </div>
            <button
              type="button"
              onClick={() => {
                onLogout?.()
                setOpen(false)
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 transition hover:bg-muted/80"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/15 text-rose-500">
                <LogOut className="h-4 w-4" />
              </span>
              <span>Sair da aplicacao</span>
            </button>
            <div className="mt-2 rounded-xl border border-border/60 bg-muted/40 px-3 py-2 text-[11px] text-muted-foreground">
              {t('common.activeTimezone', { tz })}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
