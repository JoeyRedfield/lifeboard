export default function Today() {
  return (
    <div>
      <h1 className="page-title">今日</h1>
      <div className="card">
        <div className="card-title" style={{ marginBottom: 16 }}>
          每日任务
        </div>
        <p style={{ color: "var(--text-secondary)", lineHeight: 1.7 }}>
          这里将展示今日任务、完成状态与奖励收入概览。
        </p>
      </div>
    </div>
  );
}
