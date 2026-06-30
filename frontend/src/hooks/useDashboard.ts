import { useState, useEffect, useCallback } from "react";
import {
  fetchOverview,
  fetchTrends,
  fetchCategories,
  fetchAssets,
} from "../api/client";
import type {
  OverviewData,
  MonthlyTrendItem,
  CategoryBreakdownItem,
  AssetTrendItem,
} from "../types";

export function useDashboard() {
  const [overview, setOverview] = useState<OverviewData | null>(null);
  const [trends, setTrends] = useState<MonthlyTrendItem[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdownItem[]>([]);
  const [assets, setAssets] = useState<AssetTrendItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [ov, tr, ca, as] = await Promise.all([
        fetchOverview(),
        fetchTrends(),
        fetchCategories(),
        fetchAssets(),
      ]);
      setOverview(ov);
      setTrends(tr);
      setCategories(ca);
      setAssets(as);
    } catch (loadError) {
      console.error(loadError);
      setError("仪表盘加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { overview, trends, categories, assets, loading, error, reload: load };
}
