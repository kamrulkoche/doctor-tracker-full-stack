# Doctor Tracker — Local Development

Locally, MongoDB runs in Docker and the backend and frontend run directly on the host.

```
doctor-tracker/
  doctor-tracker-backend/   Express API, port 5000
    docker-compose.yml      MongoDB service only
    .env.example            backend + Docker Compose (MONGO_*) variables (copy to .env)
  doctor-tracker-frontend/  Next.js app, port 3000
  documentation/
```

All `docker compose` commands in this document are run from `doctor-tracker-backend/` (the
directory containing `docker-compose.yml`). Placeholders are written in `<angle brackets>`.

## 1. Prerequisites

- Docker Desktop (Windows, macOS) or Docker Engine with the Compose v2 plugin (Linux).
  The commands use `docker compose` (with a space), not the legacy `docker-compose` binary.
- Docker Desktop must be running before any `docker compose` command.
- Node.js and npm for the backend and frontend. Use the Node.js version stated in each
  repository's README.
- Port `27017` free on the host, or a different value for `MONGO_PORT` (section 11).

Check the tooling:

```bash
docker --version
docker compose version
docker info
```

`docker info` fails with a connection error when the Docker daemon is not running.

## 2. Create the backend `.env`

Docker Compose reads the variables for the MongoDB container from `.env` in
`doctor-tracker-backend/` — the same file the backend reads; the backend ignores the
`MONGO_*` variables. The file is git-ignored; `.env.example` is the committed template.

```bash
cp .env.example .env
```

PowerShell:

```powershell
Copy-Item .env.example .env
```

Then edit `.env`:

| Variable | Meaning |
|---|---|
| `MONGO_INITDB_ROOT_USERNAME` | Name of the MongoDB root user created on first initialisation. Required; Compose refuses to start without it. |
| `MONGO_INITDB_ROOT_PASSWORD` | Password of that user. Required. Use a long random value. |
| `MONGO_INITDB_DATABASE` | Database name passed to the image's initialisation step. Default `doctor_tracker`. MongoDB creates a database when the first document is written, so the database does not appear in listings until the backend or a seed script writes to it. |
| `MONGO_PORT` | Host port published on `127.0.0.1`. Default `27017`. |

Notes on choosing the password:

- A password made of letters and digits only avoids two separate escaping problems:
  URL-encoding in the connection string (section 6) and `$` interpolation in Compose `.env`
  files. If the password contains `$`, wrap the value in single quotes in `.env`.
- These values are applied **only when the data volume is initialised for the first time**
  (section 7).

## 3. Docker Compose commands

| Command | What it does |
|---|---|
| `docker compose config` | Validates `docker-compose.yml` and prints it with variables from `.env` substituted. Fails with a clear message if a required variable is missing. The output includes the root password in plain text; do not paste it into tickets or chat. |
| `docker compose up -d mongodb` | Creates (if needed) and starts the MongoDB container in the background. Recreates the container if its configuration changed. Existing data in the volume is kept. |
| `docker compose ps` | Lists the project's containers with state and health (`starting`, `healthy`, `unhealthy`). |
| `docker compose logs -f mongodb` | Follows the MongoDB log. `Ctrl+C` stops following; the container keeps running. |
| `docker compose restart mongodb` | Restarts the existing container without recreating it. Data and configuration are unchanged. It does not pick up changes made to `.env`; use `up -d` for that. |
| `docker compose down` | Stops and removes the container and the project network. **The data volume is kept**; the next `up` finds all data intact. |
| `docker compose down -v` | Same as `down`, and also deletes the named volume. See the warning below. |

```bash
docker compose config
docker compose up -d mongodb
docker compose ps
docker compose logs -f mongodb
docker compose restart mongodb
docker compose down
```

> **WARNING — DESTRUCTIVE: `docker compose down -v`**
>
> `docker compose down -v` permanently deletes the `mongodb_data` volume: every database in
> the container, including `doctor_tracker`, `doctor_tracker_test`, all users created inside
> MongoDB and the admin account. There is no undo.
>
> It is **never** part of a routine restart or of troubleshooting. Do not run it to fix a
> connection error, an authentication error, an unhealthy container or a port conflict; none
> of those are fixed by deleting data, and each has a non-destructive remedy in section 11.
>
> Run it only when the intent is to discard the local database and start from an empty one,
> after confirming nothing in it is needed. Afterwards the admin and demo data must be
> seeded again.

