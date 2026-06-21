from datetime import datetime

from pydantic import BaseModel


class RewardTodoSummaryRead(BaseModel):
    current_balance: int
    today_earned: int
    readOnly: bool = True


class RewardTodoDailyTaskRead(BaseModel):
    id: int
    date: str
    project_id: int
    task_template_id: int
    name_snapshot: str
    estimated_duration_minutes_snapshot: int
    reward_amount_snapshot: int
    status: str
    actual_duration_minutes: int | None = None
    completed_at: datetime | None = None


class RewardTodoTodayRead(RewardTodoSummaryRead):
    tasks: list[RewardTodoDailyTaskRead]


class RewardTodoLedgerEntryRead(BaseModel):
    id: int
    entry_type: str
    amount: int
    reason: str
    daily_task_id: int | None = None
    created_at: datetime


class RewardTodoLedgerRead(BaseModel):
    readOnly: bool = True
    items: list[RewardTodoLedgerEntryRead]


class RewardTodoProjectRead(BaseModel):
    id: int
    name: str
    status: str
    sort_order: int


class RewardTodoProjectsRead(BaseModel):
    readOnly: bool = True
    items: list[RewardTodoProjectRead]


class RewardTodoTemplateRead(BaseModel):
    id: int
    project_id: int
    name: str
    default_estimated_duration_minutes: int
    default_reward_amount: int
    notes: str
    is_active: bool


class RewardTodoTemplatesRead(BaseModel):
    readOnly: bool = True
    items: list[RewardTodoTemplateRead]
