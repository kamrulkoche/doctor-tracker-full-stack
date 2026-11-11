# Database & Performance Review — `doctor-tracker-backend`

Author: Database & Performance Specialist (Agent 4). Independent audit of the Backend Agent's MongoDB work.
Every number below was measured on this machine (Windows 11, Node 24, MongoDB 8.0.34 **standalone** in Docker,
Mongoose 9) — nothing is quoted from the backend handoff. Where a figure is an extrapolation it says so.

Reproduce: `npm run db:explain` (current database) and `npm run db:bench` (loads 2,000 doctors / 200,000
patients into a throwaway database `doctor_tracker_perf_test`, prints everything in §4.2, drops it again).

---

## 1. Summary verdict

**Good, with one real gap that is now fixed and two honest limitations that remain.**

- Indexing and query patterns are sound. At 200,000 patients every list, filter and sort the API offers is an
  index walk that reads `skip + limit` keys and fetches `limit` documents — **1.9–7 ms** per index-backed list
  request including Mongoose and the count (the exceptions are listed below and in §5).
- **Fixed:** `sortBy=age` had no index. Every age-sorted page read the whole collection and sorted in memory:
  200,000 documents examined, **62 ms** in the server (67.7 ms per request). With `{ age: 1, _id: 1 }` it reads
  10 keys, **0 ms** (1.9 ms per request).
- **Not fixable inside the contract:** the "contains" search is linear in collection size. 200,000 patients:
  **145 ms** (common term) to **410 ms** (no match). 1,000,000 patients: **660 ms to 2.4 s**. It needs a search
  index and a change of matching semantics (§5.2).
- **Not closed:** doctor-delete and patient-create are check-then-write without isolation, so a concurrent pair
  can orphan a patient. The server is a standalone node — a transaction attempt fails with
  `Transaction numbers are only allowed on a replica set member or mongos` (measured) — and a transaction alone
  would not close it anyway (write skew, §2.3).
- Dashboard aggregations are well designed (covered index scans, `$lookup` after `$limit`, `$facet` after
  `$group`) but recompute from raw rows on every load: the whole dashboard is **65 ms** of database time at
  200k patients and **296 ms** at 1M. Fine for this product; pre-aggregation is the scaling path.
- The backend handoff's claims were mostly confirmed. Two were not: "no plan has a SORT stage" (age sort had
  one — it was simply not in its table), and the index hint on whole-collection `$group`s is not a speed-up on
  this data (§5.5).

---

## 2. Schema & integrity

### 2.1 Fields and constraints

| Area | Finding | Verdict |
|---|---|---|
| Types / required | `name`, `condition`, doctor fields required with min/max lengths; patient optionals default to `null` (always present); `age` 0–130; `gender` enum + `null`; `doctorId` required `ObjectId` with `ref: 'Doctor'` | OK |
| Normalisation | `trim` on every string; `lowercase` on all emails (also lower-cased by Zod before it reaches Mongoose) | OK |
| Uniqueness | `users.email` and `doctors.email` unique indexes; because values are stored lower-cased the constraint is effectively case-insensitive. Enforced by the index, not by a read-then-write check, so it is race-free (E11000 → `409 DUPLICATE_EMAIL`) | OK |
| Patient email / phone | Not unique, not indexed. Reasonable: the brief does not ask for it and family members share contact details | OK |
| Updates | `findByIdAndUpdate(..., { runValidators: true })` — schema validators also run on update | OK |
| `versionKey: false` | No optimistic concurrency: two admins editing the same record → last write wins | Acceptable, noted |
| Free-text dimensions | `specialization`, `hospital`, `condition` are free text. "Cardiology" and "cardiology " (pre-trim) or "Cardiolgy" become separate filter values and chart slices. A reference list / enum would be a contract change | Recommendation |
| `strictQuery: true` | Set globally: unknown filter keys are dropped instead of silently matching everything | OK |

Live check of the dev database (read-only): 24 doctors, 260 patients, **0 orphan patients**, 0 patients with a
missing or non-ObjectId `doctorId`, 0 case-insensitive duplicate doctor emails.

### 2.2 Doctor 1—N Patient

Patients hold `doctorId`; doctors hold nothing (no unbounded array). This is the right shape: a doctor in the
benchmark has up to 10,801 patients, and the relation is served by `{ doctorId: 1, createdAt: -1, _id: -1 }`.
The join is done in the service with one `$in` query per page (never one query per row) or a `$lookup` placed
after `$limit`.

### 2.3 Orphan prevention — what is and is not guaranteed

| Operation | Guard | Race-free? |
|---|---|---|
| Create patient | `findById(doctorId)` then `insert` | **No** |
| Update / reassign patient | `exists(patient)` + `findById(doctor)` then `update` | **No** |
| Delete doctor | `countDocuments({ doctorId })` then `findByIdAndDelete` | **No** |
| Delete patient | single statement | Yes |
| Duplicate doctor email | unique index | Yes |

Sequentially the guards are correct and tested (delete blocked with `409 DOCTOR_HAS_PATIENTS`, unknown doctor
rejected). Concurrently they are not: `count = 0` → *another request inserts a patient for that doctor* →
`delete doctor` leaves an orphan; the mirror image exists on the patient side. The window is one round trip
(about 1 ms here) and the application degrades gracefully (the lists show `Unknown doctor`; the dashboard
`$lookup` + `$unwind` silently drops such rows), so for a single-admin tool the practical risk is low. It is
still open, and the handoff says so too.

What would close it:

