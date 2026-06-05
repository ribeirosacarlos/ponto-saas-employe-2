import { useEffect, useMemo, useState } from 'react'
import { Download, Eye, FileText, RefreshCcw, Upload } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { actionIconButtonClass } from '../components/ui/form-controls'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { Input } from '../components/ui/input'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Select } from '../components/ui/select'
import { cn } from '../lib/utils'
import { useToast } from '../components/ui/use-toast'
import {
  downloadDocument,
  listMyDocuments,
  fetchDocumentBlob,
  resendDocument,
  trackDocumentView,
} from '../services/documentsService'
import { DocumentPreviewModal } from '../components/DocumentPreviewModal'

const CATEGORY_OPTIONS = [
  { value: 'all', labelKey: 'documentsPage.tabs.all' },
  { value: 'payroll', labelKey: 'documentsPage.tabs.payroll' },
  { value: 'courses', labelKey: 'documentsPage.tabs.courses' },
  { value: 'personal', labelKey: 'documentsPage.tabs.personal' },
  { value: 'others', labelKey: 'documentsPage.tabs.others' },
]

const STATUS_OPTIONS = [
  { value: 'all', labelKey: 'documentsPage.filters.segmented.all' },
  { value: 'pending', labelKey: 'documentsPage.status.pending' },
  { value: 'review', labelKey: 'documentsPage.status.review' },
  { value: 'available', labelKey: 'documentsPage.status.available' },
  { value: 'expired', labelKey: 'documentsPage.status.expired' },
]
const STATUS_TONES = {
  available: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
  pending: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
  review: 'border-sky-200/70 bg-sky-500/10 text-sky-700',
  expired: 'border-rose-200/70 bg-rose-500/10 text-rose-700',
}
const skeletonRows = Array.from({ length: 5 }).map((_, i) => i)

