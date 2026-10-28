package game

import (
	"encoding/json"
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
func TestAssignedColors(t *testing.T) {
	r := NewGameRoom("colors")
	for _, color := range []string{"white", "black"} {
		p := &MockPlayer{id: PlayerID(color)}
		_ = r.AddPlayer(p)
		if len(p.messages) == 0 {
			t.Fatalf("no state for %s", color)
		}
		var msg struct {
			Payload struct {
				PlayerColor string
				Fen         string
			}
		}
		_ = json.Unmarshal(p.messages[len(p.messages)-1], &msg)
		if msg.Payload.PlayerColor != color || msg.Payload.Fen == "" {
			t.Fatalf("incorrect state: %+v", msg)
		}
	}
}
func TestDisconnect(t *testing.T) {
	r := NewGameRoom("disconnect")
	w := &MockPlayer{id: "white"}
	b := &MockPlayer{id: "black"}
	_ = r.AddPlayer(w)
	_ = r.AddPlayer(b)
	r.RemovePlayer(b)
	if len(w.messages) == 0 {
		t.Fatal("no notification")
	}
	var msg struct{ Type string }
	_ = json.Unmarshal(w.messages[len(w.messages)-1], &msg)
	if msg.Type != "OPPONENT_DISCONNECTED" {
		t.Fatalf("unexpected message: %s", msg.Type)
	}
	if r.HandleMove(w, "e2", "e4", "") == nil {
		t.Fatal("move accepted")
	}
}

func TestReconnectPreservesSeatAndPosition(t *testing.T) {
	m := NewManager()
	w := &MockPlayer{id: "w"}
	b := &MockPlayer{id: "b"}
	r, _ := m.JoinRoom("resume", w)
	_, _ = m.JoinRoom("resume", b)
	if err := r.HandleMove(w, "e2", "e4", ""); err != nil {
		t.Fatal(err)
	}
	fen := r.Game.Position().String()
	m.RemovePlayer(w)
	m.RemovePlayer(b)
	if _, err := m.GetRoom("resume"); err != nil {
		t.Fatal("game removed during grace period")
	}
	if _, err := m.JoinRoom("resume", &MockPlayer{id: "intruder"}); err == nil {
		t.Fatal("reserved seat stolen")
	}
	replacement := &MockPlayer{id: "b"}
	restored, err := m.JoinRoom("resume", replacement)
	if err != nil {
		t.Fatal(err)
	}
	if restored.BlackPlayer != replacement || restored.Game.Position().String() != fen {
		t.Fatal("state not restored")
	}
	var msg struct {
		Type    string
		Payload struct{ Fen, PlayerColor string }
	}
	_ = json.Unmarshal(replacement.messages[0], &msg)
	if msg.Type != "GAME_STATE" || msg.Payload.Fen != fen || msg.Payload.PlayerColor != "black" {
		t.Fatalf("bad sync: %+v", msg)
	}
}

func TestApprovedMoveProtocol(t *testing.T) {
	r := NewGameRoom("protocol")
	w := &MockPlayer{id: "w"}
	b := &MockPlayer{id: "b"}
	_ = r.AddPlayer(w)
	_ = r.AddPlayer(b)
	_ = r.HandleMove(w, "e2", "e4", "")
	var msg struct {
		Type, Timestamp string
		Payload         struct{ Fen, From, To string }
	}
	_ = json.Unmarshal(b.messages[len(b.messages)-1], &msg)
	if msg.Type != "MOVE" || msg.Timestamp == "" || msg.Payload.From != "e2" || msg.Payload.Fen != r.Game.Position().String() {
		t.Fatalf("bad move: %+v", msg)
	}
}
