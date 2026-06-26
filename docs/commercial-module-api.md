# Módulo Comercial (SuperAdmin)

Módulo interno para gestão de leads, etapas comerciais, afiliados, comissões e bônus. Reaproveita a autenticação Sanctum e o RBAC existentes — sem schema/sistema de login próprio.

## Autenticação e roles

- Header: `Authorization: Bearer {token}` (mesmo fluxo de login atual, `POST /v1/auth/login`).
- Roles do módulo: `commercial_manager`, `commercial_agent`, `affiliate` (além de `super_admin`, que sempre tem acesso total).
- Todas as rotas abaixo exigem `auth:sanctum` + role compatível. Quem não tiver nenhuma das roles do módulo recebe `403`.

| Role | Pode | Não pode |
|---|---|---|
| `super_admin` | tudo | — |
| `commercial_manager` | ver/criar/editar/atribuir todos os leads, gerenciar etapas, afiliados, comissões, bônus, dashboard completo | configurações globais do sistema/billing principal |
| `commercial_agent` | ver/criar/editar **apenas leads atribuídos a ele**, mover etapa, notas, próxima ação, won/lost dos próprios leads | listar todos os leads, afiliados, comissões, gerenciar etapas |
| `affiliate` | ver/criar/editar/marcar won ou lost **apenas leads onde `affiliate_id` = seu afiliado**, mover etapa, notas, próxima ação, dashboard e comissões próprias | excluir leads, ver outros afiliados, aprovar/pagar comissões, gerenciar etapas |

**Afiliado com login:** um `CommercialAffiliate` pode ser vinculado a um `User` (via `user_id`). Quando vinculado, o afiliado acessa o sistema com login e senha normais (`POST /v1/auth/login`) e usa as rotas `/v1/affiliate-portal/*` com a role `affiliate`.

Importante: `commercial_agent` recebe **404** (não 403) ao tentar acessar por ID um lead que não é dele. Da mesma forma, `affiliate` recebe **404** ao tentar acessar lead onde `affiliate_id` ≠ seu afiliado.

## Enums

```
status:    new | in_progress | demo_scheduled | proposal_sent | won | lost | nurturing
priority:  low | medium | high | very_high
step log status:    pending | done | skipped | failed
affiliate status:    active | inactive
commission status:   pending | approved | cancelled | paid
bonus status:        pending | paid
```

## Leads

### `GET /v1/admin/commercial/leads`
Paginado (`per_page`, default 20). `commercial_agent` só vê os próprios.

Filtros (query string): `status`, `priority`, `current_step_id`, `assigned_to_user_id`, `affiliate_id`, `country`, `city`, `segment`, `source`, `next_action_from`, `next_action_to`, `created_from`, `created_to`, `search` (busca em `company_name`, `contact_name`, `email`, `phone`, `whatsapp`, `website`).

Resposta (`200`):
```json
{
"data": [
{
  "id": "uuid",
  "company_name": "Acme Ltda",
  "contact_name": "João Silva",
  "email": "joao@acme.test",
  "phone": "+351900000000",
  "whatsapp": "+351900000000",
  "website": "https://acme.test",
  "country": "PT",
  "city": "Lisboa",
  "segment": "Varejo",
  "employees_count": 12,
  "source": "indicacao",
  "affiliate_id": "uuid|null",
  "current_step_id": "uuid|null",
  "assigned_to_user_id": "uuid|null",
  "created_by_user_id": "uuid",
  "status": "new",
  "priority": "medium",
  "score": 0,
  "general_notes": "string|null",
  "next_action_type": "string|null",
  "next_action_at": "2026-07-01T10:00:00+00:00",
  "next_action_user_id": "uuid|null",
  "converted_at": "datetime|null",
  "customer_id": "uuid|null",
  "lost_reason": "string|null",
  "created_at": "2026-06-23T23:00:00+00:00",
  "updated_at": "...",
  "current_step": { "id": "uuid", "name": "Ligação 1", "position": 2 },
  "assigned_to_user": { "id": "uuid", "name": "...", "email": "..." },
  "affiliate": { "id": "uuid", "name": "...", "slug": "..." }
}
],
"links": { "first": "...", "last": "...", "prev": null, "next": "..." },
"meta": { "current_page": 1, "total": 5, "per_page": 20, "last_page": 1, "...": "..." }
}
```
`current_step`/`assigned_to_user`/`affiliate` só aparecem quando relacionados (sempre presentes no `index`, pois o controller faz eager load).

### `POST /v1/admin/commercial/leads`
Body: `company_name` (obrigatório), demais campos opcionais — ver lista de campos no `index`. `priority` default `medium`, `status` força `new` na criação (não enviar `status` no create).

