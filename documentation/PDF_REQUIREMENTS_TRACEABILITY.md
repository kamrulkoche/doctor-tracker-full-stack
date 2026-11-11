# PDF Requirements Traceability

Source of truth: `Fullstack_Task_Frontend_Focused.pdf` (7 pages, text only — it contains no mockups, screenshots or diagrams).
Every requirement in the PDF is listed below with its page, owning agent, implementation location and verification status.

Status legend: **Planned** → **Implemented** (code exists) → **Verified** (executed and observed working; evidence in `QA_REPORT.md`). Items that cannot be completed are marked **Blocked** with a reason.

Owners: LA = Lead Architect, BE = Backend Agent, FE = Frontend Agent, UX = UI/UX Agent, DB = Database & Performance Agent, QA = QA Agent, DOC = Documentation & Deployment Agent.

## Conflict noted in the PDF

Page 5, §6 "Tech Stack": the PDF's hidden text layer still contains an older draft ("Next.js full-stack… Express integrated within Next.js architecture"), while the **rendered** page shows only the updated wording: *Frontend: Next.js (separate client application); Backend: Node.js, Express (separate standalone server); Database: MongoDB; RESTful API*. Resolution (LA): follow the rendered/updated text — two separate applications communicating over REST. No backend business logic lives in Next.js route handlers.

## Requirements

