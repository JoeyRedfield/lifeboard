export interface TaskProject {
  id: number;
  name: string;
  status: string;
  sort_order: number;
}

export interface TaskTemplate {
  id: number;
  project_id: number;
  name: string;
  default_estimated_duration_minutes: number;
  default_reward_amount: number;
  notes: string;
  is_active: boolean;
}

export interface DailyTask {
  id: number;
  date: string;
  project_id: number;
  task_template_id: number;
  name_snapshot: string;
  estimated_duration_minutes_snapshot: number;
  reward_amount_snapshot: number;
  status: string;
  actual_duration_minutes: number | null;
}

export interface RewardSummary {
  current_balance: number;
  today_earned: number;
}

export interface RewardLedgerEntry {
  id: number;
  entry_type: string;
  amount: number;
  reason: string;
  daily_task_id: number | null;
}
