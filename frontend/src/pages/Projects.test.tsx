import { render, screen } from "@testing-library/react";
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
  ]);
  fetchTaskTemplatesMock.mockResolvedValue([
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
});

test("renders project template list", async () => {
  render(<Projects />);

  expect(await screen.findByText("跑步 30 分钟")).toBeInTheDocument();
});
