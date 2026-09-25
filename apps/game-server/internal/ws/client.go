package ws

// WebSocket Client struct
// Reads and Writes messages to the WebSocket connection.

import (
	"log"
	"time"

	"github.com/gorilla/websocket"
)

const (
	writeWait      = 10 * time.Second
	pongWait       = 60 * time.Second
	pingPeriod     = (pongWait * 9) / 10
	maxMessageSize = 1024
)

type Client struct {
	hub      *Hub
	conn     *websocket.Conn
	send     chan []byte
	UserUUID string
}

// ReadPump listens for messages from this specific user's browser.
func (c *Client) ReadPump() {
	defer func() {
		c.hub.unregister <- c
		c.conn.Close()
	}()

	c.conn.SetReadLimit(maxMessageSize)
	// How long to wait for incoming messages before considering the connection dead.
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	// Set a handler for pong messages to reset the read deadline.
	c.conn.SetPongHandler(func(string) error {
		c.conn.SetReadDeadline(time.Now().Add(pongWait))
		return nil
	})

	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("WebSocket error: %v", err)
			}
			break
		}
		log.Printf("Message from %s: %s", c.UserUUID, message)

		// Broadcast message to the Hub
		c.hub.broadcast <- message
	}
}

// WritePump sends messages from the Hub back down the socket to the browser.
func (c *Client) WritePump() {
	// Ticker for sending periodic ping messages to keep the connection alive.
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		// Waits for either a message to send or a ping interval.
		select {
		case message, ok := <-c.send:
			// How long to wait for outgoing messages before unblocking the connection.
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			if err := w.Close(); err != nil {
				return
			}

		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}