1. **Transaction + a shared write.** Needs a replica set (Atlas always is one; the local Docker node is a
   standalone and rejects transactions — measured). A transaction by itself is **not** enough: under snapshot
   isolation "read patients, delete doctor" and "read doctor, insert patient" touch different documents, so both
   commit (write skew). Both operations must write the *same* document — e.g. patient create/reassign does
   `Doctor.updateOne({ _id }, { $inc: { patientCount: 1 } })` in its transaction. Then the delete conflicts and
   one side retries. That counter is also the pre-aggregated `patientCount` recommended in §8.
2. **Without transactions: write first, verify after, compensate.** Patient create inserts and then re-checks the
   doctor (delete the patient and return 400 if it is gone); doctor delete deletes and then re-checks for
   patients (re-insert the doctor and return 409 if one appeared). Whatever the interleaving, at least one side
   sees the other's write. Works on a standalone node; costs one extra indexed read per write.
3. **Soft delete** (`deletedAt`) for doctors, so a late patient never points at nothing.

Not implemented: each of these changes write paths and error behaviour beyond a performance fix.

### 2.4 `autoIndex`, startup and connection options

- `autoIndex: true` in every environment. Indexes are created on connect, in the background, and **the server
  starts listening without awaiting `Model.init()`**. On a brand-new database there is therefore a short window
  in which the unique email index does not exist yet, and an index-build failure (e.g. pre-existing duplicate
  emails) is not surfaced at startup. Recommendation: `await Promise.all([User.init(), Doctor.init(),
  Patient.init()])` before `listen`, or — for a large production dataset — `autoIndex: false` plus an explicit
  `Model.syncIndexes()` release step. Building all six patient indexes on 200,000 documents is quick (the single
  `age` index built in 253 ms here), so `autoIndex` is acceptable at this size.
- `autoIndex` only ever *creates*. An index removed from a schema stays in the database until someone drops it
  (`syncIndexes()` handles that).
- `maxPoolSize: 10`, `serverSelectionTimeoutMS: 10 s`. One dashboard load issues 14 concurrent operations
  (stats 5, growth 1, per-doctor 1, conditions 1, doctor-statistics 3, recent-activity 3), so a single browser
  already queues on the pool. Harmless for one admin; raise it (or reduce the fan-out, §5.4) before many
  concurrent users.
- No `maxTimeMS` on any query and no `socketTimeoutMS`: a slow search runs to completion even after the client
  has gone. Recommendation: `maxTimeMS` on the search paths.

---

## 3. Index audit

Indexes read from the database with `getIndexes()` after this review (dev database `doctor_tracker`). They
match the schema declarations one-to-one; there are no stray indexes.

Sizes are from the 200,000-patient benchmark after a forced checkpoint.

| Collection | Index | Queries it serves (verified by `explain`) | Size @200k patients | Verdict |
|---|---|---|---|---|
| users | `_id_` | session re-check on every authenticated request | – | Required |
| users | `email_1` unique | login lookup; one account per email | – | Keep |
| doctors | `_id_` | by-id reads, the per-page `$in`, `$lookup` targets | 0.04 MB | Required |
| doctors | `email_1` unique | duplicate-email enforcement | 0.08 MB | Keep |
| doctors | `createdAt_-1__id_-1` | default list (both directions), date range + its count, doctors-over-time (covered), new-doctors-this-month (`COUNT_SCAN`), recent doctors, search (ordered walk) | 0.07 MB | Keep |
| doctors | `name_1__id_1` | sort by name, `/doctors/options` (regex evaluated on index keys: 64 keys → 20 fetches) | 0.06 MB | Keep |
| doctors | `specialization_1_createdAt_-1__id_-1` | specialization filter, sort by specialization, `distinct` and the stats count (`DISTINCT_SCAN`, 30 keys) | 0.07 MB | Keep |
| doctors | `hospital_1_createdAt_-1__id_-1` | hospital filter, sort by hospital, `distinct` (`DISTINCT_SCAN`, 60 keys) | 0.08 MB | Keep |
| patients | `_id_` | by-id reads and writes | 1.90 MB | Required |
| patients | `doctorId_1_createdAt_-1__id_-1` | a doctor's patients newest-first, per-doctor counts for a doctors page (covered), `patientCount` on doctor detail and the delete guard (`COUNT_SCAN`), all-time patients-per-doctor (covered) | 5.62 MB | Keep |
| patients | `condition_1_createdAt_-1__id_-1` | condition filter (+ date range) and its count (`COUNT_SCAN`), sort by condition, `distinct` (`DISTINCT_SCAN`, 60 keys), all-time condition chart (covered) | 5.15 MB | Keep |
| patients | `createdAt_-1__id_-1` | default list (both directions), date range + count, growth series and month counters (covered), recent patients, gender-only filter and search (ordered walk + filter) | 5.11 MB | Keep |
| patients | `name_1__id_1` | sort by name, also with a filter (walk + filter) | 3.23 MB | Keep |
| patients | `age_1__id_1` | **added by this review** — sort by age, also with a filter | 2.53 MB | New |

**Redundancy.** No index is a prefix of another, and none is unused. The trailing `_id` is not decoration: it
is what makes the tiebroken sort index-ordered (§7). Dropping it brings back a blocking `SORT`.

**Missing, deliberately left out** (measured, see §5): `gender` (3 values), a covering pair for date-ranged
dashboard charts, anything for substring search.

**Cost of the index set** (measured):

- Storage: patient indexes total 23.5 MB for 49.2 MB of documents (14.2 MB compressed on disk) — about
  **123 B of index per patient**. At 1,000,000 patients: 152 MB of indexes for 247 MB of documents.
- Bulk inserts (50,000 documents, 3 runs each): `_id` only 151–181k docs/s; with the four original secondary
  indexes 70–80k docs/s; with `age` as well 66–68k docs/s. So the index set roughly halves bulk-load throughput
  and the new index costs a further ~11 %.
