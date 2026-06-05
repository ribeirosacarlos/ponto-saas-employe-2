import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Building2,
  CreditCard,
  FileSignature,
  Globe2,
  Palette,
  Settings2,
  Shield,
  User,
} from 'lucide-react'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/useAuth'
import { ProfileSection } from '@/components/employee-profile/ProfileSection'
import { SecuritySection } from '@/components/employee-profile/SecuritySection'
import { AppearanceSection } from '@/components/employee-profile/AppearanceSection'
import { PlanSection } from '@/components/settings/PlanSection'
import { PreferencesSection } from '@/components/settings/PreferencesSection'
import { CompanyInfoSection } from '@/components/settings/CompanyInfoSection'
import { SignaturesSection } from '@/components/settings/SignaturesSection'
import { LocaleSection } from '@/components/settings/LocaleSection'

const PERSONAL_SECTIONS = [
  {
    id: 'profile',
    labelKey: 'settingsUnified.nav.profile',
    defaultLabel: 'Perfil',
    icon: User,
    component: ProfileSection,
  },
  {
    id: 'security',
    labelKey: 'settingsUnified.nav.security',
    defaultLabel: 'Segurança',
    icon: Shield,
    component: SecuritySection,
  },
  {
    id: 'appearance',
    labelKey: 'settingsUnified.nav.appearance',
    defaultLabel: 'Aparência',
    icon: Palette,
    component: AppearanceSection,
  },
]

const ADMIN_SECTIONS = [
  {
    id: 'company-info',
    labelKey: 'settingsUnified.nav.companyInfo',
    defaultLabel: 'Informações',
    icon: Building2,
    component: CompanyInfoSection,
  },
  {
    id: 'preferences',
    labelKey: 'settingsUnified.nav.preferences',
    defaultLabel: 'Preferências',
    icon: Settings2,
    component: PreferencesSection,
  },
  {
    id: 'signatures',
    labelKey: 'settingsUnified.nav.signatures',
    defaultLabel: 'Assinaturas',
    icon: FileSignature,
    component: SignaturesSection,
  },
  {
    id: 'locale',
    labelKey: 'settingsUnified.nav.locale',
    defaultLabel: 'Locale',
    icon: Globe2,
    component: LocaleSection,
  },
  {
    id: 'plan',
    labelKey: 'settingsUnified.nav.plan',
    defaultLabel: 'Plano',
    icon: CreditCard,
    component: PlanSection,
  },
]

const ADMIN_ROLES = ['admin', 'super_admin']

function NavItem({ section, isActive, onClick }) {
  const { t } = useTranslation()
  const Icon = section.icon

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left transition-colors',
        isActive
          ? 'bg-primary/10 text-primary'
          : 'text-muted-foreground hover:bg-muted/60 hover:text-foreground',
      )}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" />
      <span className="text-[13px] font-medium">
        {t(section.labelKey, { defaultValue: section.defaultLabel })}
      </span>
    </button>
  )
}

export default function SettingsPage() {
  const { t } = useTranslation()
  const roles = useAuthStore((state) => state.roles)

  const isAdmin = useMemo(
    () => Array.isArray(roles) && roles.some((r) => ADMIN_ROLES.includes(r)),
    [roles],
  )

  const allSections = useMemo(
    () => (isAdmin ? [...PERSONAL_SECTIONS, ...ADMIN_SECTIONS] : PERSONAL_SECTIONS),
    [isAdmin],
  )

  const [activeSection, setActiveSection] = useState('profile')

  const ActiveComponent =
    allSections.find((s) => s.id === activeSection)?.component ?? ProfileSection

  return (
    <div className="w-full px-4 sm:px-6 pb-10 pt-4 sm:pt-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {t('settingsUnified.title', { defaultValue: 'Configurações' })}
        </h1>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t('settingsUnified.subtitle', {
            defaultValue: 'Gerencie suas preferências e informações pessoais.',
          })}
        </p>
      </div>

      <div className="flex gap-0 rounded-[22px] border border-border/70 bg-card/75 shadow-[0_18px_60px_-35px_rgba(92,134,255,0.20)] backdrop-blur-xl overflow-hidden">
        {/* Sidebar de navegação */}
        <nav className="flex w-48 shrink-0 flex-col border-r border-border/70 p-3">
          <div className="flex flex-col gap-0.5">
            <p className="mb-1 px-3 pt-1 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
              {t('settingsUnified.nav.personalGroup', { defaultValue: 'Pessoal' })}
            </p>
            {PERSONAL_SECTIONS.map((section) => (
              <NavItem
                key={section.id}
                section={section}
                isActive={activeSection === section.id}
                onClick={() => setActiveSection(section.id)}
              />
            ))}
          </div>

          {isAdmin && (
            <div className="mt-3 flex flex-col gap-0.5">
              <Separator className="mb-3" />
              <p className="mb-1 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground/70">
                {t('settingsUnified.nav.companyGroup', { defaultValue: 'Empresa' })}
              </p>
              {ADMIN_SECTIONS.map((section) => (
                <NavItem
                  key={section.id}
                  section={section}
                  isActive={activeSection === section.id}
                  onClick={() => setActiveSection(section.id)}
                />
              ))}
            </div>
          )}
        </nav>

        {/* Conteúdo da seção ativa */}
        <div className="flex-1 p-6 sm:p-8 min-w-0 overflow-auto">
          <div className="mx-auto max-w-2xl">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  )
}
