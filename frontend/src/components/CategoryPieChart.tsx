import ReactECharts from "echarts-for-react";
import type { CategoryBreakdownItem } from "../types";

interface Props {
  data: CategoryBreakdownItem[];
}

export default function CategoryPieChart({ data }: Props) {
  const option = {
    tooltip: {
      trigger: "item",
      formatter: "{b}: ¥{c} ({d}%)",
    },
    legend: {
      type: "scroll",
      orient: "vertical",
      right: 10,
      top: 20,
      bottom: 20,
    },
    series: [
      {
        type: "pie",
        radius: ["40%", "70%"],
        center: ["40%", "50%"],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 6,
          borderColor: "#fff",
          borderWidth: 2,
        },
        label: { show: false },
        emphasis: {
          label: { show: true, fontSize: 14, fontWeight: "bold" },
        },
        data: data.map((d) => ({
          name: d.category,
          value: +(d.amount / 100).toFixed(0),
        })),
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
        支出分类占比
      </h3>
      <ReactECharts option={option} style={{ height: 350 }} />
    </div>
  );
}
