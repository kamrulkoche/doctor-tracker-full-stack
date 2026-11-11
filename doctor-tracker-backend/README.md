# Doctor Tracker — Backend

REST API for Doctor Tracker, an admin application for managing doctors, the patients assigned
to them, and dashboard analytics. Built with Express 5, TypeScript, MongoDB and Mongoose.

The frontend is a separate Next.js app (`doctor-tracker-frontend`). It talks to this server only
over REST. This server is the only component that connects to MongoDB.

---

## Contents

1. [Tech stack](#1-tech-stack)
2. [Prerequisites](#2-prerequisites)
3. [Quick start](#3-quick-start)
4. [Environment variables](#4-environment-variables)
5. [Local MongoDB (Docker Compose)](#5-local-mongodb-docker-compose)
6. [npm scripts](#6-npm-scripts)
7. [Project structure](#7-project-structure)
8. [Request lifecycle](#8-request-lifecycle)
9. [Authentication, cookies and CSRF](#9-authentication-cookies-and-csrf)
10. [API reference](#10-api-reference)
11. [Data model and indexes](#11-data-model-and-indexes)
12. [Seed data](#12-seed-data)
13. [Testing](#13-testing)
14. [Deployment (Render + MongoDB Atlas)](#14-deployment-render--mongodb-atlas)
15. [Security measures](#15-security-measures)
16. [Known limitations](#16-known-limitations)
17. [Troubleshooting](#17-troubleshooting)

---

## 1. Tech stack

| Concern | Choice |
|---|---|
| Runtime | Node.js `>=20.11.0` (developed on Node 24; Render pinned to 22.12.0) |
| Language | TypeScript (strict), compiled to CommonJS in `dist/` |
| HTTP | Express 5, `helmet`, `cors`, `compression`, `cookie-parser`, `morgan`, `express-rate-limit` |
| Database | MongoDB 8.0 via Mongoose 9 |
| Validation | Zod 4 (env, body, query, params) |
| Auth | JWT (`jsonwebtoken`, HS256) in an HTTP-only cookie; passwords hashed with `bcryptjs` |
| Tests | Vitest + Supertest against a real (Dockerized) MongoDB |
| Lint | ESLint flat config, `typescript-eslint` `strictTypeChecked` |

## 2. Prerequisites

- Node.js 20.11 or newer, and npm.
- Docker Desktop (Windows/macOS) or Docker Engine with the Compose v2 plugin (Linux). The
  commands use `docker compose` with a space.
- Port `5000` (API) and `27017` (MongoDB) free on the host. Both can be changed.

## 3. Quick start

All commands run from this directory (`doctor-tracker-backend/`).

```bash
# 1. Environment file
cp .env.example .env            # PowerShell: Copy-Item .env.example .env
#    Fill in MONGO_* (Docker), MONGODB_URI(_TEST), JWT_SECRET and ADMIN_* (see section 4)

# 2. Start MongoDB and wait until it reports "healthy"
docker compose up -d mongodb
docker compose ps

# 3. Install, create the admin, optionally load demo data, run
npm install
npm run seed:admin
npm run seed:demo               # optional: 24 fictional doctors / 260 patients
npm run dev                     # http://localhost:5000/api
```

Check it:

```bash
curl -i http://localhost:5000/api/health
```

Expect `200` and `"database": "connected"`. A `503` means the server is running but cannot reach
MongoDB.

Generate a `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

## 4. Environment variables

One git-ignored `.env` in this directory holds both the backend's variables and the `MONGO_*`
variables Docker Compose uses for the local database. The backend ignores the `MONGO_*`
variables. `.env.example` is the committed template; it contains placeholders only.

Configuration is validated with Zod at startup. An invalid value stops the process and lists
the variable names (never their values):

```
Invalid environment configuration:
  - JWT_SECRET: Must be at least 32 characters
See .env.example.
```

### Backend

| Variable | Required | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | no | `development` | `development` \| `test` \| `production`. Production switches cookies to `SameSite=None; Secure`, hides internal error detail and blocks `seed:demo`. |
| `PORT` | no | `5000` | Do not set it on Render; the platform supplies it. |
| `MONGODB_URI` | **yes** | – | e.g. `mongodb://<user>:<password>@127.0.0.1:27017/doctor_tracker?authSource=admin` |
| `MONGODB_URI_TEST` | for `npm test` | – | Database name **must end in `_test`**; tests wipe it. |
| `JWT_SECRET` | **yes** | – | At least 32 characters. Also the key the CSRF token HMAC is derived from. |
| `JWT_EXPIRES_IN` | no | `1d` | `<integer><s\|m\|h\|d>` only, e.g. `15m`, `12h`, `1d`. The cookie `Max-Age` matches it. |
| `FRONTEND_URL` | no | `http://localhost:3000` | Comma-separated list of **exact origins** (CORS and Origin allowlist). A path or trailing slash is rejected at startup. |
| `COOKIE_DOMAIN` | no | unset | Only for a shared parent domain (e.g. `.example.com`). |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | for `seed:admin` | – | The admin account and its login. Password 8–128 characters. |

### Docker Compose (local MongoDB)

| Variable | Notes |
|---|---|
| `MONGO_INITDB_ROOT_USERNAME` | Root user created on first volume initialisation. Required. |
| `MONGO_INITDB_ROOT_PASSWORD` | Its password. Required. Letters and digits avoid URL-encoding and `$` interpolation problems. |
| `MONGO_INITDB_DATABASE` | Default `doctor_tracker`. |
| `MONGO_PORT` | Host port, bound to `127.0.0.1` only. Default `27017`. |

`MONGO_INITDB_*` are applied **only when the data volume is empty**. Changing the password in
`.env` later does not change it inside MongoDB; see [Troubleshooting](#17-troubleshooting).

### Connection string notes

- Use `127.0.0.1`, not `localhost`. `localhost` can resolve to IPv6 `::1`, and the port is
  published on IPv4 only.
- The root user lives in the `admin` database, so the URI needs `authSource=admin`.
- Percent-encode special characters in the user name or password (`@` → `%40`, `:` → `%3A`,
  `/` → `%2F`, `#` → `%23`, `%` → `%25`, `$` → `%24`).

## 5. Local MongoDB (Docker Compose)

`docker-compose.yml` defines one service: `mongodb` (`mongo:8.0`, container
`doctor-tracker-mongodb`, Compose project `doctor-tracker`). Data is kept in the named volume
`doctor-tracker_mongodb_data`. A health check pings the server with the root credentials, so
the container reports `healthy` only when authenticated commands work. The backend itself runs
on the host, not in Docker.

| Command | Effect |
|---|---|
| `docker compose config` | Validate the file with `.env` substituted. Prints the root password; do not paste the output anywhere. |
| `docker compose up -d mongodb` | Create/start the container. Data is kept. |
| `docker compose ps` | State and health (`starting`, `healthy`, `unhealthy`). |
| `docker compose logs -f mongodb` | Follow the server log. |
| `docker compose restart mongodb` | Restart without recreating. Does not pick up `.env` changes; use `up -d`. |
| `docker compose down` | Remove the container and network. **The volume is kept.** |
| `docker compose down -v` | **Also deletes all data**, including the root user. Only use it to start from scratch. |

Open a shell (prompts for the password):

```bash
docker compose exec mongodb mongosh -u <root-user> -p --authenticationDatabase admin
```

For a least-privilege application user, root password rotation and other details, see
`documentation/LOCAL_DEVELOPMENT.md` in the project workspace.

## 6. npm scripts

| Script | Command | What it does |
|---|---|---|
| `dev` | `tsx watch src/server.ts` | Dev server with reload on change. |
| `build` | `tsc -p tsconfig.build.json` | Compile to `dist/`. |
| `start` | `node dist/server.js` | Run the compiled server. |
| `typecheck` | `tsc --noEmit` | Type-check `src/` and `tests/`. |
| `lint` | `eslint .` | Lint with `strictTypeChecked`. |
| `test` | `vitest run` | Full test suite (needs MongoDB and `MONGODB_URI_TEST`). |
| `seed:admin` | `tsx src/scripts/seed-admin.ts` | Create or update the admin from `ADMIN_*`. Idempotent. |
| `seed:admin:prod` | `node dist/scripts/seed-admin.js` | Same, from the compiled build (hosts without dev dependencies). |
| `seed:demo` | `tsx src/scripts/seed-demo.ts` | Insert fictional demo data. Idempotent. Refuses `NODE_ENV=production`. `-- --reset` re-creates it with fresh dates. |
| `db:explain` | `tsx src/scripts/explain.ts` | Print the query plan of every key list and dashboard query. |
| `db:bench` | `tsx src/scripts/bench.ts` | Load 2,000 doctors / 200,000 patients into the throwaway `doctor_tracker_perf_test` database (on the `MONGODB_URI_TEST` server), print plans and timings, then drop it. Options: `--doctors=N --patients=N --keep --reuse`. |

The server shuts down gracefully on `SIGINT`/`SIGTERM`: it stops accepting connections, drains
requests, closes the database pool, and exits after at most 10 seconds.

## 7. Project structure

```
doctor-tracker-backend/
  .env.example  docker-compose.yml  render.yaml
  package.json  tsconfig.json  tsconfig.build.json  eslint.config.mjs  vitest.config.mts
  src/
    app.ts                 builds the Express app (no listen); imported by tests
    server.ts              connect DB -> listen -> graceful shutdown
    config/
      environment.ts       Zod-validated env; fails fast
      database.ts          mongoose connect / disconnect / readiness
    models/                user, doctor, patient schemas + indexes
    middleware/            authenticate, authorize, csrf, rate-limit,
                           validate-request, error-handler, not-found
    modules/
      auth/  doctors/  patients/  dashboard/  health/
                           each: *.route.ts  *.controller.ts  *.service.ts  *.validation.ts
    utils/                 api-response, app-error, async-handler, cookies,
                           date-range, pagination, regex, validation
    scripts/               seed-admin, seed-demo, explain, bench, query-plans
    types/express.d.ts     adds req.user
  tests/
    setup.ts               connects, enforces the _test guard, builds indexes, cleans
    helpers/               browser-like client (cookie jar + CSRF), fixtures
    health / auth / doctors / patients / dashboard .test.ts
```

Layers have one job each:

- **Routes** declare endpoints and the middleware for each one.
- **Controllers** translate HTTP to a service call and back. They contain no business rules.
- **Services** hold the logic and return plain DTOs.
- **Models** own the schemas and indexes.
- **Validators** are Zod schemas.

## 8. Request lifecycle

Every request passes these stages in order. Any failure is turned into the error envelope by
the central error handler.

| # | Stage | Behaviour | Failure |
|---|---|---|---|
| 1 | Helmet | Security headers; `Cache-Control: no-store` on API responses | – |
| 2 | CORS | Exact-origin allowlist from `FRONTEND_URL`, credentials allowed | Browser blocks the response |
| 3 | Rate limit | 300 req/min/IP globally; login 10 failed attempts / 15 min / IP. Off when `NODE_ENV=test`. | `429 RATE_LIMITED` |
| 4 | Parsing | JSON only, 100 kb limit; cookies parsed | `400 VALIDATION_ERROR`, `413 PAYLOAD_TOO_LARGE` |
| 5 | Origin + CSRF | Unsafe methods only: Origin allowlist, then `X-CSRF-Token` check | `403 ORIGIN_NOT_ALLOWED`, `403 CSRF_TOKEN_INVALID` |
| 6 | Authenticate | Verify the `dt_access` JWT, re-read the user | `401 UNAUTHENTICATED` |
| 7 | Authorize | Role `admin` required | `403 FORBIDDEN` |
| 8 | Validate | Params, query, body. Unknown body fields are rejected; unknown query params are ignored. | `400 VALIDATION_ERROR`, `400 INVALID_ID` |
| 9 | Controller → service | Business rules | `404 NOT_FOUND`, `409 DUPLICATE_EMAIL`, `409 DOCTOR_HAS_PATIENTS` |
| 10 | Error handler | Maps known errors to their code. Anything else becomes `500 INTERNAL_ERROR`, with no stack trace in production. | – |

Cheap rejections happen before any database work. Authentication runs before validation, so an
unauthenticated caller learns nothing about protected payloads.

## 9. Authentication, cookies and CSRF

- **Session**: a JWT `{ sub, role }` in the HTTP-only cookie `dt_access` (`Path=/`, `Max-Age` =
  `JWT_EXPIRES_IN`). JavaScript cannot read it. Every authenticated request re-reads the user,
  so a deleted admin loses access immediately.
- **Cookie attributes**: in development `SameSite=Lax` and not `Secure`. In production
  `SameSite=None; Secure`, because the frontend (Vercel) and the API (Render) are on different
  sites. `Domain` is set only when `COOKIE_DOMAIN` is set.
- **CSRF** uses a signed double-submit token:
  1. `GET /api/auth/csrf-token` sets an HTTP-only `dt_csrf` cookie with a random secret. It
     returns `{ csrfToken }`, an HMAC-SHA256 of that secret under a key derived from
     `JWT_SECRET`.
  2. Every `POST`, `PUT`, `PATCH` and `DELETE` must send `X-CSRF-Token: <csrfToken>`, including
     login and logout. The server recomputes the token and compares it in constant time.
  3. Separately, an unsafe request whose `Origin` is not on the allowlist is rejected.
- **CORS**: exact origins only (never `*`), `credentials: true`, headers
  `Content-Type, X-CSRF-Token`, methods `GET, POST, PUT, DELETE, OPTIONS`.
  `http://localhost:3000` and `http://127.0.0.1:3000` are different origins; only the configured
  one is allowed.
- **Accounts**: there is one role, `admin`, and no registration endpoint. The admin is created
  by `npm run seed:admin`.

## 10. API reference

Base URL: `http://localhost:5000/api` locally. IDs are 24-hex ObjectId strings exposed as `id`
(never `_id` or `__v`). Timestamps are ISO-8601 UTC strings.

### Response envelopes

```jsonc
// success
{ "success": true, "message": "optional", "data": { } }
// list
{ "success": true, "data": [ ], "pagination": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 } }
// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "…", "details": [ { "path": "email", "message": "…" } ] } }
```

Status codes: create `201`; `DELETE` returns `200` with `data: null` and a `message`; everything
else `200`. Clients should branch on `error.code`, never on the message text.

| HTTP | `code` | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | Invalid body, query or params. Also used for a `doctorId` that does not exist (`path: "doctorId"`). |
| 400 | `INVALID_ID` | `:id` is not a valid ObjectId |
| 401 | `UNAUTHENTICATED` | Missing, invalid or expired session |
| 401 | `INVALID_CREDENTIALS` | Wrong email or password (same message for both) |
| 403 | `FORBIDDEN` | Role not allowed |
| 403 | `CSRF_TOKEN_INVALID` | Missing or invalid `X-CSRF-Token` |
| 403 | `ORIGIN_NOT_ALLOWED` | Unsafe request from an origin that is not allowed |
| 404 | `NOT_FOUND` | Resource or route does not exist |
| 409 | `DUPLICATE_EMAIL` | Doctor email already in use |
| 409 | `DOCTOR_HAS_PATIENTS` | Deleting a doctor who still has patients (`details[0].message` = count) |
| 413 | `PAYLOAD_TOO_LARGE` | Body over 100 kb |
| 429 | `RATE_LIMITED` | Rate limit exceeded |
| 500 | `INTERNAL_ERROR` | Unexpected error |

### List query parameters (all list endpoints)

| Param | Values | Default |
|---|---|---|
| `page` | integer ≥ 1 (max 1,000,000) | `1` |
| `limit` | 1–100 | `10` |
| `search` | ≤ 100 chars; case-insensitive "contains" | – |
| `sortBy` | per resource | `createdAt` |
| `sortOrder` | `asc` \| `desc` | `desc` (ties broken by `_id`) |
| `from` / `to` | `YYYY-MM-DD`, inclusive days on `createdAt` | – |

Empty values (`?search=`) count as "not provided". A page past the last page returns `data: []`
with the correct `total`.

### Endpoints

Everything except `health`, `auth/csrf-token`, `auth/login` and `auth/logout` requires an
authenticated admin.

| Method | Path | Notes |
|---|---|---|
| GET | `/health` | `{ status, uptime, timestamp, database }`. Returns `503` when the database is down. |
| GET | `/auth/csrf-token` | `{ csrfToken }` + sets `dt_csrf` |
| POST | `/auth/login` | Body `{ email, password }`. Returns `{ user }` + sets `dt_access` |
| POST | `/auth/logout` | Idempotent; clears `dt_access` |
| GET | `/auth/me` | `{ user }` |
| GET | `/doctors` | Filters `specialization`, `hospital`. `search` covers name, email, phone. `sortBy`: `name`, `specialization`, `hospital`, `createdAt` |
| GET | `/doctors/filters` | `{ specializations[], hospitals[] }` (distinct, A→Z) |
| GET | `/doctors/options` | `search?` (name), `limit?` 1–50 (default 20). Feeds the doctor picker. |
| POST | `/doctors` | `{ name, specialization, hospital, phone, email }` (all required) |
| GET | `/doctors/:id` | Includes `patientCount` |
| PUT | `/doctors/:id` | Full replace of the editable fields |
| DELETE | `/doctors/:id` | `409 DOCTOR_HAS_PATIENTS` if any patient is assigned |
| GET | `/doctors/:id/patients` | Same params as `/patients`; `404` if the doctor does not exist |
| POST | `/doctors/:id/patients` | Patient input without `doctorId` |
| GET | `/patients` | Filters `condition`, `doctorId`, `gender`. `search` covers name, email, phone. `sortBy`: `name`, `age`, `condition`, `createdAt` |
| GET | `/patients/filters` | `{ conditions[] }` |
| POST | `/patients` | `{ name, condition, doctorId, age?, gender?, phone?, email?, notes? }` |
| GET | `/patients/:id` | Includes a `doctor` summary `{ id, name, specialization, hospital }` |
| PUT | `/patients/:id` | Full replace; changing `doctorId` reassigns the patient |
| DELETE | `/patients/:id` | |
| GET | `/dashboard/stats` | Totals, this month vs. last month, average patients per doctor (always global) |
| GET | `/dashboard/patient-growth` | `interval=day\|week\|month`, `from`, `to`. Gap-filled time series; weeks start Monday (UTC); max 750 buckets. |
| GET | `/dashboard/patients-per-doctor` | `limit` 1–50, `from`, `to` |
| GET | `/dashboard/condition-distribution` | `limit` 1–20. Remaining conditions are grouped as "Other". |
| GET | `/dashboard/doctor-statistics` | Doctors over time + specialization distribution |
| GET | `/dashboard/recent-activity` | Recent doctors, recent patients, top doctors |

Optional patient fields sent as `""`, `null` or omitted are stored and returned as `null`.

Field rules:
- **Doctor**: `name` 2–100, `specialization` 2–80, `hospital` 2–120 characters. `phone` must match
  `^\+?[0-9\s\-()]{7,20}$`. `email` is unique and stored in lowercase.
- **Patient**: `name` 2–100, `condition` 2–120 characters. `age` is an integer 0–130. `gender` is
  `male`, `female` or `other`. `notes` is at most 2000 characters.

## 11. Data model and indexes

```
User     { id, name, email (unique), passwordHash (never returned), role: "admin" }
Doctor   { id, name, specialization, hospital, phone, email (unique), createdAt, updatedAt }
Patient  { id, doctorId -> Doctor (required), name, condition, age?, gender?, phone?, email?, notes?, createdAt, updatedAt }
```

- The Doctor 1 — N Patient relation is stored on the patient side (`doctorId`) only.
  `Doctor.patientCount` and `Patient.doctor` are computed at read time.
- MongoDB has no foreign keys, so the service layer enforces integrity:
  - A patient's doctor must exist.
  - A doctor who still has patients cannot be deleted. This is a restrict rule, not a cascade.

Indexes (from `src/models/*.model.ts`). Each list index ends in `_id`, so sorted, stable
pagination is served from the index without an in-memory sort:

| Collection | Index | Serves |
|---|---|---|
| users | `{ email: 1 }` unique | login |
| doctors | `{ email: 1 }` unique | duplicate-email enforcement |
| doctors | `{ createdAt: -1, _id: -1 }` | default order, date filter, doctors-over-time, recent doctors |
| doctors | `{ name: 1, _id: 1 }` | sort by name, doctor picker |
| doctors | `{ specialization: 1, createdAt: -1, _id: -1 }` | specialization filter/sort/distinct |
| doctors | `{ hospital: 1, createdAt: -1, _id: -1 }` | hospital filter/sort/distinct |
| patients | `{ doctorId: 1, createdAt: -1, _id: -1 }` | a doctor's patients, per-doctor counts, delete guard |
| patients | `{ condition: 1, createdAt: -1, _id: -1 }` | condition filter/sort/distinct, condition chart |
| patients | `{ createdAt: -1, _id: -1 }` | default order, date filter, growth series, recent patients |
| patients | `{ name: 1, _id: 1 }` | sort by name |
| patients | `{ age: 1, _id: 1 }` | sort by age |

Query patterns:

- **Lists** run one `find` (`lean`, projection, `skip`/`limit`) and one count in parallel. The
  count is `estimatedDocumentCount()` when there is no filter.
- **`patientCount`** for a page of doctors is one covered aggregation. There is no N+1 query.
- **Dashboards** use `$group` + `$dateTrunc` with gap-filling in the service. `$lookup` runs only
  after `$limit`. Independent aggregations run in parallel.

Run `npm run db:explain` to see every query plan.

## 12. Seed data

- `npm run seed:admin` creates the admin from `ADMIN_*`. If the admin exists, it updates the
  name or password, or reports "nothing changed". Re-run it to change the admin's password.
- `npm run seed:demo` inserts 24 doctors (9 specializations, 6 hospitals) and 260 patients (12
  conditions), spread over the last 12 months.
  - A seeded PRNG makes the people identical on every machine.
  - Running it again changes nothing. Add `-- --reset` to re-create the records with fresh dates.
  - Names are invented, emails use `@example.com` and phones use `555-01xx`.
  - Two doctors have no patients, so the delete flow can be demonstrated.

The frontend's Playwright suite and screenshot script default to the admin
`admin@doctortracker.dev` / `Admin@12345`. Use these `ADMIN_*` values locally if you want those
defaults to work. Never use them in production.

## 13. Testing

```bash
docker compose ps        # MongoDB must be healthy
npm test
```

- 5 files and 128 tests (health, auth, doctors, patients, dashboard). They run serially against
  the Docker MongoDB through `MONGODB_URI_TEST`.
- Two guards protect real data:
  - The env loader refuses `NODE_ENV=test` unless the database name ends in `_test`.
  - `tests/setup.ts` checks the name again after connecting.
- Collections are cleaned before and after each test file. Never point `MONGODB_URI_TEST` at
  Atlas.
- The tests cover: security headers, CORS and preflight, CSRF (missing, forged, foreign origin),
  login and cookie attributes, tampered/expired/`alg=none` tokens, `401` on every protected
  route, full CRUD, duplicate email, field-level `details`, pagination, search, every filter and
  sort, the delete guard, reassignment, and every dashboard endpoint with exact numbers.
- The tests do not cover rate limiting (it is off under test), production cookie flags, or the
  `503` health branch. These were checked manually.

Before a pull request:

```bash
npm run typecheck && npm run lint && npm test && npm run build
```

## 14. Deployment (Render + MongoDB Atlas)

Production topology: Vercel (frontend) → Render Web Service (this API) → MongoDB Atlas.
`render.yaml` is a Render blueprint.

1. **Atlas**:
   - Create a cluster.
   - Create a database user with `readWrite` on `doctor_tracker` only.
   - Add Render's outbound IPs to the access list.
   - Use `mongodb+srv://<user>:<password>@<cluster-host>/doctor_tracker?retryWrites=true&w=majority`.
     The database name is required; do not add `authSource`.
2. **Render Web Service**:

   | Setting | Value |
   |---|---|
   | Build command | `npm ci --include=dev && npm run build` (TypeScript is a dev dependency) |
   | Start command | `npm start` |
   | Health check path | `/api/health` |
   | Node version | `22.12.0` (`NODE_VERSION`) |

   Environment variables: `NODE_ENV=production`, `MONGODB_URI`, `JWT_SECRET` (new, ≥ 32 chars),
   `JWT_EXPIRES_IN=1d`, `FRONTEND_URL=https://<vercel-host>` (exact, no trailing slash), and
   `COOKIE_DOMAIN` left empty. Do **not** set `PORT` or `MONGODB_URI_TEST`.

   > `render.yaml` sets `rootDir: doctor-tracker-backend`. That is correct when the backend
   > sits in a subfolder of the deployed repository. If this repository's root *is* the
   > backend, remove that line (or leave Root Directory empty in the dashboard).
3. **Seed the production admin** from a local checkout, against Atlas. Shell variables take
   precedence over `.env`:

   ```bash
   MONGODB_URI='<atlas-uri>' ADMIN_NAME='<name>' ADMIN_EMAIL='<email>' ADMIN_PASSWORD='<password>' npm run seed:admin
   ```

   On the Render shell, use `npm run seed:admin:prod`. `seed:demo` refuses to run in
   production.
4. After the frontend is deployed, set `FRONTEND_URL` to its exact origin and redeploy.

Free-tier instances sleep when idle, and the first request after that can take about a minute.
Some browsers (Safari, private windows) block cross-site cookies. For those, use a shared parent
domain with `COOKIE_DOMAIN`, or the frontend's same-origin rewrite mode (`API_PROXY_TARGET`).
The full guide, with a curl verification checklist, is `documentation/DEPLOYMENT.md`.

## 15. Security measures

- **Passwords**:
  - Hashed with bcrypt (`bcryptjs`), cost 12. `password` is `select: false`.
  - Login gives the same error for an unknown email and a wrong password.
  - A dummy hash comparison hides whether an account exists through timing.
- **Session**:
  - JWT pinned to HS256 (`alg=none` is rejected), carrying only `{ sub, role }`, in an HTTP-only
    cookie.
  - The payload shape is validated.
  - The user is re-read on every request.
- **CSRF and origins**: signed double-submit token plus an Origin allowlist on every unsafe
  method.
- **CORS**: exact-origin allowlist with credentials.
- **Input**:
  - Zod validates every body, query and param, and bodies are strict.
  - Search input is regex-escaped. Filter values are validated strings, so query-operator
    injection is not possible.
  - Bodies are limited to 100 kb.
- **Headers and transport**: Helmet defaults, `Cache-Control: no-store`, and `trust proxy = 1` in
  production so per-IP limits see the real client.
- **Rate limiting**: 300 req/min/IP globally, and 10 failed logins per 15 minutes per IP.
- **Errors**: one handler, a uniform envelope, and no stack traces or internal details in
  production.
- **Secrets**:
  - Kept only in the git-ignored `.env`.
  - Logs show variable names and the database name, never values or connection strings.

## 16. Known limitations

- **Search** is an unanchored, case-insensitive regex, which is linear in collection size. A text
  index or Atlas Search is the way to scale it.
- **Offset pagination**: `skip` cost grows with the page number.
- **Doctor deletion** is check-then-delete without a transaction, because a standalone MongoDB
  has no multi-document transactions. A patient created in that gap could be orphaned; it is
  then shown with a placeholder doctor.
- **Sessions are stateless.** Logout clears the cookie, but a copied token stays valid until it
  expires. There is no revocation list.
- **Rate-limit counters** are in memory: per process, and reset on restart.
- **`autoIndex`** is on, so indexes are built at startup. With large data this should become a
  deploy step.
- **Request logs** (morgan) include query strings, so search terms appear in logs.

## 17. Troubleshooting

| Symptom | Fix |
|---|---|
| `required variable MONGO_INITDB_ROOT_USERNAME is missing a value` | `.env` is missing or the `MONGO_*` variables are empty. Check with `docker compose config`. |
| Port 27017 already in use | Set `MONGO_PORT=27018` (for example), run `docker compose up -d mongodb`, and change the port in both URIs. |
| `Authentication failed` (code 18) after changing the password in `.env` | `MONGO_INITDB_*` applies only on first initialisation. Put the old password back, or change it inside MongoDB with `db.getSiblingDB("admin").changeUserPassword("<user>", passwordPrompt())` and then update `.env`. |
| `Authentication failed` with the right password | Missing `authSource=admin`, or special characters are not URL-encoded. |
| `ECONNREFUSED ::1:27017` | Use `127.0.0.1` instead of `localhost` in the URI. |
| `ECONNREFUSED 127.0.0.1:27017` / `MongooseServerSelectionError` | MongoDB is not running or not yet `healthy`: `docker compose ps`. |
| Container `unhealthy` | `.env` no longer matches the password stored in the volume (see above). Inspect with `docker compose logs --tail 100 mongodb`. |
| `Cannot connect to the Docker daemon` | Start Docker Desktop. |
| Browser CORS error | `FRONTEND_URL` must equal the page origin exactly. Restart the backend after editing `.env`. |
| Login `200`, then `401` | Page and API use different host names (`127.0.0.1` vs `localhost`). Use `localhost` for both. |
| `403 CSRF_TOKEN_INVALID` everywhere | The `dt_csrf` cookie is not reaching the API (same causes as above), or the request is sent without credentials. |
| `429 RATE_LIMITED` on login | 10 failed logins in 15 minutes. Wait, or restart the backend (in-memory counters). |
| Tests refuse to start | `MONGODB_URI_TEST` is missing or its database name does not end in `_test`. |