```bash
# Deletes all local MongoDB data. Read the warning above first.
docker compose down -v
```

## 4. Health check

The Compose service defines a health check that runs inside the container:

- It executes `mongosh` against `127.0.0.1:27017` inside the container, authenticating as the
  root user against the `admin` database, and runs `db.adminCommand('ping')`.
- The container is `healthy` only when that authenticated command returns `ok: 1`. A
  container that has started but does not yet accept authenticated commands, or whose root
  credentials do not match the environment variables it was created with, is not healthy.
- Timing: first probe window of 20 s (`start_period`), then a probe every 10 s with a 5 s
  timeout; 10 consecutive failures mark the container `unhealthy`.

Read the health state:

```bash
docker compose ps
docker inspect --format "{{.State.Health.Status}}" doctor-tracker-mongodb
```

Show the output of recent probes (useful when the state is `unhealthy`):

```bash
docker inspect --format "{{json .State.Health}}" doctor-tracker-mongodb
```

The health check uses the credentials stored in the container's environment, which are
copied from the backend `.env` when the container is created. This matters for credential
rotation (section 7).

## 5. Data persistence

MongoDB stores its files in the named volume `mongodb_data`, mounted at `/data/db`. Compose
prefixes volume names with the project name, so Docker lists it as
`doctor-tracker_mongodb_data`.

| Action | Container | Data volume |
|---|---|---|
| `docker compose restart mongodb` | restarted | kept |
| `docker compose stop` / `start` | stopped / started | kept |
| `docker compose down` | removed | **kept** |
| Docker Desktop or host restart | restarted automatically (`restart: unless-stopped`) | kept |
| `docker compose down -v` | removed | **deleted** |

Inspect the volume:

```bash
docker volume ls
docker volume inspect doctor-tracker_mongodb_data
```

## 6. Connection strings

### 6.1 Backend running on the host (the default)

The container port is published on the loopback interface only, so the host connects to
`127.0.0.1`. With the root user, which is defined in the `admin` database:

```
MONGODB_URI=mongodb://<user>:<password>@127.0.0.1:<MONGO_PORT>/doctor_tracker?authSource=admin
MONGODB_URI_TEST=mongodb://<user>:<password>@127.0.0.1:<MONGO_PORT>/doctor_tracker_test?authSource=admin
```

`<MONGO_PORT>` is `27017` unless changed in the backend `.env`. `authSource` names the database
in which the user was created, not the database being used. Without `authSource=admin`, the
driver would look for the root user in `doctor_tracker` and authentication would fail.

Use `127.0.0.1` rather than `localhost`: on some systems `localhost` resolves to the IPv6
address `::1` first, and the port is published on IPv4 only.

### 6.2 Backend running in a container (optional)

The Compose file defines only the MongoDB service. If a backend container is added to the
same Compose project and attached to the `doctor-tracker` network, it reaches MongoDB by
service name on the container port. `127.0.0.1` inside a backend container refers to that
container itself, and `MONGO_PORT` does not apply because it only affects the host side of
the port mapping.

```
MONGODB_URI=mongodb://<user>:<password>@mongodb:27017/doctor_tracker?authSource=admin
```

### 6.3 URL-encoding credentials

The user name and password are part of a URI. Any character with a meaning in a URI must be
percent-encoded, otherwise the driver parses the string incorrectly and reports a malformed
URI or an authentication failure.

| Character | Encoded | Character | Encoded |
|---|---|---|---|
| `@` | `%40` | `#` | `%23` |
| `:` | `%3A` | `%` | `%25` |
| `/` | `%2F` | `$` | `%24` |
| `?` | `%3F` | space | `%20` |

Example: the password `p@ss:word/1` is written as `p%40ss%3Aword%2F1`.

Encode a value with Node.js (the argument is recorded in shell history; clear it afterwards
or use a password that needs no encoding):

```bash
node -e "console.log(encodeURIComponent(process.argv[1]))" "<password>"
```

Encoding applies only inside the URI. The backend `.env` and any `mongosh` prompt take the
password as it is, unencoded.

## 7. Credentials: first initialisation and rotation

### 7.1 `MONGO_INITDB_*` applies once

The `mongo` image reads `MONGO_INITDB_ROOT_USERNAME`, `MONGO_INITDB_ROOT_PASSWORD` and
`MONGO_INITDB_DATABASE` only when it starts with an **empty** data directory. On that first
start it creates the root user and stores it inside the database files in the volume.

