"use client";

import { useState, useMemo } from "react";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import {
  Chessboard,
  type SquareHandlerArgs,
  type PieceDropHandlerArgs,
  defaultPieces,
  type PieceRenderObject,
} from "react-chessboard";

interface ChessBoardViewProps {
  fen: string;
  orientation?: "white" | "black";
  playerColor?: "white" | "black" | "both";
  disabled?: boolean;
  onMove: (move: { from: string; to: string; promotion?: string }) => boolean;
}

export function ChessBoardView({
  fen,
  orientation = "white",
  disabled = false,
  onMove,
}: ChessBoardViewProps) {
  const chess = useMemo(
    () => new Chess(fen === "start" ? undefined : fen),
    [fen],
  );

  const [moveFrom, setMoveFrom] = useState<string>("");
  const [optionSquares, setOptionSquares] = useState<
    Record<string, React.CSSProperties>
  >({});
  const [promotionMove, setPromotionMove] = useState<{
    sourceSquare: string;
    targetSquare: string;
    color: "w" | "b";
  } | null>(null);

  function getMoveOptions(square: Square) {
    const moves = chess.moves({ square, verbose: true });
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    const newSquares: Record<string, React.CSSProperties> = {};
    for (const move of moves) {
      newSquares[move.to] = {
        background:
          chess.get(move.to) &&
          chess.get(move.to)?.color !== chess.get(square)?.color
            ? "radial-gradient(circle, rgba(0,0,0,.2) 85%, transparent 85%)"
            : "radial-gradient(circle, rgba(0,0,0,.2) 25%, transparent 25%)",
        borderRadius: "50%",
      };
    }
    newSquares[square] = { background: "rgba(255, 255, 0, 0.4)" };
    setOptionSquares(newSquares);
    return true;
  }

  function handleDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs) {
    if (!targetSquare || disabled) return false;

    // Check for pawn promotion
    const piece = chess.get(sourceSquare as Square);
    const isPromotion =
      piece?.type === "p" &&
      (targetSquare[1] === "8" || targetSquare[1] === "1");

    if (isPromotion) {
      const possibleMoves = chess.moves({
        square: sourceSquare as Square,
        verbose: true,
      });
      if (possibleMoves.some((m) => m.to === targetSquare)) {
        setPromotionMove({ sourceSquare, targetSquare, color: piece.color });
        return true;
      }
    }

    // Delegate move to parent page
    const success = onMove({ from: sourceSquare, to: targetSquare });
    if (success) {
      setMoveFrom("");
      setOptionSquares({});
    }
    return success;
  }

  function handleSquareClick({ square, piece }: SquareHandlerArgs) {
    if (disabled) return;

    if (!moveFrom && piece) {
      if (getMoveOptions(square as Square)) {
        setMoveFrom(square);
      }
      return;
    }

    const moves = chess.moves({ square: moveFrom as Square, verbose: true });
    const foundMove = moves.find((m) => m.from === moveFrom && m.to === square);

    if (!foundMove) {
      const hasOptions = getMoveOptions(square as Square);
      setMoveFrom(hasOptions ? square : "");
      return;
    }

    if (foundMove.promotion) {
      setPromotionMove({ sourceSquare: moveFrom, targetSquare: square, color: foundMove.color });
      return;
    }

    const success = onMove({ from: moveFrom, to: square });
    if (success) {
      setMoveFrom("");
      setOptionSquares({});
    }
  }

  function handlePromotionSelect(piece: string | undefined) {
    if (disabled || !piece || !promotionMove) {
      setPromotionMove(null);
      return false;
    }

    const promotionChar =
      piece.length >= 2 ? piece[1].toLowerCase() : piece.toLowerCase();
    const success = onMove({
      from: promotionMove.sourceSquare,
      to: promotionMove.targetSquare,
      promotion: promotionChar,
    });

    setPromotionMove(null);
    setMoveFrom("");
    setOptionSquares({});
    return success;
  }

  return (
    <div className="relative w-full aspect-square">
      {/* Promotion Dialog Modal Overlay */}
      {promotionMove && (
        <>
          <div
            onClick={() => setPromotionMove(null)}
            className="absolute inset-0 bg-black/20 z-40 rounded-lg"
          />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-lg shadow-2xl p-2 z-50 flex gap-2 border">
            {(["q", "r", "n", "b"] as PieceSymbol[]).map((p) => (
              <button
                key={p}
                onClick={() => handlePromotionSelect(p)}
                className="w-14 h-14 hover:bg-gray-100 rounded flex items-center justify-center p-1 transition"
              >
                {defaultPieces[
                  `${promotionMove.color}${p.toUpperCase()}` as keyof PieceRenderObject
                ]()}
              </button>
            ))}
          </div>
        </>
      )}

      <Chessboard
        options={{
          position: fen === "start" ? chess.fen() : fen,
          boardOrientation: orientation,
          allowDragging: !disabled,
          onPieceDrop: handleDrop,
          onSquareClick: handleSquareClick,
          squareStyles: optionSquares,
        }}
      />
    </div>
  );
}
