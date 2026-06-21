import datetime

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_reward_todo_summary_proxy(monkeypatch):
    async def fake_fetch_summary(self):
        return {
            "current_balance": 2000,
            "today_earned": 1000,
            "readOnly": True,
        }

    monkeypatch.setattr(
        "app.datasources.reward_todo.RewardTodoSource.fetch_summary",
        fake_fetch_summary,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/reward-todo/summary")

    assert response.status_code == 200
    assert response.json()["current_balance"] == 2000
    assert response.json()["readOnly"] is True


@pytest.mark.asyncio
async def test_reward_todo_today_proxy(monkeypatch):
    async def fake_fetch_today(self, date):
        assert date == "2026-06-21"
        return {
            "current_balance": 1500,
            "today_earned": 2000,
            "readOnly": True,
            "tasks": [
                {
                    "id": 1,
                    "date": "2026-06-21",
                    "project_id": 1,
                    "task_template_id": 1,
                    "name_snapshot": "跑步 30 分钟",
                    "estimated_duration_minutes_snapshot": 30,
                    "reward_amount_snapshot": 2000,
                    "status": "completed",
                    "actual_duration_minutes": 28,
                    "completed_at": "2026-06-21T10:00:00Z",
                }
            ],
        }

    monkeypatch.setattr(
        "app.datasources.reward_todo.RewardTodoSource.fetch_today",
        fake_fetch_today,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get(
            "/api/reward-todo/today",
            params={"date": datetime.date(2026, 6, 21).isoformat()},
        )

    assert response.status_code == 200
    assert response.json()["tasks"][0]["name_snapshot"] == "跑步 30 分钟"


@pytest.mark.asyncio
async def test_reward_todo_proxy_returns_503_when_upstream_fails(monkeypatch):
    async def fake_fetch_projects(self):
        raise RuntimeError("boom")

    monkeypatch.setattr(
        "app.datasources.reward_todo.RewardTodoSource.fetch_projects",
        fake_fetch_projects,
    )

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/reward-todo/projects")

    assert response.status_code == 503
    assert "reward-todo unavailable" in response.json()["detail"]
