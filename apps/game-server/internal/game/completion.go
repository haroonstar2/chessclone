package game

import (
	"errors"
	"time"

	"github.com/corentings/chess/v2"
)

type CompletionPayload struct {
	GameID        string  `json:"gameId"`
	WhitePlayerID string  `json:"whitePlayerId"`
	BlackPlayerID string  `json:"blackPlayerId"`
	PGN           string  `json:"pgn"`
	Winner        *string `json:"winner"`
	Result        string  `json:"result"`
}

type CompletionEvent struct {
	Type      string            `json:"type"`
	Payload   CompletionPayload `json:"payload"`
	Timestamp time.Time         `json:"timestamp"`
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
