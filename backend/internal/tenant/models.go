package tenant

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Tenant struct {
	ID             uuid.UUID       `json:"id"`
	Name           string          `json:"name"`
	Slug           string          `json:"slug"`
	Currency       string          `json:"currency"`
	CurrencySymbol string          `json:"currency_symbol"`
	Timezone       string          `json:"timezone"`
	Plan           string          `json:"plan"`
	Status         string          `json:"status"`
	Settings       json.RawMessage `json:"settings"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

type UpdateTenantRequest struct {
	Name           *string          `json:"name,omitempty"`
	Currency       *string          `json:"currency,omitempty"`
	CurrencySymbol *string          `json:"currency_symbol,omitempty"`
	Timezone       *string          `json:"timezone,omitempty"`
	Settings       *json.RawMessage `json:"settings,omitempty"`
}
