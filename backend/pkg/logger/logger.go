package logger

import (
	"context"
	"log/slog"
	"os"
)

type contextKey string

const (
	RequestIDKey contextKey = "request_id"
	TenantIDKey  contextKey = "tenant_id"
	UserIDKey    contextKey = "user_id"
)

func New(env string) *slog.Logger {
	var handler slog.Handler
	opts := &slog.HandlerOptions{
		Level: slog.LevelInfo,
	}

	if env == "development" {
		opts.Level = slog.LevelDebug
		handler = slog.NewTextHandler(os.Stdout, opts)
	} else {
		handler = slog.NewJSONHandler(os.Stdout, opts)
	}

	return slog.New(handler)
}

func FromContext(ctx context.Context, base *slog.Logger) *slog.Logger {
	if base == nil {
		base = slog.Default()
	}

	log := base
	if reqID, ok := ctx.Value(RequestIDKey).(string); ok && reqID != "" {
		log = log.With("request_id", reqID)
	}
	if tenantID, ok := ctx.Value(TenantIDKey).(string); ok && tenantID != "" {
		log = log.With("tenant_id", tenantID)
	}
	if userID, ok := ctx.Value(UserIDKey).(string); ok && userID != "" {
		log = log.With("user_id", userID)
	}

	return log
}
