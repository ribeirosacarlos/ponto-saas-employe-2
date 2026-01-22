import { useEffect, useMemo, useRef, useState } from 'react'
import { Download, Eye, FileText, Plus, RefreshCcw, Trash2, Upload } from 'lucide-react'
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
import { cn } from '../lib/utils'
import { useToast } from '../components/ui/use-toast'
import {
  deleteDocument,
  downloadDocument,
  listMyDocuments,
  resendDocument,
  uploadDocuments,
  fetchDocumentBlob,
} from '../services/documentsService'
import { DocumentPreviewModal } from '../components/DocumentPreviewModal'

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'payroll', label: 'Holerites' },
  { value: 'courses', label: 'Cursos' },
  { value: 'personal', label: 'Pessoais' },
  { value: 'others', label: 'Outros' },
]

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pending', label: 'Pendente' },
  { value: 'review', label: 'Em revisão' },
  { value: 'available', label: 'Disponível' },
  { value: 'expired', label: 'Vencido' },
]

const STATUS_TONES = {
  available: 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700',
  pending: 'border-amber-200/70 bg-amber-500/10 text-amber-700',
  review: 'border-sky-200/70 bg-sky-500/10 text-sky-700',
  expired: 'border-rose-200/70 bg-rose-500/10 text-rose-700',
}

const ALLOWED_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx', 'xls', 'xlsx']
const MAX_FILE_SIZE = 5 * 1024 * 1024

const skeletonRows = Array.from({ length: 5 }).map((_, i) => i)

function Badge({ status, children }) {
  const tone = STATUS_TONES[status] || 'border-border/60 text-foreground'
  return (
    <span className={cn('inline-flex items-center rounded-full border px-3 py-1 text-[11px] font-semibold', tone)}>
      {children}
    </span>
  )
}

function FileInputHint({ size, allowed }) {
  return (
    <p className="text-[11px] text-muted-foreground">
      Máx. {size} • {allowed}
    </p>
  )
}