- Single inserts (what the API actually does): 0.63–0.67 ms each in all three configurations — index
  maintenance is lost in the round trip. For a CRUD admin tool the write cost of these indexes is not a concern.

---

## 4. Measured results

Columns: **Keys** = index keys examined, **Docs** = documents fetched, **Ret.** = rows leaving the query stage,
**ms** = server-side `executionTimeMillis` from `explain("executionStats")`. For aggregations the figures
describe the cursor stage that feeds the pipeline; later stages are listed after `|`.

### 4.1 Small dataset — dev database, 24 doctors / 260 patients (`npm run db:explain`)

All 73 queries report 0–1 ms. The plans are what matter here:

| Query | Winning plan | Index | Keys | Docs | Ret. |
|---|---|---|---|---|---|
| Doctors: default list | LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 10 | 10 | 10 |
| Doctors: specialization filter | LIMIT > FETCH > IXSCAN | specialization_1_createdAt_-1__id_-1 | 4 | 4 | 4 |
| Doctors: specialization filter, sort name | SORT > FETCH > IXSCAN | specialization_1_createdAt_-1__id_-1 | 4 | 4 | 4 |
| Doctors: search "an" | SUBPLAN > LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 24 | 24 | 8 |
| Doctors: picker, name search "an" | LIMIT > FETCH > IXSCAN | name_1__id_1 | 24 | 8 | 8 |
| Doctors: patientCount for one page | GROUP > PROJECTION_COVERED > IXSCAN | doctorId_1_createdAt_-1__id_-1 | 80 | 0 | 9 |
| Doctors: distinct specializations | PROJECTION_COVERED > DISTINCT_SCAN | specialization_1_createdAt_-1__id_-1 | 9 | 0 | 9 |
| Patients: default list | LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 10 | 10 | 10 |
| Patients: last page (skip 250) | LIMIT > FETCH > SKIP > IXSCAN | createdAt_-1__id_-1 | 260 | 10 | 10 |
| Patients: sort name / condition | LIMIT > FETCH > IXSCAN | name_1__id_1 / condition_1_… | 10 | 10 | 10 |
| Patients: sort age (**before**) | SORT > COLLSCAN | (none) | 0 | 260 | 10 |
| Patients: sort age (**after**) | LIMIT > FETCH > IXSCAN | age_1__id_1 | 10 | 10 | 10 |
| Patients: doctorId | LIMIT > FETCH > IXSCAN | doctorId_1_createdAt_-1__id_-1 | 10 | 10 | 10 |
| Patients: condition + last 90 days | LIMIT > FETCH > IXSCAN | condition_1_createdAt_-1__id_-1 | 10 | 10 | 10 |
| Patients: gender = other (rare) | LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 214 | 214 | 10 |
| Patients: search, selective term | SUBPLAN > LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 260 | 260 | 1 |
| Total: condition + last 90 days | GROUP > COUNT_SCAN | condition_1_createdAt_-1__id_-1 | 25 | 0 | 1 |
| Total: gender = female | GROUP > COLLSCAN | (none) | 0 | 260 | 1 |
| Total: search "an" | GROUP > COLLSCAN | (none) | 0 | 260 | 1 |
| Stats: this month + last month | GROUP > PROJECTION_COVERED > IXSCAN | createdAt_-1__id_-1 | 114 | 0 | 1 |
| Growth: 12 months by month | GROUP > PROJECTION_COVERED > IXSCAN \| $sort | createdAt_-1__id_-1 | 260 | 0 | 13 |
| Patients per doctor, all time (hinted) | GROUP > PROJECTION_COVERED > IXSCAN \| $sort $lookup $project | doctorId_1_createdAt_-1__id_-1 | 260 | 0 | 22 |
| Condition distribution, all time (hinted) | GROUP > PROJECTION_COVERED > IXSCAN \| $sort $facet | condition_1_createdAt_-1__id_-1 | 260 | 0 | 12 |
| Condition distribution, last 30 days | GROUP > FETCH > IXSCAN \| $sort $facet | createdAt_-1__id_-1 | 96 | 96 | 12 |
| Recent activity: 5 newest patients | LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 5 | 5 | 5 |

On tiny filtered sets the planner sometimes prefers "fetch the few matches and sort them" (`SORT > FETCH >
IXSCAN` over 4 documents) to walking a sort index. That is a correct cost-based choice, not a missing index.

### 4.2 Large dataset — scratch database, 2,000 doctors / 200,000 patients (`npm run db:bench`)

Generated with skew: 30 specializations, 60 hospitals and 60 conditions on Zipf-like distributions (most
common condition 43,060 patients), busiest doctor 10,801 patients, registrations over three years growing
towards today (111,307 in the last 365 days, 11,175 in the last 30), 10 % of ages and 20 % of emails `null`.
Average patient document 258 B. Loaded at 63–68k inserts/s with all indexes in place. Warm cache.

**Lists, sorts, pagination**

