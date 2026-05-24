# API Reference

**Base URL:** `/api/v1`
**Auth:** Bearer Token via Laravel Sanctum (`Authorization: Bearer {token}`)
**PKs:** UUIDs em todos os recursos
**Formato:** JSON

---

## Autenticação

### POST /auth/login
Sem autenticação.

**Body:**
```json
{ "email": "string", "password": "string" }
```

**Response 200:**
```json
{ "token": "string", "user": { "id": "uuid", "name": "string", "email": "string", "role": { "id": "uuid", "name": "string", "display_name": "string" }, "company_id": "uuid" } }
```

**Erros:** `422` credenciais inválidas

---

### POST /auth/logout
**Auth:** obrigatória

**Response 200:** `{ "message": "Logged out" }`

---

### GET /auth/me
**Auth:** obrigatória

**Response 200:** Objeto `User` com `role`, `company_id`, `area`, relações carregadas.

---

### POST /forgot-password
Sem autenticação. Throttle: 5/min.

**Body:** `{ "email": "string" }`
**Response 200:** `{ "message": "string" }`

---

### POST /reset-password
Sem autenticação. Throttle: 5/min.

**Body:** `{ "email": "string", "token": "string", "password": "string", "password_confirmation": "string" }`
**Response 200:** `{ "message": "string" }`

---

## Registro e Convites

### POST /public/companies/register
Sem autenticação. Throttle configurado.

Registra nova empresa e cria o primeiro usuário admin.

**Body:**
```json
{
  "company_name": "string",
  "name": "string",
  "email": "string",
  "password": "string"
}
```
**Response 201:** `{ "company": {...}, "user": {...}, "token": "string" }`

---

### POST /invites/accept
Sem autenticação.

Employee aceita convite e define senha.

**Body:** `{ "invite_code": "string", "password": "string" }`
**Response 200:** `{ "token": "string", "user": {...} }`

---

## Settings / Configurações

### GET /settings/overview
**Auth:** obrigatória

Retorna configurações gerais da empresa: nome, timezone, plano atual, subscription status.

---

### GET /settings/subscription
**Auth:** obrigatória

**Response 200:**
```json
{
  "status": "trialing|active|past_due|canceled",
  "status_label": "string",
  "next_action": "NONE|UPDATE_PAYMENT_METHOD|RESUBSCRIBE",
  "trial_ends_at": "ISO8601|null",
  "trial_days_remaining": "integer|null",
  "current_period_end": "ISO8601|null",
  "cancel_at_period_end": "boolean",
  "is_blocked": "boolean",
  "is_plan_active": "boolean",
  "can_cancel": "boolean"
}
```

---

### POST /settings/subscription/cancel
**Auth:** obrigatória. Agenda cancelamento ao fim do período atual no Stripe.

**Response 200:** Dados atualizados da subscription.
**Erros:** `422` se não há assinatura ativa ou já cancelada.

---

## Billing

### GET /public/plans
Sem autenticação. Lista planos ativos disponíveis para contratação.

---

### POST /public/billing/checkout-session
Sem autenticação. Throttle configurado. Inicia checkout Stripe para plano.

**Body:** `{ "plan_id": "uuid", "company_id": "uuid" }`
**Response 200:** `{ "url": "string" }` (URL do Stripe Checkout)

---

### POST /billing/checkout-session
**Auth:** obrigatória.

**Body:** `{ "plan_id": "uuid" }`
**Response 200:** `{ "url": "string" }`

---

### POST /billing/portal
**Auth:** obrigatória. Abre portal do cliente Stripe para gerenciar pagamento.

**Response 200:** `{ "url": "string" }`

---

### POST /billing/stripe/webhook
Sem autenticação. Endpoint exclusivo para eventos do Stripe (assinado com `STRIPE_WEBHOOK_SECRET`).

---

## Blog Público

Sem autenticação. Prefix: `/public/blog`

### GET /public/blog/posts
Lista posts publicados. Paginado.

### GET /public/blog/posts/{slug}
Retorna post pelo slug.

### GET /public/blog/categories
Lista categorias disponíveis.

---

## Employee — Ponto

### POST /employee/clock
**Roles:** `employee`, `area_manager`, `manager`, `admin`

Registra batida de ponto. Campos de localização são opcionais a menos que a empresa exija geolocalização.

