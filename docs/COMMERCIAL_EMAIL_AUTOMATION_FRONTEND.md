# Automação de E-mails Comerciais (Cold Outreach) - Guia Frontend

Base API: `/api/v1`. Todo endpoint abaixo (exceto webhook/unsubscribe) exige `Authorization: Bearer <token>` (Sanctum) e roda sob as mesmas roles já usadas em `admin/commercial/leads`: `super_admin`, `commercial_manager`, `commercial_agent`.

Este documento assume que a tela de **leads comerciais** (`commercial/leads`) já existe no front. A automação de e-mail se pluga nela: um botão/ação "Inscrever em sequência" na listagem/detalhe de leads, e uma nova área para gerenciar templates/sequências/configurações.

## Permissões por ação

| Ação | super_admin / commercial_manager | commercial_agent |
| --- | --- | --- |
| Ver/criar templates, sequências, steps | ✅ | ❌ (403) |
| Ver/editar configurações globais (`settings`) | ✅ | ❌ (403) |
| Inscrever leads em sequência, pausar/retomar/cancelar/marcar respondido | ✅ (qualquer lead) | ✅ (só leads onde `assigned_to_user_id` é ele) |
| Ver timeline de e-mail de um lead | ✅ (qualquer lead) | ✅ (só leads dele) |

Trate 403 e 404 (agent tentando acessar lead de outro agent retorna 404, não 403 — mesmo padrão já usado em `leads/{id}`) como "sem permissão" na UI.

## Envelope de resposta

- Endpoints de recurso único (`show`, `store`, `update`, ações) retornam `{ "data": {...} }`. Sempre ler `response.data.data`, nunca `response.data` direto.
- Endpoints de listagem retornam `{ "data": [...] }` (ou paginado quando indicado).
- `POST enrollments` (inscrição em massa) é especial: retorna **HTTP 207** com `{ "data": [...por item...], "meta": { "total", "enrolled", "failed" } }` — tratar como sucesso parcial, nunca como erro genérico.
- Erros de validação: HTTP 422, `{ "message": "...", "errors": { "campo": ["msg"] } }` (padrão Laravel, igual ao resto do app).

---

## Glossário rápido

| Termo | O que é |
| --- | --- |
| **Template** | Um texto de e-mail reutilizável (assunto + HTML) com variáveis `{{contact_name}}`, `{{first_name}}`, `{{company_name}}`, `{{email}}`, `{{phone}}`, `{{whatsapp}}`, `{{website}}`, `{{country}}`, `{{city}}`, `{{segment}}`, `{{sender_name}}`, `{{unsubscribe_url}}` |
| **Sequence** | Uma "régua" de follow-up (ex: "Cold Outbound") — tem N **steps** |
| **Step** | Um passo da sequência: qual template usar + quantos dias depois da inscrição enviar (`delay_days`) |
| **Enrollment** | A inscrição de UM lead em UMA sequência — é o que tem status, próximo envio agendado, etc. É o objeto central da tela de "timeline de e-mail" do lead |
| **Send** | O histórico de um e-mail individual já enviado (ou tentado) dentro de um enrollment |

## Estados do Enrollment

| `status` | Significado | `exit_reason` (quando status é `cancelled`) |
| --- | --- | --- |
| `active` | Recebendo a sequência normalmente | — |
| `paused` | Pausado (manual ou falha de envio) | — |
| `completed` | Terminou todos os steps sem sair antes | — |
| `cancelled` | Saiu da sequência antes do fim | `replied`, `unsubscribed`, `bounced`, `complained`, `manual_cancel`, `lead_converted`, `lead_lost`, `send_failed_permanently` (via pause, não cancel) |

Estados terminais: `completed` e `cancelled` — não podem ser pausados/retomados. Só `active` pode ser pausado; só `paused` pode ser retomado.

## Estados do Send (histórico de e-mail individual)

`queued` → `sent` → `delivered` → `opened` → `clicked` (progressão feliz, cada um pode ficar "parado" no último status alcançado) | `bounced` | `complained` | `failed` | `cancelled`.

Sugestão de cor de badge: `queued`/`sent` cinza, `delivered`/`opened`/`clicked` verde (mais escuro conforme engajamento), `bounced`/`complained`/`failed` vermelho, `cancelled` cinza-claro.

---

## 1. Templates

### Listar

`GET /admin/commercial/email/templates` — todas as roles do módulo.

