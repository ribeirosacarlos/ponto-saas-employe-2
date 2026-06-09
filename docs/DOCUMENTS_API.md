# Documentos - Rotas, Regras e Storage S3

## Base URL

As rotas de API sao carregadas com prefixo `v1` dentro do grupo API do Laravel.

Use uma destas combinacoes, conforme o `baseURL` do cliente:

- `baseURL=https://api.jornafy.com/api` + path `/v1/documents`
- `baseURL=https://api.jornafy.com` + path `/api/v1/documents`

Evite duplicar `/api`, por exemplo `https://api.jornafy.com/api/api/v1/documents`.

Todas as rotas autenticadas exigem `auth:sanctum`.

## Status

Valores aceitos para `documents.status`:

- `pending`
- `review`
- `available`
- `expired`

## Categorias

Valores aceitos para `documents.category`:

- `payroll`
- `courses`
- `personal`
- `others`

## Regras de Arquivo

Uploads aceitam:

- Extensoes: `pdf`, `jpg`, `jpeg`, `png`, `doc`, `docx`, `xls`, `xlsx`
- Tamanho maximo: 5 MB por arquivo
- Campo multipart:
  - Cadastro normal: `files[]`
  - Cadastro admin para funcionario: `files[]`
  - Reenvio de documento em revisao: `file`

O backend valida o conteudo real do arquivo antes de salvar no S3. Um arquivo renomeado para `.pdf`, por exemplo, sera rejeitado se nao tiver assinatura real de PDF (`%PDF-`).

## Storage S3 Atual

Hoje o upload salva diretamente no disco `s3` com visibilidade privada:

```text
jornafy-documents/{company_uuid}/documents/employees/{employee_uuid}/{ulid}.{ext}
```

Exemplo:

```text
jornafy-documents/0f0d4d6e-7d0b-4fa0-9c1c-2df0f3e9a111/documents/employees/a1b2c3d4-0000-4000-9000-111111111111/01HXABCDEF1234567890ABCDE1.pdf
```

O banco salva:

- `storage_disk = s3`
- `path = jornafy-documents/{company_uuid}/documents/employees/{employee_uuid}/{ulid}.{ext}`
- `original_name`
- `uploaded_by`
- `mime_type`
- `ext`
- `size_bytes`

Se o upload no S3 falhar, o registro no banco nao e criado. Se o upload no S3 passar mas a criacao do banco falhar, o backend tenta apagar o objeto recem-enviado.

## Organizacao Para Outros Modulos

O prefixo `jornafy-documents/{company_uuid}` e a raiz compartilhada da empresa para arquivos de negocio:

```text
jornafy-documents/{company_uuid}/documents/employees/{employee_uuid}/{ulid}.{ext}
```

Exemplo:

```text
jornafy-documents/0f0d4d6e-7d0b-4fa0-9c1c-2df0f3e9a111/documents/employees/a1b2c3d4-0000-4000-9000-111111111111/01HXABCDEF1234567890ABCDE1.pdf
```

```text
jornafy-documents/{company_uuid}/documents/employees/{employee_uuid}/...
jornafy-documents/{company_uuid}/timesheets/...
jornafy-documents/{company_uuid}/signatures/...
jornafy-documents/{company_uuid}/exports/...
```

## Rotas Do Usuario

### GET `/v1/documents`

Lista documentos visiveis para o usuario autenticado.

Permissoes:

- `employee`: ve apenas os proprios documentos.
- `admin`: ve documentos da empresa.
- `manager` e `area_manager`: ve documentos conforme regras de visibilidade de usuarios gerenciados.

Query params:

| Campo | Tipo | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `category` | string | Nao | Filtra por categoria. |
| `status` | string | Nao | Filtra por status. |
| `search` | string | Nao | Busca em `title` e `notes`. |
| `sort` | string | Nao | Apenas `updated_at:asc` ou `updated_at:desc`. Padrao: `updated_at:desc`. |
| `per_page` | integer | Nao | De 1 a 100. Padrao: 20. |

