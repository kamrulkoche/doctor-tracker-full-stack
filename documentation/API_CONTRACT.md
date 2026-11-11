# Doctor Tracker — API Contract (v1)

Owner: Lead Architect. The Backend Agent **implements** this; the Frontend Agent **consumes** it.
Neither may deviate without the Lead Architect updating this file first.

Architecture: `Next.js frontend (port 3000) → REST/JSON → Express backend (port 5000) → MongoDB (Docker, 127.0.0.1:27017)`

## 1. Conventions

- Base URL: `http://localhost:5000/api` locally. The frontend reads it from `NEXT_PUBLIC_API_URL`.
- JSON only (`Content-Type: application/json`). Body limit 100kb.
- Every request from the browser is sent with credentials (`withCredentials: true`).
- IDs are 24-hex MongoDB ObjectId strings, exposed as `id` (never `_id`, never `__v`).
- Timestamps are ISO-8601 UTC strings (`createdAt`, `updatedAt`).
- Optional patient fields that are unset are returned as `null` (never omitted).
- Unknown body fields are rejected (`VALIDATION_ERROR`); unknown query params are ignored.

### Success envelope

```jsonc
{ "success": true, "message": "optional human text", "data": <payload> }
// list endpoints add:
{ "success": true, "data": [ ... ], "pagination": { "page": 1, "limit": 10, "total": 0, "totalPages": 0 } }
```

`POST` create → `201`. `DELETE` → `200` with `"data": null` and a `message`. Everything else → `200`.

### Error envelope

```jsonc
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [ { "path": "email", "message": "Enter a valid email address" } ]  // optional
  }
}
```

| HTTP | code | When |
|---|---|---|
| 400 | `VALIDATION_ERROR` | body/query/params fail validation. `details[].path` is the field name (dot path). Also used when `doctorId` refers to a doctor that does not exist (`path: "doctorId"`). |
| 400 | `INVALID_ID` | `:id` is not a valid ObjectId |
| 401 | `UNAUTHENTICATED` | missing/invalid/expired session cookie |
| 401 | `INVALID_CREDENTIALS` | wrong email or password (same message for both) |
| 403 | `FORBIDDEN` | authenticated but role not allowed |
| 403 | `CSRF_TOKEN_INVALID` | missing/invalid `X-CSRF-Token` on an unsafe method |
| 403 | `ORIGIN_NOT_ALLOWED` | unsafe method from an `Origin` not in the allowlist |
| 404 | `NOT_FOUND` | resource or route does not exist |
| 409 | `DUPLICATE_EMAIL` | doctor email already in use (`details: [{ path: "email", ... }]`) |
| 409 | `DOCTOR_HAS_PATIENTS` | deleting a doctor who still has patients. `message` states the count and that patients must be reassigned or removed first. `details: [{ path: "patientCount", message: "<n>" }]` |
| 429 | `RATE_LIMITED` | rate limit exceeded |
| 500 | `INTERNAL_ERROR` | anything unexpected (no stack/internal detail in production) |

## 2. Authentication, cookies, CSRF

- Session = JWT in an **HTTP-only** cookie `dt_access` (`Path=/`). Payload `{ sub, role }`, lifetime `JWT_EXPIRES_IN` (default `1d`); cookie `Max-Age` matches.
- Cookie attributes: development → `SameSite=Lax`, `Secure=false`. Production → `SameSite=None`, `Secure=true` (cross-site Vercel ↔ Render). `Domain` only if `COOKIE_DOMAIN` is set.
- CORS: exact-origin allowlist from `FRONTEND_URL` (comma-separated list allowed), `credentials: true`, allowed headers `Content-Type, X-CSRF-Token`, methods `GET,POST,PUT,DELETE,OPTIONS`.
- **CSRF** (signed double-submit, works cross-site because the token travels in the response body, which only an allowed CORS origin can read):
  1. `GET /api/auth/csrf-token` sets an HTTP-only cookie `dt_csrf` holding a random secret (same attributes as `dt_access`, reused if already present) and returns `{ csrfToken }` where `csrfToken = HMAC-SHA256(secret, key derived from JWT_SECRET)`.
  2. Every `POST`/`PUT`/`PATCH`/`DELETE` (**including login and logout**) must send header `X-CSRF-Token: <csrfToken>`. Server recomputes the HMAC from the `dt_csrf` cookie and compares in constant time; mismatch → `403 CSRF_TOKEN_INVALID`.
  3. In addition, unsafe methods with an `Origin` header not in the allowlist → `403 ORIGIN_NOT_ALLOWED`.
  - Frontend client behaviour: keep the token in memory; fetch it lazily before the first unsafe request; on `403 CSRF_TOKEN_INVALID` refetch the token and retry the request **once**.
