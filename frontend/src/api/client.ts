import axios from "axios";
import dayjs from "dayjs";
import type {
  DailyTask,
  DailyTaskCreatePayload,
  OverviewData,
  MonthlyTrendItem,
  CategoryBreakdownItem,
  AssetTrendItem,
  RewardLedgerEntry,
  RewardSummary,
  SyncResult,
  TaskProject,
  TaskProjectCreatePayload,
  TaskTemplate,
  TaskTemplateCreatePayload,
} from "../types";

const api = axios.create({ baseURL: "/api" });

export async function fetchOverview(
  year?: number,
  month?: number
): Promise<OverviewData> {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
  const { data } = await api.get(`/dashboard/overview?${params}`);
  return data;
}

export async function fetchTrends(
  months = 12
): Promise<MonthlyTrendItem[]> {
  const { data } = await api.get(`/dashboard/trends?months=${months}`);
  return data;
}

export async function fetchCategories(
  year?: number,
  month?: number
): Promise<CategoryBreakdownItem[]> {
  const params = new URLSearchParams();
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
  const { data } = await api.get(`/dashboard/categories?${params}`);
  return data;
}

export async function fetchAssets(
  months = 12
): Promise<AssetTrendItem[]> {
  const { data } = await api.get(`/dashboard/assets?months=${months}`);
  return data;
}

export async function fetchDailyTasks(
  date = dayjs().format("YYYY-MM-DD")
): Promise<DailyTask[]> {
  const { data } = await api.get(`/daily-tasks?date=${date}`);
  return data;
}

export async function fetchProjects(): Promise<TaskProject[]> {
  const { data } = await api.get("/task-projects");
  return data;
}

export async function createProject(
  payload: TaskProjectCreatePayload
): Promise<TaskProject> {
  const { data } = await api.post("/task-projects", payload);
  return data;
}

export async function fetchTaskTemplates(
  projectId?: number
): Promise<TaskTemplate[]> {
  const params = new URLSearchParams();
  if (projectId !== undefined) {
    params.set("project_id", String(projectId));
  }

  const query = params.toString();
  const { data } = await api.get(`/task-templates${query ? `?${query}` : ""}`);
  return data;
}

export async function createTaskTemplate(
  payload: TaskTemplateCreatePayload
): Promise<TaskTemplate> {
  const { data } = await api.post("/task-templates", payload);
  return data;
}

export async function createDailyTask(
  payload: DailyTaskCreatePayload
): Promise<DailyTask> {
  const requestPayload = {
    date: dayjs().format("YYYY-MM-DD"),
    ...payload,
  };
  const { data } = await api.post("/daily-tasks", requestPayload);
  return data;
}

export async function fetchRewardSummary(): Promise<RewardSummary> {
  const { data } = await api.get("/rewards/summary");
  return data;
}

export async function fetchRewardLedger(
  limit = 20
): Promise<RewardLedgerEntry[]> {
  const { data } = await api.get(`/rewards/ledger?limit=${limit}`);
  return data;
}

export async function spendReward(
  amount: number,
  reason: string
): Promise<RewardLedgerEntry> {
  const { data } = await api.post("/rewards/spend", { amount, reason });
  return data;
}

export async function completeDailyTask(
  taskId: number,
  actualDurationMinutes?: number
): Promise<DailyTask> {
  const payload =
    actualDurationMinutes === undefined
      ? {}
      : { actual_duration_minutes: actualDurationMinutes };
  const { data } = await api.post(`/daily-tasks/${taskId}/complete`, payload);
  return data;
}

export async function triggerSync(): Promise<SyncResult> {
  const { data } = await api.post("/sync");
  return data;
}
