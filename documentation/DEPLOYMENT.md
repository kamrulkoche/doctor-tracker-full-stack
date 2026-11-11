# Doctor Tracker — Deployment Guide

## Status

**Nothing has been deployed.** No GitHub, MongoDB Atlas, Render or Vercel credentials exist
on the machine where this project was built, so no repository has been pushed and no
service has been created. This document is a set of manual instructions for the account
owner. It contains no real URLs; every host name, user name and secret is a placeholder in
`<angle brackets>` that is replaced with the value shown by the corresponding dashboard.

Target topology:

```
Browser  ->  Vercel (doctor-tracker-frontend)  ->  Render (doctor-tracker-backend)  ->  MongoDB Atlas
```

Placeholders used throughout:

| Placeholder | Meaning | Example of the form (not a real value) |
|---|---|---|
| `<github-user>` | GitHub account or organisation | – |
| `<atlas-cluster-host>` | Host part of the Atlas SRV string | `<name>.<id>.mongodb.net` |
| `<atlas-user>`, `<atlas-password>` | Atlas database user | – |
| `<render-host>` | Host name Render assigns to the backend | `<service-name>.onrender.com` |
| `<vercel-host>` | Host name Vercel assigns to the frontend | `<project-name>.vercel.app` |
| `<admin-email>`, `<admin-password>` | Production admin login | – |

## Order of work

The backend needs the frontend's origin and the frontend needs the backend's host, so the
steps are ordered to resolve that dependency:

1. Publish both repositories to GitHub (section 1).
2. Create the Atlas cluster, user and connection string (section 2).
3. Deploy the backend on Render with a provisional `FRONTEND_URL` (section 3).
4. Deploy the frontend on Vercel using the Render host (section 4).
5. Set `FRONTEND_URL` on Render to the real Vercel origin and redeploy the backend.
6. Seed the production admin (section 2.5).
7. Run the verification checklist (section 6).

## 1. Publish to GitHub (two repositories)

The backend and the frontend are separate repositories. Each of
`doctor-tracker-backend/` and `doctor-tracker-frontend/` is its own git repository; the
parent `doctor-tracker/` directory is not pushed as a repository by these steps.

### 1.1 Pre-push secret check

Run in **each** repository before the first push.

```bash
git status
git ls-files | grep -i env
```

- `git status` must show a clean tree with nothing unexpected staged or untracked.
- `git ls-files | grep -i env` lists every tracked file whose path contains `env`. The only
  environment file allowed in the output is `.env.example`. Framework files such as
  `next-env.d.ts` may also match in the frontend; they contain no secrets. Any `.env`,
  `.env.local`, `.env.production` or similar must **not** appear.

PowerShell equivalent of the second command:

```powershell
git ls-files | Select-String -Pattern env
```

Confirm that the example file contains no real values, and that no secret was committed
earlier in the history:

```bash
cat .env.example
git log --all --oneline -- .env .env.local .env.production
```

The second command must print nothing. If it prints commits, a real environment file was
committed at some point: removing it in a new commit is not enough, because it remains in
history. Rotate every secret that file contained and rewrite or recreate the repository
before pushing.

If an environment file is tracked but has not been pushed, untrack it and confirm the
ignore rule exists:

```bash
git rm --cached .env
git check-ignore -v .env
git commit -m "Stop tracking .env"
```

### 1.2 Create the repositories and push

On GitHub, create two **empty** repositories named `doctor-tracker-backend` and
`doctor-tracker-frontend` (no README, licence or `.gitignore`, so the first push is not
rejected). Then, in `doctor-tracker-backend/`:

```bash
git branch -M main
git remote add origin https://github.com/<github-user>/doctor-tracker-backend.git
git push -u origin main
```

In `doctor-tracker-frontend/`:

```bash
git branch -M main
git remote add origin https://github.com/<github-user>/doctor-tracker-frontend.git
git push -u origin main
```

