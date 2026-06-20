import RewardLedgerPanel from "../components/RewardLedgerPanel";
import useRewardsBoard from "../hooks/useRewardsBoard";

export default function Rewards() {
  const { summary, ledger, loading, error, submitting, submitSpend } =
    useRewardsBoard();

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
          <RewardLedgerPanel
            summary={summary}
            ledger={ledger}
            submitting={submitting}
            onSubmitSpend={submitSpend}
          />
        </div>
      )}
    </div>
  );
}
