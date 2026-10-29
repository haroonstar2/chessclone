package observability

import (
	"bytes"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestJSONLogging(t *testing.T) {
	var output bytes.Buffer
	logger := NewLogger(&output)
	logger.With("userId", "user-1", "gameId", "game-1").Info("Move accepted")

	var record map[string]any
	if err := json.Unmarshal(output.Bytes(), &record); err != nil {
		t.Fatal(err)
	}
	if record["userId"] != "user-1" || record["gameId"] != "game-1" || record["timestamp"] == nil {
		t.Fatalf("Missing trace fields: %v", record)
	}
	if strings.Count(output.String(), `"userId"`) != 1 {
		t.Fatal("Duplicate identity field")
	}
}

func TestMetrics(t *testing.T) {
	handler := MetricsHandler(func() int { return 2 }, func() int { return 1 }, func() uint64 { return 42 })
	response := httptest.NewRecorder()
	handler.ServeHTTP(response, httptest.NewRequest("GET", "/metrics", nil))

	for _, expected := range []string{"chess_websocket_connections 2", "chess_active_games 1", "chess_moves_processed_total 42"} {
		if !strings.Contains(response.Body.String(), expected) {
			t.Fatalf("Missing metric %s", expected)
		}
	}
	if !strings.Contains(response.Header().Get("Content-Type"), "version=0.0.4") {
		t.Fatal("Incorrect metrics content type")
	}
}
