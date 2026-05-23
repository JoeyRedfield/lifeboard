import { useDashboard } from "../hooks/useDashboard";
import OverviewCards from "../components/OverviewCards";
import MonthlyTrendChart from "../components/MonthlyTrendChart";
import CategoryPieChart from "../components/CategoryPieChart";
import AssetTrendChart from "../components/AssetTrendChart";

export default function Dashboard() {
  const { overview, trends, categories, assets, loading } = useDashboard();

  if (loading) {
    return <div style={{ textAlign: "center", padding: 60 }}>加载中...</div>;
  }

  return (
    <div>
      <h1 className="page-title">仪表盘</h1>
      <OverviewCards data={overview} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 20,
          marginBottom: 20,
        }}
      >
        <MonthlyTrendChart data={trends} />
        <CategoryPieChart data={categories} />
      </div>

      <AssetTrendChart data={assets} />
    </div>
  );
}
