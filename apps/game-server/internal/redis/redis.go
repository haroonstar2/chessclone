package redis

// Redis Client Wrapper

import (
	"context"
	"os"
	"time"

	"github.com/redis/go-redis/v9"

	"fmt"
	"log/slog"
)

func CreateRedisClient() (*redis.Client, error) {
	ctx := context.Background()

	// Get Redis host and port from environment variables, with default values if not set
	host := os.Getenv("REDIS_HOST")
	if host == "" {
		slog.Info("REDIS_HOST not set, using default 'localhost'")
		host = "localhost"
	}

	port := os.Getenv("REDIS_PORT")
	if port == "" {
		slog.Info("REDIS_PORT not set, using default '6379'")
		port = "6379"
	}

	var redisClient *redis.Client
	var err error

	// Retry logic with exponential backoff
	for i := 0; i < 5; i++ {
		redisClient = redis.NewClient(&redis.Options{
			Addr:     fmt.Sprintf("%s:%s", host, port),
			Password: "", // no password set
			DB:       0,
		})

		slog.Info("Connecting to Redis...")
		err = redisClient.Ping(ctx).Err()
		if err == nil {
			slog.Info("Redis service is running...")
			return redisClient, nil
		}

		slog.Error("Redis connection failed", "error", err)
		time.Sleep(time.Duration(i+1) * time.Second) // Exponential backoff
	}

	slog.Error("Failed to connect to Redis after multiple attempts", "error", err)
	return nil, err
}
