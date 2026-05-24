import ReactECharts from "echarts-for-react";
import type { AssetTrendItem } from "../types";

const TEXT_SECONDARY = "#8b949e";
const BORDER = "rgba(139,148,158,0.12)";
const BLUE = "#58a6ff";

interface Props {
  data: AssetTrendItem[];
}

export default function AssetTrendChart({ data }: Props) {
  const option = {
    tooltip: {
      trigger: "axis",
      backgroundColor: "rgba(13,17,23,0.95)",
      borderColor: BORDER,
      textStyle: { color: "#e6edf3", fontSize: 13 },
      formatter: (params: any[]) => {
        const month = params[0].axisValue;
        const val = params[0].value;
        return `<div style="font-weight:600;margin-bottom:4px">${month}</div>
          <span>${params[0].marker} 总资产</span>
          <span style="font-family:monospace;font-weight:600;margin-left:12px">¥${(val / 100).toFixed(2)}</span>`;
      },
    },
    grid: {
      left: 16,
      right: 16,
      top: 16,
      bottom: 16,
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
        type: "line",
        data: data.map((d) => d.total_balance),
        smooth: true,
        symbol: "circle",
        symbolSize: 6,
        lineStyle: { color: BLUE, width: 2.5 },
        itemStyle: { color: BLUE },
        areaStyle: {
          color: {
            type: "linear",
            x: 0,
            y: 0,
            x2: 0,
            y2: 1,
            colorStops: [
              { offset: 0, color: "rgba(88,166,255,0.2)" },
              { offset: 1, color: "rgba(88,166,255,0.02)" },
            ],
          },
        },
      },
    ],
  };

  return (
    <div className="card chart-container">
      <h3 className="card-title">资产变化趋势</h3>
      <ReactECharts option={option} style={{ height: 350 }} />
    </div>
  );
}
