package main

// Application entry point for the game server.
// This file contains the main function that starts the server and initializes the Redis service.

import (
	"log/slog"
	"net/http"
	"os"

	"github.com/haroonstar2/chessclone/apps/game-server/internal/game"
	"github.com/haroonstar2/chessclone/apps/game-server/internal/observability"
	"github.com/haroonstar2/chessclone/apps/game-server/internal/redis"
	"github.com/haroonstar2/chessclone/apps/game-server/internal/ws"
	"github.com/joho/godotenv"
)

func main() {
	slog.SetDefault(observability.NewLogger(os.Stdout))

	slog.Info("Starting game server...")

	error := godotenv.Load()
	if error != nil {
		slog.Info("Note: .env file not found, relying on system environment variables")
	}

	// Create Redis client
	redisClient, err := redis.CreateRedisClient()
	if err != nil {
		slog.Error("Redis initialization failed", "error", err)
		os.Exit(1)
	}
	slog.Info("Redis client created successfully.")

	// Create a new Hub for managing WebSocket connections
	manager := game.NewManager(redis.CompletionHandler(redisClient))
	hub := ws.NewHub(manager)
	go hub.Run()
	slog.Info("WebSocket Hub initialized and listening.")

	// Create a new WebSocket handler with Redis client and Hub
	wsHandler := ws.NewHandler(redisClient, hub)
	http.Handle("/ws", wsHandler)
	http.Handle("/metrics", observability.MetricsHandler(hub.GetClientCount, manager.ActiveGames, hub.MovesProcessed))
	slog.Info("WebSocket handler registered at /ws endpoint.")

	port := ":8080"
	slog.Info("Game server listening", "address", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		slog.Error("HTTP server failed", "error", err)
		os.Exit(1)
	}

	slog.Info("Game server is running...")

}
