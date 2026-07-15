# Reativação de Funcionário - Guia Rápido Frontend

Base API: `/api/v1`

Todos os endpoints abaixo exigem role `admin` ou `super_admin` e assinatura ativa (`subscription.access`).

## Listar Funcionários Desativados

`GET /admin/employees?status=inactive`

Sem o parâmetro `status`, o endpoint retorna apenas os ativos (comportamento atual, inalterado). Aceita os mesmos parâmetros de paginação de sempre (`per_page`).

```json
{
  "data": [
    {
      "id": "uuid",
      "company_id": "uuid",
      "name": "Fulano da Silva",
      "email": "fulano@empresa.com",
      "role": { "id": "uuid", "name": "manager", "display_name": "Gerente" },
      "deleted_at": "2026-07-10T14:32:00+00:00",
      "...": "demais campos iguais ao GET /admin/employees normal"
    }
  ],
  "links": { "...": "paginação padrão" },
  "meta": { "...": "paginação padrão" }
}
```

Use `deleted_at` (agora presente em toda resposta de `EmployeeResource`, inclusive na listagem ativa — sempre `null` para quem está ativo) para exibir o badge de status na UI.

## Reativar

`POST /admin/employees/{id}/restore`

Sem body.

**Sucesso (200):**

```json
{
  "id": "uuid",
  "name": "Fulano da Silva",
  "email": "fulano@empresa.com",
  "role": { "id": "uuid", "name": "manager", "display_name": "Gerente" },
  "deleted_at": null,
  "...": "mesmo formato do GET /admin/employees/{id}"
}
```

A API tenta restaurar automaticamente o cargo (role) que o funcionário tinha antes de ser desativado (busca o último registro de desativação no audit log). Se não encontrar essa informação, o funcionário volta **sem role** — nesse caso, oriente o admin a definir o cargo pela tela de edição existente (`PUT /admin/employees/{id}`).

Área, turno e vínculos com áreas geridas voltam automaticamente junto com o registro — não precisam de nenhuma ação extra no front.

**Erros:**

| Status | Quando | Ação sugerida na UI |
| --- | --- | --- |
| `422` | Funcionário já está ativo | Não deveria aparecer no fluxo normal (botão só some para itens da listagem `status=inactive`); trate como erro genérico se ocorrer |
| `403` | Usuário logado não é admin/super_admin, ou funcionário é de outra empresa | Ocultar/desabilitar a ação para quem não é admin |
| `404` | ID não existe ou não pertence à empresa do usuário logado | Recarregar a listagem |

## Regras Para UI

- Mostrar a ação "Reativar" apenas para itens vindos de `GET /admin/employees?status=inactive`.
- Depois de reativar com sucesso, remover o item da lista de inativos e/ou atualizar a listagem de ativos.
- Se o funcionário voltar sem `role`, sinalizar visualmente (ex: badge "sem cargo") e direcionar para a edição.
- Nenhuma cobrança adicional (extra employee) é disparada automaticamente pela reativação em si — isso só acontece se, depois, o admin atribuir o cargo `employee` via tela de edição (comportamento já existente).
