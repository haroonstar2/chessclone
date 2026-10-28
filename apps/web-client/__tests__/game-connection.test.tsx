import "@testing-library/jest-dom";
import { act, render, screen, waitFor } from "@testing-library/react";
import { Chess } from "chess.js";
import GamePage from "../app/game/[id]/page";
import { apiClient } from "../lib/apiClient";
jest.mock("../lib/apiClient", () => ({ apiClient: jest.fn() }));
let boardOptions: any;
jest.mock("react-chessboard", () => ({
  Chessboard: ({ options }: any) => {
    boardOptions = options;
    return (
      <div
        data-testid="board"
        data-orientation={options.boardOrientation}
        data-draggable={options.allowDragging}
      />
    );
  },
}));
class Socket {
  static OPEN = 1;
  readyState = 1;
  onopen?: () => void;
  onclose?: () => void;
  onerror?: () => void;
  onmessage?: (event: { data: string }) => void;
  send = jest.fn();
  close = jest.fn();
  constructor() {
    sockets.push(this);
  }
}
let sockets: Socket[];
beforeEach(() => {
  sockets = [];
  global.WebSocket = Socket as any;
  (apiClient as jest.Mock).mockResolvedValue({ ticket: "ticket" });
});
async function setup() {
  const result = render(<GamePage />);
  await waitFor(() => expect(sockets).toHaveLength(1));
  return result;
}
it("orients the board for black", async () => {
  await setup();
  act(() =>
    sockets[0].onmessage?.({
      data: JSON.stringify({
        type: "GAME_STATE",
        payload: { playerColor: "black", turn: "w" },
      }),
    }),
  );
  expect(screen.getByTestId("board")).toHaveAttribute(
    "data-orientation",
    "black",
  );
});
it.each(["onclose", "onerror"] as const)(
  "shows connection failure on %s",
  async (event) => {
    await setup();
    act(() =>
      sockets[0].onmessage?.({
        data: JSON.stringify({
          type: "GAME_STATE",
          payload: { playerColor: "white", turn: "w", ready: true },
        }),
      }),
    );
    act(() => sockets[0][event]?.());
    expect(screen.getByTestId("board")).toHaveAttribute(
      "data-draggable",
      "false",
    );
    expect(screen.getByTestId("game-status-banner")).toHaveTextContent(
      /connection.*(lost|error)|disconnected/i,
    );
  },
);
it("reports opponent disconnects", async () => {
  await setup();
  act(() =>
    sockets[0].onmessage?.({
      data: JSON.stringify({ type: "OPPONENT_DISCONNECTED", payload: {} }),
    }),
  );
  expect(screen.getByTestId("game-status-banner")).toHaveTextContent(
    /opponent disconnected/i,
  );
});
it("does not open a socket after unmount during authentication", async () => {
  let resolve!: (value: any) => void;
  (apiClient as jest.Mock).mockReturnValue(
    new Promise((r) => {
      resolve = r;
    }),
  );
  const { unmount } = render(<GamePage />);
  unmount();
  await act(async () => resolve({ ticket: "late" }));
  expect(sockets).toHaveLength(0);
});

it("updates immediately and rolls back to the authoritative ERROR FEN", async () => {
  await setup();
  const initial = new Chess().fen();
  act(() =>
    sockets[0].onmessage?.({
      data: JSON.stringify({
        type: "GAME_STATE",
        payload: { fen: initial, playerColor: "white", turn: "w", ready: true },
      }),
    }),
  );
  act(() => {
    expect(
      boardOptions.onPieceDrop({ sourceSquare: "e2", targetSquare: "e4" }),
    ).toBe(true);
  });
  const expected = new Chess();
  expected.move("e4");
  expect(boardOptions.position).toBe(expected.fen());
  expect(JSON.parse(sockets[0].send.mock.calls[0][0])).toMatchObject({
    type: "MOVE",
    payload: { from: "e2", to: "e4" },
    timestamp: expect.any(String),
  });
  act(() =>
    sockets[0].onmessage?.({
      data: JSON.stringify({
        type: "ERROR",
        payload: { message: "not your turn", fen: initial },
      }),
    }),
  );
  expect(boardOptions.position).toBe(initial);
});
it("shows a waiting overlay and clears it on reconnect", async () => {
  await setup();
  act(() =>
    sockets[0].onmessage?.({
      data: JSON.stringify({ type: "OPPONENT_DISCONNECTED", payload: {} }),
    }),
  );
  expect(screen.getByText("Waiting for opponent...")).toBeInTheDocument();
  act(() =>
    sockets[0].onmessage?.({
      data: JSON.stringify({
        type: "GAME_STATE",
        payload: { fen: new Chess().fen(), playerColor: "black", ready: true },
      }),
    }),
  );
  expect(screen.queryByText("Waiting for opponent...")).not.toBeInTheDocument();
});
it("applies approved opponent moves", async () => {
  await setup();
  const chess = new Chess();
  chess.move("e4");
  act(() =>
    sockets[0].onmessage?.({
      data: JSON.stringify({
        type: "MOVE",
        payload: { fen: chess.fen(), turn: "b", moves: [{ white: "e4" }] },
      }),
    }),
  );
  expect(boardOptions.position).toBe(chess.fen());
  expect(screen.getByTestId("game-status-banner")).toHaveTextContent(
    "Black to move",
  );
});
it("rejects additional moves while awaiting approval and rolls back on disconnect", async () => {
  await setup();
  const fen = new Chess().fen();
  act(() =>
    sockets[0].onmessage?.({
      data: JSON.stringify({
        type: "GAME_STATE",
        payload: { fen, playerColor: "white", ready: true },
      }),
    }),
  );
  act(() => {
    expect(
      boardOptions.onPieceDrop({ sourceSquare: "e2", targetSquare: "e4" }),
    ).toBe(true);
  });
  act(() => {
    expect(
      boardOptions.onPieceDrop({ sourceSquare: "e7", targetSquare: "e5" }),
    ).toBe(false);
  });
  expect(sockets[0].send).toHaveBeenCalledTimes(1);
  act(() => sockets[0].onclose?.());
  expect(boardOptions.position).toBe(fen);
});
