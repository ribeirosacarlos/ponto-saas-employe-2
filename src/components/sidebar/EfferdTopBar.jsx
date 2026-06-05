import { useTranslation } from 'react-i18next'
import { BellIcon, ChevronDown, CircleHelp, LogOutIcon, Settings, UserIcon } from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import { useTheme } from '@/providers/ThemeProvider'
import { Moon, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'

function ThemeItem() {
  const { t } = useTranslation()
  const { theme, toggleTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <DropdownMenuItem
      onSelect={(e) => e.preventDefault()}
      onClick={toggleTheme}
      className="cursor-pointer"
    >
      {isDark ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
      {isDark
        ? t('themeToggle.lightLabel', { defaultValue: 'Tema claro' })
        : t('themeToggle.darkLabel', { defaultValue: 'Tema escuro' })}
    </DropdownMenuItem>
  )
}

function TopBarUserMenu({ user, onProfile, onHelp, onSettings, onLogout }) {
  const { t } = useTranslation()

  const initials = (user?.name || user?.email || 'US')
    .trim()
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

  const displayName = user?.name || user?.email || ''
  const displayEmail = user?.email || ''

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-full border border-border/70 bg-card/70 px-2 py-1 text-left transition hover:border-primary/20 hover:bg-muted/70"
        >
          <Avatar className="size-8 cursor-pointer ring-2 ring-transparent transition hover:ring-primary/30">
            <AvatarFallback className="bg-primary text-[11px] font-semibold text-primary-foreground">
              {initials || 'EU'}
            </AvatarFallback>
          </Avatar>
          <span className="hidden max-w-32 truncate text-[12px] font-semibold text-foreground sm:block">
            {displayName}
          </span>
          <ChevronDown className="hidden h-4 w-4 text-muted-foreground sm:block" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuItem className="pointer-events-none select-none p-0 focus:bg-transparent">
          <DropdownMenuLabel className="flex items-center gap-3 px-3 py-2.5">
            <Avatar className="size-10 shrink-0">
              <AvatarFallback className="bg-primary text-[13px] font-semibold text-primary-foreground">
                {initials || 'EU'}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-[13px] font-semibold text-foreground">{displayName}</p>
              <p className="truncate text-[11px] font-normal text-muted-foreground">{displayEmail}</p>
            </div>
          </DropdownMenuLabel>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem className="cursor-pointer" onClick={onProfile}>
            <UserIcon />
            {t('userMenu.profile', { defaultValue: 'Perfil' })}
          </DropdownMenuItem>

          <DropdownMenuItem className="cursor-pointer" onClick={onHelp}>
            <CircleHelp />
            {t('sidebar.helpCenter', { defaultValue: 'Central de ajuda' })}
          </DropdownMenuItem>

          <ThemeItem />

          <DropdownMenuItem className="cursor-pointer" onClick={onSettings}>
            <Settings />
            {t('settingsPage.title', { defaultValue: 'Configurações' })}
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem
            onClick={onLogout}
            className="cursor-pointer text-destructive focus:bg-destructive/10 focus:text-destructive"
          >
            <LogOutIcon />
            {t('userMenu.logout', { defaultValue: 'Sair' })}
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function EfferdTopBar({ user, onProfile, onHelp, onSettings, onLogout, pageTitle, className }) {
  const { t } = useTranslation()

  return (
    <header
      className={cn(
        'sticky top-0 z-40 flex h-14 shrink-0 items-center justify-between gap-2 border-b border-border/70 bg-card/90 px-4 shadow-[0_4px_24px_-10px_rgba(62,82,152,0.12)] backdrop-blur-xl',
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <SidebarTrigger className="h-7 w-7 shrink-0 text-muted-foreground hover:text-foreground" />
        {pageTitle ? (
          <>
            <Separator orientation="vertical" className="h-4 data-[orientation=vertical]:self-center" />
            <span className="text-[13px] font-semibold text-foreground">{pageTitle}</span>
          </>
        ) : null}
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={t('topBar.notifications', { defaultValue: 'Notificações' })}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border/70 bg-card/70 text-muted-foreground transition hover:bg-muted hover:text-foreground"
        >
          <BellIcon className="h-4 w-4" />
        </button>

        <Separator orientation="vertical" className="h-4 data-[orientation=vertical]:self-center" />

        <TopBarUserMenu
          user={user}
          onProfile={onProfile}
          onHelp={onHelp}
          onSettings={onSettings}
          onLogout={onLogout}
        />
      </div>
    </header>
  )
}