- On any `401 UNAUTHENTICATED` from a non-auth endpoint the frontend clears cached user state and redirects to `/login?next=<path>`.
- Roles: only `admin` exists. Every route below except health, csrf-token and login requires an authenticated `admin`.
- Rate limits: global `300 req / min / IP`; `POST /auth/login` `10 attempts / 15 min / IP` (successful logins do not count). Limits are disabled when `NODE_ENV=test`.

### Endpoints

| Method | Path | Auth | Body | `data` |
|---|---|---|---|---|
| GET | `/health` | – | – | `{ status: "ok", uptime: number, timestamp: string, database: "connected" \| "disconnected" }` (503 when DB is not connected) |
| GET | `/auth/csrf-token` | – | – | `{ csrfToken: string }` |
| POST | `/auth/login` | – | `{ email, password }` | `{ user: User }` + sets `dt_access` |
| POST | `/auth/logout` | – (idempotent) | – | `null` + clears `dt_access` |
| GET | `/auth/me` | ✔ | – | `{ user: User }` |

```ts
type User = { id: string; name: string; email: string; role: "admin" };
```

There is **no** registration endpoint. Admins are created by the seed script.

## 3. Shared query conventions (all list endpoints)

| Param | Type | Default | Notes |
|---|---|---|---|
| `page` | int ≥ 1 | `1` | |
| `limit` | int 1–100 | `10` | |
| `search` | string ≤ 100 | – | trimmed; case-insensitive "contains" across the documented fields |
| `sortBy` | enum (per resource) | `createdAt` | |
| `sortOrder` | `asc` \| `desc` | `desc` | ties broken by `_id` for stable pages |
| `from` | `YYYY-MM-DD` | – | `createdAt >= from 00:00:00.000Z` |
| `to` | `YYYY-MM-DD` | – | `createdAt <= to 23:59:59.999Z` (inclusive day). `from > to` → `VALIDATION_ERROR` |

A page beyond the last returns `data: []` with the correct `pagination.total`.

## 4. Doctors

```ts
type Doctor = {
  id: string;
  name: string;            // 2–100 chars
  specialization: string;  // 2–80
  hospital: string;        // 2–120
  phone: string;           // /^\+?[0-9\s\-()]{7,20}$/
  email: string;           // valid email, stored lowercase, unique
  patientCount: number;    // number of assigned patients (present on list + detail + create/update responses)
  createdAt: string;
  updatedAt: string;
};
type DoctorInput = Pick<Doctor, "name" | "specialization" | "hospital" | "phone" | "email">; // all required, strings trimmed
```

