import { useCallback, useEffect, useState } from "react";
import { fetchRewardTodoToday } from "../api/client";
import type { DailyTask, RewardSummary } from "../types";

const EMPTY_SUMMARY: RewardSummary = {
  current_balance: 0,
  today_earned: 0,
};

export function useTodayBoard() {
  const [tasks, setTasks] = useState<DailyTask[]>([]);
  const [summary, setSummary] = useState<RewardSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const payload = await fetchRewardTodoToday();
      setTasks(payload.tasks);
      setSummary({
        current_balance: payload.current_balance,
        today_earned: payload.today_earned,
        readOnly: payload.readOnly,
      });
    } catch (loadError) {
      console.error(loadError);
      setError("今日任务加载失败，请稍后重试。");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadBoard();
  }, [loadBoard]);

  return {
    tasks,
    summary,
    loading,
    error,
    finishingTaskId: null,
    finishTask: undefined,
    reload: loadBoard,
  };
}

export default useTodayBoard;
