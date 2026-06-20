import datetime
from typing import Any, Dict, List

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import DailyTask, RewardLedger, TaskProject, TaskTemplate


async def create_project(db: AsyncSession, payload: Dict[str, Any]) -> TaskProject:
    project = TaskProject(
        name=payload["name"],
        status=payload.get("status", "active"),
        sort_order=payload.get("sort_order", 0),
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return project


async def list_projects(db: AsyncSession) -> List[TaskProject]:
    result = await db.scalars(
        select(TaskProject).order_by(TaskProject.sort_order.asc(), TaskProject.id.asc())
    )
    return list(result.all())


async def update_project(
    db: AsyncSession, project_id: int, payload: Dict[str, Any]
) -> TaskProject:
    project = await db.get(TaskProject, project_id)
    for key, value in payload.items():
        setattr(project, key, value)
    await db.commit()
    await db.refresh(project)
    return project


async def create_task_template(
    db: AsyncSession, payload: Dict[str, Any]
) -> TaskTemplate:
    template = TaskTemplate(**payload)
    db.add(template)
    await db.commit()
    await db.refresh(template)
    return template


async def list_task_templates(
    db: AsyncSession, project_id: int = None
) -> List[TaskTemplate]:
    statement = select(TaskTemplate).order_by(TaskTemplate.id.asc())
    if project_id is not None:
        statement = statement.where(TaskTemplate.project_id == project_id)
    result = await db.scalars(statement)
    return list(result.all())


async def update_task_template(
    db: AsyncSession, template_id: int, payload: Dict[str, Any]
) -> TaskTemplate:
    template = await db.get(TaskTemplate, template_id)
    for key, value in payload.items():
        setattr(template, key, value)
    await db.commit()
    await db.refresh(template)
    return template


async def list_daily_tasks(db: AsyncSession, date: datetime.date) -> List[DailyTask]:
    result = await db.scalars(
        select(DailyTask)
        .where(DailyTask.date == date)
        .order_by(DailyTask.created_at.asc(), DailyTask.id.asc())
    )
    return list(result.all())


async def create_daily_task(db: AsyncSession, payload: Dict[str, Any]) -> DailyTask:
    template = await db.get(TaskTemplate, payload["task_template_id"])
    if template is None or not template.is_active:
        raise ValueError("模板已停用")

    task = DailyTask(
        date=payload["date"],
        project_id=template.project_id,
        task_template_id=template.id,
        name_snapshot=template.name,
        estimated_duration_minutes_snapshot=payload["estimated_duration_minutes"],
        reward_amount_snapshot=payload["reward_amount"],
        status="pending",
    )
    db.add(task)
    await db.commit()
    await db.refresh(task)
    return task


async def update_daily_task(
    db: AsyncSession, task_id: int, payload: Dict[str, Any]
) -> DailyTask:
    task = await db.get(DailyTask, task_id)
    for key, value in payload.items():
        setattr(task, key, value)
    await db.commit()
    await db.refresh(task)
    return task


async def complete_daily_task(
    db: AsyncSession, task_id: int, actual_duration_minutes: int = None
) -> DailyTask:
    task = await db.get(DailyTask, task_id)
    if task.status == "completed":
        return task

    task_reward_balance = await db.scalar(
        select(func.coalesce(func.sum(RewardLedger.amount), 0)).where(
            RewardLedger.daily_task_id == task.id
        )
    )

    task.status = "completed"
    task.actual_duration_minutes = actual_duration_minutes
    task.completed_at = datetime.datetime.now(datetime.timezone.utc)

    if int(task_reward_balance or 0) <= 0:
        db.add(
            RewardLedger(
                entry_type="earn",
                amount=task.reward_amount_snapshot,
                reason=task.name_snapshot,
                daily_task_id=task.id,
            )
        )

    await db.commit()
    await db.refresh(task)
    return task


async def reopen_daily_task(db: AsyncSession, task_id: int) -> DailyTask:
    task = await db.get(DailyTask, task_id)
    if task.status != "completed":
        return task

    task.status = "pending"
    task.actual_duration_minutes = None
    task.completed_at = None
    db.add(
        RewardLedger(
            entry_type="adjust",
            amount=-task.reward_amount_snapshot,
            reason="reopen:%s" % task.name_snapshot,
            daily_task_id=task.id,
        )
    )
    await db.commit()
    await db.refresh(task)
    return task


async def get_reward_summary(
    db: AsyncSession, date: datetime.date = None
) -> Dict[str, int]:
    target_date = date or datetime.date.today()
    current_balance = await db.scalar(
        select(func.coalesce(func.sum(RewardLedger.amount), 0))
    )
    today_earned = await db.scalar(
        select(func.coalesce(func.sum(RewardLedger.amount), 0)).where(
            RewardLedger.entry_type == "earn",
            func.date(RewardLedger.created_at) == target_date,
        )
    )
    return {
        "current_balance": int(current_balance or 0),
        "today_earned": int(today_earned or 0),
    }


async def list_reward_ledger(
    db: AsyncSession, limit: int = 20
) -> List[RewardLedger]:
    result = await db.scalars(
        select(RewardLedger)
        .order_by(RewardLedger.created_at.desc(), RewardLedger.id.desc())
        .limit(limit)
    )
    return list(result.all())


async def spend_reward(db: AsyncSession, amount: int, reason: str) -> RewardLedger:
    current_balance = await db.scalar(
        select(func.coalesce(func.sum(RewardLedger.amount), 0))
    )
    if int(current_balance or 0) < amount:
        raise ValueError("余额不足")

    entry = RewardLedger(entry_type="spend", amount=-amount, reason=reason)
    db.add(entry)
    await db.commit()
    await db.refresh(entry)
    return entry
