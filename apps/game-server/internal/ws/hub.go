package ws

import (
	"sync"
)

// Connection pool for managing WebSocket connections.
// It maintains a set of active connections and provides methods to add, remove, and broadcast messages to all connected clients.

type Hub struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	mu		 sync.RWMutex
}

func NewHub() *Hub {
	return &Hub{
		clients:    make(map[*Client]bool),
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