```json
{ "data": [
  { "id": "uuid", "name": "Primeiro contato", "slug": "primeiro-contato", "category": "cold_open",
    "subject": "Olá {{contact_name}}", "body_html": "<p>...</p>", "body_text": null,
    "available_variables": null, "is_active": true, "created_by_user_id": "uuid",
    "created_at": "...", "updated_at": "..." }
] }
```

### Criar

`POST /admin/commercial/email/templates` — apenas manager/super_admin.

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| `name` | Sim | |
| `slug` | Sim | único |
| `category` | Não | livre, sugestão: `cold_open`, `follow_up`, `last_call`, `custom` |
| `subject` | Sim | aceita `{{variavel}}` |
| `body_html` | Sim | aceita `{{variavel}}` — HTML completo do corpo |
| `body_text` | Não | fallback texto puro |
| `available_variables` | Não | array livre, só para autocomplete no editor |
| `is_active` | Não | default `true` |

Resposta `201` com o template criado.

### Editar

`PUT /admin/commercial/email/templates/{id}` — mesmos campos, todos `sometimes` (envie só o que mudou). Apenas manager/super_admin.

---

## 2. Sequências e Steps

### Listar sequências

`GET /admin/commercial/email/sequences` — retorna com `steps` (e `steps.template`) já carregados.

```json
{ "data": [
  { "id": "uuid", "name": "Cold Outbound", "description": null, "status": "active", "timezone": null,
    "created_by_user_id": "uuid", "created_at": "...", "updated_at": "...",
    "steps": [
      { "id": "uuid", "sequence_id": "uuid", "template_id": "uuid", "position": 1, "name": "Dia 1 — Primeiro contato",
        "delay_days": 0, "send_time_override": null, "is_active": true,
        "template": { "id": "uuid", "name": "Primeiro contato", "slug": "primeiro-contato" } }
    ] }
] }
```

### Ver uma sequência

`GET /admin/commercial/email/sequences/{id}` — mesmo shape do item acima.

### Criar sequência

`POST /admin/commercial/email/sequences` — manager/super_admin. Campos: `name` (obrigatório), `description`, `status` (`draft`|`active`|`archived`, default `draft`), `timezone` (opcional, ex: `America/Sao_Paulo`).

**Importante:** só sequências com `status=active` E pelo menos 1 step ativo aparecem como elegíveis para inscrição de leads — a tela de criação deveria guiar o usuário: criar em `draft`, adicionar steps, só então mudar para `active`.

### Editar sequência

`PUT /admin/commercial/email/sequences/{id}` — mesmos campos, `sometimes`.

### Adicionar step

`POST /admin/commercial/email/sequences/{sequenceId}/steps` — manager/super_admin.

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| `template_id` | Sim | uuid de um template existente |
| `position` | Sim | inteiro, ordem de exibição/execução |
| `name` | Não | rótulo livre, ex: "Dia 1 — Primeiro contato" |
| `delay_days` | Sim | dias corridos desde a inscrição (`0` = no mesmo dia) |
| `send_time_override` | Não | `HH:MM`, força horário específico dentro da janela de envio |
| `is_active` | Não | default `true` |

### Editar / remover step

`PUT /admin/commercial/email/sequences/{sequenceId}/steps/{stepId}` (campos `sometimes`) | `DELETE /admin/commercial/email/sequences/{sequenceId}/steps/{stepId}`.

### Reordenar steps

`PUT /admin/commercial/email/sequences/{sequenceId}/steps/reorder`

```json
{ "steps": [ { "id": "uuid-step-1", "position": 1 }, { "id": "uuid-step-2", "position": 2 } ] }
```

Retorna a lista de steps já reordenada.

---

## 3. Inscrição de leads (Enrollments)

Esta é a integração principal com a tela de leads.

### Inscrever leads em uma sequência (bulk)

`POST /admin/commercial/email/enrollments`

```json
{ "sequence_id": "uuid", "lead_ids": ["uuid-1", "uuid-2"] }
```

Máximo 200 leads por chamada. Resposta **207**:

```json
{ "data": [
  { "index": 0, "lead_id": "uuid-1", "status": "enrolled", "enrollment": { "id": "uuid", "status": "active", "...": "..." } },
  { "index": 1, "lead_id": "uuid-2", "status": "error", "errors": { "lead_id": ["Este lead já possui uma inscrição ativa ou pausada nesta sequência."] } }
], "meta": { "total": 2, "enrolled": 1, "failed": 1 } }
```

Motivos comuns de erro por item: lead sem e-mail cadastrado, e-mail suprimido (bloqueado/descadastrado), lead já inscrito ativo/pausado na mesma sequência, agent tentando inscrever lead de outro agent. **A UI deveria mostrar esses erros por lead**, não abortar a operação toda (é sucesso parcial por design).

