# Backend Handoff — `doctor-tracker-backend`

Author: Backend Agent (Agent 1). Everything below was actually run on this machine
(Windows 11, Node v24.14.1, npm 11, MongoDB 8.0 in Docker) unless a line says otherwise.
Nothing is committed (`git init` only). No README was written — that is the Documentation Agent's job.

## 1. Status

| # | Step | Result |
|---|---|---|
| 1 | `npm run typecheck` | clean (0 errors) |
| 2 | `npm run lint` | clean (0 errors, 0 warnings; `strictTypeChecked`, no `any`, no disable comments) |
| 3 | `npm run build` | clean, emits `dist/` |
| 4 | `npm test` | **5 files / 128 tests passed**, 3.76 s, against Dockerized MongoDB (`doctor_tracker_test`) |
| 5 | `seed:admin` ×2, `seed:demo` ×2 | first run inserts (1 admin, 24 doctors, 260 patients); second run changes nothing |
| 6 | `npm run db:explain` | every list/dashboard query is index-backed (table in §7) |
| 7 | `npm start` + curl smoke test | health → csrf → login → me → filtered doctors → dashboard → logout all correct; server stopped, port 5000 free |

Nothing is blocked.

## 2. Folder tree

```
doctor-tracker-backend/
  .env.example  .gitignore  docker-compose.yml  render.yaml  package.json  package-lock.json
  tsconfig.json  tsconfig.build.json  eslint.config.mjs  vitest.config.mts
  src/
    app.ts                      builds the Express app (no listen) - imported by tests
    server.ts                   connect DB -> listen -> graceful shutdown (SIGINT/SIGTERM)
    config/
      environment.ts            Zod-validated env, fails fast listing variable names only
      database.ts               mongoose connect / disconnect / readiness
    models/
      user.model.ts  doctor.model.ts  patient.model.ts     schemas + indexes
    middleware/
      authenticate.ts  authorize.ts  csrf.ts  rate-limit.ts
      validate-request.ts  error-handler.ts  not-found.ts
    modules/
      auth/       auth.route.ts  auth.controller.ts  auth.service.ts  auth.validation.ts
      doctors/    doctor.route.ts  doctor.controller.ts  doctor.service.ts  doctor.validation.ts
      patients/   patient.route.ts  patient.controller.ts  patient.service.ts  patient.validation.ts
      dashboard/  dashboard.route.ts  dashboard.controller.ts  dashboard.service.ts  dashboard.validation.ts
      health/     health.route.ts  health.controller.ts
    utils/
      api-response.ts  app-error.ts  async-handler.ts  cookies.ts
      date-range.ts  pagination.ts  regex.ts  validation.ts
    scripts/
      seed-admin.ts  seed-demo.ts  explain.ts
    types/express.d.ts          adds `req.user`
  tests/
    setup.ts                    connects, enforces the `_test` guard, builds indexes, cleans
    helpers/api.ts              browser-like client (cookie jar + CSRF header)
    helpers/db.ts               fixtures with explicit createdAt
    health.test.ts (7)  auth.test.ts (47)  doctors.test.ts (31)  patients.test.ts (22)  dashboard.test.ts (21)
```

Layering: routes declare endpoints + middleware; controllers only translate HTTP; services hold
the logic and return plain DTOs; models own schemas and indexes; validators are Zod.
About 3,050 lines in `src/`, 1,770 in `tests/`.

## 3. npm scripts

| Script | Command | Notes |
|---|---|---|
| `dev` | `tsx watch src/server.ts` | |
| `build` | `tsc -p tsconfig.build.json` | CommonJS output in `dist/` |
| `start` | `node dist/server.js` | |
| `typecheck` | `tsc --noEmit` | covers `src/` and `tests/` |
| `lint` | `eslint .` | flat config, typescript-eslint `strictTypeChecked` |
| `test` | `vitest run` | serial files, needs Docker MongoDB + `MONGODB_URI_TEST` |
| `seed:admin` | `tsx src/scripts/seed-admin.ts` | idempotent; prints created / updated / nothing changed |
| `seed:admin:prod` | `node dist/scripts/seed-admin.js` | **extra** — for hosts without dev dependencies (Render shell / one-off job) |
| `seed:demo` | `tsx src/scripts/seed-demo.ts` | idempotent; refuses `NODE_ENV=production`; `-- --reset` re-creates the demo records with fresh dates (**extra flag**) |
| `db:explain` | `tsx src/scripts/explain.ts` | prints the plan table in §7 |

