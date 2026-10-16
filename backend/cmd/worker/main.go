package main

import (
	"context"
	"fmt"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/hibiken/asynq"
	"github.com/rental/backend/pkg/config"
	"github.com/rental/backend/pkg/logger"
	"github.com/rental/backend/pkg/storage"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	log := logger.New(cfg.Env)
	log.Info("starting asynq background worker",
		"env", cfg.Env,
		"redis_url", cfg.RedisURL,
	)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize Database pool for worker jobs
	db, err := storage.NewDatabase(ctx, cfg.DatabaseURL, log)
	if err != nil {
		log.Warn("database connection warning in worker", "error", err)
	} else {
		defer db.Close()
	}

	// Parse Redis URL for Asynq
	redisOpt, err := asynq.ParseRedisURI(cfg.RedisURL)
	if err != nil {
		log.Warn("failed to parse redis URI for asynq", "error", err)
		redisOpt = asynq.RedisClientOpt{Addr: "localhost:6380"}
	}

	srv := asynq.NewServer(
		redisOpt,
		asynq.Config{
			Concurrency: 10,
			Queues: map[string]int{
				"critical": 6,
				"default":  3,
				"low":      1,
			},
			HealthCheckInterval: 15 * time.Second,
		},
	)

	mux := asynq.NewServeMux()

	// Register job handlers
	mux.HandleFunc("email:send", func(ctx context.Context, t *asynq.Task) error {
		log.Info("processing email:send task", "payload", string(t.Payload()))
		return nil
	})

	mux.HandleFunc("booking:reminder", func(ctx context.Context, t *asynq.Task) error {
		log.Info("processing booking:reminder task", "payload", string(t.Payload()))
		return nil
	})

	mux.HandleFunc("payment:reconcile", func(ctx context.Context, t *asynq.Task) error {
		log.Info("processing payment:reconcile task", "payload", string(t.Payload()))
		return nil
	})

	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	go func() {
		if err := srv.Run(mux); err != nil {
			log.Error("asynq worker error", "error", err)
		}
	}()

	<-shutdown
	log.Info("shutting down asynq worker")
	srv.Shutdown()
	log.Info("worker stopped cleanly")
}
