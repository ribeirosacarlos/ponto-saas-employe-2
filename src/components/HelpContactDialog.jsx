import { Mail, Phone } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog'
import { Button } from './ui/button'

const FALLBACK_EMAIL = 'support@jornafy.com'
const FALLBACK_PHONE = '+34 634 49 93 69'

export function HelpContactDialog({ open, onOpenChange }) {
  const { t } = useTranslation()
  const supportEmail = import.meta.env.VITE_SUPPORT_EMAIL || FALLBACK_EMAIL
  const supportPhone = import.meta.env.VITE_SUPPORT_PHONE || FALLBACK_PHONE
  const whatsappPhone = supportPhone.replace(/\D+/g, '')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('supportContact.title')}</DialogTitle>
          <DialogDescription>{t('supportContact.description')}</DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <a
            href={`mailto:${supportEmail}`}
            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 transition hover:border-primary/40 hover:bg-muted/70"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Mail className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t('supportContact.emailLabel')}
              </p>
              <p className="truncate text-sm font-semibold text-foreground">{supportEmail}</p>
            </div>
          </a>

          <a
            href={`https://wa.me/${whatsappPhone}`}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 rounded-2xl border border-border/70 bg-muted/40 px-4 py-3 transition hover:border-primary/40 hover:bg-muted/70"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Phone className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
                {t('supportContact.phoneLabel')}
              </p>
              <p className="truncate text-sm font-semibold text-foreground">{supportPhone}</p>
            </div>
          </a>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.actions.close')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
