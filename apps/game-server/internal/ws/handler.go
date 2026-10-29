package ws

// HTTP /ws endpoint handler and ticket validation.

import (
	"context"
	"log/slog"
	"net/http"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

// Upgrader is used to upgrade the HTTP connection to a WebSocket connection.
var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		// origin := r.Header.Get("Origin")
		// if origin == "http://localhost:3000" {
		// 	return true
		// }
		// return false
		return true // Allow all origins for now
	},
}

type RedisClient interface {
	GetDel(ctx context.Context, key string) *redis.StringCmd
}

type ClientHandler struct {
	redisClient RedisClient
	hub         *Hub
}

func NewHandler(redisClient RedisClient, hub *Hub) *ClientHandler {
	return &ClientHandler{
		redisClient: redisClient,
		hub:         hub,
	}
}

func (h *ClientHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {

	slog.Info("WebSocket connection request received")

	ctx := context.Background()

	// Extract the ticket from the query parameters
	ticket := r.URL.Query().Get("ticket")
	if ticket == "" {
		slog.Info("Missing ticket parameter")
		http.Error(w, "Missing ticket parameter", http.StatusBadRequest)
		return
	}

	// Validate the ticket against Redis
	slog.Debug("Validating connection ticket")
	userUUID, err := h.redisClient.GetDel(ctx, ticket).Result()
	if err == redis.Nil {
		slog.Info("Invalid or expired ticket")
		http.Error(w, "Invalid or expired ticket", http.StatusUnauthorized)
		return
	} else if err != nil {
		slog.Error("Ticket validation failed", "error", err)
		http.Error(w, "Error validating ticket", http.StatusInternalServerError)
		return
	}

	slog.Info("Connection ticket validated", "userId", userUUID, "gameId", r.URL.Query().Get("gameId"))

	// Upgrade the HTTP connection to a WebSocket connection
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		slog.Error("WebSocket upgrade failed", "userId", userUUID, "gameId", r.URL.Query().Get("gameId"), "error", err)
		return
	}

	slog.Info("WebSocket connected", "userId", userUUID, "gameId", r.URL.Query().Get("gameId"))

	// Create a new client and register it with the hub
	client := &Client{
		hub:      h.hub,
		conn:     conn,
		send:     make(chan []byte, 256),
		UserUUID: userUUID,
	}
	if gameID := r.URL.Query().Get("gameId"); gameID != "" {
		client.room, err = h.hub.gameManager.JoinRoom(gameID, client)
		if err != nil {
			client.sendError(err)
		}
	} else {
		client.room, _ = h.hub.gameManager.Resume(client)
	}
	client.logger().Info("WebSocket session ready")
	client.hub.register <- client

	// Create a goroutine for the write pump to handle outgoing messages
	go client.WritePump()

	// Use current goroutine for the read pump to handle incoming messages
	client.ReadPump()
}