| Query | Winning plan | Index | Keys | Docs | Ret. | ms |
|---|---|---|---|---|---|---|
| Doctors: default list | LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 10 | 10 | 10 | 0 |
| Doctors: last page (skip 1,990) | LIMIT > FETCH > SKIP > IXSCAN | createdAt_-1__id_-1 | 2,000 | 10 | 10 | 0 |
| Doctors: specialization + hospital | LIMIT > FETCH > IXSCAN | hospital_1_createdAt_-1__id_-1 | 43 | 43 | 10 | 0 |
| Doctors: specialization filter, sort name | LIMIT > FETCH > IXSCAN | name_1__id_1 | 29 | 29 | 10 | 0 |
| Doctors: patientCount for one page ($in 10 ids) | GROUP > PROJECTION_COVERED > IXSCAN | doctorId_1_createdAt_-1__id_-1 | 1,996 | 0 | 10 | 0 |
| Patients: default list, page 1 | LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 10 | 10 | 10 | 0 |
| Patients: page 1000 (skip 9,990) | LIMIT > FETCH > SKIP > IXSCAN | createdAt_-1__id_-1 | 10,000 | 10 | 10 | 2 |
| Patients: last page (skip 199,990) | LIMIT > FETCH > SKIP > IXSCAN | createdAt_-1__id_-1 | 200,000 | 10 | 10 | 54 |
| Patients: sort createdAt asc | LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 10 | 10 | 10 | 0 |
| Patients: sort name asc / desc | LIMIT > FETCH > IXSCAN | name_1__id_1 | 10 | 10 | 10 | 0 |
| Patients: sort condition asc | LIMIT > FETCH > IXSCAN | condition_1_createdAt_-1__id_-1 | 10 | 10 | 10 | 0 |
| Patients: sort age asc — **before** | SORT > COLLSCAN | (none) | 0 | 200,000 | 10 | 62 |
| Patients: sort age asc — **after** | LIMIT > FETCH > IXSCAN | age_1__id_1 | 10 | 10 | 10 | 0 |
| Patients: sort age, skip 9,990 — **before** | SKIP > SORT > COLLSCAN | (none) | 0 | 200,000 | 10 | 85 |
| Patients: sort age, skip 9,990 — **after** | LIMIT > FETCH > SKIP > IXSCAN | age_1__id_1 | 10,000 | 10 | 10 | 2 |

**Filters**

| Query | Winning plan | Index | Keys | Docs | Ret. | ms |
|---|---|---|---|---|---|---|
| doctorId (busiest doctor) | LIMIT > FETCH > IXSCAN | doctorId_1_createdAt_-1__id_-1 | 10 | 10 | 10 | 0 |
| doctorId, sort name | LIMIT > FETCH > IXSCAN | name_1__id_1 | 199 | 199 | 10 | 1 |
| condition (most common) | LIMIT > FETCH > IXSCAN | condition_1_createdAt_-1__id_-1 | 10 | 10 | 10 | 0 |
| condition + last 90 days | LIMIT > FETCH > IXSCAN | condition_1_createdAt_-1__id_-1 | 10 | 10 | 10 | 0 |
| condition, sort name | LIMIT > FETCH > IXSCAN | name_1__id_1 | 20 | 20 | 10 | 0 |
| condition, sort age — **before** | SORT > FETCH > IXSCAN | condition_1_createdAt_-1__id_-1 | 43,060 | 43,060 | 10 | 57 |
| condition, sort age — **after** | LIMIT > FETCH > IXSCAN | age_1__id_1 | 30 | 30 | 10 | 0 |
| gender = female | LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 21 | 21 | 10 | 0 |
| gender = other (4 % of rows) | LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 307 | 307 | 10 | 0 |
| doctorId + condition | LIMIT > FETCH > IXSCAN | doctorId_1_createdAt_-1__id_-1 | 44 | 44 | 10 | 0 |
| doctorId + gender + last 90 days | LIMIT > FETCH > IXSCAN | doctorId_1_createdAt_-1__id_-1 | 29 | 29 | 10 | 0 |
| last 90 days | LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 10 | 10 | 10 | 0 |
| last 90 days, sort name | LIMIT > FETCH > IXSCAN | name_1__id_1 | 60 | 60 | 10 | 0 |

**Search**

| Query | Winning plan | Index | Keys | Docs | Ret. | ms |
|---|---|---|---|---|---|---|
| Doctors: search "an" | SUBPLAN > LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 52 | 52 | 10 | 1 |
| Doctors: search, no match | SUBPLAN > LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 2,000 | 2,000 | 0 | 5 |
| Doctors: picker, name search "an" | LIMIT > FETCH > IXSCAN | name_1__id_1 | 64 | 20 | 20 | 0 |
| Patients: search "an" (40,397 matches) | SUBPLAN > LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 47 | 47 | 10 | 0 |
| Patients: search full name (68 matches) | SUBPLAN > LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 25,668 | 25,668 | 10 | 49 |
| Patients: search, no match | SUBPLAN > LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 200,000 | 200,000 | 0 | 389 |
| Patients: search "an" + condition | LIMIT > FETCH > IXSCAN | condition_1_createdAt_-1__id_-1 | 50 | 50 | 10 | 0 |
| Patients: search "an" + doctorId | LIMIT > FETCH > IXSCAN | doctorId_1_createdAt_-1__id_-1 | 49 | 49 | 10 | 0 |

**Totals (what `countDocuments(filter)` executes)**

| Filter | Winning plan | Index | Keys | Docs | ms |
|---|---|---|---|---|---|
| doctorId | GROUP > COUNT_SCAN | doctorId_1_createdAt_-1__id_-1 | 10,801 | 0 | 2 |
| condition | GROUP > COUNT_SCAN | condition_1_createdAt_-1__id_-1 | 43,060 | 0 | 6 |
| condition + last 90 days | GROUP > COUNT_SCAN | condition_1_createdAt_-1__id_-1 | 6,907 | 0 | 1 |
| last 90 days | GROUP > COUNT_SCAN | createdAt_-1__id_-1 | 31,809 | 0 | 4 |
| doctorId + condition | GROUP > FETCH > IXSCAN | doctorId_1_createdAt_-1__id_-1 | 10,801 | 10,801 | 17 |
| gender = female | GROUP > COLLSCAN | (none) | 0 | 200,000 | 33 |
| search "an" | GROUP > COLLSCAN | (none) | 0 | 200,000 | 136 |
| search, no match | GROUP > COLLSCAN | (none) | 0 | 200,000 | 136 |
| no filter, if it were `countDocuments({})` | GROUP > COLLSCAN | (none) | 0 | 200,000 | 34 |
| no filter, as the API does it: `estimatedDocumentCount()` | collection metadata | – | – | – | 0.8 (wall clock) |

