import { render, screen } from "@testing-library/react";
import ProfilePage from "../app/profile/page";

describe("ProfilePage", () => {
  it("renders the profile header information", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("heading", { name: /chessmaster99/i })).toBeInTheDocument();
    expect(screen.getByText(/joined/i)).toBeInTheDocument();
    expect(screen.getByText(/bio placeholder/i)).toBeInTheDocument();
  });

  it("renders rating statistics", () => {
    render(<ProfilePage />);
    expect(screen.getAllByText(/bullet/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/blitz/i)[0]).toBeInTheDocument();
    expect(screen.getAllByText(/rapid/i)[0]).toBeInTheDocument();
  });

  it("renders the match history table", () => {
    render(<ProfilePage />);
    expect(screen.getByRole("heading", { name: /match history/i })).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: /inspect game/i })[0]).toBeInTheDocument();
  });
});
