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


@pytest.mark.asyncio
async def test_completed_daily_task_patch_returns_400(db):
    async def override():
        yield db

    app.dependency_overrides[get_db] = override

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        project_response = await client.post("/api/task-projects", json={"name": "游泳"})
        template_response = await client.post(
            "/api/task-templates",
            json={
                "project_id": project_response.json()["id"],
                "name": "游泳 30 分钟",
                "default_estimated_duration_minutes": 30,
                "default_reward_amount": 1500,
                "notes": "",
            },
        )
        task_response = await client.post(
            "/api/daily-tasks",
            json={
                "date": datetime.date.today().isoformat(),
                "task_template_id": template_response.json()["id"],
                "estimated_duration_minutes": 30,
                "reward_amount": 1500,
            },
        )
        await client.post(
            "/api/daily-tasks/%s/complete" % task_response.json()["id"],
            json={"actual_duration_minutes": 28},
        )
        response = await client.patch(
            "/api/daily-tasks/%s" % task_response.json()["id"],
            json={"reward_amount_snapshot": 2000},
        )

    app.dependency_overrides.clear()
    assert response.status_code == 400
    assert response.json()["detail"] == "已完成任务不能编辑"


@pytest.mark.asyncio
async def test_missing_daily_task_operations_return_404(db):
    async def override():
        yield db

    app.dependency_overrides[get_db] = override

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        patch_response = await client.patch(
            "/api/daily-tasks/999999",
            json={"reward_amount_snapshot": 2000},
        )
        complete_response = await client.post(
            "/api/daily-tasks/999999/complete",
            json={"actual_duration_minutes": 20},
        )
        reopen_response = await client.post("/api/daily-tasks/999999/reopen")

    app.dependency_overrides.clear()
    assert patch_response.status_code == 404
    assert complete_response.status_code == 404
    assert reopen_response.status_code == 404
