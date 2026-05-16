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

API docs are available at `http://localhost:8000/docs`; health check is `GET /health`.

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
