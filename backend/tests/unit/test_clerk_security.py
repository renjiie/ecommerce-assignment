from clerk_backend_api.security import AuthStatus, RequestState
from starlette.requests import Request

from app.core.config import settings
from app.core.security import _extract_role, verify_clerk_request


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


def test_verify_clerk_request_uses_official_sdk_options(monkeypatch) -> None:
    captured = {}

    def fake_authenticate_request(request, options):
        captured["request"] = request
        captured["options"] = options
        return RequestState(
            status=AuthStatus.SIGNED_IN,
            token="session-token",
            payload={"sub": "user_123", "email": "reviewer@example.com", "role": "admin"},
        )

    monkeypatch.setattr(settings, "CLERK_SECRET_KEY", "sk_test_fake")
    monkeypatch.setattr(settings, "CLERK_JWT_KEY", "jwt-public-key")
    monkeypatch.setattr(settings, "CLERK_AUDIENCE", "orders-api")
    monkeypatch.setattr(settings, "CLERK_AUTHORIZED_PARTIES", ["http://localhost:5173"])
    monkeypatch.setattr("app.core.security.authenticate_request", fake_authenticate_request)

    user = verify_clerk_request(build_request({"Authorization": "Bearer session-token"}))

    assert user.id == "user_123"
    assert user.role == "ADMIN"
    assert captured["options"].secret_key == "sk_test_fake"
    assert captured["options"].jwt_key == "jwt-public-key"
    assert captured["options"].audience == "orders-api"
    assert captured["options"].authorized_parties == ["http://localhost:5173"]
    assert captured["options"].accepts_token == ["session_token"]


def test_extract_role_accepts_clerk_claims() -> None:
    assert _extract_role({"public_metadata": {"role": "admin"}}) == "ADMIN"
    assert _extract_role({"org_role": "admin"}) == "ADMIN"
    assert _extract_role({"org_role": "org:admin"}) == "ADMIN"
    assert _extract_role({"role": "customer"}) == "CUSTOMER"
