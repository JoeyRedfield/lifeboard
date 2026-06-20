import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { vi, test, expect } from "vitest";

import Today from "./Today";

const {
  fetchDailyTasksMock,
  fetchRewardSummaryMock,
  completeDailyTaskMock,
} = vi.hoisted(() => ({
  fetchDailyTasksMock: vi.fn().mockResolvedValue([
    {
      id: 1,
      date: "2026-06-20",
      project_id: 1,
      task_template_id: 1,
      name_snapshot: "跑步 30 分钟",
      estimated_duration_minutes_snapshot: 30,
      reward_amount_snapshot: 2000,
      status: "pending",
      actual_duration_minutes: null,
    },
  ]),
  fetchRewardSummaryMock: vi
    .fn()
    .mockResolvedValueOnce({
      current_balance: 0,
      today_earned: 0,
    })
    .mockResolvedValueOnce({
      current_balance: 2000,
      today_earned: 2000,
    }),
  completeDailyTaskMock: vi.fn().mockResolvedValue({
    id: 1,
    status: "completed",
    actual_duration_minutes: 28,
  }),
}));

vi.mock("../api/client", () => ({
  fetchDailyTasks: fetchDailyTasksMock,
  fetchRewardSummary: fetchRewardSummaryMock,
  completeDailyTask: completeDailyTaskMock,
}));

test("completes daily task from today page", async () => {
  render(<Today />);

  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();
  expect(
    within(screen.getByText("奖励余额").closest(".overview-card") as HTMLElement).getByText(
      "¥0.00"
    )
  ).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "完成" }));
  fireEvent.change(screen.getByLabelText("实际时长"), {
    target: { value: "28" },
  });
  fireEvent.click(screen.getByRole("button", { name: "确认完成" }));

  await waitFor(() => {
    expect(screen.getByText("已完成")).toBeInTheDocument();
  });

  await waitFor(() => {
    expect(
      within(
        screen.getByText("奖励余额").closest(".overview-card") as HTMLElement
      ).getByText("¥20.00")
    ).toBeInTheDocument();
  });
});
