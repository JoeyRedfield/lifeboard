import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import Today from "./Today";

const defaultTask = {
  id: 1,
  date: "2026-06-20",
  project_id: 1,
  task_template_id: 1,
  name_snapshot: "跑步 30 分钟",
  estimated_duration_minutes_snapshot: 30,
  reward_amount_snapshot: 2000,
  status: "pending",
  actual_duration_minutes: null,
};

const { fetchRewardTodoTodayMock } = vi.hoisted(() => ({
  fetchRewardTodoTodayMock: vi.fn(),
}));

vi.mock("../api/client", () => ({
  fetchRewardTodoToday: fetchRewardTodoTodayMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  fetchRewardTodoTodayMock.mockResolvedValue({
    readOnly: true,
    tasks: [defaultTask],
    current_balance: 0,
    today_earned: 0,
  });
});

test("renders today page as readonly", async () => {
  render(<Today />);

  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();
  expect(await screen.findByText("前往 Reward Todo 管理")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "完成" })).not.toBeInTheDocument();
  expect(screen.getByText("待完成")).toBeInTheDocument();
});

test("shows readonly summary data from reward-todo proxy", async () => {
  fetchRewardTodoTodayMock.mockResolvedValueOnce({
    readOnly: true,
    tasks: [{ ...defaultTask, status: "completed", actual_duration_minutes: 28 }],
    current_balance: 2000,
    today_earned: 2000,
  });

  render(<Today />);

  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();
  expect(screen.getAllByText("¥20.00").length).toBeGreaterThan(0);
  expect(screen.getByText("已完成")).toBeInTheDocument();
});