On every later start the volume already contains data, so the image skips initialisation and
ignores these variables for user creation. Editing the password in `.env` and restarting does
**not** change the password in MongoDB. It only changes the value the health check uses, so
the container becomes `unhealthy` while the old password is still the valid one.

### 7.2 Rotating the root password on an existing volume

Change the password inside MongoDB first, then bring the two environment files in line.

1. Open a shell as the current root user. `-p` without a value makes `mongosh` prompt for the
   password, which keeps it out of shell history.

   ```bash
   docker compose exec mongodb mongosh -u <current-root-user> -p --authenticationDatabase admin
   ```

   In Git Bash on Windows, prefix the command with `winpty` if the prompt does not appear.

2. Change the password. `passwordPrompt()` asks for the new value without echoing it.

   ```javascript
   db.getSiblingDB("admin").changeUserPassword("<current-root-user>", passwordPrompt())
   ```

   The equivalent with `updateUser`, which can also change roles:

   ```javascript
   db.getSiblingDB("admin").updateUser("<current-root-user>", { pwd: passwordPrompt() })
   ```

3. Update `MONGO_INITDB_ROOT_PASSWORD` in the backend `.env` to the new value. This keeps the
   health check working and keeps the file truthful for the next person.

4. Update the password inside `MONGODB_URI` and `MONGODB_URI_TEST` in
   `doctor-tracker-backend/.env` (URL-encoded if necessary). Skip this step if the backend
   connects as a separate application user (section 8) whose password was not changed.

5. Recreate the container so it receives the new environment, then confirm it is healthy.
   `up -d` recreates the container because its configuration changed; the volume is kept.

   ```bash
   docker compose up -d mongodb
   docker compose ps
   ```

6. Restart the backend so it reconnects with the new URI.

A MongoDB user cannot be renamed. To change the root **user name**, create a second user
with the `root` role, confirm that it can log in, update both environment files, recreate
the container, and only then drop the old user:

```javascript
db.getSiblingDB("admin").createUser({ user: "<new-root-user>", pwd: passwordPrompt(), roles: [ { role: "root", db: "admin" } ] })
// after verifying the new user works and both .env files are updated:
db.getSiblingDB("admin").dropUser("<old-root-user>")
```

Deleting the volume with `docker compose down -v` also "resets" the credentials, by
destroying all data. It is not a rotation procedure.

## 8. Recommended: a least-privilege application user

The root user can read and modify every database and manage users. The backend needs only to
read and write its own two databases. Connecting the backend as a dedicated user limits the
effect of a leaked connection string or an application bug.

1. Open a shell as root:

   ```bash
   docker compose exec mongodb mongosh -u <root-user> -p --authenticationDatabase admin
   ```

2. Create the user in the `doctor_tracker` database with `readWrite` on the application
   database and on the test database:

   ```javascript
   use doctor_tracker
   db.createUser({
     user: "<app-user>",
     pwd: passwordPrompt(),
     roles: [
       { role: "readWrite", db: "doctor_tracker" },
       { role: "readWrite", db: "doctor_tracker_test" }
     ]
   })
   ```

3. Verify:

   ```javascript
   db.getUser("<app-user>")
   ```

4. Point the backend at the new user. The user was created in `doctor_tracker`, so that is
   the authentication database for **both** URIs, including the test URI:

   ```
   MONGODB_URI=mongodb://<app-user>:<app-password>@127.0.0.1:<MONGO_PORT>/doctor_tracker?authSource=doctor_tracker
   MONGODB_URI_TEST=mongodb://<app-user>:<app-password>@127.0.0.1:<MONGO_PORT>/doctor_tracker_test?authSource=doctor_tracker
   ```

Notes:

- `readWrite` covers reading, writing, creating collections and indexes, and dropping
  collections. It does **not** include `dropDatabase`. If the test suite resets its database
  by dropping the whole database rather than clearing collections, additionally grant
  `dbAdmin` on the test database only:

  ```javascript
  use doctor_tracker
  db.grantRolesToUser("<app-user>", [ { role: "dbAdmin", db: "doctor_tracker_test" } ])
  ```

- The root user stays in the backend `.env` for the container and its health check. It does not
  need to appear in the backend's `.env` once the application user is in use.
- The application user lives in the data volume. After `docker compose down -v` it must be
  created again.
- To rotate the application user's password, run `changeUserPassword` as in section 7.2 with
  `use doctor_tracker` selected, then update only `doctor-tracker-backend/.env`.

## 9. Startup order

