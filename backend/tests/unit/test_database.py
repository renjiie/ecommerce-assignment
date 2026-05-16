from app.core.database import async_database_url


def test_async_database_url_uses_asyncpg_for_render_postgres_url() -> None:
    url = "postgresql://orders:secret@host:5432/orders"

    assert async_database_url(url) == "postgresql+asyncpg://orders:secret@host:5432/orders"


def test_async_database_url_keeps_explicit_async_driver() -> None:
    url = "postgresql+asyncpg://orders:secret@host:5432/orders"

    assert async_database_url(url) == url
