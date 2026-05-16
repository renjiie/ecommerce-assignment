from collections.abc import Awaitable, Callable
from typing import cast

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware
from starlette.requests import Request
from starlette.responses import Response

from app.core.config import settings
from app.core.exceptions import register_exception_handlers
from app.core.logging import configure_logging
from app.middleware.request_id import RequestIDMiddleware
from app.orders.router import limiter
from app.orders.router import router as orders_router


def create_app() -> FastAPI:
    configure_logging()
    app = FastAPI(title=settings.PROJECT_NAME, debug=settings.DEBUG)
    app.state.limiter = limiter
    handler_type = Callable[[Request, Exception], Response | Awaitable[Response]]
    app.add_exception_handler(
        RateLimitExceeded,
        cast(handler_type, _rate_limit_exceeded_handler),
    )

    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[str(origin) for origin in settings.CORS_ORIGINS],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    register_exception_handlers(app)
    app.include_router(orders_router, prefix=settings.API_V1_PREFIX)

    @app.get("/health", tags=["health"])
    async def health() -> dict[str, str]:
        return {"status": "ok"}

    return app


app = create_app()
