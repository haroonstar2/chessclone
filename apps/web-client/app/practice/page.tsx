"use client";

import { useState, useRef } from "react";
import { Chess, type Square, type PieceSymbol } from "chess.js";
import {
  Chessboard,
  SquareHandlerArgs,
  PieceDropHandlerArgs,
  chessColumnToColumnIndex,
  defaultPieces,
  type PieceRenderObject,
} from "react-chessboard";

export default function PracticePage() {
  const chessGameRef = useRef(new Chess());
  const chessGame = chessGameRef.current;

  const [chessPosition, setChessPosition] = useState<string>(chessGame.fen());
  const [moveFrom, setMoveFrom] = useState<string>("");
  const [optionSquares, setOptionSquares] = useState({});

  const [promotionMove, setPromotionMove] = useState<{
    sourceSquare: string;
    targetSquare: string;
  } | null>(null);

  function onDrop({ sourceSquare, targetSquare }: PieceDropHandlerArgs) {
    if (!targetSquare) return false;

    // Check if the move is a pawn landing on the 1st or 8th rank
    const piece = chessGame.get(sourceSquare as Square);
    const isPromotion =
      piece?.type === "p" &&
      (targetSquare[1] === "8" || targetSquare[1] === "1");

    if (isPromotion) {
      // Verify it's a legal move before triggering the dialog
      const possibleMoves = chessGame.moves({
        square: sourceSquare as Square,
        verbose: true,
      });

      if (possibleMoves.some((m) => m.to === targetSquare)) {
        // console.log(
        //   "Promotion move detected:",
        //   sourceSquare,
        //   "to",
        //   targetSquare,
        // );

        setPromotionMove({ sourceSquare, targetSquare });
        return true; // Return true to suspend the piece while the dialog opens
      }
    }

    try {
      const move = chessGame.move({
        from: sourceSquare,
        to: targetSquare,
      });

      if (move === null) return false;

      // Update the chessPosition state with the new move
      setChessPosition(chessGame.fen());

      // clear moveFrom and optionSquares
      setMoveFrom("");
      setOptionSquares({});

      return true;
    } catch {
      return false;
    }
  }

  function getMoveOptions(square: Square) {
    // get the moves for the square
    const moves = chessGame.moves({
      square,
      verbose: true,
    });

    // if no moves, clear the option squares
    if (moves.length === 0) {
      setOptionSquares({});
      return false;
    }

    // create a new object to store the option squares
    const newSquares: Record<string, React.CSSProperties> = {};

    // loop through the moves and set the option squares
    for (const move of moves) {
      newSquares[move.to] = {
        background:
          chessGame.get(move.to) &&
          chessGame.get(move.to)?.color !== chessGame.get(square)?.color
            ? "radial-gradient(circle, rgba(0,0,0,.1) 85%, transparent 85%)" // larger circle for capturing
            : "radial-gradient(circle, rgba(0,0,0,.1) 25%, transparent 25%)",
        // smaller circle for moving
        borderRadius: "50%",
      };
    }

    // set the square clicked to move from to yellow
    newSquares[square] = {
      background: "rgba(255, 255, 0, 0.4)",
    };

    // set the option squares
    setOptionSquares(newSquares);

    // return true to indicate that there are move options
    return true;
  }

  function onSquareClick({ square, piece }: SquareHandlerArgs) {
    // console.log("Square clicked:", square, "Piece:", piece);

    // piece clicked to move
    if (!moveFrom && piece) {
      // get the move options for the square
      const hasMoveOptions = getMoveOptions(square as Square);

      // if move options, set the moveFrom to the square
      if (hasMoveOptions) {
        setMoveFrom(square);
      }

      // return early
      return;
    }
    // square clicked to move to, check if valid move
    const moves = chessGame.moves({
      square: moveFrom as Square,
      verbose: true,
    });
    const foundMove = moves.find((m) => m.from === moveFrom && m.to === square);

    // not a valid move
    if (!foundMove) {
      // check if clicked on new piece
      const hasMoveOptions = getMoveOptions(square as Square);

      // if new piece, setMoveFrom, otherwise clear moveFrom
      setMoveFrom(hasMoveOptions ? square : "");

      // return early
      return;
    }

    // If it's a valid move, check if chess.js flagged it as a promotion
    if (foundMove.promotion) {
      setPromotionMove({ sourceSquare: moveFrom, targetSquare: square });
      return; // Stop here and wait for the dialog piece selection
    }

    // is normal move
    try {
      chessGame.move({
        from: moveFrom,
        to: square,
      });
    } catch {
      // if invalid, setMoveFrom and getMoveOptions
      const hasMoveOptions = getMoveOptions(square as Square);

      // if new piece, setMoveFrom, otherwise clear moveFrom
      if (hasMoveOptions) {
        setMoveFrom(square);
      }

      // return early
      return;
    }

    // update the position state
    setChessPosition(chessGame.fen());

    // clear moveFrom and optionSquares
    setMoveFrom("");
    setOptionSquares({});
  }

  function onPromotionPieceSelect(piece: string | undefined) {
    // If the user clicks outside the dialog to cancel, piece will be undefined
    if (!piece || !promotionMove) {
      setPromotionMove(null);
      return false;
    }

    try {
      // Piece usually comes back as 'wQ', 'bN', etc.
      // Extract the second character and lowercase it ('q', 'n', 'r', 'b')
      const promotionChar =
        piece.length >= 2 ? piece[1].toLowerCase() : piece.toLowerCase();

      chessGame.move({
        from: promotionMove.sourceSquare,
        to: promotionMove.targetSquare,
        promotion: promotionChar,
      });

      setChessPosition(chessGame.fen());
      setMoveFrom("");
      setOptionSquares({});
    } catch {
      // Ignore invalid moves
    }

    // Close the dialog afterwards
    setPromotionMove(null);
    return true;
  }

  function onReset() {
    chessGame.reset();
    setChessPosition(chessGame.fen());
    setMoveFrom("");
    setOptionSquares({});
  }

  // calculate the left position of the promotion square
  const squareWidth =
    document
      .querySelector(`[data-column="a"][data-row="1"]`)
      ?.getBoundingClientRect()?.width ?? 0;
  const promotionSquareLeft = promotionMove?.targetSquare
    ? squareWidth *
      chessColumnToColumnIndex(
        promotionMove.targetSquare.match(/^[a-z]+/)?.[0] ?? "",
        8,
        // number of columns
        "white", // board orientation
      )
    : 0;

  const chessboardOptions = {
    position: chessPosition,
    onPieceDrop: onDrop,
    onSquareClick: onSquareClick,
    squareStyles: optionSquares,
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center py-12 p-4">
      <div className="w-full max-w-4xl flex flex-col md:flex-row gap-8">
        <div className="flex-1">
          <h1 className="text-3xl font-bold mb-6">Practice Board</h1>
          <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
            <div style={{ position: "relative" }}>
              {promotionMove ? (
                <div
                  onClick={() => setPromotionMove(null)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setPromotionMove(null);
                  }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "rgba(0, 0, 0, 0.1)",
                    zIndex: 1000,
                  }}
                />
              ) : null}

              {promotionMove ? (
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: promotionSquareLeft,
                    backgroundColor: "white",
                    width: squareWidth,
                    zIndex: 1001,
                    display: "flex",
                    flexDirection: "column",
                    boxShadow: "0 0 10px 0 rgba(0, 0, 0, 0.5)",
                  }}
                >
                  {(["q", "r", "n", "b"] as PieceSymbol[]).map((piece) => (
                    <button
                      key={piece}
                      onClick={() => {
                        onPromotionPieceSelect(piece);
                      }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                      }}
                      style={{
                        width: "100%",
                        aspectRatio: "1",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: 0,
                        border: "none",
                        cursor: "pointer",
                      }}
                    >
                      {defaultPieces[
                        `w${piece.toUpperCase()}` as keyof PieceRenderObject
                      ]()}
                    </button>
                  ))}
                </div>
              ) : null}
            </div>

            <Chessboard options={chessboardOptions} />
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
