import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import Dashboard from "./Dashboard";

const {
  fetchAssetsMock,
  fetchCategoriesMock,
  fetchOverviewMock,
  fetchTrendsMock,
} = vi.hoisted(() => ({
  fetchAssetsMock: vi.fn(),
  fetchCategoriesMock: vi.fn(),
  fetchOverviewMock: vi.fn(),
  fetchTrendsMock: vi.fn(),
}));

vi.mock("../api/client", () => ({
  fetchAssets: fetchAssetsMock,
  fetchCategories: fetchCategoriesMock,
  fetchOverview: fetchOverviewMock,
  fetchTrends: fetchTrendsMock,
}));

vi.mock("echarts-for-react", () => ({
  default: () => <div data-testid="chart" />,
}));

beforeEach(() => {
  vi.clearAllMocks();
  fetchOverviewMock.mockResolvedValue({
    year: 2026,
    month: 6,
    income: 10000,
    expense: 6000,
    balance: 200000,
    net: 4000,
  });
  fetchTrendsMock.mockResolvedValue([]);
  fetchCategoriesMock.mockResolvedValue([]);
  fetchAssetsMock.mockResolvedValue([]);
});

test("renders dashboard data when all requests succeed", async () => {
  render(<Dashboard />);

  expect(await screen.findByText("仪表盘")).toBeInTheDocument();
  expect(screen.getByText("本月收入")).toBeInTheDocument();
  expect(screen.getByText("¥100.00")).toBeInTheDocument();
});

test("shows an error message when dashboard loading fails", async () => {
  fetchOverviewMock.mockRejectedValueOnce(new Error("backend unavailable"));

  render(<Dashboard />);

  expect(
    await screen.findByText("仪表盘加载失败，请稍后重试。")
  ).toBeInTheDocument();
  expect(screen.queryByLabelText("加载中")).not.toBeInTheDocument();
});
