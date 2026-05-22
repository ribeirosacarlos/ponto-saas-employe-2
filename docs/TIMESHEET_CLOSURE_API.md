# API — Fechamento Mensal da Folha de Ponto

Documentação completa dos endpoints para integração do frontend com o módulo de fechamento mensal.

---

## Autenticação

Todos os endpoints requerem `Authorization: Bearer {token}` (Sanctum).

---

## Fluxo Geral

```
Admin fecha o mês
        ↓
status: "processing"  (sistema gera snapshots em background)
        ↓
status: "open"        (todos os snapshots prontos — colaboradores podem assinar)
        ↓
Colaborador revisa e assina  →  status do timesheet: "pending_manager"
        ↓ (ou)
Colaborador contesta         →  status do timesheet: "disputed"
        ↓
Admin/Gestor resolve          →  status do timesheet: "pending_manager"
        ↓
Admin/Gestor assina           →  status do timesheet: "completed"
        ↓
Todos os timesheets "completed"
        ↓
status do fechamento: "completed"
```

---

## Status dos Enums

### `ClosureStatus` (status do fechamento mensal)
| Valor | Descrição |
|-------|-----------|
| `processing` | Snapshots sendo gerados em background |
| `open` | Aberto para assinaturas dos colaboradores |
| `completed` | Todos os timesheets assinados |

### `TimesheetStatus` (status do timesheet individual)
| Valor | Descrição |
|-------|-----------|
| `pending_employee` | Aguardando revisão/assinatura do colaborador |
| `disputed` | Colaborador contestou |
| `pending_manager` | Colaborador assinou, aguarda gestor |
| `completed` | Assinado por ambos |

### `DisputeStatus`
| Valor | Descrição |
|-------|-----------|
| `open` | Contestação em aberto |
| `resolved` | Resolvida pelo admin/gestor |

---

## Endpoints — Admin / Gestor

### Fechar um mês

```
POST /api/v1/admin/monthly-closures
```

**Role requerida:** `admin`

**Body:**
```json
{
  "reference_year": 2026,
  "reference_month": 4
}
```

**Resposta 201:**
```json
{
  "data": {
    "id": "uuid",
    "company_id": "uuid",
    "closed_by": {
      "id": "uuid",
      "name": "João Admin"
    },
    "reference_year": 2026,
    "reference_month": 4,
    "status": "processing",
    "closed_at": "2026-05-21T10:00:00+00:00",
    "timesheets_count": 3,
    "created_at": "2026-05-21T10:00:00+00:00"
  }
}
```

**Erros:**
- `422` — mês atual ou futuro, ou mês já fechado:
```json
{
  "message": "...",
  "errors": {
    "reference_month": ["Este mês já foi fechado para esta empresa."]
  }
}
```

---

### Listar fechamentos mensais

```
GET /api/v1/admin/monthly-closures
```

**Role requerida:** `admin`, `manager`, `area_manager`

