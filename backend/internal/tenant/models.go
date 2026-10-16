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
	LogoURL        string          `json:"logo_url,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`
}

func (t *Tenant) GetLogoURL() string {
	if t.LogoURL != "" {
		return t.LogoURL
	}
	if len(t.Settings) == 0 {
		return ""
	}
	var sm map[string]any
	if err := json.Unmarshal(t.Settings, &sm); err == nil {
		if branding, ok := sm["branding"].(map[string]any); ok {
			if l, ok := branding["logoUrl"].(string); ok && l != "" {
				return l
			}
			if l, ok := branding["logo_url"].(string); ok && l != "" {
				return l
			}
		}
	}
	return ""
}

type UpdateTenantRequest struct {
	Name           *string          `json:"name,omitempty"`
	Currency       *string          `json:"currency,omitempty"`
	CurrencySymbol *string          `json:"currency_symbol,omitempty"`
	Timezone       *string          `json:"timezone,omitempty"`
	Settings       *json.RawMessage `json:"settings,omitempty"`
}
