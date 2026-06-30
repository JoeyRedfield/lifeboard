import { useDashboard } from "../hooks/useDashboard";
import OverviewCards from "../components/OverviewCards";
import MonthlyTrendChart from "../components/MonthlyTrendChart";
import CategoryPieChart from "../components/CategoryPieChart";
import AssetTrendChart from "../components/AssetTrendChart";

export default function Dashboard() {
  const { overview, trends, categories, assets, loading, error } = useDashboard();

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-pulse" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="page-title">仪表盘</h1>

      {error ? <div className="message message-error">{error}</div> : null}

      <OverviewCards data={overview} />

      <div className="charts-grid">
        <MonthlyTrendChart data={trends} />
        <CategoryPieChart data={categories} />
      </div>

      <div className="chart-card-full">
        <AssetTrendChart data={assets} />
      </div>
    </div>
  );
}
