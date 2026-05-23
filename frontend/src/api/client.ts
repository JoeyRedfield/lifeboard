import axios from "axios";
import type {
  OverviewData,
  MonthlyTrendItem,
  CategoryBreakdownItem,
  AssetTrendItem,
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

export async function triggerSync(): Promise<SyncResult> {
  const { data } = await api.post("/sync");
  return data;
}
