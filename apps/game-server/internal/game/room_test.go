package game

import (
	"testing"
)

type MockPlayer struct {
	id       PlayerID
	messages [][]byte
}

func (m *MockPlayer) ID() PlayerID {
	return m.id
}

func (m *MockPlayer) Send(data []byte) {
	m.messages = append(m.messages, data)
}

func TestGameRoom_TurnEnforcement(t *testing.T) {
	room := NewGameRoom("test-room")
	white := &MockPlayer{id: "user-white"}
	black := &MockPlayer{id: "user-black"}

	if err := room.AddPlayer(white); err != nil {
		t.Fatalf("failed to add white: %v", err)
	}
	if err := room.AddPlayer(black); err != nil {
		t.Fatalf("failed to add black: %v", err)
	}

	// Black attempts to move first -> expect failure
	err := room.HandleMove(black, "e7", "e5", "")
	if err == nil || err.Error() != "not your turn" {
		t.Fatalf("expected 'not your turn' error, got: %v", err)
	}

	// White moves 1. e4 -> expect success
	if err := room.HandleMove(white, "e2", "e4", ""); err != nil {
		t.Fatalf("expected valid move, got: %v", err)
	}

	// White attempts to move again -> expect failure
	err = room.HandleMove(white, "e4", "e5", "")
	if err == nil || err.Error() != "not your turn" {
		t.Fatalf("expected 'not your turn' error, got: %v", err)
	}

	// Black moves 1... e5 -> expect success
	if err := room.HandleMove(black, "e7", "e5", ""); err != nil {
		t.Fatalf("expected valid move, got: %v", err)
	}
}

func TestGameRoom_Capacity(t *testing.T) {
	room := NewGameRoom("test-room")
	p1 := &MockPlayer{id: "p1"}
	p2 := &MockPlayer{id: "p2"}
	p3 := &MockPlayer{id: "p3"}

	_ = room.AddPlayer(p1)
	_ = room.AddPlayer(p2)

	err := room.AddPlayer(p3)
	if err == nil {
		t.Fatal("expected error adding third player to room, got nil")
	}
}