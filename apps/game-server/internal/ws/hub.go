package ws

import (
	"encoding/json"
	"errors"
	"log/slog"
	"sync"
	"sync/atomic"

	"github.com/haroonstar2/chessclone/apps/game-server/internal/game"
)

// Connection pool for managing WebSocket connections.
// It maintains a set of active connections and provides methods to add, remove, and broadcast messages to all connected clients.

type Hub struct {
	movesProcessed atomic.Uint64
	clients        map[*Client]bool
	gameManager    *game.Manager
	broadcast      chan []byte
	register       chan *Client
	unregister     chan *Client
	mu             sync.RWMutex
}

func NewHub(gm *game.Manager) *Hub {
	return &Hub{
		clients:     make(map[*Client]bool),
		gameManager: gm,
		broadcast:   make(chan []byte),
		register:    make(chan *Client),
		unregister:  make(chan *Client),
	}
}

func (h *Hub) HasClient(client *Client) bool {
	h.mu.RLock()
	defer h.mu.RUnlock()

	_, exists := h.clients[client]
	return exists
}

func (h *Hub) GetClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()

	return len(h.clients)
}

func (h *Hub) Run() {
	for {
		// Wait for events on the register, unregister, and broadcast channels.
		select {
		case client := <-h.register:

			h.mu.Lock()

			h.clients[client] = true

			h.mu.Unlock()

		case client := <-h.unregister:

			h.mu.Lock()

			if _, ok := h.clients[client]; ok {
				delete(h.clients, client)
				h.gameManager.RemovePlayer(client)
				client.closeSend()
			}

			h.mu.Unlock()

		case message := <-h.broadcast:
			// Send the message to all connected clients. If a client's send channel is blocked, close it and remove the client from the hub.
			h.mu.Lock()
			for client := range h.clients {
				client.sendMu.Lock()
				full := false
				if !client.closed {
					select {
					case client.send <- message:
					default:
						full = true
					}
				}
				client.sendMu.Unlock()
				if full {
					h.gameManager.RemovePlayer(client)
					client.closeSend()
					delete(h.clients, client)
				}
			}
			h.mu.Unlock()
		}
	}
}

func (h *Hub) handleIncomingMessage(client *Client, message IncomingMessage) {

	switch message.Type {
	case "JOIN_GAME":
		if client.room != nil {
			return
		}
		var payload game.JoinGamePayload
		if err := json.Unmarshal(message.Payload, &payload); err != nil {

			client.logger().Warn("Invalid join payload", "error", err)
			return
		}

		slog.Info("Joining game", "userId", client.UserUUID, "gameId", payload.GameID)

		room, err := h.gameManager.JoinRoom(payload.GameID, client)
		if err != nil {
			client.sendError(err)
			slog.Warn("Join failed", "userId", client.UserUUID, "gameId", payload.GameID, "error", err)
			return
		}

		client.room = room
		client.logger().Info("Game joined")

	case "MOVE":
		defer h.movesProcessed.Add(1)
		var payload game.MovePayload
		if err := json.Unmarshal(message.Payload, &payload); err != nil {

			if client.room != nil {
				client.room.SendError(client, err)
			} else {
				client.sendError(err)
			}
			client.logger().Warn("Invalid move payload", "error", err)
			return
		}

		client.logger().Info("Move received", "from", payload.From, "to", payload.To)

		room := client.room
		if room == nil {
			client.sendError(errors.New("join a game before moving"))
			return
		}
		active, err := h.gameManager.GetRoom(room.ID)
		if err != nil || active != room {
			room.SendError(client, errors.New("game has expired"))
			return
		}
		if payload.GameID != "" && payload.GameID != room.ID {
			room.SendError(client, errors.New("wrong game"))
			return
		}
		if err := room.HandleMove(client, payload.From, payload.To, payload.Promotion); err != nil {
			room.SendError(client, err)
			client.logger().Warn("Move rejected", "error", err)
		} else {
			client.logger().Info("Move accepted")
		}

	case "RESIGN", "OFFER_DRAW", "ACCEPT_DRAW":
		room := client.room
		if room == nil {
			client.sendError(errors.New("join a game first"))
			return
		}
		active, err := h.gameManager.GetRoom(room.ID)
		if err != nil || active != room {
			room.SendError(client, errors.New("game has expired"))
			return
		}
		switch message.Type {
		case "RESIGN":
			err = room.Resign(client)
		case "OFFER_DRAW":
			err = room.OfferDraw(client)
		case "ACCEPT_DRAW":
			err = room.AcceptDraw(client)
		}
		if err != nil {
			room.SendError(client, err)
		}
	default:
		client.logger().Warn("Unknown WebSocket event", "eventType", message.Type)
	}
}

func (h *Hub) MovesProcessed() uint64 {
	return h.movesProcessed.Load()
}
