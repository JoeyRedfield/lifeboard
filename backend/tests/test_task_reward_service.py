import datetime

import pytest
from sqlalchemy import select

from app.models import RewardLedger
from app.services.task_reward_service import (
    complete_daily_task,
    create_daily_task,
    create_project,
    create_task_template,
    get_reward_summary,
    reopen_daily_task,
    spend_reward,
    update_daily_task,
    update_task_template,
)


@pytest.mark.asyncio
async def test_complete_daily_task_creates_reward_entry(db):
    project = await create_project(db, {"name": "健身"})
    template = await create_task_template(
        db,
        {
            "project_id": project.id,
            "name": "跑步 30 分钟",
            "default_estimated_duration_minutes": 30,
            "default_reward_amount": 2000,
            "notes": "",
        },
    )
    task = await create_daily_task(
        db,
        {
            "date": datetime.date.today(),
            "task_template_id": template.id,
            "estimated_duration_minutes": 30,
            "reward_amount": 2000,
        },
    )

    completed = await complete_daily_task(db, task.id, actual_duration_minutes=28)
    summary = await get_reward_summary(db, datetime.date.today())
    ledger_entries = (
        await db.scalars(
            select(RewardLedger).where(RewardLedger.daily_task_id == task.id)
        )
    ).all()

    assert completed.status == "completed"
    assert completed.actual_duration_minutes == 28
    assert len(ledger_entries) == 1
    assert ledger_entries[0].amount == 2000
    assert ledger_entries[0].daily_task_id == task.id
    assert summary["current_balance"] == 2000
    assert summary["today_earned"] == 2000


@pytest.mark.asyncio
async def test_complete_daily_task_is_idempotent(db):
    project = await create_project(db, {"name": "写作"})
    template = await create_task_template(
        db,
        {
            "project_id": project.id,
            "name": "写 800 字",
            "default_estimated_duration_minutes": 45,
            "default_reward_amount": 3000,
            "notes": "",
        },
    )
    task = await create_daily_task(
        db,
        {
            "date": datetime.date.today(),
            "task_template_id": template.id,
            "estimated_duration_minutes": 45,
            "reward_amount": 3000,
        },
    )

    await complete_daily_task(db, task.id, actual_duration_minutes=None)
    await complete_daily_task(db, task.id, actual_duration_minutes=None)
    summary = await get_reward_summary(db, datetime.date.today())
    ledger_entries = (
        await db.scalars(
            select(RewardLedger).where(RewardLedger.daily_task_id == task.id)
        )
    ).all()

    assert len(ledger_entries) == 1
    assert ledger_entries[0].amount == 3000
    assert ledger_entries[0].daily_task_id == task.id
    assert summary["current_balance"] == 3000
    assert summary["today_earned"] == 3000


@pytest.mark.asyncio
async def test_reopen_daily_task_reverses_reward_balance(db):
    project = await create_project(db, {"name": "英语"})
    template = await create_task_template(
        db,
        {
            "project_id": project.id,
            "name": "英语复盘",
            "default_estimated_duration_minutes": 20,
            "default_reward_amount": 1000,
            "notes": "",
        },
    )
    task = await create_daily_task(
        db,
        {
            "date": datetime.date.today(),
            "task_template_id": template.id,
            "estimated_duration_minutes": 20,
            "reward_amount": 1000,
        },
    )

    await complete_daily_task(db, task.id, actual_duration_minutes=15)
    reopened = await reopen_daily_task(db, task.id)
    summary = await get_reward_summary(db, datetime.date.today())

    assert reopened.status == "pending"
    assert summary["current_balance"] == 0


@pytest.mark.asyncio
async def test_recomplete_daily_task_regrants_reward_after_reopen(db):
    project = await create_project(db, {"name": "钢琴"})
    template = await create_task_template(
        db,
        {
            "project_id": project.id,
            "name": "练琴 40 分钟",
            "default_estimated_duration_minutes": 40,
            "default_reward_amount": 1000,
            "notes": "",
        },
    )
    task = await create_daily_task(
        db,
        {
            "date": datetime.date.today(),
            "task_template_id": template.id,
            "estimated_duration_minutes": 40,
            "reward_amount": 1000,
        },
    )

    await complete_daily_task(db, task.id, actual_duration_minutes=40)
    await reopen_daily_task(db, task.id)
    recommpleted = await complete_daily_task(db, task.id, actual_duration_minutes=38)
    summary = await get_reward_summary(db, datetime.date.today())
    ledger_entries = (
        await db.scalars(
            select(RewardLedger).where(RewardLedger.daily_task_id == task.id)
        )
    ).all()

    assert recommpleted.status == "completed"
    assert recommpleted.actual_duration_minutes == 38
    assert [entry.amount for entry in ledger_entries] == [1000, -1000, 1000]
    assert summary["current_balance"] == 1000
    assert summary["today_earned"] == 2000


@pytest.mark.asyncio
async def test_completed_daily_task_cannot_be_edited(db):
    project = await create_project(db, {"name": "阅读"})
    template = await create_task_template(
        db,
        {
            "project_id": project.id,
            "name": "读书 30 分钟",
            "default_estimated_duration_minutes": 30,
            "default_reward_amount": 1200,
            "notes": "",
        },
    )
    task = await create_daily_task(
        db,
        {
            "date": datetime.date.today(),
            "task_template_id": template.id,
            "estimated_duration_minutes": 30,
            "reward_amount": 1200,
        },
    )
    await complete_daily_task(db, task.id, actual_duration_minutes=30)

    with pytest.raises(ValueError, match="已完成任务不能编辑"):
        await update_daily_task(
            db,
            task.id,
            {
                "name_snapshot": "读书 45 分钟",
                "estimated_duration_minutes_snapshot": 45,
                "reward_amount_snapshot": 1500,
            },
        )


@pytest.mark.asyncio
async def test_spend_reward_rejects_when_balance_is_insufficient(db):
    with pytest.raises(ValueError, match="余额不足"):
        await spend_reward(db, amount=500, reason="咖啡")


@pytest.mark.asyncio
async def test_inactive_template_cannot_create_daily_task(db):
    project = await create_project(db, {"name": "学习"})
    template = await create_task_template(
        db,
        {
            "project_id": project.id,
            "name": "背单词",
            "default_estimated_duration_minutes": 15,
            "default_reward_amount": 800,
            "notes": "",
        },
    )
    await update_task_template(db, template.id, {"is_active": False})

    with pytest.raises(ValueError, match="模板已停用"):
        await create_daily_task(
            db,
            {
                "date": datetime.date.today(),
                "task_template_id": template.id,
                "estimated_duration_minutes": 15,
                "reward_amount": 800,
            },
        )
