import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, expect, test, vi } from "vitest";

import Projects from "./Projects";

const {
  fetchRewardTodoProjectsMock,
  fetchRewardTodoTemplatesMock,
} = vi.hoisted(() => ({
  fetchRewardTodoProjectsMock: vi.fn(),
  fetchRewardTodoTemplatesMock: vi.fn(),
}));

vi.mock("../api/client", () => ({
  fetchRewardTodoProjects: fetchRewardTodoProjectsMock,
  fetchRewardTodoTemplates: fetchRewardTodoTemplatesMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  fetchRewardTodoProjectsMock.mockResolvedValue({
    readOnly: true,
    items: [
      { id: 1, name: "健身", status: "active", sort_order: 0 },
      { id: 2, name: "学习", status: "active", sort_order: 1 },
    ],
  });
  fetchRewardTodoTemplatesMock.mockImplementation(async (projectId?: number) => {
    if (projectId === 2) {
      return {
        readOnly: true,
        items: [
          {
            id: 2,
            project_id: 2,
            name: "读书 45 分钟",
            default_estimated_duration_minutes: 45,
            default_reward_amount: 1500,
            notes: "",
            is_active: true,
          },
        ],
      };
    }

    return {
      readOnly: true,
      items: [
        {
          id: 1,
          project_id: 1,
          name: "跑步 30 分钟",
          default_estimated_duration_minutes: 30,
          default_reward_amount: 2000,
          notes: "",
          is_active: true,
        },
      ],
    };
  });
});

test("projects page hides create actions and shows readonly jump", async () => {
  render(<Projects />);

  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();
  expect(screen.getByText("前往 Reward Todo 管理")).toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "创建项目" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "创建模板" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "加入今日" })).not.toBeInTheDocument();
});

test("keeps previous selection when project switch fails", async () => {
  fetchRewardTodoTemplatesMock.mockImplementationOnce(async () => ({
    readOnly: true,
    items: [
      {
        id: 1,
        project_id: 1,
        name: "跑步 30 分钟",
        default_estimated_duration_minutes: 30,
        default_reward_amount: 2000,
        notes: "",
        is_active: true,
      },
    ],
  }));
  fetchRewardTodoTemplatesMock.mockRejectedValueOnce(new Error("switch failed"));

  render(<Projects />);

  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();

  const fitnessButton = screen.getByRole("button", { name: /健身/ });
  const studyButton = screen.getByRole("button", { name: /学习/ });

  fireEvent.click(studyButton);

  expect(await screen.findByText("模板加载失败，请稍后重试。")).toBeInTheDocument();
  expect(screen.getByText("跑步 30 分钟")).toBeInTheDocument();
  expect(fitnessButton).toHaveClass("is-active");
  expect(studyButton).not.toHaveClass("is-active");
});
