import pytest
from pydantic import ValidationError

from app.core.config import Settings


def test_production_rejects_auth_bypass() -> None:
    with pytest.raises(ValidationError, match="AUTH_BYPASS must be disabled"):
        Settings(
            _env_file=None,
            ENV="production",
            AUTH_BYPASS=True,
            CLERK_JWT_KEY="jwt-key",
        )


def test_production_requires_clerk_verification_key() -> None:
    with pytest.raises(ValidationError, match="Production requires CLERK_JWT_KEY"):
        Settings(_env_file=None, ENV="production", AUTH_BYPASS=False)


def test_production_accepts_safe_auth_settings() -> None:
    settings = Settings(
        _env_file=None,
        ENV="production",
        AUTH_BYPASS=False,
        CLERK_JWT_KEY="jwt-key",
    )

    assert settings.ENV == "production"
    assert settings.AUTH_BYPASS is False
