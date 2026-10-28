package game

import (
	"encoding/json"
	"time"
)

type MessageType string

const (
	TypeJoinGame    MessageType = "JOIN_GAME"
	TypeGameStarted MessageType = "GAME_STARTED"
	TypeMove        MessageType = "MOVE"
	TypeGameState   MessageType = "GAME_STATE"
	TypeError       MessageType = "ERROR"
)

type IncomingMessage struct {
	Type    MessageType     `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type JoinGamePayload struct {
	GameID string `json:"gameId"`
}

type MovePayload struct {
	GameID    string `json:"gameId"`
	From      string `json:"from"`
	To        string `json:"to"`
	Promotion string `json:"promotion,omitempty"`
}

type OutgoingMessage struct {
	Type      MessageType `json:"type"`
	Payload   any         `json:"payload"`
	Timestamp time.Time   `json:"timestamp"`
}

func (m OutgoingMessage) MarshalJSON() ([]byte, error) {
	type message OutgoingMessage
	if m.Timestamp.IsZero() {
		m.Timestamp = time.Now().UTC()
	}
	return json.Marshal(message(m))
}
