package observability

import (
	"context"
	"fmt"
	"io"
	"log/slog"
	"net/http"
)

func NewLogger(output io.Writer) *slog.Logger {
	handler := slog.NewJSONHandler(output, &slog.HandlerOptions{
		ReplaceAttr: func(groups []string, attr slog.Attr) slog.Attr {
			if attr.Key == slog.TimeKey {
				attr.Key = "timestamp"
			}
			return attr
		},
	})

	return slog.New(&traceHandler{Handler: handler})
}

// Counters remain cumulative; Prometheus computes moves/second with rate().
func MetricsHandler(connections func() int, games func() int, moves func() uint64) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4; charset=utf-8")

		fmt.Fprintf(w,
			"# HELP chess_websocket_connections Active WebSocket connections.\n"+
				"# TYPE chess_websocket_connections gauge\n"+
				"chess_websocket_connections %d\n",
			connections(),
		)

		fmt.Fprintf(w,
			"# HELP chess_active_games Unfinished games including reconnect grace periods.\n"+
				"# TYPE chess_active_games gauge\n"+
				"chess_active_games %d\n",
			games(),
		)

		fmt.Fprintf(w,
			"# HELP chess_moves_processed_total Move requests processed including rejected requests.\n"+
				"# TYPE chess_moves_processed_total counter\n"+
				"chess_moves_processed_total %d\n",
			moves(),
		)
	})
}

// Fill absent identity fields without duplicating explicit context attributes.
type traceHandler struct {
	slog.Handler
	hasUser bool
	hasGame bool
}

func (h *traceHandler) Handle(ctx context.Context, record slog.Record) error {
	hasUser, hasGame := h.hasUser, h.hasGame

	// Check if the record already contains userId and gameId attributes.
	record.Attrs(func(attr slog.Attr) bool {
		hasUser = hasUser || attr.Key == "userId"
		hasGame = hasGame || attr.Key == "gameId"
		return true
	})

	if !hasUser {
		record.AddAttrs(slog.String("userId", ""))
	}
	if !hasGame {
		record.AddAttrs(slog.String("gameId", ""))
	}

	return h.Handler.Handle(ctx, record)
}

func (h *traceHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	next := *h
	next.Handler = h.Handler.WithAttrs(attrs)
	for _, attr := range attrs {
		next.hasUser = next.hasUser || attr.Key == "userId"
		next.hasGame = next.hasGame || attr.Key == "gameId"
	}

	return &next
}
