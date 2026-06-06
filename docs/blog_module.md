# Blog Module — Documentação da API

**Base URL:** `/api/v1`
**Auth:** Bearer Token via Laravel Sanctum (`Authorization: Bearer {token}`)
**PKs:** UUIDs em todos os recursos
**Formato:** JSON
**Idiomas suportados:** `pt` (português), `es` (espanhol), `en` (inglês)

---

## Visão Geral

O módulo de blog suporta conteúdo **multilíngue** (Spatie Translatable). Campos de texto como `title`, `excerpt` e `content_html` são objetos com uma chave por idioma. As rotas de admin retornam sempre **todas as traduções** simultaneamente, permitindo edição completa no painel.

---

## Rotas Admin (autenticadas)

Todas as rotas abaixo exigem `Authorization: Bearer {token}`.

| Método   | Rota                                          | Descrição                          |
|----------|-----------------------------------------------|------------------------------------|
| `GET`    | `/admin/blog/posts`                           | Listar posts (paginado)            |
| `POST`   | `/admin/blog/posts`                           | Criar novo post                    |
| `GET`    | `/admin/blog/posts/{id}`                      | Detalhe do post (para edição)      |
| `PUT`    | `/admin/blog/posts/{id}`                      | Atualizar post                     |
| `DELETE` | `/admin/blog/posts/{id}`                      | Remover post                       |
| `PATCH`  | `/admin/blog/posts/{id}/publish`              | Publicar post                      |
| `PATCH`  | `/admin/blog/posts/{id}/unpublish`            | Despublicar post (volta para draft)|
| `POST`   | `/admin/blog/uploads/presign`                 | Gerar URL pré-assinada S3          |

---

## GET /admin/blog/posts

Lista posts com paginação. Ordenados por `updated_at` decrescente.

**Query params opcionais:**

| Param      | Tipo   | Valores aceitos                    | Descrição                  |
|------------|--------|------------------------------------|----------------------------|
| `status`   | string | `draft`, `published`, `archived`   | Filtrar por status         |
| `category` | string | qualquer string                    | Filtrar por categoria      |
| `per_page` | int    | padrão `20`                        | Itens por página           |

**Response 200:**
```json
{
  "data": [
    {
      "slug": "como-usar-ponto-saas",
      "title": "Como usar o Ponto SaaS",
      "excerpt": "Aprenda a usar o sistema...",
      "cover_url": "https://cdn.exemplo.com/blog/covers/abc.jpg",
      "category": "tutoriais",
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
    "per_page": 20
  }
}
```

> Os campos de texto na listagem retornam a string do idioma padrão (não o objeto de traduções). Use `GET /admin/blog/posts/{id}` para obter todas as traduções.

---

## POST /admin/blog/posts

Cria um novo post. Todos os campos multilíngues devem ser enviados nos 3 idiomas.

**Body (application/json):**

```json
{
  "slug": "meu-primeiro-post",
  "author": "Carlos Ribeiro",
  "category": "tutoriais",
  "status": "draft",

  "title": {
    "pt": "Meu primeiro post",
    "es": "Mi primer post",
    "en": "My first post"
  },
  "excerpt": {
    "pt": "Um resumo curto do post.",
    "es": "Un breve resumen del post.",
    "en": "A brief summary of the post."
  },
  "content_html": {
    "pt": "<p>Conteúdo completo em HTML...</p>",
    "es": "<p>Contenido completo en HTML...</p>",
    "en": "<p>Full HTML content...</p>"
  },

  "cover_url": "https://cdn.exemplo.com/blog/covers/abc.jpg",
  "hero_image_url": "https://cdn.exemplo.com/blog/heroes/abc.jpg",
  "hero_image_alt": {
    "pt": "Texto alternativo da imagem",
    "es": "Texto alternativo de la imagen",
    "en": "Image alt text"
  },
  "hero_caption": {
    "pt": "Legenda da imagem hero",
    "es": "Leyenda de la imagen hero",
    "en": "Hero image caption"
  },

  "audience_tag": "rh",
  "reading_time": "5 min",
  "trending_score": 0,
  "featured": false,
  "published_at": "2026-05-21T10:00:00Z",

  "seo_title": {
    "pt": "Título SEO em português",
    "es": "Título SEO en español",
    "en": "SEO Title in English"
  },
  "seo_description": {
    "pt": "Descrição SEO em português.",
    "es": "Descripción SEO en español.",
    "en": "SEO description in English."
  },
  "og_image_url": "https://cdn.exemplo.com/blog/og/abc.jpg",
  "canonical_url": "https://exemplo.com/blog/meu-primeiro-post",

  "toc": {
    "pt": [
      { "label": "Introdução", "href": "#introducao" },
      { "label": "Como funciona", "href": "#como-funciona" }
    ],
    "es": [
      { "label": "Introducción", "href": "#introducao" },
      { "label": "Cómo funciona", "href": "#como-funciona" }
    ],
    "en": [
      { "label": "Introduction", "href": "#introducao" },
      { "label": "How it works", "href": "#como-funciona" }
    ]
  },

  "faq": [
    {
      "question": {
        "pt": "O que é o Ponto SaaS?",
        "es": "¿Qué es Ponto SaaS?",
        "en": "What is Ponto SaaS?"
      },
      "answer": {
        "pt": "É um sistema de controle de ponto online.",
        "es": "Es un sistema de control de asistencia online.",
        "en": "It is an online time tracking system."
      }
    }
  ],

  "related_post_ids": [
    "uuid-de-outro-post-1",
    "uuid-de-outro-post-2"
  ]
}
```