**Dashboard aggregations and helper endpoints**

| Query | Winning plan \| later stages | Index | Keys | Docs | ms |
|---|---|---|---|---|---|
| Distinct specializations / hospitals / conditions | PROJECTION_COVERED > DISTINCT_SCAN | the matching compound index | 30 / 60 / 60 | 0 | 0 |
| Stats: distinct specializations | DISTINCT_SCAN \| $groupByDistinctScan $group | specialization_1_createdAt_-1__id_-1 | 30 | 0 | 0 |
| Stats: patients this month + last month | GROUP > PROJECTION_COVERED > IXSCAN | createdAt_-1__id_-1 | 14,776 | 0 | 3 |
| Stats: doctors created this month | GROUP > COUNT_SCAN | createdAt_-1__id_-1 | 8 | 0 | 0 |
| Growth: last 30 days by day | GROUP > PROJECTION_COVERED > IXSCAN \| $sort | createdAt_-1__id_-1 | 10,847 | 0 | 7 |
| Growth: last 12 months by month | GROUP > PROJECTION_COVERED > IXSCAN \| $sort | createdAt_-1__id_-1 | 111,111 | 0 | 55 |
| Doctors over time: 12 months | GROUP > PROJECTION_COVERED > IXSCAN \| $sort | createdAt_-1__id_-1 | 378 | 0 | 0 |
| Patients per doctor, all time (hinted — as the API runs it) | GROUP > PROJECTION_COVERED > IXSCAN \| $sort $lookup $project | doctorId_1_createdAt_-1__id_-1 | 200,000 | 0 | 53 |
| Patients per doctor, all time (no hint) | GROUP > COLLSCAN \| $sort $lookup $project | (none) | 0 | 200,000 | 44 |
| Patients per doctor, last 30 days | GROUP > FETCH > IXSCAN \| $sort $lookup $project | createdAt_-1__id_-1 | 11,175 | 11,175 | 19 |
| Patients per doctor, last 365 days | GROUP > FETCH > IXSCAN \| $sort $lookup $project | createdAt_-1__id_-1 | 111,307 | 111,307 | 135 |
| Condition distribution, all time (hinted — as the API runs it) | GROUP > PROJECTION_COVERED > IXSCAN \| $sort $facet | condition_1_createdAt_-1__id_-1 | 200,000 | 0 | 43 |
| Condition distribution, all time (no hint) | GROUP > COLLSCAN \| $sort $facet | (none) | 0 | 200,000 | 38 |
| Condition distribution, last 30 days | GROUP > FETCH > IXSCAN \| $sort $facet | createdAt_-1__id_-1 | 11,175 | 11,175 | 16 |
| Condition distribution, last 365 days | GROUP > FETCH > IXSCAN \| $sort $facet | createdAt_-1__id_-1 | 111,307 | 111,307 | 141 |
| Specialization distribution: doctors side | GROUP > COLLSCAN | (none) | 0 | 2,000 | 1 |
| Recent activity: 5 newest patients / doctors | LIMIT > FETCH > IXSCAN | createdAt_-1__id_-1 | 5 | 5 | 0 |

**Endpoint cost — the real service functions, wall clock, median of 5 (database round trips + Mongoose, no HTTP)**

| Service call | 200k patients, ms | 1M patients, ms |
|---|---|---|
| `GET /patients` page 1 | 2.1 | 2.1 |
| `GET /patients?page=1000` | 4.8 | 4.7 |
| `GET /patients` last page (page 20,000 / 100,000) | 53.9 | 234.4 |
| `GET /patients?sortBy=name` / `condition` | 2.0 / 2.1 | 1.8 / 1.8 |
| `GET /patients?sortBy=age` — before → after | 67.7 → 1.9 | – → 1.9 |
| `GET /patients?sortBy=age&page=1000` — before → after | 86.4 → 4.2 | – → 4.2 |
| `GET /patients?condition=&sortBy=age` — before → after | 61.4 → 6.6 | – → 24.7 |
| `GET /patients?doctorId=` / `GET /doctors/:id/patients` | 3.0 / 2.4 | 6.3 / 5.8 |
| `GET /patients?condition=` | 6.8 | 25.4 |
| `GET /patients?condition=&from=&to=` (90 days) | 2.6 | 5.8 |
| `GET /patients?from=&to=` (90 days) | 6.3 | 19.4 |
| `GET /patients?gender=female` | 36.1 | 140.6 |
| `GET /patients?search=an` | 144.7 | 659.7 |
| `GET /patients?search=<full name>` | 154.3 | 669.8 |
| `GET /patients?search=<no match>` | 410.0 | 2,382.2 |
| `GET /patients/filters`, `GET /doctors/filters` | 1.2 / 1.3 | 1.2 / 1.3 |
| `GET /doctors` page 1 / `limit=100` | 2.3 / 5.2 | 2.4 / 6.8 |
| `GET /doctors?search=an` | 4.1 | 6.3 |
| `GET /doctors/options` (with and without search) | 0.9–1.0 | 0.9 |
| `GET /dashboard/stats` | 4.4 | 15.9 |
| `GET /dashboard/patient-growth` (12 months) | 53.9 | 240.9 |
| `GET /dashboard/patient-growth?interval=day` | 8.1 | 36.0 |
| `GET /dashboard/patients-per-doctor` | 47.4 | 167.3 |
| `GET /dashboard/condition-distribution` | 42.2 | 175.5 |
| `GET /dashboard/doctor-statistics` | 50.8 | 170.8 |
| `GET /dashboard/recent-activity` | 47.0 | 164.8 |
| Dashboard page: all six endpoints in parallel | 64.5 | 296.3 |

