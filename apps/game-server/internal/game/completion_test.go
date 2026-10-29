package game

import (
	"strings"
	"testing"

	"github.com/corentings/chess/v2"
)

func TestCompletion(t *testing.T) {
	for _, kind := range []string{"checkmate", "resignation", "draw"} {
		t.Run(kind, func(t *testing.T) {
			var events []CompletionEvent
			r := NewGameRoom("match")
			r.onCompleted = func(event CompletionEvent) { events = append(events, event) }
			w := &MockPlayer{id: "white"}
			b := &MockPlayer{id: "black"}
			_ = r.AddPlayer(w)
			_ = r.AddPlayer(b)

			switch kind {
			case "checkmate":
				for i, m := range [][2]string{{"f2", "f3"}, {"e7", "e5"}, {"g2", "g4"}, {"d8", "h4"}} {
					p := w
					if i%2 == 1 {
						p = b
					}
					if err := r.HandleMove(p, m[0], m[1], ""); err != nil {
						t.Fatal(err)
					}
				}
			case "resignation":
				if err := r.Resign(w); err != nil {
					t.Fatal(err)
				}
			case "draw":
				if err := r.OfferDraw(w); err != nil {
					t.Fatal(err)
				}
				if err := r.AcceptDraw(w); err == nil {
					t.Fatal("accepted own offer")
				}
				if err := r.AcceptDraw(b); err != nil {
					t.Fatal(err)
				}
			}

			if len(events) != 1 {
				t.Fatalf("got %d completions", len(events))
			}

			e := events[0]
			if e.Type != "GAME_COMPLETED" || e.Payload.GameID != "match" || e.Payload.WhitePlayerID != "white" || e.Payload.BlackPlayerID != "black" {
				t.Fatalf("bad event %+v", e)
			}

			result := "0-1"
			if kind == "draw" {
				result = "1/2-1/2"
				if e.Payload.Winner != nil {
					t.Fatal("draw has winner")
				}
			} else if e.Payload.Winner == nil || *e.Payload.Winner != "black" {
				t.Fatal("wrong winner")
			}

			if e.Payload.Result != result || !strings.Contains(e.Payload.PGN, result) {
				t.Fatalf("bad result %+v", e)
			}

			if _, err := chess.PGN(strings.NewReader(e.Payload.PGN)); err != nil {
				t.Fatal(err)
			}

			_ = r.Resign(b)
			if len(events) != 1 {
				t.Fatal("duplicate completion")
			}
		})
	}
}

func TestAutomaticDrawCompletion(t *testing.T) {
	var event CompletionEvent
	manager := NewManager(func(e CompletionEvent) { event = e })
	w := &MockPlayer{id: "white"}
	b := &MockPlayer{id: "black"}
	room, _ := manager.JoinRoom("draw", w)
	_, _ = manager.JoinRoom("draw", b)

	position, err := chess.FEN("7k/5K2/8/6Q1/8/8/8/8 w - - 0 1")
	if err != nil {
		t.Fatal(err)
	}

	room.Game = chess.NewGame(position)
	if err := room.HandleMove(w, "g5", "g6", ""); err != nil {
		t.Fatal(err)
	}

	if event.Payload.Result != "1/2-1/2" || event.Payload.Winner != nil {
		t.Fatalf("missing automatic draw: %+v", event)
	}
}
