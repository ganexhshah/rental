package onboarding

import (
	"time"

	"github.com/google/uuid"
)

type PrimaryBranchInput struct {
	Name         string `json:"name"`
	Code         string `json:"code"`
	City         string `json:"city"`
	Address      string `json:"address"`
	ContactPhone string `json:"contact_phone"`
}

type RentalRulesInput struct {
	DefaultDeposit  float64 `json:"default_deposit"`
	MinRentalHours  int     `json:"min_rental_hours"`
	AllowedKmPerDay int     `json:"allowed_km_per_day"`
	ExtraKmRate     float64 `json:"extra_km_rate"`
	FuelPolicy      string  `json:"fuel_policy"`
	GracePeriodMins int     `json:"grace_period_mins"`
}

type CompleteOnboardingRequest struct {
	CompanyName         string              `json:"company_name"`
	RegistrationNumber  string              `json:"registration_number"`
	TaxID               string              `json:"tax_id"`
	Email               string              `json:"email"`
	Phone               string              `json:"phone"`
	HeadquartersAddress string              `json:"headquarters_address"`
	City                string              `json:"city"`
	Country             string              `json:"country"`
	Currency            string              `json:"currency"`
	CurrencySymbol      string              `json:"currency_symbol"`
	Timezone            string              `json:"timezone"`
	LogoURL             string              `json:"logo_url"`
	PrimaryBranch       *PrimaryBranchInput `json:"primary_branch,omitempty"`
	RentalRules         *RentalRulesInput   `json:"rental_rules,omitempty"`
	StarterOption       string              `json:"starter_option"` // "sample" | "blank"
}

type OnboardingStatusResponse struct {
	Completed           bool                `json:"completed"`
	CompletedAt         *time.Time          `json:"completed_at,omitempty"`
	TenantID            uuid.UUID           `json:"tenant_id"`
	CompanyName         string              `json:"company_name"`
	Currency            string              `json:"currency"`
	CurrencySymbol      string              `json:"currency_symbol"`
	Timezone            string              `json:"timezone"`
	LogoURL             string              `json:"logo_url,omitempty"`
	HasBranches         bool                `json:"has_branches"`
	HasVehicles         bool                `json:"has_vehicles"`
	PrimaryBranch       *PrimaryBranchInput `json:"primary_branch,omitempty"`
}

type LogoUploadResponse struct {
	URL         string `json:"url"`
	Filename    string `json:"filename"`
	Size        int64  `json:"size"`
	ContentType string `json:"content_type"`
}

type Base64LogoRequest struct {
	DataURI  string `json:"data_uri"`  // e.g. "data:image/png;base64,..."
	Filename string `json:"filename"`  // optional filename
	CloudURL string `json:"cloud_url"`  // optional direct cloud URL
}

