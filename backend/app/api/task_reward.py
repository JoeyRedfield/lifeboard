import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.schemas.task_reward import (
    CompleteDailyTaskRequest,
    DailyTaskCreate,
    DailyTaskRead,
    DailyTaskUpdate,
    RewardLedgerRead,
    RewardSpendRequest,
    RewardSummaryRead,
    TaskProjectCreate,
    TaskProjectRead,
    TaskProjectUpdate,
    TaskTemplateCreate,
    TaskTemplateRead,
    TaskTemplateUpdate,
)
from app.services import task_reward_service
from app.services.task_reward_service import TaskRewardNotFoundError

router = APIRouter(tags=["task_reward"])


def _raise_http_error(exc: ValueError) -> None:
    if isinstance(exc, TaskRewardNotFoundError):
        raise HTTPException(status_code=404, detail=str(exc))
    raise HTTPException(status_code=400, detail=str(exc))


@router.get("/task-projects", response_model=list[TaskProjectRead])
async def list_task_projects(db: AsyncSession = Depends(get_db)):
    return await task_reward_service.list_projects(db)


@router.post("/task-projects", response_model=TaskProjectRead)
async def create_task_project(
    payload: TaskProjectCreate, db: AsyncSession = Depends(get_db)
):
    return await task_reward_service.create_project(db, payload.model_dump())


@router.patch("/task-projects/{project_id}", response_model=TaskProjectRead)
async def update_task_project(
    project_id: int,
    payload: TaskProjectUpdate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await task_reward_service.update_project(
            db, project_id, payload.model_dump(exclude_none=True)
        )
    except ValueError as exc:
        _raise_http_error(exc)


@router.get("/task-templates", response_model=list[TaskTemplateRead])
async def list_task_templates(
    project_id: int = Query(default=None),
    db: AsyncSession = Depends(get_db),
):
    return await task_reward_service.list_task_templates(db, project_id)


@router.post("/task-templates", response_model=TaskTemplateRead)
async def create_task_template(
    payload: TaskTemplateCreate, db: AsyncSession = Depends(get_db)
):
    return await task_reward_service.create_task_template(db, payload.model_dump())


@router.patch("/task-templates/{template_id}", response_model=TaskTemplateRead)
async def update_task_template(
    template_id: int,
    payload: TaskTemplateUpdate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await task_reward_service.update_task_template(
            db, template_id, payload.model_dump(exclude_none=True)
        )
    except ValueError as exc:
        _raise_http_error(exc)


@router.get("/daily-tasks", response_model=list[DailyTaskRead])
async def get_daily_tasks(
    date: datetime.date = Query(...),
    db: AsyncSession = Depends(get_db),
):
    return await task_reward_service.list_daily_tasks(db, date)


@router.post("/daily-tasks", response_model=DailyTaskRead)
async def create_daily_task(
    payload: DailyTaskCreate, db: AsyncSession = Depends(get_db)
):
    try:
        return await task_reward_service.create_daily_task(db, payload.model_dump())
    except ValueError as exc:
        _raise_http_error(exc)


@router.patch("/daily-tasks/{task_id}", response_model=DailyTaskRead)
async def update_daily_task(
    task_id: int,
    payload: DailyTaskUpdate,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await task_reward_service.update_daily_task(
            db, task_id, payload.model_dump(exclude_none=True)
        )
    except ValueError as exc:
        _raise_http_error(exc)


@router.post("/daily-tasks/{task_id}/complete", response_model=DailyTaskRead)
async def complete_daily_task(
    task_id: int,
    payload: CompleteDailyTaskRequest,
    db: AsyncSession = Depends(get_db),
):
    try:
        return await task_reward_service.complete_daily_task(
            db, task_id, payload.actual_duration_minutes
        )
    except ValueError as exc:
        _raise_http_error(exc)


@router.post("/daily-tasks/{task_id}/reopen", response_model=DailyTaskRead)
async def reopen_daily_task(task_id: int, db: AsyncSession = Depends(get_db)):
    try:
        return await task_reward_service.reopen_daily_task(db, task_id)
    except ValueError as exc:
        _raise_http_error(exc)


@router.get("/rewards/summary", response_model=RewardSummaryRead)
async def reward_summary(db: AsyncSession = Depends(get_db)):
    return await task_reward_service.get_reward_summary(db, datetime.date.today())


@router.get("/rewards/ledger", response_model=list[RewardLedgerRead])
async def reward_ledger(
    limit: int = Query(default=20, ge=1, le=200),
    db: AsyncSession = Depends(get_db),
):
    return await task_reward_service.list_reward_ledger(db, limit)


@router.post("/rewards/spend", response_model=RewardLedgerRead)
async def spend_reward(
    payload: RewardSpendRequest, db: AsyncSession = Depends(get_db)
):
    try:
        return await task_reward_service.spend_reward(
            db, payload.amount, payload.reason
        )
    except ValueError as exc:
        _raise_http_error(exc)