| Method | Path | Body / Query | `data` |
|---|---|---|---|
| GET | `/doctors` | shared params + `specialization` (exact), `hospital` (exact). `search` matches name, email, phone. `sortBy`: `name` \| `specialization` \| `hospital` \| `createdAt` | `Doctor[]` + `pagination` |
| GET | `/doctors/filters` | – | `{ specializations: string[], hospitals: string[] }` (distinct, sorted A→Z) |
| GET | `/doctors/options` | `search?` (name contains), `limit?` (1–50, default 20) | `DoctorOption[]` sorted by name — for the "assigned doctor" picker |
| POST | `/doctors` | `DoctorInput` | `Doctor` (201) |
| GET | `/doctors/:id` | – | `Doctor` |
| PUT | `/doctors/:id` | `DoctorInput` (full replace of editable fields) | `Doctor` |
| DELETE | `/doctors/:id` | – | `null`; `409 DOCTOR_HAS_PATIENTS` if any patient is assigned |
| GET | `/doctors/:id/patients` | same params as `GET /patients` except `doctorId` | `Patient[]` + `pagination` (404 if doctor missing) |
| POST | `/doctors/:id/patients` | `PatientInput` **without** `doctorId` | `Patient` (201) (404 if doctor missing) |

```ts
type DoctorOption = { id: string; name: string; specialization: string; hospital: string };
```

Deleting a patient from a doctor's list uses `DELETE /patients/:id`.

## 5. Patients

```ts
type Gender = "male" | "female" | "other";
type Patient = {
  id: string;
  name: string;               // 2–100, required
  age: number | null;         // integer 0–130
  gender: Gender | null;
  phone: string | null;       // same pattern as doctor phone
  email: string | null;       // valid email, lowercase (not unique)
  condition: string;          // 2–120, required
  notes: string | null;       // ≤ 2000
  doctor: { id: string; name: string; specialization: string; hospital: string }; // always present
  createdAt: string;
  updatedAt: string;
};
type PatientInput = {
  name: string;
  condition: string;
  doctorId: string;           // required; must reference an existing doctor
  age?: number | null;
  gender?: Gender | null;
  phone?: string | null;
  email?: string | null;
  notes?: string | null;
};
```

Optional fields: `""`, `null` or omitted all mean "unset" and are stored/returned as `null`.

| Method | Path | Body / Query | `data` |
|---|---|---|---|
| GET | `/patients` | shared params + `condition` (exact), `doctorId` (ObjectId), `gender`. `search` matches name, email, phone. `sortBy`: `name` \| `age` \| `condition` \| `createdAt` | `Patient[]` + `pagination` |
| GET | `/patients/filters` | – | `{ conditions: string[] }` (distinct, sorted A→Z) |
| POST | `/patients` | `PatientInput` | `Patient` (201) |
| GET | `/patients/:id` | – | `Patient` |
| PUT | `/patients/:id` | `PatientInput` (full replace; changing `doctorId` reassigns the patient) | `Patient` |
| DELETE | `/patients/:id` | – | `null` |

## 6. Dashboard

All dashboard endpoints accept optional `from` / `to` (`YYYY-MM-DD`, same semantics as §3) applied to the
relevant `createdAt`. All numbers come from MongoDB aggregations. Empty datasets return zeros / empty arrays, never errors.

| Path | Query | `data` |
|---|---|---|
| `GET /dashboard/stats` | – (always global, ignores range) | `DashboardStats` |
| `GET /dashboard/patient-growth` | `interval`: `day` \| `week` \| `month` (default `month`), `from`, `to`. Default range when omitted: day → last 30 days, week → last 12 weeks, month → last 12 months | `TimeSeries` |
| `GET /dashboard/patients-per-doctor` | `limit` 1–50 (default 10), `from`, `to` (patient `createdAt`) | `DoctorPatientCount[]` sorted by `patientCount` desc, then name |
| `GET /dashboard/condition-distribution` | `limit` 1–20 (default 5), `from`, `to` | `ConditionDistribution` |
| `GET /dashboard/doctor-statistics` | `interval` (default `month`), `from`, `to` (doctor `createdAt`, same default ranges) | `DoctorStatistics` |
| `GET /dashboard/recent-activity` | `limit` 1–20 (default 5) | `RecentActivity` |

