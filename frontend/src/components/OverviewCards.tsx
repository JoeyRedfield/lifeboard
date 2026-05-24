import type { OverviewData } from "../types";

function formatYuan(cent: number): string {
  return (cent / 100).toFixed(2);
}

interface Props {
  data: OverviewData | null;
}

export default function OverviewCards({ data }: Props) {
  if (!data) return null;

  const cards = [
    { label: "本月收入", value: data.income, type: "income" },
    { label: "本月支出", value: data.expense, type: "expense" },
    { label: "本月结余", value: data.net, type: "balance" },
    { label: "总资产", value: data.balance, type: "assets" },
  ];

  return (
    <div className="overview-grid">
      {cards.map((card) => (
        <div key={card.label} className={`overview-card ${card.type} animate-in`}>
          <div className="overview-card-label">{card.label}</div>
          <div className={`overview-card-value ${card.type}`}>
            ¥{formatYuan(card.value)}
          </div>
        </div>
      ))}
    </div>
  );
}