Sugestão de UX: no botão "Inscrever em sequência" da listagem de leads (seleção múltipla), abrir modal para escolher a sequência ativa, disparar essa chamada, e mostrar um resumo tipo "8 de 10 leads inscritos, 2 falharam" com detalhe expansível.

### Pausar / retomar / cancelar / marcar como respondido

```
POST /admin/commercial/email/enrollments/{id}/pause     body opcional: { "reason": "texto livre" }
POST /admin/commercial/email/enrollments/{id}/resume     sem body
POST /admin/commercial/email/enrollments/{id}/cancel     sem body (exit_reason vira "manual_cancel")
POST /admin/commercial/email/enrollments/{id}/mark-replied   sem body (exit_reason vira "replied")
```

Todos retornam `{ "data": <enrollment atualizado> }`. Regras: `pause` só funciona em `active`; `resume` só em `paused`; `mark-replied` falha (422) se já `completed`/`cancelled`.

**"Marcar como respondido" é o mecanismo principal de "o lead respondeu, pare de mandar e-mail"** — o Resend (plano gratuito) não detecta respostas automaticamente, então esse botão precisa ficar bem visível na timeline do lead (ex: ao lado de cada enrollment ativo).

---

## 4. Timeline de e-mail do lead

`GET /admin/commercial/leads/{id}/email-timeline`

Isso é o que alimenta a seção "E-mails" dentro da tela de detalhe do lead (mostra: e-mails enviados, próximo agendado, etapa atual, último envio, status, se respondeu, se descadastrou — exatamente o que foi pedido originalmente).

```json
{ "data": {
  "is_email_suppressed": false,
  "enrollments": [
    {
      "id": "uuid", "lead_id": "uuid", "sequence_id": "uuid",
      "status": "active", "exit_reason": null,
      "current_step_id": "uuid-step-1", "next_step_id": "uuid-step-2",
      "next_send_at": "2026-08-30T11:00:00-03:00",
      "enrolled_at": "2026-08-27T14:00:00-03:00", "enrolled_by_user_id": "uuid",
      "paused_at": null, "pause_reason": null,
      "replied_at": null, "completed_at": null, "cancelled_at": null,
      "sequence": { "id": "uuid", "name": "Cold Outbound" },
      "current_step": { "id": "uuid-step-1", "name": "Dia 1 — Primeiro contato", "position": 1 },
      "next_step": { "id": "uuid-step-2", "name": "Dia 3 — Follow-up", "position": 2 },
      "sends": [
        { "id": "uuid", "to_email": "lead@empresa.com", "rendered_subject": "Olá João",
          "status": "opened", "sent_at": "2026-08-27T14:05:00-03:00",
          "delivered_at": "2026-08-27T14:05:30-03:00", "opened_at": "2026-08-27T15:10:00-03:00",
          "first_clicked_at": null, "bounced_at": null, "failure_reason": null,
          "template": { "id": "uuid", "name": "Primeiro contato" } }
      ]
    }
  ]
} }
```

`is_email_suppressed: true` significa que o e-mail desse lead está bloqueado globalmente (bounce/complaint/unsubscribe) — a UI deveria desabilitar o botão "Inscrever em sequência" e mostrar um aviso, já que uma nova tentativa de inscrição será rejeitada pelo backend de qualquer forma.

Um lead pode ter mais de um `enrollment` (histórico de sequências passadas + uma ativa) — ordenar por `enrolled_at desc` e destacar visualmente o que estiver `active`/`paused`.

---

## 4.5. Dashboard geral (todas as inscrições / todos os envios)

A timeline da seção 4 é por lead (dentro da tela de detalhe). Estes dois endpoints são a visão **geral**, tipo "todos os e-mails comerciais cadastrados/enviados no sistema" — pensados para uma tela de dashboard/relatório, fora do contexto de um lead específico. `commercial_agent` só vê os próprios leads em ambos; manager/super_admin veem tudo.

### Todas as inscrições

`GET /admin/commercial/email/enrollments`

Query opcional: `status` (`active`/`paused`/`completed`/`cancelled`), `sequence_id`, `email` (busca parcial no e-mail do lead), `per_page` (default 20).

