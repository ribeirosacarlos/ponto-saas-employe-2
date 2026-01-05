import { useTranslation } from 'react-i18next'
import { cn } from '../lib/utils'

const sizeStyles = {
  sm: {
    icon: 'h-10 w-10 p-1.5',
    logo: 'h-7 w-7',
    title: 'text-[9px] tracking-[0.18em]',
    subtitle: 'text-[10px]',
  },
  md: {
    icon: 'h-12 w-12 p-2',
    logo: 'h-9 w-9',
    title: 'text-[11px] tracking-[0.24em]',
    subtitle: 'text-sm',
  },
}

export function BrandSignature({
  collapsed = false,
  size = 'sm',
  titleKey = 'branding.name',
  subtitleKey = 'branding.subtitle',
  className,
}) {
  const { t } = useTranslation()
  const currentSize = sizeStyles[size] ?? sizeStyles.sm

  return (
    <div
      className={cn(
        'flex items-center gap-2 select-none pointer-events-none transition-opacity duration-150',
        collapsed ? 'group-hover:opacity-0' : '',
        className,
      )}
    >
      <div className={cn(
        'flex items-center justify-center rounded-2xl border border-primary/25 bg-card shadow-inner shadow-primary/25',
        currentSize.icon,
      )}>
        <img
          src="/logo.png"
          alt={t('branding.logoAlt', { defaultValue: 'Jornafy logo' })}
          className={cn('object-contain drop-shadow-sm', currentSize.logo)}
        />
      </div>
      <div className={cn('flex flex-col leading-tight', collapsed ? 'hidden' : 'flex')}>
        <span className={cn('font-semibold uppercase text-muted-foreground', currentSize.title)}>
          {t(titleKey)}
        </span>
        <span className={cn('text-muted-foreground', currentSize.subtitle)}>
          {t(subtitleKey)}
        </span>
      </div>
    </div>
  )
}
