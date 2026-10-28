package ws

import (
	"encoding/json"
	"github.com/corentings/chess/v2"
	"strings"
	"testing"
	"time"

	"github.com/haroonstar2/chessclone/apps/game-server/internal/game"
)

func newTestHub() *Hub {
	return NewHub(game.NewManager())
}

func TestClientRegistration(t *testing.T) {
	// Create a new Hub
	hub := newTestHub()
	go hub.Run()

	client := &Client{
		hub:      hub,
		conn:     nil, // No actual WebSocket connection needed for this test
		send:     make(chan []byte, 256),
		UserUUID: "test-user-uuid",
	}

	// Register the client with the Hub
	hub.register <- client

	// Allow some time for the hub to process the registration
	time.Sleep(100 * time.Millisecond)

	// Check if the client is registered
	if !hub.HasClient(client) {
		t.Errorf("Client was not registered in the Hub")
	}

	// Unregister the client
	hub.unregister <- client

	// Allow some time for the hub to process the unregistration
	time.Sleep(100 * time.Millisecond)

	// Check if the client is unregistered
	if hub.HasClient(client) {
		t.Errorf("Client was not unregistered from the Hub")
	}
}

func TestUnregisterRemovesPlayerFromRoom(t *testing.T) {
	hub := newTestHub()
	go hub.Run()
	white := &Client{UserUUID: "white", send: make(chan []byte, 10)}
	black := &Client{UserUUID: "black", send: make(chan []byte, 10)}
	hub.register <- white
	hub.register <- black
	room, _ := hub.gameManager.JoinRoom("disconnect", white)
	_, _ = hub.gameManager.JoinRoom("disconnect", black)
	<-white.send
	<-white.send
	hub.unregister <- black
	select {
	case msg := <-white.send:
		if !strings.Contains(string(msg), "OPPONENT_DISCONNECTED") {
			t.Fatalf("unexpected message: %s", msg)
		}
	case <-time.After(time.Second):
		t.Fatal("opponent not notified")
	}
	if room.HandleMove(white, "e2", "e4", "") == nil {
		t.Fatal("disconnected player retained")
	}
	black.closeSend()
	black.Send([]byte("late message")) // Must not panic after disconnect.
}

func TestPromotionPayload(t *testing.T) {
	hub := newTestHub()
	white := &Client{UserUUID: "white", send: make(chan []byte, 10)}
	black := &Client{UserUUID: "black", send: make(chan []byte, 10)}
	room, _ := hub.gameManager.JoinRoom("promotion", white)
	_, _ = hub.gameManager.JoinRoom("promotion", black)
	white.room = room
	position, err := chess.FEN("7k/P7/8/8/8/8/8/7K w - - 0 1")
	if err != nil {
		t.Fatal(err)
	}
	room.Game = chess.NewGame(position)
	<-white.send
	<-white.send
	hub.handleIncomingMessage(white, IncomingMessage{Type: "MOVE", Payload: json.RawMessage(`{"from":"a7","to":"a8","promotion":"q"}`)})
	var msg struct {
		Type    string
		Payload struct{ Promotion string }
	}
	_ = json.Unmarshal(<-white.send, &msg)
	if msg.Type != "MOVE" || msg.Payload.Promotion != "q" {
		t.Fatalf("promotion rejected: %+v", msg)
	}
}