```json
{ "data": [
  {
    "id": "uuid", "lead_id": "uuid", "sequence_id": "uuid",
    "status": "active", "exit_reason": null,
    "current_step_id": "uuid-step-1", "next_step_id": "uuid-step-2",
    "next_send_at": "2026-09-02T11:00:00-03:00",
    "enrolled_at": "2026-08-30T14:00:00-03:00",
    "lead": { "id": "uuid", "company_name": "Acme", "contact_name": "João Silva", "email": "joao@acme.test", "assigned_to_user_id": "uuid" },
    "sequence": { "id": "uuid", "name": "Outbound España — Equipos externos" },
    "current_step": { "id": "uuid-step-1", "name": "Dia 1 - Primer contacto", "position": 1 },
    "next_step": { "id": "uuid-step-2", "name": "Dia 3 - Registro horario", "position": 2 }
  }
], "links": { "...": "paginação padrão Laravel" }, "meta": { "...": "paginação padrão Laravel" } }
```

### Todos os envios

`GET /admin/commercial/email/sends`

Query opcional: `status` (`queued`/`sent`/`delivered`/`opened`/`clicked`/`bounced`/`complained`/`failed`/`cancelled`), `email` (busca parcial no destinatário), `enrollment_id`, `per_page` (default 20).

```json
{ "data": [
  {
    "id": "uuid", "enrollment_id": "uuid", "to_email": "joao@acme.test",
    "rendered_subject": "Olá João", "status": "delivered",
    "sent_at": "2026-08-30T14:05:00-03:00", "delivered_at": "2026-08-30T14:05:30-03:00",
    "opened_at": null, "failure_reason": null,
    "lead": { "id": "uuid", "company_name": "Acme", "contact_name": "João Silva", "assigned_to_user_id": "uuid" },
    "template": { "id": "uuid", "name": "Primeiro contato" },
    "sequence_step": { "id": "uuid", "position": 1, "name": "Dia 1 - Primer contacto", "sequence": { "id": "uuid", "name": "Outbound España — Equipos externos" } }
  }
], "links": { "...": "paginação padrão Laravel" }, "meta": { "...": "paginação padrão Laravel" } }
```

Ambos retornam paginação padrão do Laravel (`links`/`meta` com `current_page`, `last_page`, `total`, etc.) — igual à listagem de leads que o front já consome.

---

## 5. Configurações globais (Settings)

Tela separada, só para manager/super_admin — kill switch e limites de envio.

### Ver

`GET /admin/commercial/email/settings`

```json
{ "data": {
  "id": "uuid", "is_globally_paused": false, "paused_at": null, "pause_reason": null,
  "daily_send_limit": 80, "monthly_send_limit": 2400,
  "sending_window_start_time": "08:00:00", "sending_window_end_time": "18:00:00",
  "sending_days": ["mon","tue","wed","thu","fri"], "timezone": "America/Sao_Paulo",
  "min_gap_seconds_between_sends": 45, "max_sends_per_dispatch_run": 6, "bounce_soft_threshold": 2,
  "updated_at": "..."
} }
```

### Atualizar

`PUT /admin/commercial/email/settings` — todos os campos `sometimes`, envie só o que mudou.

| Campo | Regra |
| --- | --- |
| `is_globally_paused` | boolean — **kill switch**: `true` para pausatudo (a UI deveria pedir confirmação e mostrar um banner vermelho persistente enquanto `true`) |
| `pause_reason` | texto livre, mostrar junto do banner |
| `daily_send_limit` | 1-100 (teto real do Resend free é 100/dia) |
| `monthly_send_limit` | 1-3000 (teto real do Resend free é 3000/mês) |
| `sending_window_start_time` / `_end_time` | `HH:MM`, end > start |
| `sending_days` | array de `sun,mon,tue,wed,thu,fri,sat` |
| `timezone` | string IANA |
| `min_gap_seconds_between_sends` | espaçamento mínimo entre envios de um mesmo lote |
| `max_sends_per_dispatch_run` | 1-50, quantos e-mails o processo agendado dispara por execução (roda a cada 15 min) |
| `bounce_soft_threshold` | quantos bounces do mesmo lead até suprimir por "acúmulo de bounce leve" |

Sugestão de UI: mostrar `daily_send_limit`/`monthly_send_limit` com um aviso inline se o usuário tentar passar de 100/3000 (o backend já valida, mas evita a viagem de rede).

---

## O que NÃO precisa de tela

- **Webhook** (`POST /commercial/email/webhook`) — só o Resend chama, é 100% backend.
- **Unsubscribe** (`GET|POST /commercial/email/unsubscribe/{token}`) — link público dentro do próprio e-mail, o lead clica e cai numa página de confirmação simples servida pelo backend (JSON hoje; se quiser uma página HTML bonita de confirmação, é um ajuste futuro no `CommercialEmailUnsubscribeController`, não é responsabilidade do frontend admin).
