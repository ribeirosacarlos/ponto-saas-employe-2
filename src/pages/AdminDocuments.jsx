import { useEffect, useMemo, useState } from 'react'
import { Check, Download, Eye, FileText, RefreshCcw, Search, Upload, X } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '../components/ui/button'
import { Input } from '../components/ui/input'
import { Textarea } from '../components/ui/textarea'
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
import { approve, listPending, listReview, reject } from '../services/adminDocumentsService'
import { DocumentPreviewModal } from '../components/DocumentPreviewModal'

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'payroll', label: 'Holerites' },
  { value: 'courses', label: 'Cursos' },
  { value: 'personal', label: 'Pessoais' },
  { value: 'others', label: 'Outros' },
]

const STATUS_TONES = {
  pending: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
  review: 'border-sky-200/70 bg-sky-500/10 text-sky-700',
  available: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
  expired: 'border-rose-200/70 bg-rose-500/10 text-rose-700',
}

const skeletonRows = Array.from({ length: 6 }).map((_, idx) => idx)
const ALLOWED_ROLES = { anyOf: ['manager', 'area_manager', 'admin', 'super_admin'] }

const formatDate = (value, locale = 'pt-BR') => {
  if (!value) return '—'
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

  const [tab, setTab] = useState('pending')
  const [filters, setFilters] = useState({ search: '', category: 'all', employee: '' })
  const [page, setPage] = useState(1)
  const [documents, setDocuments] = useState([])
  const [meta, setMeta] = useState({ currentPage: 1, total: 0, perPage: 10, lastPage: 1 })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [rejectOpen, setRejectOpen] = useState(false)
  const [rejectTarget, setRejectTarget] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [approving, setApproving] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewMime, setPreviewMime] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)

  const fetchDocuments = async (params = {}) => {
    if (!hasAccess) return
    setLoading(true)
    setError('')
    const query = {
      page: params.page ?? page,
      category: params.category ?? filters.category,
      search: params.search ?? filters.search,
      employee: params.employee ?? filters.employee,
    }
    try {
      const service = tab === 'pending' ? listPending : listReview
      const { data, meta: responseMeta } = await service(query)
      setDocuments(data)
      setMeta({
        currentPage: responseMeta.currentPage || 1,
        perPage: responseMeta.perPage || 10,
        total: responseMeta.total || data.length,
        lastPage: responseMeta.lastPage || 1,
      })
    } catch (err) {
      const message = err?.response?.data?.message || err.message || 'Erro ao carregar documentos.'
      setError(message)
      toast({ title: 'Erro', description: message, variant: 'destructive' })
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
  }, [filters.category, filters.search, filters.employee])

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
        let message = err?.message || 'Não foi possível carregar o documento.'
        if (status === 401) message = 'Sessão expirada. Faça login novamente.'
        if (status === 403) message = 'Sem permissão para visualizar.'
        if (status === 404) message = 'Arquivo não encontrado.'
        setPreviewError(message)
        toast({ title: 'Erro ao visualizar', description: message, variant: 'destructive' })
      })
      .finally(() => setPreviewLoading(false))
  }

  const handleApprove = async (doc) => {
    setApproving(true)
    try {
      await approve(doc.id)
      toast({ title: 'Documento aprovado', description: doc.title })
      fetchDocuments({ page })
    } catch (err) {
      toast({
        title: 'Erro ao aprovar',
        description: err?.response?.data?.message || err.message,
        variant: 'destructive',
      })
    } finally {
      setApproving(false)
    }
  }

  const handleDownloadFromPreview = async () => {
    if (!selectedDocument) return
    try {
      await downloadDocument(
        selectedDocument.id,
        `${selectedDocument.title || 'documento'}.${selectedDocument.extension || 'pdf'}`,
      )
    } catch (err) {
      const status = err?.response?.status
      let message = err?.message || 'Falha no download.'
      if (status === 401) message = 'Sessão expirada. Faça login novamente.'
      if (status === 403) message = 'Sem permissão.'
      if (status === 404) message = 'Arquivo não encontrado.'
      toast({ title: 'Erro ao baixar', description: message, variant: 'destructive' })
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
      toast({ title: 'Comentário obrigatório', description: 'Informe pelo menos 5 caracteres.' })
      return
    }
    setRejecting(true)
    try {
      await reject(rejectTarget.id, rejectReason)
      toast({ title: 'Documento rejeitado', description: rejectTarget.title })
      setRejectOpen(false)
      setRejectTarget(null)
      setRejectReason('')
      fetchDocuments({ page })
      if (tab === 'pending') {
        // mover para revisão
        setTab('review')
      }
    } catch (err) {
      toast({
        title: 'Erro ao rejeitar',
        description: err?.response?.data?.message || err.message,
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
          Sem permissão para acessar esta página.
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
          eyebrow="Validação"
          title="Validação de documentos"
          subtitle="Analise, aprove ou rejeite documentos enviados."
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
              onClick={() => fetchDocuments({ page })}
              className="rounded-full border-border bg-background/80 px-3 text-sm"
            >
              <RefreshCcw className="h-4 w-4 text-primary" />
              Atualizar
            </Button>
          }
        />

        <div className="flex flex-wrap items-center gap-3 rounded-[18px] border border-border/70 bg-muted/20 p-2">
          {['pending', 'review'].map((key) => (
            <button
              key={key}
              type="button"
              className={cn(
                'flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold transition',
                tab === key ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground',
              )}
              onClick={() => {
                setTab(key)
                setPage(1)
              }}
            >
              {key === 'pending' ? 'Pendentes' : 'Em revisão'}
              {meta?.total && tab === key ? (
                <span className="rounded-full bg-primary/20 px-2 py-0.5 text-xs">{meta.total}</span>
              ) : null}
            </button>
          ))}
        </div>

        <section className="grid gap-4 rounded-[28px] border border-border/80 bg-card/90 p-5 shadow-[0_18px_90px_-60px_rgba(62,82,152,0.55)]">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por título"
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
              />
            </div>
            <select
              className="rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30"
              value={filters.category}
              onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value }))}
            >
              {CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
            <Input
              placeholder="Funcionário (nome ou e-mail)"
              value={filters.employee}
              onChange={(event) => setFilters((prev) => ({ ...prev, employee: event.target.value }))}
            />
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>{meta?.total ? `${meta.total} itens` : ''}</span>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1 || loading}
                onClick={() => handlePageChange(page - 1)}
              >
                Anterior
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
                Próxima
              </Button>
            </div>
          </div>

          <div className="hidden md:block rounded-[24px] border border-border/70 bg-card/95 shadow-[0_30px_90px_-60px_rgba(62,82,152,0.55)]">
            <div className="overflow-x-auto">
              <div className="min-w-[1024px]">
                <div className="grid grid-cols-[1.6fr_1.3fr_1fr_1fr_160px] gap-3 rounded-t-3xl border-b border-border/70 bg-background/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Funcionário</span>
                  <span>Título</span>
                  <span>Categoria</span>
                  <span>Status</span>
                  <span className="text-right">Ações</span>
                </div>
                <div className="divide-y divide-border/60">
                  {loading
                    ? skeletonRows.map((key) => (
                        <div key={key} className="grid grid-cols-[1.6fr_1.3fr_1fr_1fr_160px] gap-3 px-4 py-4">
                          <div className="h-4 rounded bg-muted/50 animate-pulse" />
                          <div className="h-4 rounded bg-muted/50 animate-pulse" />
                          <div className="h-4 rounded bg-muted/50 animate-pulse" />
                          <div className="h-4 rounded bg-muted/50 animate-pulse" />
                          <div className="h-4 rounded bg-muted/50 animate-pulse" />
                        </div>
                      ))
                    : null}
                  {!loading && emptyState ? (
                    <div className="px-4 py-8 text-center text-sm text-muted-foreground">Nenhum documento.</div>
                  ) : null}
                  {!loading &&
                    documents.map((doc) => {
                      const employee = doc.user || doc.employee
                      const employeeLabel = employee
                        ? `${employee.name || employee.full_name || 'Funcionário'} (${employee.email || ''})`
                        : 'Funcionário'
                      return (
                        <div
                          key={doc.id}
                          className="grid grid-cols-[1.6fr_1.3fr_1fr_1fr_160px] items-center gap-3 px-4 py-4 text-sm"
                        >
                          <div className="space-y-1">
                            <p className="font-semibold truncate">{employeeLabel}</p>
                            <p className="text-xs text-muted-foreground">Atualizado {formatDate(doc.updatedAt, i18n.language)}</p>
                          </div>
                          <span className="truncate">{doc.title}</span>
                          <span className="truncate">{t(`documentsPage.tabs.${doc.category}`, doc.category)}</span>
                          <Badge status={doc.status}>{t(`documentsPage.status.${doc.status}`, doc.status)}</Badge>
                          <div className="flex justify-end gap-2">
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted active:scale-[0.98]"
                              title="Ver"
                              onClick={() => handleView(doc)}
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted active:scale-[0.98]"
                              title="Baixar"
                              onClick={() => downloadDocument(doc.id, `${doc.title || 'documento'}.${doc.extension || 'pdf'}`)}
                            >
                              <Download className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted active:scale-[0.98]"
                              title="Aprovar"
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
                                  className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted active:scale-[0.98]"
                                  title="Rejeitar"
                                >
                                  <X className="h-4 w-4" />
                                </button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Rejeitar documento</DialogTitle>
                                  <DialogDescription>
                                    Explique o que precisa ser corrigido para o colaborador.
                                  </DialogDescription>
                                </DialogHeader>
                                <form className="space-y-4" onSubmit={handleReject}>
                                  <Textarea
                                    rows={4}
                                    minLength={5}
                                    value={rejectReason}
                                    onChange={(event) => setRejectReason(event.target.value)}
                                    placeholder="Explique exatamente o que está errado e o que corrigir."
                                    required
                                  />
                                  <DialogFooter className="pt-2">
                                    <DialogClose asChild>
                                      <Button type="button" variant="ghost">
                                        Cancelar
                                      </Button>
                                    </DialogClose>
                                    <Button type="submit" disabled={rejecting || rejectReason.length < 5} className="min-w-[140px]">
                                      {rejecting ? 'Rejeitando…' : 'Rejeitar'}
                                    </Button>
                                  </DialogFooter>
                                </form>
                              </DialogContent>
                            </Dialog>
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
                Nenhum documento.
              </div>
            ) : null}
            {!loading &&
              documents.map((doc) => {
                const employee = doc.user || doc.employee
                const employeeLabel = employee
                  ? `${employee.name || employee.full_name || 'Funcionário'} • ${employee.email || ''}`
                  : 'Funcionário'
                return (
                  <div key={doc.id} className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-sm">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{doc.title}</p>
                        <p className="text-xs text-muted-foreground">{employeeLabel}</p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDate(doc.updatedAt, i18n.language)} • {t(`documentsPage.tabs.${doc.category}`, doc.category)}
                        </p>
                      </div>
                      <Badge status={doc.status}>{t(`documentsPage.status.${doc.status}`, doc.status)}</Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => handleView(doc)}
                      >
                        <Eye className="h-4 w-4" />
                        Ver
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => downloadDocument(doc.id, `${doc.title || 'documento'}.${doc.extension || 'pdf'}`)}
                      >
                        <Download className="h-4 w-4" />
                        Baixar
                      </Button>
                      <Button type="button" size="sm" variant="outline" onClick={() => handleApprove(doc)} disabled={approving}>
                        <Check className="h-4 w-4" />
                        Aprovar
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
                            Rejeitar
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Rejeitar documento</DialogTitle>
                            <DialogDescription>
                              Explique o que precisa ser corrigido para o colaborador.
                            </DialogDescription>
                          </DialogHeader>
                          <form className="space-y-4" onSubmit={handleReject}>
                            <Textarea
                              rows={4}
                              minLength={5}
                              value={rejectReason}
                              onChange={(event) => setRejectReason(event.target.value)}
                              placeholder="Explique exatamente o que está errado e o que corrigir."
                              required
                            />
                            <DialogFooter className="pt-2">
                              <DialogClose asChild>
                                <Button type="button" variant="ghost">
                                  Cancelar
                                </Button>
                              </DialogClose>
                              <Button type="submit" disabled={rejecting || rejectReason.length < 5} className="min-w-[140px]">
                                {rejecting ? 'Rejeitando…' : 'Rejeitar'}
                              </Button>
                            </DialogFooter>
                          </form>
                        </DialogContent>
                      </Dialog>
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

