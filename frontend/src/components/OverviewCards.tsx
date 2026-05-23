import type { OverviewData } from "../types";

function formatYuan(cent: number): string {
  const yuan = cent / 100;
  if (Math.abs(yuan) >= 10000) {
    return (yuan / 10000).toFixed(1) + "万";
  }
  return yuan.toFixed(0);
}

interface Props {
  data: OverviewData | null;
}

export default function OverviewCards({ data }: Props) {
  if (!data) return null;

  const cards = [
    { label: "本月收入", value: data.income, color: "#00b894" },
    { label: "本月支出", value: data.expense, color: "#e17055" },
    { label: "本月结余", value: data.net, color: "#0984e3" },
    { label: "总资产", value: data.balance, color: "#6c5ce7" },
  ];

  return (
    <div style={{ display: "flex", gap: 20, marginBottom: 28 }}>
      {cards.map((card) => (
        <div
          key={card.label}
          style={{
            flex: 1,
            background: "#fff",
            borderRadius: 12,
            padding: "20px 24px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ fontSize: 14, color: "#636e72", marginBottom: 8 }}>
            {card.label}
          </div>
          <div
            style={{
              fontSize: 28,
              fontWeight: 700,
              color: card.color,
            }}
          >
            ¥{formatYuan(card.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
