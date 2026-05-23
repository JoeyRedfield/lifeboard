import ReactECharts from "echarts-for-react";
import type { AssetTrendItem } from "../types";

interface Props {
  data: AssetTrendItem[];
}

export default function AssetTrendChart({ data }: Props) {
  const option = {
    tooltip: {
      trigger: "axis",
    },
    grid: {
      left: 20,
      right: 20,
      top: 20,
      bottom: 20,
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
        type: "line",
        data: data.map((d) => +(d.total_balance / 100).toFixed(0)),
        smooth: true,
        lineStyle: { color: "#6c5ce7", width: 2 },
        itemStyle: { color: "#6c5ce7" },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(108,92,231,0.25)" },
              { offset: 1, color: "rgba(108,92,231,0.02)" },
            ],
          },
        },
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
        资产变化趋势
      </h3>
      <ReactECharts option={option} style={{ height: 350 }} />
    </div>
  );
}
