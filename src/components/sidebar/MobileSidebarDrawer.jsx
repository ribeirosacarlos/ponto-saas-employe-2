import * as DialogPrimitive from '@radix-ui/react-dialog'
import { useTranslation } from 'react-i18next'
import { X } from 'lucide-react'
import { cn } from '../../lib/utils'
import { SidebarNavContent } from './SidebarNavContent'
import { UserProfileDropdown } from '../UserProfileDropdown'

const SidebarBrand = () => (
  <div className="flex items-center gap-2">
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-xs font-semibold tracking-tight text-primary-foreground shadow-inner shadow-primary/35">
      HR
    </div>
    <div className="flex flex-col leading-tight">
      <span className="text-[9px] font-semibold tracking-[0.22em] uppercase text-muted-foreground">
        Synergy
      </span>
      <span className="text-[10px] text-muted-foreground">HR Management</span>
    </div>
  </div>
)

export function MobileSidebarDrawer({
  open,
  onOpenChange,
  navItems = [],
  currentPage,
  user,
  onNavigate,
  onProfile,
  onHelp,
  onLogout,
}) {
  const { t } = useTranslation()

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
          aria-hidden="true"
        />
        <DialogPrimitive.Content
          aria-label={t('sidebar.actions.openMenu', { defaultValue: 'Open navigation' })}
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[85vw] max-w-[320px] flex-col border-r border-border/70 bg-card/95 p-4 text-foreground shadow-2xl shadow-black/30 outline-none backdrop-blur-xl transition-transform duration-300',
            'data-[state=open]:translate-x-0 data-[state=closed]:-translate-x-full',
          )}
        >
          <div className="flex items-center justify-between pb-4">
            <SidebarBrand />
            <DialogPrimitive.Close
              className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
              aria-label={t('common.actions.close', { defaultValue: 'Close' })}
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </div>

          <div className="flex-1 overflow-y-auto pr-1">
            <SidebarNavContent
              items={navItems}
              currentPage={currentPage}
              collapsed={false}
              onNavigate={onNavigate}
              onItemSelect={() => onOpenChange(false)}
            />
          </div>

          <div className="mt-4 border-t border-border/70 pt-4">
            <UserProfileDropdown
              user={user}
              onProfile={onProfile}
              onHelp={onHelp}
              onLogout={onLogout}
              collapsed={false}
            />
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
