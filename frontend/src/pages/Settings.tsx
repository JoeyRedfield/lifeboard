import { useState } from "react";
import { triggerSync } from "../api/client";

export default function Settings() {
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState("");

  const handleSync = async () => {
    setSyncing(true);
    setMessage("");
    try {
      const result = await triggerSync();
      if (result.success && result.result) {
        setMessage(
          `同步完成 — 账户 ${result.result.accounts}条, 分类 ${result.result.categories}条, 交易 ${result.result.transactions}条`
        );
      } else {
        setMessage(`同步失败: ${result.error || "未知错误"}`);
      }
    } catch {
      setMessage("同步请求失败，请检查后端服务");
    }
    setSyncing(false);
  };

  return (
    <div>
      <h1 className="page-title">设置</h1>

      <div
        style={{
          background: "#fff",
          borderRadius: 12,
          padding: 24,
          boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          marginBottom: 20,
        }}
      >
        <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
          数据源管理
        </h3>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            background: "#f8f9fa",
            borderRadius: 8,
          }}
        >
          <div>
            <div style={{ fontWeight: 600, marginBottom: 4 }}>ezbookkeeping</div>
            <div style={{ fontSize: 13, color: "#636e72" }}>
              记账数据源 — 自动同步交易、账户、分类
            </div>
          </div>
          <button
            onClick={handleSync}
            disabled={syncing}
            style={{
              padding: "8px 24px",
              background: syncing ? "#b2bec3" : "#0984e3",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: 14,
              cursor: syncing ? "not-allowed" : "pointer",
            }}
          >
            {syncing ? "同步中..." : "立即同步"}
          </button>
        </div>

        {message && (
          <div
            style={{
              marginTop: 16,
              padding: "12px 16px",
              borderRadius: 8,
              background: message.includes("失败") ? "#ffeaa7" : "#dfe6e9",
              fontSize: 14,
            }}
          >
            {message}
          </div>
        )}
      </div>
    </div>
  );
}
