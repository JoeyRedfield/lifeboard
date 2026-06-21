import DailyTaskList from "../components/DailyTaskList";
import TaskSummaryCards from "../components/TaskSummaryCards";
import useTodayBoard from "../hooks/useTodayBoard";

export default function Today() {
  const { tasks, summary, loading, error } = useTodayBoard();
  const rewardTodoAppUrl =
    import.meta.env.VITE_REWARD_TODO_APP_URL || "http://127.0.0.1:8088";

  return (
    <div>
      <h1 className="page-title">今日</h1>

      {loading ? (
        <div className="loading-container">
          <div className="loading-pulse" aria-label="加载中" />
        </div>
      ) : (
        <div className="today-board">
          <TaskSummaryCards summary={summary} tasks={tasks} />

          {error ? <div className="message message-error">{error}</div> : null}
          <div className="message">
            当前为只读视图。
            <a
              href={rewardTodoAppUrl}
              className="link-button"
              target="_blank"
              rel="noreferrer"
            >
              前往 Reward Todo 管理
            </a>
          </div>

          <DailyTaskList
            tasks={tasks}
            finishingTaskId={null}
            showActions={false}
          />
        </div>
      )}
    </div>
  );
}
