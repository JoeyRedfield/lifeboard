import os
import uuid

import pytest_asyncio
from sqlalchemy import text

from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

TEST_DB_URL = os.environ.get(
    "TEST_DATABASE_URL",
    "postgresql+asyncpg://lifeboard:lifeboard@localhost:5432/lifeboard_test",
)
os.environ.setdefault("DATABASE_URL", TEST_DB_URL)

from app.database import Base


@pytest_asyncio.fixture
async def db():
    schema_name = f"test_{uuid.uuid4().hex}"
    engine = create_async_engine(
        TEST_DB_URL,
        echo=False,
        connect_args={"server_settings": {"search_path": schema_name}},
    )

    async with engine.begin() as conn:
        await conn.execute(text(f'CREATE SCHEMA "{schema_name}"'))
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with session_factory() as session:
        yield session

    async with engine.begin() as conn:
        await conn.execute(text(f'DROP SCHEMA "{schema_name}" CASCADE'))

    await engine.dispose()
