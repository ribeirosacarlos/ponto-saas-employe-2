# Blog — API Pública (para o site)

**Base URL:** `/api/v1/public/blog`
**Auth:** Nenhuma (rotas públicas, sem token)
**Formato:** JSON
**Idiomas suportados:** `pt`, `es`, `en`

---

## Visão Geral

O conteúdo do blog é multilíngue (Spatie Translatable). Ao contrário das rotas admin
(ver `docs/BLOG_MODULE.md`), **as rotas públicas já retornam os campos traduzíveis
resolvidos como string/array simples no idioma solicitado** — nunca como objeto
`{ pt, es, en }`.

| Método | Rota                              | Descrição                          |
|--------|-----------------------------------|-------------------------------------|
| `GET`  | `/public/blog/posts`              | Lista posts publicados (paginado)   |
| `GET`  | `/public/blog/posts/{slug}`       | Detalhe de um post publicado        |
| `GET`  | `/public/blog/categories`         | Lista categorias do blog            |
| `GET`  | `/sitemap-blog.xml`               | Sitemap XML dos posts publicados (fora do `/api`) |

**Regra geral de visibilidade:** apenas posts com `status = "published"` **e**
`published_at <= NOW()` são retornados. Qualquer outro caso (status diferente,
ou `published_at` no futuro) é tratado como inexistente — `404` no detalhe,
ausente na listagem e no sitemap.

---

## GET /public/blog/posts

Lista posts publicados, paginada. Ordenados por `published_at` decrescente.

**Query params:**

| Param      | Tipo    | Default              | Descrição                                              |
|------------|---------|----------------------|----------------------------------------------------------|
| `lang`     | string  | `es`                 | `pt`, `es` ou `en`. Se ausente ou inválido, usa `es` (sem `422`) |
| `category` | string  | —                    | Filtra por `category` (valor cru, igual ao salvo)         |
| `q`        | string  | —                    | Busca textual em `title`/`excerpt`, no idioma de `lang`    |
| `page`     | int     | `1`                  | Página atual                                               |
| `per_page` | int     | `9`                  | Itens por página                                           |

> **Params extras (opcionais, não exigidos pela spec do site):**
> - `featured` (`true`/`false`) — filtra posts marcados como destaque.
> - `sort` (`published_at_desc` | `trending_score_desc`) — ordenação alternativa.
>   Default: `published_at_desc`.

**Response 200:**

```json
{
  "data": [
    {
      "id": "uuid",
      "slug": "como-usar-ponto-saas",
      "title": "Como usar o Ponto SaaS",
      "excerpt": "Aprenda a usar o sistema...",
      "cover_url": "https://cdn.exemplo.com/blog/covers/abc.jpg",
      "category": "tutoriais",
      "audience_tag": "rh",
      "author": "Carlos",
      "reading_time": "5 min",
      "published_at": "2026-05-01T12:00:00+00:00",
      "featured": false,
      "trending_score": 0
    }
  ],
  "meta": {
    "total": 42,
    "page": 1,
    "per_page": 9
  }
}
```

> `title` e `excerpt` já vêm resolvidos no idioma de `lang` (string simples,
> não objeto `{pt,es,en}`).

---

## GET /public/blog/posts/{slug}

Retorna o post completo, resolvido no idioma `lang`. Caso o `slug` não exista,
ou exista mas não esteja `published` (ou tenha `published_at` no futuro), retorna
**404**.

**Query params:**

| Param  | Tipo   | Default | Descrição                                      |
|--------|--------|---------|--------------------------------------------------|
| `lang` | string | `es`    | `pt`, `es` ou `en`. Se ausente ou inválido, usa `es` (sem `422`) |

**Response 200:**

```json
{
  "data": {
    "id": "uuid",
    "slug": "como-usar-ponto-saas",
    "title": "Como usar o Ponto SaaS",
    "excerpt": "Aprenda a usar o sistema...",
    "content_html": "<p>Conteúdo completo em HTML...</p>",
    "cover_url": "https://cdn.exemplo.com/blog/covers/abc.jpg",
    "hero_image_url": "https://cdn.exemplo.com/blog/heroes/abc.jpg",
    "hero_image_alt": "Texto alternativo da imagem",
    "hero_caption": "Legenda da imagem hero",
    "author": "Carlos",
    "category": "tutoriais",
    "audience_tag": "rh",
    "reading_time": "5 min",
    "featured": false,
    "trending_score": 0,
    "published_at": "2026-05-01T12:00:00+00:00",

    "seo_title": "Título SEO em português",
    "seo_description": "Descrição SEO em português.",
    "og_image_url": "https://cdn.exemplo.com/blog/og/abc.jpg",
    "canonical_url": "https://jornafy.com/blog/como-usar-ponto-saas",

    "toc": [
      { "label": "Introdução", "href": "#introducao" },
      { "label": "Como funciona", "href": "#como-funciona" }
    ],

    "faq": [
      {
        "question": "O que é o Ponto SaaS?",
        "answer": "É um sistema de controle de ponto online."
      }
    ],

    "related_posts": [
      {
        "id": "uuid",
        "slug": "outro-post",
        "title": "Título do outro post",
        "excerpt": "Resumo do outro post...",
        "category": "tutoriais",
        "audience_tag": "rh",
        "author": "Carlos",
        "published_at": "2026-04-20T10:00:00+00:00",
        "reading_time": "4 min",
        "cover_url": "https://cdn.exemplo.com/blog/covers/def.jpg"
      }
    ]
  }
}
```

