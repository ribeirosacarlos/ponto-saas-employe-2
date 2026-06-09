# Atestados Médicos - Guia Rápido Frontend

Base API: `/api/v1`

## Estados

| Status | Significado | Efeito no ponto |
| --- | --- | --- |
| `pending` | Enviado pelo funcionário, aguardando revisão | Não abona |
| `approved` | Aprovado pelo gestor/admin | Abona |
| `rejected` | Rejeitado pelo gestor/admin | Não abona |
| `canceled` | Cancelado pelo funcionário | Não abona |

## Tipos de abono

### Dia inteiro

Use quando o atestado cobre um ou mais dias completos.

```json
{
  "coverage_type": "full_day",
  "start_date": "2026-06-01",
  "end_date": "2026-06-03",
  "comment": "Atestado médico"
}
```

`end_date` pode ser omitido quando for apenas um dia.

### Horas

Use quando o atestado cobre parte de um dia.

```json
{
  "coverage_type": "hours",
  "date": "2026-06-01",
  "start_time": "10:00",
  "end_time": "12:00",
  "comment": "Consulta médica"
}
```

Atestado de horas vale para uma única data.

## Funcionário

### Listar

`GET /employee/medical-certificates`

Query opcional:

```text
status=pending|approved|rejected|canceled
from=YYYY-MM-DD
to=YYYY-MM-DD
per_page=20
```

### Criar solicitação

`POST /employee/medical-certificates`

Enviar como `multipart/form-data` se houver anexos.

Campos:

| Campo | Obrigatório | Observação |
| --- | --- | --- |
| `coverage_type` | Sim | `full_day` ou `hours` |
| `start_date` | Sim para `full_day` | Data inicial |
| `end_date` | Não | Data final |
| `date` | Sim para `hours` | Data do atestado parcial |
| `start_time` | Sim para `hours` | `HH:MM` |
| `end_time` | Sim para `hours` | `HH:MM`, maior que `start_time` |
| `comment` | Não | Texto livre |
| `files[]` | Não | Um ou mais anexos |

Resposta `201`: atestado criado com `status = pending`.

### Ver detalhe

`GET /employee/medical-certificates/{id}`

### Cancelar

`DELETE /employee/medical-certificates/{id}`

Só funciona para solicitação própria com `status = pending`.

## Admin / Manager / Area Manager

### Listar

`GET /admin/medical-certificates`

Query opcional:

```text
user_id=uuid
status=pending|approved|rejected|canceled
from=YYYY-MM-DD
to=YYYY-MM-DD
per_page=20
```

### Criar aprovado direto

`POST /admin/medical-certificates`

Mesmo payload do funcionário, adicionando `user_id`.

Resposta `201`: atestado criado com `status = approved`.

### Aprovar

`PATCH /admin/medical-certificates/{id}/approve`

Sem body.

### Rejeitar

`PATCH /admin/medical-certificates/{id}/reject`

```json
{
  "rejection_reason": "Documento ilegível"
}
```

## Formato da resposta

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "type": "sick_leave",
    "coverage_type": "full_day",
    "start_date": "2026-06-01",
    "end_date": "2026-06-03",
    "start_time": null,
    "end_time": null,
    "status": "pending",
    "comment": "Atestado médico",
    "counts_for_accrual": true,
    "approved_by": null,
    "approved_at": null,
    "rejected_by": null,
    "rejected_at": null,
    "rejection_reason": null,
    "canceled_by": null,
    "canceled_at": null,
    "documents": [],
    "created_at": "2026-06-05T10:00:00+00:00",
    "updated_at": "2026-06-05T10:00:00+00:00"
  }
}
```

Em listagens, a resposta é paginada no padrão Laravel Resource Collection.

## Regras Para UI

- Anexo é opcional.
- Funcionário sempre cria como `pending`.
- Admin/manager/area_manager cria direto como `approved`.
- Mostrar botão de cancelar apenas para funcionário dono e `status = pending`.
- Mostrar aprovar/rejeitar apenas para gestor/admin e `status = pending`.
- Bloqueios retornam `422`, normalmente no campo `start_date`.
- Se houver mês fechado no período, a API bloqueia criação/aprovação/cancelamento.
- Se houver férias ou ausência sobreposta, a API bloqueia criação/aprovação.
- Atestado aprovado não remove batidas já feitas no dia.
