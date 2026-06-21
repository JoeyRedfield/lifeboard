import RewardLedgerPanel from "../components/RewardLedgerPanel";
import useRewardsBoard from "../hooks/useRewardsBoard";

export default function Rewards() {
  const { summary, ledger, loading, error } = useRewardsBoard();
  const rewardTodoAppUrl =
    import.meta.env.VITE_REWARD_TODO_APP_URL || "http://127.0.0.1:8088";

  return (
    <div>
      <h1 className="page-title">奖励</h1>

      {loading ? (
        <div className="loading-container">
          <div className="loading-pulse" aria-label="加载中" />
        </div>
      ) : (
        <div className="rewards-page">
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
          <RewardLedgerPanel
            summary={summary}
            ledger={ledger}
            submitting={false}
            isReadonly
          />
        </div>
      )}
    </div>
  );
}
