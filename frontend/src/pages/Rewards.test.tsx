import { render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import Rewards from "./Rewards";

const {
  fetchRewardTodoLedgerMock,
  fetchRewardTodoSummaryMock,
} = vi.hoisted(() => ({
  fetchRewardTodoLedgerMock: vi.fn(),
  fetchRewardTodoSummaryMock: vi.fn(),
}));

vi.mock("../api/client", () => ({
  fetchRewardTodoLedger: fetchRewardTodoLedgerMock,
  fetchRewardTodoSummary: fetchRewardTodoSummaryMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  fetchRewardTodoLedgerMock.mockResolvedValue({
    readOnly: true,
    items: [
      {
        id: 1,
        entry_type: "earn",
        amount: 2000,
        reason: "跑步 30 分钟",
        daily_task_id: 1,
        created_at: "2026-06-21T10:00:00Z",
      },
    ],
  });
  fetchRewardTodoSummaryMock.mockResolvedValue({
    current_balance: 2000,
    today_earned: 2000,
    readOnly: true,
  });
});

test("rewards page hides spend form in readonly mode", async () => {
  render(<Rewards />);

  await screen.findByText("跑步 30 分钟");
  expect(screen.getByText("前往 Reward Todo 管理")).toBeInTheDocument();
  expect(screen.queryByText("手动扣减")).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "确认扣减" })).not.toBeInTheDocument();
});

test("renders readonly ledger data from reward-todo proxy", async () => {
  render(<Rewards />);

  await screen.findByText("跑步 30 分钟");
  expect(screen.getAllByText("¥20.00").length).toBeGreaterThan(0);
  expect(screen.getByText("earn")).toBeInTheDocument();
});
