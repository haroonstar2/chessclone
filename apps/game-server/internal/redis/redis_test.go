package redis

import (
	"context"
	"testing"

	"github.com/redis/go-redis/v9"
)

func TestCreateRedisClient(t *testing.T) {

	if testing.Short() {
		t.Skip("Skipping Redis integration test in short mode")
	}

	client, err := CreateRedisClient()
	if err != nil {
		t.Fatalf("Failed to create Redis client: %v", err)
	}
	defer client.Close()

	ctx := context.Background()

	if err := client.Ping(ctx).Err(); err != nil {
        t.Fatalf("Failed to ping Redis: %v", err)
    }

	err = client.Set(ctx, "test_key", "test_value", 0).Err()
	if err != nil {
		t.Fatalf("Failed to set key in Redis: %v", err)
	}

	val, err := client.GetDel(ctx, "test_key").Result()
	if err != nil {
		t.Fatalf("Failed to get and delete key from Redis: %v", err)
	}

	err = client.Get(ctx, "test_key").Err()
	if err != redis.Nil {
		t.Fatalf("Expected redis.Nil after deletion, got: %v", err)
	}

	if val != "test_value" {
		t.Fatalf("Expected 'test_value', got '%s'", val)
	}
}