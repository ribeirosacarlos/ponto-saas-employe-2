import { useMemo, useRef, useState } from 'react'
import { Download, Eye, FileText, Menu, RotateCcw, Upload, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { useToast } from '../components/ui/use-toast'
import { cn } from '../lib/utils'

const DOCUMENTS = [
  {
    id: 'payroll-nov',
    title: 'Folha de pagamento - Novembro/2025',
    category: 'payroll',
    status: 'available',
    size: '240 KB',
    type: 'PDF',
    updatedAt: '2025-11-30',
  },
  {
    id: 'course-onboarding',
    title: 'Onboarding de segurança',
    category: 'courses',
    status: 'pending',
    size: '1.2 MB',
    type: 'PDF',
    updatedAt: '2025-12-22',
  },
  {
    id: 'personal-address',
    title: 'Comprovante de endereço',
    category: 'personal',
    status: 'review',
    size: '520 KB',
    type: 'JPG',
    updatedAt: '2025-12-17',
  },
  {
    id: 'certificate-medical',
    title: 'Certificado médico',
    category: 'others',
    status: 'expired',
    size: '180 KB',
    type: 'PDF',
    updatedAt: '2025-10-01',
  },
  {
    id: 'course-lgpd',
    title: 'Treinamento LGPD',
    category: 'courses',
    status: 'available',
    size: '890 KB',
    type: 'PDF',
    updatedAt: '2025-11-12',
  },
  {
    id: 'payroll-oct',
    title: 'Folha de pagamento - Outubro/2025',
    category: 'payroll',
    status: 'available',
    size: '228 KB',
    type: 'PDF',
    updatedAt: '2025-10-31',
  },
]

const CATEGORY_TABS = ['all', 'payroll', 'courses', 'personal', 'others']

const STATUS_SEGMENTS = ['all', 'available', 'pending', 'review', 'expired']

const STATUS_STYLES = {
  available: 'border-emerald-200 bg-emerald-500/10 text-emerald-700',
  pending: 'border-amber-200 bg-amber-500/10 text-amber-600',
  review: 'border-sky-200 bg-sky-500/10 text-sky-600',
  expired: 'border-rose-200 bg-rose-500/10 text-rose-600',
}

const RANGE_OPTIONS = ['last30', 'thisMonth', 'thisYear', 'custom']

const formatDate = (value, locale) =>
  new Date(value).toLocaleDateString(locale, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

export default function Documents({ sidebarOpen = false, onToggleSidebar = () => {} }) {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'all',
    range: 'last30',
    search: '',
  })
  const [dragActive, setDragActive] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState([])
  const fileInputRef = useRef(null)
  const hasFiles = selectedFiles.length > 0
  const dropZoneActive = dragActive || hasFiles

  const filteredDocuments = useMemo(() => {
    const now = new Date()
    return DOCUMENTS.filter((doc) => {
      if (filters.category !== 'all' && doc.category !== filters.category) return false
      if (filters.status !== 'all' && doc.status !== filters.status) return false
      if (filters.search) {
        const candidate = `${doc.title} ${doc.type}`.toLowerCase()
        if (!candidate.includes(filters.search.toLowerCase())) return false
      }

      if (filters.range === 'last30') {
        const diff = now.getTime() - new Date(doc.updatedAt).getTime()
        return diff <= 1000 * 60 * 60 * 24 * 30
      }
      if (filters.range === 'thisMonth') {
        const docDate = new Date(doc.updatedAt)
        return (
          docDate.getMonth() === now.getMonth() && docDate.getFullYear() === now.getFullYear()
        )
      }
      if (filters.range === 'thisYear') {
        return new Date(doc.updatedAt).getFullYear() === now.getFullYear()
      }
      return true
    })
  }, [filters])

  const handleHeroAction = (action) => {
    toast({
      title: t(`documentsPage.toasts.${action}.title`),
      description: t(`documentsPage.toasts.${action}.description`),
    })
  }

  const handleFiles = (files) => {
    if (!files?.length) return
    setSelectedFiles(Array.from(files))
  }

  const dropTitle = dropZoneActive
    ? t('documentsPage.upload.dropActiveTitle')
    : t('documentsPage.upload.dropTitle')
  const dropDescription = dropZoneActive
    ? t('documentsPage.upload.dropActiveDescription')
    : t('documentsPage.upload.dropDescription')

  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground transition-colors duration-300">
      <div className="pointer-events-none absolute inset-0 opacity-80">
        <div className="absolute left-[-5%] top-[-5%] h-64 w-64 rounded-full bg-primary/16 blur-[120px]" />
        <div className="absolute right-[-8%] top-1/4 h-72 w-72 rounded-full bg-sky-300/20 blur-[120px]" />
        <div className="absolute bottom-[-12%] right-[-10%] h-72 w-72 rounded-full bg-indigo-200/20 blur-[120px]" />
      </div>

      <div className="relative z-10 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6">
          <header className="rounded-[28px] border border-border/80 bg-card/90 px-5 py-6 shadow-[0_18px_90px_-60px_rgba(62,82,152,0.55)] backdrop-blur-2xl">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex flex-col gap-3">
                <div className="flex items-start gap-3">
                  <button
                    type="button"
                    aria-label={t('dashboardPage.header.toggleMenu')}
                    onClick={onToggleSidebar}
                    className="mt-1 inline-flex h-10 w-10 items-center justify-center rounded-full border border-border bg-muted text-foreground transition hover:bg-muted/80"
                  >
                    {sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </button>
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/15 text-primary">
                      <FileText className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        {t('documentsPage.tag')}
                      </p>
                      <h1 className="text-2xl font-semibold leading-tight">{t('documentsPage.title')}</h1>
                      <p className="text-sm text-muted-foreground">{t('documentsPage.subtitle')}</p>
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <span className="rounded-full border border-border px-3 py-1 text-[11px] text-muted-foreground">
                    {t('documentsPage.helper.between')}
                  </span>
                  <span className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] text-primary">
                    {t('documentsPage.helper.badge')}
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-start gap-3 lg:justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleHeroAction('exportCsv')}
                  className="rounded-full border-border bg-background/80 px-4 text-sm font-semibold"
                >
                  <Download className="mr-2 h-4 w-4 text-primary" />
                  {t('documentsPage.actions.exportCsv')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => handleHeroAction('exportPdf')}
                  className="rounded-full border-border bg-background/80 px-4 text-sm font-semibold"
                >
                  <FileText className="mr-2 h-4 w-4 text-primary" />
                  {t('documentsPage.actions.exportPdf')}
                </Button>
              </div>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-[320px_1fr]">
          <div className="space-y-4">
            <div className="rounded-3xl border border-border/80 bg-card/90 p-4 shadow-[0_25px_80px_-60px_rgba(62,82,152,0.55)]">
              <div className="flex flex-col gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted/70 text-foreground">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{t('documentsPage.upload.title')}</p>
                    <p className="text-xs text-muted-foreground">{t('documentsPage.upload.description')}</p>
                  </div>
                </div>
                <span className="self-start rounded-full border border-emerald-200/80 bg-emerald-50 px-3 py-1 text-[11px] font-semibold text-emerald-700">
                  {t('documentsPage.upload.fileTypes')}
                </span>
              </div>

              <div className="mt-4 space-y-3">
                <label className="text-[11px] font-semibold text-muted-foreground">
                  {t('documentsPage.upload.category')}
                </label>
                <select
                  className="w-full rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-sm text-foreground focus:border-primary focus:ring-2 focus:ring-primary/40 focus:ring-offset-0"
                >
                  <option>{t('documentsPage.tabs.payroll')}</option>
                  <option>{t('documentsPage.tabs.courses')}</option>
                  <option>{t('documentsPage.tabs.personal')}</option>
                  <option>{t('documentsPage.tabs.others')}</option>
                </select>

                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept=".pdf,.jpg,.jpeg,.png"
                  className="hidden"
                  onChange={(event) => handleFiles(event.target.files)}
                />

                <div
                  className={cn(
                    'flex flex-col gap-4 rounded-[24px] border border-dashed px-4 py-4 transition',
                    dropZoneActive
                      ? 'border-primary bg-primary/10'
                      : 'border-border/70 bg-background/70',
                  )}
                  role="button"
                  tabIndex={0}
                  onDragOver={(event) => {
                    event.preventDefault()
                    setDragActive(true)
                  }}
                  onDragEnter={(event) => {
                    event.preventDefault()
                    setDragActive(true)
                  }}
                  onDragLeave={(event) => {
                    event.preventDefault()
                    setDragActive(false)
                  }}
                  onDrop={(event) => {
                    event.preventDefault()
                    setDragActive(false)
                    handleFiles(event.dataTransfer?.files)
                  }}
                  onClick={() => fileInputRef.current?.click()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault()
                      fileInputRef.current?.click()
                    }
                  }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        'flex h-12 w-12 items-center justify-center rounded-2xl border text-muted-foreground',
                        dropZoneActive
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border/70 bg-muted/60',
                      )}
                    >
                      <Upload className="h-5 w-5" />
                    </div>
                    <div className="flex-1 space-y-2 text-xs text-muted-foreground">
                      <strong className="block text-sm text-foreground">{dropTitle}</strong>
                      <p>{dropDescription}</p>
                      {hasFiles && selectedFiles.length > 0 ? (
                        <p className="text-[12px] font-semibold text-foreground/80">
                          {selectedFiles[0].name}
                        </p>
                      ) : null}
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="mt-2 w-full rounded-full border border-border/60 px-6 py-4 text-sm font-semibold text-foreground sm:w-auto"
                        onClick={(event) => {
                          event.stopPropagation()
                          fileInputRef.current?.click()
                        }}
                      >
                        {t('documentsPage.upload.browse')}
                      </Button>
                    </div>
                  </div>
                  {hasFiles && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full rounded-full border-emerald-200 bg-emerald-50 px-5 py-3 text-[13px] font-semibold text-emerald-700 shadow-[0_10px_25px_-18px_rgba(16,185,129,0.95)] sm:w-auto"
                      onClick={(event) => {
                        event.stopPropagation()
                        toast({
                          title: t('documentsPage.toasts.uploadReady.title'),
                          description: t('documentsPage.toasts.uploadReady.description'),
                        })
                        setSelectedFiles([])
                      }}
                    >
                      {t('documentsPage.upload.send')}
                    </Button>
                  )}
                  <p className="text-[11px] text-muted-foreground">{t('documentsPage.upload.tip')}</p>
                </div>
              </div>
            </div>
          </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-border/80 bg-card/90 p-4 shadow-[0_25px_80px_-60px_rgba(62,82,152,0.55)]">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                      <FileText className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        {t('documentsPage.table.label')}
                      </p>
                      <h2 className="text-sm font-semibold">{t('documentsPage.table.title')}</h2>
                    </div>
                  </div>
                  <div className="flex flex-col gap-3 lg:flex-1 lg:flex-row lg:items-center">
                    <Input
                      placeholder={t('documentsPage.table.search')}
                      value={filters.search}
                      className="lg:flex-1"
                      onChange={(event) =>
                        setFilters((prev) => ({ ...prev, search: event.target.value }))
                      }
                    />
                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      {CATEGORY_TABS.slice(1).map((category) => (
                        <button
                          key={category}
                          type="button"
                          className={cn(
                            'rounded-full border px-3 py-2 text-[11px] font-semibold transition',
                            filters.category === category
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border/60 bg-background/60 text-muted-foreground hover:border-border/80',
                          )}
                          onClick={() => setFilters((prev) => ({ ...prev, category }))}
                        >
                          {t(`documentsPage.tabs.${category}`)}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {STATUS_SEGMENTS.slice(1).map((segment) => (
                    <button
                      key={segment}
                      type="button"
                      className={cn(
                        'rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] transition',
                        filters.status === segment
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border/60 bg-background/60 text-muted-foreground hover:border-border/80',
                      )}
                      onClick={() => setFilters((prev) => ({ ...prev, status: segment }))}
                    >
                      {t(`documentsPage.status.${segment}`)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3 md:hidden">
                {filteredDocuments.length === 0 ? (
                  <div className="rounded-3xl border border-border/70 bg-card/90 px-4 py-8 text-center text-sm text-muted-foreground shadow-[0_30px_90px_-60px_rgba(62,82,152,0.55)]">
                    {t('documentsPage.table.empty')}
                  </div>
                ) : (
                  filteredDocuments.map((doc) => (
                    <div
                      key={doc.id}
                      className="rounded-3xl border border-border/70 bg-card/95 p-4 shadow-[0_30px_90px_-70px_rgba(62,82,152,0.45)]"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold leading-snug">{doc.title}</p>
                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {doc.type} • {doc.size}
                          </p>
                        </div>
                        <span
                          className={cn(
                            'inline-flex shrink-0 items-center justify-center rounded-full border px-3 py-1 text-[11px]',
                            STATUS_STYLES[doc.status] || 'border-border/60 text-muted-foreground',
                          )}
                        >
                          {t(`documentsPage.status.${doc.status}`)}
                        </span>
                      </div>

                      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted-foreground">
                        <span>
                          {t(`documentsPage.tabs.${doc.category}`)} • {formatDate(doc.updatedAt, i18n.language)}
                        </span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted active:scale-[0.98]"
                            title={t('documentsPage.actions.view')}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted active:scale-[0.98]"
                            title={t('documentsPage.actions.download')}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {doc.status === 'expired' && (
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted active:scale-[0.98]"
                              title={t('documentsPage.actions.renew')}
                            >
                              <RotateCcw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="hidden md:block rounded-[32px] border border-border/70 bg-card/95 shadow-[0_30px_90px_-60px_rgba(62,82,152,0.55)]">
                <div className="overflow-x-auto">
                  <div className="min-w-[860px]">
                    <div className="grid text-[11px] text-muted-foreground">
                      <div className="grid grid-cols-[minmax(260px,1.4fr)_minmax(120px,.8fr)_minmax(150px,.9fr)_minmax(150px,.9fr)_minmax(120px,.7fr)] gap-3 rounded-t-3xl border-b border-border/70 bg-background/80 px-4 py-3 font-semibold uppercase tracking-[0.18em]">
                        <span>{t('documentsPage.table.headers.document')}</span>
                        <span>{t('documentsPage.table.headers.type')}</span>
                        <span>{t('documentsPage.table.headers.status')}</span>
                        <span>{t('documentsPage.table.headers.date')}</span>
                        <span className="text-right">{t('documentsPage.table.headers.action')}</span>
                      </div>
                    </div>

                    <div className="divide-y divide-border/60">
                      {filteredDocuments.length === 0 ? (
                        <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                          {t('documentsPage.table.empty')}
                        </div>
                      ) : (
                        filteredDocuments.map((doc) => (
                          <div
                            key={doc.id}
                            className="grid grid-cols-[minmax(260px,1.4fr)_minmax(120px,.8fr)_minmax(150px,.9fr)_minmax(150px,.9fr)_minmax(120px,.7fr)] items-center gap-3 px-4 py-4 text-sm text-foreground"
                          >
                            <div className="space-y-1">
                              <strong className="block">{doc.title}</strong>
                              <span className="text-[11px] text-muted-foreground">
                                {doc.type} • {doc.size}
                              </span>
                            </div>
                            <span>{t(`documentsPage.tabs.${doc.category}`)}</span>
                            <span
                              className={cn(
                                'inline-flex items-center justify-center rounded-full border px-3 py-1 text-[11px]',
                                STATUS_STYLES[doc.status] || 'border-border/60 text-muted-foreground',
                              )}
                            >
                              {t(`documentsPage.status.${doc.status}`)}
                            </span>
                            <span>{formatDate(doc.updatedAt, i18n.language)}</span>
                            <div className="flex justify-end gap-2">
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted active:scale-[0.98]"
                                title={t('documentsPage.actions.view')}
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                              <button
                                type="button"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted active:scale-[0.98]"
                                title={t('documentsPage.actions.download')}
                              >
                                <Download className="h-4 w-4" />
                              </button>
                              {doc.status === 'expired' && (
                                <button
                                  type="button"
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted active:scale-[0.98]"
                                  title={t('documentsPage.actions.renew')}
                                >
                                  <RotateCcw className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  )
}