**Campos obrigatórios:**

| Campo             | Regra                                                              |
|-------------------|--------------------------------------------------------------------|
| `slug`            | Único, apenas letras minúsculas, números e hífens (`^[a-z0-9-]+$`) |
| `author`          | String, máx. 255                                                   |
| `category`        | String, máx. 100                                                   |
| `status`          | `draft`, `published` ou `archived`                                 |
| `title.pt/es/en`  | String, máx. 255                                                   |
| `excerpt.pt/es/en`| String, máx. 500                                                   |

**Campos opcionais e seus limites:**

| Campo                     | Tipo      | Limite         |
|---------------------------|-----------|----------------|
| `content_html.{lang}`     | string    | —              |
| `hero_image_alt.{lang}`   | string    | máx. 255       |
| `hero_caption.{lang}`     | string    | máx. 500       |
| `seo_title.{lang}`        | string    | máx. 255       |
| `seo_description.{lang}`  | string    | máx. 500       |
| `toc.{lang}`              | array     | —              |
| `cover_url`               | url       | máx. 2048      |
| `hero_image_url`          | url       | máx. 2048      |
| `og_image_url`            | url       | máx. 2048      |
| `canonical_url`           | url       | máx. 2048      |
| `audience_tag`            | string    | máx. 100       |
| `reading_time`            | string    | máx. 20 (`"5 min"`) |
| `trending_score`          | int       | 0–100          |
| `featured`                | boolean   | —              |
| `published_at`            | date/ISO  | —              |
| `faq`                     | array     | ver abaixo     |
| `related_post_ids`        | array     | UUIDs de posts existentes |

**Response 201:**
```json
{
  "data": { /* BlogPostAdminResource — ver seção Objeto de Resposta Admin */ }
}
```

**Erros comuns:**

| Código | Motivo                                         |
|--------|------------------------------------------------|
| `422`  | Validação falhou (campos obrigatórios, slug duplicado, URL inválida) |
| `401`  | Token ausente ou inválido                      |

---

## GET /admin/blog/posts/{id}

Retorna os dados completos do post, incluindo **todas as traduções** de cada campo, FAQ e posts relacionados. Ideal para carregar o formulário de edição.

**Response 200:**
```json
{
  "data": {
    "id": "uuid",
    "slug": "meu-primeiro-post",
    "status": "draft",

    "title": { "pt": "...", "es": "...", "en": "..." },
    "excerpt": { "pt": "...", "es": "...", "en": "..." },
    "content_html": { "pt": "...", "es": "...", "en": "..." },
    "hero_image_alt": { "pt": "...", "es": "...", "en": "..." },
    "hero_caption": { "pt": "...", "es": "...", "en": "..." },
    "seo_title": { "pt": "...", "es": "...", "en": "..." },
    "seo_description": { "pt": "...", "es": "...", "en": "..." },
    "toc": {
      "pt": [{ "label": "...", "href": "..." }],
      "es": [{ "label": "...", "href": "..." }],
      "en": [{ "label": "...", "href": "..." }]
    },

    "author": "Carlos Ribeiro",
    "category": "tutoriais",
    "audience_tag": "rh",
    "cover_url": "https://...",
    "hero_image_url": "https://...",
    "og_image_url": "https://...",
    "canonical_url": "https://...",
    "reading_time": "5 min",
    "trending_score": 0,
    "featured": false,
    "published_at": "2026-05-01T12:00:00+00:00",

    "faq": [
      {
        "id": "uuid-do-item-faq",
        "question": { "pt": "...", "es": "...", "en": "..." },
        "answer": { "pt": "...", "es": "...", "en": "..." }
      }
    ],

    "related_posts": [
      { "id": "uuid", "slug": "outro-post", "title": "Título em PT" }
    ]
  }
}
```

---

## PUT /admin/blog/posts/{id}

Atualiza um post existente. Suporta atualização parcial — envie apenas os campos que deseja alterar.

**Comportamento especial:**
- `faq`: se enviado, **substitui completamente** a lista de FAQs (sync destrutivo)
- `related_post_ids`: se enviado, **substitui completamente** os posts relacionados (sync via pivot)
- Campos não enviados são preservados

**Body:** mesma estrutura do `POST`, mas todos os campos são opcionais (`sometimes`).

