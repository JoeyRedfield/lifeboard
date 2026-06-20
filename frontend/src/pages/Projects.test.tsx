import { fireEvent, render, screen } from "@testing-library/react";
import { test, vi, expect, beforeEach } from "vitest";

import Projects from "./Projects";

const { fetchProjectsMock, fetchTaskTemplatesMock } = vi.hoisted(() => ({
  fetchProjectsMock: vi.fn(),
  fetchTaskTemplatesMock: vi.fn(),
}));

vi.mock("../api/client", () => ({
  fetchProjects: fetchProjectsMock,
  fetchTaskTemplates: fetchTaskTemplatesMock,
}));

beforeEach(() => {
  vi.clearAllMocks();
  fetchProjectsMock.mockResolvedValue([
    { id: 1, name: "健身", status: "active", sort_order: 0 },
    { id: 2, name: "学习", status: "active", sort_order: 1 },
  ]);
  fetchTaskTemplatesMock.mockImplementation(async (projectId?: number) => {
    if (projectId === 2) {
      return [
        {
          id: 2,
          project_id: 2,
          name: "读书 45 分钟",
          default_estimated_duration_minutes: 45,
          default_reward_amount: 1500,
          notes: "",
          is_active: true,
        },
      ];
    }

    return [
      {
        id: 1,
        project_id: 1,
        name: "跑步 30 分钟",
        default_estimated_duration_minutes: 30,
        default_reward_amount: 2000,
        notes: "",
        is_active: true,
      },
    ];
  });
});

test("renders project template list", async () => {
  render(<Projects />);

  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();
});

test("keeps previous selection when project switch fails", async () => {
  fetchTaskTemplatesMock.mockImplementationOnce(async () => [
    {
      id: 1,
      project_id: 1,
      name: "跑步 30 分钟",
      default_estimated_duration_minutes: 30,
      default_reward_amount: 2000,
      notes: "",
      is_active: true,
    },
  ]);
  fetchTaskTemplatesMock.mockRejectedValueOnce(new Error("switch failed"));

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
