import "@testing-library/jest-dom";
import { act, fireEvent, render, screen } from "@testing-library/react";
import type { ComponentProps } from "react";
import type { Chessboard } from "react-chessboard";
import { ChessBoardView } from "../components/ChessBoardView";

let boardOptions: NonNullable<ComponentProps<typeof Chessboard>["options"]>;
jest.mock("react-chessboard", () => ({
  Chessboard: ({ options }: ComponentProps<typeof Chessboard>) => {
    boardOptions = options!;
    return null;
  },
  defaultPieces: Object.fromEntries(
    ["w", "b"].flatMap((color) =>
      ["Q", "R", "N", "B"].map((piece) => [
        `${color}${piece}`,
        () => (
          <span>
            {color}
            {piece}
          </span>
        ),
      ]),
    ),
  ),
}));

it.each([
  { color: "b", fen: "7k/8/8/8/8/8/p7/7K b - - 0 1", from: "a2", to: "a1" },
  { color: "w", fen: "7k/P7/8/8/8/8/8/7K w - - 0 1", from: "a7", to: "a8" },
])(
  "shows $color promotion pieces for dragging and clicking",
  ({ color, fen, from, to }) => {
    const onMove = jest.fn(() => true);
    render(<ChessBoardView fen={fen} onMove={onMove} />);

    act(() => {
      boardOptions.onPieceDrop!({
        sourceSquare: from,
        targetSquare: to,
        piece: { pieceType: `${color}P`, position: from, isSparePiece: false },
      });
    });
    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["Q", "R", "N", "B"].map((piece) => `${color}${piece}`));
    fireEvent.click(screen.getByRole("button", { name: `${color}Q` }));
    expect(onMove).toHaveBeenLastCalledWith({ from, to, promotion: "q" });

    act(() => {
      boardOptions.onSquareClick!({
        square: from,
        piece: { pieceType: `${color}P` },
      });
    });
    act(() => {
      boardOptions.onSquareClick!({ square: to, piece: null });
    });
    expect(
      screen.getAllByRole("button").map((button) => button.textContent),
    ).toEqual(["Q", "R", "N", "B"].map((piece) => `${color}${piece}`));
  },
);
