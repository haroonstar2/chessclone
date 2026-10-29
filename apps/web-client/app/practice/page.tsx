"use client";

import { useState } from "react";
import { Chess } from "chess.js";

import { ChessBoardView } from "../../components/ChessBoardView";

export default function PracticePage() {
  const [chessGame] = useState(() => new Chess());

  const [chessPosition, setChessPosition] = useState<string>(chessGame.fen());

  function handleMove({
    from,
    to,
    promotion,
  }: {
    from: string;
    to: string;
    promotion?: string;
  }) {
    try {
      const move = chessGame.move({ from, to, promotion });
      if (!move) return false;
      setChessPosition(chessGame.fen());
      return true;
    } catch {
      return false;
    }
  }

  function onReset() {
    chessGame.reset();
    setChessPosition(chessGame.fen());
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 p-4">
      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-6">Practice Board</h1>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <ChessBoardView
              fen={chessPosition}
              playerColor="both"
              onMove={handleMove}
            />
          </div>
        </div>

        <div className="w-full md:w-80 flex flex-col gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-xl font-semibold mb-4">Game Status</h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Turn:</span>{" "}
                {chessGame.turn() === "w" ? "White" : "Black"}
              </p>
              <p>
                <span className="font-medium">In Check:</span>{" "}
                {chessGame.inCheck() ? "Yes" : "No"}
              </p>
              <p>
                <span className="font-medium">Game Over:</span>{" "}
                {chessGame.isGameOver() ? "Yes" : "No"}
              </p>
            </div>
          </div>

          <button
            onClick={() => onReset()}
            className="w-full bg-blue-600 text-white font-medium py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Reset Board
          </button>
        </div>
      </div>
    </div>
  );
}