```ts
type DashboardStats = {
  totalDoctors: number;
  totalPatients: number;
  totalSpecializations: number;      // distinct doctor specializations
  newPatientsThisMonth: number;      // current UTC calendar month
  newPatientsLastMonth: number;      // previous UTC calendar month (for the trend delta)
  newDoctorsThisMonth: number;
  averagePatientsPerDoctor: number;  // rounded to 1 decimal, 0 when no doctors
};

type TimeSeriesPoint = { date: string /* ISO, UTC start of bucket */; count: number; cumulative: number /* running total within the range */ };
type TimeSeries = {
  interval: "day" | "week" | "month";
  from: string;  // ISO start of first bucket
  to: string;    // ISO end of range
  total: number; // sum of counts in range
  points: TimeSeriesPoint[]; // gap-filled: every bucket in range is present, zero when empty. Weeks start Monday (UTC).
};

type DoctorPatientCount = { doctorId: string; name: string; specialization: string; hospital: string; patientCount: number };

type ConditionDistribution = {
  total: number;
  items: { condition: string; count: number; percentage: number /* 0–100, 1 decimal */ }[];
  // top `limit` conditions sorted desc; the remainder is collapsed into a final { condition: "Other" } item when non-zero
};

type DoctorStatistics = {
  doctorsOverTime: TimeSeries;
  specializationDistribution: { specialization: string; doctorCount: number; patientCount: number }[]; // sorted by doctorCount desc, then name
};

type RecentActivity = {
  recentDoctors: Pick<Doctor, "id" | "name" | "specialization" | "hospital" | "createdAt">[];
  recentPatients: Pick<Patient, "id" | "name" | "condition" | "doctor" | "createdAt">[];
  topDoctors: DoctorPatientCount[]; // by all-time patient count
};
```

## 7. Environment

Backend `.env` (see `doctor-tracker-backend/.env.example`):

```
NODE_ENV=development
PORT=5000
MONGODB_URI=mongodb://<user>:<password>@127.0.0.1:27017/doctor_tracker?authSource=admin
MONGODB_URI_TEST=mongodb://<user>:<password>@127.0.0.1:27017/doctor_tracker_test?authSource=admin
JWT_SECRET=            # ≥ 32 chars
JWT_EXPIRES_IN=1d
FRONTEND_URL=http://localhost:3000
COOKIE_DOMAIN=
ADMIN_NAME=
ADMIN_EMAIL=
ADMIN_PASSWORD=
```

Frontend `.env.local`: `NEXT_PUBLIC_API_URL=http://localhost:5000/api`

Backend scripts (npm): `dev`, `build`, `start`, `typecheck`, `lint`, `test`, `seed:admin` (idempotent upsert of the admin from `ADMIN_*`),
`seed:demo` (idempotent fictional doctors + patients spread across the last 12 months; refuses to run when `NODE_ENV=production`), `db:explain` (prints query plans for the key list queries).

Automated backend tests run against the **Dockerized** MongoDB using `MONGODB_URI_TEST` (a separate `doctor_tracker_test` database that tests may wipe). They must refuse to run if the database name does not end in `_test`.

## 8. Change log

- v1 — initial contract.
- v1.1 — accepted by the Lead Architect after backend implementation (full list: `BACKEND_HANDOFF.md` §6):
  - New error: `413 PAYLOAD_TOO_LARGE` for request bodies over 100kb.
  - Time series are capped at 750 buckets; a wider `from`/`to` for the chosen `interval` returns `VALIDATION_ERROR` on `from`.
  - `/health` with the database down: HTTP 503, `success: false`, `database: "disconnected"`.
  - `/dashboard/patients-per-doctor` omits doctors with zero patients in range.
  - `/dashboard/doctor-statistics`: `specializationDistribution` is narrowed by `from`/`to` only when they are sent; its `patientCount` is all-time.
  - Unsafe requests without a valid CSRF token return `403 CSRF_TOKEN_INVALID` before authentication is evaluated.
  - CORS/Origin allowlist is exact: `http://localhost:3000` is allowed locally, `http://127.0.0.1:3000` is not.
  - Indexes carry an `_id` suffix (e.g. `{ createdAt: -1, _id: -1 }`) so sort-stable pagination is served from the index without an in-memory sort.
