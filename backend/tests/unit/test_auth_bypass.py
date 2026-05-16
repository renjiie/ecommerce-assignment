from starlette.requests import Request

from app.core import deps
from app.core.config import settings
from app.core.security import ClerkUser


def build_request(headers: dict[str, str] | None = None) -> Request:
    return Request(
        {
            "type": "http",
            "method": "GET",
            "path": "/",
            "headers": [
                (name.lower().encode("latin-1"), value.encode("latin-1"))
                for name, value in (headers or {}).items()
            ],
        }
    )


async def test_dev_auth_bypass_accepts_safe_role_header(monkeypatch) -> None:
    monkeypatch.setattr(settings, "AUTH_BYPASS", True)
    monkeypatch.setattr(settings, "ENV", "development")

    user = await deps.get_current_user(
        request=build_request({"X-Dev-Role": "ADMIN", "X-Dev-User-Id": "admin-1"}),
        _credentials=None,
    )

    assert user.id == "admin-1"
    assert user.role == "ADMIN"


async def test_dev_auth_bypass_rejects_unknown_role_header(monkeypatch) -> None:
    monkeypatch.setattr(settings, "AUTH_BYPASS", True)
    monkeypatch.setattr(settings, "ENV", "development")

    user = await deps.get_current_user(
        request=build_request({"X-Dev-Role": "OWNER"}),
        _credentials=None,
    )

    assert user.role == settings.DEV_AUTH_ROLE


async def test_dev_reviewer_override_applies_after_clerk_token(monkeypatch) -> None:
    monkeypatch.setattr(settings, "AUTH_BYPASS", False)
    monkeypatch.setattr(settings, "ENV", "development")
    monkeypatch.setattr(settings, "REVIEWER_ROLE_SWITCH_ENABLED", True)
    monkeypatch.setattr(
        deps,
        "verify_clerk_request",
        lambda request: ClerkUser(id="user_123", email="reviewer@example.com", role="CUSTOMER"),
    )

    user = await deps.get_current_user(
        request=build_request({"X-Reviewer-Role": "ADMIN", "X-Reviewer-User-Id": "admin-1"}),
        _credentials=None,
    )

    assert user.id == "user_123"
    assert user.email == "reviewer@example.com"
    assert user.role == "ADMIN"


async def test_reviewer_override_is_ignored_outside_development(monkeypatch) -> None:
    monkeypatch.setattr(settings, "AUTH_BYPASS", False)
    monkeypatch.setattr(settings, "ENV", "production")
    monkeypatch.setattr(settings, "REVIEWER_ROLE_SWITCH_ENABLED", True)
    monkeypatch.setattr(
        deps,
        "verify_clerk_request",
        lambda request: ClerkUser(id="user_123", email="reviewer@example.com", role="CUSTOMER"),
    )

    user = await deps.get_current_user(
        request=build_request({"X-Reviewer-Role": "ADMIN", "X-Reviewer-User-Id": "admin-1"}),
        _credentials=None,
    )

    assert user.id == "user_123"
    assert user.role == "CUSTOMER"
