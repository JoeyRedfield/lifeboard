import datetime

import pytest
from httpx import ASGITransport, AsyncClient

from app.database import get_db
from app.main import app


@pytest.mark.asyncio
async def test_daily_tasks_endpoint_returns_ok(db):
    async def override():
        yield db

    app.dependency_overrides[get_db] = override

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/daily-tasks",
            params={"date": datetime.date.today().isoformat()},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 200
    assert isinstance(response.json(), list)


@pytest.mark.asyncio
async def test_reward_summary_endpoint_returns_balance_fields(db):
    async def override():
        yield db

    app.dependency_overrides[get_db] = override

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/rewards/summary")

    app.dependency_overrides.clear()
    assert response.status_code == 200
    data = response.json()
    assert "current_balance" in data
    assert "today_earned" in data
