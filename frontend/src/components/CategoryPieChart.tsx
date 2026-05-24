import ReactECharts from "echarts-for-react";
import type { CategoryBreakdownItem } from "../types";

const TEXT_SECONDARY = "#8b949e";
const BORDER = "rgba(139,148,158,0.12)";
const CHART_BG = "#161b22";

const COLORS = [
  "#d4a853", "#e0556a", "#58a6ff", "#3fb950", "#bc8cff",
  "#f0883e", "#768390", "#e6a5b2", "#87ceeb", "#a8d672",
  "#d2a86e", "#e0777b", "#6ea8d6", "#5ebd62", "#c49be0",
];

interface Props {
  data: CategoryBreakdownItem[];
}

export default function CategoryPieChart({ data }: Props) {
  const option = {
    color: COLORS,
    tooltip: {
      trigger: "item",
      backgroundColor: "rgba(13,17,23,0.95)",
      borderColor: BORDER,
      textStyle: { color: "#e6edf3", fontSize: 13 },
      formatter: (p: any) =>
        `<span style="font-weight:600">${p.name}</span><br/>` +
        `<span style="font-family:monospace">¥${(p.value / 100).toFixed(2)}</span> ` +
        `<span style="color:${TEXT_SECONDARY}">(${p.percent}%)</span>`,
    },
    legend: {
      type: "scroll",
      orient: "vertical",
      right: 0,
      top: 8,
      bottom: 8,
      textStyle: { color: TEXT_SECONDARY, fontSize: 12 },
      pageTextStyle: { color: TEXT_SECONDARY },
    },
    series: [
      {
        type: "pie",
        radius: ["45%", "75%"],
        center: ["35%", "50%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 4,
          borderColor: CHART_BG,
          borderWidth: 3,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: "bold" },
          scaleSize: 8,
        },
        data: data.map((d) => ({
          name: d.category,
          value: d.amount,
        })),
      },
    ],
  };

  return (
    <div className="card chart-container">
      <h3 className="card-title">支出分类占比</h3>
      <ReactECharts option={option} style={{ height: 350 }} />
    </div>
  );
}