The 1M column is a second run of the same script (`--doctors=5000 --patients=1000000`): 247 MB of documents,
152 MB of indexes, loaded at 56k inserts/s. Index-walk queries are flat; everything that scans grows linearly.

---

## 5. Findings, ranked

### 5.1 Medium — `sortBy=age` scanned and sorted the whole collection — **FIXED**

The schema comment said "not indexed on purpose: a bounded top-k in-memory sort". The memory is bounded; the
work is not: `SORT > COLLSCAN`, 200,000 documents examined for 10 rows, 62 ms (85 ms at page 1000), and
`condition + sort age` fetched all 43,060 matching documents (57 ms). `age` is an advertised sort field of both
patient list endpoints.

Fix: `patientSchema.index({ age: 1, _id: 1 })`. Result: 10 keys / 10 documents / 0 ms; the endpoint went from
67.7 ms to 1.9 ms (86.4 → 4.2 ms at page 1000; 61.4 → 6.6 ms with a condition filter). Cost: 2.5 MB per 200k
patients (13 B per document), ~11 % on bulk loads, nothing measurable on single inserts. Ordering is unchanged
(`null` ages first ascending — index order equals the previous in-memory order); all 128 tests pass.

### 5.2 Medium — substring search is linear — **not fixable without changing the contract**

`search` builds `$or: [{name}, {email}, {phone}]` with an unanchored, case-insensitive regex. Such a regex has
no index bounds, so:

- **The page**: MongoDB walks `createdAt_-1__id_-1` in order, fetches each document and tests it, stopping after
  `limit` hits. Cost is inversely proportional to how common the term is: 47 documents for "an", 25,668 for a
  full name, all 200,000 when fewer than `limit` rows match (389 ms).
- **The total**: `countDocuments` cannot stop early — a `COLLSCAN` of every document on every search request
  (136 ms at 200k, ~650 ms at 1M), whatever the term.
- Combined with an equality filter (`doctorId`, `condition`) the search is cheap: the index narrows first.
- The doctor picker (`/doctors/options`) is name-only, so the regex is evaluated on index keys and only matches
  are fetched (64 keys → 20 documents). On 2,000 doctors it does not matter either way.

At what size is it a problem? Measured request times: 260 patients < 1 ms; 200,000 → 145–410 ms; 1,000,000 →
0.66–2.4 s. Interpolating between those measurements: comfortable to a few tens of thousands of patients, noticeable per
keystroke from ~200,000, unacceptable around a million. Doctors (thousands) are not a concern.

Alternatives tried inside the current contract (200k patients, median wall clock, ms):

| Strategy | "an" | full name | exact email (1 match) | no match | phone fragment |
|---|---|---|---|---|---|
| A. current: `find` ‖ `countDocuments` | 133–136 | 155–161 | 402–419 | 396–412 | 253–286 |
| B. count first, skip `find` when 0 | 135 | 203 | 509 | 133 | 357 |
| C. `find` hinted `$natural` ‖ count | 235 | 257 | 252 | 249 | 253 |
| E. one `$match` + `$facet { page, total }` | 183 | 163 | 160 | 153 | 159 |

No variant wins everywhere, and all remain linear; E flattens the worst case (−60 %) at the cost of the common
case (+37 %). Nothing was changed. If search latency matters before a search index exists, E is the one to take.

Real upgrade paths (measured on the same 200k patients where possible):

| Path | Measured | Trade-off |
|---|---|---|
| Anchored, case-sensitive prefix `/^Umar/` on the existing `name_1__id_1` | 10 keys, 0 ms; count 4,171 keys, 1 ms | Prefix of `name` only, case-sensitive. (`/^umar/i` does **not** help: 162,763 keys, 91 ms; count 200,000 keys, 69 ms) |
| Prefix range on a collation index `{ name: 1, _id: 1 }`, `{ locale: 'en', strength: 2 }` | 10 keys, 1 ms; count `COUNT_SCAN` 4,170 keys, 1 ms; index 3.1 MB, built in 0.3 s | Case-insensitive, but still "starts with", one field per index, and every query must send the same collation |
| Text index on `name, email, phone` | word "umar": 4,170 docs, 6.1 ms for page + count; phrase "Umar Mbeki": 26.3 ms; index 14.3 MB (the largest index), built in 2.1 s | Whole words only — `"uma"` returns **0** rows; results need an in-memory `SORT`; one text index per collection |
| Atlas Search (Lucene, `autocomplete` / n-gram) | not measurable here (Atlas only) | True substring/fuzzy search with relevance and its own count; needs Atlas, separate index sync, different query API |

Cheap mitigations that keep today's semantics: a minimum search length of 2–3 characters and a debounce in the
UI, `maxTimeMS` on the search queries, and narrowing by a filter first.

### 5.3 Medium — referential integrity depends on unisolated check-then-write — **recommendation**

See §2.3. Open by design on a standalone node; three ways to close it are described there.

### 5.4 Low/Medium — dashboards recompute from raw rows on every load — **recommendation**

Each all-time chart scans one key per patient: ~200,000 keys and 42–54 ms per endpoint at 200k, 165–241 ms at
1M. One dashboard load runs the per-doctor `$group` **three times** (patients-per-doctor, `topDoctors` in
recent-activity, specialization distribution in doctor-statistics). Whole page: 64.5 ms at 200k, 296 ms at 1M.