`assigned_to_user_id`, se informado, precisa ser um usuário com role `super_admin`, `commercial_manager` ou `commercial_agent` (validação retorna 422 caso contrário).

Resposta (`201`) — igual ao item do `index`, **mais**:
```json
{
"data": { "...": "lead criado" },
"duplicate_warning": true,
"possible_duplicates": [
{ "id": "uuid", "company_name": "Acme LTDA" }
]
}
```
Duplicidade é detectada por `email`, `phone`, `whatsapp`, `website` ou `company_name` — **não bloqueia** a criação, só avisa.

### `GET /v1/admin/commercial/leads/{id}`
Inclui também `notes` (array) e `step_logs` (array) carregados.

### `PUT /v1/admin/commercial/leads/{id}`
Todos os campos `sometimes` (envie só o que quer alterar). Mesmas regras de `assigned_to_user_id`.

### `DELETE /v1/admin/commercial/leads/{id}`
Soft delete. Só `super_admin`/`commercial_manager`.

### `POST /v1/admin/commercial/leads/{id}/assign`
Body: `{ "assigned_to_user_id": "uuid" }` (obrigatório). Só `super_admin`/`commercial_manager`.

### `POST /v1/admin/commercial/leads/{id}/move-step`
Body:
```json
{ "step_id": "uuid", "note": "opcional", "scheduled_at": "opcional ISO-8601" }
```
Atualiza `current_step_id` e cria um registro em `lead_step_logs` com `status: "done"`.

### `POST /v1/admin/commercial/leads/{id}/notes`
Body: `{ "note": "texto" }`. Resposta `201`:
```json
{ "id": "uuid", "lead_id": "uuid", "user_id": "uuid", "note": "...", "user": { "id": "...", "name": "..." }, "created_at": "..." }
```

### `POST /v1/admin/commercial/leads/{id}/next-action`
Body:
```json
{ "next_action_type": "ligacao", "next_action_at": "2026-07-01T10:00:00", "next_action_user_id": "uuid|opcional" }
```

### `POST /v1/admin/commercial/leads/{id}/mark-won`
Body (ambos opcionais):
```json
{ "customer_id": "uuid (companies.id, se já existir a empresa)", "base_amount": 100.00 }
```
Define `status: won`, `converted_at`. Se o lead tiver `affiliate_id` **e** `base_amount` for enviado, gera automaticamente as comissões recorrentes do afiliado (ver seção Comissões).

### `POST /v1/admin/commercial/leads/{id}/mark-lost`
Body: `{ "lost_reason": "opcional" }`. Define `status: lost`.

## Etapas (`commercial.lead_steps`)

Leitura liberada para as 3 roles; gestão (`store`/`update`/`destroy`/`reorder`) só `super_admin`/`commercial_manager`.

- `GET /v1/admin/commercial/steps` → lista ordenada por `position`.
- `POST /v1/admin/commercial/steps` → `{ "name", "position", "description?", "default_due_days?", "active?" }`
- `PUT /v1/admin/commercial/steps/{id}`
- `DELETE /v1/admin/commercial/steps/{id}` — **falha (500/constraint)** se existirem `lead_step_logs` apontando para a etapa.
- `POST /v1/admin/commercial/steps/reorder` → `{ "steps": [{ "id": "uuid", "position": 1 }, ...] }`

Etapas seedadas (nesta ordem/posição): WhatsApp inicial, Ligação 1, E-mail, WhatsApp follow-up, Ligação 2, Demonstração agendada, Proposta enviada, Fechado, Perdido, Nutrição.

## Portal do Afiliado (`/v1/affiliate-portal/*`)

Rotas exclusivas para usuários com role `affiliate`. Requerem `Authorization: Bearer {token}` do **login normal** (`POST /v1/auth/login`). Todas as queries são automaticamente escopadas ao afiliado vinculado ao usuário autenticado.

### Criação de conta de afiliado com login

Ao criar um afiliado via `POST /v1/admin/commercial/affiliates`, envie `create_account: true`:

```json
{
  "name": "João Afiliado",
  "email": "joao@exemplo.com",
  "slug": "joao-afiliado",
  "create_account": true
}
```

Isso dispara dois fluxos em paralelo:
1. Criação do `CommercialAffiliate` com envio do convite do sistema de afiliados (fluxo existente)
2. Criação de um `User` de plataforma (sem `company_id`, role `affiliate`) com envio de email de convite via `POST /v1/invites/accept`

O afiliado recebe **um único email** com o código de convite (8 caracteres). Ele acessa o frontend, informa o código e define a própria senha. Após isso, faz login normalmente via `POST /v1/auth/login` com e-mail e senha.

