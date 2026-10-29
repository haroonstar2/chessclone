package redis

import (
	"context"
	"encoding/json"
	"errors"
	"testing"

	"github.com/haroonstar2/chessclone/apps/game-server/internal/game"
	"github.com/redis/go-redis/v9"
)

type completionHook struct {
	commands []redis.Cmder
	err      error
}

func (h *completionHook) DialHook(next redis.DialHook) redis.DialHook {
	return next
}

func (h *completionHook) ProcessHook(next redis.ProcessHook) redis.ProcessHook {
	return next
}

func (h *completionHook) ProcessPipelineHook(next redis.ProcessPipelineHook) redis.ProcessPipelineHook {
	return func(ctx context.Context, cmds []redis.Cmder) error {
		h.commands = cmds
		return h.err
	}
}

func TestPublishCompletion(t *testing.T) {
	client := redis.NewClient(&redis.Options{})
	defer client.Close()

	hook := &completionHook{}
	client.AddHook(hook)

	event := game.CompletionEvent{
		Type: "GAME_COMPLETED",
		Payload: game.CompletionPayload{
			GameID: "match",
			PGN:    "1/2-1/2",
			Result: "1/2-1/2",
		},
	}
	if err := PublishCompletion(context.Background(), client, event); err != nil {
		t.Fatal(err)
	}

	if len(hook.commands) != 4 {
		t.Fatalf("expected MULTI,HSET,PUBLISH,EXEC: %v", hook.commands)
	}

	if hook.commands[0].Name() != "multi" || hook.commands[1].Name() != "hset" || hook.commands[2].Name() != "publish" || hook.commands[3].Name() != "exec" {
		t.Fatal("incorrect transaction")
	}

	store := hook.commands[1].Args()
	pub := hook.commands[2].Args()
	if store[1] != PendingCompletions || store[2] != "match" || pub[1] != CompletionChannel || store[3] != pub[2] {
		t.Fatal("inconsistent event")
	}

	var decoded game.CompletionEvent
	if err := json.Unmarshal([]byte(pub[2].(string)), &decoded); err != nil || decoded.Type != "GAME_COMPLETED" {
		t.Fatal("invalid event")
	}
	hook.err = errors.New("Redis unavailable")
	if PublishCompletion(context.Background(), client, event) == nil {
		t.Fatal("failure swallowed")
	}
}
