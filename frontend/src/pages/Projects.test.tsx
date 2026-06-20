import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { test, vi, expect, beforeEach } from "vitest";

import Projects from "./Projects";

const {
  fetchProjectsMock,
  fetchTaskTemplatesMock,
  createProjectMock,
  createTaskTemplateMock,
  createDailyTaskMock,
} = vi.hoisted(() => ({
  fetchProjectsMock: vi.fn(),
  fetchTaskTemplatesMock: vi.fn(),
  createProjectMock: vi.fn(),
  createTaskTemplateMock: vi.fn(),
  createDailyTaskMock: vi.fn(),
}));

vi.mock("../api/client", () => ({
  fetchProjects: fetchProjectsMock,
  fetchTaskTemplates: fetchTaskTemplatesMock,
  createProject: createProjectMock,
  createTaskTemplate: createTaskTemplateMock,
  createDailyTask: createDailyTaskMock,
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
  createProjectMock.mockResolvedValue({
    id: 3,
    name: "写作",
    status: "active",
    sort_order: 2,
  });
  createTaskTemplateMock.mockResolvedValue({
    id: 3,
    project_id: 1,
    name: "力量训练 20 分钟",
    default_estimated_duration_minutes: 20,
    default_reward_amount: 1200,
    notes: "",
    is_active: true,
  });
  createDailyTaskMock.mockResolvedValue({
    id: 99,
    date: "2026-06-20",
    project_id: 1,
    task_template_id: 1,
    name_snapshot: "跑步 30 分钟",
    estimated_duration_minutes_snapshot: 30,
    reward_amount_snapshot: 2000,
    status: "pending",
    actual_duration_minutes: null,
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

test("creates project and shows it in list", async () => {
  fetchProjectsMock
    .mockResolvedValueOnce([
      { id: 1, name: "健身", status: "active", sort_order: 0 },
      { id: 2, name: "学习", status: "active", sort_order: 1 },
    ])
    .mockResolvedValueOnce([
      { id: 1, name: "健身", status: "active", sort_order: 0 },
      { id: 2, name: "学习", status: "active", sort_order: 1 },
      { id: 3, name: "写作", status: "active", sort_order: 2 },
    ]);

  render(<Projects />);

  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("项目名称"), {
    target: { value: "写作" },
  });
  fireEvent.click(screen.getByRole("button", { name: "创建项目" }));

  await waitFor(() => {
    expect(createProjectMock).toHaveBeenCalledWith({ name: "写作" });
  });
  expect(await screen.findByRole("button", { name: /写作/ })).toBeInTheDocument();
});

test("creates template and shows it in template list", async () => {
  fetchTaskTemplatesMock
    .mockImplementationOnce(async () => [
      {
        id: 1,
        project_id: 1,
        name: "跑步 30 分钟",
        default_estimated_duration_minutes: 30,
        default_reward_amount: 2000,
        notes: "",
        is_active: true,
      },
    ])
    .mockImplementationOnce(async () => [
      {
        id: 1,
        project_id: 1,
        name: "跑步 30 分钟",
        default_estimated_duration_minutes: 30,
        default_reward_amount: 2000,
        notes: "",
        is_active: true,
      },
      {
        id: 3,
        project_id: 1,
        name: "力量训练 20 分钟",
        default_estimated_duration_minutes: 20,
        default_reward_amount: 1200,
        notes: "",
        is_active: true,
      },
    ]);

  render(<Projects />);

  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();

  fireEvent.change(screen.getByLabelText("模板名称"), {
    target: { value: "力量训练 20 分钟" },
  });
  fireEvent.change(screen.getByLabelText("默认时长（分钟）"), {
    target: { value: "20" },
  });
  fireEvent.change(screen.getByLabelText("默认奖励金额（分）"), {
    target: { value: "1200" },
  });
  fireEvent.click(screen.getByRole("button", { name: "创建模板" }));

  await waitFor(() => {
    expect(createTaskTemplateMock).toHaveBeenCalledWith({
      project_id: 1,
      name: "力量训练 20 分钟",
      default_estimated_duration_minutes: 20,
      default_reward_amount: 1200,
      notes: "",
    });
  });
  expect(await screen.findByText("力量训练 20 分钟")).toBeInTheDocument();
});

test("adds template to today and shows success message", async () => {
  render(<Projects />);

  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();

  fireEvent.click(screen.getByRole("button", { name: "加入今日" }));

  await waitFor(() => {
    expect(createDailyTaskMock).toHaveBeenCalledWith({
      task_template_id: 1,
      estimated_duration_minutes: 30,
      reward_amount: 2000,
    });
  });
  expect(await screen.findByText("已加入今日任务。")).toBeInTheDocument();
});
