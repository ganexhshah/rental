package storage

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

type Database struct {
	Pool *pgxpool.Pool
	log  *slog.Logger
}

func NewDatabase(ctx context.Context, databaseURL string, log *slog.Logger) (*Database, error) {
	config, err := pgxpool.ParseConfig(databaseURL)
	if err != nil {
		return nil, fmt.Errorf("failed to parse database url: %w", err)
	}

	config.MaxConns = 25
	config.MinConns = 5
	config.MaxConnLifetime = time.Hour
	config.MaxConnIdleTime = 30 * time.Minute

	pool, err := pgxpool.NewWithConfig(ctx, config)
	if err != nil {
		return nil, fmt.Errorf("failed to create database pool: %w", err)
	}

	// Ping database
	pingCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	if err := pool.Ping(pingCtx); err != nil {
		pool.Close()
		return nil, fmt.Errorf("failed to ping database: %w", err)
	}

	log.Info("connected to PostgreSQL successfully")

	return &Database{Pool: pool, log: log}, nil
}

func (d *Database) Close() {
	if d.Pool != nil {
		d.Pool.Close()
	}
}

// AutoMigrate executes SQL migration up files from directory if available using schema_migrations table
func (d *Database) AutoMigrate(ctx context.Context, migrationsDir string) error {
	entries, err := os.ReadDir(migrationsDir)
	if err != nil {
		d.log.Warn("skipping auto-migrate: migrations directory not found", "dir", migrationsDir)
		return nil
	}

	// Create schema_migrations tracking table if not exists
	_, err = d.Pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS schema_migrations (
			version VARCHAR(255) PRIMARY KEY,
			applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		return fmt.Errorf("failed to initialize schema_migrations table: %w", err)
	}

	for _, entry := range entries {
		if !entry.IsDir() && strings.HasSuffix(entry.Name(), ".up.sql") {
			var exists bool
			err := d.Pool.QueryRow(ctx, "SELECT EXISTS(SELECT 1 FROM schema_migrations WHERE version = $1)", entry.Name()).Scan(&exists)
			if err == nil && exists {
				continue // Already applied
			}

			filePath := filepath.Join(migrationsDir, entry.Name())
			content, err := os.ReadFile(filePath)
			if err != nil {
				return fmt.Errorf("failed to read migration %s: %w", entry.Name(), err)
			}

			d.log.Info("applying database migration", "file", entry.Name())
			tx, err := d.Pool.Begin(ctx)
			if err != nil {
				return fmt.Errorf("failed to begin migration tx for %s: %w", entry.Name(), err)
			}

			if _, err := tx.Exec(ctx, string(content)); err != nil {
				_ = tx.Rollback(ctx)
				return fmt.Errorf("failed to execute migration %s: %w", entry.Name(), err)
			}

			if _, err := tx.Exec(ctx, "INSERT INTO schema_migrations (version) VALUES ($1)", entry.Name()); err != nil {
				_ = tx.Rollback(ctx)
				return fmt.Errorf("failed to record applied migration %s: %w", entry.Name(), err)
			}

			if err := tx.Commit(ctx); err != nil {
				return fmt.Errorf("failed to commit migration %s: %w", entry.Name(), err)
			}
		}
	}

	d.log.Info("database migrations verified successfully")
	return nil
}
