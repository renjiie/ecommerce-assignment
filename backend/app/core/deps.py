from collections.abc import AsyncGenerator

from fastapi import Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_session
from app.core.security import ClerkUser, verify_clerk_request

http_bearer = HTTPBearer(auto_error=False)
SAFE_ROLES = {"CUSTOMER", "ADMIN"}


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async for session in get_session():
        yield session


async def get_current_user(
    request: Request,
    _credentials: HTTPAuthorizationCredentials | None = Depends(http_bearer),
) -> ClerkUser:
    if settings.AUTH_BYPASS and settings.ENV == "development":
        requested_role = request.headers.get("X-Dev-Role", settings.DEV_AUTH_ROLE).upper()
        role = requested_role if requested_role in SAFE_ROLES else settings.DEV_AUTH_ROLE
        return ClerkUser(
            id=request.headers.get("X-Dev-User-Id", settings.DEV_AUTH_USER_ID),
            email=request.headers.get("X-Dev-Email", settings.DEV_AUTH_EMAIL),
            role=role,
        )

    user = verify_clerk_request(request)
    return _apply_reviewer_role_override(request, user)


def _apply_reviewer_role_override(request: Request, user: ClerkUser) -> ClerkUser:
    if settings.ENV != "development" or not settings.REVIEWER_ROLE_SWITCH_ENABLED:
        return user

    requested_role = request.headers.get("X-Reviewer-Role")
    if not requested_role:
        return user

    role = requested_role.upper()
    if role not in SAFE_ROLES:
        return user

    return ClerkUser(id=user.id, email=user.email, role=role)


async def require_admin(current_user: ClerkUser = Depends(get_current_user)) -> ClerkUser:
    if current_user.role != "ADMIN":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={"code": "FORBIDDEN", "message": "Admin access required"},
        )
    return current_user
