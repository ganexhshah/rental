package tenant

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	pool            *pgxpool.Pool
	mu              sync.RWMutex
	inMemoryTenants map[uuid.UUID]*Tenant
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{
		pool:            pool,
		inMemoryTenants: make(map[uuid.UUID]*Tenant),
	}
}

func (s *Service) RegisterInMemoryTenant(id uuid.UUID, name, slug, currency, symbol, timezone string) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.inMemoryTenants == nil {
		s.inMemoryTenants = make(map[uuid.UUID]*Tenant)
	}
	s.inMemoryTenants[id] = &Tenant{
		ID:             id,
		Name:           name,
		Slug:           slug,
		Currency:       currency,
		CurrencySymbol: symbol,
		Timezone:       timezone,
		Plan:           "enterprise",
		Status:         "active",
		Settings:       json.RawMessage(`{}`),
		CreatedAt:      time.Now().UTC(),
		UpdatedAt:      time.Now().UTC(),
	}
}

func (s *Service) GetInMemoryTenantInfo(id uuid.UUID) (name, slug, currency, symbol, timezone, plan, status, logoURL string, ok bool) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	t, found := s.inMemoryTenants[id]
	if !found || t == nil {
		return "", "", "", "", "", "", "", "", false
	}
	logo := t.LogoURL
	if logo == "" {
		logo = t.GetLogoURL()
	}
	return t.Name, t.Slug, t.Currency, t.CurrencySymbol, t.Timezone, t.Plan, t.Status, logo, true
}

func (s *Service) GetCurrentTenant(ctx context.Context, tenantID uuid.UUID) (*Tenant, error) {
	if s.pool == nil {
		s.mu.Lock()
		defer s.mu.Unlock()
		if s.inMemoryTenants == nil {
			s.inMemoryTenants = make(map[uuid.UUID]*Tenant)
		}
		if t, ok := s.inMemoryTenants[tenantID]; ok {
			if t.LogoURL == "" {
				t.LogoURL = t.GetLogoURL()
			}
			return t, nil
		}
		t := &Tenant{
			ID:             tenantID,
			Name:           "Rental Fleet Co.",
			Slug:           "rental-fleet",
			Currency:       "NPR",
			CurrencySymbol: "Rs.",
			Timezone:       "Asia/Kathmandu",
			Plan:           "enterprise",
			Status:         "active",
			Settings:       json.RawMessage(`{}`),
			CreatedAt:      time.Now().UTC(),
			UpdatedAt:      time.Now().UTC(),
		}
		s.inMemoryTenants[tenantID] = t
		return t, nil
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

	if t.LogoURL == "" {
		t.LogoURL = t.GetLogoURL()
	}

	return &t, nil
}

func (s *Service) GetTenantBySlugOrID(ctx context.Context, identifier string) (*Tenant, error) {
	s.mu.RLock()
	for _, memTenant := range s.inMemoryTenants {
		if memTenant.Slug == identifier || memTenant.ID.String() == identifier {
			s.mu.RUnlock()
			return memTenant, nil
		}
	}
	s.mu.RUnlock()

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
	if s.pool == nil {
		s.mu.Lock()
		defer s.mu.Unlock()
		if s.inMemoryTenants == nil {
			s.inMemoryTenants = make(map[uuid.UUID]*Tenant)
		}
		t, ok := s.inMemoryTenants[tenantID]
		if !ok {
			t = &Tenant{
				ID:             tenantID,
				Name:           "Rental Fleet Co.",
				Slug:           "rental-fleet",
				Currency:       "NPR",
				CurrencySymbol: "Rs.",
				Timezone:       "Asia/Kathmandu",
				Plan:           "enterprise",
				Status:         "active",
				Settings:       json.RawMessage(`{}`),
				CreatedAt:      time.Now().UTC(),
				UpdatedAt:      time.Now().UTC(),
			}
			s.inMemoryTenants[tenantID] = t
		}
		if req.Name != nil {
			t.Name = *req.Name
		}
		if req.Currency != nil {
			t.Currency = *req.Currency
		}
		if req.CurrencySymbol != nil {
			t.CurrencySymbol = *req.CurrencySymbol
		}
		if req.Timezone != nil {
			t.Timezone = *req.Timezone
		}
		if req.Settings != nil {
			t.Settings = *req.Settings
		}
		t.UpdatedAt = time.Now().UTC()
		return t, nil
	}

	current, err := s.GetCurrentTenant(ctx, tenantID)
	if err != nil {
		return nil, err
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

	if section == "branding" {
		if logo, ok := values["logoUrl"].(string); ok && logo != "" {
			t.LogoURL = logo
		} else if logo, ok := values["logo_url"].(string); ok && logo != "" {
			t.LogoURL = logo
		}
	}

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

