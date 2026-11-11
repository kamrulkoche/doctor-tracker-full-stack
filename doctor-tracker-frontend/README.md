# Doctor Tracker — Frontend

Next.js client for Doctor Tracker, an admin application for managing doctors, the patients
assigned to them, and dashboard analytics. It also serves a public marketing site.

This app contains no business logic and never touches the database. All data comes from the
separate Express REST API (`doctor-tracker-backend`).

---

## Contents

1. [Tech stack](#1-tech-stack)
2. [Prerequisites](#2-prerequisites)
3. [Quick start](#3-quick-start)
4. [Environment variables](#4-environment-variables)
5. [npm scripts](#5-npm-scripts)
6. [Routes](#6-routes)
7. [Project structure](#7-project-structure)
8. [Data fetching and state](#8-data-fetching-and-state)
9. [Authentication](#9-authentication)
10. [UI and design system](#10-ui-and-design-system)
11. [Testing](#11-testing)
12. [Screenshots](#12-screenshots)
13. [Deployment (Vercel)](#13-deployment-vercel)
14. [Known limitations](#14-known-limitations)
15. [Troubleshooting](#15-troubleshooting)

---

## 1. Tech stack

| Concern | Choice |
|---|---|
| Framework | Next.js 16.4 (App Router, Turbopack, `cacheComponents`, `partialPrefetching`) |
| UI | React 19.3, TypeScript (strict) |
| Styling | Tailwind CSS 4.3 (CSS-first config), shadcn/ui (`radix-nova` style) on Radix UI, `lucide-react` icons |
| Server state | TanStack Query 5 |
| HTTP | Axios (one instance, credentials included, CSRF handling) |
| Forms | React Hook Form + Zod 4 (`@hookform/resolvers`) |
| Charts | Recharts 3 (lazy-loaded on the dashboard only) |
| Other | `next-themes` (light/dark/system), `sonner` toasts, `cmdk`, `react-day-picker`, `date-fns` |
| Fonts | IBM Plex Sans / IBM Plex Mono via `next/font` |
| Tests | Vitest (unit), Playwright (end-to-end, Chromium) |
| Quality | ESLint (`eslint-config-next`), Prettier |

> **Next.js 16 note:** this version changes APIs and conventions compared with older Next.js
> releases. Read the relevant guide in `node_modules/next/dist/docs/` before changing routing,
> caching or config. See `AGENTS.md`.

## 2. Prerequisites

- Node.js 20+ (developed on Node 24) and npm.
- The backend running on `http://localhost:5000` with an admin account seeded. See the backend
  README.

## 3. Quick start

```bash
cp .env.example .env.local      # PowerShell: Copy-Item .env.example .env.local
npm install
npm run dev
```

Open **exactly** `http://localhost:3000`. The API's CORS allowlist compares origins exactly,
so `http://127.0.0.1:3000` is rejected and the session cookie is not sent. Sign in at `/login`
with the `ADMIN_EMAIL` / `ADMIN_PASSWORD` that the backend's `seed:admin` created.

## 4. Environment variables

`.env.example` is the committed template. Copy it to `.env.local`, which is git-ignored.

| Variable | Used by | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | build + browser | API base URL **including** `/api`. Default in code: `http://localhost:5000/api`. It is compiled into the client bundle, so restart the dev server or rebuild after changing it. |
| `API_PROXY_TARGET` | `next.config.ts` (server) | Optional same-origin mode. Set it to the backend **origin** (no `/api`, no trailing slash) and set `NEXT_PUBLIC_API_URL=/api`. Next.js then rewrites `/api/:path*` to `${API_PROXY_TARGET}/api/:path*`, which makes the cookies first-party. It is a pure rewrite with no route handlers and no logic. |
| `E2E_BASE_URL` | Playwright, screenshot script | Default `http://localhost:3000` |
| `E2E_API_URL` | Playwright, screenshot script | Default `http://localhost:5000/api` |
| `E2E_ADMIN_EMAIL` / `E2E_ADMIN_PASSWORD` | Playwright, screenshot script | Default `admin@doctortracker.dev` / `Admin@12345` (local demo only) |

Never put secrets here. Anything prefixed `NEXT_PUBLIC_` is public by design.

## 5. npm scripts

| Script | What it does |
|---|---|
| `dev` | Next.js dev server on port 3000 |
| `build` | Production build |
| `start` | Serve the production build |
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint .` |
| `test` / `test:watch` | Vitest unit tests |
| `e2e` | `playwright test`. Needs the app and the API already running. |
| `screenshots` | `node scripts/screenshots.mjs`. Needs the app, the API and demo data. |
| `format` | `prettier --write .` |

Before a pull request:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## 6. Routes

### Public marketing site — `src/app/(marketing)`

| Route | Content |
|---|---|
| `/` | Home page |
| `/features`, `/how-it-works`, `/about`, `/faq` | Product pages |
| `/contact` | Contact form. **Demo only:** it validates and shows a success state, but sends nothing. |
| `/privacy`, `/terms` | Legal pages |

The content lives in `src/features/marketing/content/*.ts`.

### Authentication — `src/app/(auth)`

| Route | Content |
|---|---|
| `/login` | Email and password form (RHF + Zod) with show/hide password and inline messages for `INVALID_CREDENTIALS` and `RATE_LIMITED`. Honours `?next=<path>`. Redirects to `/dashboard` when the user is already signed in. |

### Admin app — `src/app/(dashboard)` (signed-in admins only)

| Route | Content |
|---|---|
| `/dashboard` | 4 stat cards, a date range (presets or custom, kept in the URL), patient growth (day/week/month), patients per doctor, condition distribution, doctors over time, specialization distribution, recent doctors and patients, top doctors, and quick actions |
| `/doctors` | Search, specialization/hospital/date filters, sort, pagination, add/edit/delete, and "add patient" from a row |
| `/doctors/[id]` | Profile and contact details, patient count, and that doctor's patients (search, condition filter, sort, pagination) with full CRUD |
| `/patients` | Search, condition/doctor/gender/date filters, sort, pagination, add/edit/reassign/delete. Honours `?doctorId=` and `?condition=`. |
| `/patients/[id]` | All fields, notes, an assigned-doctor card, edit/reassign/delete |
| `/settings` | Profile (from `/auth/me`), theme preference, sign out |

Any other path shows a 404 page. Under `(dashboard)` the 404 renders inside the app shell.

## 7. Project structure

```
doctor-tracker-frontend/
  .env.example  next.config.ts  playwright.config.ts  vitest.config.mts  components.json
  docs/screenshots/            real captures (desktop, mobile, public pages)
  e2e/                         Playwright: auth.setup, fixtures, helpers, *.spec.ts
  scripts/screenshots.mjs
  src/
    app/                       routes only: (marketing) (auth) (dashboard), layout, error, not-found
    components/
      ui/                      shadcn primitives
      layout/                  dashboard shell, sidebar, header, breadcrumbs, page header, theme switcher, user menu
      tables/                  generic DataTable, row actions, cells
      forms/                   FormField, SuggestionInput
      charts/                  widget card, area/bar/horizontal-bar/donut charts, lazy wrappers
      shared/                  stat card, search, filters, date range picker, pagination, dialogs,
                               skeletons, empty/error/not-found states, avatar, badges
      providers.tsx
    features/
      auth/  doctors/  patients/  dashboard/  marketing/
                               each: schemas, hooks (queries + mutations), components / views
    services/                  api-client.ts + auth/doctor/patient/dashboard API modules
    hooks/                     debounce, URL filters, list controls, dialog state, media query, document title
    lib/                       api-error, form-errors, url-filters, format, query-keys, query-client,
                               cache-invalidation, badge, utils
    types/                     api.ts (envelopes, errors), models.ts
    constants/
```

Dependencies flow one way: `app → features → components / hooks / services / lib → types`.

- `services/*` is the only code that knows URLs.
- `features/*/hooks` is the only code that calls services.
- Views get data from those hooks and pass plain props to presentational components.

## 8. Data fetching and state

| State | Owner |
|---|---|
| Server data | TanStack Query cache |
| List view state (page, limit, search, sort, date range, filters) | URL query string |
| Dialogs, unsaved forms | Local component state |

There is no app-wide state context.

**API client** (`services/api-client.ts`):
- Uses `withCredentials` and takes its base URL from the env.
- Unwraps the `{ success, data, pagination }` envelope.
- Turns every failure into a typed `ApiError { code, status, message, details }`.
- Fetches the CSRF token lazily before the first unsafe request (de-duplicated) and keeps it in
  memory. It sends the token as `X-CSRF-Token`. On `403 CSRF_TOKEN_INVALID` it refetches the
  token and retries exactly once.

**Caching** (`lib/query-client.ts`, `lib/query-keys.ts`):
- `staleTime`: lists and details 30 s; dashboard 60 s; filters, options and session 5 min.
- No refetch on window focus.
- Queries retry once, and only for network or 5xx errors. Mutations never retry.
- Paginated and range-driven queries keep the previous data on screen, dimmed, instead of
  flashing skeletons. A superseded request is aborted.

**Mutations** invalidate only the queries they affect (`lib/cache-invalidation.ts`). For
example, reassigning a patient refreshes:
- patient lists,
- both doctors' details and patient lists,
- doctor lists (`patientCount`),
- the dashboard.

**Errors**:
- `VALIDATION_ERROR` and `DUPLICATE_EMAIL` `details[].path` are mapped onto the matching form
  field, and the first one gets focus.
- `DOCTOR_HAS_PATIENTS` is explained in the delete dialog, with a link to that doctor's patients.
- Other errors show an inline alert and a toast.

**URL state** (`lib/url-filters.ts`, `hooks/use-url-filters.ts`, `hooks/use-list-controls.ts`):
- The URL is parsed against allow-lists, so a hand-edited URL can never produce a request the API
  rejects.
- Discrete changes push a history entry, so Back restores the previous filters. Typing in search
  replaces the current entry.
- Search is debounced by 300 ms.
- Any change other than paging resets to page 1.
- Default values are omitted from the URL.

**Re-render control**:
- Tables, filters, charts, widgets and the shell are `memo`ized.
- Callbacks and column definitions are stable.
- Search keystrokes stay local until debounced.
- Each dashboard widget subscribes to its own query.
- Recharts is split into `next/dynamic` chunks that load only on the dashboard.

## 9. Authentication

The session is an HTTP-only cookie (`dt_access`) on the **API origin**. In production the
frontend and the API are on different sites, so Next.js never receives that cookie on the
server. The route guard is therefore client-side:

- `(dashboard)/layout.tsx` renders `DashboardLayout`, which resolves `GET /auth/me` through
  TanStack Query:

  | Result | What the user sees |
  |---|---|
  | Pending | App-shell skeleton |
  | `401` | Full navigation to `/login?next=<path+query>` |
  | Network or 5xx error | Full-screen error with a retry button |
  | Signed-in user | The page |

- Any `401 UNAUTHENTICATED` from a data request clears the cached user, which triggers the same
  redirect.
- `?next=` accepts only same-origin relative paths (`safeNextPath`).
- Sign-in, sign-out and session expiry use full document navigations. This makes sure no hidden,
  still-mounted screen keeps a typed password or the previous user's data, and it drops the
  in-memory CSRF token.

This guard is a UX gate, not a security boundary. Protected pages contain no data in their HTML.
The API enforces authentication and authorization on every request.

## 10. UI and design system

- Tokens, typography, spacing, radii, badge tints, chart rules and page blueprints follow
  `documentation/DESIGN_SYSTEM.md` in the project workspace. They are implemented in
  `src/app/globals.css` and the shadcn primitives under `components/ui/`.
- Light, dark and system themes are supported (`next-themes`). The sidebar collapse state is
  stored in `localStorage` under `dt:sidebar`.
- **Responsive behaviour**:
  - Phones get a drawer for navigation.
  - Below `md`, tables become stacked cards with a sort selector.
  - On phones, filters move into a bottom sheet with a count badge, and form dialogs become
    bottom sheets.
  - There is no horizontal page scroll at any viewport.
- **Accessibility**: sortable headers expose `aria-sort`, and loading regions use `aria-busy`.
  Keyboard shortcuts: `/` focuses search and `Esc` clears it.
- **Dates** are formatted in UTC by hand (e.g. `12 Sep 2026`) so server and client output
  match.
- `DataTable` is hand-written rather than TanStack Table. Sorting, filtering and paging all
  happen on the server, so a typed column model was simpler.

## 11. Testing

**Unit (Vitest)**, `npm test`: covers form schemas, API error normalisation, URL filter parsing
and serialisation, formatting and badge tinting (`src/**/*.test.ts`).

**End-to-end (Playwright)**, `npm run e2e`:

1. Start the backend with demo data:
   `npm run seed:admin && npm run seed:demo && npm run dev` in `doctor-tracker-backend/`.
2. Start the frontend: `npm run dev`, or `npm run build && npm start` to test production.
3. Install Playwright's browser once: `npx playwright install chromium`.
4. Run `npm run e2e`.

How the suite runs:

- **Projects**: `setup` signs in once through the real form and saves the session. The tests then
  run at three viewports: `desktop` 1440×900, `tablet` 820×1180 and `mobile` 390×844.
- The suite runs with one worker, so the shared database and the login rate limit stay
  predictable.
- Tests create records prefixed `E2E ` and delete them afterwards. The setup step also removes
  leftovers from interrupted runs.
- 3 tests are skipped on purpose: invalid-credentials runs on desktop only (the API allows 10
  failed logins per 15 minutes), and sidebar persistence does not apply to the mobile drawer.

The suite covers:
- the auth redirect with `next`, invalid login, logout;
- the dashboard widgets;
- doctor CRUD, including the duplicate-email field error and the blocked delete;
- patients created under a doctor, then reassigned and deleted;
- URL-driven pagination and filters, including reload and Back;
- 404s and navigation;
- theme persistence;
- on every main page, no console errors, no horizontal overflow and a correct `<title>`.

## 12. Screenshots

`npm run screenshots` writes real captures of the running app to `docs/screenshots/`:

| Folder | Contents |
|---|---|
| `desktop/` | 1440×900: login, dashboard, doctors, add-doctor dialog, doctor detail, patients, edit-patient dialog, patient detail, dashboard (dark) |
| `mobile/` | 390×844 @2x: the same 9 screens |
| `public/` | Marketing pages: desktop, tablet, mobile, light and dark |

The dialog screenshots show the real forms open. The script never submits anything.

## 13. Deployment (Vercel)

1. Import the repository in Vercel. The framework preset (Next.js) is detected automatically;
   keep the default build settings.
2. Production environment variable: `NEXT_PUBLIC_API_URL=https://<render-host>/api`. It must be
   HTTPS, with no trailing slash.
3. Deploy, then set the backend's `FRONTEND_URL` to the exact Vercel origin
   (`https://<vercel-host>`) and redeploy the backend.
4. Use the stable production domain, not a per-deployment URL. Preview deployments are not on
   the backend allowlist, so their API calls are rejected unless you add their origins to
   `FRONTEND_URL`.

`NEXT_PUBLIC_*` values are baked in at build time. After changing one, redeploy.

### Browsers that block third-party cookies

Safari, Firefox in strict or private mode, and incognito windows can block the API's cookies
because they belong to another site. The symptom is a login that succeeds and is followed by a
`401`. There are two fixes:

- **Same-origin mode, no custom domain needed.** On Vercel, set
  `API_PROXY_TARGET=https://<render-host>` and `NEXT_PUBLIC_API_URL=/api`, then redeploy. The
  browser now calls `/api` on the frontend origin. The cost is an extra hop through Vercel for
  every API call.
- **Shared parent domain.** Serve the app at `app.example.com` and the API at
  `api.example.com`. On the backend, set `COOKIE_DOMAIN=.example.com`.

The full guide, with a verification checklist, is `documentation/DEPLOYMENT.md` in the project
workspace.

## 14. Known limitations

- An unauthenticated visitor sees a skeleton for one `/auth/me` request before the redirect. The
  guard runs on the client.
- On phones, the dashboard reorders cards with CSS `order`, so keyboard order follows the desktop
  DOM order.
- There is no multi-column sort. The mobile sort control offers one column ascending or
  descending.
- Suggestion inputs use the native `<datalist>`, styled by the browser.
- The marketing contact form does not send anything.
- Only Chromium is covered by automated tests. No automated axe or Lighthouse audits have been
  run.

## 15. Troubleshooting

| Symptom | Fix |
|---|---|
| CORS error in the console | Open `http://localhost:3000` (not `127.0.0.1`), and check that the backend's `FRONTEND_URL` matches. |
| Login `200`, then sent back to `/login` | The page and API host names differ (`127.0.0.1` vs `localhost`), or third-party cookies are blocked in production (see section 13). |
| `403 CSRF_TOKEN_INVALID` on every save | The `dt_csrf` cookie is not reaching the API. Same causes as the row above. |
| Changed `NEXT_PUBLIC_API_URL` has no effect | Restart `npm run dev`, or rebuild. |
| Production build calls `http://localhost:5000` | `NEXT_PUBLIC_API_URL` was not set when the build ran. Set it and redeploy. |
| Hydration warning mentioning `cz-shortcut-listen` or similar on `<body>` | A browser extension (e.g. ColorZilla) injected the attribute. It is suppressed on `<html>` and `<body>` and is harmless. |
| `npm run e2e` fails at `setup` | The API is not running, there is no admin, or `E2E_ADMIN_*` does not match the seeded admin. |
