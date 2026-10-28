package ws

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gorilla/websocket"
	"github.com/redis/go-redis/v9"
)

type RedisClientMock struct {
	getDel func(context.Context, string) *redis.StringCmd
}

func (r *RedisClientMock) GetDel(ctx context.Context, key string) *redis.StringCmd {
	if r.getDel != nil {
		return r.getDel(ctx, key)
	}
	return redis.NewStringResult("", redis.Nil)
}

func TestNewHandler(t *testing.T) {

	// Create a new ClientHandler with nil Redis client and Hub
	handler := NewHandler(nil, nil)

	if handler == nil {
		t.Fatal("Expected handler to be created, got nil")
	}
}

func TestHandler_MissingTicket(t *testing.T) {
	// Create a new ClientHandler with a mock Redis client and Hub

	handler := NewHandler(&RedisClientMock{}, nil)

	// Create a new HTTP request without the ticket parameter
	req, err := http.NewRequest("GET", "/ws", nil)
	if err != nil {
		t.Fatalf("Failed to create request: %v", err)
	}

	// Create a ResponseRecorder to capture the response
	rr := httptest.NewRecorder()

	// Serve the HTTP request
	handler.ServeHTTP(rr, req)

	// Check the status code is what we expect.
	if status := rr.Code; status != http.StatusBadRequest {
		t.Errorf("handler returned wrong status code: got %v want %v",
			status, http.StatusBadRequest)
	}

	// Check the response body is what we expect.
	expected := "Missing ticket parameter\n"
	if rr.Body.String() != expected {
		t.Errorf("handler returned unexpected body: got %v want %v",
			rr.Body.String(), expected)
	}

}

func TestHandler_InvalidTicket_KeyNotFound(t *testing.T) {

	mockRedis := &RedisClientMock{
		getDel: func(ctx context.Context, key string) *redis.StringCmd {
			return redis.NewStringResult("", redis.Nil)
		},
	}

	// Hub is nil because code exits before using it
	handler := NewHandler(mockRedis, nil)

	req := httptest.NewRequest(http.MethodGet, "/ws?ticket=bad_ticket", nil)
	rr := httptest.NewRecorder()

	// Run the handler
	handler.ServeHTTP(rr, req)

	// Verify it was rejected with 401 Unauthorized
	if rr.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401 Unauthorized, got %d", rr.Code)
	}
}
func TestHandler_ValidTicket(t *testing.T) {
	// Initialize real Hub and run it in background
	hub := newTestHub()
	go hub.Run()

	// Mock Redis that returns a user UUID for "valid_ticket"
	mockRedis := &RedisClientMock{
		getDel: func(ctx context.Context, key string) *redis.StringCmd {
			return redis.NewStringResult("user-123", nil)
		},
	}

	handler := NewHandler(mockRedis, hub)

	server := httptest.NewServer(handler)
	defer server.Close()

	// Convert http:// to ws://
	wsURL := "ws" + strings.TrimPrefix(server.URL, "http") + "/ws?ticket=valid_ticket"

	// Query the WebSocket endpoint
	ws, resp, err := websocket.DefaultDialer.Dial(wsURL, nil)
	if err != nil {
		t.Fatalf("Failed to establish WebSocket connection: %v", err)
	}
	defer ws.Close()

	// Assert handshake status code was 101 Switching Protocols
	if resp.StatusCode != http.StatusSwitchingProtocols {
		t.Fatalf("Expected status 101 Switching Protocols, got %d", resp.StatusCode)
	}

	// Explicitly send close message and close connection
	err = ws.WriteMessage(websocket.CloseMessage, websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
	if err != nil {
		t.Logf("Error writing close message: %v", err)
	}
	ws.Close()

}

func TestHandler_ValidTicket_InvalidUpgrade(t *testing.T) {
	mockRedis := &RedisClientMock{
		getDel: func(ctx context.Context, key string) *redis.StringCmd {
			return redis.NewStringResult("user-123", nil)
		},
	}

	handler := NewHandler(mockRedis, nil)
	server := httptest.NewServer(handler)
	defer server.Close()

	// Issue a raw HTTP GET without proper WebSocket handshake headers
	resp, err := http.Get(server.URL + "/ws?ticket=valid_ticket")
	if err != nil {
		t.Fatalf("Failed to send request: %v", err)
	}
	defer resp.Body.Close()

	// Upgrader rejects missing/bad handshake with 400 Bad Request
	if resp.StatusCode != http.StatusBadRequest {
		t.Fatalf("expected status 400 Bad Request, got %d", resp.StatusCode)
	}
}

func TestSocketProtocolAndRefresh(t *testing.T) {
	hub := newTestHub()
	go hub.Run()
	server := httptest.NewServer(NewHandler(&RedisClientMock{getDel: func(ctx context.Context, key string) *redis.StringCmd { return redis.NewStringResult(key, nil) }}, hub))
	defer server.Close()
	connect := func(user, query string) *websocket.Conn {
		t.Helper()
		conn, _, err := websocket.DefaultDialer.Dial("ws"+strings.TrimPrefix(server.URL, "http")+"/ws?ticket="+user+query, nil)
		if err != nil {
			t.Fatal(err)
		}
		t.Cleanup(func() { conn.Close() })
		return conn
	}
	read := func(conn *websocket.Conn, kind string) map[string]any {
		t.Helper()
		conn.SetReadDeadline(time.Now().Add(time.Second))
		var msg struct {
			Type      string
			Payload   map[string]any
			Timestamp string
		}
		if err := conn.ReadJSON(&msg); err != nil {
			t.Fatal(err)
		}
		if msg.Type != kind || msg.Timestamp == "" {
			t.Fatalf("unexpected message: %+v", msg)
		}
		return msg.Payload
	}
	white := connect("white", "&gameId=live")
	initial := read(white, "GAME_STATE")["fen"]
	black := connect("black", "&gameId=live")
	read(black, "GAME_STATE")
	read(white, "GAME_STATE")
	black.WriteJSON(map[string]any{"type": "MOVE", "payload": map[string]string{"from": "e7", "to": "e5"}})
	if read(black, "ERROR")["fen"] != initial {
		t.Fatal("error missing authoritative FEN")
	}
	white.WriteJSON(map[string]any{"type": "MOVE", "payload": map[string]string{"from": "e2", "to": "e5"}})
	if read(white, "ERROR")["fen"] != initial {
		t.Fatal("invalid move changed board")
	}
	white.WriteJSON(map[string]any{"type": "MOVE", "payload": map[string]string{"from": "e2", "to": "e4"}, "timestamp": "2026-10-21T05:12:00Z"})
	fen := read(white, "MOVE")["fen"]
	read(black, "MOVE")
	black.Close()
	read(white, "OPPONENT_DISCONNECTED")
	replacement := connect("black", "")
	state := read(replacement, "GAME_STATE")
	if state["fen"] != fen || state["playerColor"] != "black" || state["ready"] != true {
		t.Fatalf("bad restore: %+v", state)
	}
	read(white, "GAME_STATE")
}
