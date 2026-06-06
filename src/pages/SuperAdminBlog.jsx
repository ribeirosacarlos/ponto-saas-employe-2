import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  BookOpen,
  CheckCircle2,
  Edit3,
  ImageUp,
  Plus,
  RefreshCcw,
  Trash2,
  Upload,
} from 'lucide-react'
import { PageContainer } from '../components/ui/PageContainer'
import { AppTopBar } from '../components/ui/AppTopBar'
import { Button } from '../components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog'
import { bareFieldInputClass, fieldShellClass, formControlClass, textareaControlClass } from '../components/ui/form-controls'
import { useToast } from '../components/ui/use-toast'
import { useAuthStore } from '../store/useAuth'
import { canRenderCard, getCapabilitiesFromRoles } from '../auth/acl'
import { cn } from '../lib/utils'
import { formatSuperAdminDateTime, resolveSuperAdminError } from '../features/superAdmin/utils'
import {
  createAdminBlogPost,
  createBlogUploadPresign,
  deleteAdminBlogPost,
  getAdminBlogPost,
  listAdminBlogPosts,
  publishAdminBlogPost,
  unpublishAdminBlogPost,
  updateAdminBlogPost,
  uploadFileToPresignedUrl,
} from '../services/blogAdminService'

const ACCESS_REQUIRES = { anyOf: ['super_admin'] }
const LANGS = ['pt', 'es', 'en']
const LANG_LABELS = { pt: 'Português', es: 'Español', en: 'English' }
const STATUS_OPTIONS = ['draft', 'published', 'archived']
const PER_PAGE_OPTIONS = [10, 20, 50]

const makeLocalized = () => ({ pt: '', es: '', en: '' })
const makeToc = () => ({ pt: [], es: [], en: [] })
const makeFaqItem = () => ({ id: `faq-${Date.now()}-${Math.random()}`, question: makeLocalized(), answer: makeLocalized() })

const createEmptyForm = () => ({
  id: '',
  slug: '',
  status: 'draft',
  title: makeLocalized(),
  excerpt: makeLocalized(),
  contentHtml: makeLocalized(),
  heroImageAlt: makeLocalized(),
  heroCaption: makeLocalized(),
  seoTitle: makeLocalized(),
  seoDescription: makeLocalized(),
  toc: makeToc(),
  author: '',
  category: '',
  audienceTag: '',
  coverUrl: '',
  heroImageUrl: '',
  ogImageUrl: '',
  canonicalUrl: '',
  readingTime: '',
  trendingScore: 0,
  featured: false,
  publishedAt: '',
  faq: [],
  relatedPostIds: '',
})

