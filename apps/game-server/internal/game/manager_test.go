package game

import (
	"testing"
	"time"
)

func TestManager(t *testing.T) {
	gm := NewManager()
	if gm == nil {
		t.Fatal("Failed to create GameManager")
	}
}

func TestManager_CreateAndGetRoom(t *testing.T) {
	gm := NewManager()
	roomID := "test-room"

	retirievedRoom, err := gm.GetRoom(roomID)
	if err == nil || retirievedRoom != nil {
		t.Fatal("Expected error when getting non-existent room, but got none")
	}

	// Create a new room
	room := gm.CreateRoom(roomID)
	if room == nil {
		t.Fatal("Failed to create GameRoom")
	}

	// Retrieve the same room
	retrievedRoom, err := gm.GetRoom(roomID)
	if err != nil {
		t.Fatalf("Failed to get GameRoom: %v", err)
	}

	if retrievedRoom != room {
		t.Fatal("Retrieved room does not match created room")
	}
}

func TestManager_RemoveRoom(t *testing.T) {
	gm := NewManager()
	roomID := "test-room"

	// Create a new room
	gm.CreateRoom(roomID)

	// Remove the room
	gm.RemoveRoom(roomID)

	// Try to retrieve the removed room
	retrievedRoom, err := gm.GetRoom(roomID)
	if err == nil || retrievedRoom != nil {
		t.Fatal("Expected error when getting removed room, but got none")
	}
}

func TestManager_JoinRoom(t *testing.T) {
	gm := NewManager()
	roomID := "test-room"
	player := &MockPlayer{id: "player1"}

	// Join a new room (should create the room)
	room, err := gm.JoinRoom(roomID, player)
	if err != nil {
		t.Fatalf("Failed to join room: %v", err)
	}

	if room == nil {
		t.Fatal("Expected a GameRoom to be returned, got nil")
	}

	// Verify the player was added to the room
	if room.WhitePlayer != player && room.BlackPlayer != player {
		t.Fatal("Player was not added to the room")
	}

	// Join the same room with another player
	player2 := &MockPlayer{id: "player2"}
	room2, err := gm.JoinRoom(roomID, player2)
	if err != nil {
		t.Fatalf("Failed to join existing room: %v", err)
	}

	if room2 != room {
		t.Fatal("Expected to join the same room, but got a different one")
	}

	// Verify the second player was added to the room
	if room.WhitePlayer != player && room.BlackPlayer != player2 {
		t.Fatal("Second player was not added to the room")
	}
}

func TestReconnectGracePeriod(t *testing.T) {
	{
		m := NewManager()
		m.gracePeriod = 50 * time.Millisecond
		w := &MockPlayer{id: "w"}
		b := &MockPlayer{id: "b"}
		r, _ := m.JoinRoom("timer", w)
		_, _ = m.JoinRoom("timer", b)
		m.RemovePlayer(b)
		time.Sleep(10 * time.Millisecond)
		replacement := &MockPlayer{id: "b"}
		if _, err := m.JoinRoom("timer", replacement); err != nil {
			t.Fatal(err)
		}
		time.Sleep(60 * time.Millisecond)
		if _, err := m.GetRoom("timer"); err != nil {
			t.Fatal("reconnect failed to cancel expiry")
		}
		m.RemovePlayer(replacement)
		time.Sleep(100 * time.Millisecond)
		if _, err := m.GetRoom("timer"); err == nil {
			t.Fatal("game did not expire")
		}
		if r.HandleMove(w, "e2", "e4", "") == nil {
			t.Fatal("expired game accepted move")
		}
	}
}

func TestStaleConnectionCannotDisconnectReplacement(t *testing.T) {
	m := NewManager()
	old := &MockPlayer{id: "w"}
	b := &MockPlayer{id: "b"}
	r, _ := m.JoinRoom("refresh", old)
	_, _ = m.JoinRoom("refresh", b)
	replacement := &MockPlayer{id: "w"}
	_, _ = m.JoinRoom("refresh", replacement)
	m.RemovePlayer(old)
	if r.WhitePlayer != replacement {
		t.Fatal("stale disconnect removed replacement")
	}
	if r.HandleMove(old, "e2", "e4", "") == nil {
		t.Fatal("stale connection accepted")
	}
	if err := r.HandleMove(replacement, "e2", "e4", ""); err != nil {
		t.Fatal(err)
	}
}
