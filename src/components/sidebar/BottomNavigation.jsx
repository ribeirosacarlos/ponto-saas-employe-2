import { useTranslation } from 'react-i18next'
import { cn } from '../../lib/utils'

export function BottomNavigation({ items = [], currentPage, onNavigate }) {
  const { t } = useTranslation()
  if (!items.length) return null

  const handleSelect = (item) => {
    if (item.onClick) {
      item.onClick()
      return
    }
    if (item.page && onNavigate) {
      onNavigate(item.page)
    }
  }

  const handleAnchorClick = (event, item) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return
    }

    event.preventDefault()
    handleSelect(item)
  }

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border/70 bg-card/95 shadow-[0_-18px_65px_-45px_rgba(62,82,152,0.7)] backdrop-blur-xl md:hidden"
      aria-label={t('sidebar.sections.workspace')}
      style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 10px)' }}
    >
      <div className="mx-auto flex max-w-[1320px] items-center justify-between gap-2 px-4 py-2">
        {items.map((item) => {
          const Icon = item.icon
          const isActive = currentPage === item.page
          const isCta = item.variant === 'cta'
          const labelColor = isCta
            ? 'text-primary'
            : isActive
              ? 'text-primary'
              : 'text-foreground/80'
          const iconColor = isCta
            ? 'text-primary-foreground'
            : isActive
              ? 'text-primary'
              : 'text-foreground/80'

          return (
            <a
              key={item.id}
              aria-label={t(item.labelKey)}
              href={item.path || '#'}
              onClick={(event) => handleAnchorClick(event, item)}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5 rounded-2xl px-2 py-1 text-[11px] font-medium"
            >
              <span
                className={cn(
                  'flex h-11 w-full items-center justify-center rounded-2xl border transition-colors',
                  isCta
                    ? 'border-primary bg-primary shadow-[0_16px_40px_-32px_rgba(62,82,152,0.9)]'
                    : isActive
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-border/80 bg-muted/40 hover:border-border',
                )}
              >
                <Icon className={cn('h-[20px] w-[20px]', iconColor)} />
              </span>
              <span
                className={cn(
                  'leading-tight text-ellipsis whitespace-nowrap overflow-hidden',
                  labelColor,
                )}
              >
                {t(item.labelKey)}
              </span>
            </a>
          )
        })}
      </div>
    </nav>
  )
}
