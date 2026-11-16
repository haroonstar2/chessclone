package ws

import (
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/gorilla/websocket"
)

// Client represents a single WebSocket connection.
type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	sendMu   sync.Mutex
	UserUUID string
	room     *game.Room
	closed   bool
}

func (c *Client) logger() *slog.Logger {
	return slog.With("userId", c.UserUUID, "gameId", c.room.ID)
}

func (c *Client) closeSend() {
	if !c.closed {
		c.closed = true
		close(c.send)
	}
}

func (c *Client) sendError(err error) {
	c.logger().Warn("Sending error to client", "error", err)
	c.sendMu.Lock()
	defer c.sendMu.Unlock()
	if !c.closed {
		select {
		case c.send <- []byte(`{"type":"ERROR","payload":{"message":"` + err.Error() + `"}}`):
		default:
			c.closeSend()
		}
	}
}

func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(60 * time.Second))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				slog.Error("WebSocket read error", "userId", c.UserUUID, "error", err)
			} else {
				slog.Info("WebSocket closed", "userId", c.UserUUID, "error", err)
			}
			break
		}

		if len(message) == 0 {
			continue
		}

		var incomingMessage IncomingMessage
		if err := json.Unmarshal(message, &incomingMessage); err != nil {
			slog.Warn("Invalid message format", "userId", c.UserUUID, "error", err)
			c.sendError(err)
			continue
		}

		c.hub.handleIncomingMessage(c, incomingMessage)
	}
}

func (c *Client) WritePump() {
	ticker := time.NewTicker(50 * time.Second)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.sendMu.Lock()
			if !ok {
				c.sendMu.Unlock()
				return
			}
			c.sendMu.Unlock()

			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
				slog.Error("WebSocket write error", "userId", c.UserUUID, "error", err)
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(10 * time.Second))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				slog.Error("WebSocket ping error", "userId", c.UserUUID, "error", err)
				return
			}
		}
	}
}

// IncomingMessage represents a message received from the client.
type IncomingMessage struct {
	Type    string          `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

// ID returns the user UUID of the client.
func (c *Client) ID() string {
	return c.UserUUID
}