Date-ranged charts lose the covered plan: `$match createdAt` uses the `createdAt` index and must then **fetch**
each document to read `doctorId` / `condition` — 111,307 documents and 135–141 ms for a 365-day range (786 ms
at 1M). Hinting the group-key index instead is worse (200,000 fetches, 253 ms). Two covering indexes fix it,
measured: `{ createdAt: -1, doctorId: 1 }` and `{ createdAt: -1, condition: 1 }` turn both into
`PROJECTION_COVERED` scans, **122 → 23 ms** and **117 → 21 ms**, for 4.9 + 5.1 MB per 200k patients. Not added:
the default (unranged) charts do not need them, and two more indexes on the write path are only worth it if
ranged dashboard views turn out to be used heavily.

Scaling path: share the per-doctor counts within a request cycle, a short TTL cache, or pre-aggregated counters (§8).

### 5.5 Low — index hints on whole-collection `$group`: correct trade-off, wrong justification

The hint does turn `COLLSCAN` into a covered `IXSCAN` (0 documents fetched). It is **not faster** on this data:
with 258-byte documents, median of 11 runs, per-doctor 47.8 ms hinted vs 40.0–43.5 ms unhinted, conditions
44.5–46.5 vs 34.9–36.1. It pays off as documents get wider or the collection outgrows memory: on a copy with
1,660-byte documents the hinted scan took 32–33 ms vs 63–65 ms unhinted, and at 1M rows the hinted plans were
level or ahead (172 vs 204 ms, 168 vs 173 ms). Left in place — it bounds memory and I/O — but the claim to make
is "does not read documents", not "faster".

### 5.6 Low — offset pagination is linear in the offset

`skip` walks and discards index keys: page 1000 = 10,000 keys, 2–5 ms; the last page of 200k = 200,000 keys,
54 ms; of 1M, 233 ms. `page` is capped at 1,000,000 and a page beyond the end costs the same as the last page.
Nobody pages to 20,000 by hand, so this is acceptable; keyset pagination (§8) removes it.

### 5.7 Low — totals for filters without a usable index

`gender` alone: the page is cheap (21–307 keys) but the total is a `COLLSCAN` — 33 ms at 200k, 143 ms at 1M.
A `{ gender: 1, createdAt: -1, _id: -1 }` index was measured: total 29.4 → 9.4 ms for 4.9 MB. Not worth an
index at this size (3 distinct values). `doctorId + condition`: the total fetches that doctor's documents
(10,801, 17 ms). Both scale linearly and are fine below roughly a million rows.

### 5.8 Low — startup does not wait for index builds; no query time limits

See §2.4 (`Model.init()` before `listen`, `maxTimeMS`, pool size vs dashboard fan-out).

### 5.9 Info — things checked and found correct

- **No N+1.** Doctor rows get `patientCount` from one `$in` + `$group` (covered, 1,996 keys for a page of 10);
  patient rows get their doctor from one `$in` over the distinct ids of the page; `/doctors/:id/patients` loads
  the doctor once.
- **Parallelism.** Page and total run in `Promise.all`; independent dashboard aggregations too.
- **Count strategy.** `estimatedDocumentCount()` when there is no filter (0.8 ms vs 30.8 ms for
  `countDocuments({})` at 200k), `countDocuments(filter)` otherwise — a `COUNT_SCAN` that touches no documents
  whenever the filter is a prefix of an index.
- **`.lean()` + `.select()`** on every read path. Honest note: the list projections name every field of the
  DTO (including `notes`, up to 2,000 characters, because the contract returns it in list rows), so they
  protect against future fields rather than shrink today's payload. Only `/doctors/options` and the doctor
  summaries are genuinely narrow (3 fields).
- **`$lookup` placement.** Always after `$sort` + `$limit` (≤ 50 lookups by `_id`), never per patient.
  Specialization totals are joined in the service from two grouped results rather than a per-doctor `$lookup`.
- **`$facet`** runs after the `$group`, on one row per condition, so the 16 MB facet limit is not in play.
- **Bounded results.** Lists ≤ 100 rows, options ≤ 50, time series ≤ 750 buckets, top-N ≤ 50 / 20. The three
  `distinct` endpoints and `specializationDistribution` are bounded only by the number of distinct free-text
  values (30–60 here; `DISTINCT_SCAN` reads one key per value).
- **Memory-bound stages.** `$group` by doctor holds one counter per doctor; by condition / bucket far fewer.
  The specialization pipeline `$push`es every doctor `_id` (2,000 here, 1 ms) — fine for thousands of doctors,
  the first thing to rewrite for millions. MongoDB 8 spills to disk by default if a stage exceeds 100 MB.
- **Time series.** `$dateTrunc` in UTC with Monday weeks, fed by a covered range scan of the `createdAt`
  index; gaps are filled in the service.

---

## 6. Code changes made by this review

| File | Change |
|---|---|
| `doctor-tracker-backend/src/models/patient.model.ts` | Added `patientSchema.index({ age: 1, _id: 1 })` |
| `doctor-tracker-backend/src/modules/patients/patient.service.ts` | Comment on the age sort corrected (it is index-backed now). No logic change |
| `doctor-tracker-backend/src/modules/dashboard/dashboard.service.ts` | Refactor only: exported the two hint constants; extracted `buildConditionDistributionPipeline` and `buildMonthlyCountersPipeline` so the scripts explain the exact pipelines. Same stages, same results |
| `doctor-tracker-backend/src/scripts/query-plans.ts` | **New.** Shared catalogue: 73 explained queries (every list / sort / filter / search / total / dashboard pipeline), plan summariser, table printer |
| `doctor-tracker-backend/src/scripts/explain.ts` | Now a thin wrapper around the catalogue (was 18 queries; adds the `ms` column and later pipeline stages) |
| `doctor-tracker-backend/src/scripts/bench.ts` | **New.** `npm run db:bench`: deterministic skewed dataset in `doctor_tracker_perf_test`, index sizes, plan table, service timings, then drops the database. Flags: `--doctors=`, `--patients=`, `--keep`, `--reuse`. Refuses `NODE_ENV=production`; verifies the connected database name before writing |
| `doctor-tracker-backend/package.json` | Added the `db:bench` script |

