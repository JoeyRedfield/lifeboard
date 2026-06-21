import { useCallback, useEffect, useState } from "react";
import {
  fetchRewardTodoLedger,
  fetchRewardTodoSummary,
} from "../api/client";
import type { RewardLedgerEntry, RewardSummary } from "../types";

const EMPTY_SUMMARY: RewardSummary = {
  current_balance: 0,
  today_earned: 0,
};

const DEFAULT_LEDGER_LIMIT = 20;

export function useRewardsBoard() {
  const [summary, setSummary] = useState<RewardSummary>(EMPTY_SUMMARY);
  const [ledger, setLedger] = useState<RewardLedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryData, ledgerPayload] = await Promise.all([
        fetchRewardTodoSummary(),
        fetchRewardTodoLedger(DEFAULT_LEDGER_LIMIT),
      ]);
      setSummary(summaryData);
      setLedger(ledgerPayload.items);
    } catch (loadError) {
      console.error(loadError);
      setError("奖励页加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  return {
    summary,
    ledger,
    loading,
    error,
    submitting: false,
    submitSpend: undefined,
    reload: loadBoard,
  };
}

export default useRewardsBoard;
