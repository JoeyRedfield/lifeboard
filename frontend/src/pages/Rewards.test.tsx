import { fireEvent, render, screen } from "@testing-library/react";
import { test, vi, expect, beforeEach } from "vitest";

import Rewards from "./Rewards";

const {
  fetchRewardLedgerMock,
  fetchRewardSummaryMock,
  spendRewardMock,
} = vi.hoisted(() => ({
  fetchRewardLedgerMock: vi.fn(),
  fetchRewardSummaryMock: vi.fn(),
  spendRewardMock: vi.fn(),
}));

vi.mock("../api/client", () => ({
  fetchRewardLedger: fetchRewardLedgerMock,
  fetchRewardSummary: fetchRewardSummaryMock,
  spendReward: spendRewardMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  fetchRewardLedgerMock.mockResolvedValue([
    {
      id: 1,
      entry_type: "earn",
      amount: 2000,
      reason: "跑步 30 分钟",
      daily_task_id: 1,
    },
  ]);
  fetchRewardSummaryMock.mockResolvedValue({
    current_balance: 2000,
    today_earned: 2000,
  });
  spendRewardMock.mockResolvedValue({
    id: 2,
    entry_type: "spend",
    amount: -500,
    reason: "咖啡",
    daily_task_id: null,
  });
});

test("submits reward spend form", async () => {
  fetchRewardSummaryMock
    .mockResolvedValueOnce({
      current_balance: 2000,
      today_earned: 2000,
    })
    .mockResolvedValueOnce({
      current_balance: 1500,
      today_earned: 2000,
    });
  fetchRewardLedgerMock
    .mockResolvedValueOnce([
      {
        id: 1,
        entry_type: "earn",
        amount: 2000,
        reason: "跑步 30 分钟",
        daily_task_id: 1,
      },
    ])
    .mockResolvedValueOnce([
      {
        id: 2,
        entry_type: "spend",
        amount: -500,
        reason: "咖啡",
        daily_task_id: null,
      },
      {
        id: 1,
        entry_type: "earn",
        amount: 2000,
        reason: "跑步 30 分钟",
        daily_task_id: 1,
      },
    ])
    .mockResolvedValueOnce([
      {
        id: 2,
        entry_type: "spend",
        amount: -500,
        reason: "咖啡",
        daily_task_id: null,
      },
      {
        id: 1,
        entry_type: "earn",
        amount: 2000,
        reason: "跑步 30 分钟",
        daily_task_id: 1,
      },
    ]);

  render(<Rewards />);

  await screen.findByText("跑步 30 分钟");
  fireEvent.change(screen.getByLabelText("扣减金额"), {
    target: { value: "5" },
  });
  fireEvent.change(screen.getByLabelText("扣减原因"), {
    target: { value: "咖啡" },
  });
  fireEvent.click(screen.getByRole("button", { name: "确认扣减" }));

  expect(await screen.findByText("咖啡")).toBeInTheDocument();
});

test("does not show failure state when spend succeeds but summary refresh fails", async () => {
  fetchRewardSummaryMock
    .mockResolvedValueOnce({
      current_balance: 2000,
      today_earned: 2000,
    })
    .mockRejectedValueOnce(new Error("summary refresh failed"));
  fetchRewardLedgerMock
    .mockResolvedValueOnce([
      {
        id: 1,
        entry_type: "earn",
        amount: 2000,
        reason: "跑步 30 分钟",
        daily_task_id: 1,
      },
    ])
    .mockResolvedValueOnce([
      {
        id: 2,
        entry_type: "spend",
        amount: -500,
        reason: "咖啡",
        daily_task_id: null,
      },
      {
        id: 1,
        entry_type: "earn",
        amount: 2000,
        reason: "跑步 30 分钟",
        daily_task_id: 1,
      },
    ]);

  render(<Rewards />);

  await screen.findByText("跑步 30 分钟");
  fireEvent.change(screen.getByLabelText("扣减金额"), {
    target: { value: "5" },
  });
  fireEvent.change(screen.getByLabelText("扣减原因"), {
    target: { value: "咖啡" },
  });
  fireEvent.click(screen.getByRole("button", { name: "确认扣减" }));

  expect(await screen.findByText("咖啡")).toBeInTheDocument();
  expect(screen.queryByText("提交失败，请稍后重试。")).not.toBeInTheDocument();
  expect(screen.queryByText("奖励扣减失败，请稍后重试。")).not.toBeInTheDocument();
});
