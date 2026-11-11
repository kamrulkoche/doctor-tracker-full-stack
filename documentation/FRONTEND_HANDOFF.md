# Doctor Tracker — Frontend Handoff

Owner: Frontend Agent. Scope: `doctor-tracker-frontend/` only. Built against `API_CONTRACT.md` v1 and
`DESIGN_SYSTEM.md`, and verified end-to-end against the live backend on `http://localhost:5000`
(24 doctors / 260 patients demo seed) on 2026-11-11.

## 1. Installed versions (from `package-lock.json`)

| Package | Version | | Package | Version |
|---|---|---|---|---|
| next (App Router, Turbopack, `cacheComponents` + `partialPrefetching`) | 16.4.6 | | @tanstack/react-query | 5.107.1 |
| react / react-dom | 19.3.0 | | axios | 1.21.1 |
| typescript (strict) | 5.9.3 | | react-hook-form | 7.91.0 |
| tailwindcss (+ `@tailwindcss/turbopack` loader, CSS-first config) | 4.3.3 | | zod / @hookform/resolvers | 4.6.7 / 7.0.5 |
| shadcn CLI (style `radix-nova`) / radix-ui | 4.23.0 / 1.8.1 | | recharts | 3.8.0 |
| lucide-react | 1.71.0 | | next-themes | 0.4.6 |
| cmdk / react-day-picker / date-fns | 1.1.1 / 10.0.2 / 4.4.0 | | sonner | 2.0.8 |
| vitest | 5.1.0 | | @playwright/test (Chromium build 1254) | 1.65.0 |
| eslint / eslint-config-next | 9.39.5 / 16.4.6 | | prettier | 3.9.10 |

Node v24.14.1, npm 11. `@types/node` was raised to `^24` (vitest 5 peer requirement).

## 2. Folder tree

```
doctor-tracker-frontend/
  .env.example            next.config.ts (optional /api rewrite)   playwright.config.ts   vitest.config.mts
  docs/screenshots/{desktop,mobile}/01..09-*.png      # real captures, see §11
  e2e/        auth.setup.ts  fixtures.ts  helpers.ts  auth.spec.ts  doctors.spec.ts  patients.spec.ts  shell.spec.ts
  scripts/    screenshots.mjs
  src/
    app/
      layout.tsx  globals.css  icon.svg  page.tsx (redirect -> /dashboard)  error.tsx  not-found.tsx
      (auth)/login/page.tsx
      (dashboard)/layout.tsx        # Suspense + DashboardLayout (auth guard + shell)
      (dashboard)/error.tsx  not-found.tsx
      (dashboard)/dashboard/page.tsx  doctors/page.tsx  doctors/[id]/page.tsx
      (dashboard)/patients/page.tsx   patients/[id]/page.tsx  settings/page.tsx
    components/
      ui/        shadcn primitives (27 files; edits listed in §9)
      layout/    dashboard-layout  sidebar  header  breadcrumbs  page-header  theme-switcher  user-menu  nav-items
      tables/    data-table  row-actions-menu  cells
      forms/     form-field  suggestion-input
      charts/    widget-card  time-series-area-chart  time-series-bar-chart  horizontal-bar-chart  donut-chart
                 chart-primitives  lazy (next/dynamic wrappers)
      shared/    stat-card  search-input  filter-dropdown  filter-bar (+FilterChips)  date-range-picker  pagination
                 confirmation-dialog  form-dialog  loading-skeleton  empty-state  error-state  not-found-state
                 detail-list  entity-avatar  tag-badge
      providers.tsx
    features/
      auth/       schemas.ts  session.ts  hooks/use-auth.ts  components/{login-view,settings-view}
      doctors/    schemas.ts  hooks/{use-doctor-queries,use-doctor-mutations}
                  components/{doctors-view,doctor-detail-view,doctor-columns,doctor-form-dialog,delete-doctor-dialog,doctor-combobox}
      patients/   schemas.ts  hooks/{use-patient-queries,use-patient-mutations}
                  components/{patients-view,patient-detail-view,patient-columns,patient-form-dialog,
                              reassign-doctor-dialog,delete-patient-dialog,patient-action-dialogs}
      dashboard/  range.ts  hooks/use-dashboard.ts  components/{dashboard-view,stats-grid,chart-widgets,activity-widgets}
    services/   api-client.ts  auth-api.ts  doctor-api.ts  patient-api.ts  dashboard-api.ts
    hooks/      use-debounce  use-url-filters  use-list-controls  use-dialog-state  use-media-query  use-mobile  use-document-title
    lib/        api-error  form-errors  url-filters  format  badge  query-keys  query-client  cache-invalidation  sidebar-store  utils
    types/      api.ts  models.ts          constants/  app.ts
```