**Variável de ambiente necessária:** `APP_INVITE_URL` (ou `invite_url` no config do app) — URL do frontend onde o afiliado define a senha. Mesma variável usada para convites de funcionários.

A resposta do `POST /v1/admin/commercial/affiliates` passa a incluir:
```json
{
  "user_id": "uuid|null",
  "referral_url": "https://app.exemplo.com/r/joao-afiliado",
  "user": { "id": "uuid", "name": "João Afiliado", "email": "joao@exemplo.com" }
}
```

### `GET /v1/affiliate-portal/me`
Retorna os dados do afiliado vinculado ao usuário autenticado, incluindo o plano de comissão e a URL de indicação.

```json
{
  "id": "uuid",
  "user_id": "uuid",
  "name": "João Afiliado",
  "email": "joao@exemplo.com",
  "slug": "joao-afiliado",
  "referral_url": "https://app.exemplo.com/r/joao-afiliado",
  "status": "active",
  "commission_plan": { "id": "uuid", "name": "Plano padrão afiliados", "commission_percentage": "20.00", "recurrence_months": 6 }
}
```

### `GET /v1/affiliate-portal/dashboard`
Métricas do afiliado (mesma estrutura de `/admin/commercial/affiliates/{id}/metrics`).

### `GET /v1/affiliate-portal/leads`
Lista os leads onde `affiliate_id` = o afiliado do usuário autenticado.

Filtros: `status`, `priority`, `current_step_id`, `search`.

Paginado (`per_page`, default 20). Mesma estrutura de resposta de `/admin/commercial/leads`.

### `POST /v1/affiliate-portal/leads`
Cria um lead. O `affiliate_id` é **preenchido automaticamente** com o afiliado do usuário — não precisa (nem deve) ser enviado no body.

Campos e validações idênticos a `POST /admin/commercial/leads`. `duplicate_warning` e `possible_duplicates` funcionam normalmente.

### `GET /v1/affiliate-portal/leads/{id}`
Ver um lead. Retorna **404** se o lead não pertencer ao afiliado.

Inclui `notes`, `step_logs` carregados.

### `PUT /v1/affiliate-portal/leads/{id}`
Editar um lead. Retorna **404** se não pertencer ao afiliado. Os campos `affiliate_id` e `created_by_user_id` são ignorados mesmo que enviados.

### `POST /v1/affiliate-portal/leads/{id}/notes`
Mesma estrutura de `/admin/commercial/leads/{id}/notes`.

### `POST /v1/affiliate-portal/leads/{id}/next-action`
Mesma estrutura de `/admin/commercial/leads/{id}/next-action`.

### `POST /v1/affiliate-portal/leads/{id}/move-step`
Mesma estrutura de `/admin/commercial/leads/{id}/move-step`.

### `POST /v1/affiliate-portal/leads/{id}/mark-won`
Mesma estrutura de `/admin/commercial/leads/{id}/mark-won`. Se `base_amount` for enviado, as comissões recorrentes do afiliado são geradas automaticamente.

### `POST /v1/affiliate-portal/leads/{id}/mark-lost`
Mesma estrutura de `/admin/commercial/leads/{id}/mark-lost`.

### `GET /v1/affiliate-portal/commissions`
Lista as comissões do afiliado autenticado.

Filtros: `status`. Paginado.

```json
{
  "id": "uuid", "lead_id": "uuid|null", "base_amount": "100.00",
  "commission_percentage": "20.00", "commission_amount": "20.00",
  "month_number": 1, "status": "pending", "due_date": "2026-07-26", "paid_at": null
}
```

### `GET /v1/affiliate-portal/bonuses`
Lista os bônus mensais do afiliado autenticado.

Filtros: `year`, `month`. Paginado.

---

## Afiliados (`commercial.affiliates`)

**Bloqueado para `commercial_agent`** (403 em tudo abaixo).

### `GET /v1/admin/commercial/affiliates` (paginado)
```json
{
"id": "uuid", "name": "...", "email": "...", "phone": "...", "slug": "joao-afiliado",
"commission_plan_id": "uuid|null", "status": "active",
"commission_plan": { "id": "uuid", "name": "Plano padrão afiliados", "commission_percentage": "20.00", "recurrence_months": 6 }
}
```

### `POST /v1/admin/commercial/affiliates`
`{ "name", "slug" (único, alpha_dash), "email?", "phone?", "commission_plan_id?", "status?", "create_account?" (bool) }`

Quando `create_account: true`, cria um `User` de plataforma com role `affiliate` e envia email de convite para o afiliado definir a própria senha. O fluxo de accept-invite usa `POST /v1/invites/accept`.

