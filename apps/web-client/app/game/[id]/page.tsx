"use client";

import { useEffect, useRef } from "react";
import { useParams } from "next/navigation";

import { PlayerCard } from "../../../components/PlayerCard";
import { MoveHistory } from "../../../components/MoveHistory";
import { GameActionBar } from "../../../components/GameActionBar";
import { apiClient } from "../../../lib/apiClient";

export default function GamePage() {
  const params = useParams();
  const gameId = params.id as string;

  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    let mounted = true;

    async function initGameSession() {
      try {
        if (!mounted) return;

        const { ticket } = await apiClient<{ ticket: string }>("auth/ticket");

        // Establish WebSocket connection using the ticket
        const wsUrl = new URL(
          process.env.NEXT_PUBLIC_GAME_SERVICE_URL || "http://localhost:8080",
        );
        wsUrl.protocol = wsUrl.protocol === "https:" ? "wss:" : "ws:";
        wsUrl.pathname = "/ws";
        wsUrl.searchParams.set("ticket", ticket);
        const ws = new WebSocket(wsUrl);
        socketRef.current = ws;

        ws.onopen = () => {
          // Immediately join the room
          ws.send(
            JSON.stringify({
              type: "JOIN_GAME",
              payload: { gameId },
            }),
          );
        };

        ws.onmessage = (event) => {
          const message = JSON.parse(event.data);

          // Handle incoming messages (e.g., game state updates)
          console.log("Received message:", message);
        };

        ws.onclose = () => {
          console.log("WebSocket connection closed");
        };
      } catch (error) {
        console.error("Error initializing game session:", error);
      }
    }

    initGameSession();

    return () => {
      mounted = false;
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [gameId]);

  // Placeholder mock data
  const opponent = {
    username: "grandmaster123",
    rating: 1600,
    timeRemaining: "08:45",
  };

  const player = {
    username: "chessmaster99",
    rating: 1500,
    timeRemaining: "09:12",
  };

  const moves = [
    { white: "e4", black: "e5" },
    { white: "Nf3", black: "Nc6" },
    { white: "Bb5", black: "a6" },
  ];

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8 flex justify-center">
      <div className="max-w-6xl w-full flex flex-col lg:flex-row gap-8">
        {/* Main Column - Board Area */}
        <div className="flex-1 flex flex-col gap-4">
          <PlayerCard
            username={opponent.username}
            rating={opponent.rating}
            timeRemaining={opponent.timeRemaining}
            isActive={true}
          />

          <div
            data-testid="chessboard-container"
            className="w-full aspect-square bg-gray-300 rounded-lg flex items-center justify-center text-gray-500 shadow-md"
          >
            {/* Chessboard component will go here */}
            Chessboard Container
          </div>

          <PlayerCard
            username={player.username}
            rating={player.rating}
            timeRemaining={player.timeRemaining}
            isActive={false}
          />

          <div> Game ID: {gameId}</div>
        </div>

        {/* Side Column - Game Info Panel */}
        <div className="w-full lg:w-96 flex flex-col gap-4 h-full max-h-[800px]">
          <div
            data-testid="game-status-banner"
            className="bg-white p-4 rounded-lg shadow-sm border font-semibold text-center text-lg"
          >
            White to move
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
