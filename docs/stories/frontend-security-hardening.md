# Frontend Security Hardening

## Checklist

- [x] Endurecer persistência de sessão para `memória + sessionStorage`
- [x] Centralizar tratamento de erros HTTP sensíveis (`401`, `403`, `429`, `5xx`)
- [x] Neutralizar mensagens de login/forgot/reset
- [x] Bloquear submits concorrentes em fluxos públicos de auth
- [x] Restringir filtros por `userId` ao escopo já carregado no cliente
- [x] Bloquear renderização sensível em `iframe`
- [x] Adicionar scripts de qualidade mínimos (`lint`, `typecheck`, `test`)

## File List

- `src/lib/authEvents.js`
- `src/lib/authStorage.js`
- `src/lib/security/`
- `src/services/http/api.js`
- `src/store/useAuth.js`
- `src/store/useAffiliateAuth.js`
- `src/pages/Login.jsx`
- `src/pages/ForgotPassword.jsx`
- `src/pages/ResetPassword.jsx`
- `src/pages/AffiliateLogin.jsx`
- `src/pages/AffiliateForgotPassword.jsx`
- `src/pages/AffiliateResetPassword.jsx`
- `src/pages/AdminAdjustments.jsx`
- `src/pages/AdminVacations.jsx`
- `src/pages/SuperAdminCompanyDetails.jsx`
- `src/components/DocumentPreviewModal.jsx`
- `src/App.jsx`
- `src/main.jsx`
- `scripts/lint-security.mjs`
- `tests/security-helpers.test.mjs`