### `GET|PUT|DELETE /v1/admin/commercial/affiliates/{affiliate}`

### `GET /v1/admin/commercial/affiliates/{id}/metrics`
```json
{
"total_clicks": 42,
"unique_clicks": 30,
"total_leads": 8,
"won_leads": 3,
"conversion_rate_click_to_lead": 19.05,
"conversion_rate_lead_to_customer": 37.5,
"pending_commissions": 240.0,
"paid_commissions": 60.0,
"pending_bonus": 0.0,
"paid_bonus": 50.0
}
```

## Tracking de afiliado (rotas públicas, sem auth)

- `GET /r/{slug}` → registra o clique e faz **redirect 302** para `frontend_url?ref={slug}` (configurar `FRONTEND_URL`/`APP_URL`).
- `POST /v1/commercial/track-affiliate-click` → alternativa para SPA/app que não quer seguir redirect HTTP.
```json
// body
{ "slug": "joao-afiliado", "landing_page": "...", "utm_source": "...", "utm_medium": "...", "utm_campaign": "..." }
// resposta 201
{ "affiliate_id": "uuid", "click_id": "uuid" }
// 404 se slug não existir ou afiliado estiver inactive
```
IP nunca é salvo em texto puro — só hash SHA-256 (`ip_hash`).

Para vincular um lead a um afiliado, basta enviar `affiliate_id` no `POST/PUT` de lead.

## Comissões e bônus (`commercial.commissions` / `commercial.affiliate_bonuses`)

**Bloqueado para `commercial_agent`.**

Regra padrão (plano seedado "Plano padrão afiliados"): **20% de comissão por 6 meses**, bônus de **50€ a cada 5 clientes pagos no mês**.

Não há integração de pagamento ainda — fluxo é manual:
1. Lead marcado `won` com `affiliate_id` + `base_amount` → gera 6 registros em `commissions` (um por `month_number`, status `pending`).
2. `POST /v1/admin/commercial/commissions/{id}/approve` → `status: approved`.
3. `POST /v1/admin/commercial/commissions/{id}/mark-paid` → `status: paid`, `paid_at` preenchido, e o bônus do mês do afiliado é **recalculado automaticamente**.

### `GET /v1/admin/commercial/commissions` (paginado)
Filtros: `affiliate_id`, `status`.
```json
{
"id": "uuid", "affiliate_id": "uuid", "lead_id": "uuid|null", "customer_id": "uuid|null",
"invoice_id": "string|null", "commission_plan_id": "uuid",
"base_amount": "100.00", "commission_percentage": "20.00", "commission_amount": "20.00",
"month_number": 1, "status": "pending", "due_date": "2026-07-23", "paid_at": null,
"created_at": "..."
}
```

### `GET /v1/admin/commercial/affiliate-bonuses` (paginado)
Filtros: `affiliate_id`, `year`, `month`.
```json
{
"id": "uuid", "affiliate_id": "uuid", "year": 2026, "month": 6,
"clients_count": 5, "bonus_every_clients": 5, "bonus_amount": "50.00",
"total_bonus_amount": "50.00", "status": "pending", "paid_at": null
}
```

## Dashboard

### `GET /v1/admin/commercial/dashboard`
`commercial_agent` recebe métricas só dos próprios leads; demais roles veem tudo.
```json
{
"total_leads": 12, "new_leads": 3, "leads_in_progress": 4, "demos_scheduled": 1,
"proposals_sent": 2, "won_leads": 1, "lost_leads": 1,
"leads_by_step": { "uuid-da-etapa": 4, "...": 2 },
"leads_by_priority": { "medium": 7, "high": 3, "low": 2 },
"leads_by_agent": { "uuid-do-agente": 5 },
"leads_by_affiliate": { "uuid-do-afiliado": 2 },
"next_actions_today": 2,
"overdue_next_actions": 1
}
```

## Erros padrão

- `401` — token ausente/inválido.
- `403` — role sem permissão para a rota/ação.
- `404` — recurso não existe (ou está fora do escopo do `commercial_agent`).
- `422` — validação (formato padrão do Laravel: `{ "message": "...", "errors": { "campo": ["..."] } }`).

## Pendências conhecidas

- Geração do `storage/api-docs/api-docs.json` (Swagger) está com bug pré-existente no projeto (`App\Swagger\Admin\BlogTag` desconhecido), não relacionado ao módulo Comercial — anotações já feitas em `app/Swagger/Commercial/*.php`, só faltam ser geradas quando esse bug for corrigido.
- `FRONTEND_URL` precisa ser configurada no `.env` para o redirect de `/r/{slug}` apontar para a landing page real.