No API contract change, no new dependency. `npm run typecheck`, `npm run lint`, `npm test` (5 files / 128
tests) and `npm run build` all pass after the changes.

Operational notes:

- `dist/` was rebuilt. **The API process running on port 5000 was started before the rebuild and must be
  restarted to load the new build.** Nothing breaks if it is not: the only runtime change is the index.
- Running `npm run db:explain` against the dev database created `age_1__id_1` there (an additive index build
  on 260 documents), so the running server already benefits. A fresh database gets it from `autoIndex` at start.
- The scratch database was dropped after every run; `listDatabases` afterwards returned
  `admin, config, doctor_tracker, doctor_tracker_test, local`. The dev database still holds 24 doctors and 260
  patients. The Mongo container was not restarted.
- `BACKEND_HANDOFF.md` §3 and §7 predate this review (no `db:bench`, no `age` index, the old 18-row table).

---

## 7. README-ready: database optimisation decisions

> ### Database design and query optimisation
>
> **1. Compound indexes that match the query shape, with `_id` as a tiebreak.**
> Every list endpoint sorts by a field *and then by `_id`*, so rows with equal values never move between pages.
> Each index therefore ends in `_id` — for example `{ condition: 1, createdAt: -1, _id: -1 }` — putting the
> equality filter first, the sort key next and the tiebreak last. MongoDB walks the index in order and stops
> after `skip + limit` keys; no query sorts in memory. On 200,000 patients a filtered, sorted page examines 10
> index keys and returns in under 1 ms, and sorting by age went from a full collection scan (200,000 documents,
> 62 ms) to 10 keys once `{ age: 1, _id: 1 }` was added. The same indexes answer the filter dropdowns
> (`DISTINCT_SCAN`, one key per distinct value) and the totals (`COUNT_SCAN`, no documents read).
>
> **2. Lean, projected reads and no N+1.**
> Reads use `.select()` and `.lean()`, so MongoDB returns only the listed fields and Mongoose skips document
> hydration. Related data is loaded per page, never per row: the patient count of every doctor on a page comes
> from one grouped query that is fully covered by the `{ doctorId, createdAt, _id }` index (1,996 keys, no
> documents fetched), and the doctors of a page of patients come from a single `$in` lookup.
>
> **3. A count strategy that fits the filter.**
> The page and its total run in parallel. Without a filter the total comes from collection metadata
> (`estimatedDocumentCount`, 0.8 ms versus 31 ms for an exact count of 200,000 documents); with a filter
> `countDocuments` is used and resolves from the index alone whenever the filter is an index prefix.
>
> **4. Aggregations that reduce early.**
> Dashboard pipelines group on indexed keys so they are covered index scans, use `$dateTrunc` for day / week /
> month buckets, place `$lookup` after `$sort` + `$limit` (at most a handful of joins) and use `$facet` only
> after `$group`, on one small row per group. All six dashboard endpoints together take about 65 ms of database
> time on 200,000 patients.
>
> **Known limits.** The free-text search is a case-insensitive "contains" match, which no B-tree index can
> serve: it costs 145–410 ms on 200,000 patients and grows linearly, so a text or Atlas Search index is the
> next step. Offset pagination is linear in the offset (page 1,000: 5 ms; page 20,000: 54 ms). Run
> `npm run db:explain` for the plans on your data and `npm run db:bench` to reproduce the 200,000-row figures.

---

## 8. Scalability notes (future work)

1. **Search engine.** Replace the regex with Atlas Search (`autocomplete` for the picker, n-gram or fuzzy for
   the lists) or, as a smaller step, a case-insensitive prefix search on a collation index (1 ms at 200k,
   measured). Both change matching semantics and so the contract.
2. **Keyset (cursor) pagination.** `?after=<createdAt,_id>` turns every page into a 10-key range scan
   regardless of depth, using the existing `(sortKey, _id)` indexes unchanged. It replaces `page` /
   `totalPages` with `nextCursor`, so it suits infinite scroll or exports; keep offset paging for the tables.
3. **Pre-aggregated counters.** A `patientCount` on the doctor document, maintained with `$inc` inside the
   transaction that creates / reassigns / deletes a patient, removes the three 200,000-key scans per dashboard
   load, makes "sort doctors by patient count" indexable, and is the shared write that closes the orphan race
   (§2.3). Daily roll-up documents (`{ day, newPatients, byCondition }`) do the same for the time series.
4. **Replica set.** Required for transactions and change streams (which could feed the counters above); it
   also lets dashboard reads use a secondary.
5. **Dashboard caching.** A 30–60 s cache, or one shared computation of the per-doctor counts per dashboard
   load, cuts the cost by roughly two thirds without schema changes.
6. **Covering indexes for ranged charts** `{ createdAt: -1, doctorId: 1 }`, `{ createdAt: -1, condition: 1 }`
   (measured 122 → 23 ms) if ranged dashboard views become common.
7. **Operational.** `autoIndex: false` + `syncIndexes()` as a release step; `maxTimeMS` on user-driven queries;
   a pool sized for the dashboard fan-out; the slow-query profiler (`slowms`) in production; reference
   collections for specialization / hospital / condition instead of free text.
