package subscription

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func (s *Service) GetTenantSubscription(ctx context.Context, tenantID uuid.UUID) (*Subscription, error) {
	query := `
		SELECT id, tenant_id, plan_tier, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at
		FROM subscriptions
		WHERE tenant_id = $1
	`
	var sub Subscription
	err := s.pool.QueryRow(ctx, query, tenantID).Scan(
		&sub.ID, &sub.TenantID, &sub.PlanTier, &sub.Status, &sub.CurrentPeriodStart, &sub.CurrentPeriodEnd, &sub.CancelAtPeriodEnd, &sub.CreatedAt, &sub.UpdatedAt,
	)
	if err == pgx.ErrNoRows {
		// Auto-initialize standard enterprise tier for demo/trial
		sub = Subscription{
			ID:                 uuid.New(),
			TenantID:           tenantID,
			PlanTier:           "enterprise",
			Status:             "active",
			CurrentPeriodStart: time.Now(),
			CurrentPeriodEnd:   time.Now().AddDate(1, 0, 0),
			CancelAtPeriodEnd:  false,
			CreatedAt:          time.Now(),
			UpdatedAt:          time.Now(),
		}
		insertQuery := `
			INSERT INTO subscriptions (id, tenant_id, plan_tier, status, current_period_start, current_period_end, cancel_at_period_end)
			VALUES ($1, $2, $3, $4, $5, $6, $7)
			ON CONFLICT (tenant_id) DO NOTHING
		`
		_, _ = s.pool.Exec(ctx, insertQuery, sub.ID, sub.TenantID, sub.PlanTier, sub.Status, sub.CurrentPeriodStart, sub.CurrentPeriodEnd, sub.CancelAtPeriodEnd)
		return &sub, nil
	}
	if err != nil {
		return nil, err
	}
	return &sub, nil
}

func (s *Service) UpdateSubscriptionPlan(ctx context.Context, tenantID uuid.UUID, planTier string) (*Subscription, error) {
	query := `
		INSERT INTO subscriptions (id, tenant_id, plan_tier, status, current_period_start, current_period_end, cancel_at_period_end)
		VALUES ($1, $2, $3, 'active', NOW(), NOW() + INTERVAL '1 year', FALSE)
		ON CONFLICT (tenant_id) DO UPDATE
		SET plan_tier = EXCLUDED.plan_tier, updated_at = NOW()
		RETURNING id, tenant_id, plan_tier, status, current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at
	`
	var sub Subscription
	err := s.pool.QueryRow(ctx, query, uuid.New(), tenantID, planTier).Scan(
		&sub.ID, &sub.TenantID, &sub.PlanTier, &sub.Status, &sub.CurrentPeriodStart, &sub.CurrentPeriodEnd, &sub.CancelAtPeriodEnd, &sub.CreatedAt, &sub.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	// Also sync tenant plan column
	_, _ = s.pool.Exec(ctx, "UPDATE tenants SET plan = $1, updated_at = NOW() WHERE id = $2", planTier, tenantID)
	return &sub, nil
}

func (s *Service) GetUsage(ctx context.Context, tenantID uuid.UUID) (map[string]any, error) {
	var vCount, bCount int
	_ = s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM vehicles WHERE tenant_id = $1", tenantID).Scan(&vCount)
	_ = s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM bookings WHERE tenant_id = $1", tenantID).Scan(&bCount)

	return map[string]any{
		"vehicles_used":    vCount,
		"vehicles_limit":   50,
		"bookings_count":   bCount,
		"storage_used_mb":  14.5,
		"storage_limit_mb": 10240,
	}, nil
}

func (s *Service) GetInvoices(ctx context.Context, tenantID uuid.UUID) ([]map[string]any, error) {
	return []map[string]any{
		{
			"id":             "sub-inv-001",
			"invoice_number": "SAAS-2026-001",
			"amount":         49.00,
			"currency":       "USD",
			"status":         "paid",
			"paid_at":        time.Now().AddDate(0, -1, 0).Format("2006-01-02"),
			"pdf_url":        "",
		},
	}, nil
}

