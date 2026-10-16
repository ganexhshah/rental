package tenant

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func (s *Service) GetCurrentTenant(ctx context.Context, tenantID uuid.UUID) (*Tenant, error) {
	if s.pool == nil {
		return &Tenant{
			ID:             tenantID,
			Name:           "Apex Car & Bike Rentals",
			Slug:           "apex-rentals",
			Currency:       "NPR",
			CurrencySymbol: "Rs.",
			Timezone:       "Asia/Kathmandu",
			Plan:           "enterprise",
			Status:         "active",
			Settings:       json.RawMessage(`{}`),
		}, nil
	}

	var t Tenant
	query := `
		SELECT id, name, slug, currency, currency_symbol, timezone, plan, status, settings, created_at, updated_at
		FROM tenants
		WHERE id = $1
	`
	err := s.pool.QueryRow(ctx, query, tenantID).Scan(
		&t.ID, &t.Name, &t.Slug, &t.Currency, &t.CurrencySymbol, &t.Timezone, &t.Plan, &t.Status, &t.Settings, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to get tenant: %w", err)
	}

	return &t, nil
}

func (s *Service) GetTenantBySlugOrID(ctx context.Context, identifier string) (*Tenant, error) {
	name := "Apex Car & Bike Rentals"
	slug := identifier
	if identifier == "ridersone" || identifier == "riders-one" {
		name = "Riders One Motorcycle & Car Rentals"
		slug = "ridersone"
	} else if identifier == "himalayanrides" || identifier == "himalayan-rides" {
		name = "Himalayan Rides Nepal Pvt. Ltd."
		slug = "himalayanrides"
	}

	fallbackTenant := &Tenant{
		ID:             uuid.MustParse("a84c60b9-47f6-48f5-abdf-29d23989c5b5"),
		Name:           name,
		Slug:           slug,
		Currency:       "NPR",
		CurrencySymbol: "Rs.",
		Timezone:       "Asia/Kathmandu",
		Plan:           "enterprise",
		Status:         "active",
		Settings:       json.RawMessage(`{"branding":{"companyName":"` + name + `","supportEmail":"info@` + slug + `.com","supportPhone":"+977-1-4700000","tagline":"Nepal Premier Fleet & Motorcycle Rentals"}}`),
	}

	if s.pool == nil {
		return fallbackTenant, nil
	}

	var t Tenant
	query := `
		SELECT id, name, slug, currency, currency_symbol, timezone, plan, status, settings, created_at, updated_at
		FROM tenants
		WHERE slug = $1 OR id::text = $1
	`
	err := s.pool.QueryRow(ctx, query, identifier).Scan(
		&t.ID, &t.Name, &t.Slug, &t.Currency, &t.CurrencySymbol, &t.Timezone, &t.Plan, &t.Status, &t.Settings, &t.CreatedAt, &t.UpdatedAt,
	)
	if err != nil {
		// If not found in DB or DB empty, return fallback tenant
		return fallbackTenant, nil
	}

	return &t, nil
}

func (s *Service) UpdateCurrentTenant(ctx context.Context, tenantID uuid.UUID, req UpdateTenantRequest) (*Tenant, error) {
	current, err := s.GetCurrentTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	if s.pool == nil {
		if req.Name != nil {
			current.Name = *req.Name
		}
		if req.Currency != nil {
			current.Currency = *req.Currency
		}
		if req.CurrencySymbol != nil {
			current.CurrencySymbol = *req.CurrencySymbol
		}
		if req.Timezone != nil {
			current.Timezone = *req.Timezone
		}
		if req.Settings != nil {
			current.Settings = *req.Settings
		}
		return current, nil
	}

	if req.Name != nil {
		current.Name = *req.Name
	}
	if req.Currency != nil {
		current.Currency = *req.Currency
	}
	if req.CurrencySymbol != nil {
		current.CurrencySymbol = *req.CurrencySymbol
	}
	if req.Timezone != nil {
		current.Timezone = *req.Timezone
	}
	if req.Settings != nil {
		current.Settings = *req.Settings
	}

	query := `
		UPDATE tenants
		SET name = $1, currency = $2, currency_symbol = $3, timezone = $4, settings = $5, updated_at = NOW()
		WHERE id = $6
		RETURNING id, name, slug, currency, currency_symbol, timezone, plan, status, settings, created_at, updated_at
	`

	var updated Tenant
	err = s.pool.QueryRow(ctx, query, current.Name, current.Currency, current.CurrencySymbol, current.Timezone, current.Settings, tenantID).Scan(
		&updated.ID, &updated.Name, &updated.Slug, &updated.Currency, &updated.CurrencySymbol, &updated.Timezone, &updated.Plan, &updated.Status, &updated.Settings, &updated.CreatedAt, &updated.UpdatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to update tenant: %w", err)
	}

	return &updated, nil
}

func (s *Service) GetSettingsSection(ctx context.Context, tenantID uuid.UUID, section string) (map[string]any, error) {
	t, err := s.GetCurrentTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	if len(t.Settings) == 0 {
		return map[string]any{}, nil
	}
	var settingsMap map[string]any
	if err := json.Unmarshal(t.Settings, &settingsMap); err != nil {
		return map[string]any{}, nil
	}
	sec, ok := settingsMap[section].(map[string]any)
	if !ok || sec == nil {
		return map[string]any{}, nil
	}
	return sec, nil
}

func (s *Service) UpdateSettingsSection(ctx context.Context, tenantID uuid.UUID, section string, values map[string]any) (map[string]any, error) {
	t, err := s.GetCurrentTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}
	settingsMap := make(map[string]any)
	if len(t.Settings) > 0 {
		_ = json.Unmarshal(t.Settings, &settingsMap)
	}
	currentSection, _ := settingsMap[section].(map[string]any)
	if currentSection == nil {
		currentSection = make(map[string]any)
	}
	for k, v := range values {
		currentSection[k] = v
	}
	settingsMap[section] = currentSection

	rawBytes, err := json.Marshal(settingsMap)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal settings: %w", err)
	}
	rawMsg := json.RawMessage(rawBytes)
	req := UpdateTenantRequest{Settings: &rawMsg}
	_, err = s.UpdateCurrentTenant(ctx, tenantID, req)
	if err != nil {
		return nil, err
	}
	return currentSection, nil
}

