import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "@jest/globals";
import PracticePage from "../app/practice/page";

describe("PracticePage behavior", () => {
  it("renders the board and game status panel", () => {
    render(<PracticePage />);

    expect(
      screen.getByRole("heading", { name: /practice board/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: /game status/i }),
    ).toBeInTheDocument();
    expect(screen.getByText(/turn:/i)).toBeInTheDocument();
    expect(screen.getByText(/white/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /reset board/i }),
    ).toBeInTheDocument();
  });
});