Each step depends on the one before it.

| # | Step | Where | Command |
|---|---|---|---|
| 1 | Create the backend `.env` and set the MongoDB credentials | `doctor-tracker-backend/` | `cp .env.example .env`, then edit |
| 2 | Start MongoDB and wait for `healthy` | `doctor-tracker-backend/` | `docker compose up -d mongodb`, then `docker compose ps` |
| 3 | Fill in the remaining backend variables in `.env` | `doctor-tracker-backend/` | edit `.env` |
| 4 | Install backend dependencies | `doctor-tracker-backend/` | `npm install` |
| 5 | Create the admin account | `doctor-tracker-backend/` | `npm run seed:admin` |
| 6 | Optional: load fictional demo data | `doctor-tracker-backend/` | `npm run seed:demo` |
| 7 | Start the backend | `doctor-tracker-backend/` | `npm run dev` |
| 8 | Create the frontend `.env.local`, install dependencies, start the frontend | `doctor-tracker-frontend/` | see below |

Backend `.env` values for local development (variable list from `API_CONTRACT.md` section 7):

| Variable | Local value |
|---|---|
| `NODE_ENV` | `development` |
| `PORT` | `5000` |
| `MONGODB_URI` | a URI from section 6.1 or section 8 |
| `MONGODB_URI_TEST` | the matching test URI; database name must end in `_test` |
| `JWT_SECRET` | a random string of at least 32 characters |
| `JWT_EXPIRES_IN` | `1d` |
| `FRONTEND_URL` | `http://localhost:3000` |
| `COOKIE_DOMAIN` | empty |
| `ADMIN_NAME`, `ADMIN_EMAIL`, `ADMIN_PASSWORD` | the admin account that `seed:admin` creates; these are the login credentials |

Generate a `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

Backend, from `doctor-tracker-backend/`:

```bash
npm install
npm run seed:admin
npm run seed:demo
npm run dev
```

- `seed:admin` is an idempotent upsert of the admin defined by `ADMIN_*`; running it again is
  safe and is also how the admin's name or password is changed.
- `seed:demo` inserts fictional doctors and patients spread over the last 12 months. It is
  idempotent and refuses to run when `NODE_ENV=production`.

Confirm the backend is up and connected to the database:

```bash
curl -i http://localhost:5000/api/health
```

Expected: status `200` and `"database": "connected"` in `data`. Status `503` means the
process is running but cannot reach MongoDB.

Frontend, from `doctor-tracker-frontend/`. Create `.env.local` containing:

```
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

Then install and start it using the script names in the frontend README (the Next.js
convention is shown):

```bash
npm install
npm run dev
```

