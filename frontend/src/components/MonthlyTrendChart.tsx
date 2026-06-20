import ReactECharts from "echarts-for-react";
import type { MonthlyTrendItem } from "../types";

const TEXT_SECONDARY = "#8b949e";
const BORDER = "rgba(139,148,158,0.12)";
const GOLD = "#d4a853";
const ROSE = "#e0556a";

interface Props {
  data: MonthlyTrendItem[];
}

export default function MonthlyTrendChart({ data }: Props) {
  const option = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(13,17,23,0.95)",
      borderColor: BORDER,
      textStyle: { color: "#e6edf3", fontSize: 13 },
      formatter: (params: any[]) => {
        const month = params[0].axisValue;
        let html = `<div style="font-weight:600;margin-bottom:6px">${month}</div>`;
        params.forEach((p: any) => {
          html += `<div style="display:flex;justify-content:space-between;gap:24px;margin:2px 0">
            <span>${p.marker} ${p.seriesName}</span>
            <span style="font-family:monospace;font-weight:600">¥${(p.value / 100).toFixed(2)}</span>
          </div>`;
        });
        return html;
      },
    },
    legend: {
      data: ["收入", "支出"],
      bottom: 0,
      textStyle: { color: TEXT_SECONDARY, fontSize: 12 },
      itemGap: 24,
    },
    grid: {
      left: 16,
      right: 16,
      top: 16,
      bottom: 36,
    },
    xAxis: {
      type: "category",
      data: data.map((d) => `${d.year}-${String(d.month).padStart(2, "0")}`),
      axisLabel: {
        color: TEXT_SECONDARY,
        fontSize: 11,
        rotate: 45,
      },
      axisLine: { lineStyle: { color: BORDER } },
      axisTick: { show: false },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        color: TEXT_SECONDARY,
        fontSize: 11,
        formatter: (v: number) => "¥" + (v / 100).toFixed(0),
      },
      splitLine: { lineStyle: { color: BORDER, type: "dashed" } },
    },
    series: [
      {
        name: "收入",
        type: "bar",
        data: data.map((d) => d.income),
        itemStyle: {
          color: GOLD,
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 28,
      },
      {
        name: "支出",
        type: "bar",
        data: data.map((d) => d.expense),
        itemStyle: {
          color: ROSE,
          borderRadius: [4, 4, 0, 0],
        },
        barMaxWidth: 28,
      },
    ],
  };

  return (
    <div className="card chart-container">
      <h3 className="card-title">月度收支趋势</h3>
      <ReactECharts option={option} style={{ height: 350 }} />
    </div>
  );
}
