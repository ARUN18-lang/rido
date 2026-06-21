You are a senior DevOps/backend engineer. Set up a complete 
docker-compose development environment for the "Rido" backend 
(Node.js + Express + PostgreSQL/PostGIS + Redis + BullMQ), so 
the entire stack starts with a single command and is reachable 
from physical phones and emulators on the same network for 
real-time multi-device testing.

---

## GOAL

Run `docker-compose up` once and get:
- PostgreSQL 15 with PostGIS extension, auto-initialized
- Redis (for caching, BullMQ, geospatial driver tracking, 
  surge cache)
- The Node.js backend itself, with hot-reload for development
- Automatic Prisma migration + seed on first boot
- Everything reachable from other devices on the same LAN 
  (not just localhost), so physical phones and emulators can 
  hit the API directly via the host machine's IP

---

## FILES TO CREATE

### 1. docker-compose.yml (project root)

Requirements:
- Service `postgres`:
  - Use `postgis/postgis:15-3.4` image (comes with PostGIS 
    pre-installed, avoids manual extension setup issues)
  - Expose port 5432 to host
  - Environment: POSTGRES_USER, POSTGRES_PASSWORD, 
    POSTGRES_DB — pull values from .env file, with sane 
    defaults for local dev (e.g. rido_dev / rido_dev_pass / 
    rido_db)
  - Volume: named volume `postgres_data` mapped to 
    `/var/lib/postgresql/data`, so data survives 
    `docker-compose down` (but add a documented command for 
    a full wipe when needed: `docker-compose down -v`)
  - Healthcheck: pg_isready, with reasonable interval/retries
  - Mount an `init-scripts/` folder to 
    `/docker-entrypoint-initdb.d/` for the CREATE EXTENSION 
    postgis statement (in case the base image doesn't already 
    enable it on the target DB by default — write the SQL 
    explicitly to be safe: 
    `CREATE EXTENSION IF NOT EXISTS postgis;`)

- Service `redis`:
  - Use `redis:7-alpine` (small image)
  - Expose port 6379 to host
  - Add `--appendonly yes` for persistence across restarts 
    (so BullMQ jobs and driver location cache aren't 
    wiped every restart)
  - Volume: named volume `redis_data`
  - Healthcheck: redis-cli ping

- Service `backend`:
  - Build from a local Dockerfile (write this — see below)
  - depends_on: postgres (condition: service_healthy), 
    redis (condition: service_healthy)
  - Expose port 3000, but bind to `0.0.0.0` not `127.0.0.1` 
    inside the app so it's reachable from other devices on 
    the LAN via the host machine's IP
  - Mount the local source code as a volume for hot-reload 
    during development (bind mount `./src:/app/src`, 
    `./prisma:/app/prisma`), while keeping `node_modules` as 
    a separate anonymous volume so the container's installed 
    deps aren't overwritten by the host's potentially 
    different OS/arch node_modules
  - Environment: load from `.env` file (DATABASE_URL should 
    point to `postgres:5432` — the Docker service name, not 
    localhost, since containers communicate via the Docker 
    network — and REDIS_URL should point to `redis:6379` 
    similarly)
  - Command: run a startup wrapper script (see item 4 below) 
    that waits for DB readiness, runs Prisma migrate deploy, 
    runs the seed script ONLY if the database is empty 
    (check for the existence of seeded admin user first — 
    don't reseed and duplicate data on every restart), then 
    starts the dev server with nodemon

- Add a `networks` section with a single bridge network so 
  all three services can resolve each other by service name

- Add a top-level comment block explaining how to find the 
  host machine's LAN IP (macOS: `ipconfig getifaddr en0`) 
  and how to point mobile devices/emulators at 
  `http://<that-ip>:3000` instead of localhost

### 2. Dockerfile (project root, for the backend service)

- Base image: `node:20-alpine` (or node:20-slim if alpine 
  causes native module build issues with Prisma — try alpine 
  first, document the fallback)
- Install OS-level build deps needed for Prisma/bcrypt/etc 
  native bindings (openssl, libc6-compat if alpine)
- Set WORKDIR /app
- Copy package.json + package-lock.json first, run npm 
  install (this layer caches separately from source code 
  changes, speeding up rebuilds)
- Copy the rest of the source
- Generate Prisma client (`npx prisma generate`)
- Expose port 3000
- Use nodemon for the dev CMD (already a devDependency from 
  earlier setup) so code changes inside the mounted volume 
  trigger automatic restarts
- Add a HEALTHCHECK instruction hitting GET /health

### 3. docker-compose.override.yml (optional, but create it)

- For any local-only tweaks (e.g., exposing Postgres on a 
  different host port if 5432 is already taken locally) 
  without touching the main compose file. Document that this 
  file is gitignored by convention and is for personal local 
  overrides only.

### 4. scripts/docker-entrypoint.sh

A startup wrapper the backend container runs on boot:

Wait for Postgres to be truly ready (not just the

container started — actually accepting connections; use

a wait-loop with pg_isready or a small Node script, since

depends_on/healthcheck handles container-level readiness

but migrations can still race on first boot)
Run npx prisma migrate deploy
Check if the seeded admin user already exists

(simple query); if NOT, run node prisma/seed.js
Start the server: npx nodemon src/server.js

Make this script executable and referenced as the container 
CMD.

### 5. .dockerignore

Exclude: node_modules, .git, .env (env vars come from 
docker-compose's env_file directive instead, not baked into 
the image), npm-debug.log, dist/build artifacts, .DS_Store

### 6. Update .env.example

Add Docker-specific notes inline as comments:
When running via docker-compose, DATABASE_URL and REDIS_URL
should reference the Docker service names (postgres, redis),
NOT localhost:
DATABASE_URL=postgresql://rido_dev:rido_dev_pass@postgres:5432/rido_db?schema=public

REDIS_URL=redis://redis:6379
For mobile devices/emulators to reach this backend, find
your machine's LAN IP and use it in the MOBILE APP's API
base URL config (not here) — e.g. http://192.168.1.42:3000

### 7. README section — "Local Development with Docker"

Write a clear section covering:
- Prerequisites (Docker Desktop installed, with a quick note 
  on Apple Silicon vs Intel Mac compatibility — Docker Desktop 
  handles this automatically but worth a one-line mention)
- First-time setup: `cp .env.example .env`, then 
  `docker-compose up --build`
- Subsequent runs: `docker-compose up` (no rebuild needed 
  unless package.json or Dockerfile changed)
- How to view logs for just the backend: 
  `docker-compose logs -f backend`
- How to run a one-off command inside the running backend 
  container (e.g. `docker-compose exec backend npx prisma 
  studio` to inspect the DB visually, or 
  `docker-compose exec backend npm test`)
- How to fully reset the database: 
  `docker-compose down -v && docker-compose up --build`
- How to find the host machine's LAN IP for mobile device 
  testing (macOS command), and a reminder to update the 
  mobile app's API_BASE_URL config to that IP instead of 
  localhost when testing on physical devices, plus a note 
  that Android emulators specifically can usually also use 
  the LAN IP directly (not the old 10.0.2.2 special-case, 
  since we're binding to 0.0.0.0 and using the real network 
  IP, which works uniformly across physical devices and 
  emulators)
- A troubleshooting subsection covering: "Postgres healthy 
  but migrations fail" (usually a timing race — point to the 
  wait-loop in the entrypoint script), "port already in use" 
  (how to find and kill the process, or use the override file 
  to remap), "backend can't resolve postgres/redis hostnames" 
  (confirm all services are on the same docker-compose network)

