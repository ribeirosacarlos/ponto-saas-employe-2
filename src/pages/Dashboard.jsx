import { useEffect, useMemo, useState } from 'react'
import { format, isSameDay } from 'date-fns'
import { useTranslation } from 'react-i18next'
import { Bell, CalendarDays, Clock3, FileText, GraduationCap, Home, IdCard, ListChecks, Menu, Search, Settings, Users, X } from 'lucide-react'
import { useToast } from '../components/ui/use-toast'
import { Button } from '../components/ui/button'
import { requestAdjustment } from '../lib/api'
import { useAuthStore } from '../store/useAuth'
import { LanguageSwitcher } from '../components/LanguageSwitcher'
import { AjusteModal } from '../components/AjusteModal'
import { useClocking } from '../features/ponto/useClocking'
import { EmployeeDocumentsCard } from '../components/EmployeeDocumentsCard'
import { ThemeToggle } from '../components/ThemeToggle'
import { AnnouncementsCard } from '../components/AnnouncementsCard'
import { TimeOffCard } from '../components/TimeOffCard'
import { UserProfileDropdown } from '../components/UserProfileDropdown'
export default function Dashboard() {
  const user = useAuthStore((state) => state.user)
  const token = useAuthStore((state) => state.token)
  const logout = useAuthStore((state) => state.logout)
  const { toast } = useToast()
  const { entries, loadingEntries, refreshEntries } = useClocking()
  const [sendingAdjustment, setSendingAdjustment] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const { t, i18n } = useTranslation()

  const todaysEntries = useMemo(
    () =>
      entries.filter((entry) => entry.clocked_at && isSameDay(new Date(entry.clocked_at), new Date())),
    [entries],
  )

  const todayLabel = useMemo(() => {
    const label = new Date().toLocaleDateString(i18n.language, { day: '2-digit', month: 'long' })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }, [i18n.language])

  const daySummaries = useMemo(() => {
    const grouped = entries.reduce((acc, entry) => {
      if (!entry.clocked_at) return acc
      const key = format(new Date(entry.clocked_at), 'yyyy-MM-dd')
      acc[key] = acc[key] ? [...acc[key], entry] : [entry]
      return acc
    }, {})

    return Object.entries(grouped)
      .map(([dateKey, items]) => {
        const sorted = [...items].sort(
          (a, b) => new Date(a.clocked_at).getTime() - new Date(b.clocked_at).getTime(),
        )
        let firstIn = null
        let lastOut = null
        let lastIn = null
        let totalMs = 0

        sorted.forEach((item) => {
          const ts = new Date(item.clocked_at).getTime()
          if (item.type === 'in') {
            lastIn = ts
            if (!firstIn) firstIn = ts
          } else if (item.type === 'out' && lastIn) {
            totalMs += ts - lastIn
            lastOut = ts
            lastIn = null
          }
        })

        const totalMinutes = Math.max(0, Math.round(totalMs / 60000))
        const status = totalMinutes >= 540 ? 'extra' : totalMinutes >= 480 ? 'normal' : 'late'

        return { dateKey, firstIn, lastOut, totalMinutes, status }
      })
      .sort((a, b) => new Date(b.dateKey).getTime() - new Date(a.dateKey).getTime())
  }, [entries])

  const recentDays = useMemo(() => daySummaries.slice(0, 3), [daySummaries])

  const monthlyStats = useMemo(() => {
    const now = new Date()
    let totalMinutes = 0
    let workedDays = 0

    daySummaries.forEach((day) => {
      const current = new Date(day.dateKey)
      if (current.getMonth() === now.getMonth() && current.getFullYear() === now.getFullYear()) {
        totalMinutes += day.totalMinutes
        workedDays += 1
      }
    })

    const expectedMinutes = workedDays * 8 * 60
    const extraMinutes = Math.max(0, totalMinutes - expectedMinutes)

    return {
      totalHoursLabel: `${Math.round(totalMinutes / 60)}h`,
      extraHoursLabel: `${Math.round(extraMinutes / 60)}h`,
    }
  }, [daySummaries])

  const formatDuration = (minutes) => {
    const hrs = String(Math.floor(minutes / 60)).padStart(2, '0')
    const mins = String(minutes % 60).padStart(2, '0')
    return `${hrs}:${mins}`
  }

  const formatDayLabel = (dateKey) => {
    const label = new Date(dateKey).toLocaleDateString(i18n.language, {
      weekday: 'long',
      day: '2-digit',
      month: 'short',
    })
    return label.charAt(0).toUpperCase() + label.slice(1)
  }

  const statusTone = {
    normal:
      'border-emerald-200/80 bg-emerald-500/12 text-emerald-700 dark:border-emerald-400/50 dark:bg-emerald-500/15 dark:text-emerald-100',
    extra:
      'border-amber-200/80 bg-amber-500/12 text-amber-700 dark:border-amber-400/50 dark:bg-amber-500/15 dark:text-amber-100',
    late:
      'border-rose-200/80 bg-rose-500/12 text-rose-700 dark:border-rose-400/50 dark:bg-rose-500/15 dark:text-rose-100',
  }

  const documentSections = useMemo(
    () => [
      {
        id: 'payroll',
        title: t('dashboardPage.documents.sections.payroll.title'),
        description: t('dashboardPage.documents.sections.payroll.description'),
        icon: FileText,
        accent: 'emerald',
        items: [
          {
            name: t('dashboardPage.documents.sections.payroll.items.current.name'),
            status: t('dashboardPage.documents.sections.payroll.items.current.status'),
            updatedAt: t('dashboardPage.documents.sections.payroll.items.current.updatedAt'),
            actionLabel: t('dashboardPage.documents.sections.payroll.items.current.action'),
          },
          {
            name: t('dashboardPage.documents.sections.payroll.items.previous.name'),
            status: t('dashboardPage.documents.sections.payroll.items.previous.status'),
            updatedAt: t('dashboardPage.documents.sections.payroll.items.previous.updatedAt'),
            actionLabel: t('dashboardPage.documents.sections.payroll.items.previous.action'),
          },
        ],
      },
      {
        id: 'courses',
        title: t('dashboardPage.documents.sections.courses.title'),
        description: t('dashboardPage.documents.sections.courses.description'),
        icon: GraduationCap,
        accent: 'indigo',
        items: [
          {
            name: t('dashboardPage.documents.sections.courses.items.onboarding.name'),
            status: t('dashboardPage.documents.sections.courses.items.onboarding.status'),
            updatedAt: t('dashboardPage.documents.sections.courses.items.onboarding.updatedAt'),
            actionLabel: t('dashboardPage.documents.sections.courses.items.onboarding.action'),
          },
          {
            name: t('dashboardPage.documents.sections.courses.items.lgpd.name'),
            status: t('dashboardPage.documents.sections.courses.items.lgpd.status'),
            updatedAt: t('dashboardPage.documents.sections.courses.items.lgpd.updatedAt'),
            actionLabel: t('dashboardPage.documents.sections.courses.items.lgpd.action'),
          },
        ],
      },
      {
        id: 'personal',
        title: t('dashboardPage.documents.sections.personal.title'),
        description: t('dashboardPage.documents.sections.personal.description'),
        icon: IdCard,
        accent: 'amber',
        items: [
          {
            name: t('dashboardPage.documents.sections.personal.items.address.name'),
            status: t('dashboardPage.documents.sections.personal.items.address.status'),
            updatedAt: t('dashboardPage.documents.sections.personal.items.address.updatedAt'),
            actionLabel: t('dashboardPage.documents.sections.personal.items.address.action'),
          },
          {
            name: t('dashboardPage.documents.sections.personal.items.rg.name'),
            status: t('dashboardPage.documents.sections.personal.items.rg.status'),
            updatedAt: t('dashboardPage.documents.sections.personal.items.rg.updatedAt'),
            actionLabel: t('dashboardPage.documents.sections.personal.items.rg.action'),
          },
          {
            name: t('dashboardPage.documents.sections.personal.items.workCard.name'),
            status: t('dashboardPage.documents.sections.personal.items.workCard.status'),
            updatedAt: t('dashboardPage.documents.sections.personal.items.workCard.updatedAt'),
            actionLabel: t('dashboardPage.documents.sections.personal.items.workCard.action'),
          },
        ],
      },
    ],
    [t],
  )

  const announcements = useMemo(
    () => [
      {
        id: 'hybrid',
        title: t('dashboardPage.announcements.items.hybrid.title'),
        body: t('dashboardPage.announcements.items.hybrid.body'),
        sentAt: t('dashboardPage.announcements.items.hybrid.sentAt'),
        status: 'pending',
      },
      {
        id: 'security',
        title: t('dashboardPage.announcements.items.security.title'),
        body: t('dashboardPage.announcements.items.security.body'),
        sentAt: t('dashboardPage.announcements.items.security.sentAt'),
        status: 'seen',
        viewedAt: t('dashboardPage.announcements.items.security.viewedAt'),
      },
    ],
    [t],
  )

  const timeOffSummary = useMemo(
    () => ({
      availableDays: 12,
      nextVacation: t('dashboardPage.timeOff.nextVacationValue'),
      statusKey: 'approved',
      status: t('dashboardPage.timeOff.statusValue.approved'),
      absences: t('dashboardPage.timeOff.absencesValue', { count: 0 }),
    }),
    [t],
  )

  useEffect(() => {
    if (!token) return
    refreshEntries()
  }, [refreshEntries, token])

  const handleAdjustment = async (form, closeModal, resetForm) => {
    setSendingAdjustment(true)
    try {
      await requestAdjustment(form)
      toast({
        title: t('toast.adjustmentSuccess.title'),
        description: t('toast.adjustmentSuccess.description'),
        variant: 'success',
      })
      closeModal()
      resetForm()
    } catch (error) {
      toast({
        title: t('toast.adjustmentError.title'),
        description: error.response?.data?.message || t('toast.adjustmentError.description'),
        variant: 'error',
      })
    } finally {
      setSendingAdjustment(false)
    }
  }

  const handleLogout = async () => {
    await logout()
    toast({
      title: t('toast.logout.title'),
      description: t('toast.logout.description'),
    })
  }

  const handleViewFullHistory = () => {
    toast({
      title: t('dashboardPage.toasts.fullHistory.title'),
      description: t('dashboardPage.toasts.fullHistory.description'),
    })
  }

  const handleDocumentAction = (item) => {
    toast({
      title: t('dashboardPage.toasts.documentAction.title'),
      description: t('dashboardPage.toasts.documentAction.description', {
        action: item.actionLabel || t('dashboardPage.toasts.documentAction.defaultAction'),
        name: item.name,
      }),
    })
  }

  const handleViewAllDocuments = () => {
    toast({
      title: t('dashboardPage.toasts.documents.title'),
      description: t('dashboardPage.toasts.documents.description'),
    })
  }

  const handleProfile = () => {
    toast({
      title: t('dashboardPage.toasts.profile.title'),
      description: t('dashboardPage.toasts.profile.description'),
    })
  }

  const handleHelp = () => {
    toast({
      title: t('dashboardPage.toasts.help.title'),
      description: t('dashboardPage.toasts.help.description'),
    })
  }

  const handleViewAllTimeOff = () => {
    toast({
      title: t('dashboardPage.toasts.timeOff.title'),
      description: t('dashboardPage.toasts.timeOff.description'),
    })
  }

  const handleRequestVacation = () => {
    toast({
      title: t('dashboardPage.toasts.vacation.title'),
      description: t('dashboardPage.toasts.vacation.description'),
    })
  }

  const handleViewAllAnnouncements = () => {
    toast({
      title: t('dashboardPage.toasts.announcements.title'),
      description: t('dashboardPage.toasts.announcements.description'),
    })
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <div className="min-h-screen flex flex-col md:flex-row">
        {sidebarOpen && (
          <button
            className="fixed inset-0 z-30 bg-black/30 md:hidden"
            aria-label={t('dashboardPage.header.closeMenu')}
            onClick={() => setSidebarOpen(false)}
            type="button"
          />
        )}
        <aside
          className={`fixed md:static inset-y-0 left-0 z-40 flex w-64 shrink-0 flex-col border-r border-border/70 bg-card/95 px-5 py-6 text-foreground shadow-[0_24px_70px_-42px_rgba(62,82,152,0.35)] backdrop-blur-xl transition-transform duration-300 ${
            sidebarOpen ? 'translate-x-0 md:translate-x-0 md:ml-0' : '-translate-x-full md:-translate-x-full md:-ml-64'
          } md:flex`}
        >
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary text-sm font-semibold tracking-tight text-primary-foreground shadow-inner shadow-primary/35">
                HR
              </div>
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] font-semibold tracking-[0.25em] uppercase text-muted-foreground">Synergy</span>
                <span className="text-[11px] text-muted-foreground">HR Management</span>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1 text-[12px] lg:text-[13px]">
            {[
              { label: t('dashboardPage.nav.dashboard'), icon: Home, active: true, badge: t('dashboardPage.badges.today') },
              { label: t('dashboardPage.nav.calendar'), icon: CalendarDays },
              { label: t('dashboardPage.nav.timeOff'), icon: Clock3 },
              { label: t('dashboardPage.nav.projects'), icon: ListChecks },
              { label: t('dashboardPage.nav.team'), icon: Users },
              { label: t('dashboardPage.nav.settings'), icon: Settings },
            ].map((item) => {
              const Icon = item.icon
              return (
                <button
                  key={item.label}
                  className={`w-full flex items-center justify-between rounded-2xl px-3 py-2.5 transition ${
                    item.active
                      ? 'bg-primary text-primary-foreground font-semibold shadow-[0_18px_40px_-24px_rgba(62,82,152,0.55)]'
                      : 'text-foreground/80 hover:bg-muted/80 hover:text-foreground'
                  }`}
                  type="button"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-muted text-foreground">
                      <Icon className="h-4 w-4" />
                    </span>
                    <span>{item.label}</span>
                  </div>
                  {item.badge ? (
                    <span className="rounded-full border border-primary/20 bg-primary/15 px-2 py-0.5 text-[10px] lg:text-[11px] text-primary-foreground/90">
                      {item.badge}
                    </span>
                  ) : null}
                </button>
              )
            })}
          </nav>

          <div className="mt-auto w-full space-y-3">
            <UserProfileDropdown user={user} onProfile={handleProfile} onHelp={handleHelp} onLogout={handleLogout} />
            <div className="flex items-center justify-between rounded-xl border border-border bg-muted/70 px-3 py-2 text-[10px] lg:text-[11px] text-muted-foreground">
              <span>{t('dashboardPage.version.label')}</span>
              <span>{t('dashboardPage.version.product')}</span>
            </div>
          </div>
        </aside>

        <main className="flex-1 flex flex-col min-w-0">
          <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 bg-card/90 px-4 py-4 shadow-[0_10px_45px_-30px_rgba(62,82,152,0.35)] backdrop-blur-lg sm:px-6 lg:px-8 sm:gap-4">
            <div className="flex-1 min-w-[220px] max-w-full sm:max-w-lg flex flex-col gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-border bg-muted text-foreground transition hover:bg-muted/80 md:h-10 md:w-10"
                  onClick={() => setSidebarOpen((prev) => !prev)}
                  aria-label={t('dashboardPage.header.toggleMenu')}
                  type="button"
                >
                  {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                </button>
                <h1 className="text-base font-semibold tracking-tight sm:text-lg md:text-xl">
                  {t('dashboardPage.title')}
                </h1>
                <span className="inline-flex items-center rounded-full border border-border bg-muted/70 px-2 py-0.5 text-[10px] text-muted-foreground sm:text-[11px]">
                  {t('dashboardPage.todayPill', { date: todayLabel })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="flex-1 flex items-center gap-2 rounded-2xl border border-border bg-muted/70 px-3 py-2 text-[12px] shadow-inner shadow-primary/5 sm:text-[13px]">
                  <Search className="h-4 w-4 text-muted-foreground" />
                  <input
                    type="text"
                    placeholder={t('dashboardPage.searchPlaceholder')}
                    className="w-full bg-transparent text-foreground outline-none placeholder:text-muted-foreground"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <button
                className="flex h-8 w-8 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground transition hover:bg-muted/80 hover:text-foreground sm:h-9 sm:w-9"
                type="button"
              >
                <Bell className="h-4 w-4" />
              </button>
              <LanguageSwitcher className="hidden sm:block" />
              <ThemeToggle />
            </div>
          </header>

          <div className="px-4 sm:px-6 lg:px-8 py-5 sm:py-6 space-y-6">
            <div className="grid gap-4 sm:gap-6 lg:grid-cols-2 auto-rows-fr">
              <section className="flex h-full flex-col gap-3 rounded-[24px] border border-border bg-card px-4 py-4 shadow-[0_14px_35px_rgba(62,82,152,0.08)] transition hover:shadow-[0_18px_45px_rgba(62,82,152,0.12)] sm:rounded-[28px] sm:px-6 sm:py-5 sm:gap-4">
                <header className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground sm:text-xs">
                      {t('dashboardPage.timeTracking.tag')}
                    </p>
                    <h2 className="text-sm font-semibold">{t('dashboardPage.timeTracking.title')}</h2>
                    <p className="mt-1 text-[10px] text-muted-foreground sm:text-[11px]">
                      {t('dashboardPage.timeTracking.subtitle', {
                        total: monthlyStats.totalHoursLabel,
                        extra: monthlyStats.extraHoursLabel,
                      })}
                    </p>
                  </div>
                </header>

                <div className="space-y-2 text-[11px] sm:text-[12px]">
                  {loadingEntries && (
                    <div className="space-y-2">
                      {[1, 2, 3].map((item) => (
                        <div key={item} className="h-14 rounded-2xl border border-border/40 bg-muted/50 animate-pulse" />
                      ))}
                    </div>
                  )}
                  {!loadingEntries && recentDays.length === 0 && (
                    <p className="text-sm text-muted-foreground">{t('dashboardPage.timeTracking.empty')}</p>
                  )}
                  {!loadingEntries &&
                    recentDays.map((day) => (
                      <div
                        key={day.dateKey}
                        className="flex items-center justify-between rounded-2xl border border-border bg-muted/70 px-3 py-2"
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">{formatDayLabel(day.dateKey)}</span>
                            <span className="text-muted-foreground">
                              {t('dashboardPage.timeTracking.interval', {
                                entryLabel: t('dashboardPage.timeTracking.entryLabel'),
                                exitLabel: t('dashboardPage.timeTracking.exitLabel'),
                                start: day.firstIn ? format(new Date(day.firstIn), 'HH:mm') : '--:--',
                                end: day.lastOut ? format(new Date(day.lastOut), 'HH:mm') : '--:--',
                              })}
                            </span>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-semibold sm:text-[11px]">
                              {formatDuration(day.totalMinutes)}
                            </span>
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-full border text-[9px] sm:text-[10px] font-medium ${
                              statusTone[day.status]
                            }`}
                          >
                            {t(`dashboardPage.timeTracking.status.${day.status}`)}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-3">
                  <Button
                    type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleViewFullHistory}
                  className="h-10 rounded-full border-border bg-background/80 px-3 text-[11px] font-semibold sm:text-xs"
                >
                  <Clock3 className="h-4 w-4 text-primary" />
                  {t('dashboardPage.timeTracking.actions.fullHistory')}
                </Button>
                <AjusteModal
                  onSubmit={handleAdjustment}
                  isSubmitting={sendingAdjustment}
                  trigger={
                    <Button type="button" className="h-10 rounded-full px-4 text-[11px] font-semibold sm:text-xs">
                        {t('dashboardPage.timeTracking.actions.adjust')}
                      </Button>
                    }
                  />
                </div>
              </section>

              <EmployeeDocumentsCard
                sections={documentSections}
                onViewAll={handleViewAllDocuments}
                onAction={handleDocumentAction}
                maxItemsPerSection={1}
              />

              <TimeOffCard summary={timeOffSummary} onRequest={handleRequestVacation} onViewAll={handleViewAllTimeOff} />

              <AnnouncementsCard announcements={announcements} onViewAll={handleViewAllAnnouncements} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