Dependency direction: `app -> features -> components / hooks / services / lib -> types`. `services/*` is the only
place that knows URLs; `features/*/hooks` is the only place that calls services; view components get data
from those hooks and pass plain props to presentational components. (One deliberate exception:
`components/layout/breadcrumbs.tsx` reads `useDoctor` / `usePatient` to show the record name; it reuses the
page's cache entry, no extra request.)

## 3. npm scripts

| Script | Does |
|---|---|
| `dev` / `build` / `start` | Next.js dev server, production build, production server (port 3000) |
| `typecheck` | `tsc --noEmit` |
| `lint` | `eslint .` |
| `test` / `test:watch` | Vitest unit tests |
| `e2e` | `playwright test` (needs app + API running) |
| `screenshots` | `node scripts/screenshots.mjs` (needs app + API running, demo data seeded) |
| `format` | `prettier --write .` |

## 4. Environment variables

| Var | Where | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | build + browser | API base incl. `/api`. Default in code: `http://localhost:5000/api`. |
| `API_PROXY_TARGET` | `next.config.ts` (server) | Optional. Backend **origin**. Adds a pure rewrite `/api/:path*` -> `${API_PROXY_TARGET}/api/:path*`; then set `NEXT_PUBLIC_API_URL=/api` for first-party cookies. No route handlers, no logic. |
| `E2E_BASE_URL`, `E2E_API_URL`, `E2E_ADMIN_EMAIL`, `E2E_ADMIN_PASSWORD` | Playwright + screenshot script | Defaults: `http://localhost:3000`, `http://localhost:5000/api`, demo admin. |

`.env.example` is committed-ready; `.env.local` (git-ignored) is a copy of it. **The app must be opened at
exactly `http://localhost:3000`** locally (the API's CORS allowlist is exact; `127.0.0.1` is rejected).

## 5. Routes

| Route | Rendering | Content |
|---|---|---|
| `/` | static | redirect to `/dashboard` |
| `/login` | static shell, client form | RHF + Zod, show/hide password, inline `INVALID_CREDENTIALS` / `RATE_LIMITED` messages, `?next=` |
| `/dashboard` | static shell, client data | 4 stat cards, date range (presets + custom) in the URL, 5 charts, 3 lists, quick actions |
| `/doctors` | static shell, client data | search, specialization/hospital/date filters, sort, pagination, add/edit/delete, add patient |
| `/doctors/[id]` | partial prerender | profile, contact, patient count, that doctor's patients (search, condition, sort, pagination), CRUD |
| `/patients` | static shell, client data | search, condition/doctor/gender/date filters, sort, pagination, add/edit/reassign/delete; honours `?doctorId=` and `?condition=` |
| `/patients/[id]` | partial prerender | all fields, notes, assigned doctor card, edit/reassign/delete |
| `/settings` | static shell | profile from `/auth/me`, theme preference, sign out |
| anything else | static | 404 (in the shell under `(dashboard)`, standalone otherwise) |

Every page exports `metadata` (`"Doctors · Doctor Tracker"`); detail pages replace the tab title with the
record's name once loaded. `src/app/icon.svg` is the favicon.

## 6. Reusable component inventory (and where each is reused)

| Component | File | Used by |
|---|---|---|
| DashboardLayout (guard + shell), Sidebar, Header, Breadcrumbs, ThemeSwitcher, UserMenu | `components/layout/*` | `(dashboard)/layout.tsx`; ThemeSwitcher also on login + its options in Settings |
| PageHeader | `layout/page-header.tsx` | dashboard, doctors, patients, settings |
| StatCard (+ skeleton) | `shared/stat-card.tsx` | dashboard stats grid (x4) |
| DataTable (generic `<TRow, TSort>`, typed columns, sortable headers with `aria-sort`, skeleton/empty/error states, stacked-card variant + sort select below `md`) | `tables/data-table.tsx` | doctors list, patients list, doctor's patients |
| RowActionsMenu, IdentityCell/DateCell/TextCell | `tables/*` | all three tables, both detail headers (mobile) |
| SearchInput (debounced 300 ms, `/` shortcut, Esc to clear) | `shared/search-input.tsx` | doctors, patients, doctor's patients |
| FilterDropdown | `shared/filter-dropdown.tsx` | specialization, hospital, condition (x2), gender |
| FilterBar (inline on `md+`, bottom sheet with count badge on phones) + FilterChips | `shared/filter-bar.tsx` | doctors, patients, doctor's patients |
| DateRangePicker (popover + calendar, optional presets) | `shared/date-range-picker.tsx` | doctors, patients, dashboard |
| Pagination (range text, page-size select, first/prev/next/last) | `shared/pagination.tsx` | all three tables |
| ConfirmationDialog | `shared/confirmation-dialog.tsx` | delete doctor, delete patient, "Discard changes?" |
| FormDialog (dialog on `sm+`, bottom sheet on phones, pending/dirty guards, inline form error) | `shared/form-dialog.tsx` | doctor form, patient form, reassign dialog |
| FormField, SuggestionInput | `forms/*` | login, doctor form, patient form, reassign |
| LoadingSkeleton family (table rows, chart, list rows, detail, page, app shell) | `shared/loading-skeleton.tsx` | everywhere something loads |
| EmptyState, ErrorState, NotFoundState | `shared/*` | tables, widgets, detail pages, guard, error/not-found routes |
| WidgetCard + WidgetState | `charts/widget-card.tsx` | all 9 dashboard widgets |
| TimeSeriesAreaChart, TimeSeriesBarChart, HorizontalBarChart (x3 uses), DonutChart | `charts/*` | dashboard (lazy via `charts/lazy.tsx`) |
| EntityAvatar, TagBadge (deterministic tint), DetailList | `shared/*` | tables, lists, detail pages, header, settings |
| DoctorCombobox (async, debounced, `GET /doctors/options`) | `features/doctors/components` | patient form, reassign dialog, patients filter |
| Toasts | sonner via `components/ui/sonner.tsx` + `providers.tsx` | mutations (bottom-right desktop, top-centre mobile) |

## 7. Data fetching, caching, invalidation

- One axios instance (`services/api-client.ts`): `withCredentials`, base URL from env, typed helpers that unwrap
  the `{ success, data, pagination }` envelope. CSRF: token kept in memory, fetched lazily (de-duplicated)
  before the first unsafe request, sent as `X-CSRF-Token`; on `403 CSRF_TOKEN_INVALID` the token is refetched
  and the request replayed exactly once. Every failure is normalised to a typed `ApiError { code, status, message, details }`.
- All server state is TanStack Query v5, only through hooks in `features/*/hooks`. Central key factory in
  `lib/query-keys.ts` (hierarchical: `["doctors","detail",id,"patients",query]` sits under `detail(id)`).
- Defaults (`lib/query-client.ts`): lists/details `staleTime` 30 s, dashboard 60 s, filters/options/session 5 min,
  `gcTime` 5 min, no refetch on focus, retry once for network/5xx only (4xx are final), mutations never retried.
- Paginated lists and range-driven dashboard queries use `placeholderData: keepPreviousData`: the old rows stay
  on screen dimmed (`opacity-60`, `aria-busy`) instead of flashing skeletons. Requests take the query `signal`,
  so superseded searches are aborted.
- Dashboard: one query per endpoint, so every widget loads / fails / retries independently.
  `doctor-statistics` feeds two widgets and `recent-activity` three, each with a single request.
- Mutations (`use-*-mutations.ts`) own cache effects + success toast; forms own error display. Invalidation is
  targeted (`lib/cache-invalidation.ts`) and not awaited, so dialogs close immediately:

| Mutation | Cache writes | Invalidates |
|---|---|---|
| create doctor | `setQueryData(detail)` | doctor lists, doctor filters, doctor options, dashboard |
| update doctor | `setQueryData(detail)` | the above + that doctor's detail/patients, patient lists + patient details (embedded doctor fields) |
| delete doctor | `removeQueries(detail)` | doctor lists, filters, options, dashboard |
| create / update / reassign / delete patient | `setQueryData` or `removeQueries(patient detail)` | patient lists, patient filters, doctor lists (`patientCount`), `detail(id)` of every affected doctor (old **and** new on reassign; covers their patient pages), dashboard |

- Errors: `VALIDATION_ERROR` / `DUPLICATE_EMAIL` `details[].path` are mapped onto RHF fields with `setError`
  (first one focused); anything else shows an inline alert in the form plus a toast; deletes use a toast.
  `409 DOCTOR_HAS_PATIENTS` is explained inside the delete dialog (count, "reassign or remove first", link to
  `/patients?doctorId=…`); it is also shown up front when the cached `patientCount` is already > 0.
- `401 UNAUTHENTICATED` from a non-auth request sets the cached user to `null`; the guard then unmounts the
  pages, removes their cached queries and navigates to `/login?next=<path+query>`.

## 8. URL state

`lib/url-filters.ts` (pure, unit-tested) + `hooks/use-url-filters.ts` + `hooks/use-list-controls.ts`.

- `page`, `limit`, `search`, `sortBy`, `sortOrder`, `from`, `to` and the per-list filters
  (`specialization`, `hospital` / `condition`, `doctorId`, `gender`) live in the query string; the dashboard
  keeps `range`, `from`, `to`, `interval`. Views parse the URL into typed state with allow-lists
  (unknown sort fields, malformed ids/dates, inverted ranges and off-list page sizes fall back to defaults),
  so a hand-edited URL can never produce a request the API rejects.
- Writes use `history.pushState` / `replaceState`, which the Next router observes (`useSearchParams` updates)
  without a server round-trip. Discrete changes push (Back restores the previous filter state); typing in
  search replaces. Defaults are omitted and keys sorted, so URLs are short and canonical.
- Any change except paging removes `page` (back to 1). Search is debounced 300 ms; an outside change (Reset,
  Back) cancels a keystroke still in the timer.
- Every `useSearchParams` consumer is under `<Suspense>` with a content-shaped skeleton.

## 9. Design system implementation notes

- Tokens, fonts (IBM Plex Sans/Mono via `next/font`), radii, flat cards, badge tints, chart rules and page
  blueprints follow `DESIGN_SYSTEM.md`. `globals.css` keeps one extra import the installed shadcn needs
  (`shadcn/tailwind.css`, its `data-open:` / `data-closed:` variants).
- Requested shadcn edits done: destructive `Button` is `bg-destructive text-destructive-foreground`; `Card` is
  `rounded-lg border`, no ring/shadow. Further edits because the installed style (`radix-nova`) differs from the
  spec: buttons/inputs/selects `h-9 rounded-md`, button focus ring `ring-2 ring-ring ring-offset-2`, overlays flat
  `bg-black/50` without backdrop blur, dialogs `border shadow-lg`. `hooks/use-mobile.ts` was rewritten on
  `useSyncExternalStore` (the generated version fails the React hooks lint rule).
- Deviations from the design document:
  - **DataTable is hand-written, not TanStack Table.** Sorting, filtering and paging are server-side, so the
    table only renders rows; a typed column model (~250 lines) was smaller than adapting a client-side table engine.
  - Sidebar state is persisted in `localStorage` (`dt:sidebar`), not read from a cookie on the server: reading
    cookies in the layout would make every route dynamic under Cache Components.
  - Mobile filter sheet applies changes immediately (footer: "Show results" / "Reset") instead of a staged "Apply".
  - Form dialogs use one `Dialog` primitive restyled as a bottom sheet below `sm` rather than a separate `Sheet`.
  - Suggestion inputs use the native `<datalist>` (free text + suggestions, no custom listbox).
  - Patient detail has no "address" row and the assigned-doctor card has no phone: neither exists in the contract.
  - Dashboard growth chart is taller on `lg+` (380 px) so it lines up with the donut card beside it.
  - Touch targets on phones are 40 px (`h-10`/`size-10`), per the task brief (the design checklist says 44).
  - Dates are formatted by hand in UTC (`12 Sep 2026`) because ICU versions disagree on "Sep"/"Sept".

## 10. Re-render optimisations actually applied

- No app-wide state context: server state is in the query cache, list state in the URL, dialog state local.
  Providers hold only static values.
- `DataTable`, `Pagination`, `SearchInput`, `FilterDropdown`, `DateRangePicker`, `FilterChips`, `StatCard`,
  `RowActionsMenu`, `TagBadge`, `EntityAvatar`, `Sidebar`, `Header`, every chart and every dashboard widget are `memo`.
- Column definitions are `useMemo`'d on stable handlers; `useDialogState`, `useUrlFilters` and
  `useListControls` return referentially stable callbacks (they read `window.location` at call time instead of
  closing over the query string); `getRowId`, empty option arrays and chart configs are module constants.
- Search keystrokes stay in `SearchInput`'s local state; the table re-renders only when the debounced value
  reaches the URL. The doctor page's patients section is its own component, so paging it never re-renders the profile.
- Each dashboard widget subscribes to its own query; opening a dialog or changing the growth interval does not
  re-render the other widgets (range objects are memoised).
- `DataTable` mounts either the table or the card list (never both), and `FilterBar` mounts its controls once
  (inline or in the sheet), so cells, menus and comboboxes are not duplicated in the DOM.
- Recharts is loaded only on the dashboard: four `next/dynamic` chunks (`ssr: false`) with same-height skeletons.
- Media queries, the sidebar preference and the "hydrated" flag use `useSyncExternalStore` (no effect + state
  double render). Dialog forms reset through RHF's `reset` when opened; no effect sets React state anywhere
  (the React Compiler-era lint rules `set-state-in-effect` etc. pass with zero suppressions).

## 11. Auth guard: approach and trade-off

The session is an HTTP-only cookie on the **API origin**. In production the frontend and API are on different
sites, so Next.js (proxy/middleware or server components) never receives that cookie and cannot decide who is
signed in. The guard is therefore client-side: `(dashboard)/layout.tsx` renders `DashboardLayout`, which
resolves `GET /auth/me` through TanStack Query. Pending -> app-shell skeleton; `401` -> full navigation to
`/login?next=<path+query>`; network/5xx -> full-screen error with retry; user -> shell + page. `/login`
redirects to `next` (only same-origin relative paths, validated by `safeNextPath`) or `/dashboard` when already
signed in.

Trade-offs, stated plainly:
- It is a UX gate, not a security boundary. The static HTML/JS of protected pages is public (it contains no
  data); every piece of data is protected by the API, which is the real enforcement.
- An unauthenticated visitor sees a skeleton for one request before being redirected, instead of a server redirect.
- Protected segments export `instant = false`: under Cache Components, Next's dev-time "instant navigation"
  validation otherwise reports each page as a dropped segment, because the gate intentionally withholds it.
- Sign-in, sign-out and session expiry use full document navigations (`window.location.replace`). Next 16 keeps
  recently visited routes mounted but hidden (`<Activity>`), so a soft navigation would leave the typed
  password and the previous admin's screens alive in hidden DOM; a reload also drops the in-memory CSRF token.
- With `API_PROXY_TARGET` (same-origin mode) the cookie becomes first-party; a server-side `proxy.ts` check
  could then be added as a second layer. Not implemented, to keep one code path for both deployments.

## 12. Contract ambiguities and assumptions

1. **"All time" on the dashboard** sends no `from`/`to`. For the two time-series endpoints the server then
   applies its default window (last 12 months for `month`, etc.), so their subtitles print the period from the
   response's `from`/`to`, while the distribution widgets really are all-time.
2. **750-bucket cap** (backend addition): `allowedIntervalsFor` disables Day/Week in the toggle when a range
   would exceed it and coerces a hand-written `?interval=` to an allowed one; a custom range with only `from`
   is limited to Month.
3. Doctors-over-time and specialization distribution always use a span-derived interval (day <= 45 days,
   week <= 185 days, else month); only patient growth follows the Day/Week/Month toggle.
4. `GET /dashboard/stats` is global, so the stat cards do not react to the date range (their captions say so).
5. `specializationDistribution` is narrowed by doctor `createdAt` because the dashboard always sends a range
   except for "All time"; its `patientCount` (shown in the tooltip) is all-time, per the backend handoff.
6. Reassigning uses `PUT /patients/:id` with every field echoed back (full replace) and the new `doctorId`.
7. "Add patient" from a doctor's page **and** from a doctors-list row uses `POST /doctors/:id/patients`
   (doctor locked in the form); the Patients page uses `POST /patients`.
8. `INVALID_ID` (400) is treated like `NOT_FOUND` on detail pages (same not-found state).
9. A `doctorId` that no longer exists on create/update arrives as `VALIDATION_ERROR` with `path: "doctorId"` and
   is shown on the "Assigned doctor" field.
10. Emails are lower-cased client-side before sending; `""` optional patient fields are sent as `null`.
11. `413 PAYLOAD_TOO_LARGE` (backend addition) is in the `ApiErrorCode` union and shown via its message.
12. Unknown error codes fall back to the HTTP status; an unreadable response becomes `NETWORK_ERROR`.
13. Search is capped at 100 characters client-side; page sizes offered are 10 / 20 / 50.
14. Sorting cycles asc -> desc -> none; "none" omits `sortBy`/`sortOrder` so the server default (`createdAt desc`) applies.

Nothing in the contract blocked the build and the contract file was not edited.

## 13. Verification results (run on this machine, 2026-11-11)

| Step | Command | Result |
|---|---|---|
| Typecheck | `npm run typecheck` | exit 0, no errors |
| Lint | `npm run lint` | exit 0, 0 errors, 0 warnings (no `eslint-disable`, `@ts-ignore`, `@ts-expect-error` or `any` in authored code) |
| Unit tests | `npm run test` | `Test Files 5 passed (5)`, `Tests 94 passed (94)` |
| Production build | `npm run build` | `Compiled successfully`, TypeScript finished, 11/11 static pages; `/doctors/[id]` and `/patients/[id]` partial prerender, the rest static |
| E2E listing | `npx playwright test --list` | `Total: 76 tests in 5 files` |
| E2E run | `npx playwright test` against `next start` (production build) + live backend | **73 passed, 3 skipped, 0 failed** (2.9 min) |
| Screenshots | `npm run screenshots` against the same production server | 18 PNGs written (9 desktop 1440x900, 9 mobile 390x844 @2x) |

E2E projects: `setup` (signs in once through the real form, saves the session), `desktop` 1440x900, `tablet`
820x1180, `mobile` 390x844. The 3 skips are intentional: the invalid-credentials test runs on desktop only
(the API allows 10 failed logins per 15 min per IP) and the sidebar-persistence test does not apply to the
mobile drawer. Coverage: unauthenticated redirect with `next`; invalid login; empty-form validation; show/hide
password; login -> all dashboard widgets with numbers and drawn charts; deep link restored after login;
logout; doctor create -> search -> duplicate-email field error -> edit -> delete; delete blocked for a doctor
with patients (explanation + link); unknown/invalid ids; patient created under a doctor (locked doctor) ->
listed -> reassigned through the async combobox -> removed from the first doctor's list -> detail page ->
deleted; patients pagination + filter + page size + chip removal + reload + Back, all reflected in the URL;
`?doctorId=` deep link; per-page no-console-errors, no-horizontal-overflow and `<title>` checks on the four
main pages and both detail pages; navigation (mobile drawer vs sidebar); sidebar persistence; theme switch
persistence; quick actions opening the real forms; dashboard range + interval in the URL; 404.

Tests create records prefixed `E2E ` and delete them in `finally` blocks; the setup project also purges
leftovers from interrupted runs. After the final run the database was checked through the API: 0 doctors and
0 patients matching `E2E`, totals back at 24 doctors / 260 patients.

Screenshots were reviewed (desktop, tablet and mobile, light and dark) against the design system; fixes made
from that review: a visually hidden chart data table that widened the page, the growth card height, month
abbreviations, transparent outline triggers inside sheets, and the compact patients table on the doctor page.

Files: `docs/screenshots/desktop|mobile/` `01-login`, `02-dashboard`, `03-doctors`, `04-add-doctor-dialog`,
`05-doctor-detail`, `06-patients`, `07-edit-patient-dialog`, `08-patient-detail`, `09-dashboard-dark`.
The two dialog screenshots show the real forms open; nothing is submitted by the script.

## 14. Not executed

- No deployment (Vercel) and no run against a cross-site production API; `SameSite=None` cookie behaviour and
  the `API_PROXY_TARGET` rewrite were not exercised end-to-end (the rewrite is covered only by the build).
- Browsers other than Chromium; real devices; screen-reader passes; automated axe/Lighthouse audits.
- The login `RATE_LIMITED` message was not triggered on purpose (it would lock the demo admin's IP for 15 min);
  the mapping is unit-level code only. The global 300 req/min limit *was* hit once by the suite, which is why
  `e2e/fixtures.ts` now waits for the `RateLimit` window when the remaining budget is low.
- `npm audit` findings were not triaged.

## 15. Known limitations

- Page order on phones for the dashboard is set with CSS `order`, so keyboard order follows the desktop DOM order.
- The mobile sort control offers each sortable column ascending/descending; there is no multi-column sort.
- The doctor filter chip shows "selected doctor" until the name lookup resolves.
- Suggestions (`<datalist>`) render with the browser's native styling.
- The auth guard's skeleton is shown on every hard load of a protected page (one `/auth/me` round-trip).
- `create-next-app` made its own "Initial commit" in `doctor-tracker-frontend/.git`; nothing was committed
  after that (all work is uncommitted, as instructed). `README.md` is a two-line placeholder for the
  Documentation Agent. `.next/` was deleted after verification to save disk space (`npm run build` recreates it).
- The frontend server on port 3000 that was started for testing has been stopped; the backend on 5000 was not touched.
