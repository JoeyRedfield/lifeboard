import { useState } from "react";
import type { RewardLedgerEntry, RewardSummary } from "../types";

function formatYuan(amountInCent: number): string {
  return `¥${(amountInCent / 100).toFixed(2)}`;
}

interface Props {
  summary: RewardSummary;
  ledger: RewardLedgerEntry[];
  submitting: boolean;
  onSubmitSpend?: (amountYuan: number, reason: string) => Promise<void>;
  isReadonly?: boolean;
}

export default function RewardLedgerPanel({
  summary,
  ledger,
  submitting,
  onSubmitSpend,
  isReadonly = false,
}: Props) {
  const [amountValue, setAmountValue] = useState("");
  const [reasonValue, setReasonValue] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleSubmit = async () => {
    const parsedAmount = Number(amountValue);

    if (!Number.isInteger(parsedAmount) || parsedAmount <= 0) {
      setSubmitError("扣减金额需要填写正整数。");
      return;
    }

    if (reasonValue.trim() === "") {
      setSubmitError("扣减原因不能为空。");
      return;
    }

    setSubmitError(null);

    if (!onSubmitSpend) return;
    try {
      await onSubmitSpend(parsedAmount, reasonValue.trim());
      setAmountValue("");
      setReasonValue("");
    } catch {
      setSubmitError("提交失败，请稍后重试。");
    }
  };

  return (
    <div className="rewards-board">
      <section className="overview-grid rewards-summary-grid">
        <div className="overview-card assets animate-in">
          <div className="overview-card-label">当前余额</div>
          <div className="overview-card-value assets">
            {formatYuan(summary.current_balance)}
          </div>
          <div className="overview-card-sub">可用于手动扣减</div>
        </div>
        <div className="overview-card income animate-in">
          <div className="overview-card-label">今日已赚</div>
          <div className="overview-card-value income">
            {formatYuan(summary.today_earned)}
          </div>
          <div className="overview-card-sub">来自今日完成任务</div>
        </div>
      </section>

      <div className="board-two-column">
        {isReadonly ? null : <section className="card">
          <div className="card-header">
            <h2 className="card-title">手动扣减</h2>
          </div>

          <div className="reward-form">
            <label className="board-field">
              <span>扣减金额</span>
              <input
                type="number"
                min="1"
                inputMode="numeric"
                value={amountValue}
                onChange={(event) => setAmountValue(event.target.value)}
                placeholder="单位：元"
                disabled={submitting}
              />
            </label>

            <label className="board-field">
              <span>扣减原因</span>
              <input
                type="text"
                value={reasonValue}
                onChange={(event) => setReasonValue(event.target.value)}
                placeholder="例如：咖啡"
                disabled={submitting}
              />
            </label>

            {submitError ? (
              <div className="message message-error">{submitError}</div>
            ) : null}

            <button
              type="button"
              className="btn btn-primary"
              onClick={() => void handleSubmit()}
              disabled={submitting}
            >
              {submitting ? "提交中..." : "确认扣减"}
            </button>
          </div>
        </section>}

        <section className="card">
          <div className="card-header">
            <h2 className="card-title">奖励流水</h2>
          </div>

          {ledger.length === 0 ? (
            <p className="panel-empty-state">还没有奖励流水。</p>
          ) : (
            <div className="ledger-list">
              {ledger.map((entry) => (
                <article key={entry.id} className="ledger-item">
                  <div className="ledger-item-row">
                    <div>
                      <div className="ledger-item-reason">{entry.reason}</div>
                      <div className="ledger-item-type">{entry.entry_type}</div>
                    </div>
                    <div
                      className={`ledger-item-amount${
                        entry.amount >= 0 ? " is-positive" : " is-negative"
                      }`}
                    >
                      {entry.amount >= 0 ? "+" : ""}
                      {formatYuan(entry.amount)}
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