function Badge({ status, children }) {
  const tone = STATUS_TONES[status] || 'border-border/60 text-foreground'
  return (
    <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold', tone)}>
      {children}
    </span>
  )
}
const formatDate = (value, locale = 'pt-BR') => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function Documents() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()

  const [filters, setFilters] = useState({ category: 'all', status: 'all', search: '' })
  const [page, setPage] = useState(1)
  const [documents, setDocuments] = useState([])
  const [meta, setMeta] = useState({ currentPage: 1, total: 0, perPage: 10, lastPage: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [resendOpen, setResendOpen] = useState(false)
  const [resending, setResending] = useState(false)
  const [resendFile, setResendFile] = useState(null)
  const [resendTarget, setResendTarget] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewMime, setPreviewMime] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)

  const searchTerm = filters.search

  const loadDocuments = async (params = {}) => {
    setLoading(true)
    setError('')
    try {
      const { data, meta: responseMeta } = await listMyDocuments({
        page: params.page ?? page,
        category: params.category ?? filters.category,
        status: params.status ?? filters.status,
        search: params.search ?? searchTerm,
      })
      setDocuments(data)
      setMeta({
        currentPage: responseMeta.currentPage || 1,
        perPage: responseMeta.perPage || 10,
        total: responseMeta.total || data.length,
        lastPage: responseMeta.lastPage || 1,
      })
    } catch (err) {
      const message =
        err?.response?.data?.message || err.message || t('documentsPage.employee.toasts.loadErrorDescription')
      setError(message)
      toast({
        title: t('documentsPage.employee.toasts.loadErrorTitle'),
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDocuments({ page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    setPage(1)
    loadDocuments({ page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.status, searchTerm])

  const filteredCountLabel = useMemo(() => {
    if (!meta?.total) return ''
    return t('documentsPage.employee.listCount', { count: meta.total })
  }, [meta, t])

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || (meta.lastPage && nextPage > meta.lastPage)) return
    setPage(nextPage)
    loadDocuments({ page: nextPage })
  }

  const resolveDocumentError = (status, fallbackMessage, defaultKey) => {
    if (status === 401) return t('documentsPage.employee.errors.sessionExpired')
    if (status === 403) return t('documentsPage.employee.errors.noPermission')
    if (status === 404) return t('documentsPage.employee.errors.notFound')
    return fallbackMessage || t(defaultKey)
  }
  const handleDownload = async (doc) => {
    try {
      await downloadDocument(
        doc.id,
        `${doc.title || t('documentsPage.employee.fileFallback')}.${doc.extension || 'pdf'}`,
      )
    } catch (err) {
      toast({
        title: t('documentsPage.employee.toasts.downloadErrorTitle'),
        description:
          err?.response?.data?.message ||
          err?.message ||
          t('documentsPage.employee.toasts.downloadErrorDescription'),
        variant: 'destructive',
      })
    }
  }
  const handleView = (doc) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedDocument(doc)
    setPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewError('')
    trackDocumentView(doc.id).catch(() => {})
    fetchDocumentBlob(doc.id)
      .then(({ blob, mimeType }) => {
        const url = URL.createObjectURL(blob)
        setPreviewUrl(url)
        setPreviewMime(mimeType || '')
      })
      .catch((err) => {
        const status = err?.response?.status
        const message = resolveDocumentError(
          status,
          err?.message,
          'documentsPage.employee.errors.viewGeneric',
        )
        setPreviewError(message)
        toast({
          title: t('documentsPage.employee.toasts.viewErrorTitle'),
          description: message,
          variant: 'destructive',
        })
      })
      .finally(() => setPreviewLoading(false))
  }
  const openResendDialog = (doc) => {
    setResendTarget(doc)
    setResendFile(null)
    setResendOpen(true)
  }

  const handleResend = async (event) => {
    event?.preventDefault()
    if (!resendTarget?.id || !resendFile) {
      toast({
        title: t('documentsPage.employee.toasts.resendFileRequiredTitle'),
        description: t('documentsPage.employee.toasts.resendFileRequiredDescription'),
        variant: 'destructive',
      })
      return
    }

    setResending(true)
    try {
      await resendDocument(resendTarget.id, { file: resendFile })
      setResendOpen(false)
      setResendFile(null)
      setResendTarget(null)
      await loadDocuments({ page: 1 })
      setPage(1)
      toast({
        title: t('documentsPage.employee.toasts.resendSuccessTitle'),
        description: t('documentsPage.employee.toasts.resendSuccessDescription'),
      })
    } catch (err) {
      toast({
        title: t('documentsPage.employee.toasts.resendErrorTitle'),
        description: err?.response?.data?.message || err?.message || t('documentsPage.employee.toasts.resendErrorDescription'),
        variant: 'destructive',
      })
    } finally {
      setResending(false)
    }
  }

  const emptyState = !loading && documents.length === 0

  const handleDownloadFromPreview = async () => {
    if (!selectedDocument) return
    try {
      await downloadDocument(
        selectedDocument.id,
        `${selectedDocument.title || t('documentsPage.employee.fileFallback')}.${selectedDocument.extension || 'pdf'}`,
      )
    } catch (err) {
      const status = err?.response?.status
      const message = resolveDocumentError(
        status,
        err?.message,
        'documentsPage.employee.errors.downloadGeneric',
      )
      toast({
        title: t('documentsPage.employee.toasts.downloadErrorTitle'),
        description: message,
        variant: 'destructive',
      })
    }
  }
  const closePreview = (open) => {
    if (!open && previewUrl) {
      URL.revokeObjectURL(previewUrl)
      setPreviewUrl('')
    }
    setPreviewOpen(open)
    if (!open) {
      setPreviewError('')
      setPreviewMime('')
      setSelectedDocument(null)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-foreground">
      <PageContainer className="relative z-10 flex flex-col gap-5 py-6">
        <AppTopBar
          icon={<FileText className="h-5 w-5" />}
          eyebrow={t('documentsPage.tag')}
          title={t('documentsPage.employee.title')}
          subtitle={t('documentsPage.employee.subtitle')}
          filters={
            error ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/80 px-3 py-1 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
                {error}
              </div>
            ) : null
          }
          actions={
            <Button
              type="button"
              variant="outline"
              onClick={() => loadDocuments({ page })}
              className="rounded-full border-border bg-background/80 px-3 text-sm"
            >
              <RefreshCcw className="h-4 w-4 text-primary" />
              {t('documentsPage.employee.actions.refresh')}
            </Button>
          }
        />
        <section className="grid gap-4 rounded-[28px] border border-border/80 bg-card/90 p-5 shadow-[0_18px_90px_-60px_rgba(62,82,152,0.55)]">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
            <Input
              placeholder={t('documentsPage.employee.filters.searchPlaceholder')}
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
            <Select
              value={filters.category}
              onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </Select>
            <Select
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {t(opt.labelKey)}
                </option>
              ))}
            </Select>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{filteredCountLabel}</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => handlePageChange(page - 1)}
              >
                {t('documentsPage.employee.pagination.previous')}
              </Button>
              <span className="text-foreground">
                {meta.currentPage} / {meta.lastPage || 1}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={meta.lastPage ? page >= meta.lastPage : documents.length < meta.perPage}
                onClick={() => handlePageChange(page + 1)}
              >
                {t('documentsPage.employee.pagination.next')}
              </Button>
            </div>
          </div>

          <div className="space-y-3 md:hidden">
            {loading
              ? skeletonRows.map((key) => (
                  <div
                    key={key}
                    className="h-24 rounded-2xl border border-border/70 bg-muted/40 animate-pulse"
                  />
                ))
              : null}
            {emptyState ? (
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-6 text-center">
                <p className="text-sm text-muted-foreground">{t('documentsPage.employee.emptyState')}</p>
              </div>
            ) : null}
            {!loading &&
              documents.map((doc) => (
                <div
                  key={doc.id}
                  className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_30px_90px_-70px_rgba(62,82,152,0.45)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold leading-snug">{doc.title}</p>
                      <p className="mt-1 text-[11px] text-muted-foreground">
                        {doc.extension || t('documentsPage.employee.fileLabel')} - {doc.sizeLabel}
                      </p>
                    </div>
                    <Badge status={doc.status}>{t(`documentsPage.status.${doc.status}`, doc.status)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted-foreground">
                    <span>
                      {t(`documentsPage.tabs.${doc.category}`, doc.category)} - {formatDate(doc.updatedAt, i18n.language)}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className={actionIconButtonClass}
                        title={t('documentsPage.actions.view')}
                        onClick={() => handleView(doc)}
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className={actionIconButtonClass}
                        title={t('documentsPage.actions.download')}
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {doc.status === 'review' ? (
                        <button
                          type="button"
                          className={actionIconButtonClass}
                          title={t('documentsPage.employee.actions.resend')}
                          onClick={() => openResendDialog(doc)}
                        >
                          <Upload className="h-4 w-4" />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </div>
              ))}
          </div>

          <div className="hidden md:block rounded-[24px] border border-border/70 bg-card/95 shadow-[0_30px_90px_-60px_rgba(62,82,152,0.55)]">
            <div className="overflow-x-auto">
              <div className="min-w-[960px]">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_180px] gap-3 rounded-t-3xl border-b border-border/70 bg-background/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <span>{t('documentsPage.employee.table.headers.document')}</span>
                  <span>{t('documentsPage.employee.table.headers.category')}</span>
                  <span>{t('documentsPage.employee.table.headers.status')}</span>
                  <span>{t('documentsPage.employee.table.headers.type')}</span>
                  <span>{t('documentsPage.employee.table.headers.size')}</span>
                  <span className="text-right">{t('documentsPage.employee.table.headers.actions')}</span>
                </div>

                <div className="divide-y divide-border/60">
                  {loading
                    ? skeletonRows.map((key) => (
                        <div key={key} className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_180px] gap-3 px-4 py-4">
                          <div className="h-4 rounded bg-muted/50 animate-pulse" />
                          <div className="h-4 rounded bg-muted/50 animate-pulse" />
                          <div className="h-4 rounded bg-muted/50 animate-pulse" />
                          <div className="h-4 rounded bg-muted/50 animate-pulse" />
                          <div className="h-4 rounded bg-muted/50 animate-pulse" />
                          <div className="h-4 rounded bg-muted/50 animate-pulse" />
                        </div>
                      ))
                    : null}

                  {!loading && emptyState ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {t('documentsPage.employee.emptyState')}<br />
                    </div>
                  ) : null}

                  {!loading &&
                    documents.map((doc) => (
                      <div
                        key={doc.id}
                        className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_180px] items-center gap-3 px-4 py-4 text-sm"
                      >
                        <div className="space-y-1">
                          <strong className="block">{doc.title}</strong>
                          <span className="text-[12px] text-muted-foreground">
                            {t('documentsPage.employee.updatedAt', { date: formatDate(doc.updatedAt, i18n.language) })}
                          </span>
                        </div>
                        <span>{t(`documentsPage.tabs.${doc.category}`, doc.category)}</span>
                        <Badge status={doc.status}>{t(`documentsPage.status.${doc.status}`, doc.status)}</Badge>
                        <span>{doc.extension?.toUpperCase() || t('documentsPage.employee.fileLabel')}</span>
                        <span>{doc.sizeLabel}</span>
                        <div className="flex justify-end gap-2">
                          <button
                            type="button"
                            className={actionIconButtonClass}
                            title={t('documentsPage.actions.view')}
                            onClick={() => handleView(doc)}
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className={actionIconButtonClass}
                            title={t('documentsPage.actions.download')}
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          {doc.status === 'review' ? (
                            <button
                              type="button"
                              className={actionIconButtonClass}
                              title={t('documentsPage.employee.actions.resend')}
                              onClick={() => openResendDialog(doc)}
                            >
                              <Upload className="h-4 w-4" />
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </PageContainer>

      <DocumentPreviewModal
        open={previewOpen}
        onOpenChange={closePreview}
        document={selectedDocument}
        previewUrl={previewUrl}
        mimeType={previewMime}
        loading={previewLoading}
        error={previewError}
        onDownload={handleDownloadFromPreview}
      />

      <Dialog
        open={resendOpen}
        onOpenChange={(open) => {
          setResendOpen(open)
          if (!open) {
            setResendTarget(null)
            setResendFile(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('documentsPage.employee.resend.title')}</DialogTitle>
            <DialogDescription>{t('documentsPage.employee.resend.description')}</DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleResend}>
            {resendTarget?.rejectedComment ? (
              <div className="rounded-2xl border border-amber-300/60 bg-amber-50/80 px-3 py-2 text-sm text-amber-800">
                {resendTarget.rejectedComment}
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-semibold">{t('documentsPage.employee.resend.fileLabel')}</label>
              <Input
                type="file"
                onChange={(event) => setResendFile((event.target.files || [])[0] || null)}
                required
              />
              <p className="text-[11px] text-muted-foreground">{t('documentsPage.employee.resend.fileHint')}</p>
            </div>
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  {t('common.actions.cancel')}
                </Button>
              </DialogClose>
              <Button type="submit" disabled={resending || !resendFile} className="min-w-[140px]">
                {resending ? t('documentsPage.employee.resend.sending') : t('documentsPage.employee.resend.submit')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}




































