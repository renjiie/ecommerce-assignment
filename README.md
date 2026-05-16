# E-Commerce Order Processing Backend

FastAPI backend for the order-processing assignment. The code follows a feature-based modular architecture with PostgreSQL, SQLAlchemy 2.0, Alembic, Clerk SDK request authentication, and Celery + Redis for scheduled order processing.

## Architecture

See the full system architecture, diagrams, request flows, scalability notes, caching details, concurrency model, Clerk auth implementation, and load-testing plan in [`./architecture.md`](./architecture.md).

## Layout

```text
backend/
  app/
    core/        shared config, database, auth, errors, logging
    orders/      order API, service, repository, models, schemas, task
    workers/     Celery app and synchronous worker DB session
    middleware/  request ID middleware
  alembic/       migrations
  tests/         unit and integration tests
frontend/        React/Vite order operations console
```

## Local Setup

```bash
cd backend
cp .env.example .env
uv run --extra dev python -m pytest
```

The app targets Python 3.11+. Development auth bypass is enabled in `.env.example` so reviewers can call protected endpoints without Clerk setup.
When `AUTH_BYPASS=true` and `ENV=development`, the frontend can switch reviewer roles by sending
`X-Dev-Role: CUSTOMER|ADMIN`; this is ignored outside the dev bypass path.

When Clerk sign-in is enabled, the React app still sends the Clerk bearer token from `useAuth().getToken()`.
In local development it can also send `X-Reviewer-Role` and `X-Reviewer-User-Id` so assignment reviewers
can switch between Customer and Admin in the UI after sign-in. The backend only honors those reviewer
headers when `ENV=development` and `REVIEWER_ROLE_SWITCH_ENABLED=true`.

For Clerk request authentication, the backend uses Clerk's official Python SDK. Prefer setting
`CLERK_JWT_KEY` (the PEM public key from Clerk) for networkless verification, or set
`CLERK_SECRET_KEY` to let Clerk's SDK fetch and cache JWKS from the Backend API. Production should
also set `CLERK_AUTHORIZED_PARTIES` to the allowed frontend origins.

## Run With Docker Compose

```bash
cd backend
cp .env.example .env
docker compose up -d postgres redis
docker compose run --rm api alembic upgrade head
docker compose up --build
```

## API Documentation

Once the backend is running, you can access the interactive API documentation at:

- **Swagger UI**: [http://localhost:8000/docs](http://localhost:8000/docs)
- **ReDoc**: [http://localhost:8000/redoc](http://localhost:8000/redoc)
- **Health Check**: [http://localhost:8000/health](http://localhost:8000/health)

## Main Endpoints

```text
POST   /api/v1/orders
GET    /api/v1/orders
GET    /api/v1/orders/{order_id}
PATCH  /api/v1/orders/{order_id}/status
POST   /api/v1/orders/{order_id}/cancel
GET    /health
```

## Verification

```bash
uv run --extra dev python -m pytest
uv run --extra dev ruff check .
uv run --extra dev mypy app
DATABASE_URL=sqlite+aiosqlite:///./local_alembic_check.db uv run --extra dev alembic upgrade head
```

Docker verification requires Docker to be installed locally.

## Production Deployment

The frontend is a static Vite app and is a good fit for Vercel. Configure the Vercel project with:

- Root Directory: `frontend`
- Install Command: `npm ci`
- Build Command: `npm run build`
- Output Directory: `dist`
- Environment: `VITE_API_BASE_URL`, `VITE_AUTH_BYPASS=false`, `VITE_CLERK_PUBLISHABLE_KEY`

The FastAPI backend can run on Vercel Functions, but this app also needs PostgreSQL, Redis, and a
Celery worker/beat process. Vercel is therefore best used for the frontend only unless the worker is
replaced with a Vercel Cron-triggered endpoint and managed external Redis/Postgres services.

Recommended production split:

- Deploy `frontend/` to Vercel.
- Deploy `backend/` as a container on a service with long-running worker support.
- Run PostgreSQL and Redis as managed services.
- Set backend `ENV=production`, `AUTH_BYPASS=false`, one of `CLERK_JWT_KEY` or `CLERK_SECRET_KEY`,
  `CLERK_AUTHORIZED_PARTIES`, and production `CORS_ORIGINS`.

The backend settings fail fast if production is started with auth bypass enabled or without a Clerk
verification key.
