# Time Entry API

## Criterio de padronizacao

- Todos os endpoints de `time entry` usam `snake_case`.
- Endpoints de batida bruta retornam objetos `TimeEntry` sem agregacao diaria.
- Endpoints agregados por dia usam `summary` como fonte canonica dos calculos.
- Nos endpoints agregados, alguns campos principais continuam espelhados no nivel raiz do dia para retrocompatibilidade:
  - `worked_minutes`
  - `worked_hhmm`
  - `expected_minutes`
  - `expected_hhmm`
  - `balance_minutes`
  - `balance_hhmm`
  - `status`

## Endpoints de batida bruta

- `GET /v1/employee/entries`
- `GET /v1/area-manager/team/entries`
- `GET /v1/employee/adjustments`
- `GET /v1/area-manager/adjustments`
- `POST /v1/employee/clock`
- `POST /v1/employee/time-entries/{timeEntry}/adjustment`
- `POST /v1/admin/time-entries/{timeEntry}/adjustment/approve`
- `POST /v1/admin/time-entries/{timeEntry}/adjustment/reject`

Regra:

- `clocked_at` em ISO-8601
- nomes sempre em `snake_case`
- filtros `date_from` e `date_to` aceitam dois modos:
  - `YYYY-MM-DD`: expande para o dia inteiro no fuso da empresa
  - valor com hora/offset (`2026-05-31T23:59:59-03:00`): a hora e ignorada e so a data (`2026-05-31`) e usada
- quando `user_id` for informado em `GET /v1/area-manager/team/entries`, a rota retorna os dias agrupados desse usuario, ignora `page`/`per_page`, coloca `day_summary` uma vez por dia e lista as batidas em `entries[]`
- quando o relacionamento `user` vier carregado, ele aparece como:

```json
{
  "user": {
    "id": "uuid",
    "name": "Nome",
    "email": "email@empresa.com"
  }
}
```

## Endpoints agregados por dia

- `GET /v1/employee/entries/history`
- `GET /v1/employee/worked-today`
- `GET /v1/admin/employees/{employee}/overtime`
- `GET /v1/area-manager/team/{employee}/overtime`
- `GET /v1/employee/{employee}/overtime`

Regra:

- `summary` e o contrato canonico
- aliases no nivel raiz existem para conveniencia e retrocompatibilidade
- frontend deve preferir `summary`

Exemplo de um item de `days[]`:

```json
{
  "date": "2025-12-19",
  "worked_minutes": 480,
  "worked_hhmm": "08:00",
  "expected_minutes": 540,
  "expected_hhmm": "09:00",
  "balance_minutes": -60,
  "balance_hhmm": "-01:00",
  "status": "debt",
  "summary": {
    "worked_minutes": 480,
    "worked_hhmm": "08:00",
    "expected_minutes": 540,
    "expected_hhmm": "09:00",
    "balance_minutes": -60,
    "balance_hhmm": "-01:00",
    "extra_minutes": 0,
    "debt_minutes": -60,
    "status": "debt",
    "allowed_break_minutes": 60,
    "exceeded_break_minutes": 0,
    "has_incomplete_entries": false,
    "open_session": false
  }
}
```

## Observacao importante

- `GET /v1/area-manager/team/entries` sem `user_id` continua retornando batidas brutas paginadas; cada item tambem pode trazer:
  - `work_date`
  - `day_summary`
- `GET /v1/area-manager/team/entries` com `user_id` retorna `data[]` agrupado por dia:
  - `date`
  - `employee_id`
  - `user`
  - `day_summary`
  - `entries[]`
- `day_summary` segue exatamente a mesma regra do overtime e, no formato agrupado, nao e repetido dentro de cada batida.
- Para uma consulta orientada a periodo/dias, o endpoint canonico continua sendo `GET /v1/area-manager/team/{employee}/overtime?include_days=1`.

Exemplo com `user_id` em `GET /v1/area-manager/team/entries`:

```json
{
  "data": [
    {
      "date": "2025-12-19",
      "employee_id": "uuid",
      "user": {
        "id": "uuid",
        "name": "Nome",
        "email": "email@empresa.com"
      },
      "day_summary": {
        "worked_minutes": 540,
        "worked_hhmm": "09:00",
        "expected_minutes": 540,
        "expected_hhmm": "09:00",
        "balance_minutes": 0,
        "balance_hhmm": "00:00",
        "extra_minutes": 0,
        "debt_minutes": 0,
        "status": "even",
        "allowed_break_minutes": 60,
        "exceeded_break_minutes": 0,
        "has_incomplete_entries": false,
        "open_session": false
      },
      "entries": [
        {
          "id": "uuid",
          "user_id": "uuid",
          "clocked_at": "2025-12-19T17:00:00+00:00",
          "type": "out",
          "source": "web",
          "work_date": "2025-12-19"
        }
      ]
    }
  ],
  "total_days": 1,
  "total_entries": 2
}
```
