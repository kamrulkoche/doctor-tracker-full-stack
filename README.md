# Doctor Tracker

Doctor Tracker is a secure admin web application. A signed-in admin uses it to:

- manage **doctors** and the **patients** assigned to them,
- search, filter and paginate both lists,
- view an analytics **dashboard** with charts.

There is also a public marketing site.

The system has two independent applications that talk over REST, plus MongoDB:

```
Browser ──► Next.js frontend (port 3000) ──REST/JSON──► Express API (port 5000) ──► MongoDB
            doctor-tracker-frontend                     doctor-tracker-backend      Docker locally / Atlas in production
```

| Folder | What it is | Details |
|---|---|---|
| [`doctor-tracker-backend/`](doctor-tracker-backend/) | Express 5 + TypeScript + Mongoose REST API. It handles auth, validation, business rules and aggregations, and it is the only part that talks to MongoDB. It also holds the `docker-compose.yml` for the local MongoDB. | [Backend README](doctor-tracker-backend/README.md) |
| [`doctor-tracker-frontend/`](doctor-tracker-frontend/) | Next.js 16 + React 19 client: the admin UI and the marketing site. It holds no business logic and has no database access. | [Frontend README](doctor-tracker-frontend/README.md) |
| [`documentation/`](documentation/) | Architecture, API contract, local setup, deployment, design system, reviews | [see below](#documentation) |

Each application is its own git repository, with its own build, environment file and host.

---

## Features

**Authentication and security**
- Only admins can sign in. There is no registration; the admin account comes from a seed script.
- The session is a JWT in an HTTP-only cookie. JavaScript cannot read it.
- CSRF protection uses a signed double-submit token plus an Origin allowlist.
- CORS allows exact origins only. Login attempts and overall traffic are rate-limited.
- Every protected API route checks the session and the `admin` role.

**Doctors**
- Create, view, edit and delete doctors (name, specialization, hospital, phone, unique email).
- Search by name, email or phone. Filter by specialization, hospital and date range. Sort and
  paginate.
- A doctor page lists that doctor's patients. Patients can be added and removed there.
- A doctor who still has patients cannot be deleted. The UI explains why and links to those
  patients.

**Patients**
- A dedicated patient list with search, filters (condition, doctor, gender, date range), sorting
  and pagination.
- Create, edit, reassign to another doctor, and delete.

**Dashboard**
- Stat cards: total doctors, total patients, new this month and the trend, average patients per
  doctor.
- Charts: patient growth (day, week or month), patients per doctor, condition distribution,
  doctors over time, specialization distribution.
- Recent doctors, recent patients and top doctors.
- A date range (preset or custom) that is kept in the URL.
- All numbers come from MongoDB aggregations on the server.

**UX**
- Every list view can be rebuilt from its URL: reload, Back/Forward and shared links all work.
- Skeleton loading states, empty and error states, toasts, and form errors shown on the right
  field.
- Light and dark themes. Responsive layout with a mobile drawer, card-style tables and bottom
  sheets.

**Performance**
- Search, filtering, sorting and pagination run in the database. The browser never downloads a
  full collection.
- Compound indexes ending in `_id` serve every list. `npm run db:explain` shows each query plan.
- On the client, TanStack Query caches data, only affected queries are refetched, components are
  memoized, and charts are lazy-loaded.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS 4, shadcn/ui (Radix), TanStack Query 5, Axios, React Hook Form + Zod, Recharts |
| Backend | Node.js (≥ 20.11), Express 5, TypeScript, Mongoose 9, Zod 4, jsonwebtoken, bcryptjs, helmet, express-rate-limit |
| Database | MongoDB 8.0: Docker locally, MongoDB Atlas in production |
| Testing | Backend: Vitest + Supertest against a real MongoDB. Frontend: Vitest (unit) and Playwright (end-to-end at 3 viewports). |
| Hosting (planned) | Vercel (frontend), Render (backend), MongoDB Atlas |

## Quick start (local)

You need Node.js 20.11+ and npm, plus Docker Desktop running.

**1. Database and backend**, in `doctor-tracker-backend/`:

```bash
cp .env.example .env              # fill in MONGO_*, MONGODB_URI(_TEST), JWT_SECRET, ADMIN_*
docker compose up -d mongodb      # wait until `docker compose ps` shows "healthy"
npm install
npm run seed:admin                # creates the admin login from ADMIN_*
npm run seed:demo                 # optional: 24 demo doctors, 260 demo patients
npm run dev                       # http://localhost:5000/api
```

Generate a `JWT_SECRET` with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

**2. Frontend**, in `doctor-tracker-frontend/`:

```bash
cp .env.example .env.local        # NEXT_PUBLIC_API_URL=http://localhost:5000/api
npm install
npm run dev                       # http://localhost:3000
```

**3. Sign in.** Open **`http://localhost:3000`** and sign in with `ADMIN_EMAIL` /
`ADMIN_PASSWORD`. Use `localhost`, not `127.0.0.1`: the API allows the exact origin
`http://localhost:3000` only.

**To stop:** press `Ctrl+C` in both terminals, then run `docker compose down` in
`doctor-tracker-backend/`. The data is kept in a Docker volume. `docker compose down -v`
**deletes** it.

The step-by-step guide, with MongoDB credentials, rotation and troubleshooting, is
[documentation/LOCAL_DEVELOPMENT.md](documentation/LOCAL_DEVELOPMENT.md).

## Environment files

Each file is git-ignored, and each has a committed `.env.example` template.

| File | Read by | Contains |
|---|---|---|
| `doctor-tracker-backend/.env` | Backend and Docker Compose | `NODE_ENV`, `PORT`, `MONGODB_URI`, `MONGODB_URI_TEST`, `JWT_SECRET`, `JWT_EXPIRES_IN`, `FRONTEND_URL`, `COOKIE_DOMAIN`, `ADMIN_*`, and for Docker `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD`, `MONGO_INITDB_DATABASE`, `MONGO_PORT` |
| `doctor-tracker-frontend/.env.local` | Next.js | `NEXT_PUBLIC_API_URL`, optional `API_PROXY_TARGET`, optional `E2E_*` |

Never commit real values. In production the same variables are set in the Render and Vercel
dashboards.

## Common commands

| Where | Command | Purpose |
|---|---|---|
| backend | `npm run dev` / `build` / `start` | Run, compile, run compiled |
| backend | `npm run typecheck` / `lint` / `test` | Quality checks. The tests need MongoDB and `MONGODB_URI_TEST` ending in `_test`. |
| backend | `npm run seed:admin` / `seed:demo` | Create or update the admin; load demo data (refused in production) |
| backend | `npm run db:explain` / `db:bench` | Query plans; scale benchmark (200k patients, in a throwaway database) |
| backend | `docker compose up -d mongodb` / `ps` / `logs -f mongodb` / `down` | Local database |
| frontend | `npm run dev` / `build` / `start` | Run, production build, serve build |
| frontend | `npm run typecheck` / `lint` / `test` | Quality checks and unit tests |
| frontend | `npm run e2e` | Playwright. Needs the app and the API running. |
| frontend | `npm run screenshots` | Regenerate `docs/screenshots/` |

## Architecture in brief

- **REST API** under `/api`. Every response is either
  `{ success: true, data, message?, pagination? }` or
  `{ success: false, error: { code, message, details? } }`. Clients branch on `error.code`.
- **Backend layers**: routes → middleware → controllers → services → Mongoose models, with one
  central error handler. The middleware runs in this order:
  1. helmet
  2. CORS
  3. rate limit
  4. parsing
  5. Origin and CSRF check
  6. authenticate
  7. authorize
  8. validate
- **Data model**: `User` (admin), `Doctor`, and `Patient`, which references `doctorId`.
  `Doctor.patientCount` and `Patient.doctor` are computed when read. Integrity rules (the doctor
  must exist; no deleting a doctor who has patients) are enforced in the service layer.
- **Frontend layers**: `app → features → components / hooks / services / lib → types`. TanStack
  Query owns server data and the URL owns list state. The auth guard runs on the client, because
  the session cookie belongs to the API origin.

Diagrams (topology, auth sequence, ER model, data flow) are in
[documentation/ARCHITECTURE.md](documentation/ARCHITECTURE.md).

## Deployment

The target is **Vercel** (frontend) → **Render** (backend) → **MongoDB Atlas**. Nothing has been
deployed yet.

The order matters, because each side needs the other's URL:

1. Push both repositories.
2. Create the Atlas cluster and a least-privilege user.
3. Deploy the backend on Render with a provisional `FRONTEND_URL`.
4. Deploy the frontend on Vercel with `NEXT_PUBLIC_API_URL=https://<render-host>/api`.
5. Set `FRONTEND_URL` on Render to the exact Vercel origin.
6. Seed the production admin.
7. Run the verification checklist.

In production, cookies are `SameSite=None; Secure`. For browsers that block third-party cookies
(Safari, private windows), use the frontend's same-origin rewrite mode (`API_PROXY_TARGET`) or a
shared parent domain.

The full guide is [documentation/DEPLOYMENT.md](documentation/DEPLOYMENT.md).

## Documentation

| Document | Contents |
|---|---|
| [ARCHITECTURE.md](documentation/ARCHITECTURE.md) | System overview, topologies, auth sequence, request lifecycle, data model, frontend data flow, environment separation |
| [API_CONTRACT.md](documentation/API_CONTRACT.md) | Authoritative endpoint list, envelopes, error codes, query conventions, types |
| [LOCAL_DEVELOPMENT.md](documentation/LOCAL_DEVELOPMENT.md) | Docker MongoDB, connection strings, credential rotation, app user, startup order, troubleshooting |
| [DEPLOYMENT.md](documentation/DEPLOYMENT.md) | GitHub, Atlas, Render, Vercel, cross-site cookies, verification checklist |
| [DESIGN_SYSTEM.md](documentation/DESIGN_SYSTEM.md) | Tokens, typography, components, chart rules, page blueprints |
| [DATABASE_REVIEW.md](documentation/DATABASE_REVIEW.md) | Index and query audit at 2,000 doctors / 200,000 patients |
| [BACKEND_HANDOFF.md](documentation/BACKEND_HANDOFF.md) | Backend implementation notes, contract interpretations, query plans, test summary |
| [FRONTEND_HANDOFF.md](documentation/FRONTEND_HANDOFF.md) | Frontend implementation notes, component inventory, caching, verification results |
| [PDF_REQUIREMENTS_TRACEABILITY.md](documentation/PDF_REQUIREMENTS_TRACEABILITY.md) | Each assignment requirement mapped to code and verification |
| [IMPLEMENTATION_STATUS.md](documentation/IMPLEMENTATION_STATUS.md) | Build stages and status |

## Known limitations

- **Search** uses a case-insensitive "contains" regex, which scans linearly. It is fine at this
  scale; a text index or Atlas Search is the way to scale it.
- **Pagination** is offset-based.
- **Doctor delete** has a small race window with no transaction (standalone MongoDB).
- **Sessions** are stateless JWTs with no revocation list. Rate-limit counters are kept in memory.
- **The route guard** is client-side. It is a UX gate; the API is the real enforcement.
- **The marketing contact form** is a demo and sends nothing.
