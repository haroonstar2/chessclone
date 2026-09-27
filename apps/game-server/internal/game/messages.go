package game

import "encoding/json"

type MessageType string

const (
	TypeJoinGame    MessageType = "JOIN_GAME"
	TypeGameStarted MessageType = "GAME_STARTED"
	TypeMove        MessageType = "MOVE"
	TypeMoveMade    MessageType = "MOVE_MADE"
	TypeError       MessageType = "ERROR"
)

type IncomingMessage struct {
	Type    MessageType `json:"type"`
	Payload json.RawMessage `json:"payload"`
}

type JoinGamePayload struct {
	GameID string `json:"gameId"`
}

type MovePayload struct {
	GameID   string `json:"gameId"`
	From     string `json:"from"`
	To       string `json:"to"`
	PlayerID string `json:"playerId"`
	PromotedPiece string `json:"promotedPiece,omitempty"`
}

type OutgoingMessage struct {
	Type    MessageType `json:"type"`
	Payload any         `json:"payload"`
}