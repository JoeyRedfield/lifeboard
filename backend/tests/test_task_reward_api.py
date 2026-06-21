import asyncio

import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_legacy_daily_tasks_endpoint_is_gone():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/daily-tasks")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_legacy_reward_summary_endpoint_is_gone():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/api/rewards/summary")

    assert response.status_code == 404


@pytest.mark.asyncio
async def test_legacy_task_mutation_endpoints_are_gone():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        responses = await asyncio.gather(
            client.post("/api/task-projects", json={"name": "游泳"}),
            client.post(
                "/api/task-templates",
                json={
                    "project_id": 1,
                    "name": "游泳 30 分钟",
                    "default_estimated_duration_minutes": 30,
                    "default_reward_amount": 1500,
                    "notes": "",
                },
            ),
            client.post(
                "/api/daily-tasks",
                json={
                    "date": "2026-06-21",
                    "task_template_id": 1,
                    "estimated_duration_minutes": 30,
                    "reward_amount": 1500,
                },
            ),
            client.post(
                "/api/daily-tasks/1/complete",
                json={"actual_duration_minutes": 28},
            ),
            client.patch(
                "/api/daily-tasks/1",
                json={"reward_amount_snapshot": 2000},
            ),
            client.post("/api/daily-tasks/1/reopen"),
        )

    assert all(response.status_code == 404 for response in responses)
