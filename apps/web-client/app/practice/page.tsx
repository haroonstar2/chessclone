"use client";

import { useState } from "react";
import { Chess } from "chess.js";
import { Chessboard } from "react-chessboard";

export default function PracticePage() {
  const [game, setGame] = useState(new Chess());

  function onDrop(sourceSquare: string, targetSquare: string | null, piece: string) {
    if (!targetSquare) return false;
    try {
      const promotionChar = piece && piece[1] ? piece[1].toLowerCase() : "q";
      const move = game.move({
        from: sourceSquare,
        to: targetSquare,
        promotion: promotionChar,
      });

      if (move === null) return false;
      setGame(new Chess(game.fen()));
      return true;
    } catch {
      return false;
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 p-4">
      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-6">Practice Board</h1>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <Chessboard
              options={{
                position: game.fen(),
                onPieceDrop: ({ sourceSquare, targetSquare, piece }) => onDrop(sourceSquare, targetSquare, piece.pieceType),
                boardStyle: {
                  borderRadius: "4px",
                  boxShadow: "0 2px 10px rgba(0, 0, 0, 0.1)",
                }
              }}
            />
          </div>
        </div>

        <div className="w-full md:w-80 flex flex-col gap-4">
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <h2 className="text-xl font-semibold mb-4">Game Status</h2>
            <div className="space-y-2">
              <p>
                <span className="font-medium">Turn:</span>{" "}
                {game.turn() === "w" ? "White" : "Black"}
              </p>
              <p>
                <span className="font-medium">In Check:</span>{" "}
                {game.inCheck() ? "Yes" : "No"}
              </p>
              <p>
                <span className="font-medium">Game Over:</span>{" "}
                {game.isGameOver() ? "Yes" : "No"}
              </p>
            </div>
          </div>

          <button
            onClick={() => setGame(new Chess())}
            className="w-full bg-blue-600 text-white font-medium py-2 rounded hover:bg-blue-700 transition-colors"
          >
            Reset Board
          </button>
        </div>
      </div>
    </div>
  );
}
