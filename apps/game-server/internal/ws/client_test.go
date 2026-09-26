package ws

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
)

// Helper to create a direct client-server websocket
func setupTestClient(t *testing.T) (*Client, *websocket.Conn, func()) {
	t.Helper()

	// Channel to prevent race conditions when upgrading the connection
	connChan := make(chan *websocket.Conn, 1)

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	// Upgrade handler
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// var err error
		conn, err := upgrader.Upgrade(w, r, nil)
		if err != nil {
			t.Fatalf("Failed upgrade to websocket: %v", err)
		}
		connChan <- conn
	}))

	// Dial the test server
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http")
	clientConn, _, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to dial: %v", err)
	}

	var serverConn *websocket.Conn
	select {
	case serverConn = <-connChan:
	case <-time.After(1 * time.Second):
		t.Fatal("Timeout waiting for server connection")
	}

	// Create the Client struct under test
	hub := NewHub()
	client := &Client{
		hub:      hub,
		conn:     serverConn,
		send:     make(chan []byte, 256),
		UserUUID: "test-user",
	}

	cleanup := func() {
		clientConn.Close()
		if serverConn != nil {
			serverConn.Close()
		}
		server.Close()
	}

	return client, clientConn, cleanup
}

func TestClientWritePump(t *testing.T) {
	client, clientConn, cleanup := setupTestClient(t)
	defer cleanup()

	// Start the WritePump in a separate goroutine
	go client.WritePump()

	// Send a test message to the client
	testMessage := []byte("Hello, WebSocket!")
	client.send <- testMessage

	// Read the message from the client connection
	clientConn.SetReadDeadline(time.Now().Add(1 * time.Second))
	_, receivedMessage, err := clientConn.ReadMessage()
	if err != nil {
		t.Fatalf("Failed to read message: %v", err)
	}

	if string(receivedMessage) != string(testMessage) {
		t.Errorf("Expected message %s, but got %s", testMessage, receivedMessage)
	}
}

func TestClientReadPump(t *testing.T) {
	client, clientConn, cleanup := setupTestClient(t)
	defer cleanup()

	// Start the ReadPump in a separate goroutine
	go client.ReadPump()

	// Send a test message from the client connection
	testMessage := []byte("Hello from client!")
	err := clientConn.WriteMessage(websocket.TextMessage, testMessage)
	if err != nil {
		t.Fatalf("Failed to write message: %v", err)
	}

	// Allow some time for the ReadPump to process the message
	time.Sleep(100 * time.Millisecond)

	// Check if the message was broadcasted to the hub
	select {
	case msg := <-client.hub.broadcast:
		if string(msg) != string(testMessage) {
			t.Errorf("Expected broadcast message %s, but got %s", testMessage, msg)
		}
	case <-time.After(1 * time.Second):
		t.Error("Timeout waiting for broadcast message")
	}
}

func TestClientReadPumpClose(t *testing.T) {
	client, clientConn, cleanup := setupTestClient(t)
	defer cleanup()

	// Start the ReadPump in a separate goroutine
	go client.ReadPump()

	// Close the client connection to simulate a disconnect
	clientConn.Close()

	// Allow some time for the ReadPump to handle the close
	time.Sleep(100 * time.Millisecond)

	// Check if the client was unregistered from the hub
	if _, ok := client.hub.clients[client]; ok {
		t.Error("Client was not unregistered from the hub after connection close")
	}
}

func TestClientWritePumpClose(t *testing.T) {
	client, clientConn, cleanup := setupTestClient(t)
	defer cleanup()

	// Start the WritePump in a separate goroutine
	go client.WritePump()

	// Close the send channel to simulate a shutdown
	close(client.send)

	// Allow some time for the WritePump to handle the close
	time.Sleep(100 * time.Millisecond)

	// Check if the client connection was closed
	if _, _, err := clientConn.ReadMessage(); err == nil {
		t.Error("Expected error reading from closed connection, but got none")
	}
}

func TestClientReadPumpUnexpectedClose(t *testing.T) {
	client, clientConn, cleanup := setupTestClient(t)
	defer cleanup()

	// Start the ReadPump in a separate goroutine
	go client.ReadPump()

	// Simulate an unexpected close by sending a close message
	err := clientConn.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseAbnormalClosure, ""))
	if err != nil {
		t.Fatalf("Failed to write close message: %v", err)
	}

	// Allow some time for the ReadPump to handle the unexpected close
	time.Sleep(100 * time.Millisecond)

	// Check if the client was unregistered from the hub
	if _, ok := client.hub.clients[client]; ok {
		t.Error("Client was not unregistered from the hub after unexpected connection close")
	}
}