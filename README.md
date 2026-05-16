# E-Commerce Order Processing System

Order-processing assignment with a FastAPI backend and React/Vite frontend. The backend follows a
feature-based modular architecture with PostgreSQL, SQLAlchemy 2.0, Alembic, Clerk SDK request
authentication, and Celery + Redis for local scheduled processing demos.

## Architecture

See the concise current architecture in [`./architecture.md`](./architecture.md).

## n8n Assistant Widget

The frontend can show a minimizable n8n chat assistant when
`VITE_N8N_CHAT_WEBHOOK_URL` is set. The n8n Chat Trigger/Webhook must allow the
frontend origin, such as the Vercel production URL, in its CORS/Allowed Origins settings.

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

## Expected Behavior: Dev vs Production

| Area | Local/dev | Current production deployment |
| --- | --- | --- |
| Frontend | Vite dev server or local build | Vercel static deployment |
| Backend | FastAPI through local Python or Docker Compose | Render free web service |
| Database | Local PostgreSQL through Docker Compose or SQLite in tests | Render free PostgreSQL |
| Auth | Dev bypass or Clerk | Clerk only |
| Role switching | Reviewer role switch can be enabled | Disabled; role must come from Clerk session token claims |
| Background processing | Celery beat + Redis promote `PENDING` orders every 5 minutes | Not running, to stay within free Render services |
| Pending orders | Auto-promoted to `PROCESSING` when local Celery is running | Stay `PENDING` until an admin manually updates status |

The assignment requirement for a 5-minute background job is implemented and test-covered in the
local/dev setup through Celery and Redis. The hosted free production demo intentionally omits Redis,
Celery worker, Celery beat, and cron/scheduler services because those are paid or not available in
the selected free deployment path.

## Run With Docker Compose

```bash
cd backend
cp .env.example .env
docker compose up -d postgres redis
docker compose run --rm api alembic upgrade head
docker compose up --build
```

Docker Compose starts the API, PostgreSQL, Redis, Celery worker, and Celery beat. With this setup,
pending orders are automatically moved to `PROCESSING` every 5 minutes.

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

Use Vercel for the static Vite frontend and Render for the FastAPI backend plus Postgres. The
production Render setup intentionally does not run Redis, Celery worker, Celery beat, or a scheduler;
Celery remains available for local development demos.

Because Render free web services cannot run the paid worker/cron pieces, production order processing
is manual after creation: customers create `PENDING` orders, and admins use the UI to move them
through `PROCESSING`, `SHIPPED`, and `DELIVERED`.

See the exact deployment runbook in [`./DEPLOYMENT.md`](./DEPLOYMENT.md).
