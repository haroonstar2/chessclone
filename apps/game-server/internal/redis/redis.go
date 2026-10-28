package redis

// Redis Client Wrapper

import (
	"context"
	"os"

	"github.com/redis/go-redis/v9"

	"fmt"
	"log"
)

func CreateRedisClient() (*redis.Client, error) {

	ctx := context.Background()

	// Get Redis host and port from environment variables, with default values if not set
	host := os.Getenv("REDIS_HOST")
	if host == "" {
		log.Println("REDIS_HOST not set, using default 'localhost'")
		host = "localhost"
	}

	port := os.Getenv("REDIS_PORT")
	if port == "" {
		log.Println("REDIS_PORT not set, using default '6379'")
		port = "6379"
	}

	redisClient := redis.NewClient(&redis.Options{
		Addr: fmt.Sprintf("%s:%s", host, port),
		Password: "", // no password set
		DB: 0,
	})

	log.Println("Connecting to Redis...")
	error := redisClient.Ping(ctx).Err()
	if error != nil {
		log.Printf("Error connecting to Redis: %v", error)
		return nil, error
	}

	log.Println("Redis service is running...")

	return redisClient, nil

}