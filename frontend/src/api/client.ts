import axios from "axios";
import dayjs from "dayjs";
import type {
  OverviewData,
  MonthlyTrendItem,
  CategoryBreakdownItem,
  AssetTrendItem,
  RewardTodoLedgerPayload,
  RewardTodoProjectsPayload,
  RewardSummary,
  RewardTodoTemplatesPayload,
  RewardTodoTodayPayload,
  SyncResult,
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

export async function fetchRewardTodoToday(
  date = dayjs().format("YYYY-MM-DD")
): Promise<RewardTodoTodayPayload> {
  const { data } = await api.get(`/reward-todo/today?date=${date}`);
  return data;
}

export async function fetchRewardTodoProjects(): Promise<RewardTodoProjectsPayload> {
  const { data } = await api.get("/reward-todo/projects");
  return data;
}

export async function fetchRewardTodoTemplates(
  projectId?: number
): Promise<RewardTodoTemplatesPayload> {
  const params = new URLSearchParams();
  if (projectId !== undefined) {
    params.set("project_id", String(projectId));
  }

  const query = params.toString();
  const { data } = await api.get(`/reward-todo/templates${query ? `?${query}` : ""}`);
  return data;
}

export async function fetchRewardTodoSummary(): Promise<RewardSummary> {
  const { data } = await api.get("/reward-todo/summary");
  return data;
}

export async function fetchRewardTodoLedger(
  limit = 20
): Promise<RewardTodoLedgerPayload> {
  const { data } = await api.get(`/reward-todo/ledger?limit=${limit}`);
  return data;
}

export async function triggerSync(): Promise<SyncResult> {
  const { data } = await api.post("/sync");
  return data;
}
