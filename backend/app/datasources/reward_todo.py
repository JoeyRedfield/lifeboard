from typing import Any

import httpx

from app.config import settings


class RewardTodoSource:
    def __init__(self):
        self.base_url = settings.reward_todo_base_url.rstrip("/")
        self.token = settings.reward_todo_readonly_token

    def _client(self) -> httpx.AsyncClient:
        if not self.base_url:
            raise RuntimeError("reward_todo_base_url is not configured")
        if not self.token:
            raise RuntimeError("reward_todo_readonly_token is not configured")
        return httpx.AsyncClient(
            base_url=self.base_url,
            headers={
                "Authorization": f"Bearer {self.token}",
                "Content-Type": "application/json",
            },
            timeout=30.0,
        )

    async def _get(self, path: str, params: dict[str, Any] | None = None) -> dict[str, Any]:
        async with self._client() as client:
            response = await client.get(path, params=params)
            response.raise_for_status()
            return response.json()

    async def fetch_summary(self) -> dict[str, Any]:
        return await self._get("/api/public/summary")

    async def fetch_today(self, date: str | None = None) -> dict[str, Any]:
        params = {"date": date} if date else None
        return await self._get("/api/public/today", params=params)

    async def fetch_ledger(self, limit: int = 20) -> dict[str, Any]:
        return await self._get("/api/public/ledger", params={"limit": limit})

    async def fetch_projects(self) -> dict[str, Any]:
        return await self._get("/api/public/projects")

    async def fetch_templates(self, project_id: int | None = None) -> dict[str, Any]:
        params = {"project_id": project_id} if project_id is not None else None
        return await self._get("/api/public/templates", params=params)
