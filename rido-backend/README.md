# Rido Backend

Production-ready Node.js backend for **Rido** — a ride-sharing platform for Tamil Nadu, India. Built to handle **10,000+ daily active users** with horizontal scaling via Redis, BullMQ job queues, and PostgreSQL connection pooling.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Database:** PostgreSQL 15 + PostGIS
- **ORM:** Prisma (raw SQL for geospatial queries)
- **Cache / Queues:** Redis + BullMQ (ioredis)
- **Real-time:** Socket.io
- **Auth:** JWT + OTP (MSG91)
- **Payments:** Razorpay
- **Maps:** Google Maps Platform
- **Push:** Firebase Cloud Messaging

## Quick Start

### Prerequisites

- Node.js 20+
- PostgreSQL 15 with PostGIS extension
- Redis 7+

### Setup

```bash
cd rido-backend
cp .env.example .env
# Edit .env with your credentials

npm install
npx prisma migrate dev
npm run seed
npm run dev
```

Server starts at `http://localhost:3000`

### Local Development with Docker

Alternatively, you can run the entire stack (PostgreSQL + PostGIS, Redis, Node.js backend, migrations, and seeding) with a single command using Docker.

#### Prerequisites
- Docker Desktop installed on your machine.
- Apple Silicon (M1/M2/M3) and Intel Macs are fully supported.

#### Setup & Run
1. Copy the environment template:
   ```bash
   cp .env.example .env
   ```
   *(Ensure JWT secrets are filled in `.env`. Database and Redis connection strings will automatically point to internal containers).*

2. Spin up the containers (builds on first run):
   ```bash
   docker-compose up --build
   ```

The backend server will start with hot-reload enabled via `nodemon` at `http://localhost:3000`.

#### Common Commands
* **Stop the containers**: `docker-compose down`
* **Wipe database & reset fresh**: `docker-compose down -v && docker-compose up --build`
* **View backend logs**: `docker-compose logs -f backend`
* **Run a shell command inside the container (e.g. tests)**:
  ```bash
  docker-compose exec backend npm test
  ```
* **Open Prisma Studio**:
  ```bash
  docker-compose exec backend npx prisma studio
  ```

#### Multi-Device & LAN Mobile Testing
Since the backend service inside Docker is bound to `0.0.0.0`, other devices on your local network (physical phones, external emulators) can access it directly via your computer's LAN IP:
1. Find your machine's LAN IP:
   * **macOS command**: `ipconfig getifaddr en0` (or check Network Settings)
2. Update your mobile app's API base URL config (in `rido-rider` / `rido-driver` projects) to:
   `http://<YOUR_LAN_IP>:3000`

#### Troubleshooting
* **Nodemon hot-reload not picking up changes on macOS**:
  This is sometimes a Docker file-sharing latency issue. You can force nodemon to use polling by editing `package.json` or running with legacy watch flag:
  `npx nodemon --legacy-watch src/server.js`
* **Port is already in use**:
  If you have a native Postgres or Redis running on your host, you can customize host port bindings by copying or modifying `docker-compose.override.yml`.
* **Prisma migration timing out / timing race**:
  `scripts/docker-entrypoint.sh` includes an automated health loop using `pg_isready` to block migrations and start-up until the DB container is fully ready.

## API Overview

All endpoints are under `/api/v1/`

| Module    | Base Path           | Description                    |
|-----------|---------------------|--------------------------------|
| Auth      | `/auth`             | OTP login, JWT refresh         |
| Users     | `/users`            | Profile, wallet, ride history  |
| Drivers   | `/drivers`          | Registration, KYC, go online   |
| Vehicles  | `/vehicles`         | Vehicle management             |
| Fare      | `/fare`             | Fare estimation                |
| Rides     | `/rides`            | Book, cancel, track rides      |
| Pools     | `/pools`            | Shared ride pool status        |
| Payments  | `/payments`         | Razorpay, wallet, cash         |
| Admin     | `/admin`            | KYC, zones, analytics          |

## Key Features

### Ride Pooling
- 5-minute match window with 65% route overlap threshold
- Proportional fare split capped at solo fare
- Auto-converts to solo if no match found

### Driver Matching
- Redis geospatial search (5km → 10km fallback)
- 20-second accept timeout per driver
- FCM + Socket.io dual notification

### Real-time Tracking
- Socket.io rooms per ride
- Route deviation detection (>500m)
- SOS alerts to emergency contacts

## Scaling for 10K Users/Day

| Component    | Recommendation                                      |
|--------------|-----------------------------------------------------|
| API servers  | 2–3 instances behind load balancer                  |
| PostgreSQL   | Connection pool (PgBouncer), read replicas later    |
| Redis        | Single instance sufficient; cluster at 50K+ DAU       |
| BullMQ       | Separate worker process(es) from API servers        |
| Socket.io    | Redis adapter for multi-instance socket fanout      |

~10K users/day ≈ 7 requests/minute average — well within single-server capacity. Peak hours (morning/evening commute) benefit from the queue-based driver matching to absorb spikes.

## Project Structure

```
rido-backend/
├── prisma/          # Schema, migrations, seed
├── src/
│   ├── config/      # Env, Redis, Firebase, S3, Razorpay, Maps
│   ├── modules/     # Feature modules (auth, rides, pooling, etc.)
│   ├── workers/     # BullMQ job processors
│   ├── queues/      # Queue definitions
│   ├── middleware/  # Auth, validation, rate limiting
│   └── utils/       # Logger, geo, fare calculator, JWT
└── tests/           # Unit + integration tests
```

## Scripts

```bash
npm run dev          # Development with nodemon
npm start            # Production
npm run migrate      # Deploy migrations
npm run migrate:dev  # Dev migrations
npm run seed         # Seed sample data
npm test             # Run tests
```

## Environment Variables

See `.env.example` for the full list. Required for local dev:

- `DATABASE_URL` — PostgreSQL connection string
- `REDIS_URL` — Redis connection string
- `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` — Min 32 characters each

## License

Proprietary — Rido Platform
