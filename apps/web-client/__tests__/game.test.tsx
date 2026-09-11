import { render, screen } from "@testing-library/react";
import GamePage from "../app/game/[id]/page";

describe("GamePage", () => {
  it("renders the player cards", () => {
    render(<GamePage params={{ id: "test-game-123" }} />);
    // Assuming there are two PlayerCard instances
    const playerCards = screen.getAllByTestId("player-card");
    expect(playerCards).toHaveLength(2);
  });

  it("renders the chessboard container", () => {
    render(<GamePage params={{ id: "test-game-123" }} />);
    expect(screen.getByTestId("chessboard-container")).toBeInTheDocument();
  });

  it("renders the game info panel", () => {
    render(<GamePage params={{ id: "test-game-123" }} />);
    expect(screen.getByTestId("game-status-banner")).toBeInTheDocument();
    expect(screen.getByTestId("move-history")).toBeInTheDocument();
  });

  it("renders the action buttons", () => {
    render(<GamePage params={{ id: "test-game-123" }} />);
    expect(screen.getByRole("button", { name: /resign/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /offer draw/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /takeback/i })).toBeInTheDocument();
  });
});
