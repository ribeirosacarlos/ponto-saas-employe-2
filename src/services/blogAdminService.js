import axios from 'axios'
import { api } from './http/api'
import { cleanQueryParams } from '../features/superAdmin/utils'

const POSTS_PATH = '/v1/admin/blog/posts'
const UPLOADS_PATH = '/v1/admin/blog/uploads/presign'
const LANGS = ['pt', 'es', 'en']

const normalizeLocalizedField = (value) =>
  LANGS.reduce((acc, lang) => {
    acc[lang] = value?.[lang] ?? ''
    return acc
  }, {})

const normalizeTocField = (value) =>
  LANGS.reduce((acc, lang) => {
    acc[lang] = Array.isArray(value?.[lang]) ? value[lang] : []
    return acc
  }, {})

const normalizeFaqItem = (item = {}, index = 0) => ({
  id: item?.id ?? `faq-${index}`,
  question: normalizeLocalizedField(item?.question),
  answer: normalizeLocalizedField(item?.answer),
})

const normalizeRelatedPost = (post = {}, index = 0) => ({
  id: post?.id ?? `related-post-${index}`,
  slug: post?.slug ?? '',
  title: post?.title ?? '',
})

const normalizePostListItem = (post = {}, index = 0) => ({
  id: post?.id ?? `blog-post-${index}`,
  slug: post?.slug ?? '',
  title: post?.title ?? '',
  excerpt: post?.excerpt ?? '',
  coverUrl: post?.cover_url ?? post?.coverUrl ?? '',
  category: post?.category ?? '',
  author: post?.author ?? '',
  readingTime: post?.reading_time ?? post?.readingTime ?? '',
  publishedAt: post?.published_at ?? post?.publishedAt ?? null,
  featured: Boolean(post?.featured),
  trendingScore: Number(post?.trending_score ?? post?.trendingScore ?? 0),
  status: post?.status ?? 'draft',
  raw: post,
})

const normalizePaginationMeta = (meta = {}) => {
  const currentPage = meta.current_page ?? meta.currentPage ?? meta.page ?? 1
  const perPage = meta.per_page ?? meta.perPage ?? 20
  const total = meta.total ?? 0
  const explicitLastPage = meta.last_page ?? meta.lastPage

  return {
    currentPage,
    perPage,
    total,
    lastPage: explicitLastPage ?? Math.max(1, Math.ceil(total / Math.max(1, perPage))),
  }
}

export const normalizeBlogPostDetail = (post = {}) => ({
  id: post?.id ?? '',
  slug: post?.slug ?? '',
  status: post?.status ?? 'draft',
  title: normalizeLocalizedField(post?.title),
  excerpt: normalizeLocalizedField(post?.excerpt),
  contentHtml: normalizeLocalizedField(post?.content_html),
  heroImageAlt: normalizeLocalizedField(post?.hero_image_alt),
  heroCaption: normalizeLocalizedField(post?.hero_caption),
  seoTitle: normalizeLocalizedField(post?.seo_title),
  seoDescription: normalizeLocalizedField(post?.seo_description),
  toc: normalizeTocField(post?.toc),
  author: post?.author ?? '',
  category: post?.category ?? '',
  audienceTag: post?.audience_tag ?? '',
  coverUrl: post?.cover_url ?? '',
  heroImageUrl: post?.hero_image_url ?? '',
  ogImageUrl: post?.og_image_url ?? '',
  canonicalUrl: post?.canonical_url ?? '',
  readingTime: post?.reading_time ?? '',
  trendingScore: Number(post?.trending_score ?? 0),
  featured: Boolean(post?.featured),
  publishedAt: post?.published_at ?? null,
  faq: Array.isArray(post?.faq) ? post.faq.map(normalizeFaqItem) : [],
  relatedPosts: Array.isArray(post?.related_posts) ? post.related_posts.map(normalizeRelatedPost) : [],
  raw: post,
})

export async function listAdminBlogPosts(params = {}) {
  const { data } = await api.get(POSTS_PATH, {
    params: cleanQueryParams({
      status: params.status,
      category: params.category,
      per_page: params.per_page,
      page: params.page,
    }),
  })

  return {
    data: Array.isArray(data?.data) ? data.data.map(normalizePostListItem) : [],
    meta: normalizePaginationMeta(data?.meta ?? {}),
  }
}

export async function getAdminBlogPost(id) {
  const { data } = await api.get(`${POSTS_PATH}/${id}`)
  return normalizeBlogPostDetail(data?.data ?? data)
}

export async function createAdminBlogPost(payload) {
  const { data } = await api.post(POSTS_PATH, payload)
  return normalizeBlogPostDetail(data?.data ?? data)
}

export async function updateAdminBlogPost(id, payload) {
  const { data } = await api.put(`${POSTS_PATH}/${id}`, payload)
  return normalizeBlogPostDetail(data?.data ?? data)
}

export async function deleteAdminBlogPost(id) {
  await api.delete(`${POSTS_PATH}/${id}`)
}

export async function publishAdminBlogPost(id) {
  const { data } = await api.patch(`${POSTS_PATH}/${id}/publish`)
  return normalizeBlogPostDetail(data?.data ?? data)
}

export async function unpublishAdminBlogPost(id) {
  const { data } = await api.patch(`${POSTS_PATH}/${id}/unpublish`)
  return normalizeBlogPostDetail(data?.data ?? data)
}

export async function createBlogUploadPresign({ filename, mimeType, folder }) {
  const { data } = await api.post(UPLOADS_PATH, {
    filename,
    mime_type: mimeType,
    folder,
  })

  return {
    uploadUrl: data?.upload_url ?? '',
    publicUrl: data?.public_url ?? '',
  }
}

export async function uploadFileToPresignedUrl(uploadUrl, file) {
  await axios.put(uploadUrl, file, {
    headers: {
      'Content-Type': file.type,
    },
  })
}
