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
    ID          string
    WhitePlayer Sender
    WhiteID     string
    BlackPlayer Sender
    BlackID     string
    Game        *chess.Game
    mu          sync.Mutex
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

	if r.WhitePlayer == nil {
		r.WhitePlayer = client
		return nil
	} else if r.BlackPlayer == nil {
		r.BlackPlayer = client
		return nil
	}

	return errors.New("game room is full")
}

// Broadcast sends a message to both players in this room
func (r *GameRoom) Broadcast(msg OutgoingMessage) {
	data, err := json.Marshal(msg)
	if err != nil {
		return
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	if r.WhitePlayer != nil {
		r.WhitePlayer.Send(data)
	}
	if r.BlackPlayer != nil {
		r.BlackPlayer.Send(data)
	}
}

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

	// Verify both players are present and turn order
	if r.WhitePlayer == nil || r.BlackPlayer == nil {
		return errors.New("waiting for opponent")
	}

	turn := r.Game.Position().Turn()
	if (turn == chess.White && client.ID() != r.WhitePlayer.ID()) ||
		(turn == chess.Black && client.ID() != r.BlackPlayer.ID()) {
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

	// Broadcast updated position to both players
	r.BroadcastLocked(OutgoingMessage{
		Type: TypeMoveMade,
		Payload: map[string]interface{}{
			"fen":    r.Game.Position().String(),
			"from":   from,
			"to":     to,
			"turn":   r.Game.Position().Turn().String(),
			"status": r.Game.Outcome().String(),
		},
	})

	return nil
}

func (r *GameRoom) RemovePlayer(client Sender) {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.WhitePlayer == client {
		r.WhitePlayer = nil
	} else if r.BlackPlayer == client {
		r.BlackPlayer = nil
	}
}

func (r *GameRoom) EndGame() {
	r.mu.Lock()
	defer r.mu.Unlock()

	if r.WhitePlayer != nil {
		r.WhitePlayer.Send([]byte(`{"type":"GAME_ENDED","payload":{"reason":"opponent_left"}}`))
	}
	if r.BlackPlayer != nil {
		r.BlackPlayer.Send([]byte(`{"type":"GAME_ENDED","payload":{"reason":"opponent_left"}}`))
	}
}

func (r *GameRoom) IsEmpty() bool {
	r.mu.Lock()
	defer r.mu.Unlock()

	return r.WhitePlayer == nil && r.BlackPlayer == nil
}