**Body:**
```json
{
  "latitude": "numeric (-90 a 90) | null",
  "longitude": "numeric (-180 a 180) | null",
  "source": "string | null"
}
```

**Responses:**
- `201` — batida registrada normalmente:
```json
{
  "entry": { "id": "uuid", "clocked_at": "ISO8601", "type": "in|out", "event_kind": "string", "source": "string" },
  "next_event": { "kind": "string", "expected_type": "in|out", "expected_at": "ISO8601", "day_offset": 0 }
}
```
- `202` — fora do turno ou dia não previsto, ajuste criado automaticamente:
```json
{ "message": "string", "status": "adjustment_requested", "adjustment": {...} }
```
- `422` — em férias no dia, ou intervalo < 60s desde a última batida.

---

### GET /employee/entries
**Roles:** `employee`, `area_manager`, `manager`, `admin`

Lista batidas do próprio usuário, paginado (20/página), sem batidas com `adjustment_status = rejected`.

**Response 200:** Laravel pagination com array de `TimeEntry`.

---

### GET /employee/entries/history
**Roles:** `employee`, `area_manager`, `manager`, `admin`

Histórico por período com resumo diário e saldo de horas.

**Query params:**
- `from` (date, opcional) — data início
- `to` (date, opcional) — data fim
- `limit` (integer, 1–60, default 7) — número de dias quando `from`/`to` não informados

**Response 200:**
```json
{
  "from": "YYYY-MM-DD",
  "to": "YYYY-MM-DD",
  "timezone": "string",
  "days": [
    {
      "date": "YYYY-MM-DD",
      "first_in": "ISO8601|null",
      "last_out": "ISO8601|null",
      "worked_hhmm": "HH:MM",
      "expected_hhmm": "HH:MM",
      "balance_hhmm": "HH:MM",
      "status": "even|surplus|deficit",
      "open_day": "boolean"
    }
  ]
}
```

---

### GET /employee/time-entries/open-status
**Roles:** `employee`, `area_manager`, `manager`, `admin`

Status atual do ponto: se o usuário está "dentro" (bateu entrada mas não saída).

**Response 200:**
```json
{
  "open": "boolean",
  "open_reason": "string|null",
  "expected_next_out_at": "ISO8601|null",
  "last_in_at": "ISO8601|null",
  "shift_day": { "weekday": 0-6, "is_working_day": "boolean" },
  "assignment_id": "uuid|null",
  "next_event": { "kind": "string", "expected_type": "in|out", "expected_at": "ISO8601", "day_offset": 0 },
  "is_outside_shift": "boolean"
}
```

---

### GET /employee/shift
**Roles:** `employee`, `area_manager`, `manager`, `admin`

Retorna o turno atual do usuário com todos os dias e eventos esperados.

**Response 200:**
```json
{
  "shift": {
    "id": "uuid", "name": "string", "start_time": "HH:MM", "end_time": "HH:MM",
    "is_flexible": "boolean", "is_default": "boolean",
    "shift_days": [
      {
        "weekday": 0-6,
        "is_working_day": "boolean",
        "start_time": "HH:MM|null", "end_time": "HH:MM|null",
        "break_start_time": "HH:MM|null", "break_end_time": "HH:MM|null", "break_minutes": "integer|null",
        "events": [{ "kind": "string", "expected_time": "HH:MM", "day_offset": 0, "expected_type": "in|out", "sort_order": 0 }]
      }
    ]
  },
  "assignment": { "id": "uuid", "start_date": "YYYY-MM-DD|null", "end_date": "YYYY-MM-DD|null" }
}
```

---

### GET /employee/worked-today
**Roles:** `employee`, `area_manager`, `manager`, `admin`

**Response 200:** `{ "worked_seconds": integer, "worked_hhmm": "HH:MM" }`

---

### GET /employee/adjustments
**Roles:** `employee`, `area_manager`, `manager`, `admin`

Lista ajustes de ponto solicitados pelo próprio usuário.

---

### POST /employee/time-entries/{timeEntry}/adjustment
**Roles:** `employee`, `area_manager`, `manager`, `admin`

Solicita ajuste em uma batida existente.

**Body:**
```json
{
  "proposed_clocked_at": "ISO8601",
  "proposed_type": "in|out",
  "reason": "string",
  "proposed_latitude": "numeric|null",
  "proposed_longitude": "numeric|null",
  "proposed_source": "string|null"
}
```
**Response 201:** TimeEntry atualizado com `adjustment_status: pending`.

