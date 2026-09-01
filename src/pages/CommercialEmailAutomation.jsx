import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertTriangle, Mail } from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { cn } from '../lib/utils'
import { EmailTemplatesTab } from '../components/commercial/EmailTemplatesTab'
import { EmailSequencesTab } from '../components/commercial/EmailSequencesTab'
import { EmailSendsTab } from '../components/commercial/EmailSendsTab'
import { EmailSettingsTab } from '../components/commercial/EmailSettingsTab'
import { getEmailSettings } from '../services/modules/commercialEmails'

const ACCESS_REQUIRES = { anyOf: ['super_admin'] }

const TABS = [
  { value: 'templates', label: 'Templates' },
  { value: 'sequences', label: 'Sequências' },
  { value: 'sends', label: 'Enviados' },
  { value: 'settings', label: 'Configurações' },
]

export default function CommercialEmailAutomation() {
  const roles = useAuthStore((s) => s.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, ACCESS_REQUIRES), [capabilities])

  const [activeTab, setActiveTab] = useState('templates')
  const [settings, setSettings] = useState(null)

  const loadSettings = useCallback(async () => {
    try {
      const result = await getEmailSettings()
      setSettings(result)
    } catch {
      // silencioso — o banner só é exibido quando há confirmação de pausa global
    }
  }, [])

  useEffect(() => {
    if (!hasAccess) return
    loadSettings()
  }, [hasAccess, loadSettings])

  if (!hasAccess) {
    return (
      <PageContainer>
        <p className="mt-10 text-center text-sm text-muted-foreground">Acesso negado.</p>
      </PageContainer>
    )
  }

  return (
    <PageContainer>
      <div className="flex flex-col gap-5">
        <AppTopBar
          icon={<Mail className="h-3.5 w-3.5" />}
          eyebrow="Comercial"
          title="Automação de E-mail"
          subtitle="Templates, sequências de follow-up e configurações de envio de cold outreach"
          actions={
            <div className="flex items-center rounded-lg border border-border/60 bg-muted/40 p-0.5">
              {TABS.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={cn(
                    'flex h-6 items-center gap-1 rounded-md px-2 text-[10px] font-medium transition-colors',
                    activeTab === tab.value ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                  )}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          }
        />

        {settings?.is_globally_paused && (
          <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-2.5">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
            <div>
              <p className="text-[12px] font-semibold text-destructive">Envios pausados globalmente</p>
              {settings.pause_reason && <p className="text-[11px] text-destructive/80">{settings.pause_reason}</p>}
            </div>
          </div>
        )}

        {activeTab === 'templates' && <EmailTemplatesTab />}
        {activeTab === 'sequences' && <EmailSequencesTab />}
        {activeTab === 'sends' && <EmailSendsTab />}
        {activeTab === 'settings' && <EmailSettingsTab onSettingsChange={setSettings} />}
      </div>
    </PageContainer>
  )
}
