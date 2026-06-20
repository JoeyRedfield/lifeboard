import { MemoryRouter } from "react-router-dom";
import { render, screen, within } from "@testing-library/react";
import { test, expect } from "vitest";

import { AppRoutes } from "./App";

test("renders task reward navigation entries", () => {
  render(
    <MemoryRouter>
      <AppRoutes />
    </MemoryRouter>
  );

  const navigation = screen.getByRole("navigation");

  expect(within(navigation).getByText("今日")).toBeInTheDocument();
  expect(within(navigation).getByText("项目")).toBeInTheDocument();
  expect(within(navigation).getByText("奖励")).toBeInTheDocument();
  expect(within(navigation).getByRole("link", { name: /今日/ })).toHaveAttribute(
    "href",
    "/today"
  );
  expect(within(navigation).getByRole("link", { name: /项目/ })).toHaveAttribute(
    "href",
    "/projects"
  );
  expect(within(navigation).getByRole("link", { name: /奖励/ })).toHaveAttribute(
    "href",
    "/rewards"
  );
});