---

## EDGE CASES TO HANDLE

- First boot on a completely fresh machine: Postgres 
  container takes a few seconds to initialize before 
  accepting connections — the wait-loop in the entrypoint 
  script must handle this, not just rely on 
  depends_on.condition.service_healthy alone (healthcheck 
  passing doesn't always mean the DB is 100% ready for 
  Prisma's connection pattern immediately)
- Re-running `docker-compose up` after already having data: 
  must NOT re-run the seed script and create duplicate admin 
  users, zones, or fare configs — the entrypoint script's 
  existence-check handles this, make sure it's a genuine 
  idempotency check, not just "did migrations run"
- Developer on Apple Silicon vs Intel Mac: ensure the 
  Postgres/PostGIS and Redis images used have multi-arch 
  support (postgis/postgis and redis:alpine both do — confirm 
  in the Dockerfile/compose comments which architectures are 
  verified)
- Hot-reload not picking up changes: common Docker-on-Mac 
  issue is file-watching not working through bind mounts; if 
  nodemon doesn't detect changes, the agent should configure 
  nodemon with `--legacy-watch` (polling mode) as a documented 
  fallback in the README troubleshooting section
- Port conflicts: if the developer already has a local 
  Postgres or Redis running natively on the default ports, 
  document how to remap via docker-compose.override.yml 
  rather than forcing them to stop their other services
- .env file missing on first clone: docker-compose should 
  fail with a clear error message pointing to 
  `cp .env.example .env`, not a cryptic Docker error

---

## DELIVERABLES

1. docker-compose.yml
2. Dockerfile
3. docker-compose.override.yml (template/example version, 
   safe to commit, with actual personal overrides gitignored)
4. scripts/docker-entrypoint.sh (executable)
5. .dockerignore
6. Updated .env.example with Docker-specific comments
7. New README.md section: "Local Development with Docker"
8. Verify end-to-end: run `docker-compose up --build` from a 
   clean state and confirm — migrations apply, seed runs 
   exactly once, GET /health returns 200, and the API is 
   reachable from the LAN IP (not just localhost) by testing 
   with curl against the machine's actual network IP, not 
   127.0.0.1

Do not leave any placeholder values — all defaults must 
actually work out of the box for a first-time clone + 
docker-compose up, with no manual database setup steps 
required beyond copying the .env file.