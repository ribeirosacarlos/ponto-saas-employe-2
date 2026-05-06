# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the `app/` directory.

```bash
npm run dev      # Vite dev server (proxies /api → https://api.jornafy.com)
npm run build    # Production build
npm run preview  # Preview production build locally
```

There are no test or lint scripts configured.

## Architecture

React 19 + Vite SPA for employee time tracking / HR management. The app uses a **custom client-side router** (no React Router) — route config lives in `src/routes/config.js` and resolution in `App.jsx` via `resolvePageFromPath()`. Routes have role guards using `{ anyOf: [...] }` syntax.

### Roles & Access Control

Five roles with inheritance: `employee < area_manager < manager < admin < super_admin`. Role capabilities are derived in `src/auth/acl.js`. Route guards are checked on navigation; component-level guards use `canRenderCard()`. The `AccessProvider` catches forbidden API responses and stores the denial reason globally.

### State Management

- **Zustand** (`src/store/`): `useAuthStore` (token + user + roles, persisted to localStorage) and `useTimezoneStore` (company timezone, default `Europe/Madrid`).
- Feature-level Zustand stores may live inside `src/features/` (e.g. `useAbsenceStore`) for caching + reactive refresh patterns.
- **Context**: `ThemeProvider` (light/dark + system pref), `AccessProvider` (forbidden state), `ToastProvider` (toast queue).

### API & Services

Axios instance in `src/services/http/api.js` — auto-injects `Authorization: Bearer <token>` on all requests except login/logout. API base: `VITE_API_URL` env var, falling back to `https://api.jornafy.com/api`.

Service files follow two patterns:
- `src/services/modules/*.js` — raw API call functions (one function per endpoint)
- `src/services/*Service.js` — domain aggregators that combine calls and normalize responses

Caching is manual: Map-based deduplication (15 s for time entries, 5 min for auth profile). Forbidden errors fire a global event consumed by `AccessProvider`.

### Internationalization

i18next with three locales (`pt-BR`, `en`, `es`) in `src/i18n/locales/`. Browser language detection with localStorage persistence; fallback is `pt-BR`. Use the `useTranslation()` hook throughout — no hardcoded strings.

---

## Design System

### Typography

- **Font**: Plus Jakarta Sans (400/500/600/700), fallback to Inter / system-ui.
- **Base text size for UI controls**: `text-[11px]` — used uniformly on buttons, inputs, labels, table cells, and menu items.
- **Headings**: `text-lg font-semibold tracking-tight` for card titles and dialog titles.
- **Body/description text**: `text-sm text-muted-foreground`.

### Colors (CSS HSL variables)

| Token | Light | Dark |
|---|---|---|
| `--background` | 227 55% 98% | 229 30% 8% |
| `--foreground` | 229 28% 12% | 227 32% 94% |
| `--card` | 227 45% 99% | 229 28% 12% |
| `--primary` | 246 74% 61% (purple-blue) | 246 74% 72% |
| `--secondary` | 227 24% 93% | 229 20% 16% |
| `--muted` | 227 20% 92% | 229 18% 18% |
| `--muted-foreground` | 229 12% 46% | 228 16% 87% |
| `--accent` | 210 68% 94% (light cyan) | 214 38% 22% |
| `--destructive` | 0 74% 60% (red) | 0 73% 66% |
| `--border` | 227 24% 86% | 229 24% 24% |
| `--border-strong` | 227 24% 74% | 229 22% 32% |
| `--input` | 227 32% 96% | 229 22% 16% |
| `--ring` | 246 74% 61% | 246 74% 72% |

Dark mode is toggled by adding the `dark` class to `<html>` (managed by `ThemeProvider`).

### Border Radius

Custom scale overrides Tailwind defaults:

| Class | Value |
|---|---|
| `rounded-sm` | 6px |
| `rounded-md` | 8px |
| `rounded-lg` | 10px |
| `rounded-xl` | 12px |
| `rounded-2xl` | 14px |
| `rounded-3xl` | 18px |

Cards use `rounded-[22px]`, dialogs use `rounded-[24px]` (one-off values beyond the scale).

### Buttons (`src/components/ui/button.jsx`)

All sizes share `h-8` (32px height) and `text-[11px] font-semibold`. Sizes differ only in horizontal padding:

| Size | Classes |
|---|---|
| `sm` / `md` (default) | `h-8 px-2.5` |
| `lg` | `h-8 px-3` |
| `icon` | `h-8 w-8` |

Variants:
- **default** — gradient primary background, lift shadow on hover (`hover:-translate-y-0.5`)
- **outline** — `bg-card/70 border-borderStrong/70`, lifts on hover
- **secondary** — `bg-secondary border-border/70`, lifts on hover
- **ghost** — no border/background, `hover:bg-accent`
- **destructive** — `bg-destructive`, brightens on hover

All buttons translate `active:translate-y-[0.5px]` and use `disabled:opacity-60`.

For action buttons outside the CVA system, use the shared constants from `src/components/ui/form-controls.js`:
- `actionButtonClass` — text button with border (same `h-8 px-2.5 text-[11px]`)
- `actionIconButtonClass` — icon-only square button (`h-8 w-8`)
- `actionTabButtonClass` — tab-style toggle button
- `actionMenuItemClass` — dropdown/menu item (`h-8 px-3 text-[11px]`)

### Inputs & Form Controls (`src/components/ui/form-controls.js`)

Shared constants used by `Input`, `Textarea`, `Select`, and composite field shells:

- **All inputs**: `h-8` (32px), `rounded-md`, `border border-border/80`, `bg-background/80`, `px-2.5 py-1.5`, `text-[11px]`, `backdrop-blur-md`
- **Focus ring**: `focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2`
- **Textarea**: same as input but no fixed height; `py-2` vertical padding
- **Field shell** (composite inputs with icons): `fieldShellClass` — wraps children in the same height/border/bg as a regular input

### Cards (`src/components/ui/card.jsx`)

```
rounded-[22px] border border-border/70 bg-card/75
shadow-[0_18px_60px_-35px_rgba(92,134,255,0.20)] backdrop-blur-xl
```

Internal spacing:
- `CardHeader`: `px-6 pt-5 pb-3`
- `CardContent`: `px-6 pb-6 pt-2`
- `CardTitle`: `text-lg font-semibold tracking-tight`

### Dialogs (`src/components/ui/dialog.jsx`)

```
w-[95vw] max-w-xl rounded-[24px] border border-border/70
bg-card/85 p-7 backdrop-blur-xl
shadow-[0_32px_90px_-40px_rgba(92,134,255,0.55)]
```

Overlay: `bg-black/60 backdrop-blur-md`. Close button: `rounded-full p-1` at `absolute right-4 top-4`.

### Shadows

The project uses directional box-shadow with large blur and negative spread to create soft depth:
- Buttons (default): `shadow-[0_18px_50px_-25px_rgba(62,82,152,0.9)]`
- Cards: `shadow-[0_18px_60px_-35px_rgba(92,134,255,0.20)]`
- Dialogs: `shadow-[0_32px_90px_-40px_rgba(92,134,255,0.55)]`
- Inputs: `shadow-[0_12px_35px_-25px_rgba(92,134,255,0.7)]`

### Utility

```js
import { cn } from '../../lib/utils'  // clsx + tailwind-merge
```

Always use `cn()` when combining conditional classes. Never concatenate Tailwind strings directly.
