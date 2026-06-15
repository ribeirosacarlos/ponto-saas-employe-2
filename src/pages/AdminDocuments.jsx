import { useCallback, useEffect, useMemo, useState } from 'react'
import { Check, Download, Eye, FileText, PenLine, RefreshCcw, Search, Upload, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { actionIconButtonClass, actionTabButtonClass } from '../components/ui/form-controls'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { Textarea } from '../components/ui/textarea'
import EmployeeMultiSelect from '../components/EmployeeMultiSelect'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../components/ui/dialog'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { cn } from '../lib/utils'
import { useToast } from '../components/ui/use-toast'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { useAuthStore } from '../store/useAuth'
import { downloadDocument, fetchDocumentBlob } from '../services/documentsService'
import { approve, listAll, listPending, listReview, reject, uploadTeamDocument } from '../services/adminDocumentsService'
import { signTimesheetAsManager } from '../services/monthlyClosuresService'
import { DocumentPreviewModal } from '../components/DocumentPreviewModal'
import { listEmployees } from '../services/modules/employees'
import { normalizeEmployee } from '../features/employees/useEmployeesManagement'

const formatDateTime = (value, locale = 'pt-BR') => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleString(locale, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}


const CATEGORY_OPTIONS = [
  { value: 'all', labelKey: 'documentsPage.tabs.all' },
  { value: 'payroll', labelKey: 'documentsPage.tabs.payroll' },
  { value: 'courses', labelKey: 'documentsPage.tabs.courses' },
  { value: 'personal', labelKey: 'documentsPage.tabs.personal' },
  { value: 'others', labelKey: 'documentsPage.tabs.others' },
]

const PRIORITY_OPTIONS = [
  { value: 'high', labelKey: 'documentsPage.priority.high' },
  { value: 'medium', labelKey: 'documentsPage.priority.medium' },
  { value: 'low', labelKey: 'documentsPage.priority.low' },
]

const STATUS_TONES = {
  pending: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
  review: 'border-sky-200/70 bg-sky-500/10 text-sky-700',
  available: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
  expired: 'border-rose-200/70 bg-rose-500/10 text-rose-700',
}

const skeletonRows = Array.from({ length: 6 }).map((_, idx) => idx)
const ALLOWED_ROLES = { anyOf: ['manager', 'area_manager', 'admin', 'super_admin'] }
const EMPLOYEE_PAGE_SIZE = 200
const MAX_EMPLOYEE_PAGES = 10

const formatDate = (value, locale = 'pt-BR') => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
  return date.toLocaleDateString(locale, { day: '2-digit', month: 'short', year: 'numeric' })
}

function Badge({ status, children }) {
  const tone = STATUS_TONES[status] || 'border-border/60 text-foreground'
  return (
    <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold', tone)}>
      {children}
    </span>
  )
}

