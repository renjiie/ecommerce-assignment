from dataclasses import dataclass
from typing import Any

from clerk_backend_api import AuthenticateRequestOptions, authenticate_request
from fastapi import Request

from app.core.config import settings


@dataclass(frozen=True)
class ClerkUser:
    id: str
    email: str
    role: str = "CUSTOMER"


class AuthenticationError(Exception):
    def __init__(self, message: str = "Invalid authentication credentials") -> None:
        self.message = message
        super().__init__(message)


def _safe_role(role: Any) -> str:
    normalized = str(role or "CUSTOMER").split(":")[-1].upper()
    return normalized if normalized in {"CUSTOMER", "ADMIN"} else "CUSTOMER"


def _extract_role(payload: dict[str, Any]) -> str:
    for claim in ("role", "org_role"):
        if payload.get(claim):
            return _safe_role(payload[claim])

    for claim in ("metadata", "public_metadata", "publicMetadata"):
        metadata = payload.get(claim)
        if isinstance(metadata, dict) and metadata.get("role"):
            return _safe_role(metadata["role"])

    return "CUSTOMER"


def verify_clerk_request(request: Request) -> ClerkUser:
    state = authenticate_request(
        request,
        AuthenticateRequestOptions(
            secret_key=settings.CLERK_SECRET_KEY,
            jwt_key=settings.CLERK_JWT_KEY,
            audience=settings.CLERK_AUDIENCE,
            authorized_parties=settings.CLERK_AUTHORIZED_PARTIES or None,
            accepts_token=["session_token"],
        ),
    )
    if not state.is_signed_in or not state.payload:
        raise AuthenticationError(state.message or "Invalid Clerk session")

    subject = state.payload.get("sub")
    if not subject:
        raise AuthenticationError("Missing Clerk subject")

    return ClerkUser(
        id=str(subject),
        email=str(state.payload.get("email", "")),
        role=_extract_role(state.payload),
    )
