import datetime

from fastapi import APIRouter, HTTPException, Query

from app.datasources.reward_todo import RewardTodoSource
from app.schemas.reward_todo import (
    RewardTodoLedgerRead,
    RewardTodoProjectsRead,
    RewardTodoSummaryRead,
    RewardTodoTemplatesRead,
    RewardTodoTodayRead,
)

router = APIRouter(tags=["reward_todo"])


def _source() -> RewardTodoSource:
    return RewardTodoSource()


def _raise_proxy_error(exc: Exception) -> None:
    raise HTTPException(status_code=503, detail=f"reward-todo unavailable: {exc}")


@router.get("/reward-todo/summary", response_model=RewardTodoSummaryRead)
async def reward_todo_summary():
    try:
        payload = await _source().fetch_summary()
    except Exception as exc:
        _raise_proxy_error(exc)
    return RewardTodoSummaryRead.model_validate(payload)


@router.get("/reward-todo/today", response_model=RewardTodoTodayRead)
async def reward_todo_today(
    date: datetime.date = Query(default_factory=datetime.date.today),
):
    try:
        payload = await _source().fetch_today(date.isoformat())
    except Exception as exc:
        _raise_proxy_error(exc)
    return RewardTodoTodayRead.model_validate(payload)


@router.get("/reward-todo/ledger", response_model=RewardTodoLedgerRead)
async def reward_todo_ledger(limit: int = Query(default=20, ge=1, le=200)):
    try:
        payload = await _source().fetch_ledger(limit=limit)
    except Exception as exc:
        _raise_proxy_error(exc)
    return RewardTodoLedgerRead.model_validate(payload)


@router.get("/reward-todo/projects", response_model=RewardTodoProjectsRead)
async def reward_todo_projects():
    try:
        payload = await _source().fetch_projects()
    except Exception as exc:
        _raise_proxy_error(exc)
    return RewardTodoProjectsRead.model_validate(payload)


@router.get("/reward-todo/templates", response_model=RewardTodoTemplatesRead)
async def reward_todo_templates(project_id: int | None = Query(default=None)):
    try:
        payload = await _source().fetch_templates(project_id=project_id)
    except Exception as exc:
        _raise_proxy_error(exc)
    return RewardTodoTemplatesRead.model_validate(payload)
