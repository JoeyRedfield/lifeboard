import type { DailyTask, RewardSummary } from "../types";

function formatYuan(amountInCent: number): string {
  return `¥${(amountInCent / 100).toFixed(2)}`;
}

function formatMinutes(totalMinutes: number): string {
  if (totalMinutes < 60) {
    return `${totalMinutes} 分钟`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (minutes === 0) {
    return `${hours} 小时`;
  }

  return `${hours} 小时 ${minutes} 分钟`;
}

interface Props {
  summary: RewardSummary;
  tasks: DailyTask[];
}

export default function TaskSummaryCards({ summary, tasks }: Props) {
  const completedCount = tasks.filter((task) => task.status === "completed").length;
  const totalEstimatedMinutes = tasks.reduce(
    (acc, task) => acc + task.estimated_duration_minutes_snapshot,
    0
  );
  const progressLabel = tasks.length === 0 ? "0 / 0" : `${completedCount} / ${tasks.length}`;

  const cards = [
    {
      label: "奖励余额",
      value: formatYuan(summary.current_balance),
      type: "assets",
      subtext: "累计可用奖励",
    },
    {
      label: "今日已赚",
      value: formatYuan(summary.today_earned),
      type: "income",
      subtext: "今日完成任务收入",
    },
    {
      label: "完成进度",
      value: progressLabel,
      type: "balance",
      subtext: tasks.length === 0 ? "今天还没有安排任务" : "按任务条目统计",
    },
    {
      label: "预计总时长",
      value: formatMinutes(totalEstimatedMinutes),
      type: "expense",
      subtext: "按当前任务预估",
    },
  ] as const;

  return (
    <div className="overview-grid">
      {cards.map((card) => (
        <div key={card.label} className={`overview-card ${card.type} animate-in`}>
          <div className="overview-card-label">{card.label}</div>
          <div className={`overview-card-value ${card.type}`}>{card.value}</div>
          <div className="overview-card-sub">{card.subtext}</div>
        </div>
      ))}
    </div>
  );
}