**Query params:**
- `per_page` (int, default 20)

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "closed_by": { "id": "uuid", "name": "João Admin" },
      "reference_year": 2026,
      "reference_month": 4,
      "status": "open",
      "closed_at": "2026-05-21T10:00:00+00:00",
      "timesheets_count": 3,
      "created_at": "2026-05-21T10:00:00+00:00"
    }
  ],
  "links": { ... },
  "meta": { ... }
}
```

---

### Detalhe de um fechamento

```
GET /api/v1/admin/monthly-closures/{closure_id}
```

**Role requerida:** `admin`, `manager`, `area_manager`

**Resposta 200:** mesmo formato do objeto acima.

---

### Listar timesheets de um fechamento

```
GET /api/v1/admin/monthly-closures/{closure_id}/timesheets
```

**Role requerida:** `admin`, `manager`, `area_manager`

**Query params:**
- `per_page` (int, default 20)

**Resposta 200:**
```json
{
  "data": [
    {
      "id": "uuid",
      "closure_id": "uuid",
      "employee": { "id": "uuid", "name": "Maria Colaboradora" },
      "status": "pending_employee",
      "snapshot": {
        "employee_id": "uuid",
        "from": "2026-04-01",
        "to": "2026-04-30",
        "timezone": "America/Sao_Paulo",
        "totals": {
          "scheduled_minutes": 10080,
          "worked_minutes": 9840,
          "balance_minutes": -240,
          "overtime_minutes": 0,
          "absence_minutes": 240
        },
        "days": [
          {
            "date": "2026-04-01",
            "weekday": "tuesday",
            "is_holiday": false,
            "scheduled_minutes": 480,
            "worked_minutes": 475,
            "balance_minutes": -5,
            "entries": [
              { "type": "clock_in", "time": "09:00", "is_adjusted": false },
              { "type": "clock_out", "time": "18:00", "is_adjusted": false }
            ]
          }
        ]
      },
      "snapshot_generated_at": "2026-05-21T10:01:00+00:00",
      "signatures": [
        {
          "id": "uuid",
          "role": "employee",
          "signer": { "id": "uuid", "name": "Maria Colaboradora" },
          "signed_at": "2026-05-22T09:00:00+00:00",
          "ip_address": "192.168.1.1"
        }
      ],
      "open_dispute": null,
      "pdf_path": null,
      "created_at": "2026-05-21T10:00:00+00:00"
    }
  ],
  "links": { ... },
  "meta": { ... }
}
```

---

### Detalhe de um timesheet (admin)

```
GET /api/v1/admin/timesheets/{timesheet_id}
```

**Role requerida:** `admin`, `manager`, `area_manager` (visibilidade sobre o colaborador)

**Resposta 200:** mesmo formato do objeto timesheet acima.

---

### Assinar timesheet como gestor

```
POST /api/v1/admin/timesheets/{timesheet_id}/sign
```

**Role requerida:** `admin`, `manager`, `area_manager` (com visibilidade sobre o colaborador)

**Body:** vazio `{}`

**Resposta 200:**
```json
{
  "data": {
    "id": "uuid",
    "status": "completed",
    "signatures": [
      { "role": "employee", "signed_at": "...", "signer": { ... } },
      { "role": "manager",  "signed_at": "...", "signer": { ... } }
    ],
    ...
  }
}
```

**Erros:**
- `422` — timesheet não está em `pending_manager`:
```json
{
  "errors": { "status": ["..."] }
}
```
- `403` — gestor não tem visibilidade sobre o colaborador

---

### Resolver uma contestação

```
POST /api/v1/admin/timesheets/{timesheet_id}/disputes/{dispute_id}/resolve
```

**Role requerida:** `admin`, `manager`, `area_manager`

**Body:**
```json
{
  "resolution_note": "Verificado e corrigido no sistema."
}
```

**Resposta 200:**
```json
{
  "data": {
    "id": "uuid",
    "reason": "Batidas incorretas no período.",
    "status": "resolved",
    "resolution_note": "Verificado e corrigido no sistema.",
    "resolved_by": { "id": "uuid", "name": "João Admin" },
    "resolved_at": "2026-05-22T14:00:00+00:00",
    "created_at": "2026-05-21T16:00:00+00:00"
  }
}
```

> Ao resolver, o timesheet volta automaticamente para `pending_employee`.

---

## Endpoints — Colaborador

### Listar meus timesheets

```
GET /api/v1/employee/timesheets
```

**Role requerida:** `employee`

> Retorna apenas timesheets de fechamentos com status `open` ou `completed`.

**Query params:**
- `per_page` (int, default 20)

**Resposta 200:** lista paginada de timesheets (mesmo formato acima, sem campo `employee`).

---

### Detalhe do meu timesheet

```
GET /api/v1/employee/timesheets/{timesheet_id}
```

**Role requerida:** `employee` (somente o próprio)

**Resposta 200:** objeto timesheet completo.

---

### Assinar meu timesheet

```
POST /api/v1/employee/timesheets/{timesheet_id}/sign
```

**Role requerida:** `employee` (somente o próprio)

**Body:** vazio `{}`

**Resposta 200:**
```json
{
  "data": {
    "id": "uuid",
    "status": "pending_manager",
    "signatures": [
      {
        "id": "uuid",
        "role": "employee",
        "signer": { "id": "uuid", "name": "Maria Colaboradora" },
        "signed_at": "2026-05-22T09:00:00+00:00",
        "ip_address": "192.168.1.10"
      }
    ],
    ...
  }
}
```

**Erros:**
- `422` — existe contestação em aberto:
```json
{
  "errors": { "dispute": ["..."] }
}
```
- `422` — status não é `pending_employee`
- `403` — colaborador tentando assinar timesheet de outro

---

### Contestar meu timesheet

```
POST /api/v1/employee/timesheets/{timesheet_id}/dispute
```

**Role requerida:** `employee` (somente o próprio)

**Body:**
```json
{
  "reason": "Existem batidas incorretas no período."
}
```

**Resposta 201:**
```json
{
  "data": {
    "id": "uuid",
    "reason": "Existem batidas incorretas no período.",
    "status": "open",
    "resolution_note": null,
    "resolved_by": null,
    "resolved_at": null,
    "created_at": "2026-05-22T10:00:00+00:00"
  }
}
```

> Ao contestar, o timesheet muda automaticamente para `disputed`.

**Erros:**
- `422` — já existe uma contestação em aberto para este timesheet
- `422` — status não é `pending_employee`
- `403` — colaborador tentando contestar timesheet de outro

---

## Estrutura do `snapshot`

O snapshot é um JSON imutável gerado no momento do fechamento, com os dados de ponto do colaborador no período.

```json
{
  "employee_id": "uuid",
  "from": "2026-04-01",
  "to": "2026-04-30",
  "timezone": "America/Sao_Paulo",
  "totals": {
    "scheduled_minutes": 10080,
    "worked_minutes": 9840,
    "balance_minutes": -240,
    "overtime_minutes": 120,
    "absence_minutes": 360,
    "vacation_minutes": 0,
    "holiday_minutes": 0
  },
  "days": [
    {
      "date": "2026-04-01",
      "weekday": "tuesday",
      "is_holiday": false,
      "scheduled_minutes": 480,
      "worked_minutes": 475,
      "balance_minutes": -5,
      "entries": [
        {
          "type": "clock_in",
          "time": "09:02",
          "is_adjusted": false
        },
        {
          "type": "clock_out",
          "time": "18:00",
          "is_adjusted": false
        }
      ]
    }
  ]
}
```

> `snapshot` é `null` enquanto o fechamento está em `processing`. O campo `snapshot_generated_at` indica quando foi gerado.

---

## Regras de Negócio Importantes

1. **Só é possível fechar meses passados** — o mês atual e futuros retornam `422`.
2. **Não é possível fechar o mesmo mês duas vezes** — retorna `422`.
3. **O colaborador só assina quando não há contestação em aberto.**
4. **O gestor só assina após o colaborador** — o timesheet precisa estar em `pending_manager`.
5. **Ao resolver uma contestação**, o timesheet volta para `pending_employee` para o colaborador assinar novamente.
6. **O fechamento avança para `completed` automaticamente** quando todos os timesheets estiverem em `completed`.
7. **O snapshot é gerado de forma assíncrona** (via job em background). O fechamento fica em `processing` até todos os snapshots estarem prontos.