---

## Employee — Horas Extras

### GET /employee/{employee}/overtime
**Roles:** `employee`, `area_manager`, `manager`, `admin`

Retorna saldo de horas extras do employee. Employee só pode consultar o próprio.

**Query params:** `from` (date), `to` (date)

---

## Employee — Férias

### GET /employee/vacations
**Response 200:** Lista de `VacationRequest` do usuário.

### POST /employee/vacations
**Body:** `{ "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "notes": "string|null" }`
**Response 201:** `VacationRequest` criado com `status: pending`.

### GET /employee/vacations/balance
**Response 200:** `{ "available_days": decimal, "used_days": decimal, "accrued_days": decimal }`

### DELETE /employee/vacations/{vacation}
Cancela solicitação própria com status `pending`.
**Response 200:** `{ "message": "string" }`

---

## Employee — Ausências e Comunicados

### GET /employee/absences
Lista ausências do próprio usuário.

### GET /employee/announcements
### GET /employee/announcements/pending-count
**Response:** `{ "count": integer }`

### GET /employee/announcements/{announcement}
### POST /employee/announcements/{announcement}/seen
Marca comunicado como lido. **Response 200:** `{ "message": "string" }`

---

## Documentos

**Roles:** `employee`, `area_manager`, `manager`, `admin` para GET/POST/DELETE.
`admin`, `manager`, `area_manager` para PATCH e approve.

### GET /documents
Lista documentos do usuário autenticado.

### POST /documents
Upload de documento.
**Body:** `multipart/form-data` com campo `file` + metadados.

### GET /documents/{document}
Detalhes do documento.

### GET /documents/{document}/view
Stream do arquivo para visualização inline.

### GET /documents/{document}/download
Download do arquivo.

### POST /documents/{document}/resend
Reenvia notificação de documento.

### PATCH /documents/{document}
Atualiza metadados. **Roles:** `admin`, `manager`, `area_manager`.

### PATCH /documents/{document}/approve
Aprova documento. **Roles:** `admin`, `manager`, `area_manager`.

### DELETE /documents/{document}
Exclui documento.

---

## Area Manager

**Roles:** `area_manager`, `manager`, `admin`

### GET /area-manager/adjustments
Lista ajustes de ponto pendentes dos employees da área gerenciada.

### GET /area-manager/team/entries
Lista batidas de ponto de todos os employees da área.

**Query params:** `from`, `to`, `user_id`

### GET /area-manager/team/{employee}/overtime
Horas extras de um membro do time.

---

## Admin — Employees

**Roles:** `admin`, `manager`, `area_manager`

### GET /admin/employees
Lista employees visíveis para o usuário (filtrado por `UserVisibilityService`). Paginado 20/página.
Inclui: `roles`, `area`, `managedAreas`.

### POST /admin/employees
Cria e convida novo employee via email.

**Body:**
```json
{
  "name": "string (required)",
  "email": "string (required, unique)",
  "password": "string|null",
  "role": "admin|manager|area_manager|employee|null",
  "area_id": "uuid|null",
  "managed_area_ids": ["uuid"],
  "shift_id": "uuid|null"
}
```
**Response 201:** User com relações.

### GET /admin/employees/{employee}
Retorna employee com `userShifts.shift`, `roles`, `area`, `managedAreas`.

### PUT/PATCH /admin/employees/{employee}
Atualiza employee. Mesmos campos do store, todos opcionais.
Se `role` muda para `employee`, triggera cálculo de extra employees billing.

### DELETE /admin/employees/{employee}
Soft delete do employee.

### POST /admin/employees/{employee}/resend-invite
**Roles:** `admin`, `manager`, `area_manager`

Reenvia o email de convite para um employee que ainda não aceitou.
**Response 200:** `{ "message": "string" }`

### POST /admin/employees/{employee}/shift
Atribui turno ao employee.

**Body:** `{ "shift_id": "uuid (required)", "start_date": "YYYY-MM-DD|null" }`
**Response 200:** `UserShift` com `shift`.

---

## Admin — Turnos (Shifts)

**Roles:** `admin`, `manager`, `area_manager`

### GET /admin/shifts
Lista turnos da empresa com `shiftDays` e `shiftDays.events`. Paginado 20/página.