Resposta `200`:

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Contrato - contrato.pdf",
      "category": "personal",
      "status": "pending",
      "original_name": "contrato.pdf",
      "size_bytes": 204800,
      "mime_type": "application/pdf",
      "ext": "pdf",
      "storage_disk": "s3",
      "storage_path": "jornafy-documents/{company_uuid}/documents/employees/{employee_uuid}/{ulid}.pdf",
      "created_at": "2026-06-04 10:00:00",
      "updated_at": "2026-06-04 10:00:00"
    }
  ]
}
```

### POST `/v1/documents`

Envia um ou mais documentos para o proprio usuario autenticado.

Permissoes:

- `employee`
- `area_manager`
- `manager`
- `admin`

Body `multipart/form-data`:

| Campo | Tipo | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `category` | string | Sim | `payroll`, `courses`, `personal` ou `others`. |
| `title` | string | Nao | Ate 180 caracteres. Usado como prefixo do titulo. |
| `notes` | string | Nao | Ate 2000 caracteres. |
| `files[]` | file[] | Sim | Um ou mais arquivos validos. |

Exemplo `curl`:

```bash
curl -X POST "$API_BASE/v1/documents" \
  -H "Authorization: Bearer $TOKEN" \
  -F "category=personal" \
  -F "title=Contrato" \
  -F "notes=Upload do colaborador" \
  -F "files[]=@/caminho/contrato.pdf"
