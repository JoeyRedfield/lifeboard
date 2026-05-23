import ReactECharts from "echarts-for-react";
import type { MonthlyTrendItem } from "../types";

interface Props {
  data: MonthlyTrendItem[];
}

export default function MonthlyTrendChart({ data }: Props) {
  const option = {
    tooltip: {
      trigger: "axis",
    },
    legend: {
      data: ["收入", "支出"],
      bottom: 0,
    },
    grid: {
      left: 20,
      right: 20,
      top: 20,
      bottom: 40,
    },
    xAxis: {
      type: "category",
      data: data.map((d) => `${d.year}-${String(d.month).padStart(2, "0")}`),
      axisLabel: { rotate: 45 },
    },
    yAxis: {
      type: "value",
      axisLabel: {
        formatter: (v: number) => (v / 10000).toFixed(0) + "w",
      },
    },
    series: [
      {
        name: "收入",
        type: "bar",
        data: data.map((d) => d.income / 100),
        itemStyle: { color: "#00b894" },
      },
      {
        name: "支出",
        type: "bar",
        data: data.map((d) => d.expense / 100),
        itemStyle: { color: "#e17055" },
      },
    ],
  };

  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 12,
        padding: 20,
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
      }}
    >
      <h3 style={{ marginBottom: 16, fontSize: 16, fontWeight: 600 }}>
        月度收支趋势
      </h3>
      <ReactECharts option={option} style={{ height: 350 }} />
    </div>
  );
}