### POST /admin/shifts
**Body:**
```json
{
  "name": "string (required)",
  "is_flexible": "boolean",
  "is_default": "boolean",
  "days": [
    {
      "weekday": "0-6 (0=domingo)",
      "is_working_day": "boolean",
      "start_time": "HH:MM (obrigatório se working)",
      "end_time": "HH:MM (obrigatório se working)",
      "break_start_time": "HH:MM|null",
      "break_end_time": "HH:MM|null",
      "break_minutes": "integer|null"
    }
  ]
}
```
Se `is_default: true`, desmarca o turno default anterior da empresa.
**Response 201:** Shift com `shiftDays.events`.

### GET /admin/shifts/{shift}
### PUT/PATCH /admin/shifts/{shift}
Atualiza turno. `days` substitui completamente os dias existentes.

### DELETE /admin/shifts/{shift}
**Response 200:** `{ "message": "Deletado" }`

### GET /admin/users/{user}/shifts
Lista todos os turnos da empresa (contexto do usuário informado).

---

## Admin — Férias

**Roles:** `admin`, `manager`, `area_manager`

### GET /admin/vacations
Lista férias da equipe. Query: `user_id`, `status`, `from`, `to`.

### POST /admin/vacations
Cria férias para um employee.
**Body:** `{ "user_id": "uuid", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "notes": "string|null" }`

### POST /admin/vacations/{vacation}/approve
**Response 200:** VacationRequest com `status: approved`.

### POST /admin/vacations/{vacation}/reject
**Body:** `{ "rejection_reason": "string|null" }`

### DELETE /admin/vacations/{vacation}
Exclui solicitação.

### GET /admin/vacations/balance/{employee}
Saldo de férias de um employee.

---

## Admin — Ajustes de Ponto

**Roles:** `admin`, `manager`, `area_manager`

### POST /admin/time-entries/{timeEntry}/adjustment/approve
Aprova ajuste. Aplica os valores propostos (`proposed_clocked_at`, `proposed_type`, etc.) na TimeEntry.
**Response 200:** TimeEntry atualizado.

### POST /admin/time-entries/{timeEntry}/adjustment/reject
**Body:** `{ "reason": "string" }`
**Response 200:** TimeEntry com `adjustment_status: rejected`.

### DELETE /admin/time-entries/{timeEntry}
Soft delete de batida (apenas admin/manager/area_manager).

---

## Admin — Áreas

### GET /admin/areas
**Roles:** `admin`, `manager`, `area_manager`

### GET /admin/areas/{area}
**Roles:** `admin`, `manager`, `area_manager`

### POST /admin/areas
**Roles:** `admin` apenas
**Body:** `{ "name": "string" }`

### PUT/PATCH /admin/areas/{area}
**Roles:** `admin` apenas

### DELETE /admin/areas/{area}
**Roles:** `admin` apenas

---

## Admin — Outros

### GET /admin/reports/time
**Roles:** `admin`, `manager`, `area_manager`. Feature flag: `reports` (verificado via plano).
Relatório de horas trabalhadas por período.

### GET/PUT /admin/company/timezone
**Roles:** `admin`, `super_admin`
**Body PUT:** `{ "timezone": "America/Sao_Paulo" }`

### GET/PUT /admin/company/geolocation
**Roles:** `admin`, `super_admin`
**Body PUT:** `{ "company_latitude": decimal, "company_longitude": decimal, "allowed_radius_meters": integer }`

### GET/PUT /admin/company/device-settings
**Roles:** `admin`, `super_admin`
Configurações de dispositivo da empresa.

### GET/PUT/PATCH /admin/settings/location
**GET Roles:** `admin`, `super_admin`, `area_manager`, `manager`
**PUT/PATCH Roles:** `admin`, `super_admin`
**Body:** `{ "location_validation_enabled": boolean, "geolocation_required": boolean, "allowed_radius_meters": integer }`

### POST /admin/billing/extra-employees/sync
**Roles:** `admin`, `super_admin`. Sincroniza cobranças de employees extras com o Stripe.

### POST /admin/billing/extra-employees/checkout-session
**Roles:** `admin`, `super_admin`. Inicia checkout para adicionar allowance de employees.

### GET /admin/audit-logs
**Roles:** `admin`, `super_admin`. Middleware: `company.audit_logs_enabled`.
Query: `action`, `entity_type`, `user_id`, `from`, `to`.

