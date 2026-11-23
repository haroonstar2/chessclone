package redis

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/haroonstar2/chessclone/apps/game-server/internal/game"
	"github.com/redis/go-redis/v9"
)

const CompletionChannel = "game:completed"
const PendingCompletions = "games:completed:pending"

// PublishCompletion persists the game completion event to Redis and publishes it to the completion channel
func PublishCompletion(ctx context.Context, client *redis.Client, event game.CompletionEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}

	_, err = client.TxPipelined(ctx, func(pipe redis.Pipeliner) error {
		pipe.HSet(ctx, PendingCompletions, event.Payload.GameID, string(data))
		pipe.Publish(ctx, CompletionChannel, string(data))
		return nil
	})

	return err
}

// CompletionHandler returns a function that handles game completion events by publishing them to Redis with retry logic
func CompletionHandler(client *redis.Client) func(game.CompletionEvent) {
	return func(event game.CompletionEvent) {
		go func() {
			for {
				ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
				err := PublishCompletion(ctx, client, event)
				cancel()

				if err == nil {
					return
				}

				slog.Error("Completion publish failed; retrying", "gameId", event.Payload.GameID, "userId", event.Payload.WhitePlayerID, "blackUserId", event.Payload.BlackPlayerID, "error", err)
				time.Sleep(5 * time.Second)
			}
		}()
	}
}