Open `http://localhost:3000` and sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`.

Other backend scripts defined by the contract: `build`, `start` (runs the built server),
`typecheck`, `lint`, `test`, and `db:explain` (prints query plans for the key list queries).

To stop: `Ctrl+C` in the frontend and backend terminals, then `docker compose down` in
`doctor-tracker-backend/`. Data is kept.

## 10. Test database convention

- Automated backend tests run against the Dockerized MongoDB using `MONGODB_URI_TEST`, never
  `MONGODB_URI`.
- The test database is separate from the development database (`doctor_tracker_test` beside
  `doctor_tracker`, in the same container). Tests are allowed to wipe it.
- The database name in `MONGODB_URI_TEST` **must end in `_test`**. The test setup refuses to
  run otherwise. This guard exists so that a mis-set variable can never cause the tests to
  wipe the development database or an Atlas database.
- Never set `MONGODB_URI_TEST` to an Atlas connection string.
- MongoDB must be running and healthy before the tests start.

```bash
docker compose ps
npm test
```

(`npm test` is run from `doctor-tracker-backend/`.)

## 11. Troubleshooting

None of the remedies below involve `docker compose down -v`.

| Symptom | Likely cause | Remedy |
|---|---|---|
| `docker compose up` fails with `Bind for 127.0.0.1:27017 failed: port is already allocated` or `address already in use` | Another MongoDB (a local install, or another project's container) is using port 27017 | Set `MONGO_PORT` in the backend `.env` to a free port, for example `27018`. Run `docker compose up -d mongodb`. Change the port in `MONGODB_URI` and `MONGODB_URI_TEST` in the backend `.env` to match. To find the other process on Windows: `netstat -ano \| findstr :27017`. |
| `required variable MONGO_INITDB_ROOT_USERNAME is missing a value: Set MONGO_INITDB_ROOT_USERNAME in .env` | The backend `.env` does not exist or the variable is empty | Create and fill in the backend `.env` (section 2). Check with `docker compose config`. |
| Backend logs `Authentication failed` (`MongoServerError`, code 18) right after the backend `.env` password was edited | `MONGO_INITDB_*` only applies on first volume initialisation; MongoDB still has the old password | Either put the old password back in the backend `.env`, or rotate properly (section 7.2). Then make sure the backend `.env` URIs carry the password MongoDB actually has. |
| `Authentication failed` with a password that is known to be correct | Wrong `authSource`, or special characters in the password are not URL-encoded | Root user: `authSource=admin`. Application user from section 8: `authSource=doctor_tracker`. Encode the password (section 6.3). |
| `docker compose ps` shows `unhealthy` | The health check cannot authenticate (backend `.env` no longer matches the password stored in the volume), or `mongod` is failing to start | Read the probe output: `docker inspect --format "{{json .State.Health}}" doctor-tracker-mongodb`. Read the server log: `docker compose logs --tail 100 mongodb`. For a credential mismatch, follow section 7. For a start-up failure, the log names the cause (for example, no disk space left in Docker Desktop). |
| `docker compose ps` shows `health: starting` for a long time on first start | First initialisation creates the root user and restarts `mongod` internally | Wait; follow progress with `docker compose logs -f mongodb`. The container is given 20 s plus up to 10 probes. |
| `error during connect`, `Cannot connect to the Docker daemon`, or on Windows `open //./pipe/dockerDesktopLinuxEngine: The system cannot find the file specified` | Docker Desktop is not running | Start Docker Desktop, wait until it reports that the engine is running, confirm with `docker info`, then retry. |
| Backend logs `ECONNREFUSED 127.0.0.1:27017` or `MongooseServerSelectionError` | MongoDB is not running, not yet healthy, or published on a different port | `docker compose ps` must show the container `healthy`. If it is not listed, `docker compose up -d mongodb`. Check that the port in `MONGODB_URI` equals `MONGO_PORT`. |
| Backend logs `ECONNREFUSED ::1:27017` | The URI uses `localhost`, which resolved to IPv6; the port is published on IPv4 only | Use `127.0.0.1` in the URI. |
| Browser console: request `blocked by CORS policy`, no `Access-Control-Allow-Origin` header | The page origin is not exactly on the backend allowlist | `FRONTEND_URL` must equal the origin shown in the address bar: scheme, host and port, no trailing slash and no path. `http://localhost:3000` and `http://127.0.0.1:3000` are different origins. Restart the backend after changing `.env`. |
| Login returns `200` but the next request returns `401 UNAUTHENTICATED`; the cookie is not sent | The frontend and the API are being addressed with different host names (for example the page on `127.0.0.1:3000` and the API on `localhost:5000`). Those are different sites, and a `SameSite=Lax` cookie is not sent on cross-site background requests | Use `localhost` for both: open `http://localhost:3000`, and set `NEXT_PUBLIC_API_URL=http://localhost:5000/api`. Different ports on the same host name are the same site. |
| Cookies are not stored at all locally | Backend started with `NODE_ENV=production` over plain HTTP, so cookies are `Secure` and `SameSite=None`; some browsers reject these without HTTPS | Use `NODE_ENV=development` for local runs. |
| `403 CSRF_TOKEN_INVALID` on every unsafe request | The `dt_csrf` cookie is not reaching the API (same causes as the two rows above), or the request is sent without credentials | Fix the cookie delivery first. In the browser's network panel, confirm that `GET /api/auth/csrf-token` set `dt_csrf` and that the failing request carries both the cookie and `X-CSRF-Token`. |
| `403 ORIGIN_NOT_ALLOWED` | An unsafe request arrived with an `Origin` header that is not on the allowlist | Same remedy as the CORS row. When calling the API with a tool that sends an `Origin` header, send an allowed one. |
| `429 RATE_LIMITED` on login during manual testing | More than 10 failed login attempts from the same IP within 15 minutes | Wait for the window to pass, or restart the backend if the limiter keeps its counters in memory. |
| Changed `NEXT_PUBLIC_API_URL` has no effect | The value is read when the Next.js process starts and is compiled into the client bundle | Stop and restart the frontend dev server. |
| Tests refuse to start with a message about the database name | `MONGODB_URI_TEST` is missing or its database name does not end in `_test` | Set it as shown in section 6.1 or section 8. |