`engines.node` is `>=20.11.0`.

## 4. Environment variables

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production` |
| `PORT` | no | `5000` | |
| `MONGODB_URI` | **yes** | – | `mongodb://<user>:<password>@127.0.0.1:27017/doctor_tracker?authSource=admin` |
| `MONGODB_URI_TEST` | for `npm test` | – | database name must end in `_test` |
| `JWT_SECRET` | **yes** | – | ≥ 32 characters |
| `JWT_EXPIRES_IN` | no | `1d` | `<integer><s\|m\|h\|d>` only (e.g. `15m`, `12h`, `1d`) |
| `FRONTEND_URL` | no | `http://localhost:3000` | comma-separated **exact origins**; a path or trailing slash is rejected at startup |
| `COOKIE_DOMAIN` | no | unset | |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | for `seed:admin` | – | password 8–128 chars |

A local, git-ignored `doctor-tracker-backend/.env` exists with a randomly generated `JWT_SECRET`
and the Docker root credentials (never printed or written anywhere else).
Demo login documented by the Lead: `admin@doctortracker.dev` / `Admin@12345`.

Invalid configuration aborts startup, for example:

```
Invalid environment configuration:
  - JWT_SECRET: Must be at least 32 characters
See .env.example.
```

## 5. Notes for the Frontend Agent

- Run the frontend on exactly `http://localhost:3000` and call `http://localhost:5000/api`.
  `http://127.0.0.1:3000` is a different origin: unsafe requests get `403 ORIGIN_NOT_ALLOWED`
  and the cookies would not be sent.
- Order of checks on a request: CORS → rate limit → JSON parse → (unsafe methods) Origin, then CSRF
  → authentication → role → validation → handler. So an unsafe request without a CSRF token gets
  `403 CSRF_TOKEN_INVALID` even when the session is also missing, and an unauthenticated request
  gets `401` before its body is validated.
- The CSRF token stays the same for a browser as long as the `dt_csrf` cookie lives (it is refreshed
  for another `JWT_EXPIRES_IN` on every `GET /auth/csrf-token`). It is not rotated on login.
- Empty query values (`?search=&specialization=`) are treated as "not provided", so filter state can
  be serialised without stripping empty keys.
- Success responses of `POST`/`PUT`/`DELETE` and login/logout carry a human `message` suitable for a toast.

## 6. Deviations from / ambiguities in the contract

Nothing in the contract was impossible. The points below are additions or interpretations.

**Additions**

1. **`413 PAYLOAD_TOO_LARGE`** — a body over 100kb returns this code. The contract's error table has no
   entry for it.
2. **Series size cap** — a time series that would need more than 750 buckets (e.g. `interval=day&from=2000-01-01`)
   returns `400 VALIDATION_ERROR` with `details[0].path = "from"` instead of a multi-megabyte response.
3. **`page` upper bound** of 1,000,000 (`VALIDATION_ERROR` above it).
4. Extra script `seed:admin:prod` and the `seed:demo -- --reset` flag (see §3).

**Interpretations**

5. **Health when the database is down** — `503` with `{ success: false, message, data: { status: "ok", ..., database: "disconnected" } }`.
   `status` stays the literal `"ok"` (process is alive) because the contract types it that way; `database` and the
   HTTP status carry the failure.
6. **`dt_csrf` cookie lifetime** — "same attributes as `dt_access`" is implemented including `Max-Age`.
7. **Time series `from`** — rows are matched with the exact §3 semantics (`createdAt >= from 00:00Z`), while the
   response's `from` is the start of the first bucket as the contract says. With `interval=week|month` and a
   `from` in the middle of a bucket, the first point is therefore a partial bucket. Default ranges are bucket-aligned.
   Only `to` given → the default number of buckets ending at `to`; only `from` given → up to today.
8. **`doctor-statistics`** — `doctorsOverTime` uses the default range when none is given;
   `specializationDistribution` is narrowed (by doctor `createdAt`) **only when `from`/`to` are explicitly sent**,
   otherwise it covers all doctors. Its `patientCount` is always those doctors' all-time patient total.
