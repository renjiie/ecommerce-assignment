from functools import lru_cache
from typing import Literal, Self

from pydantic import AnyHttpUrl, Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    ENV: Literal["development", "test", "production"] = "development"
    DEBUG: bool = False
    PROJECT_NAME: str = "E-Commerce Order Processing APP"
    API_V1_PREFIX: str = "/api/v1"

    DATABASE_URL: str = "postgresql+asyncpg://orders:orders@localhost:5432/orders"
    REDIS_URL: str = "redis://localhost:6379/0"

    AUTH_BYPASS: bool = False
    DEV_AUTH_USER_ID: str = "dev-user"
    DEV_AUTH_EMAIL: str = "dev@local.dev"
    DEV_AUTH_ROLE: Literal["CUSTOMER", "ADMIN"] = "CUSTOMER"

    REVIEWER_ROLE_SWITCH_ENABLED: bool = True

    CLERK_SECRET_KEY: str | None = None
    CLERK_JWT_KEY: str | None = None
    CLERK_AUDIENCE: str | None = None
    CLERK_AUTHORIZED_PARTIES: list[str] = Field(default_factory=list)

    CORS_ORIGINS: list[AnyHttpUrl] | list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://localhost:5173",
            "http://localhost:5174",
        ]
    )

    @model_validator(mode="after")
    def validate_production_settings(self) -> Self:
        if self.ENV != "production":
            return self

        if self.AUTH_BYPASS:
            raise ValueError("AUTH_BYPASS must be disabled in production")

        if not (self.CLERK_JWT_KEY or self.CLERK_SECRET_KEY):
            raise ValueError("Production requires CLERK_JWT_KEY or CLERK_SECRET_KEY")

        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
