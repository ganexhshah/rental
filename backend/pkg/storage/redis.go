package storage

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisClient struct {
	Client *redis.Client
	log    *slog.Logger
}

func NewRedis(ctx context.Context, redisURL string, log *slog.Logger) (*RedisClient, error) {
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse redis url: %w", err)
	}

	client := redis.NewClient(opt)

	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := client.Ping(pingCtx).Err(); err != nil {
		log.Warn("could not connect to Redis, continuing in degraded mode", "error", err)
		return &RedisClient{Client: client, log: log}, nil
	}

	log.Info("connected to Redis successfully")
	return &RedisClient{Client: client, log: log}, nil
}

func (r *RedisClient) Close() error {
	if r.Client != nil {
		return r.Client.Close()
	}
	return nil
}
