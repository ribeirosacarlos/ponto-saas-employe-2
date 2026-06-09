# Main Updates - 2026-06-08

Este documento registra apenas as mudancas publicadas na branch `main` em `2026-06-08`, com base nos commits do dia e no estado final do codigo apos os merges.

## Commits considerados

| Horario (-03:00) | Commit | Resumo |
|---|---|---|
| 10:57 | `274f92b` | Ajustes de traducoes e detalhes do upload de documentos |
| 10:58 | `c02b02e` | Refactor do tratamento de horas extras no fechamento de folha |
| 11:01 | `d757e6a` | Atualizacao de `en.js` |
| 11:02 | `d67492d` | Atualizacao de `es.js` |
| 11:03 | `da0b569` | Inclusao de locale de idioma e pais nas configuracoes |
| 15:29 | `a932229` | Ajuste de fluxo em `AdminVacations` |
| 15:30 | `2276578` | Definicao do endpoint real de criacao de ausencia |
| 15:58 | `af5e699` | Atualizacao do workflow de deploy AWS |
| 16:15 | `5dd2e2e` | Simplificacao final do envio de ausencia em `AdminVacations` |

## 1. Ausencias administrativas

Arquivos de referencia:

- `src/services/absencesService.js`
- `src/pages/AdminVacations.jsx`

### Estado atual documentado

- A criacao de ausencia administrativa usa `POST /v1/admin/absences`.
- O frontend nao cria mais ausencias mockadas quando o endpoint nao esta configurado.
- O fluxo de `AdminVacations` envia a ausencia diretamente para o backend apos validar os campos do formulario.
- A verificacao previa de presenca no mesmo dia deixou de bloquear o submit dessa acao.

### Impacto pratico

- Ambientes com backend configurado passam a persistir a ausencia real imediatamente.
- Erros de criacao passam a depender da resposta do backend, sem fallback local.
- O comportamento esperado da tela de administracao e: validar formulario, enviar, atualizar lista do colaborador e exibir feedback de sucesso/erro.

## 2. Fechamento de folha e horas extras

Arquivo de referencia:

- `src/pages/area-manager/CloseTimesheetPage.tsx`

### Estado atual documentado

- A tela passou a tratar horas extras com um tipo interno unico (`hhmm` e `minutes`).
- O resumo individual exibe dois indicadores distintos:
  - saldo total de horas extras do colaborador
  - saldo de horas extras apenas no periodo filtrado
- Para cada colaborador filtrado, o frontend busca dois saldos:
  - saldo total via `getTeamOvertimeBalance(empId, { isAdmin })`
  - saldo do periodo via `getTeamOvertimeBalance(empId, { from, to, isAdmin })`
- O parsing aceita tanto `totals.balanceHhmm` quanto `totals.balance_hhmm`.

### Impacto pratico

- O card de resumo deixa explicito o saldo acumulado geral e o saldo restrito ao intervalo consultado.
- O frontend fica mais tolerante a variacoes de nomenclatura no payload retornado pelo backend.

## 3. Locale, navegacao e traducoes

Arquivos de referencia:

- `src/i18n/locales/pt-BR.js`
- `src/i18n/locales/en.js`
- `src/i18n/locales/es.js`

### Estado atual documentado

- Foram adicionados textos para a secao de configuracao de idioma e pais da empresa (`settingsLocale`).
- Foi incluida a chave de resumo `closeTimesheetPage.summary.periodOvertime`, usada pelo novo card de horas extras do periodo.
- O pacote de traducoes do dia tambem consolidou textos de navegacao e removeu chaves que nao estavam mais em uso em alguns arquivos de locale.

### Observacao

- As mudancas do dia nessa area sao principalmente de copy e cobertura de i18n. Nao definem, por si so, um novo contrato de API.

## 4. Workflow de deploy AWS

Arquivo de referencia:

- `.github/workflows/deploy-vite-aws.yml`

### Estado atual documentado

- O workflow continua reagindo a `push` na branch `main`.
- O workflow continua com execucao agendada via `schedule` (`30 23 * * *` no cron do GitHub Actions).
- O workflow agora aceita execucao manual por `workflow_dispatch`.
- Na execucao manual existe o input `force_deploy` com opcoes `"false"` e `"true"`.
- Quando `force_deploy=true`, o job `gate` libera o deploy imediatamente, sem depender da janela horaria.
- Em `push` comum, o deploy so e liberado se a hora em `America/Sao_Paulo` estiver entre:
  - `00:00` e `12:00`
  - `20:30` e `23:59`
- Fora dessa janela, o `gate` bloqueia a etapa `deploy`.

### Fluxo resumido

1. `gate` decide se o deploy pode rodar.
2. `deploy` executa `npm ci`.
3. `deploy` executa `npm run build`.
4. Os assets de `dist/` sao enviados para S3.
5. `index.html` e publicado com `no-cache`.
6. O workflow invalida o CloudFront ao final.

## 5. Leitura consolidada do dia

As mudancas publicadas na `main` em `2026-06-08` reforcam quatro comportamentos operacionais:

- ausencia administrativa agora depende do endpoint real `/v1/admin/absences`
- fechamento de folha mostra saldo total e saldo por periodo
- a base de traducoes ganhou suporte para locale de idioma/pais e textos do novo resumo
- o deploy AWS ganhou acionamento manual com opcao de bypass controlado da janela horaria
