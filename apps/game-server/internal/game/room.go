package game

import (
	"encoding/json"
	"errors"
	"fmt"
	"sync"

	"github.com/corentings/chess/v2"
)

type PlayerID string

func (p PlayerID) String() string {
	return string(p)
}

type Sender interface {
	ID() PlayerID
	Send(data []byte)
}

type GameRoom struct {
	ID            string
	WhitePlayer   Sender
	WhiteID       string
	BlackPlayer   Sender
	BlackID       string
	Game          *chess.Game
	mu            sync.Mutex
	ended         bool
	onCompleted   func(CompletionEvent)
	drawOfferedBy PlayerID
}

func NewGameRoom(id string) *GameRoom {
	return &GameRoom{
		ID:   id,
		Game: chess.NewGame(),
	}
}

// AddPlayer assigns the client as White (1st) or Black (2nd)
func (r *GameRoom) AddPlayer(client Sender) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.WhiteID == client.ID().String() {
		r.WhitePlayer = client
	} else if r.BlackID == client.ID().String() {
		r.BlackPlayer = client
	} else if r.WhiteID == "" {
		r.WhiteID = client.ID().String()
		r.WhitePlayer = client
	} else if r.BlackID == "" {
		r.BlackID = client.ID().String()
		r.BlackPlayer = client
	} else {
		return errors.New("game room is full")
	}
	for _, entry := range []struct {
		player Sender
		color  string
	}{{r.WhitePlayer, "white"}, {r.BlackPlayer, "black"}} {
		if entry.player == nil {
			continue
		}
		data, _ := json.Marshal(
			OutgoingMessage{
				Type: TypeGameState,
				Payload: map[string]interface{}{
					"playerColor": entry.color,
					"fen":         r.Game.Position().String(),
					"turn":        r.Game.Position().Turn().String(),
					"ready":       !r.ended && r.WhitePlayer != nil && r.BlackPlayer != nil,
					"moves":       r.movesLocked(),
				},
			})
		entry.player.Send(data)
	}
	return nil
}

// BroadcastLocked sends a message to both players in this room while holding the lock
func (r *GameRoom) BroadcastLocked(msg OutgoingMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	if r.WhitePlayer != nil {
		r.WhitePlayer.Send(data)
	}
	if r.BlackPlayer != nil {
		r.BlackPlayer.Send(data)
	}
}

// Authroize moves
func (r *GameRoom) HandleMove(client Sender, from, to, promo string) error {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.ended {
		return errors.New("game has ended")
	}

	// Verify both players are present and turn order
	if r.WhitePlayer == nil || r.BlackPlayer == nil {
		return errors.New("waiting for opponent")
	}

	turn := r.Game.Position().Turn()
	if (turn == chess.White && client != r.WhitePlayer) ||
		(turn == chess.Black && client != r.BlackPlayer) {
		return errors.New("not your turn")
	}

	uciMove := from + to + promo

	var validMove *chess.Move
	for _, m := range r.Game.ValidMoves() {
		if m.String() == uciMove {
			validMove = &m
			break
		}
	}

	if validMove == nil {
		return fmt.Errorf("illegal move: %s", uciMove)
	}

	// Apply the move to the server engine
	if err := r.Game.Move(validMove, nil); err != nil {
		return err
	}

	r.drawOfferedBy = ""

	// Broadcast updated position to both players
	r.BroadcastLocked(OutgoingMessage{
		Type: TypeMove,
		Payload: map[string]interface{}{
			"fen":       r.Game.Position().String(),
			"from":      from,
			"promotion": promo,
			"moves":     r.movesLocked(),
			"to":        to,
			"turn":      r.Game.Position().Turn().String(),
			"status":    r.Game.Outcome().String(),
		},
	})

	r.completeLocked()
	return nil
}

func (r *GameRoom) RemovePlayer(client Sender) bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.WhitePlayer == client {
		r.WhitePlayer = nil
	} else if r.BlackPlayer == client {
		r.BlackPlayer = nil
	} else {
		return false
	}
	r.BroadcastLocked(OutgoingMessage{
		Type: "OPPONENT_DISCONNECTED",
		Payload: map[string]string{
			"message": "Opponent disconnected",
			"fen":     r.Game.Position().String(),
		},
	},
	)
	return true
}

func (r *GameRoom) EndGame() {
	r.mu.Lock()
	defer r.mu.Unlock()
	if r.ended {
		return
	}
	r.ended = true
	r.BroadcastLocked(
		OutgoingMessage{
			Type: "GAME_ENDED",
			Payload: map[string]string{
				"result": "opponent_disconnected",
				"reason": "reconnect_timeout",
				"fen":    r.Game.Position().String(),
			},
		},
	)
}

func (r *GameRoom) IsEmpty() bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	return r.WhitePlayer == nil && r.BlackPlayer == nil
}

func (r *GameRoom) HasPlayer(id PlayerID) bool {
	r.mu.Lock()
	defer r.mu.Unlock()
	return r.WhiteID == id.String() || r.BlackID == id.String()
}
func (r *GameRoom) SendError(client Sender, err error) {
	r.mu.Lock()
	defer r.mu.Unlock()
	data, _ := json.Marshal(
		OutgoingMessage{
			Type: TypeError,
			Payload: map[string]string{
				"message": err.Error(),
				"fen":     r.Game.Position().String(),
				"turn":    r.Game.Position().Turn().String(),
			},
		},
	)
	client.Send(data)
}
func (r *GameRoom) movesLocked() []map[string]string {
	history := []map[string]string{}
	positions := r.Game.Positions()
	for i, move := range r.Game.Moves() {
		san := (chess.AlgebraicNotation{}).Encode(positions[i], move)
		if i%2 == 0 {
			history = append(history, map[string]string{"white": san})
		} else {
			history[len(history)-1]["black"] = san
		}
	}
	return history
}
