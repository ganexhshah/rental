package subscription

import (
	"time"

	"github.com/google/uuid"
)

type Subscription struct {
	ID                 uuid.UUID `json:"id"`
	TenantID           uuid.UUID `json:"tenant_id"`
	PlanTier           string    `json:"plan_tier"` // basic, pro, enterprise
	Status             string    `json:"status"`    // active, past_due, canceled
	CurrentPeriodStart time.Time `json:"current_period_start"`
	CurrentPeriodEnd   time.Time `json:"current_period_end"`
	CancelAtPeriodEnd  bool      `json:"cancel_at_period_end"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
}

type UpdateSubscriptionRequest struct {
	PlanTier string `json:"plan_tier" validate:"required,oneof=starter professional enterprise"`
}
