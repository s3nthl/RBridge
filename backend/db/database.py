from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker
from sqlalchemy.orm import DeclarativeBase

from core.config import settings


def _resolve_db_url(url: str) -> str:
    """
    Normalise database URL for SQLAlchemy async drivers.

    Railway (and Heroku-style) Postgres URLs arrive as:
      postgres://...  or  postgresql://...
    SQLAlchemy async requires:
      postgresql+asyncpg://...

    SQLite URLs are passed through unchanged.
    """
    if url.startswith("postgres://"):
        return url.replace("postgres://", "postgresql+asyncpg://", 1)
    if url.startswith("postgresql://") and "+asyncpg" not in url:
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


_db_url = _resolve_db_url(settings.database_url)

# SQLite needs check_same_thread=False; Postgres does not
_connect_args = {"check_same_thread": False} if "sqlite" in _db_url else {}

engine = create_async_engine(_db_url, echo=False, connect_args=_connect_args)
AsyncSessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
