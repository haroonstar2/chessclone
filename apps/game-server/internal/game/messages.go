package game

import (
	"encoding/json"
	"errors"
	"time"

	"github.com/corentings/chess/v2"
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

type ResignPayload struct {
	GameID string `json:"gameId"`
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

// completeLocked snapshots the final result exactly once while the room is locked.
func (r *GameRoom) completeLocked() {
	if r.ended || r.Game.Outcome() == chess.NoOutcome {
		return
	}

	r.ended = true

	var winner *string
	if r.Game.Outcome() == chess.WhiteWon {
		id := r.WhiteID
		winner = &id
	}

	if r.Game.Outcome() == chess.BlackWon {
		id := r.BlackID
		winner = &id
	}

	r.Game.AddTagPair("White", r.WhiteID)
	r.Game.AddTagPair("Black", r.BlackID)
	r.Game.AddTagPair("Result", r.Game.Outcome().String())

	event := CompletionEvent{
		Type:      "GAME_COMPLETED",
		Timestamp: time.Now().UTC(),
		Payload: CompletionPayload{
			GameID:        r.ID,
			WhitePlayerID: r.WhiteID,
			BlackPlayerID: r.BlackID,
			PGN:           r.Game.String(),
			Winner:        winner,
			Result:        r.Game.Outcome().String(),
		},
	}

	if r.onCompleted != nil {
		r.onCompleted(event)
	}

	r.BroadcastLocked(OutgoingMessage{
		Type: "GAME_ENDED",
		Payload: map[string]string{
			"result": event.Payload.Result,
			"fen":    r.Game.Position().String(),
		},
	})
}

func (r *GameRoom) participantLocked(client Sender) error {
	if r.ended {
		return errors.New("game has ended")
	}

	if client != r.WhitePlayer && client != r.BlackPlayer {
		return errors.New("not a player in this game")
	}

	if r.WhiteID == "" || r.BlackID == "" {
		return errors.New("waiting for opponent")
	}

	return nil
}

func (r *GameRoom) Resign(client Sender) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if err := r.participantLocked(client); err != nil {
		return err
	}

	color := chess.Black
	if client == r.WhitePlayer {
		color = chess.White
	}

	r.Game.Resign(color)
	r.completeLocked()

	return nil
}

func (r *GameRoom) OfferDraw(client Sender) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if err := r.participantLocked(client); err != nil {
		return err
	}

	r.drawOfferedBy = client.ID()

	r.BroadcastLocked(OutgoingMessage{
		Type: "DRAW_OFFERED",
		Payload: map[string]string{
			"playerId": client.ID().String(),
		},
	})

	return nil
}

func (r *GameRoom) AcceptDraw(client Sender) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if err := r.participantLocked(client); err != nil {
		return err
	}

	if r.drawOfferedBy == "" || r.drawOfferedBy == client.ID() {
		return errors.New("no opponent draw offer")
	}

	if err := r.Game.Draw(chess.DrawOffer); err != nil {
		return err
	}
	r.completeLocked()

	return nil
}
