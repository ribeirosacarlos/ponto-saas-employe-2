import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { cn } from '@/lib/utils'
import { ProfileSection } from '@/components/employee-profile/ProfileSection'
import { SecuritySection } from '@/components/employee-profile/SecuritySection'
import { AppearanceSection } from '@/components/employee-profile/AppearanceSection'
import { User, Shield, Palette } from 'lucide-react'

const SECTIONS = [
  {
    id: 'profile',
    labelKey: 'profilePage.nav.profile',
    defaultLabel: 'Perfil',
    icon: User,
    component: ProfileSection,
  },
  {
    id: 'security',
    labelKey: 'profilePage.nav.security',
    defaultLabel: 'Segurança',
    icon: Shield,
    component: SecuritySection,
  },
  {
    id: 'appearance',
    labelKey: 'profilePage.nav.appearance',
    defaultLabel: 'Aparência',
    icon: Palette,
    component: AppearanceSection,
  },
]

function SettingsNavItem({ section, isActive, onClick }) {
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
      <Icon className="h-4 w-4 shrink-0" />
      <span className="text-[12px] font-medium">
        {t(section.labelKey, { defaultValue: section.defaultLabel })}
      </span>
    </button>
  )
}

export default function EmployeeProfilePage() {
  const { t } = useTranslation()
  const [activeSection, setActiveSection] = useState('profile')

  const ActiveComponent = SECTIONS.find((s) => s.id === activeSection)?.component ?? ProfileSection

  return (
    <div className="w-full px-4 sm:px-6 pb-10 pt-4 sm:pt-6">
      {/* Header da página */}
      <div className="mb-6">
        <h1 className="text-lg font-semibold tracking-tight text-foreground">
          {t('profilePage.title', { defaultValue: 'Configurações' })}
        </h1>
        <p className="mt-0.5 text-[12px] text-muted-foreground">
          {t('profilePage.subtitle', {
            defaultValue: 'Gerencie suas preferências e informações pessoais.',
          })}
        </p>
      </div>

      {/* Layout de dois painéis */}
      <div className="flex gap-0 rounded-[22px] border border-border/70 bg-card/75 shadow-[0_18px_60px_-35px_rgba(92,134,255,0.20)] backdrop-blur-xl overflow-hidden">
        {/* Sidebar de navegação */}
        <nav className="flex w-44 shrink-0 flex-col gap-1 border-r border-border/70 p-4">
          {SECTIONS.map((section) => (
            <SettingsNavItem
              key={section.id}
              section={section}
              isActive={activeSection === section.id}
              onClick={() => setActiveSection(section.id)}
            />
          ))}
        </nav>

        {/* Conteúdo da seção ativa */}
        <div className="flex-1 p-6 sm:p-8 min-w-0">
          <div className="mx-auto max-w-2xl">
            <ActiveComponent />
          </div>
        </div>
      </div>
    </div>
  )
}
