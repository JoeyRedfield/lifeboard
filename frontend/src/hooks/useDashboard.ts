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

  const load = useCallback(async () => {
    setLoading(true);
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
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return { overview, trends, categories, assets, loading, reload: load };
}