**Notas:**
- `title`, `excerpt`, `content_html`, `hero_image_alt`, `hero_caption`, `seo_title`,
  `seo_description`, `toc[].label`, `faq[].question`, `faq[].answer` e os campos
  traduzíveis de `related_posts[]` (`title`, `excerpt`) vêm resolvidos no idioma de
  `lang`.
- `toc` retorna `[]` se o post não tiver TOC para o idioma solicitado.
- `faq` aqui **não inclui `id`** (diferente da resposta admin).
- `related_posts[]` traz cards completos (mesmos campos da listagem, mais `id`),
  já resolvidos em `lang` — prontos para renderizar os cards de "artigos
  relacionados" sem requisições adicionais.
- Não há campo `status` nem wrapper `seo` nessa resposta — os campos de SEO ficam
  na raiz do objeto (`seo_title`, `seo_description`, `og_image_url`,
  `canonical_url`).

**Erros:**

| Código | Situação                                                          |
|--------|---------------------------------------------------------------------|
| `404`  | `slug` não existe, ou existe mas `status != "published"`, ou `published_at` no futuro |

```json
{ "message": "Post not found" }
```

---

## GET /public/blog/categories

Retorna todas as categorias cadastradas, ordenadas por `sort_order`.

**Response 200:**

```json
{
  "data": [
    {
      "key": "registroHorario",
      "label_pt": "Registro de Horário",
      "label_es": "Registro horario",
      "label_en": "Time tracking"
    },
    {
      "key": "compliance",
      "label_pt": "Conformidade / Compliance",
      "label_es": "Cumplimiento / Compliance",
      "label_en": "Compliance"
    }
  ]
}
```

> Use o `key` como valor do parâmetro `category` em `GET /public/blog/posts`.
> Use `label_{lang}` para exibir o nome da categoria no idioma atual do site.

---

## GET /sitemap-blog.xml

Sitemap dinâmico (gerado a cada request, fora do prefixo `/api`), contendo apenas
posts `published` com `published_at <= NOW()`.

**Content-Type:** `application/xml`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://jornafy.com/blog</loc>
    <lastmod>2026-06-10T00:00:00+00:00</lastmod>
  </url>
  <url>
    <loc>https://jornafy.com/blog/como-usar-ponto-saas</loc>
    <lastmod>2026-05-01T12:00:00+00:00</lastmod>
  </url>
  <!-- ... um <url> por post published ... -->
</urlset>
```

- `loc`: `canonical_url` do post se preenchido, senão `{FRONTEND_URL}/blog/{slug}`.
- `lastmod`: `updated_at` do post (fallback `published_at`), em formato ISO8601.
- Sempre inclui uma entrada para `{FRONTEND_URL}/blog` (a listagem).

---

## Exemplos de uso (frontend)

```javascript
// Listagem (página /blog), idioma espanhol, categoria "compliance"
const res = await fetch(
  '/api/v1/public/blog/posts?lang=es&category=compliance&per_page=12'
);
const { data: posts, meta } = await res.json();

// Busca por texto (título/resumo) no idioma atual
const search = await fetch('/api/v1/public/blog/posts?lang=pt&q=registro+de+ponto');

// Detalhe do post (página /blog/[slug])
const post = await fetch(
  `/api/v1/public/blog/posts/${slug}?lang=${currentLanguage}`
);
if (post.status === 404) {
  // renderizar 404 da página
}

// Categorias (menu/filtro do blog)
const categories = await fetch('/api/v1/public/blog/categories');

// Sitemap (fora do /api)
const sitemap = await fetch('/sitemap-blog.xml');
```

---

## Diferenças em relação às rotas admin

| Aspecto              | Público (`/public/blog`)              | Admin (`/admin/blog`, ver `BLOG_MODULE.md`) |
|----------------------|----------------------------------------|------------------------------------------------|
| Auth                 | Não exige token                        | `Authorization: Bearer {token}`                |
| Campos traduzíveis   | String/array resolvido em `lang`       | Objeto `{ pt, es, en }` com todas as traduções |
| Posts retornados     | Apenas `status = "published"` e `published_at <= NOW()` | Todos os status |
| FAQ                  | Sem `id`                                | Com `id`                                       |
| Detalhe (`seo`)      | Campos `seo_title`/`seo_description`/`og_image_url`/`canonical_url` na raiz | Objeto aninhado (ver `BLOG_MODULE.md`) |
