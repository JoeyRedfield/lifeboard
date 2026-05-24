import { useState } from "react";
import { triggerSync } from "../api/client";

export default function Settings() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");
  const [msgType, setMsgType] = useState<"success" | "error" | "">("");

  const handleSync = async () => {
    setSyncing(true);
    setMessage("");
    setMsgType("");
    try {
      const result = await triggerSync();
      if (result.success && result.result) {
        setMessage(
          `同步完成 — 账户 ${result.result.accounts} 条, 分类 ${result.result.categories} 条, 交易 ${result.result.transactions} 条`
        );
        setMsgType("success");
      } else {
        setMessage(`同步失败: ${result.error || "未知错误"}`);
        setMsgType("error");
      }
    } catch {
      setMessage("同步请求失败，请检查后端服务");
      setMsgType("error");
    }
    setSyncing(false);
  };

  return (
    <div>
      <h1 className="page-title">设置</h1>

      <div className="settings-grid">
        <div className="source-card">
          <div className="card-title" style={{ marginBottom: 16 }}>
            数据源管理
          </div>

          <div className="source-header">
            <div>
              <div className="source-name">ezbookkeeping</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", marginTop: 4 }}>
                记账数据源 — 自动同步交易、账户、分类
              </div>
            </div>
            <div className="source-status connected">
              <span className="source-status-dot" />
              已连接
            </div>
          </div>

          <button
            onClick={handleSync}
            disabled={syncing}
            className="btn btn-primary"
          >
            {syncing ? "同步中..." : "立即同步"}
          </button>

          {message && (
            <div className={`message message-${msgType}`}>
              {message}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
