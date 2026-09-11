import { render, screen } from "@testing-library/react";
import DashboardPage from "../app/dashboard/page";

describe("DashboardPage", () => {
  it("renders the dashboard layout with sections", () => {
    render(<DashboardPage />);
    expect(screen.getByRole("heading", { name: /quick play/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /recent matches/i })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /top players/i })).toBeInTheDocument();
  });

  it("renders the quick play time control buttons", () => {
    render(<DashboardPage />);
    expect(screen.getAllByRole("button", { name: /1 min bullet/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /3 min blitz/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /5 min blitz/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /10 min rapid/i })[0]).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /custom challenge/i })[0]).toBeInTheDocument();
  });
});
