import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, vi, test, expect } from "vitest";

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

const {
  fetchDailyTasksMock,
  fetchRewardSummaryMock,
  completeDailyTaskMock,
} = vi.hoisted(() => ({
  fetchDailyTasksMock: vi.fn(),
  fetchRewardSummaryMock: vi
    .fn(),
  completeDailyTaskMock: vi.fn(),
}));

vi.mock("../api/client", () => ({
  fetchDailyTasks: fetchDailyTasksMock,
  fetchRewardSummary: fetchRewardSummaryMock,
  completeDailyTask: completeDailyTaskMock,
}));

function getRewardBalanceCard() {
  return screen.getByText("奖励余额").closest(".overview-card") as HTMLElement;
}

function mockInitialBoard() {
  fetchDailyTasksMock.mockResolvedValue([defaultTask]);
  fetchRewardSummaryMock.mockResolvedValue({
    current_balance: 0,
    today_earned: 0,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockInitialBoard();
  completeDailyTaskMock.mockResolvedValue({
    ...defaultTask,
    status: "completed",
    actual_duration_minutes: 28,
  });
});

test("completes daily task from today page", async () => {
  fetchDailyTasksMock
    .mockResolvedValueOnce([defaultTask])
    .mockResolvedValueOnce([
      {
        ...defaultTask,
        status: "completed",
        actual_duration_minutes: 28,
      },
    ]);

  fetchRewardSummaryMock
    .mockResolvedValueOnce({
      current_balance: 0,
      today_earned: 0,
    })
    .mockResolvedValueOnce({
      current_balance: 2000,
      today_earned: 2000,
    });

  render(<Today />);

  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();
  expect(within(getRewardBalanceCard()).getByText("¥0.00")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "完成" }));
  fireEvent.change(screen.getByLabelText("实际时长"), {
    target: { value: "28" },
  });
  fireEvent.click(screen.getByRole("button", { name: "确认完成" }));

  await waitFor(() => {
    expect(screen.getByText("已完成")).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(within(getRewardBalanceCard()).getByText("¥20.00")).toBeInTheDocument();
  });
});

test("rejects invalid actual duration input without submitting", async () => {
  render(<Today />);

  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "完成" }));
  fireEvent.change(screen.getByLabelText("实际时长"), {
    target: { value: "1.5" },
  });
  fireEvent.click(screen.getByRole("button", { name: "确认完成" }));

  expect(await screen.findByText("实际时长需要填写正整数分钟。")).toBeInTheDocument();
  expect(completeDailyTaskMock).not.toHaveBeenCalled();
});

test("does not show completed state together with submit failure when summary refresh fails", async () => {
  fetchRewardSummaryMock
    .mockResolvedValueOnce({
      current_balance: 0,
      today_earned: 0,
    })
    .mockRejectedValueOnce(new Error("summary refresh failed"));

  completeDailyTaskMock.mockResolvedValue({
    ...defaultTask,
    status: "completed",
    actual_duration_minutes: 28,
  });

  render(<Today />);

  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "完成" }));
  fireEvent.change(screen.getByLabelText("实际时长"), {
    target: { value: "28" },
  });
  fireEvent.click(screen.getByRole("button", { name: "确认完成" }));

  await waitFor(() => {
    expect(screen.getByText("提交失败，请稍后重试。")).toBeInTheDocument();
  });

  expect(screen.queryByText("已完成")).not.toBeInTheDocument();
});