const toDateTimeLocalValue = (value) => {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${year}-${month}-${day}T${hours}:${minutes}`
}

const parseTocTextarea = (value) =>
  value
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const [label, href] = line.split('|').map((part) => part?.trim() ?? '')
      return { label, href }
    })
    .filter((item) => item.label && item.href)

const stringifyToc = (items = []) => items.map((item) => `${item.label || ''}|${item.href || ''}`).join('\n')

const createPayloadFromForm = (form) => ({
  slug: form.slug.trim(),
  author: form.author.trim(),
  category: form.category.trim(),
  status: form.status,
  title: normalizeLocalizedPayload(form.title),
  excerpt: normalizeLocalizedPayload(form.excerpt),
  content_html: normalizeLocalizedPayload(form.contentHtml, true),
  hero_image_alt: normalizeLocalizedPayload(form.heroImageAlt, true),
  hero_caption: normalizeLocalizedPayload(form.heroCaption, true),
  seo_title: normalizeLocalizedPayload(form.seoTitle, true),
  seo_description: normalizeLocalizedPayload(form.seoDescription, true),
  toc: LANGS.reduce((acc, lang) => {
    acc[lang] = parseTocTextarea(form.toc[lang])
    return acc
  }, {}),
  cover_url: form.coverUrl.trim() || null,
  hero_image_url: form.heroImageUrl.trim() || null,
  og_image_url: form.ogImageUrl.trim() || null,
  canonical_url: form.canonicalUrl.trim() || null,
  audience_tag: form.audienceTag.trim() || null,
  reading_time: form.readingTime.trim() || null,
  trending_score: Number(form.trendingScore || 0),
  featured: Boolean(form.featured),
  published_at: form.publishedAt ? new Date(form.publishedAt).toISOString() : null,
  faq: form.faq.map((item) => ({
    question: normalizeLocalizedPayload(item.question),
    answer: normalizeLocalizedPayload(item.answer),
  })),
  related_post_ids: form.relatedPostIds
    .split(/[\n,]+/)
    .map((value) => value.trim())
    .filter(Boolean),
})

function normalizeLocalizedPayload(value, allowNull = false) {
  return LANGS.reduce((acc, lang) => {
    const nextValue = value?.[lang]?.trim?.() ?? ''
    acc[lang] = allowNull && !nextValue ? null : nextValue
    return acc
  }, {})
}

function mapPostToForm(post) {
  const form = createEmptyForm()

  return {
    ...form,
    id: post.id,
    slug: post.slug || '',
    status: post.status || 'draft',
    title: { ...form.title, ...post.title },
    excerpt: { ...form.excerpt, ...post.excerpt },
    contentHtml: { ...form.contentHtml, ...post.contentHtml },
    heroImageAlt: { ...form.heroImageAlt, ...post.heroImageAlt },
    heroCaption: { ...form.heroCaption, ...post.heroCaption },
    seoTitle: { ...form.seoTitle, ...post.seoTitle },
    seoDescription: { ...form.seoDescription, ...post.seoDescription },
    toc: LANGS.reduce((acc, lang) => {
      acc[lang] = stringifyToc(post.toc?.[lang] || [])
      return acc
    }, {}),
    author: post.author || '',
    category: post.category || '',
    audienceTag: post.audienceTag || '',
    coverUrl: post.coverUrl || '',
    heroImageUrl: post.heroImageUrl || '',
    ogImageUrl: post.ogImageUrl || '',
    canonicalUrl: post.canonicalUrl || '',
    readingTime: post.readingTime || '',
    trendingScore: Number(post.trendingScore || 0),
    featured: Boolean(post.featured),
    publishedAt: toDateTimeLocalValue(post.publishedAt),
    faq: Array.isArray(post.faq) && post.faq.length > 0 ? post.faq : [],
    relatedPostIds: Array.isArray(post.relatedPosts) ? post.relatedPosts.map((item) => item.id).join('\n') : '',
  }
}

export default function SuperAdminBlog() {
  const { t, i18n } = useTranslation()
  const { toast } = useToast()
  const roles = useAuthStore((state) => state.roles)
  const capabilities = useMemo(() => getCapabilitiesFromRoles(roles), [roles])
  const hasAccess = useMemo(() => canRenderCard(capabilities, ACCESS_REQUIRES), [capabilities])

  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ status: 'all', category: '', perPage: 20, page: 1 })
  const [pagination, setPagination] = useState({ currentPage: 1, lastPage: 1, total: 0 })
  const [modalOpen, setModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [formLoading, setFormLoading] = useState(false)
  const [formSaving, setFormSaving] = useState(false)
  const [formError, setFormError] = useState('')
  const [formErrors, setFormErrors] = useState({})
  const [form, setForm] = useState(createEmptyForm())
  const [uploadingField, setUploadingField] = useState('')
  const coverUploadRef = useRef(null)
  const heroUploadRef = useRef(null)
  const ogUploadRef = useRef(null)

  const loadPosts = useCallback(async () => {
    if (!hasAccess) return

    setLoading(true)
    setError('')

    try {
      const response = await listAdminBlogPosts({
        status: filters.status === 'all' ? undefined : filters.status,
        category: filters.category.trim() || undefined,
        per_page: filters.perPage,
        page: filters.page,
      })
      setPosts(response.data || [])
      setPagination(response.meta || { currentPage: 1, lastPage: 1, total: 0 })
    } catch (err) {
      setPosts([])
      setPagination({ currentPage: 1, lastPage: 1, total: 0 })
      setError(
        resolveSuperAdminError(
          err,
          t,
          t('superAdmin.blog.states.errorDescription', 'Nao foi possivel carregar os posts do blog.'),
        ),
      )
    } finally {
      setLoading(false)
    }
  }, [filters.category, filters.page, filters.perPage, filters.status, hasAccess, t])

  useEffect(() => {
    void loadPosts()
  }, [loadPosts])

  const sortedCategories = useMemo(() => {
    const values = new Set(posts.map((post) => post.category).filter(Boolean))
    return Array.from(values).sort((a, b) => a.localeCompare(b, i18n.language, { sensitivity: 'base' }))
  }, [i18n.language, posts])

  const resetFormState = () => {
    setForm(createEmptyForm())
    setFormError('')
    setFormErrors({})
    setUploadingField('')
  }

  const openCreateModal = () => {
    setIsEditing(false)
    resetFormState()
    setModalOpen(true)
  }

  const openEditModal = async (postId) => {
    setModalOpen(true)
    setIsEditing(true)
    setFormLoading(true)
    setFormError('')
    setFormErrors({})

    try {
      const post = await getAdminBlogPost(postId)
      setForm(mapPostToForm(post))
    } catch (err) {
      setFormError(
        resolveSuperAdminError(
          err,
          t,
          t('superAdmin.blog.form.errorLoad', 'Nao foi possivel carregar os dados do post.'),
        ),
      )
    } finally {
      setFormLoading(false)
    }
  }

  const closeModal = () => {
    setModalOpen(false)
    setIsEditing(false)
    resetFormState()
  }

  const setLocalizedField = (field, lang, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [lang]: value,
      },
    }))
  }

  const setFaqLocalizedField = (faqId, section, lang, value) => {
    setForm((prev) => ({
      ...prev,
      faq: prev.faq.map((item) =>
        item.id === faqId
          ? {
              ...item,
              [section]: {
                ...item[section],
                [lang]: value,
              },
            }
          : item,
      ),
    }))
  }

  const extractValidationErrors = (err) => err?.response?.data?.errors ?? {}

  const handleSave = async () => {
    setFormSaving(true)
    setFormError('')
    setFormErrors({})

    try {
      const payload = createPayloadFromForm(form)

      if (isEditing && form.id) {
        await updateAdminBlogPost(form.id, payload)
        toast({
          title: t('superAdmin.blog.toast.updatedTitle', 'Post atualizado'),
          description: t('superAdmin.blog.toast.updatedDescription', 'As alteracoes do post foram salvas.'),
        })
      } else {
        await createAdminBlogPost(payload)
        toast({
          title: t('superAdmin.blog.toast.createdTitle', 'Post criado'),
          description: t('superAdmin.blog.toast.createdDescription', 'O novo post foi criado com sucesso.'),
        })
      }

      closeModal()
      await loadPosts()
    } catch (err) {
      setFormErrors(extractValidationErrors(err))
      setFormError(
        resolveSuperAdminError(
          err,
          t,
          t('superAdmin.blog.form.errorSave', 'Nao foi possivel salvar o post.'),
        ),
      )
    } finally {
      setFormSaving(false)
    }
  }

  const handleDelete = async (post) => {
    if (!window.confirm(t('superAdmin.blog.actions.deleteConfirm', 'Deseja remover este post permanentemente?'))) {
      return
    }

    try {
      await deleteAdminBlogPost(post.id)
      toast({
        title: t('superAdmin.blog.toast.deletedTitle', 'Post removido'),
        description: t('superAdmin.blog.toast.deletedDescription', 'O post foi excluido permanentemente.'),
      })
      await loadPosts()
    } catch (err) {
      toast({
        title: t('superAdmin.shared.states.errorTitle', 'Algo deu errado'),
        description: resolveSuperAdminError(
          err,
          t,
          t('superAdmin.blog.toast.deletedError', 'Nao foi possivel excluir o post.'),
        ),
        variant: 'error',
      })
    }
  }

  const handlePublishToggle = async (post) => {
    try {
      if (post.status === 'published') {
        await unpublishAdminBlogPost(post.id)
        toast({
          title: t('superAdmin.blog.toast.unpublishedTitle', 'Post despublicado'),
          description: t('superAdmin.blog.toast.unpublishedDescription', 'O post voltou para rascunho.'),
        })
      } else {
        await publishAdminBlogPost(post.id)
        toast({
          title: t('superAdmin.blog.toast.publishedTitle', 'Post publicado'),
          description: t('superAdmin.blog.toast.publishedDescription', 'O post esta visivel no site publico.'),
        })
      }
      await loadPosts()
    } catch (err) {
      toast({
        title: t('superAdmin.shared.states.errorTitle', 'Algo deu errado'),
        description: resolveSuperAdminError(
          err,
          t,
          t('superAdmin.blog.toast.publishError', 'Nao foi possivel alterar o status do post.'),
        ),
        variant: 'error',
      })
    }
  }

  const handleUpload = async (field, folder, file) => {
    if (!file) return

    setUploadingField(field)
    setFormError('')

    try {
      const { uploadUrl, publicUrl } = await createBlogUploadPresign({
        filename: file.name,
        mimeType: file.type,
        folder,
      })
      await uploadFileToPresignedUrl(uploadUrl, file)
      setForm((prev) => ({ ...prev, [field]: publicUrl }))
      toast({
        title: t('superAdmin.blog.toast.uploadTitle', 'Imagem enviada'),
        description: t('superAdmin.blog.toast.uploadDescription', 'A URL publica foi vinculada ao post.'),
      })
    } catch (err) {
      setFormError(
        resolveSuperAdminError(
          err,
          t,
          t('superAdmin.blog.form.errorUpload', 'Nao foi possivel enviar a imagem.'),
        ),
      )
    } finally {
      setUploadingField('')
    }
  }

  if (!hasAccess) {
    return (
      <PageContainer className="py-6">
        <div className="rounded-2xl border border-border/70 bg-card/95 px-4 py-6 text-sm text-muted-foreground">
          {t('superAdmin.shared.errors.forbidden', 'Voce nao tem permissao para acessar esta area.')}
        </div>
      </PageContainer>
    )
  }

  return (
    <PageContainer className="space-y-6 py-6">
      <AppTopBar
        icon={<BookOpen className="h-5 w-5" />}
        eyebrow={t('superAdmin.nav.section', 'Super Admin')}
        title={t('superAdmin.blog.title', 'Blog')}
        subtitle={t(
          'superAdmin.blog.subtitle',
          'Gerencie posts, status de publicacao e conteudo multilíngue do blog.',
        )}
        filters={
          <>
            <SelectField
              ariaLabel={t('superAdmin.blog.filters.status', 'Status')}
              value={filters.status}
              onChange={(value) => setFilters((prev) => ({ ...prev, status: value, page: 1 }))}
              options={[
                { value: 'all', label: t('superAdmin.blog.filters.allStatuses', 'Todos os status') },
                ...STATUS_OPTIONS.map((status) => ({ value: status, label: status })),
              ]}
            />
            <div className={cn(fieldShellClass, 'min-w-[180px]')}>
              <input
                type="text"
                value={filters.category}
                onChange={(event) => setFilters((prev) => ({ ...prev, category: event.target.value, page: 1 }))}
                placeholder={t('superAdmin.blog.filters.categoryPlaceholder', 'Filtrar categoria')}
                className={bareFieldInputClass}
              />
            </div>
            <SelectField
              ariaLabel={t('superAdmin.blog.filters.perPage', 'Itens por pagina')}
              value={String(filters.perPage)}
              onChange={(value) => setFilters((prev) => ({ ...prev, perPage: Number(value), page: 1 }))}
              options={PER_PAGE_OPTIONS.map((value) => ({ value: String(value), label: `${value}` }))}
            />
          </>
        }
        actions={
          <>
            <Button type="button" variant="outline" size="sm" onClick={() => loadPosts()} disabled={loading}>
              <RefreshCcw className="h-4 w-4" />
              {t('superAdmin.shared.actions.refresh', 'Atualizar')}
            </Button>
            <Button type="button" size="sm" onClick={openCreateModal}>
              <Plus className="h-4 w-4" />
              {t('superAdmin.blog.actions.newPost', 'Novo post')}
            </Button>
          </>
        }
      />

      <section className="rounded-3xl border border-border/80 bg-card/95 p-4 shadow-[0_24px_70px_-44px_rgba(62,82,152,0.35)] sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/80 pb-3">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {t('superAdmin.blog.table.label', 'Conteudo')}
            </p>
            <h2 className="text-sm font-semibold">{t('superAdmin.blog.table.title', 'Posts do blog')}</h2>
          </div>
          <span className="rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary">
            {t('superAdmin.blog.table.count', {
              defaultValue: '{{count}} posts',
              count: pagination.total || posts.length,
            })}
          </span>
        </div>

        <div className="mt-4 space-y-4">
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div
                  key={item}
                  className="h-24 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
                />
              ))}
            </div>
          ) : null}

          {!loading && error ? (
            <div className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-4 text-sm text-rose-600">
              <p className="font-semibold">{t('superAdmin.shared.states.errorTitle', 'Algo deu errado')}</p>
              <p className="mt-1">{error}</p>
            </div>
          ) : null}

          {!loading && !error && posts.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border/70 bg-card/90 px-5 py-6 text-sm text-muted-foreground">
              <p className="font-semibold text-foreground">
                {t('superAdmin.blog.states.emptyTitle', 'Nenhum post encontrado')}
              </p>
              <p className="mt-1">
                {t(
                  'superAdmin.blog.states.emptyDescription',
                  'Crie o primeiro post ou ajuste os filtros para carregar outros resultados.',
                )}
              </p>
            </div>
          ) : null}

          {!loading && !error && posts.length > 0 ? (
            <>
              <div className="space-y-3 md:hidden">
                {posts.map((post) => (
                  <BlogPostCard
                    key={post.id}
                    post={post}
                    t={t}
                    locale={i18n.language}
                    onEdit={openEditModal}
                    onDelete={handleDelete}
                    onPublishToggle={handlePublishToggle}
                  />
                ))}
              </div>

              <div className="hidden overflow-x-auto md:block">
                <table className="min-w-[980px] w-full text-sm">
                  <thead>
                    <tr className="text-left text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                      <th className="px-3 py-3">{t('superAdmin.blog.columns.title', 'Titulo')}</th>
                      <th className="px-3 py-3">{t('superAdmin.blog.columns.status', 'Status')}</th>
                      <th className="px-3 py-3">{t('superAdmin.blog.columns.category', 'Categoria')}</th>
                      <th className="px-3 py-3">{t('superAdmin.blog.columns.author', 'Autor')}</th>
                      <th className="px-3 py-3">{t('superAdmin.blog.columns.readingTime', 'Leitura')}</th>
                      <th className="px-3 py-3">{t('superAdmin.blog.columns.publishedAt', 'Publicado em')}</th>
                      <th className="px-3 py-3">{t('superAdmin.blog.columns.featured', 'Destaque')}</th>
                      <th className="px-3 py-3 text-right">{t('superAdmin.blog.columns.actions', 'Acoes')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {posts.map((post) => (
                      <tr key={post.id} className="border-b border-border/80 last:border-b-0">
                        <td className="px-3 py-4">
                          <div className="space-y-1">
                            <p className="font-semibold">{post.title || '--'}</p>
                            <p className="text-xs text-muted-foreground">{post.slug || post.id}</p>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <StatusBadge status={post.status} />
                        </td>
                        <td className="px-3 py-4">{post.category || '--'}</td>
                        <td className="px-3 py-4">{post.author || '--'}</td>
                        <td className="px-3 py-4">{post.readingTime || '--'}</td>
                        <td className="px-3 py-4">{formatSuperAdminDateTime(post.publishedAt, i18n.language)}</td>
                        <td className="px-3 py-4">{post.featured ? t('superAdmin.shared.values.yes', 'Sim') : t('superAdmin.shared.values.no', 'Nao')}</td>
                        <td className="px-3 py-4">
                          <div className="flex justify-end gap-2">
                            <Button type="button" variant="outline" size="sm" onClick={() => handlePublishToggle(post)}>
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              {post.status === 'published'
                                ? t('superAdmin.blog.actions.unpublish', 'Despublicar')
                                : t('superAdmin.blog.actions.publish', 'Publicar')}
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => openEditModal(post.id)}>
                              <Edit3 className="h-3.5 w-3.5" />
                              {t('superAdmin.blog.actions.edit', 'Editar')}
                            </Button>
                            <Button type="button" variant="outline" size="sm" onClick={() => handleDelete(post)}>
                              <Trash2 className="h-3.5 w-3.5" />
                              {t('superAdmin.blog.actions.delete', 'Excluir')}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-muted-foreground">
                <span>
                  {t('superAdmin.blog.pagination.summary', {
                    defaultValue: 'Pagina {{page}} de {{total}}',
                    page: pagination.currentPage,
                    total: pagination.lastPage,
                  })}
                </span>
                <span>
                  {t('superAdmin.blog.pagination.total', {
                    defaultValue: '{{total}} posts',
                    total: pagination.total,
                  })}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setFilters((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                    disabled={filters.page <= 1 || loading}
                  >
                    {t('superAdmin.shared.pagination.previous', 'Anterior')}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
                    disabled={filters.page >= pagination.lastPage || loading}
                  >
                    {t('superAdmin.shared.pagination.next', 'Proxima')}
                  </Button>
                </div>
              </div>
            </>
          ) : null}
        </div>
      </section>

      <Dialog open={modalOpen} onOpenChange={(nextOpen) => (nextOpen ? setModalOpen(true) : closeModal())}>
        <DialogContent className="flex max-h-[92vh] max-w-[1120px] flex-col overflow-hidden p-0">
          <div className="flex min-h-0 flex-1 flex-col">
            <DialogHeader className="border-b border-border/70 px-6 py-5">
              <DialogTitle>
                {isEditing ? t('superAdmin.blog.form.editTitle', 'Editar post') : t('superAdmin.blog.form.createTitle', 'Novo post')}
              </DialogTitle>
              <DialogDescription>
                {t(
                  'superAdmin.blog.form.description',
                  'Preencha os campos principais, traducoes e metadados do conteúdo do blog.',
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">
              {formLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map((item) => (
                    <div
                      key={item}
                      className="h-24 animate-pulse rounded-2xl border border-border/70 bg-gradient-to-r from-primary/5 via-primary/10 to-primary/5"
                    />
                  ))}
                </div>
              ) : (
                <div className="space-y-5">
                  {formError ? (
                    <div className="rounded-2xl border border-rose-200/60 bg-rose-500/10 px-4 py-3 text-sm text-rose-600">
                      {formError}
                    </div>
                  ) : null}

                  <FormSection title={t('superAdmin.blog.form.sections.general', 'Dados gerais')}>
                    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                      <Field label="Slug" error={fieldError(formErrors, 'slug')}>
                        <input
                          type="text"
                          value={form.slug}
                          onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
                          className={formControlClass}
                        />
                      </Field>
                      <Field label={t('superAdmin.blog.fields.author', 'Autor')} error={fieldError(formErrors, 'author')}>
                        <input
                          type="text"
                          value={form.author}
                          onChange={(event) => setForm((prev) => ({ ...prev, author: event.target.value }))}
                          className={formControlClass}
                        />
                      </Field>
                      <Field label={t('superAdmin.blog.fields.category', 'Categoria')} error={fieldError(formErrors, 'category')}>
                        <input
                          type="text"
                          list="blog-categories"
                          value={form.category}
                          onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                          className={formControlClass}
                        />
                        <datalist id="blog-categories">
                          {sortedCategories.map((category) => (
                            <option key={category} value={category} />
                          ))}
                        </datalist>
                      </Field>
                      <Field label={t('superAdmin.blog.fields.status', 'Status')}>
                        <select
                          value={form.status}
                          onChange={(event) => setForm((prev) => ({ ...prev, status: event.target.value }))}
                          className={formControlClass}
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <Field label={t('superAdmin.blog.fields.audienceTag', 'Audience tag')}>
                        <input
                          type="text"
                          value={form.audienceTag}
                          onChange={(event) => setForm((prev) => ({ ...prev, audienceTag: event.target.value }))}
                          className={formControlClass}
                        />
                      </Field>
                      <Field label={t('superAdmin.blog.fields.readingTime', 'Tempo de leitura')}>
                        <input
                          type="text"
                          value={form.readingTime}
                          onChange={(event) => setForm((prev) => ({ ...prev, readingTime: event.target.value }))}
                          className={formControlClass}
                          placeholder="5 min"
                        />
                      </Field>
                      <Field label={t('superAdmin.blog.fields.trendingScore', 'Trending score')}>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={form.trendingScore}
                          onChange={(event) => setForm((prev) => ({ ...prev, trendingScore: event.target.value }))}
                          className={formControlClass}
                        />
                      </Field>
                      <Field label={t('superAdmin.blog.fields.publishedAt', 'Publicado em')}>
                        <input
                          type="datetime-local"
                          value={form.publishedAt}
                          onChange={(event) => setForm((prev) => ({ ...prev, publishedAt: event.target.value }))}
                          className={formControlClass}
                        />
                      </Field>
                    </div>

                    <label className="inline-flex items-center gap-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={form.featured}
                        onChange={(event) => setForm((prev) => ({ ...prev, featured: event.target.checked }))}
                      />
                      {t('superAdmin.blog.fields.featured', 'Post em destaque')}
                    </label>
                  </FormSection>

                  <FormSection title={t('superAdmin.blog.form.sections.translations', 'Traducoes')}>
                    <div className="space-y-6">
                      <LocalizedFieldGroup
                        title={t('superAdmin.blog.fields.title', 'Titulo')}
                        value={form.title}
                        errors={formErrors}
                        errorPrefix="title"
                        onChange={(lang, value) => setLocalizedField('title', lang, value)}
                      />
                      <LocalizedFieldGroup
                        title={t('superAdmin.blog.fields.excerpt', 'Resumo')}
                        value={form.excerpt}
                        errors={formErrors}
                        errorPrefix="excerpt"
                        multiline
                        onChange={(lang, value) => setLocalizedField('excerpt', lang, value)}
                      />
                      <LocalizedFieldGroup
                        title={t('superAdmin.blog.fields.contentHtml', 'Conteudo HTML')}
                        value={form.contentHtml}
                        errors={formErrors}
                        errorPrefix="content_html"
                        multiline
                        rows={8}
                        onChange={(lang, value) => setLocalizedField('contentHtml', lang, value)}
                      />
                    </div>
                  </FormSection>

                  <FormSection title={t('superAdmin.blog.form.sections.media', 'Mídia e SEO')}>
                    <div className="space-y-4">
                      <UploadUrlField
                        label={t('superAdmin.blog.fields.coverUrl', 'Imagem de capa')}
                        value={form.coverUrl}
                        onChange={(value) => setForm((prev) => ({ ...prev, coverUrl: value }))}
                        onTriggerUpload={() => coverUploadRef.current?.click()}
                        uploading={uploadingField === 'coverUrl'}
                      />
                      <input
                        ref={coverUploadRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => void handleUpload('coverUrl', 'covers', event.target.files?.[0])}
                      />

                      <UploadUrlField
                        label={t('superAdmin.blog.fields.heroImageUrl', 'Imagem hero')}
                        value={form.heroImageUrl}
                        onChange={(value) => setForm((prev) => ({ ...prev, heroImageUrl: value }))}
                        onTriggerUpload={() => heroUploadRef.current?.click()}
                        uploading={uploadingField === 'heroImageUrl'}
                      />
                      <input
                        ref={heroUploadRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => void handleUpload('heroImageUrl', 'heroes', event.target.files?.[0])}
                      />

                      <UploadUrlField
                        label={t('superAdmin.blog.fields.ogImageUrl', 'Imagem OG')}
                        value={form.ogImageUrl}
                        onChange={(value) => setForm((prev) => ({ ...prev, ogImageUrl: value }))}
                        onTriggerUpload={() => ogUploadRef.current?.click()}
                        uploading={uploadingField === 'ogImageUrl'}
                      />
                      <input
                        ref={ogUploadRef}
                        type="file"
                        accept="image/png,image/jpeg,image/webp"
                        className="hidden"
                        onChange={(event) => void handleUpload('ogImageUrl', 'og', event.target.files?.[0])}
                      />

                      <Field label={t('superAdmin.blog.fields.canonicalUrl', 'Canonical URL')}>
                        <input
                          type="text"
                          value={form.canonicalUrl}
                          onChange={(event) => setForm((prev) => ({ ...prev, canonicalUrl: event.target.value }))}
                          className={formControlClass}
                        />
                      </Field>

                      <LocalizedFieldGroup
                        title={t('superAdmin.blog.fields.heroImageAlt', 'Texto alternativo da hero')}
                        value={form.heroImageAlt}
                        errors={formErrors}
                        errorPrefix="hero_image_alt"
                        onChange={(lang, value) => setLocalizedField('heroImageAlt', lang, value)}
                      />
                      <LocalizedFieldGroup
                        title={t('superAdmin.blog.fields.heroCaption', 'Legenda da hero')}
                        value={form.heroCaption}
                        errors={formErrors}
                        errorPrefix="hero_caption"
                        multiline
                        onChange={(lang, value) => setLocalizedField('heroCaption', lang, value)}
                      />
                      <LocalizedFieldGroup
                        title={t('superAdmin.blog.fields.seoTitle', 'SEO title')}
                        value={form.seoTitle}
                        errors={formErrors}
                        errorPrefix="seo_title"
                        onChange={(lang, value) => setLocalizedField('seoTitle', lang, value)}
                      />
                      <LocalizedFieldGroup
                        title={t('superAdmin.blog.fields.seoDescription', 'SEO description')}
                        value={form.seoDescription}
                        errors={formErrors}
                        errorPrefix="seo_description"
                        multiline
                        onChange={(lang, value) => setLocalizedField('seoDescription', lang, value)}
                      />
                    </div>
                  </FormSection>

                  <FormSection title={t('superAdmin.blog.form.sections.structure', 'TOC, FAQ e relacionados')}>
                    <LocalizedFieldGroup
                      title={t('superAdmin.blog.fields.toc', 'Tabela de conteudo')}
                      helper={t('superAdmin.blog.fields.tocHelper', 'Uma linha por item no formato label|href')}
                      value={form.toc}
                      errors={formErrors}
                      errorPrefix="toc"
                      multiline
                      rows={5}
                      onChange={(lang, value) => setLocalizedField('toc', lang, value)}
                    />

                    <div className="space-y-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h3 className="text-sm font-semibold">{t('superAdmin.blog.fields.faq', 'FAQ')}</h3>
                          <p className="text-xs text-muted-foreground">
                            {t('superAdmin.blog.fields.faqHelper', 'Se enviado, a lista inteira substitui o FAQ atual do post.')}
                          </p>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => setForm((prev) => ({ ...prev, faq: [...prev.faq, makeFaqItem()] }))}
                        >
                          <Plus className="h-4 w-4" />
                          {t('superAdmin.blog.actions.addFaq', 'Adicionar FAQ')}
                        </Button>
                      </div>

                      {form.faq.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border/70 px-4 py-4 text-sm text-muted-foreground">
                          {t('superAdmin.blog.states.emptyFaq', 'Nenhum item de FAQ adicionado.')}
                        </div>
                      ) : null}

                      {form.faq.map((item, index) => (
                        <div key={item.id} className="rounded-2xl border border-border/70 bg-background/40 p-4">
                          <div className="mb-3 flex items-center justify-between gap-3">
                            <p className="text-sm font-semibold">
                              {t('superAdmin.blog.fields.faqItem', {
                                defaultValue: 'FAQ {{index}}',
                                index: index + 1,
                              })}
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  faq: prev.faq.filter((faqItem) => faqItem.id !== item.id),
                                }))
                              }
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              {t('superAdmin.blog.actions.removeFaq', 'Remover')}
                            </Button>
                          </div>

                          <LocalizedFaqGroup
                            title={t('superAdmin.blog.fields.question', 'Pergunta')}
                            value={item.question}
                            onChange={(lang, value) => setFaqLocalizedField(item.id, 'question', lang, value)}
                          />
                          <div className="mt-4">
                            <LocalizedFaqGroup
                              title={t('superAdmin.blog.fields.answer', 'Resposta')}
                              value={item.answer}
                              multiline
                              onChange={(lang, value) => setFaqLocalizedField(item.id, 'answer', lang, value)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    <Field
                      label={t('superAdmin.blog.fields.relatedPostIds', 'Related post IDs')}
                      helper={t('superAdmin.blog.fields.relatedPostIdsHelper', 'Informe um UUID por linha ou separado por virgula.')}
                    >
                      <textarea
                        value={form.relatedPostIds}
                        onChange={(event) => setForm((prev) => ({ ...prev, relatedPostIds: event.target.value }))}
                        rows={4}
                        className={textareaControlClass}
                      />
                    </Field>
                  </FormSection>
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-border/70 px-6 py-4">
              <Button type="button" variant="outline" onClick={closeModal}>
                {t('common.actions.cancel', 'Cancelar')}
              </Button>
              <Button type="button" onClick={() => void handleSave()} disabled={formLoading || formSaving}>
                {formSaving ? t('superAdmin.shared.actions.saving', 'Salvando...') : t('superAdmin.shared.actions.save', 'Salvar')}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </PageContainer>
  )
}

function BlogPostCard({ post, t, locale, onEdit, onDelete, onPublishToggle }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card/95 p-4 shadow-[0_30px_90px_-70px_rgba(62,82,152,0.45)]">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold leading-snug">{post.title || '--'}</p>
          <p className="mt-1 text-[11px] text-muted-foreground">{post.slug || post.id}</p>
        </div>
        <StatusBadge status={post.status} />
      </div>
      <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
        <Info label={t('superAdmin.blog.columns.category', 'Categoria')}>{post.category || '--'}</Info>
        <Info label={t('superAdmin.blog.columns.author', 'Autor')}>{post.author || '--'}</Info>
        <Info label={t('superAdmin.blog.columns.readingTime', 'Leitura')}>{post.readingTime || '--'}</Info>
        <Info label={t('superAdmin.blog.columns.publishedAt', 'Publicado em')}>
          {formatSuperAdminDateTime(post.publishedAt, locale)}
        </Info>
      </div>
      <div className="mt-4 flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onPublishToggle(post)}>
          <CheckCircle2 className="h-3.5 w-3.5" />
          {post.status === 'published' ? t('superAdmin.blog.actions.unpublish', 'Despublicar') : t('superAdmin.blog.actions.publish', 'Publicar')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onEdit(post.id)}>
          <Edit3 className="h-3.5 w-3.5" />
          {t('superAdmin.blog.actions.edit', 'Editar')}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onDelete(post)}>
          <Trash2 className="h-3.5 w-3.5" />
          {t('superAdmin.blog.actions.delete', 'Excluir')}
        </Button>
      </div>
    </div>
  )
}

function FormSection({ title, children }) {
  return (
    <section className="space-y-4 rounded-2xl border border-border/70 bg-background/40 p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </section>
  )
}

function Field({ label, helper, error, children }) {
  return (
    <label className="block space-y-1.5">
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      {children}
      {helper ? <span className="text-xs text-muted-foreground">{helper}</span> : null}
      {error ? <span className="text-xs text-rose-600">{error}</span> : null}
    </label>
  )
}

function LocalizedFieldGroup({ title, helper, value, errors, errorPrefix, multiline = false, rows = 4, onChange }) {
  return (
    <div className="space-y-3">
      <div>
        <h3 className="text-sm font-semibold">{title}</h3>
        {helper ? <p className="text-xs text-muted-foreground">{helper}</p> : null}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        {LANGS.map((lang) => (
          <Field key={lang} label={LANG_LABELS[lang]} error={fieldError(errors, `${errorPrefix}.${lang}`)}>
            {multiline ? (
              <textarea
                value={value?.[lang] ?? ''}
                onChange={(event) => onChange(lang, event.target.value)}
                rows={rows}
                className={textareaControlClass}
              />
            ) : (
              <input
                type="text"
                value={value?.[lang] ?? ''}
                onChange={(event) => onChange(lang, event.target.value)}
                className={formControlClass}
              />
            )}
          </Field>
        ))}
      </div>
    </div>
  )
}

function LocalizedFaqGroup({ title, value, multiline = false, onChange }) {
  return (
    <div className="grid gap-4 lg:grid-cols-3">
      {LANGS.map((lang) => (
        <Field key={lang} label={`${title} - ${LANG_LABELS[lang]}`}>
          {multiline ? (
            <textarea
              value={value?.[lang] ?? ''}
              onChange={(event) => onChange(lang, event.target.value)}
              rows={4}
              className={textareaControlClass}
            />
          ) : (
            <input
              type="text"
              value={value?.[lang] ?? ''}
              onChange={(event) => onChange(lang, event.target.value)}
              className={formControlClass}
            />
          )}
        </Field>
      ))}
    </div>
  )
}

function UploadUrlField({ label, value, onChange, onTriggerUpload, uploading }) {
  return (
    <div className="grid gap-2 lg:grid-cols-[1fr_auto]">
      <Field label={label}>
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            className={formControlClass}
          />
        </div>
      </Field>
      <div className="flex items-end">
        <Button type="button" variant="outline" onClick={onTriggerUpload} disabled={uploading}>
          {uploading ? <Upload className="h-4 w-4" /> : <ImageUp className="h-4 w-4" />}
          {uploading ? 'Upload...' : 'Upload'}
        </Button>
      </div>
    </div>
  )
}

function SelectField({ ariaLabel, value, onChange, options }) {
  return (
    <div className={cn(fieldShellClass, 'min-w-[150px]')}>
      <select
        aria-label={ariaLabel}
        className={bareFieldInputClass}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

function StatusBadge({ status }) {
  const normalized = String(status || '').toLowerCase()
  const className =
    normalized === 'published'
      ? 'border-emerald-200/70 bg-emerald-500/10 text-emerald-700'
      : normalized === 'archived'
        ? 'border-slate-200/70 bg-slate-500/10 text-slate-700'
        : 'border-amber-200/70 bg-amber-500/10 text-amber-700'

  return <span className={cn('inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold', className)}>{status || 'draft'}</span>
}

function Info({ label, children }) {
  return (
    <div className="space-y-1">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</p>
      <div className="text-foreground">{children}</div>
    </div>
  )
}

function fieldError(errors, key) {
  const value = errors?.[key]
  return Array.isArray(value) ? value[0] : ''
}
