from collections.abc import Awaitable, Callable
from typing import Any, cast

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.responses import Response

from app.core.security import AuthenticationError


def error_payload(code: str, message: str, request: Request) -> dict[str, dict[str, str]]:
    return {
        "error": {
            "code": code,
            "message": message,
            "request_id": getattr(request.state, "request_id", ""),
        }
    }


def _detail_to_error(detail: Any) -> tuple[str, str]:
    if isinstance(detail, dict):
        return str(detail.get("code", "ERROR")), str(detail.get("message", "Request failed"))
    return "ERROR", str(detail)


async def http_exception_handler(request: Request, exc: HTTPException) -> JSONResponse:
    code, message = _detail_to_error(exc.detail)
    return JSONResponse(status_code=exc.status_code, content=error_payload(code, message, request))


async def validation_exception_handler(
    request: Request,
    exc: RequestValidationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=error_payload("VALIDATION_ERROR", str(exc.errors()), request),
    )


async def authentication_exception_handler(
    request: Request,
    exc: AuthenticationError,
) -> JSONResponse:
    return JSONResponse(
        status_code=status.HTTP_401_UNAUTHORIZED,
        content=error_payload("UNAUTHENTICATED", exc.message, request),
    )


def register_exception_handlers(app: FastAPI) -> None:
    handler_type = Callable[[Request, Exception], Response | Awaitable[Response]]
    app.add_exception_handler(HTTPException, cast(handler_type, http_exception_handler))
    app.add_exception_handler(
        RequestValidationError,
        cast(handler_type, validation_exception_handler),
    )
    app.add_exception_handler(
        AuthenticationError,
        cast(handler_type, authentication_exception_handler),
    )
