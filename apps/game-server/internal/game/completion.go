package game

import (
	"encoding/json"
	"errors"
	"log/slog"
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

type completionPublication struct {
	event       CompletionEvent
	fen         string
	whitePlayer Sender
	blackPlayer Sender
	onCompleted func(CompletionEvent)
}

// completeLocked snapshots the final result exactly once while the room is locked.
func (r *GameRoom) completeLocked() *completionPublication {
	if r.ended || r.Game == nil || r.Game.Outcome() == chess.NoOutcome {
		return nil
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

	return &completionPublication{
		event:       event,
		fen:         r.Game.Position().String(),
		whitePlayer: r.WhitePlayer,
		blackPlayer: r.BlackPlayer,
		onCompleted: r.onCompleted,
	}
}

func (r *GameRoom) publishCompletion(publication *completionPublication) {
	event := publication.event
	slog.Info("Game completed", "userId", event.Payload.WhitePlayerID, "blackUserId", event.Payload.BlackPlayerID, "gameId", event.Payload.GameID, "result", event.Payload.Result)

	if publication.onCompleted != nil {
		publication.onCompleted(event)
	}

	data, err := json.Marshal(OutgoingMessage{
		Type: "GAME_ENDED",
		Payload: map[string]string{
			"result": event.Payload.Result,
			"fen":    publication.fen,
		},
	})
	if err != nil {
		return
	}
	if publication.whitePlayer != nil {
		publication.whitePlayer.Send(data)
	}
	if publication.blackPlayer != nil {
		publication.blackPlayer.Send(data)
	}
}

func (r *GameRoom) participantLocked(client Sender) error {
	if r.ended {
		return errors.New("game has ended")
	}

	if client == nil {
		return errors.New("not a player in this game")
	}

	if r.WhitePlayer == nil || r.BlackPlayer == nil || r.WhiteID == "" || r.BlackID == "" {
		return errors.New("waiting for opponent")
	}

	if client != r.WhitePlayer && client != r.BlackPlayer {
		return errors.New("not a player in this game")
	}

	if r.Game == nil {
		return errors.New("game is not initialized")
	}

	return nil
}
