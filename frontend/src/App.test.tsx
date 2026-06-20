import { MemoryRouter } from "react-router-dom";
import { render, screen, within } from "@testing-library/react";
import { test, expect } from "vitest";

import App from "./App";

test("renders task reward navigation entries", () => {
  render(
    <MemoryRouter>
      <App />
    </MemoryRouter>
  );

  const navigation = screen.getByRole("navigation");

  expect(within(navigation).getByText("今日")).toBeInTheDocument();
  expect(within(navigation).getByText("项目")).toBeInTheDocument();
  expect(within(navigation).getByText("奖励")).toBeInTheDocument();
});
