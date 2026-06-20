import { useMemo, useState } from "react";
import type { DailyTask } from "../types";

interface Props {
  tasks: DailyTask[];
  finishingTaskId: number | null;
  onFinishTask: (taskId: number, actualDurationMinutes?: number) => Promise<void>;
}

function formatYuan(amountInCent: number): string {
  return `¥${(amountInCent / 100).toFixed(2)}`;
}

export default function DailyTaskList({
  tasks,
  finishingTaskId,
  onFinishTask,
}: Props) {
  const [expandedTaskId, setExpandedTaskId] = useState<number | null>(null);
  const [actualDurationValue, setActualDurationValue] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const expandedTask = useMemo(
    () => tasks.find((task) => task.id === expandedTaskId) ?? null,
    [expandedTaskId, tasks]
  );

  const resetConfirmation = () => {
    setExpandedTaskId(null);
    setActualDurationValue("");
    setSubmitError(null);
  };

  const handleOpen = (taskId: number) => {
    setExpandedTaskId(taskId);
    setActualDurationValue("");
    setSubmitError(null);
  };

  const handleConfirm = async () => {
    if (!expandedTask) return;

    const trimmedValue = actualDurationValue.trim();
    const parsedDuration =
      trimmedValue === "" ? undefined : Number.parseInt(trimmedValue, 10);
    const hasInvalidDuration =
      trimmedValue !== "" &&
      (parsedDuration === undefined ||
        !Number.isInteger(parsedDuration) ||
        parsedDuration <= 0);

    if (hasInvalidDuration) {
      setSubmitError("实际时长需要填写正整数分钟。");
      return;
    }

    try {
      await onFinishTask(expandedTask.id, parsedDuration);
      resetConfirmation();
    } catch {
      setSubmitError("提交失败，请稍后重试。");
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="card">
        <div className="card-header">
          <h2 className="card-title">每日任务</h2>
        </div>
        <p className="today-empty-state">今天还没有安排任务。</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-header">
        <h2 className="card-title">每日任务</h2>
      </div>

      <div className="daily-task-list">
        {tasks.map((task) => {
          const isCompleted = task.status === "completed";
          const isExpanded = expandedTaskId === task.id;
          const isSubmitting = finishingTaskId === task.id;

          return (
            <section
              key={task.id}
              className={`daily-task-item${isCompleted ? " is-completed" : ""}`}
            >
              <div className="daily-task-row">
                <div className="daily-task-main">
                  <div className="daily-task-name">{task.name_snapshot}</div>
                  <div className="daily-task-meta">
                    <span>{task.estimated_duration_minutes_snapshot} 分钟</span>
                    <span>{formatYuan(task.reward_amount_snapshot)}</span>
                  </div>
                </div>

                {isCompleted ? (
                  <span className="daily-task-status">已完成</span>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => handleOpen(task.id)}
                    disabled={finishingTaskId !== null}
                  >
                    完成
                  </button>
                )}
              </div>

              {isCompleted && task.actual_duration_minutes !== null ? (
                <div className="daily-task-footnote">
                  实际时长 {task.actual_duration_minutes} 分钟
                </div>
              ) : null}

              {isExpanded ? (
                <div className="task-complete-sheet">
                  <label className="task-complete-field">
                    <span>实际时长</span>
                    <input
                      type="number"
                      min="1"
                      inputMode="numeric"
                      value={actualDurationValue}
                      onChange={(event) => setActualDurationValue(event.target.value)}
                      placeholder="选填，单位分钟"
                      disabled={isSubmitting}
                    />
                  </label>

                  <p className="task-complete-hint">
                    不填写会直接按完成处理，只记录状态和奖励。
                  </p>

                  {submitError ? (
                    <div className="message message-error">{submitError}</div>
                  ) : null}

                  <div className="task-complete-actions">
                    <button
                      type="button"
                      className="btn"
                      onClick={resetConfirmation}
                      disabled={isSubmitting}
                    >
                      取消
                    </button>
                    <button
                      type="button"
                      className="btn btn-primary"
                      onClick={() => void handleConfirm()}
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? "提交中..." : "确认完成"}
                    </button>
                  </div>
                </div>
              ) : null}
            </section>
          );
        })}
      </div>
    </div>
  );
}