### GET /admin/audit-logs/{auditLog}

### Feriados

Os feriados têm rotas em dois prefixos distintos:

**Leitura** — sem prefixo `/admin`, disponível para todos autenticados:
- `GET /holidays` — lista feriados da empresa
- `GET /holidays/{holiday}` — detalhe de um feriado

**Escrita** — prefix `/admin`, roles `admin`, `manager`, `area_manager`:
- `POST /admin/holidays`
- `PUT/PATCH /admin/holidays/{holiday}`
- `DELETE /admin/holidays/{holiday}`

**Body (escrita):** `{ "name": "string", "date": "YYYY-MM-DD", "recurring": boolean }`

### CRUD /admin/leave-policies
**Roles:** `admin`, `manager`, `area_manager`
Políticas de ausência (licença, atestado, etc.).

### GET/POST /admin/absences
**Roles:** `admin`, `manager`, `area_manager`
**Body POST:** `{ "user_id": "uuid", "type": "string", "start_date": "YYYY-MM-DD", "end_date": "YYYY-MM-DD", "comment": "string|null", "counts_for_accrual": boolean }`

### CRUD /admin/announcements
**Roles:** `admin`, `manager`, `area_manager`

### GET /admin/documents/pending
### GET /admin/documents/review
### GET /admin/documents/{document}
### PATCH /admin/documents/{document}/approve
### PATCH /admin/documents/{document}/reject
### POST /admin/documents/upload-for-employee

---

## Blog Admin

Gerenciamento de posts do blog. Existem **dois prefixos** com níveis de acesso diferentes:

- `/admin/blog/*` — middleware `auth:sanctum` (qualquer admin autenticado)
- `/platform/blog/*` — middleware `super_admin` (apenas super admin)

### GET /admin/blog/posts
Lista todos os posts (incluindo rascunhos).

### POST /admin/blog/posts
Cria post.

### GET /admin/blog/posts/{id}
### PUT /admin/blog/posts/{id}
### DELETE /admin/blog/posts/{id}

### PATCH /admin/blog/posts/{id}/publish
Publica o post.

### PATCH /admin/blog/posts/{id}/unpublish
Despublica o post.

### POST /admin/blog/uploads/presign
Gera URL pré-assinada para upload de imagem/mídia do blog.

---

## Platform (Super Admin)

**Middleware:** `super_admin` em todas as rotas. Prefix: `/platform`

### GET /platform/super-admin/dashboard
Métricas gerais da plataforma.

Além do snapshot atual, a resposta inclui:

- `time_entries_series`: séries diárias para janelas `30d`, `60d` e `90d`.
- `active_companies_series`: empresas com atividade por dia para janelas `30d`, `60d` e `90d`.
- `subscription_status_breakdown`: distribuição por status de assinatura, incluindo `none`.
- `plan_breakdown`: distribuição de empresas por plano.
- `recent_events`: feed derivado de `audit_logs`, `companies` e `subscriptions`.
- `top_companies_by_activity`: ranking por `time_entries_30d` e `active_billable_users_30d`.
- `top_companies_by_risk`: ranking por risco calculado a partir de bloqueio, atraso e inatividade.

### GET /platform/super-admin/companies
Lista empresas com métricas (contagem de employees, status).

### POST /platform/companies/register
Registra empresa manualmente (sem throttle).

### CRUD /platform/companies
Gestão completa de empresas.

### POST /platform/companies/{company}/restore
Restaura empresa com soft delete.

### POST /platform/companies/{company}/block
**Body:** `{ "reason": "string" }`

### POST /platform/companies/{company}/unblock

### GET/PUT/PATCH /platform/companies/{company}/settings
Configurações avançadas de empresa.

### GET /platform/billing/plans
### POST /platform/billing/plans
### GET /platform/billing/plans/{plan}
### PATCH /platform/billing/plans/{plan}

### GET /platform/billing/companies/{company}/subscription
### PATCH /platform/billing/companies/{company}/subscription

### GET /platform/audit-logs
### GET /platform/audit-logs/{auditLog}
Logs de toda a plataforma (cross-company).

### Blog — Platform
CRUD completo de posts via `/platform/blog/posts/*` (mesmas operações que `/admin/blog/posts/*`, acesso restrito a `super_admin`).
Inclui `publish`, `unpublish` e `uploads/presign`.
""