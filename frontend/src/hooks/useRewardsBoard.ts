import { useCallback, useEffect, useState } from "react";
import {
  fetchRewardLedger,
  fetchRewardSummary,
  spendReward,
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
  const [submitting, setSubmitting] = useState(false);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [summaryData, ledgerData] = await Promise.all([
        fetchRewardSummary(),
        fetchRewardLedger(DEFAULT_LEDGER_LIMIT),
      ]);
      setSummary(summaryData);
      setLedger(ledgerData);
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

  const submitSpend = useCallback(async (amountYuan: number, reason: string) => {
    setSubmitting(true);
    setError(null);

    try {
      await spendReward(amountYuan * 100, reason);

      try {
        const [summaryData, ledgerData] = await Promise.all([
          fetchRewardSummary(),
          fetchRewardLedger(DEFAULT_LEDGER_LIMIT),
        ]);
        setSummary(summaryData);
        setLedger(ledgerData);
      } catch (refreshError) {
        console.error(refreshError);
        const ledgerData = await fetchRewardLedger(DEFAULT_LEDGER_LIMIT);
        setLedger(ledgerData);
      }
    } catch (submitError) {
      console.error(submitError);
      setError("奖励扣减失败，请稍后重试。");
      throw submitError;
    } finally {
      setSubmitting(false);
    }
  }, []);

  return {
    summary,
    ledger,
    loading,
    error,
    submitting,
    submitSpend,
    reload: loadBoard,
  };
}

export default useRewardsBoard;
