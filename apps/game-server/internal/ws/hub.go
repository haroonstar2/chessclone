package ws

import (
	"encoding/json"
	"log"
	"sync"

	"github.com/haroonstar2/chessclone/apps/game-server/internal/game"
)

// Connection pool for managing WebSocket connections.
// It maintains a set of active connections and provides methods to add, remove, and broadcast messages to all connected clients.

type Hub struct {
	clients    map[*Client]bool
	gameManager *game.Manager
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu		 sync.RWMutex
}

func NewHub(gm *game.Manager) *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
		gameManager: gm,
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
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
				close(client.send)
			}

			h.mu.Unlock()

		case message := <-h.broadcast:
			// Send the message to all connected clients. If a client's send channel is blocked, close it and remove the client from the hub.
			h.mu.Lock()
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
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
		var payload game.JoinGamePayload
		if err := json.Unmarshal(message.Payload, &payload); err != nil {

			log.Printf("Error unmarshaling JOIN_GAME payload: %v", err)
			return
		}

		log.Printf("User %s joining game %s", client.UserUUID, payload.GameID)

		room, err := h.gameManager.JoinRoom(payload.GameID, client)
		if err != nil {
			log.Printf("Error joining room: %v", err)
			return
		}

		log.Printf("User %s joined room %s", client.UserUUID, room.ID)

	case "MOVE":
		var payload game.MovePayload
		if err := json.Unmarshal(message.Payload, &payload); err != nil {

			log.Printf("Error unmarshaling MOVE payload: %v", err)
			return
		}

		log.Printf("User %s making move from %s to %s in game %s", client.UserUUID, payload.From, payload.To, payload.GameID)

		room, err := h.gameManager.GetRoom(payload.GameID)
		if err != nil {
			log.Printf("Error getting room: %v", err)
			return
		}

		if err := room.HandleMove(client, payload.From, payload.To, payload.PromotedPiece); err != nil {
			log.Printf("Error handling move: %v", err)
			return
		}

	default:
		log.Printf("Unknown message type: %s", message.Type)
	}
}