export default function AdminDocuments() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, ALLOWED_ROLES), [capabilities])
  const getPriorityLabel = (value) => {
    const normalized = (value ?? '').toString().toLowerCase()
    const option = PRIORITY_OPTIONS.find((item) => item.value === normalized)
    return option ? t(option.labelKey) : t('documentsPage.priority.none')
  }

  const getSignatureLabel = (doc) => {
    const requiresSignature = Boolean(doc?.requiresSignature ?? doc?.isImportant)
    if (!requiresSignature) return t('documentsPage.signature.notRequired')
    const status = (doc?.signatureStatus ?? '').toString().toLowerCase()
    if (status === 'signed' || status === 'completed') return t('documentsPage.signature.signed')
    return t('documentsPage.signature.pending')
  }

  const getSignatureTone = (doc) => {
    const requiresSignature = Boolean(doc?.requiresSignature ?? doc?.isImportant)
    if (!requiresSignature) return 'text-muted-foreground'
    const status = (doc?.signatureStatus ?? '').toString().toLowerCase()
    return status === 'signed' || status === 'completed'
      ? 'text-emerald-600 dark:text-emerald-400'
      : 'text-amber-600 dark:text-amber-400'
  }

  const getLastViewLabel = (doc) => {
    const value = doc?.lastViewedAt || doc?.viewedAt
    if (!value) return t('documentsPage.views.notSeen')
    return t('documentsPage.views.seenAt', {
      date: formatDateTime(value, i18n.language),
    })
  }

  const resolveDocumentError = (status, fallbackMessage, defaultKey) => {
    if (status === 401) return t('documentsPage.employee.errors.sessionExpired')
    if (status === 403) return t('documentsPage.employee.errors.noPermission')
    if (status === 404) return t('documentsPage.employee.errors.notFound')
    return fallbackMessage || t(defaultKey)
  }

  const [tab, setTab] = useState('pending')
  const [filters, setFilters] = useState({ search: '', category: 'all', employeeIds: [] })
  const [page, setPage] = useState(1)
  const [documents, setDocuments] = useState([])
  const [meta, setMeta] = useState({ currentPage: 1, total: 0, perPage: 10, lastPage: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [employees, setEmployees] = useState([])
  const [employeesLoading, setEmployeesLoading] = useState(false)
  const [employeesError, setEmployeesError] = useState('')
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadForm, setUploadForm] = useState({
    employee: '',
    category: '',
    title: '',
    notes: '',
    file: null,
  })

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [signingId, setSigningId] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewMime, setPreviewMime] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)

  const loadEmployees = useCallback(async () => {
    setEmployeesLoading(true)
    setEmployeesError('')
    try {
      let pageIndex = 1
      let allEmployees = []
      let lastPage = null

      while (pageIndex <= MAX_EMPLOYEE_PAGES) {
        const response = await listEmployees(pageIndex, { perPage: EMPLOYEE_PAGE_SIZE })
        const payload = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : []
        const normalized = payload.map((item, index) =>
          normalizeEmployee(item, allEmployees.length + index),
        )

        allEmployees = [...allEmployees, ...normalized]
        const meta = response?.meta || {}
        lastPage = meta.lastPage ?? meta.last_page ?? lastPage

        if (lastPage && pageIndex >= lastPage) break
        if (!lastPage && payload.length < EMPLOYEE_PAGE_SIZE) break

        pageIndex += 1
      }

      const sorted = allEmployees.sort((left, right) => {
        const leftLabel = (left.name || left.email || '').toLowerCase()
        const rightLabel = (right.name || right.email || '').toLowerCase()
        return leftLabel.localeCompare(rightLabel, i18n.language)
      })

      setEmployees(sorted)
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || t('equipoPage.states.errorDescription')
      setEmployeesError(message)
      toast({
        title: t('equipoPage.states.errorTitle'),
        description: message,
        variant: 'destructive',
      })
    } finally {
      setEmployeesLoading(false)
    }
  }, [i18n.language, t, toast])

  const fetchAllDocumentsByEmployee = useCallback(async ({ service, employeeId, category, search }) => {
    let pageIndex = 1
    let keepFetching = true
    const collected = []

    while (keepFetching && pageIndex <= MAX_EMPLOYEE_PAGES) {
      const { data, meta: responseMeta } = await service({
        page: pageIndex,
        category,
        search,
        employeeId,
      })

      collected.push(...(data || []))

      const lastPage = responseMeta?.lastPage || responseMeta?.last_page
      const total = responseMeta?.total
      const perPage = responseMeta?.perPage || responseMeta?.per_page || 10

      if (lastPage) {
        keepFetching = pageIndex < lastPage
      } else if (total) {
        keepFetching = collected.length < total
      } else {
        keepFetching = (data?.length || 0) >= perPage
      }

      pageIndex += 1
    }

    return collected
  }, [])

  const handleUploadSubmit = async (event) => {
    event?.preventDefault()
    if (!uploadForm.file) {
      toast({
        title: t('documentsPage.admin.upload.errors.fileTitle'),
        description: t('documentsPage.admin.upload.errors.fileDescription'),
        variant: 'destructive',
      })
      return
    }
    if (!uploadForm.category) {
      toast({
        title: t('documentsPage.admin.upload.errors.categoryTitle'),
        description: t('documentsPage.admin.upload.errors.categoryDescription'),
        variant: 'destructive',
      })
      return
    }
    if (!uploadForm.employee) {
      toast({
        title: t('documentsPage.admin.upload.errors.employeeTitle'),
        description: t('documentsPage.admin.upload.errors.employeeDescription'),
        variant: 'destructive',
      })
      return
    }

    const payload = new FormData()
    payload.append('files[]', uploadForm.file)
    payload.append('user_id', uploadForm.employee)
    payload.append('category', uploadForm.category)
    if (uploadForm.title) payload.append('title', uploadForm.title)
    if (uploadForm.notes) payload.append('notes', uploadForm.notes)

    setUploading(true)
    try {
      await uploadTeamDocument(payload)
      toast({
        title: t('documentsPage.admin.upload.successTitle'),
        description: t('documentsPage.admin.upload.successDescription'),
      })
      setUploadOpen(false)
      setUploadForm({ employee: '', category: '', title: '', notes: '', file: null })
      setPage(1)
      fetchDocuments({ page: 1 })
    } catch (err) {
      const message =
        err?.response?.data?.message || err?.message || t('documentsPage.admin.upload.errorDescription')
      toast({
        title: t('documentsPage.admin.upload.errorTitle'),
        description: message,
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }
  const fetchDocuments = async (params = {}) => {
    if (!hasAccess) return
    setLoading(true)
    setError('')
    const query = {
      page: params.page ?? page,
      category: params.category ?? filters.category,
      search: params.search ?? filters.search,
      employeeIds: params.employeeIds ?? filters.employeeIds,
    }
    try {
      const service = tab === 'pending' ? listPending : tab === 'review' ? listReview : listAll

      if ((query.employeeIds || []).length > 1) {
        const results = await Promise.all(
          query.employeeIds.map((employeeId) =>
            fetchAllDocumentsByEmployee({
              service,
              employeeId,
              category: query.category,
              search: query.search,
            }),
          ),
        )

        const merged = results
          .flat()
          .sort((left, right) => {
            const leftTime = new Date(left?.updatedAt || left?.createdAt || 0).getTime()
            const rightTime = new Date(right?.updatedAt || right?.createdAt || 0).getTime()
            return rightTime - leftTime
          })

        setDocuments(merged)
        setMeta({
          currentPage: 1,
          perPage: merged.length || 10,
          total: merged.length,
          lastPage: 1,
        })
      } else {
        const { data, meta: responseMeta } = await service({
          page: query.page,
          category: query.category,
          search: query.search,
          employeeId: query.employeeIds?.[0] || '',
        })
        setDocuments(data)
        setMeta({
          currentPage: responseMeta.currentPage || 1,
          perPage: responseMeta.perPage || 10,
          total: responseMeta.total || data.length,
          lastPage: responseMeta.lastPage || 1,
        })
      }
    } catch (err) {
      const message =
        err?.response?.data?.message || err.message || t('documentsPage.admin.toasts.loadErrorDescription')
      setError(message)
      toast({
        title: t('documentsPage.admin.toasts.loadErrorTitle'),
        description: message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments({ page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  useEffect(() => {
    setPage(1)
    fetchDocuments({ page: 1 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters.category, filters.search, filters.employeeIds])

  useEffect(() => {
    if (!hasAccess || employeesLoading || employees.length) return
    loadEmployees()
  }, [employees.length, employeesLoading, hasAccess, loadEmployees])

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || (meta.lastPage && nextPage > meta.lastPage)) return
    setPage(nextPage)
    fetchDocuments({ page: nextPage })
  }

  const handleView = (doc) => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedDocument(doc)
    setPreviewOpen(true)
    setPreviewLoading(true)
    setPreviewError('')
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
          'documentsPage.admin.errors.viewGeneric',
        )
        setPreviewError(message)
        toast({
          title: t('documentsPage.admin.toasts.viewErrorTitle'),
          description: message,
          variant: 'destructive',
        })
      })
      .finally(() => setPreviewLoading(false))
  }
  const handleApprove = async (doc) => {
    setApproving(true)
    try {
      await approve(doc.id)
      toast({
        title: t('documentsPage.admin.toasts.approveSuccessTitle'),
        description: t('documentsPage.admin.toasts.approveSuccessDescription', {
          title: doc.title,
        }),
      })
      fetchDocuments({ page })
    } catch (err) {
      toast({
        title: t('documentsPage.admin.toasts.approveErrorTitle'),
        description: err?.response?.data?.message || err.message || t('documentsPage.admin.toasts.approveErrorDescription'),
        variant: 'destructive',
      })
    } finally {
      setApproving(false)
    }
  }
  const handleSignTimesheet = async (item) => {
    setSigningId(item.id)
    try {
      await signTimesheetAsManager(item.id)
      toast({
        title: t('documentsPage.admin.toasts.signSuccessTitle'),
        description: t('documentsPage.admin.toasts.signSuccessDescription'),
      })
      fetchDocuments({ page })
    } catch (err) {
      toast({
        title: t('documentsPage.admin.toasts.signErrorTitle'),
        description: err?.response?.data?.message || err.message || t('documentsPage.admin.toasts.signErrorDescription'),
        variant: 'destructive',
      })
    } finally {
      setSigningId(null)
    }
  }

  const handleDownloadFromPreview = async () => {
    if (!selectedDocument) return
    try {
      await downloadDocument(
        selectedDocument.id,
        `${selectedDocument.title || t('documentsPage.admin.fileFallback')}.${selectedDocument.extension || 'pdf'}`,
      )
    } catch (err) {
      const status = err?.response?.status
      const message = resolveDocumentError(
        status,
        err?.message,
        'documentsPage.admin.errors.downloadGeneric',
      )
      toast({
        title: t('documentsPage.admin.toasts.downloadErrorTitle'),
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

  const handleReject = async (event) => {
    event?.preventDefault()
    if (!rejectTarget || !rejectReason || rejectReason.length < 5) {
      toast({
        title: t('documentsPage.admin.reject.requiredTitle'),
        description: t('documentsPage.admin.reject.requiredDescription'),
        variant: 'destructive',
      })
      return
    }
    setRejecting(true)
    try {
      await reject(rejectTarget.id, rejectReason)
      toast({
        title: t('documentsPage.admin.toasts.rejectSuccessTitle'),
        description: t('documentsPage.admin.toasts.rejectSuccessDescription', {
          title: rejectTarget.title,
        }),
      })
      setRejectOpen(false)
      setRejectTarget(null)
      setRejectReason('')
      fetchDocuments({ page })
      if (tab === 'pending') {
        setTab('review')
      }
    } catch (err) {
      toast({
        title: t('documentsPage.admin.toasts.rejectErrorTitle'),
        description: err?.response?.data?.message || err.message || t('documentsPage.admin.toasts.rejectErrorDescription'),
        variant: 'destructive',
      })
    } finally {
      setRejecting(false)
    }
  }
  if (!hasAccess) {
    return (
      <PageContainer className="py-10">
        <div className="rounded-2xl border border-border/70 bg-card/90 p-6 text-center text-sm text-muted-foreground">
          {t('documentsPage.admin.states.noPermission')}
        </div>
      </PageContainer>
    )
  }

  const emptyState = !loading && documents.length === 0
  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-foreground">
      <PageContainer className="relative z-10 flex flex-col gap-5 py-6">
        <AppTopBar
          icon={<FileText className="h-5 w-5" />}
          eyebrow={t('documentsPage.tag')}
          title={t('documentsPage.admin.title')}
          subtitle={t('documentsPage.admin.subtitle')}
          filters={
            error ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/80 px-3 py-1 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
                {error}
              </div>
            ) : null
          }
          actions={
            <>
              <Button
                type="button"
                variant="outline"
                onClick={() => fetchDocuments({ page })}
                className="rounded-full border-border bg-background/80 px-3 text-sm"
              >
                <RefreshCcw className="h-4 w-4 text-primary" />
                {t('documentsPage.admin.actions.refresh')}
              </Button>
              <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
                <DialogTrigger asChild>
                  <Button type="button">
                    <Upload className="h-4 w-4" />
                    {t('documentsPage.admin.actions.upload')}
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('documentsPage.admin.upload.title')}</DialogTitle>
                    <DialogDescription>{t('documentsPage.admin.upload.description')}</DialogDescription>
                  </DialogHeader>
                  <form className="space-y-4" onSubmit={handleUploadSubmit}>
                    <div className="space-y-2">
                      <label className="text-sm font-semibold">{t('documentsPage.admin.upload.employeeLabel')}</label>
                      <EmployeeMultiSelect
                        options={employees}
                        value={uploadForm.employee ? [String(uploadForm.employee)] : []}
                        onChange={(employeeIds) =>
                          setUploadForm((prev) => ({ ...prev, employee: employeeIds[0] || '' }))
                        }
                        multiple={false}
                        loading={employeesLoading}
                        error={employeesError}
                        triggerPlaceholder={t('documentsPage.admin.upload.employeePlaceholder')}
                        searchPlaceholder={t('closeTimesheetPage.filters.searchPlaceholder', 'Buscar por nome ou email')}
                        emptyText={t('documentsPage.admin.upload.employeeEmpty')}
                        showSelectedChips={false}
                      />
                      {employeesLoading ? (
                        <p className="text-xs text-muted-foreground">
                          {t('documentsPage.admin.upload.employeeLoading')}
                        </p>
                      ) : null}
                      {!employeesLoading && !employeesError && employees.length === 0 ? (
                        <p className="text-xs text-muted-foreground">
                          {t('documentsPage.admin.upload.employeeEmpty')}
                        </p>
                      ) : null}
                      {employeesError ? (
                        <p className="text-xs text-rose-600">{employeesError}</p>
                      ) : null}
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold">{t('documentsPage.admin.upload.categoryLabel')}</label>
                      <Select
                        value={uploadForm.category}
                        onChange={(event) =>
                          setUploadForm((prev) => ({ ...prev, category: event.target.value }))
                        }
                        required
                      >
                        <option value="">{t('documentsPage.admin.upload.categoryPlaceholder')}</option>
                        {CATEGORY_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {t(opt.labelKey)}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold">{t('documentsPage.admin.upload.titleLabel')}</label>
                      <Input
                        value={uploadForm.title}
                        onChange={(event) => setUploadForm((prev) => ({ ...prev, title: event.target.value }))}
                        placeholder={t('documentsPage.admin.upload.titlePlaceholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold">{t('documentsPage.admin.upload.notesLabel')}</label>
                      <Textarea
                        rows={4}
                        value={uploadForm.notes}
                        onChange={(event) => setUploadForm((prev) => ({ ...prev, notes: event.target.value }))}
                        placeholder={t('documentsPage.admin.upload.notesPlaceholder')}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-semibold">{t('documentsPage.admin.upload.fileLabel')}</label>
                      <Input
                        type="file"
                        onChange={(event) =>
                          setUploadForm((prev) => ({
                            ...prev,
                            file: (event.target.files || [])[0] || null,
                          }))
                        }
                        required
                      />
                      <p className="text-[11px] text-muted-foreground">
                        {t('documentsPage.admin.upload.fileHint')}
                      </p>
                    </div>

                    <DialogFooter className="pt-2">
                      <DialogClose asChild>
                        <Button type="button" variant="ghost">
                          {t('common.actions.cancel')}
                        </Button>
                      </DialogClose>
                      <Button type="submit" disabled={uploading} className="min-w-[160px]">
                        {uploading
                          ? t('documentsPage.admin.upload.sending')
                          : t('documentsPage.admin.upload.submit')}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </>
          }
        />

        <div className="flex flex-wrap items-center gap-3 rounded-[18px] border border-border/70 bg-muted/20 p-2">
          {['all', 'pending', 'review'].map((key) => (
            <button
              key={key}
              type="button"
              className={cn(
                actionTabButtonClass,
                tab === key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => {
                setTab(key)
                setPage(1)
              }}
            >
              {t(`documentsPage.admin.tabs.${key}`)}
              {meta?.total && tab === key ? (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs">{meta.total}</span>
              ) : null}
            </button>
          ))}
        </div>

        <section className="grid gap-4 overflow-hidden rounded-[28px] border border-border/80 bg-card/90 p-5 shadow-[0_18px_90px_-60px_rgba(62,82,152,0.55)]">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder={t('documentsPage.admin.filters.searchPlaceholder')}
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
            </div>
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
            <EmployeeMultiSelect
              options={employees}
              value={filters.employeeIds}
              onChange={(employeeIds) => setFilters((prev) => ({ ...prev, employeeIds }))}
              loading={employeesLoading}
              error={employeesError}
              triggerPlaceholder={t('documentsPage.admin.filters.employeePlaceholder')}
              searchPlaceholder={t('closeTimesheetPage.filters.searchPlaceholder', 'Buscar por nome ou email')}
              emptyText={t('documentsPage.admin.upload.employeeEmpty')}
              selectedCountText={(count) =>
                t('documentsPage.admin.filters.selectedCount', {
                  count,
                  defaultValue: '{{count}} colaborador(es) selecionado(s)',
                })
              }
            />
          </div>

          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {meta?.total ? (
              <span>{t('documentsPage.admin.listCount', { count: meta.total })}</span>
            ) : null}
            <span className="ml-auto rounded-full border border-border/70 bg-background/70 px-3 py-1 text-xs text-foreground">
              {meta.currentPage} / {meta.lastPage || 1}
            </span>
          </div>
          <div className="hidden md:block overflow-hidden rounded-[24px] border border-border/70 bg-card/95 shadow-[0_30px_90px_-60px_rgba(62,82,152,0.55)]">
            <div className="w-full min-w-0 overflow-x-auto">
              <div className="min-w-[980px] lg:min-w-[1100px] xl:min-w-[1240px]">
                <div className="grid grid-cols-[1.4fr_1.2fr_0.9fr_0.8fr_0.9fr_1.2fr_0.9fr_200px] gap-3 rounded-t-3xl border-b border-border/70 bg-background/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <span>{t('documentsPage.admin.table.headers.employee')}</span>
                  <span>{t('documentsPage.admin.table.headers.title')}</span>
                  <span>{t('documentsPage.admin.table.headers.category')}</span>
                  <span>{t('documentsPage.admin.table.headers.priority')}</span>
                  <span>{t('documentsPage.admin.table.headers.signature')}</span>
                  <span>{t('documentsPage.admin.table.headers.lastView')}</span>
                  <span>{t('documentsPage.admin.table.headers.status')}</span>
                  <span className="text-right">{t('documentsPage.admin.table.headers.actions')}</span>
                </div>
                <div className="divide-y divide-border/60">
                  {loading
                    ? skeletonRows.map((key) => (
                        <div key={key} className="grid grid-cols-[1.4fr_1.2fr_0.9fr_0.8fr_0.9fr_1.2fr_0.9fr_200px] gap-3 px-4 py-4">
                          <div className="h-4 rounded bg-muted/50 animate-pulse" />
                          <div className="h-4 rounded bg-muted/50 animate-pulse" />
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
                      {t('documentsPage.admin.states.empty')}
                    </div>
                  ) : null}

                  {!loading &&
                    documents.map((doc) => {
                      const isTimesheetSignature = doc.type === 'timesheet_signature'
                      const employee = doc.user || doc.employee
                      const employeeName =
                        employee?.name || employee?.full_name || t('documentsPage.admin.labels.employeeFallback')
                      const employeeEmail = employee?.email || ''
                      const employeeLabel = employee
                        ? `${employeeName} (${employeeEmail})`
                        : t('documentsPage.admin.labels.employeeFallback')
                      const priorityLabel = isTimesheetSignature ? '—' : getPriorityLabel(doc.priority)
                      const signatureLabel = isTimesheetSignature ? '—' : getSignatureLabel(doc)
                      const signatureTone = isTimesheetSignature ? 'text-muted-foreground' : getSignatureTone(doc)
                      const lastViewLabel = isTimesheetSignature ? '—' : getLastViewLabel(doc)

                      return (
                        <div
                          key={doc.id}
                          className="grid grid-cols-[1.4fr_1.2fr_0.9fr_0.8fr_0.9fr_1.2fr_0.9fr_200px] items-center gap-3 px-4 py-4 text-sm"
                        >
                          <div className="min-w-0 space-y-1">
                            <p className="truncate font-semibold">{employeeLabel}</p>
                            <p className="text-xs text-muted-foreground">
                              {t('documentsPage.admin.labels.updatedAt', {
                                date: formatDate(doc.updatedAt, i18n.language),
                              })}
                            </p>
                          </div>
                          <div className="min-w-0 space-y-1">
                            <span className="block truncate">{doc.title}</span>
                            {!isTimesheetSignature && doc.absence ? (
                              <span className="inline-flex items-center rounded-full border border-violet-200/70 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                                {t('documentsPage.admin.labels.absenceType', { type: doc.absence.type })}
                              </span>
                            ) : null}
                          </div>
                          <span className="block min-w-0 truncate">
                            {isTimesheetSignature ? '—' : t(`documentsPage.tabs.${doc.category}`, doc.category)}
                          </span>
                          <span>{priorityLabel}</span>
                          <span className={cn('text-xs font-semibold', signatureTone)}>{signatureLabel}</span>
                          <span className="text-xs text-muted-foreground">{lastViewLabel}</span>
                          <Badge status={doc.status}>{t(`documentsPage.status.${doc.status}`, doc.status)}</Badge>
                          <div className="flex justify-end gap-2">
                            {isTimesheetSignature ? (
                              <button
                                type="button"
                                className={actionIconButtonClass}
                                title={t('documentsPage.admin.actions.sign')}
                                disabled={signingId === doc.id}
                                onClick={() => handleSignTimesheet(doc)}
                              >
                                <PenLine className="h-4 w-4" />
                              </button>
                            ) : (
                              <>
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
                              onClick={() =>
                                downloadDocument(
                                  doc.id,
                                  `${doc.title || t('documentsPage.admin.fileFallback')}.${doc.extension || 'pdf'}`,
                                )
                              }
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className={actionIconButtonClass}
                              title={t('documentsPage.admin.actions.approve')}
                              disabled={approving}
                              onClick={() => handleApprove(doc)}
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <Dialog
                              open={rejectOpen && rejectTarget?.id === doc.id}
                              onOpenChange={(open) => {
                                setRejectOpen(open)
                                setRejectTarget(open ? doc : null)
                                setRejectReason('')
                              }}
                            >
                              <DialogTrigger asChild>
                                <button
                                  type="button"
                                  className={actionIconButtonClass}
                                  title={t('documentsPage.admin.actions.reject')}
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>{t('documentsPage.admin.reject.title')}</DialogTitle>
                                  <DialogDescription>
                                    {t('documentsPage.admin.reject.description')}
                                  </DialogDescription>
                                </DialogHeader>
                                <form className="space-y-4" onSubmit={handleReject}>
                                  <Textarea
                                    rows={4}
                                    minLength={5}
                                    value={rejectReason}
                                    onChange={(event) => setRejectReason(event.target.value)}
                                    placeholder={t('documentsPage.admin.reject.placeholder')}
                                    required
                                  />
                                  <DialogFooter className="pt-2">
                                    <DialogClose asChild>
                                      <Button type="button" variant="ghost">
                                        {t('common.actions.cancel')}
                                      </Button>
                                    </DialogClose>
                                    <Button
                                      type="submit"
                                      disabled={rejecting || rejectReason.length < 5}
                                      className="min-w-[140px]"
                                    >
                                      {rejecting
                                        ? t('documentsPage.admin.actions.rejecting')
                                        : t('documentsPage.admin.actions.reject')}
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            </Dialog>
                              </>
                            )}
                          </div>
                        </div>
                      )
                    })}
                </div>
              </div>
            </div>
          </div>

          <div className="md:hidden space-y-3">
            {loading
              ? skeletonRows.map((key) => (
                  <div key={key} className="h-24 rounded-2xl border border-border/70 bg-muted/40 animate-pulse" />
                ))
              : null}
            {!loading && emptyState ? (
              <div className="rounded-2xl border border-border/70 bg-muted/40 p-6 text-center text-sm text-muted-foreground">
                {t('documentsPage.admin.states.empty')}
              </div>
            ) : null}
            {!loading &&
              documents.map((doc) => {
                const isTimesheetSignature = doc.type === 'timesheet_signature'
                const employee = doc.user || doc.employee
                const employeeName =
                  employee?.name || employee?.full_name || t('documentsPage.admin.labels.employeeFallback')
                const employeeEmail = employee?.email || ''
                const employeeLabel = employee
                  ? `${employeeName} - ${employeeEmail}`
                  : t('documentsPage.admin.labels.employeeFallback')
                const priorityLabel = isTimesheetSignature ? null : getPriorityLabel(doc.priority)
                const signatureLabel = isTimesheetSignature ? null : getSignatureLabel(doc)
                const signatureTone = isTimesheetSignature ? '' : getSignatureTone(doc)
                const lastViewLabel = isTimesheetSignature ? null : getLastViewLabel(doc)

                return (
                  <div key={doc.id} className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{employeeLabel}</p>
                        {!isTimesheetSignature ? (
                          <p className="text-[11px] text-muted-foreground">
                            {formatDate(doc.updatedAt, i18n.language)} - {t(`documentsPage.tabs.${doc.category}`, doc.category)}
                          </p>
                        ) : (
                          <p className="text-[11px] text-muted-foreground">
                            {formatDate(doc.updatedAt, i18n.language)}
                          </p>
                        )}
                        {!isTimesheetSignature && doc.absence ? (
                          <span className="mt-1 inline-flex items-center rounded-full border border-violet-200/70 bg-violet-500/10 px-2 py-0.5 text-[10px] font-semibold text-violet-700">
                            {t('documentsPage.admin.labels.absenceType', { type: doc.absence.type })}
                          </span>
                        ) : null}
                        {priorityLabel ? (
                          <p className="mt-2 text-[11px] text-muted-foreground">
                            {t('documentsPage.admin.labels.priority', { value: priorityLabel })}
                          </p>
                        ) : null}
                        {signatureLabel ? (
                          <p className={cn('text-[11px] font-semibold', signatureTone)}>{signatureLabel}</p>
                        ) : null}
                        {lastViewLabel ? (
                          <p className="text-[11px] text-muted-foreground">{lastViewLabel}</p>
                        ) : null}
                      </div>
                      <Badge status={doc.status}>{t(`documentsPage.status.${doc.status}`, doc.status)}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      {isTimesheetSignature ? (
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          disabled={signingId === doc.id}
                          onClick={() => handleSignTimesheet(doc)}
                        >
                          <PenLine className="h-4 w-4" />
                          {signingId === doc.id
                            ? t('documentsPage.admin.actions.signing')
                            : t('documentsPage.admin.actions.sign')}
                        </Button>
                      ) : (
                        <>
                          <Button type="button" size="sm" variant="outline" onClick={() => handleView(doc)}>
                            <Eye className="h-4 w-4" />
                            {t('documentsPage.actions.view')}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              downloadDocument(
                                doc.id,
                                `${doc.title || t('documentsPage.admin.fileFallback')}.${doc.extension || 'pdf'}`,
                              )
                            }
                          >
                            <Download className="h-4 w-4" />
                            {t('documentsPage.actions.download')}
                          </Button>
                          <Button type="button" size="sm" variant="outline" onClick={() => handleApprove(doc)} disabled={approving}>
                            <Check className="h-4 w-4" />
                            {t('documentsPage.admin.actions.approve')}
                          </Button>
                          <Dialog
                            open={rejectOpen && rejectTarget?.id === doc.id}
                            onOpenChange={(open) => {
                              setRejectOpen(open)
                              setRejectTarget(open ? doc : null)
                              setRejectReason('')
                            }}
                          >
                            <DialogTrigger asChild>
                              <Button type="button" size="sm" variant="outline">
                                <X className="h-4 w-4" />
                                {t('documentsPage.admin.actions.reject')}
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>{t('documentsPage.admin.reject.title')}</DialogTitle>
                                <DialogDescription>
                                  {t('documentsPage.admin.reject.description')}
                                </DialogDescription>
                              </DialogHeader>
                              <form className="space-y-4" onSubmit={handleReject}>
                                <Textarea
                                  rows={4}
                                  minLength={5}
                                  value={rejectReason}
                                  onChange={(event) => setRejectReason(event.target.value)}
                                  placeholder={t('documentsPage.admin.reject.placeholder')}
                                  required
                                />
                                <DialogFooter className="pt-2">
                                  <DialogClose asChild>
                                    <Button type="button" variant="ghost">
                                      {t('common.actions.cancel')}
                                    </Button>
                                  </DialogClose>
                                  <Button type="submit" disabled={rejecting || rejectReason.length < 5} className="min-w-[140px]">
                                    {rejecting
                                      ? t('documentsPage.admin.actions.rejecting')
                                      : t('documentsPage.admin.actions.reject')}
                                  </Button>
                                </DialogFooter>
                              </form>
                            </DialogContent>
                          </Dialog>
                        </>
                      )}
                    </div>
                  </div>
                )
              })}
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
    </div>
  )
}












































