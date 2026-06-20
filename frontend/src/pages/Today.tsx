import DailyTaskList from "../components/DailyTaskList";
import TaskSummaryCards from "../components/TaskSummaryCards";
import useTodayBoard from "../hooks/useTodayBoard";

export default function Today() {
  const { tasks, summary, loading, error, finishingTaskId, finishTask } =
    useTodayBoard();

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

          <DailyTaskList
            tasks={tasks}
            finishingTaskId={finishingTaskId}
            onFinishTask={finishTask}
          />
        </div>
      )}
    </div>
  );
}