| ID | Page | Requirement (PDF wording) | Owner | Implementation | Verification | Status |
|---|---|---|---|---|---|---|
| R1 | 1 | Secure administrative web application; authenticated users manage doctors and their patients | LA | whole system | end-to-end run | Planned |
| R2 | 1 | Focus on performance optimization, clean UX, data visualization | LA/DB/UX | see R24–R31, R17–R23 | QA + DB + UX audits | Planned |
| R3 | 1 | Only authenticated users can access the portal | BE/FE | BE `middleware/authenticate.ts`; FE `(dashboard)/layout` guard | API tests (401) + e2e redirect | Planned |
| R4 | 1 | Implement secure login functionality | BE/FE | BE `modules/auth`; FE `(auth)/login` | API tests + e2e | Planned |
| R5 | 1 | Protect all routes using proper authentication and authorization mechanisms | BE/FE | BE `authenticate` + `authorize('admin')` on every router; FE guard | API tests over every router | Planned |
| R6 | 1–2 | Create a doctor with Name, specialization, hospital, Phone, Email | BE/FE | `POST /api/doctors`; FE doctor form dialog | API test + e2e | Planned |
| R7 | 2 | View a list of all doctors | BE/FE | `GET /api/doctors`; FE `/doctors` | API test + e2e | Planned |
| R8 | 2 | Search doctors | BE/FE | `search` param (name/email/phone); FE SearchInput | API test + e2e | Planned |
| R9 | 2 | Filter doctors (date-wise and other relevant filters) | BE/FE | `from`/`to`, `specialization`, `hospital`; FE filters bar | API test + e2e | Planned |
| R10 | 2 | Paginate doctor records | BE/FE | `page`/`limit` + `pagination`; FE Pagination | API test + e2e | Planned |
| R11 | 2 | View corresponding patients for each doctor | BE/FE | `GET /api/doctors/:id/patients`; FE `/doctors/[id]` | API test + e2e | Planned |
| R12 | 2 | Add new patients under a specific doctor | BE/FE | `POST /api/doctors/:id/patients`; FE doctor detail "Add patient" | API test + e2e | Planned |
| R13 | 2 | Delete patients from the doctor's patient list | BE/FE | `DELETE /api/patients/:id`; FE doctor detail row action | API test + e2e | Planned |
| R14 | 2 | Dedicated Patient Page: list all patients | BE/FE | `GET /api/patients`; FE `/patients` | API test + e2e | Planned |
| R15 | 2 | Edit patient information | BE/FE | `PUT /api/patients/:id`; FE patient form dialog | API test + e2e | Planned |
| R16 | 2 | Delete patients | BE/FE | `DELETE /api/patients/:id`; FE confirmation dialog | API test + e2e | Planned |
| R17 | 3 | Patients: pagination | BE/FE | `page`/`limit`; FE Pagination | API test + e2e | Planned |
| R18 | 3 | Patients: search functionality | BE/FE | `search` (name/email/phone) | API test + e2e | Planned |
| R19 | 3 | Patients: filtering (date-wise, patient-condition and other relevant filters) | BE/FE | `from`/`to`, `condition`, `doctorId`, `gender` | API test + e2e | Planned |
| R20 | 3 | Dashboard: visual representation of data | FE | `/dashboard` Recharts widgets | e2e + screenshots | Planned |
| R21 | 3 | Analytics: total doctors, total patients | BE/FE | `GET /api/dashboard/stats`; StatCards | API test (exact numbers) + e2e | Planned |
| R22 | 3 | Analytics: patients per doctor | BE/FE | `GET /api/dashboard/patients-per-doctor`; bar chart | API test + e2e | Planned |
| R23 | 3 | Analytics: date-based statistics | BE/FE | `patient-growth`, `doctor-statistics` (+ date-range filter) | API test + e2e | Planned |
| R24 | 3 | Charts and graphs (any suitable analytics library) | FE | Recharts | screenshots | Planned |
| R25 | 3 | Clean data aggregation; optimized query performance; meaningful visual insights | BE/DB/UX | `dashboard.service.ts` aggregation pipelines | DB audit (`explain`) | Planned |
| R26 | 4 | UI modern and visually appealing; demonstrate strong frontend skills | UX/FE | `DESIGN_SYSTEM.md` → FE implementation | UX visual audit | Planned |
| R27 | 4 | Clean layout; proper spacing and hierarchy | UX/FE | design tokens, shell, page blueprints | UX visual audit | Planned |
| R28 | 4 | Responsive design | FE | mobile drawer, table→cards, responsive charts | Playwright at 3 viewports, overflow check | Planned |
| R29 | 4 | Smooth navigation; good UX (best practices) | FE | client routing, skeletons, toasts, URL state | e2e + UX audit | Planned |
| R30 | 4 | Clear navigation between Dashboard, Doctors, Patients | FE | Sidebar + breadcrumb + mobile drawer | e2e | Planned |
| R31 | 4–5 | Optimize database queries for searching, filtering, pagination | BE/DB | lean/projection/skip-limit/count strategy | `db:explain` output | Planned |
| R32 | 5 | Proper indexing in MongoDB | BE/DB | schema indexes in `models/*.model.ts` | index listing + `explain` | Planned |
| R33 | 5 | Efficient query patterns | BE/DB | services | DB audit | Planned |
| R34 | 5 | Avoid unnecessary re-renders | FE | memoised columns, split/lazy charts, query cache | FE code review | Planned |
| R35 | 5 | Clean folder structure | BE/FE | module/feature structure | code review | Planned |
| R36 | 5 | Reusable components | FE | `components/` inventory | code review | Planned |
| R37 | 5 | API validation and error handling | BE/FE | Zod + central error handler; FE ApiError mapping | API tests | Planned |
| R38 | 5 | Frontend: Next.js (separate client application) | FE | `doctor-tracker-frontend` | build | Planned |
| R39 | 5 | Backend: Node.js, Express (separate standalone server) | BE | `doctor-tracker-backend` | build + run | Planned |
| R40 | 5 | Database: MongoDB | LA/BE | Docker `mongo:8.0` locally, Atlas in production | health check + tests | Planned |
| R41 | 5 | RESTful API design principles (frontend communicates with backend over REST) | LA/BE | `API_CONTRACT.md` | API tests | Planned |
| R42 | 6 | Proper state management and data fetching strategies | FE | TanStack Query + URL state | code review + e2e | Planned |
| R43 | 6 | Evaluation: code structure and cleanliness | all | lint + typecheck clean, no suppressions | CI commands | Planned |
| R44 | 6 | Evaluation: query optimization / performance efficiency / scalability considerations | DB | indexes, pagination, aggregation | DB audit | Planned |
| R45 | 6 | Evaluation: authentication implementation | BE | JWT HTTP-only cookie, bcrypt, CSRF, rate limit | API tests | Planned |
| R46 | 6 | Evaluation: best practices in Next.js and MongoDB | FE/BE | App Router conventions; Mongoose lean/projection | review | Planned |
| R47 | 6–7 | README: one-paragraph elevator pitch | DOC | both `README.md` | review | Planned |
| R48 | 7 | README: step-by-step local installation; must include `.env.example` | DOC | both `README.md`, both `.env.example` | follow the steps on a clean checkout | Planned |
| R49 | 7 | README: system architecture — data flow and service interactions | DOC | both `README.md`, `ARCHITECTURE.md` | review | Planned |
| R50 | 7 | README: technical decisions — deep dive into 2 specific decisions | DOC | both `README.md` | review | Planned |
| R51 | 7 | README: visual evidence — high-quality screenshots (desktop & mobile) | QA/DOC | `doctor-tracker-frontend/docs/screenshots/` | real captures from running app | Planned |
| R52 | 7 | Submit project link and GitHub repo with credentials if required | LA | two git repos; deployment guide; demo credentials | manual: needs the owner's GitHub/Vercel/Render/Atlas accounts | Planned |

## Optional enhancements (not in the PDF — implemented only after the above)

Dark theme, settings page, CSRF protection, patient detail page, doctor options/filters helper endpoints, `db:explain` script, same-origin API rewrite mode.