```

Resposta `201`:

```json
{
  "data": [
    {
      "id": "uuid",
      "title": "Contrato - contrato.pdf",
      "category": "personal",
      "status": "pending",
      "original_name": "contrato.pdf",
      "size_bytes": 204800,
      "mime_type": "application/pdf",
      "ext": "pdf",
      "storage_disk": "s3",
      "storage_path": "jornafy-documents/{company_uuid}/documents/employees/{employee_uuid}/{ulid}.pdf",
      "created_at": "2026-06-04 10:00:00",
      "updated_at": "2026-06-04 10:00:00"
    }
  ]
}
```

Erros comuns:

- `401`: token ausente ou invalido.
- `403`: role sem acesso ou assinatura sem acesso.
- `422`: `files` ausente, `category` invalida, arquivo maior que 5 MB ou conteudo real invalido.
- `500`: falha de S3, credenciais, bucket ou permissao IAM.

### GET `/v1/documents/{document}`

Retorna detalhe de um documento.

Permissoes:

- Dono do documento.
- `admin`, `manager` ou `area_manager` com visibilidade sobre o usuario dono.

Resposta `200`:

```json
{
  "data": {
    "id": "uuid",
    "title": "Contrato - contrato.pdf",
    "category": "personal",
    "status": "pending",
    "original_name": "contrato.pdf",
    "size_bytes": 204800,
    "mime_type": "application/pdf",
    "ext": "pdf",
    "storage_disk": "s3",
    "storage_path": "jornafy-documents/{company_uuid}/documents/employees/{employee_uuid}/{ulid}.pdf",
    "created_at": "2026-06-04 10:00:00",
    "updated_at": "2026-06-04 10:00:00",
    "view_url": "https://api.jornafy.com/api/v1/documents/{document}/view",
    "download_url": "https://api.jornafy.com/api/v1/documents/{document}/download"
  }
}
```

### GET `/v1/documents/{document}/view`

Abre o arquivo inline via stream.

Comportamento:

- Verifica permissao de visualizacao.
- Resolve o caminho salvo em `documents.path`.
- Faz stream do arquivo pelo backend.
- Registra auditoria `view`.

Resposta:

- `200`: binario do arquivo.
- `403`: sem permissao.
- `404`: documento ou arquivo nao encontrado.

### GET `/v1/documents/{document}/download`

Baixa o arquivo.

Comportamento:

- Verifica permissao de download.
- Se `storage_disk = s3`, gera URL temporaria de 5 minutos e redireciona.
- Se for storage local legado, faz download pelo Laravel.
- Registra auditoria `download`.

Resposta:

- `302`: redirect para URL temporaria do S3.
- `200`: download local legado.
- `403`: sem permissao.
- `404`: documento ou arquivo nao encontrado.

### POST `/v1/documents/{document}/resend`

Reenvia arquivo para um documento rejeitado/em revisao.

Permissao:

- Apenas o dono do documento.
- O documento precisa estar com status `review`.

Body `multipart/form-data`:

| Campo | Tipo | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `file` | file | Sim | Novo arquivo validado. |

Exemplo `curl`:

```bash
curl -X POST "$API_BASE/v1/documents/$DOCUMENT_ID/resend" \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@/caminho/novo-documento.pdf"
```

Comportamento:

- Apaga o arquivo anterior, se encontrado.
- Salva o novo arquivo no S3.
- Atualiza metadados.
- Volta status para `pending`.
- Limpa campos de rejeicao.
- Registra auditoria `resend` e `status_change`.

Resposta `200`:

```json
{
  "data": {
    "id": "uuid",
    "title": "Documento em revisao",
    "category": "personal",
    "status": "pending",
    "original_name": "novo-documento.pdf",
    "size_bytes": 307200,
    "mime_type": "application/pdf",
    "ext": "pdf",
    "storage_disk": "s3",
    "storage_path": "jornafy-documents/{company_uuid}/documents/employees/{employee_uuid}/{ulid}.pdf",
    "created_at": "2026-06-04 10:00:00",
    "updated_at": "2026-06-04 10:05:00"
  }
}
```

### PATCH `/v1/documents/{document}`

Atualiza metadados/status do documento.

Permissoes:

- `admin`
- `manager`
- `area_manager`

Body JSON:

| Campo | Tipo | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `title` | string | Nao | Ate 180 caracteres. |
| `category` | string | Nao | Categoria valida. |
| `status` | string | Nao | Status valido. |
| `notes` | string|null | Nao | Ate 2000 caracteres. |

Exemplo:

```json
{
  "title": "Contrato atualizado",
  "category": "personal",
  "status": "available",
  "notes": "Conferido pelo gestor"
}
```

Resposta `200`: `DocumentResource`.

### PATCH `/v1/documents/{document}/approve`

Aprova o documento pelo fluxo geral.

Permissoes:

- `admin`
- `manager`
- `area_manager`

Comportamento:

- Seta `status = available`.
- Limpa campos de rejeicao.
- Registra auditoria `status_change`.

Resposta `200`: `DocumentResource`.

### DELETE `/v1/documents/{document}`

Remove o documento e tenta apagar o arquivo no storage.

Permissoes:

- `admin`, `manager`, `area_manager` com visibilidade sobre o usuario dono.
- `employee` apenas se for dono e o documento estiver `pending`.

Resposta:

- `204`: removido.
- `403`: sem permissao.
- `404`: documento nao encontrado.

## Rotas Admin De Revisao

As rotas admin ficam dentro de `/v1/admin/documents`.

Permissoes:

- `admin`
- `manager`
- `area_manager`

### GET `/v1/admin/documents/pending`

Lista documentos com status `pending`.

Query params:

| Campo | Tipo | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `search` | string | Nao | Busca por `title` e `notes`. |
| `category` | string | Nao | Filtra por categoria. |
| `employee_id` | uuid | Nao | Filtra por funcionario, respeitando visibilidade. |
| `per_page` | integer | Nao | De 1 a 100. |
| `page` | integer | Nao | Pagina. |
| `sort` | string | Nao | `updated_at:asc` ou `updated_at:desc`. |

Resposta `200`: collection de `DocumentAdminResource`.

### GET `/v1/admin/documents/review`

Lista documentos com status `review`.

Aceita os mesmos query params de `/v1/admin/documents/pending`.

Resposta `200`: collection de `DocumentAdminResource`.

### GET `/v1/admin/documents/{document}`

Retorna detalhe admin do documento, incluindo funcionario e dados de rejeicao.

Resposta `200`:

```json
{
  "data": {
    "id": "uuid",
    "title": "Contrato - contrato.pdf",
    "category": "personal",
    "status": "review",
    "original_name": "contrato.pdf",
    "size_bytes": 204800,
    "mime_type": "application/pdf",
    "ext": "pdf",
    "storage_disk": "s3",
    "storage_path": "jornafy-documents/{company_uuid}/documents/employees/{employee_uuid}/{ulid}.pdf",
    "employee": {
      "id": "employee_uuid",
      "name": "Nome do funcionario",
      "email": "funcionario@example.com"
    },
    "rejected_comment": "Documento ilegivel",
    "rejected_by": "admin_uuid",
    "rejected_at": "2026-06-04 10:10:00",
    "view_url": "https://api.jornafy.com/api/v1/documents/{document}/view",
    "download_url": "https://api.jornafy.com/api/v1/documents/{document}/download"
  }
}
```

### PATCH `/v1/admin/documents/{document}/approve`

Aprova documento pelo fluxo admin.

Comportamento:

- Seta `status = available`.
- Limpa rejeicao.
- Registra auditorias `status_change` e `approve`.
- Cria notificacao `approved`.

Resposta `200`: `DocumentAdminResource`.

### PATCH `/v1/admin/documents/{document}/reject`

Rejeita documento e envia para revisao do funcionario.

Body JSON:

| Campo | Tipo | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `comment` | string | Sim | Motivo com 5 a 2000 caracteres. |

Exemplo:

```json
{
  "comment": "Documento ilegivel. Envie uma nova copia."
}
```

Comportamento:

- Seta `status = review`.
- Salva `rejected_comment`, `rejected_by` e `rejected_at`.
- Registra auditorias `status_change` e `comment`.
- Cria notificacao `rejected`.

Resposta `200`: `DocumentAdminResource`.

### POST `/v1/admin/documents/upload-for-employee`

Envia um ou mais documentos para um funcionario.

Body `multipart/form-data`:

| Campo | Tipo | Obrigatorio | Descricao |
| --- | --- | --- | --- |
| `user_id` | uuid | Sim | ID do funcionario alvo. |
| `category` | string | Sim | `payroll`, `courses`, `personal` ou `others`. |
| `title` | string | Nao | Ate 180 caracteres. |
| `notes` | string | Nao | Ate 2000 caracteres. |
| `files[]` | file[] | Sim | Um ou mais arquivos validos. |

Exemplo `curl`:

```bash
curl -X POST "$API_BASE/v1/admin/documents/upload-for-employee" \
  -H "Authorization: Bearer $TOKEN" \
  -F "user_id=$EMPLOYEE_ID" \
  -F "category=payroll" \
  -F "title=Holerite" \
  -F "notes=Upload administrativo" \
  -F "files[]=@/caminho/holerite.pdf"
```

Comportamento:

- Valida se o usuario autenticado pode gerenciar o funcionario.
- Salva arquivo no S3 privado.
- Cria documento com `status = pending`.
- Define `uploaded_by` como o admin/gestor autenticado.
- Registra auditoria `admin_upload`.

Resposta `201`: collection de `DocumentAdminResource`.

## Checklist De Diagnostico S3

Se o documento nao aparece no S3:

- Confirme se o request esta usando `files[]` no cadastro e `file` apenas no resend.
- Confirme se o arquivo real passa na validacao de assinatura.
- Confirme se a URL nao esta duplicando `/api`.
- Confirme se `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION` e `AWS_BUCKET` estao definidos.
- Confirme se o IAM permite `s3:PutObject`, `s3:GetObject` e `s3:DeleteObject` no prefixo usado.
- Confirme se o bucket e a regiao batem com `AWS_BUCKET` e `AWS_DEFAULT_REGION`.
- Confira o erro no log Laravel; o disco `s3` esta com `throw=true`, entao falhas de AWS devem gerar excecao.
