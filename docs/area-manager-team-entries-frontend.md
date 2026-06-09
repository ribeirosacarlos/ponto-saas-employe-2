# Frontend: pontos de absence em team entries

Base API: `/api/v1`

## Rota principal

`GET /area-manager/team/entries`

Use com `user_id` para tela de ponto por dia:

```http
GET /api/v1/area-manager/team/entries?user_id={employee_id}&date_from=2026-06-01&date_to=2026-06-30
```

Resposta agrupada:

```json
{
  "data": [
    {
      "date": "2026-06-10",
      "employee_id": "uuid",
      "day_summary": {},
      "entries": []
    }
  ],
  "total_days": 1,
  "total_entries": 2
}
```

## Como identificar absence

Um ponto gerado por abono/atestado vem como `TimeEntry` normal dentro de `entries[]`, mas com estes campos:

```json
{
  "id": "uuid",
  "clocked_at": "2026-06-10T11:00:00+00:00",
  "type": "in",
  "source": "absence_allowance",
  "device_type": "system",
  "absence": true,
  "absence_id": "uuid",
  "absence_type": "excused_absence",
  "absence_coverage_type": "hours"
}
```

Regra simples no front:

```ts
const isAbsenceEntry =
  entry.absence === true || entry.source === 'absence_allowance'
```

## Campos importantes

| Campo | Uso no front |
| --- | --- |
| `absence` | Booleano para marcar visualmente como abono/atestado. |
| `absence_id` | ID do registro em `absences`; pode ser usado para abrir detalhe futuro. |
| `absence_type` | Motivo tecnico: ex. `excused_absence`, `sick_leave`, `personal_reason`. |
| `absence_coverage_type` | `full_day` ou `hours`. |
| `source` | Para absence persistida sempre vem `absence_allowance`. |
| `device_type` | Para ponto gerado pelo sistema vem `system`. |

## Exibicao sugerida

- Liste absence junto com as batidas reais na ordem de `clocked_at`.
- Mostre uma tag, por exemplo: `Abono`, `Atestado` ou `Ausencia abonada`.
- Para `absence_coverage_type = full_day`, normalmente havera entrada e saida conforme o shift do dia.
- Para `absence_coverage_type = hours`, havera entrada e saida no intervalo abonado.
- Nao trate como ajuste de ponto; absence nao usa `adjustment_status`.

## Calculo

Nao some manualmente os pontos de absence no front.

Use `day_summary` para totais do dia:

- `worked_minutes`: total oficial do dia, ja inclui credito de absence efetiva.
- `raw_worked_minutes`: somente horas reais batidas pelo usuario; nao inclui `source=absence_allowance`.
- `absence_minutes`: minutos abonados.
- `expected_minutes`: jornada esperada do shift.
- `balance_minutes`, `extra_minutes`, `debt_minutes`: saldo oficial para exibir.

Exemplo de dia com absence:

```json
{
  "day_summary": {
    "worked_minutes": 540,
    "raw_worked_minutes": 240,
    "absence_minutes": 300,
    "expected_minutes": 540,
    "balance_minutes": 0,
    "status": "even",
    "is_absence": true,
    "absence_type": "sick_leave",
    "absence_coverage_type": "full_day"
  }
}
```

## Observacoes

- Absences `pending`, `rejected` e `canceled` nao geram pontos nem entram no calculo.
- Se nao houver shift valido no dia, o backend nao gera ponto de absence para aquele dia.
- Isolamento por empresa e visibilidade do gestor ja sao aplicados pelo backend.
