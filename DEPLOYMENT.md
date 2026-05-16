# Production Deployment

Deploy the React/Vite frontend to Vercel and the FastAPI backend to Render's free-capable
services. Production does not run Redis, Celery worker, Celery beat, or a scheduler. Orders created
in production remain `PENDING` until an admin manually updates them from the UI.

Render free-tier caveats:

- Free web services spin down after idle time and cold start on the next request.
- Free Render Postgres databases expire after 30 days.
- This setup is for assignment review/demo use, not a durable production system.

## 1. Preflight

Run backend checks:

```bash
cd backend
uv run --extra dev python -m pytest
uv run --extra dev ruff check .
uv run --extra dev mypy app
```

Run frontend checks:

```bash
cd frontend
npm ci
npm test -- --run
npm run lint
npm run build
```

## 2. Clerk

Create or open the Clerk production app.

Set public metadata on production users:

```json
{ "role": "CUSTOMER" }
```

```json
{ "role": "ADMIN" }
```

Copy these values:

- Frontend publishable key for Vercel: `VITE_CLERK_PUBLISHABLE_KEY`
- Backend secret key for Render: `CLERK_SECRET_KEY`

## 3. Render Backend

Use the Render Blueprint in `render.yaml`.

In Render:

1. New > Blueprint.
2. Connect this GitHub repo.
3. Select `render.yaml`.
4. Review the planned resources:
   - `ecommerce-orders-db`
   - `ecommerce-orders-api`
5. Confirm there are no Redis, worker, beat, or cron services.
6. Set prompted environment values:
   - `CLERK_SECRET_KEY`
   - `CORS_ORIGINS`
   - `CLERK_AUTHORIZED_PARTIES`

Before the frontend URL exists, use the expected Vercel production URL if known. Otherwise deploy
once, then update these two values after Vercel deployment:

```text
CORS_ORIGINS=["https://<your-vercel-project>.vercel.app"]
CLERK_AUTHORIZED_PARTIES=["https://<your-vercel-project>.vercel.app"]
```

Render injects `DATABASE_URL` from Postgres. The backend accepts Render's native `postgresql://`
URL and converts it to SQLAlchemy's asyncpg driver internally.

## 4. Vercel Frontend

In Vercel:

1. Import this GitHub repo.
2. Set project settings:
   - Framework Preset: `Vite`
   - Root Directory: `frontend`
   - Install Command: `npm ci`
   - Build Command: `npm run build`
   - Output Directory: `dist`
3. Add environment variables:

```text
VITE_API_BASE_URL=https://ecommerce-orders-api.onrender.com
VITE_AUTH_BYPASS=false
VITE_CLERK_PUBLISHABLE_KEY=<Clerk production publishable key>
VITE_REVIEWER_ROLE_SWITCH=false
VITE_N8N_CHAT_WEBHOOK_URL=<n8n production chat webhook URL>
```

4. Deploy.

If the n8n assistant is enabled, add the Vercel production URL to the n8n Chat
Trigger/Webhook CORS or Allowed Origins setting.
For clean responses, configure the n8n agent/system prompt to return concise GitHub Markdown with
short headings and bullets instead of indented plain text.

## 5. Lock Production Origins

After the Vercel URL is final, update the Render `ecommerce-orders-api` environment:

```text
CORS_ORIGINS=["https://<your-vercel-project>.vercel.app"]
CLERK_AUTHORIZED_PARTIES=["https://<your-vercel-project>.vercel.app"]
```

If using a custom domain, include both origins:

```text
CORS_ORIGINS=["https://<your-domain.com>","https://<your-vercel-project>.vercel.app"]
CLERK_AUTHORIZED_PARTIES=["https://<your-domain.com>","https://<your-vercel-project>.vercel.app"]
```

Redeploy or restart the backend service after changing environment values.

## 6. Production Smoke Test

1. Open `https://ecommerce-orders-api.onrender.com/health`.
2. Confirm the response is:

```json
{ "status": "ok" }
```

3. Open the Vercel frontend.
4. Sign in as a `CUSTOMER` and create an order.
5. Confirm the order remains `PENDING`.
6. Sign in as an `ADMIN` and manually move the order to `PROCESSING`, `SHIPPED`, and `DELIVERED`.
7. Confirm Render has no Redis, worker, beat, or cron services.
8. Check Render logs for migration, database, CORS, and Clerk auth errors.