**Slug:** deve ser único, ignorando o próprio post atual.

**Response 200:**
```json
{
  "data": { /* BlogPostAdminResource atualizado */ }
}
```

---

## DELETE /admin/blog/posts/{id}

Remove o post permanentemente (hard delete).

**Response 204:** sem corpo.

---

## PATCH /admin/blog/posts/{id}/publish

Publica o post. Define `status = "published"` e, se `published_at` ainda for nulo, define com a data/hora atual.

**Response 200:**
```json
{
  "data": { /* BlogPostAdminResource com status "published" */ }
}
```

---

## PATCH /admin/blog/posts/{id}/unpublish

Despublica o post. Define `status = "draft"`. O campo `published_at` é preservado.

**Response 200:**
```json
{
  "data": { /* BlogPostAdminResource com status "draft" */ }
}
```

---

## POST /admin/blog/uploads/presign

Gera uma URL pré-assinada para upload direto de imagem ao S3. A URL expira em **5 minutos**.

**Body:**
```json
{
  "filename": "capa-do-post.jpg",
  "mime_type": "image/jpeg",
  "folder": "covers"
}
```

**Campos:**

| Campo       | Valores aceitos                          |
|-------------|------------------------------------------|
| `filename`  | qualquer string, máx. 255                |
| `mime_type` | `image/jpeg`, `image/png`, `image/webp`  |
| `folder`    | `covers`, `heroes`, `og`                 |

**Response 200:**
```json
{
  "upload_url": "https://s3.amazonaws.com/bucket/blog/covers/01jxxx.jpg?X-Amz-...",
  "public_url": "https://cdn.exemplo.com/blog/covers/01jxxx.jpg"
}
```

### Fluxo de upload de imagem

```
1. Frontend → POST /admin/blog/uploads/presign
             ← { upload_url, public_url }

2. Frontend → PUT upload_url  (direto para o S3, sem passar pela API)
             Headers: Content-Type: image/jpeg
             Body: binary do arquivo

3. Frontend → POST /admin/blog/posts  com  cover_url: public_url
```

> Use `folder: "covers"` para imagem de card, `folder: "heroes"` para banner do post, `folder: "og"` para imagem de compartilhamento social.

---

## Objeto de Resposta Admin (BlogPostAdminResource)

Estrutura completa retornada nos endpoints de criação, detalhe e atualização:

```ts
{
  id: string;             // UUID
  slug: string;
  status: "draft" | "published" | "archived";

  // Campos multilíngues — sempre retornam o objeto com pt/es/en
  title: { pt: string; es: string; en: string };
  excerpt: { pt: string; es: string; en: string };
  content_html: { pt: string | null; es: string | null; en: string | null };
  hero_image_alt: { pt: string | null; es: string | null; en: string | null };
  hero_caption: { pt: string | null; es: string | null; en: string | null };
  seo_title: { pt: string | null; es: string | null; en: string | null };
  seo_description: { pt: string | null; es: string | null; en: string | null };
  toc: {
    pt: Array<{ label: string; href: string }> | null;
    es: Array<{ label: string; href: string }> | null;
    en: Array<{ label: string; href: string }> | null;
  };

  // Campos simples
  author: string;
  category: string;
  audience_tag: string | null;
  cover_url: string | null;
  hero_image_url: string | null;
  og_image_url: string | null;
  canonical_url: string | null;
  reading_time: string | null;
  trending_score: number;
  featured: boolean;
  published_at: string | null; // ISO 8601

  // Relações
  faq: Array<{
    id: string;
    question: { pt: string; es: string; en: string };
    answer: { pt: string; es: string; en: string };
  }>;
  related_posts: Array<{
    id: string;
    slug: string;
    title: string; // sempre em PT
  }>;
}
```

---

## Status do Post

| Valor       | Descrição                                               |
|-------------|---------------------------------------------------------|
| `draft`     | Rascunho — não visível no site público                  |
| `published` | Publicado — visível no site público                     |
| `archived`  | Arquivado — não visível publicamente, mantido no admin  |

---

## Referência rápida de campos multilíngues

Sempre que o campo aceitar traduções, envie um objeto com as 3 chaves. Nunca envie uma string direta para esses campos.

```json
// CORRETO
"title": { "pt": "Título PT", "es": "Título ES", "en": "Title EN" }

// ERRADO — a API retorna erro 422
"title": "Título PT"
```

---

## Erros da API

| Código | Situação                                         |
|--------|--------------------------------------------------|
| `401`  | Token ausente, expirado ou inválido              |
| `404`  | Post não encontrado                              |
| `422`  | Falha de validação — body com erros por campo    |
| `500`  | Erro interno                                     |

**Formato do erro 422:**
```json
{
  "message": "The title.pt field is required.",
  "errors": {
    "title.pt": ["The title.pt field is required."],
    "slug": ["Este slug já está em uso por outro post."]
  }
}
```