If `git remote add` reports that `origin` already exists, inspect it with `git remote -v`
and correct it with `git remote set-url origin <url>`.

After pushing, open each repository on GitHub and check the file list once more for
environment files.

If the repositories are private, the reviewer needs to be added as a collaborator, and
Render and Vercel need to be granted access to those repositories during import.

## 2. MongoDB Atlas

### 2.1 Create a cluster

1. Sign in to MongoDB Atlas and create a project.
2. Create a cluster on the free tier. Choose a cloud region close to the Render region that
   will host the backend, to keep database round trips short.
3. Wait until the cluster status shows it is ready.

### 2.2 Create a least-privilege database user

In **Database Access**, add a database user:

- Authentication method: password. Generate a long random password and store it in a
  password manager. Prefer letters and digits only, so that it needs no URL-encoding.
- Privileges: choose **specific privileges** and grant the built-in role `readWrite` on the
  database `doctor_tracker` only. Do not use `atlasAdmin` or "read and write to any
  database".

`readWrite` allows the application to read and write documents and to create collections and
indexes in that one database, and nothing else.

### 2.3 Network access

In **Network Access**, add the addresses that may connect:

- **Render.** Open the backend service in the Render dashboard and look up its outbound IP
  addresses (shown in the service's connection information). Add each of them to the Atlas
  access list. These addresses are shared by other Render services in the same region, so
  the database user's password remains the primary control.
- **Your own machine**, temporarily, if the admin will be seeded from it (section 2.5). Use
  "add current IP address" and remove the entry afterwards.
- `0.0.0.0/0` (allow from anywhere) is the fallback if the outbound addresses are not
  available for the service. It exposes the cluster's login endpoint to the internet and
  relies entirely on the password and TLS. Use it only with a long random password and the
  least-privilege user from section 2.2, and say so in the hand-over notes.

### 2.4 Connection string

In the cluster's **Connect** dialog, choose the driver option and copy the SRV connection
string. Insert the database name between the host and the query string:

```
mongodb+srv://<atlas-user>:<atlas-password>@<atlas-cluster-host>/doctor_tracker?retryWrites=true&w=majority
```

- The database name `doctor_tracker` must be present. Without it the driver uses the
  database `test`, on which the user has no privileges.
- Percent-encode special characters in the password (see `LOCAL_DEVELOPMENT.md`
  section 6.3).
- Do not add `authSource`; Atlas supplies it through the SRV record.
- Treat the complete string as a secret. It is stored only in Render's environment settings.

### 2.5 Seed the production admin

There is no registration endpoint. The admin is created by the backend's `seed:admin`
script, an idempotent upsert driven by `ADMIN_NAME`, `ADMIN_EMAIL` and `ADMIN_PASSWORD`.
Choose a production password that is different from the local one.

Run it from a local checkout of `doctor-tracker-backend/` against Atlas. Your IP address
must be on the Atlas access list (section 2.3). Supply the variables for this one command
only, without writing the Atlas string into the local `.env`:

```bash
MONGODB_URI='mongodb+srv://<atlas-user>:<atlas-password>@<atlas-cluster-host>/doctor_tracker?retryWrites=true&w=majority' \
ADMIN_NAME='<admin-name>' \
ADMIN_EMAIL='<admin-email>' \
ADMIN_PASSWORD='<admin-password>' \
npm run seed:admin
```

PowerShell:

```powershell
$env:MONGODB_URI = 'mongodb+srv://<atlas-user>:<atlas-password>@<atlas-cluster-host>/doctor_tracker?retryWrites=true&w=majority'
$env:ADMIN_NAME = '<admin-name>'
$env:ADMIN_EMAIL = '<admin-email>'
$env:ADMIN_PASSWORD = '<admin-password>'
npm run seed:admin
Remove-Item Env:MONGODB_URI, Env:ADMIN_NAME, Env:ADMIN_EMAIL, Env:ADMIN_PASSWORD
```

Before running, check in the backend README how the script loads configuration. If values
from the local `.env` file take precedence over variables set in the shell, the command
above would seed the local database instead; in that case temporarily point the local
`.env` at Atlas, run the script, and restore the file immediately.

Afterwards:

- Confirm in the Atlas data browser that the `doctor_tracker` database contains one user
  document with the expected email and a hashed password.
- Remove your IP address from the Atlas access list.
- Clear the command from shell history if it contains the password.

To change the production admin's password later, run the same command with the new
`ADMIN_PASSWORD`.

`seed:demo` refuses to run when `NODE_ENV=production`. If demo records are wanted in the
deployed application for the reviewer, that is a separate decision for the project owner;
it is not part of this procedure.

## 3. Backend on Render

### 3.1 Create the Web Service

1. In Render, choose **New** then **Web Service** and connect the GitHub repository
   `doctor-tracker-backend`.
2. Settings:

   | Setting | Value |
   |---|---|
   | Branch | `main` |
   | Root directory | empty (the repository root is the backend) |
   | Runtime | Node |
   | Region | close to the Atlas cluster region |
   | Build command | `npm ci && npm run build` |
   | Start command | `npm start` |
   | Health check path | `/api/health` |
   | Instance type | Free |

3. Node.js version: use the version the backend README or its `package.json` `engines` field
   specifies. If the repository does not pin one, set it explicitly in Render so that builds
   do not change when the platform default changes.

Build note: when `NODE_ENV=production` is present during the build, `npm ci` omits
`devDependencies`. If the build step needs packages from `devDependencies` (a TypeScript
compiler, for example) and the build fails with a "command not found" error for such a tool,
change the build command to:

```bash
npm ci --include=dev && npm run build
```

### 3.2 Environment variables

Set these in the service's **Environment** section.

| Variable | Value | Notes |
|---|---|---|
| `NODE_ENV` | `production` | Switches cookies to `SameSite=None; Secure`, removes internal detail from `500` responses, and makes `seed:demo` refuse to run. |
| `MONGODB_URI` | The Atlas SRV string from section 2.4 | Secret. |
| `JWT_SECRET` | A new random value of at least 32 characters | Secret. Generate one specifically for production; never reuse the local value. Changing it later signs every user out and invalidates outstanding CSRF tokens. |
| `JWT_EXPIRES_IN` | `1d` | Session lifetime; the cookie `Max-Age` follows it. |
| `FRONTEND_URL` | `https://<vercel-host>` | The **exact** origin of the frontend: scheme and host, **no trailing slash**, no path. This is the CORS allowlist and the allowlist for the origin check on unsafe methods. Several origins may be given as a comma-separated list. Before the Vercel host is known, set a provisional value and correct it in step 5 of "Order of work". |
| `COOKIE_DOMAIN` | empty | Leave unset for the default `<render-host>` / `<vercel-host>` setup, so cookies are host-only on the API host. Set it only with a shared custom parent domain (section 5.2). |
| `ADMIN_NAME` | `<admin-name>` | Used by `seed:admin`. |
| `ADMIN_EMAIL` | `<admin-email>` | Used by `seed:admin`. |
| `ADMIN_PASSWORD` | `<admin-password>` | Secret. Used by `seed:admin`. |

Do not set:

- `PORT`. Render provides the port to the process through `PORT`; the server listens on that
  value. A hard-coded port would fail the platform's port detection.
- `MONGODB_URI_TEST`. Tests never run in production.

Generate the production `JWT_SECRET` locally and paste it into Render:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

The `ADMIN_*` values on Render are used only if `seed:admin` is run on Render. If the admin
was seeded from a local machine (section 2.5), they may be left out of Render so that the
admin password is stored in one place fewer.

### 3.3 Deploy and note the host

Create the service and wait for the first deploy to finish. Render displays the service's
public URL; its host is `<render-host>`. The API base URL is `https://<render-host>/api`.

Check the deploy log for a successful database connection, then open
`https://<render-host>/api/health` and confirm `"database": "connected"`.

### 3.4 Free-tier behaviour

- **Cold starts.** A free Web Service is stopped after a period without inbound traffic and
  started again by the next request. That first request can take on the order of a minute
  while the instance boots and reconnects to Atlas. In the application this appears as a
  slow first page load or a slow login after inactivity, not as an error. Before a
  demonstration, open `https://<render-host>/api/health` and wait for the response.
- **Rate-limit counters.** If the rate limiter keeps its counters in process memory, they
  reset whenever the instance restarts. This is acceptable for a single free instance.
- **Proxy.** The service sits behind Render's proxy, which terminates TLS. Per-IP rate
  limiting depends on the backend reading the client address from the proxy's forwarding
  header. This is a property of the backend implementation; confirm it using the
  rate-limit attribution note in section 6.1.
- Free-tier limits change. Check Render's current documentation for the exact idle timeout
  and monthly allowance.

## 4. Frontend on Vercel

1. In Vercel, choose **Add New** then **Project** and import the GitHub repository
   `doctor-tracker-frontend`.
2. Framework preset: Next.js (detected automatically). Leave the build command, output
   directory and install command at their defaults. Root directory: the repository root.
3. Add the environment variable for the Production environment:

   | Variable | Value |
   |---|---|
   | `NEXT_PUBLIC_API_URL` | `https://<render-host>/api` |

   No trailing slash. The value must be `https`; a page served over HTTPS cannot call an
   HTTP API.
4. Deploy. Vercel displays the production domain; its host is `<vercel-host>` and the
   frontend origin is `https://<vercel-host>`.
5. Return to Render, set `FRONTEND_URL=https://<vercel-host>` (no trailing slash) and let
   the backend redeploy.

Notes:

- `NEXT_PUBLIC_*` variables are compiled into the client bundle at build time. After
  changing `NEXT_PUBLIC_API_URL`, trigger a new deployment; a running deployment does not
  pick up the change.
- Use the stable production domain as `<vercel-host>`, not the per-deployment URL that
  contains a hash.
- Preview deployments have their own origins, which are not on the backend allowlist, so
  API calls from previews are rejected by CORS. That is the intended default. To allow a
  specific preview origin, append it to `FRONTEND_URL` as a comma-separated entry.
- No secret belongs in the frontend's environment. Anything prefixed `NEXT_PUBLIC_` is
  public by design.

## 5. Cross-site cookies

### 5.1 Why the default setup is cross-site

`<vercel-host>` and `<render-host>` are different sites. The session cookie `dt_access` and
the CSRF cookie `dt_csrf` are set by the API host and must be sent on background requests
made from a page on the frontend host. Three conditions must all hold:

1. **Cookie attributes.** In production the backend sets cookies with
   `SameSite=None; Secure`. `SameSite=None` permits the cookie on cross-site requests;
   browsers accept `SameSite=None` only together with `Secure`, which requires HTTPS on both
   hosts. This is driven by `NODE_ENV=production`.
2. **CORS with credentials.** The API must answer with
   `Access-Control-Allow-Origin: https://<vercel-host>` (the exact origin, never `*`) and
   `Access-Control-Allow-Credentials: true`. This is driven by `FRONTEND_URL`. A trailing
   slash, a different scheme or a different subdomain makes the comparison fail.
3. **Credentialed requests.** The frontend sends every request with credentials. This is
   built into its API client.

CSRF protection does not depend on `SameSite` in this setup. It is provided by the signed
double-submit token and the origin check described in `API_CONTRACT.md` section 2.

### 5.2 Browsers that block third-party cookies

From the browser's point of view, a cookie belonging to `<render-host>` used by a page on
`<vercel-host>` is a third-party cookie. Some browsers block these regardless of
`SameSite=None`:

- Safari (Intelligent Tracking Prevention) blocks third-party cookies by default.
- Firefox with Enhanced Tracking Protection set to Strict, and Firefox private windows.
- Chromium-based browsers in private/incognito windows, or when the user has chosen to block
  third-party cookies.

Symptom: login appears to succeed (`200`), but the next request returns
`401 UNAUTHENTICATED` and the user is returned to the login page; or the login request
itself fails with `403 CSRF_TOKEN_INVALID` because the `dt_csrf` cookie was not stored.

There are two supported remedies. Either one makes the cookies first-party.

#### Option A — shared parent domain (custom domain)

Serve both applications under one registrable domain that you own:

| Application | Host |
|---|---|
| Frontend (Vercel custom domain) | `app.example.com` |
| Backend (Render custom domain) | `api.example.com` |

`app.example.com` and `api.example.com` are the same site, so the API's cookies are not
third-party.

1. Add `app.example.com` as a custom domain on the Vercel project and `api.example.com` on
   the Render service, and create the DNS records each platform asks for. Wait for both
   certificates to be issued.
2. Render environment: `FRONTEND_URL=https://app.example.com` and
   `COOKIE_DOMAIN=.example.com`.
3. Vercel environment: `NEXT_PUBLIC_API_URL=https://api.example.com/api`, then redeploy.

`COOKIE_DOMAIN=.example.com` scopes the cookies to the parent domain, which means every
subdomain of `example.com` receives them. Use this only when all subdomains of that domain
are under your control.

The platform-provided hosts cannot be used for this option: `vercel.app` and `onrender.com`
are shared public suffixes, so a cookie cannot be scoped across them.

#### Option B — same-origin rewrite mode (no custom domain needed)

The frontend has an optional mode in which the browser calls `/api` on the frontend's own
origin and Next.js forwards the request to the backend server-side. The browser then sees a
single origin; the cookies belong to `<vercel-host>` and are first-party.

Vercel environment:

| Variable | Value |
|---|---|
| `API_PROXY_TARGET` | `https://<render-host>` |
| `NEXT_PUBLIC_API_URL` | `/api` |

Redeploy the frontend after setting both. `API_PROXY_TARGET` is the backend origin without
`/api` and without a trailing slash.

Render environment: keep `FRONTEND_URL=https://<vercel-host>` and leave `COOKIE_DOMAIN`
empty. Browsers still send an `Origin` header on unsafe same-origin requests and it is
forwarded to the backend, so the origin allowlist continues to apply.

Trade-offs of this mode: every API call takes an extra hop through Vercel, which adds
latency and counts against Vercel's usage limits; and the backend sees requests arriving
from Vercel's addresses, so per-IP rate limiting is only as accurate as the forwarding
headers the backend trusts. Confirm the exact variable names and behaviour of this mode in
the frontend README before relying on it.

### 5.3 Choosing

| Situation | Recommendation |
|---|---|
| Reviewer uses a default desktop Chrome or Edge profile | The default cross-site setup works. |
| The application must work in Safari, on iOS, or in private windows | Option B (no domain required) or Option A. |
| A custom domain is available | Option A; it has no extra hop. |

## 6. Post-deployment verification

Run after every production deployment and after any change to environment variables. The
`curl` commands are written for a POSIX shell (Git Bash on Windows). In PowerShell, call
`curl.exe` explicitly, because `curl` is an alias for a different command there.

```bash
API=https://<render-host>/api
ORIGIN=https://<vercel-host>
```

In same-origin rewrite mode (section 5.2, option B), also repeat checks 1 to 6 with
`API=https://<vercel-host>/api` to exercise the path the browser uses.

### 6.1 API checks with curl

**1. Health.** Expect `200`, `"success": true`, `"status": "ok"` and
`"database": "connected"`. A `503` means the service is up but cannot reach Atlas (check
`MONGODB_URI` and the Atlas access list). The first call after inactivity may be slow
(section 3.4).

```bash
curl -i "$API/health"
```

**2. CSRF token.** Expect `200`, a `csrfToken` in `data`, and a `Set-Cookie: dt_csrf=…`
header with `HttpOnly; Secure; SameSite=None`. The cookie is saved to the jar file.

```bash
curl -i -c cookies.txt -b cookies.txt -H "Origin: $ORIGIN" "$API/auth/csrf-token"
```

Copy the token value from the response:

```bash
CSRF='<csrfToken-from-response>'
```

**3. Login.** Expect `200`, `data.user` with `role` `admin`, and a
`Set-Cookie: dt_access=…` header with `HttpOnly; Secure; SameSite=None` and a `Max-Age`
matching `JWT_EXPIRES_IN`. The response must not contain the token in the body.

```bash
curl -i -c cookies.txt -b cookies.txt \
  -H "Origin: $ORIGIN" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{"email":"<admin-email>","password":"<admin-password>"}' \
  "$API/auth/login"
```

**4. Current user.** Expect `200` and the same user.

```bash
curl -i -b cookies.txt -H "Origin: $ORIGIN" "$API/auth/me"
```

**5. Doctors list.** Expect `200`, `data` as an array and a `pagination` object with
`page`, `limit`, `total` and `totalPages`. On a freshly seeded database with no doctors,
`data` is `[]` and `total` is `0`.

```bash
curl -i -b cookies.txt -H "Origin: $ORIGIN" "$API/doctors?page=1&limit=5&sortBy=createdAt&sortOrder=desc"
```

**6. CORS preflight from the frontend origin.** Expect a `2xx` status with
`Access-Control-Allow-Origin: https://<vercel-host>` (exactly, not `*`),
`Access-Control-Allow-Credentials: true`, `Access-Control-Allow-Methods` including `POST`,
and `Access-Control-Allow-Headers` including `Content-Type` and `X-CSRF-Token`.

```bash
curl -i -X OPTIONS \
  -H "Origin: $ORIGIN" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,x-csrf-token" \
  "$API/doctors"
```

**7. CORS from a foreign origin (negative).** Expect **no**
`Access-Control-Allow-Origin` header in the response.

```bash
curl -i -X OPTIONS \
  -H "Origin: https://not-allowed.example" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: content-type,x-csrf-token" \
  "$API/doctors"
```

**8. Protected route without a session (negative).** Expect `401` with
`"code": "UNAUTHENTICATED"`.

```bash
curl -i "$API/doctors"
```

**9. Unsafe request without a CSRF token (negative).** Expect `403` with
`"code": "CSRF_TOKEN_INVALID"`. Nothing is created.

```bash
curl -i -b cookies.txt \
  -H "Origin: $ORIGIN" \
  -H "Content-Type: application/json" \
  -d '{}' \
  "$API/doctors"
```

**10. Unsafe request from a foreign origin (negative).** Expect `403` with
`"code": "ORIGIN_NOT_ALLOWED"`.

```bash
curl -i -b cookies.txt \
  -H "Origin: https://not-allowed.example" \
  -H "Content-Type: application/json" \
  -H "X-CSRF-Token: $CSRF" \
  -d '{}' \
  "$API/doctors"
```

Rate-limit attribution: checks 1 to 10 are well under the limits. If ordinary use from one
browser produces `429 RATE_LIMITED`, or the response's rate-limit headers show a counter
shared with unrelated clients, the backend is not identifying client addresses behind the
proxy correctly (section 3.4).

**11. Logout and clean up.** Expect `200` with `"data": null` and a `Set-Cookie` header that
clears `dt_access`. Then delete the cookie jar; it contains a valid session token until
logout.

```bash
curl -i -c cookies.txt -b cookies.txt \
  -H "Origin: $ORIGIN" \
  -H "X-CSRF-Token: $CSRF" \
  -X POST "$API/auth/logout"
rm cookies.txt
```

### 6.2 Browser checks

Use a normal window in Chrome or Edge first, with developer tools open on the Network and
Application tabs.

- [ ] `https://<vercel-host>` loads over HTTPS without mixed-content warnings.
- [ ] Opening a protected page while signed out redirects to `/login?next=<path>`.
- [ ] A wrong password shows the invalid-credentials message and does not reveal whether
      the email exists.
- [ ] Signing in with `<admin-email>` / `<admin-password>` reaches the dashboard, and after
      login the browser returns to the `next` path when one was given.
- [ ] Application tab, cookies for the API host: `dt_access` and `dt_csrf` are present with
      `HttpOnly`, `Secure` and `SameSite=None`. (In rewrite mode they are listed under the
      frontend host.)
- [ ] `document.cookie` in the console does not show `dt_access` or `dt_csrf`.
- [ ] Network tab: API requests go to `https://<render-host>/api/...` (or `/api/...` in
      rewrite mode), carry the cookies, and unsafe requests carry `X-CSRF-Token`.
- [ ] Console: no CORS errors.
- [ ] Reloading a protected page keeps the session.
- [ ] Dashboard: the totals and every chart render, including the empty state when there is
      no data.
- [ ] Doctors: create, edit, search, filter, sort and paginate work; the URL reflects the
      list state and reloading restores it.
- [ ] Creating a doctor with an existing email shows the duplicate-email error on the email
      field.
- [ ] A doctor's page lists that doctor's patients; a patient can be added and removed
      there.
- [ ] Deleting a doctor who still has patients is refused with an explanatory message.
- [ ] Patients: list, edit, delete, search, filter and paginate work.
- [ ] Logging out returns to the login page, and the back button does not reveal protected
      data.
- [ ] Mobile viewport (device toolbar): navigation, tables and charts remain usable with no
      horizontal page scroll.
- [ ] Repeat sign-in in Safari and in a Firefox private window. If the session does not
      persist there, apply section 5.2.
- [ ] After the service has been idle, the first load is slow but completes (cold start).

### 6.3 Common failures

| Symptom | Likely cause | Fix |
|---|---|---|
| Render deploy fails during build with a missing build tool | `devDependencies` omitted because `NODE_ENV=production` | Build command `npm ci --include=dev && npm run build` (section 3.1). |
| Deploy succeeds, health check fails, log shows a server-selection or authentication error | Wrong `MONGODB_URI`, missing database name, password not URL-encoded, or Render's addresses not on the Atlas access list | Sections 2.3 and 2.4. |
| Deploy times out waiting for the service to become healthy | The server is not listening on the port Render provides, or the health check path is wrong | Remove any manually set `PORT`; health check path `/api/health`. |
| Browser console shows a CORS error on every API call | `FRONTEND_URL` is not the exact frontend origin | No trailing slash, `https`, the production host. Redeploy the backend. |
| Login returns `200`, next request returns `401` | Third-party cookies blocked, or cookies not `SameSite=None; Secure` because `NODE_ENV` is not `production` | Check `NODE_ENV`; otherwise section 5.2. |
| `403 CSRF_TOKEN_INVALID` on login in some browsers only | `dt_csrf` cookie blocked as third-party | Section 5.2. |
| Frontend calls `http://localhost:5000` in production | `NEXT_PUBLIC_API_URL` was not set for the Production environment when the build ran | Set it and redeploy. |
| Login always fails with `INVALID_CREDENTIALS` | The admin was never seeded in Atlas, or was seeded into a different database | Section 2.5; check the database name in the URI. |

## 7. Hand-over

When the deployment is complete, provide the reviewer with:

- the frontend URL (`https://<vercel-host>`);
- the two GitHub repository URLs;
- the demo admin email and password, sent through the submission channel and not committed
  to either repository;
- a note about the first-request delay on the free tier, and which cookie mode
  (cross-site, shared domain or rewrite) is in use.

After the review period, rotate `ADMIN_PASSWORD` (rerun `seed:admin`), `JWT_SECRET` and the
Atlas database user's password, and remove any `0.0.0.0/0` entry from the Atlas access list.
