import { useCallback, useEffect, useState } from "react";
import {
  completeDailyTask,
  fetchDailyTasks,
  fetchRewardSummary,
} from "../api/client";
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
  const [finishingTaskId, setFinishingTaskId] = useState<number | null>(null);

  const loadBoard = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const [tasksData, summaryData] = await Promise.all([
        fetchDailyTasks(),
        fetchRewardSummary(),
      ]);
      setTasks(tasksData);
      setSummary(summaryData);
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

  const finishTask = useCallback(
    async (taskId: number, actualDurationMinutes?: number) => {
      setFinishingTaskId(taskId);
      setError(null);

      try {
        await completeDailyTask(taskId, actualDurationMinutes);
        const [tasksData, summaryData] = await Promise.all([
          fetchDailyTasks(),
          fetchRewardSummary(),
        ]);
        setTasks(tasksData);
        setSummary(summaryData);
      } catch (finishError) {
        console.error(finishError);
        setError("任务完成失败，请稍后再试。");
        throw finishError;
      } finally {
        setFinishingTaskId(null);
      }
    },
    []
  );

  return {
    tasks,
    summary,
    loading,
    error,
    finishingTaskId,
    finishTask,
    reload: loadBoard,
  };
}

export default useTodayBoard;
