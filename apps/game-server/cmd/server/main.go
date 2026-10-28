package main

// Application entry point for the game server.
// This file contains the main function that starts the server and initializes the Redis service.

import (
	"log"
	"net/http"

	"github.com/haroonstar2/chessclone/apps/game-server/internal/game"
	"github.com/haroonstar2/chessclone/apps/game-server/internal/redis"
	"github.com/haroonstar2/chessclone/apps/game-server/internal/ws"
	"github.com/joho/godotenv"
)

func main() {

	log.Println("Starting game server...")

	error := godotenv.Load()
	if error != nil {
		log.Println("Note: .env file not found, relying on system environment variables")
	}

	// Create Redis client
	redisClient, err := redis.CreateRedisClient()
	if err != nil {
		log.Fatalf("Failed to create Redis client: %v", err)
	}
	log.Println("Redis client created successfully.")

	// Create a new Hub for managing WebSocket connections
	hub := ws.NewHub(game.NewManager())
	go hub.Run()
	log.Println("WebSocket Hub initialized and listening.")

	// Create a new WebSocket handler with Redis client and Hub
	wsHandler := ws.NewHandler(redisClient, hub)
	http.Handle("/ws", wsHandler)
	log.Println("WebSocket handler registered at /ws endpoint.")

	port := ":8080"
	log.Printf("Game server listening on %s", port)
	if err := http.ListenAndServe(port, nil); err != nil {
		log.Fatalf("Failed to start HTTP server: %v", err)
	}

	log.Println("Game server is running...")

}
