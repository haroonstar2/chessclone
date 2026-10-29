package redis

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/haroonstar2/chessclone/apps/game-server/internal/game"
	"github.com/redis/go-redis/v9"
)

const CompletionChannel = "game:completed"
const PendingCompletions = "games:completed:pending"

// Persist the event before notifying subscribers. The API deletes it only after PostgreSQL commits
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

				log.Printf("Failed to publish completion for %s; retrying: %v", event.Payload.GameID, err)
				time.Sleep(5 * time.Second)
			}
		}()
	}
}
