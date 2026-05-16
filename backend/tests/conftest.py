from collections.abc import AsyncGenerator
from uuid import uuid4

import pytest
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings
from app.core.database import Base
from app.core.deps import get_current_user, get_db
from app.core.security import ClerkUser
from app.main import create_app


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
async def db_session() -> AsyncGenerator[AsyncSession, None]:
    engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


@pytest.fixture
def customer_user() -> ClerkUser:
    return ClerkUser(id="customer-1", email="customer@example.com", role="CUSTOMER")


@pytest.fixture
def admin_user() -> ClerkUser:
    return ClerkUser(id="admin-1", email="admin@example.com", role="ADMIN")


@pytest.fixture
async def client(
    db_session: AsyncSession,
    customer_user: ClerkUser,
) -> AsyncGenerator[AsyncClient, None]:
    settings.CORS_ORIGINS = ["http://localhost:3000", "http://localhost:5173", "http://localhost:5174"]
    app = create_app()

    async def override_db() -> AsyncGenerator[AsyncSession, None]:
        yield db_session

    app.dependency_overrides[get_db] = override_db
    app.dependency_overrides[get_current_user] = lambda: customer_user

    async with AsyncClient(
        transport=ASGITransport(app=app),
        base_url="http://testserver",
    ) as async_client:
        yield async_client

    app.dependency_overrides.clear()


@pytest.fixture
def order_payload() -> dict:
    return {
        "items": [
            {
                "product_id": str(uuid4()),
                "quantity": 2,
                "unit_price": "10.50",
            },
            {
                "product_id": str(uuid4()),
                "quantity": 1,
                "unit_price": "3.25",
            },
        ]
    }
