"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";

import { Chess } from "chess.js";
import { ChessBoardView } from "@/components/ChessBoardView";

import { PlayerCard } from "../../../components/PlayerCard";
import { MoveHistory } from "../../../components/MoveHistory";
import { GameActionBar } from "../../../components/GameActionBar";
import { apiClient } from "../../../lib/apiClient";

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;

  const [chessPosition, setChessPosition] = useState<string>("start");
  const [playerColor, setPlayerColor] = useState<"white" | "black">("white");
  const [statusText, setStatusText] = useState<string>("Connecting to game...");
  const [moves, setMoves] = useState<{ white: string; black?: string }[]>([]);

  const chessRef = useRef(new Chess());
  const confirmedFen = useRef(new Chess().fen());
  const pendingMove = useRef(false);
  const [waiting, setWaiting] = useState(false);
  const [canPlay, setCanPlay] = useState(false);
  const playableRef = useRef(false);
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let mounted = true;
    const setPlayable = (value: boolean) => {
      playableRef.current = value;
      setCanPlay(value);
    };
    setPlayable(false);

    async function initGameSession() {
      try {
        if (!mounted) return;

        const { ticket } = await apiClient<{ ticket: string }>("auth/ticket");

        if (!mounted) return;

        // Establish WebSocket connection using the ticket
        const wsUrl = new URL(
          process.env.NEXT_PUBLIC_GAME_SERVICE_URL || "http://localhost:8080",
        );
        wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
        wsUrl.pathname = "/ws";
        wsUrl.searchParams.set("ticket", ticket);
        wsUrl.searchParams.set("gameId", gameId);
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onmessage = (event) => {
          if (!mounted) return;
          let message;
          try {
            message = JSON.parse(event.data);
          } catch {
            setStatusText("Error: Invalid game server message");
            return;
          }
          if (!message?.payload) return;

          if (message.payload.fen) {
            try {
              chessRef.current.load(message.payload.fen);
              confirmedFen.current = message.payload.fen;
              pendingMove.current = false;
              setChessPosition(chessRef.current.fen());
            } catch {
              setPlayable(false);
              setStatusText("Error: Invalid board state from server");
              return;
            }
          }

          switch (message.type) {
            case "GAME_STATE":
              setWaiting(message.payload.ready === false);
              setPlayable(message.payload.ready !== false);
              if (message.payload.playerColor) {
                setPlayerColor(message.payload.playerColor);
              }
              if (message.payload.moves) {
                setMoves(message.payload.moves);
              }
              setStatusText(
                message.payload.turn === "w" || message.payload.turn === "white"
                  ? "White to move"
                  : "Black to move",
              );
              break;
            case "MOVE":
              if (message.payload.moves) {
                setMoves(message.payload.moves);
              }
              setStatusText(
                message.payload.turn === "w" || message.payload.turn === "white"
                  ? "White to move"
                  : "Black to move",
              );
              break;
            case "OPPONENT_DISCONNECTED":
              setWaiting(true);
              pendingMove.current = false;
              chessRef.current.load(confirmedFen.current);
              setChessPosition(confirmedFen.current);
              setPlayable(false);
              setStatusText(
                "Opponent disconnected. Waiting for them to rejoin.",
              );
              break;
            case "GAME_ENDED":
              setWaiting(false);
              setPlayable(false);
              setStatusText(`Game Over: ${message.payload.result}`);
              break;

            case "ERROR":
              console.error("Game service error:", message.payload.message);
              setStatusText(`Error: ${message.payload.message}`);
              break;
            default:
              console.warn("Unknown message type:", message.type);
          }
        };

        ws.onclose = () => {
          if (!mounted) return;
          setPlayable(false);
          pendingMove.current = false;
          chessRef.current.load(confirmedFen.current);
          setChessPosition(confirmedFen.current);
          setStatusText("Connection lost. Reload to reconnect.");
        };
        ws.onerror = () => {
          if (!mounted) return;
          setPlayable(false);
          pendingMove.current = false;
          chessRef.current.load(confirmedFen.current);
          setChessPosition(confirmedFen.current);
          setStatusText("Connection error. Reload to reconnect.");
        };
      } catch (error) {
        if (!mounted) return;
        setPlayable(false);
        setStatusText("Unable to connect to game. Reload to retry.");
        console.error("Error initializing game session:", error);
      }
    }

    initGameSession();

    return () => {
      mounted = false;
      playableRef.current = false;
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [gameId]);

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex justify-center">
      <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-8">
        {/* Main Column - Board Area */}
        <div className="flex-1 flex flex-col gap-4">
          <PlayerCard
            username={
              playerColor === "white" ? "Opponent (Black)" : "Opponent (White)"
            }
            rating={1500}
            timeRemaining="10:00"
            isActive={false}
          />

          <div
            data-testid="chessboard-container"
            className="relative w-full aspect-square bg-gray-300 rounded-lg flex items-center justify-center text-gray-500 shadow-md"
          >
            {waiting && (
              <div
                role="status"
                className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 text-white font-semibold"
              >
                Waiting for opponent...
              </div>
            )}
            <ChessBoardView
              disabled={!canPlay}
              fen={chessPosition}
              orientation={playerColor}
              playerColor={playerColor}
              onMove={({ from, to, promotion }) => {
                if (
                  pendingMove.current ||
                  !playableRef.current ||
                  !socketRef.current ||
                  socketRef.current.readyState !== WebSocket.OPEN
                ) {
                  return false;
                }

                const chess = chessRef.current;
                if (chess.turn() !== (playerColor === "white" ? "w" : "b"))
                  return false;
                try {
                  chess.move({ from, to, promotion });
                } catch {
                  return false;
                }
                pendingMove.current = true;
                setChessPosition(chess.fen());

                // Dispatch to Go server
                try {
                  socketRef.current.send(
                    JSON.stringify({
                      type: "MOVE",
                      timestamp: new Date().toISOString(),
                      payload: {
                        from,
                        to,
                        promotion,
                      },
                    }),
                  );
                  return true;
                } catch {
                  pendingMove.current = false;
                  chess.load(confirmedFen.current);
                  setChessPosition(confirmedFen.current);
                  playableRef.current = false;
                  setCanPlay(false);
                  setStatusText(
                    "Connection error. Move was not sent. Reload to reconnect.",
                  );
                  return false;
                }
              }}
            />
          </div>

          <PlayerCard
            username={playerColor === "white" ? "You (White)" : "You (Black)"}
            rating={1500}
            timeRemaining="10:00"
            isActive={true}
          />

          <div> Game ID: {gameId}</div>
        </div>

        {/* Side Column - Game Info Panel */}
        <div className="w-full lg:w-96 flex flex-col gap-4 h-full max-h-[800px]">
          <div
            data-testid="game-status-banner"
            className="bg-white p-4 rounded-lg shadow-sm border font-semibold text-center text-lg"
          >
            {statusText}
          </div>

          <div className="bg-white rounded-lg shadow-sm border flex-1 overflow-hidden flex flex-col h-96 lg:h-auto">
            <div className="bg-gray-100 p-3 font-semibold border-b">
              Move History
            </div>
            <MoveHistory moves={moves} />
          </div>

          <GameActionBar />
        </div>
      </div>
    </div>
  );
}