const formatDate = (value, locale = 'pt-BR') => {
  if (!value) return '—'
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

  const [uploadOpen, setUploadOpen] = useState(false)
  const [resendOpen, setResendOpen] = useState(false)
  const [resendTarget, setResendTarget] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [resending, setResending] = useState(false)

  const [uploadForm, setUploadForm] = useState({ category: '', notes: '', files: [] })
  const [resendFile, setResendFile] = useState(null)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewError, setPreviewError] = useState('')
  const [previewUrl, setPreviewUrl] = useState('')
  const [previewMime, setPreviewMime] = useState('')
  const [selectedDocument, setSelectedDocument] = useState(null)

  const fileInputRef = useRef(null)
  const resendInputRef = useRef(null)

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
      const message = err?.response?.data?.message || err.message || 'Não foi possível carregar documentos.'
      setError(message)
      toast({
        title: 'Erro ao carregar',
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
    return `${meta.total} itens`
  }, [meta])

  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || (meta.lastPage && nextPage > meta.lastPage)) return
    setPage(nextPage)
    loadDocuments({ page: nextPage })
  }

  const handleDelete = async (doc) => {
    const confirmed = typeof window !== 'undefined' ? window.confirm('Deseja excluir este documento?') : true
    if (!confirmed) return
    try {
      await deleteDocument(doc.id)
      toast({ title: 'Documento excluído', description: doc.title })
      loadDocuments({ page })
    } catch (err) {
      const status = err?.response?.status
      const friendly =
        status === 403 || status === 422
          ? err?.response?.data?.message || 'Ação não permitida.'
          : err?.message || 'Não foi possível excluir.'
      toast({ title: 'Erro ao excluir', description: friendly, variant: 'destructive' })
    }
  }

  const handleDownload = async (doc) => {
    try {
      await downloadDocument(doc.id, `${doc.title || 'documento'}.${doc.extension || 'pdf'}`)
    } catch (err) {
      toast({
        title: 'Falha no download',
        description: err?.response?.data?.message || err.message || 'Tente novamente.',
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

  const validateFiles = (files, single = false) => {
    if (!files || !files.length) {
      toast({ title: 'Selecione arquivos', description: 'Envie ao menos um arquivo.' })
      return false
    }

    const list = Array.from(files)
    if (single && list.length > 1) {
      toast({ title: 'Apenas um arquivo', description: 'Escolha somente um arquivo para reenviar.' })
      return false
    }

    for (const file of list) {
      if (!file || !file.name) {
        toast({ title: 'Arquivo inválido', description: 'Selecione um arquivo válido.' })
        return false
      }
      const ext = (file.name.split('.').pop() || '').toLowerCase()
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast({
          title: 'Extensão não permitida',
          description: `${file.name} não é aceito. Tipos: ${ALLOWED_EXTENSIONS.join(', ')}`,
          variant: 'destructive',
        })
        return false
      }
      if (file.size > MAX_FILE_SIZE) {
        toast({
          title: 'Arquivo grande demais',
          description: `${file.name} excede 5MB.`,
          variant: 'destructive',
        })
        return false
      }
    }
    return true
  }

  const submitUpload = async (event) => {
    event?.preventDefault()
    if (!validateFiles(uploadForm.files)) return
    if (!uploadForm.category) {
      toast({ title: 'Selecione a categoria', description: 'Categoria é obrigatória.', variant: 'destructive' })
      return
    }

    const formData = new FormData()
    uploadForm.files.forEach((file) => formData.append('files[]', file))
    formData.append('category', uploadForm.category)
    if (uploadForm.notes) formData.append('notes', uploadForm.notes)

    setUploading(true)
    try {
      await uploadDocuments(formData)
      toast({ title: 'Documento enviado', description: 'Enviamos seus arquivos para revisão.' })
      setUploadOpen(false)
      setUploadForm({ category: '', notes: '', files: [] })
      loadDocuments({ page: 1 })
      setPage(1)
    } catch (err) {
      toast({
        title: 'Erro ao enviar',
        description: err?.response?.data?.message || err.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setUploading(false)
    }
  }

  const submitResend = async (event) => {
    event?.preventDefault()
    if (!resendTarget) return
    if (!validateFiles([resendFile], true)) return
    const formData = new FormData()
    formData.append('file', resendFile)
    setResending(true)
    try {
      await resendDocument(resendTarget.id, formData)
      toast({ title: 'Documento reenviado', description: resendTarget.title })
      setResendOpen(false)
      setResendTarget(null)
      setResendFile(null)
      loadDocuments({ page })
    } catch (err) {
      toast({
        title: 'Erro ao reenviar',
        description: err?.response?.data?.message || err.message || 'Tente novamente.',
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

  return (
    <div className="relative min-h-screen overflow-hidden bg-transparent text-foreground">
      <PageContainer className="relative z-10 flex flex-col gap-5 py-6">
        <header className="flex flex-wrap items-start justify-between gap-4 rounded-[28px] border border-border/80 bg-card/90 px-5 py-6 shadow-[0_18px_90px_-60px_rgba(62,82,152,0.55)] backdrop-blur-2xl">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/12 text-primary">
                <FileText className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.28em] text-muted-foreground">Documentos</p>
                <h1 className="text-2xl font-semibold leading-tight">Envie e acompanhe seus documentos</h1>
                <p className="text-sm text-muted-foreground">Upload rápido, visualização e status em tempo real.</p>
              </div>
            </div>
            {error ? (
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-300/60 bg-amber-50/80 px-3 py-1 text-sm text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-50">
                {error}
              </div>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => loadDocuments({ page })} className="gap-2">
              <RefreshCcw className="h-4 w-4" />
              Atualizar
            </Button>
            <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
              <DialogTrigger asChild>
                <Button type="button" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Enviar documentos
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Enviar documentos</DialogTitle>
                  <DialogDescription>Selecione os arquivos e defina a categoria.</DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={submitUpload}>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Categoria *</label>
                    <select
                      className="w-full rounded-2xl border border-border/70 bg-background/70 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30"
                      value={uploadForm.category}
                      onChange={(event) => setUploadForm((prev) => ({ ...prev, category: event.target.value }))}
                      required
                    >
                      <option value="">Selecione</option>
                      {CATEGORY_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-semibold">Observações (opcional)</label>
                    <Textarea
                      rows={3}
                      value={uploadForm.notes}
                      onChange={(event) => setUploadForm((prev) => ({ ...prev, notes: event.target.value }))}
                      placeholder="Informações adicionais para o RH"
                    />
                  </div>

                  <div className="space-y-3">
                    <Input
                      ref={fileInputRef}
                      type="file"
                      multiple
                      accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
                      className="cursor-pointer"
                      onChange={(event) =>
                        setUploadForm((prev) => ({ ...prev, files: Array.from(event.target.files || []) }))
                      }
                    />
                    <FileInputHint size="5MB" allowed={ALLOWED_EXTENSIONS.join(', ')} />
                    {uploadForm.files.length ? (
                      <div className="rounded-xl border border-border/70 bg-muted/40 px-3 py-2 text-sm">
                        {uploadForm.files.map((file) => (
                          <div key={file.name} className="flex items-center justify-between gap-2 text-[13px]">
                            <span className="truncate">{file.name}</span>
                            <span className="text-muted-foreground">{(file.size / 1024).toFixed(0)} KB</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <DialogFooter className="pt-2">
                    <DialogClose asChild>
                      <Button type="button" variant="ghost">
                        Cancelar
                      </Button>
                    </DialogClose>
                    <Button type="submit" disabled={uploading} className="min-w-[160px]">
                      {uploading ? 'Enviando…' : 'Enviar'}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <section className="grid gap-4 rounded-[28px] border border-border/80 bg-card/90 p-5 shadow-[0_18px_90px_-60px_rgba(62,82,152,0.55)]">
          <div className="grid gap-3 md:grid-cols-[2fr_1fr_1fr]">
            <Input
              placeholder="Buscar por título"
              value={filters.search}
              onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
            />
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
            <select
              className="rounded-xl border border-border/70 bg-background/70 px-3 py-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary/30"
              value={filters.status}
              onChange={(event) => setFilters((prev) => ({ ...prev, status: event.target.value }))}
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
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
                <p className="text-sm text-muted-foreground">Nenhum documento encontrado.</p>
                <Button type="button" className="mt-3" onClick={() => setUploadOpen(true)}>
                  Enviar documentos
                </Button>
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
                        {doc.extension || 'Arquivo'} • {doc.sizeLabel}
                      </p>
                    </div>
                    <Badge status={doc.status}>{t(`documentsPage.status.${doc.status}`, doc.status)}</Badge>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-muted-foreground">
                    <span>
                      {t(`documentsPage.tabs.${doc.category}`, doc.category)} • {formatDate(doc.updatedAt, i18n.language)}
                    </span>
                    <div className="flex items-center gap-2">
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
                        onClick={() => handleDownload(doc)}
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted active:scale-[0.98]"
                        title="Excluir"
                        onClick={() => handleDelete(doc)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                  {doc.status === 'review' ? (
                    <button
                      type="button"
                      className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-primary underline"
                      onClick={() => {
                        setResendTarget(doc)
                        setResendOpen(true)
                      }}
                    >
                      <Upload className="h-4 w-4" />
                      Reenviar
                    </button>
                  ) : null}
                </div>
              ))}
          </div>

          <div className="hidden md:block rounded-[24px] border border-border/70 bg-card/95 shadow-[0_30px_90px_-60px_rgba(62,82,152,0.55)]">
            <div className="overflow-x-auto">
              <div className="min-w-[960px]">
                <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_180px] gap-3 rounded-t-3xl border-b border-border/70 bg-background/80 px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  <span>Documento</span>
                  <span>Categoria</span>
                  <span>Status</span>
                  <span>Tipo</span>
                  <span>Tamanho</span>
                  <span className="text-right">Ações</span>
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
                      Nenhum documento encontrado. <br />
                      <Button type="button" className="mt-3" onClick={() => setUploadOpen(true)}>
                        Enviar documentos
                      </Button>
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
                            Atualizado em {formatDate(doc.updatedAt, i18n.language)}
                          </span>
                        </div>
                        <span>{t(`documentsPage.tabs.${doc.category}`, doc.category)}</span>
                        <Badge status={doc.status}>{t(`documentsPage.status.${doc.status}`, doc.status)}</Badge>
                        <span>{doc.extension?.toUpperCase() || 'Arquivo'}</span>
                        <span>{doc.sizeLabel}</span>
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
                            onClick={() => handleDownload(doc)}
                          >
                            <Download className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted active:scale-[0.98]"
                            title="Excluir"
                            onClick={() => handleDelete(doc)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                          {doc.status === 'review' ? (
                            <button
                              type="button"
                              className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-background/80 text-foreground shadow-sm transition hover:-translate-y-0.5 hover:bg-muted active:scale-[0.98]"
                              title="Reenviar"
                              onClick={() => {
                                setResendTarget(doc)
                                setResendOpen(true)
                              }}
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

      <Dialog open={resendOpen} onOpenChange={setResendOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reenviar documento</DialogTitle>
            <DialogDescription>
              {resendTarget?.rejectedComment
                ? `Motivo: ${resendTarget.rejectedComment}`
                : 'Envie uma nova versão do arquivo solicitado.'}
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-4" onSubmit={submitResend}>
            <Input
              ref={resendInputRef}
              type="file"
              accept={ALLOWED_EXTENSIONS.map((ext) => `.${ext}`).join(',')}
              onChange={(event) => setResendFile((event.target.files || [])[0])}
              required
            />
            <FileInputHint size="5MB" allowed={ALLOWED_EXTENSIONS.join(', ')} />
            <DialogFooter className="pt-2">
              <DialogClose asChild>
                <Button type="button" variant="ghost">
                  Cancelar
                </Button>
              </DialogClose>
              <Button type="submit" disabled={resending || !resendFile} className="min-w-[160px]">
                {resending ? 'Reenviando…' : 'Reenviar'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

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