9. **`patients-per-doctor` / `topDoctors`** — doctors with zero patients (in the range) are not listed. The top N is
   cut by `patientCount` desc with `doctorId` as the deterministic tiebreak, then the returned rows are ordered
   by `patientCount` desc, name asc. The doctor `$lookup` runs after `$limit` (the brief's requirement), so a tie
   exactly at the cut-off is not resolved by name.
10. **Secondary sort order** — `sortBy=specialization|hospital` (doctors) and `sortBy=condition` (patients) order ties by
    `createdAt` in the opposite direction, then `_id`. This mirrors the compound indexes so the sort is index-backed;
    pages are still stable. `name`, `age`, `createdAt` tie-break directly on `_id`.
11. **Sort collation** — string sorts are MongoDB's default binary order (uppercase before lowercase).
    `sortBy=age&sortOrder=asc` lists patients without an age first.
12. **Validation details** — unknown body fields produce one detail per field (`{ path: "<field>", message: "Unknown field" }`).
    Malformed JSON is `400 VALIDATION_ERROR` with `details: [{ path: "", ... }]`. A missing body is validated as `{}`.
    A repeated query parameter (`?page=1&page=2`) is a `VALIDATION_ERROR`.
13. **`INVALID_ID` precedence** — a malformed `:id` is reported before any body/query problem.
14. **Duplicate key mapping** — any E11000 is reported as `409 DUPLICATE_EMAIL` (email is the only unique field per collection).
15. **`GET /doctors/:id/patients`** ignores a `doctorId` query parameter rather than rejecting it.
16. **Session check** — besides verifying the JWT, every authenticated request re-reads the user by `_id`
    (one indexed lookup), so a removed admin loses access immediately.
17. **Login rate limit** — failed attempts are any login response with status ≥ 400 (wrong credentials and
    validation errors). CSRF/origin rejections happen earlier and are not counted. Verified manually: 10 × `401`, then `429 RATE_LIMITED`.
18. **`JWT_EXPIRES_IN`** accepts only `<integer><s|m|h|d>` (not every `ms`-style string) so that the cookie
    `Max-Age` can be derived from the same value.
19. **`render.yaml` build command** is `npm ci --include=dev && npm run build` rather than `npm ci && npm run build`:
    with `NODE_ENV=production` plain `npm ci` skips TypeScript and the build fails.

**Index change relative to the brief** — see §7.

## 7. Indexes and query plans

Every list index ends in `_id` (same direction as the preceding key). The brief proposed e.g. `{ createdAt: -1 }`;
the API sorts with an `_id` tiebreak for stable pagination, and an index without `_id` cannot provide that order.
Measured on a temporary copy of the 260 patients with only `{ createdAt: -1 }`:

```
find().sort({ createdAt: -1, _id: -1 }).limit(10)
  { createdAt: -1 } only        -> SORT > COLLSCAN            keys 0   docs 260  returned 10
  { createdAt: -1, _id: -1 }    -> LIMIT > FETCH > IXSCAN     keys 10  docs 10   returned 10
```

| Collection | Index | Purpose |
|---|---|---|
| users | `{ email: 1 }` unique | login lookup; one account per email |
| doctors | `{ email: 1 }` unique | duplicate-email enforcement (race-free) |
| doctors | `{ createdAt: -1, _id: -1 }` | default list order, date-range filter, doctors-over-time series, recent doctors |
| doctors | `{ name: 1, _id: 1 }` | sort by name; `/doctors/options` picker |
| doctors | `{ specialization: 1, createdAt: -1, _id: -1 }` | specialization filter (newest first), sort by specialization, distinct specializations |
| doctors | `{ hospital: 1, createdAt: -1, _id: -1 }` | hospital filter (newest first), sort by hospital, distinct hospitals |
| patients | `{ doctorId: 1, createdAt: -1, _id: -1 }` | a doctor's patient list, covered per-doctor counts, delete guard, patients-per-doctor |
| patients | `{ condition: 1, createdAt: -1, _id: -1 }` | condition (+ date) filter and its count, sort by condition, distinct conditions, condition chart |
| patients | `{ createdAt: -1, _id: -1 }` | default list order, date-range filter, growth series, month counters, recent patients |
| patients | `{ name: 1, _id: 1 }` | sort by name |

Not indexed on purpose: patient `gender` (3 values, always combined with another filter), patient `age`
(sort only, bounded top-k in memory), patient `email`/`phone`.

### `npm run db:explain` (actual output, dev database after `seed:demo`)

```
Database "doctor_tracker": 24 doctors, 260 patients

Query                                                                                    | Winning plan (outer > inner)        | Index used                           | Keys | Docs | Returned
-----------------------------------------------------------------------------------------|-------------------------------------|--------------------------------------|------|------|---------
Doctors: default list (createdAt desc, page 1, limit 10)                                 | LIMIT > FETCH > IXSCAN              | createdAt_-1__id_-1                  | 10   | 10   | 10
Doctors: page 2 of the default list (skip 10, limit 10)                                  | LIMIT > FETCH > SKIP > IXSCAN       | createdAt_-1__id_-1                  | 20   | 10   | 10
Doctors: specialization = "Cardiology"                                                   | LIMIT > FETCH > IXSCAN              | specialization_1_createdAt_-1__id_-1 | 4    | 4    | 4
Doctors: sorted by name asc                                                              | LIMIT > FETCH > IXSCAN              | name_1__id_1                         | 10   | 10   | 10
Doctors: name search "an" (picker, sort name, limit 20)                                  | LIMIT > FETCH > IXSCAN              | name_1__id_1                         | 24   | 8    | 8
Doctors: search "an" across name/email/phone (list)                                      | SUBPLAN > LIMIT > FETCH > IXSCAN    | createdAt_-1__id_-1                  | 24   | 24   | 8
Patients: default list (createdAt desc, limit 10)                                        | LIMIT > FETCH > IXSCAN              | createdAt_-1__id_-1                  | 10   | 10   | 10
Patients: by doctorId (busiest doctor, limit 10)                                         | LIMIT > FETCH > IXSCAN              | doctorId_1_createdAt_-1__id_-1       | 10   | 10   | 10
Patients: condition = "Hypertension" + last 90 days                                      | LIMIT > FETCH > IXSCAN              | condition_1_createdAt_-1__id_-1      | 10   | 10   | 10
Patients: total for condition = "Hypertension" + last 90 days (what countDocuments runs) | GROUP > COUNT_SCAN                  | condition_1_createdAt_-1__id_-1      | 25   | 0    | 1
Patients: sorted by condition asc                                                        | LIMIT > FETCH > IXSCAN              | condition_1_createdAt_-1__id_-1      | 10   | 10   | 10
patientCount for one doctors page ($in 10 ids + $group)                                  | GROUP > PROJECTION_COVERED > IXSCAN | doctorId_1_createdAt_-1__id_-1       | 80   | 0    | 9
Dashboard: patients per doctor, all time (hinted)                                        | GROUP > PROJECTION_COVERED > IXSCAN | doctorId_1_createdAt_-1__id_-1       | 260  | 0    | 22
Dashboard: patients per doctor, all time (NO hint, for comparison)                       | GROUP > COLLSCAN                    | (none)                               | 0    | 260  | 22
Dashboard: patient growth, last 12 months by month                                       | GROUP > PROJECTION_COVERED > IXSCAN | createdAt_-1__id_-1                  | 260  | 0    | 13
Dashboard: distinct specializations ($group on indexed key)                              | PROJECTION_COVERED > DISTINCT_SCAN  | specialization_1_createdAt_-1__id_-1 | 9    | 0    | 9
Filters: distinct patient conditions ($group equivalent of distinct)                     | PROJECTION_COVERED > DISTINCT_SCAN  | condition_1_createdAt_-1__id_-1      | 12   | 0    | 12
Dashboard: 5 most recent patients ($sort + $limit, then $lookup)                         | LIMIT > FETCH > IXSCAN              | createdAt_-1__id_-1                  | 5    | 5    | 5

Keys = index keys examined, Docs = documents fetched, Returned = rows leaving the query stage.
For aggregations the figures describe the initial cursor stage that feeds the pipeline.
```

Reading it:

- Sorted, paginated lists examine exactly `skip + limit` keys and fetch `limit` documents. No plan has a `SORT` stage.
- `patientCount` for a doctors page is one aggregation, fully covered by the index (0 documents fetched) — no N+1.
- Whole-collection `$group`s default to `COLLSCAN`; the service passes an index hint, which turns them into covered
  index scans (rows "hinted" vs "NO hint"). The hint is only applied when there is no date range.
- The multi-field "contains" search is the one honest exception: an unanchored, case-insensitive regex cannot use
  index bounds, so MongoDB walks the `createdAt` index in order and filters (24 keys / 24 docs for 8 hits). The work is
  O(collection) in the worst case. The name-only picker search filters on index keys and fetches matches only (24 keys / 8 docs).

### Query patterns

- Lists: one `find` (`select` + `lean` + `sort` + `skip` + `limit`) and one count in parallel;
  `estimatedDocumentCount()` when there is no filter, `countDocuments(filter)` otherwise.
- Patient → doctor join: one `$in` query per page for the distinct doctor ids (a single lookup on `/doctors/:id/patients`).
- Dashboard: `$group` + `$dateTrunc` (UTC, `startOfWeek: monday`) with gap-filling in the service; `$lookup` only after
  `$limit`; `$facet` after the `$group` in condition-distribution (top N and grand total in one round trip);
  independent aggregations run in parallel.

## 8. Test summary (actual run)

```
> vitest run

 Test Files  5 passed (5)
      Tests  128 passed (128)
   Start at  02:26:57
   Duration  3.76s (tests 45%, setup 34%, import 18%, transform 3%)
```

Per file: health 7, auth 47, doctors 31, patients 22, dashboard 21.

- Runs against the Dockerized MongoDB via `MONGODB_URI_TEST`; files run serially (`fileParallelism: false`).
- Two guards against wiping real data: the env loader refuses `NODE_ENV=test` unless the test URI's database ends
  in `_test`, and `tests/setup.ts` re-checks the name reported by the server after connecting. Verified by pointing
  `MONGODB_URI_TEST` at the dev database: the run aborted with `MONGODB_URI_TEST: the database name must end with "_test"`.
- Collections are cleaned before and after every test file.
- Covered: health; security headers, CORS allowlist + preflight, malformed JSON, 413; CSRF (missing / forged / other
  browser's token / foreign origin / logout); login success, cookie attributes, JWT payload, invalid credentials,
  validation; `me` with valid, missing, tampered, expired, `alg=none`, deleted-user and unknown-role tokens; logout;
  401 on all 14 protected GET routes and 7 write routes; doctor and patient CRUD, duplicate email, field-level
  `details`, unknown fields, `INVALID_ID`, 404; pagination incl. beyond-last page and non-overlapping pages; search
  (name/email/phone, regex metacharacters); all filters and date ranges; every sort; `patientCount`; delete blocked then
  allowed; optional-fields-null; non-existent `doctorId`; reassignment; `/doctors/:id/patients` GET + POST; all three
  filter/option endpoints; every dashboard endpoint with exact numbers, gap-filling, Monday weeks, the "Other" bucket,
  and an empty database.
- Not covered by automated tests: rate limiting (disabled under `NODE_ENV=test` per the contract; checked manually),
  production cookie flags (checked manually, below), the 503 health branch, graceful shutdown.

### Manual checks

- Smoke test on `npm start`: health `200`; login without token `403 CSRF_TOKEN_INVALID`; login `200` with HTTP-only
  `dt_access` + `dt_csrf`; `me` `200`; `GET /doctors?specialization=Cardiology&limit=2&page=2&sortBy=name&sortOrder=asc`
  → 2 rows, `pagination { page: 2, limit: 2, total: 4, totalPages: 2 }`; `dashboard/stats` →
  `{ totalDoctors: 24, totalPatients: 260, totalSpecializations: 9, newPatientsThisMonth: 49, newPatientsLastMonth: 65, newDoctorsThisMonth: 2, averagePatientsPerDoctor: 10.8 }`;
  logout `200`; `me` afterwards `401`.
- `NODE_ENV=production` on a temporary port: `Set-Cookie: dt_csrf=…; Max-Age=86400; Path=/; HttpOnly; Secure; SameSite=None`,
  HSTS and `RateLimit` headers present. `NODE_ENV=production npm run seed:demo` → `Refusing to seed demo data when NODE_ENV=production.`
- Login limiter: statuses `401 ×10` then `429 RATE_LIMITED`.

## 9. Seed data

- `seed:admin` — creates the admin, or updates name/password if they differ, otherwise reports "nothing changed".
- `seed:demo` — 24 doctors (9 specializations, 6 hospitals) and 260 patients (12 conditions), from a seeded PRNG so
  the people are identical on every machine. Doctors are upserted by email, patients by a deterministic `_id`, all
  with `$setOnInsert`. Dates are relative to the first run: patient registrations per month on this machine were
  `5, 10, 2, 11, 12, 11, 15, 18, 25, 36, 65, 49` (Dec 2025 → Nov 2026, current month partial). Workload is uneven
  (0 to 57 patients per doctor; two doctors have none, so deletion can be demonstrated). Names are invented,
  emails use `@example.com`, phones use the reserved `555-01xx` range.

## 10. Security measures implemented

- **Passwords**: bcrypt via **`bcryptjs`** (pure JS — chosen because native `bcrypt` needs a compiler toolchain on
  Windows; same algorithm and hash format), cost 12 (4 under test). `password` is `select: false`.
- **Login**: identical `401 INVALID_CREDENTIALS` for unknown email and wrong password; a dummy hash is compared when
  the user does not exist so timing does not reveal accounts; 10 failed attempts / 15 min / IP.
- **Session**: JWT (HS256 pinned on verify, so `alg=none` is rejected) holding only `{ sub, role }`, in an HTTP-only
  cookie; `SameSite=Lax` in development, `SameSite=None; Secure` in production; payload shape validated; user re-read on each request.
- **CSRF**: signed double-submit — random secret in an HTTP-only cookie, token = HMAC-SHA256(secret) under a key derived
  from `JWT_SECRET`, constant-time comparison, required on every unsafe method including login and logout; plus an
  Origin allowlist check.
- **CORS**: exact-origin allowlist, credentials enabled, fixed methods and headers.
- **Authorization**: `authenticate` + `authorize('admin')` on every doctors/patients/dashboard route and `/auth/me`. No registration endpoint.
- **Input**: Zod on every body, query and param; strict bodies; search input regex-escaped; all filter values are
  validated strings, so query-operator injection is not possible; 100kb body limit.
- **Headers / transport**: Helmet defaults, `Cache-Control: no-store` on all API responses, `trust proxy = 1` in production.
- **Rate limiting**: 300 requests / min / IP globally (preflights excluded), stricter login limiter.
- **Errors**: one handler maps AppError, ZodError, Mongoose Cast/Validation errors, E11000, JWT errors and body-parser
  errors to the contract envelope; unexpected errors are logged server-side and return a generic message in production.
- **Secrets**: only in the git-ignored `.env`; the env loader and the server log variable names and the database name,
  never values or connection strings.

## 11. Known limitations

- **Search** is an unanchored case-insensitive regex — fine for thousands of rows, linear beyond that. A text or
  Atlas Search index is the scaling path.
- **Offset pagination**: `skip` cost grows with the page number (page 2 examined 20 keys). Keyset pagination would
  remove that but does not fit the contract's `page`/`totalPages` shape.
- **Doctor deletion** is check-then-delete without a transaction (the Docker MongoDB is a standalone node, which has
  no multi-document transactions). A patient created in the gap between the two statements could be orphaned; the
  API then shows it with a placeholder doctor name rather than failing.
- **Unfiltered totals** use `estimatedDocumentCount()` (collection metadata), which can be briefly inaccurate after an
  unclean shutdown.
- **Sessions** are stateless: logout clears the cookie but a copied token stays valid until it expires; there is no
  refresh token or revocation list.
- **Rate-limit counters** are in memory — per process, reset on restart; a shared store is needed for more than one instance.
- **`autoIndex`** is on, so indexes are built at startup. For a large production dataset this should become a deploy step.
- **Request logs** (morgan) include the URL query string, so search terms appear in server logs.
- **Graceful shutdown** (SIGINT/SIGTERM → stop accepting, drain, close pool, 10 s safety timeout) is implemented but was
  not exercised here: on Windows the test server was stopped with `taskkill /F`, which does not deliver a signal.
- **`render.yaml`** was written but not deployed. It assumes the backend lives in `doctor-tracker-backend/` of the
  repository and that MongoDB is provided externally through `MONGODB_URI`.
- Extra runtime dependencies beyond the required list: `compression`, `morgan`, `dotenv`.
