package vehicle

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Location struct {
	ID                  uuid.UUID `json:"id"`
	TenantID            uuid.UUID `json:"tenant_id"`
	Name                string    `json:"name"`
	Code                string    `json:"code"`
	Address             string    `json:"address"`
	City                string    `json:"city"`
	Country             string    `json:"country"`
	Phone               string    `json:"phone,omitempty"`
	IsActive            bool      `json:"is_active"`
	ActiveVehiclesCount int       `json:"active_vehicles_count"`
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

type CreateLocationRequest struct {
	Name     string `json:"name" validate:"required"`
	Code     string `json:"code" validate:"required"`
	Address  string `json:"address" validate:"required"`
	City     string `json:"city" validate:"required"`
	Country  string `json:"country"`
	Phone    string `json:"phone"`
	IsActive bool   `json:"is_active"`
}

type UpdateLocationRequest struct {
	Name     string `json:"name"`
	Code     string `json:"code"`
	Address  string `json:"address"`
	City     string `json:"city"`
	Country  string `json:"country"`
	Phone    string `json:"phone"`
	IsActive *bool  `json:"is_active"`
}

type Category struct {
	ID            uuid.UUID `json:"id"`
	TenantID      uuid.UUID `json:"tenant_id"`
	Name          string    `json:"name"`
	Slug          string    `json:"slug"`
	VehicleType   string    `json:"vehicle_type"` // car, bike, scooter
	BaseDailyRate float64   `json:"base_daily_rate"`
	Description   string    `json:"description,omitempty"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

type CreateCategoryRequest struct {
	Name          string  `json:"name" validate:"required"`
	Slug          string  `json:"slug"`
	VehicleType   string  `json:"vehicle_type" validate:"required"`
	BaseDailyRate float64 `json:"base_daily_rate" validate:"gte=0"`
	Description   string  `json:"description"`
}

type UpdateCategoryRequest struct {
	Name          string  `json:"name"`
	Slug          string  `json:"slug"`
	VehicleType   string  `json:"vehicle_type"`
	BaseDailyRate float64 `json:"base_daily_rate"`
	Description   string  `json:"description"`
}

type Vehicle struct {
	ID              uuid.UUID       `json:"id"`
	TenantID        uuid.UUID       `json:"tenant_id"`
	CategoryID      uuid.UUID       `json:"category_id"`
	CategoryName    string          `json:"category_name,omitempty"`
	LocationID      uuid.UUID       `json:"location_id"`
	LocationName    string          `json:"location_name,omitempty"`
	Make            string          `json:"make"`
	Model           string          `json:"model"`
	Year            int             `json:"year"`
	PlateNumber     string          `json:"plate_number"`
	VehicleType     string          `json:"vehicle_type"`
	Status          string          `json:"status"` // available, rented, maintenance, reserved, out_of_service
	Odometer        int             `json:"odometer"`
	FuelType        string          `json:"fuel_type"`
	Transmission    string          `json:"transmission"`
	SeatingCapacity int             `json:"seating_capacity"`
	PrimaryImage    string          `json:"primary_image,omitempty"`
	DailyRate       float64         `json:"daily_rate"`
	WeeklyRate      float64         `json:"weekly_rate"`
	MonthlyRate     float64         `json:"monthly_rate"`
	DepositAmount   float64         `json:"deposit_amount"`
	AllowedKmPerDay int             `json:"allowed_km_per_day"`
	ExtraKmRate     float64         `json:"extra_km_rate"`
	Specs           json.RawMessage `json:"specs"`
	Notes           string          `json:"notes,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

type CreateVehicleRequest struct {
	CategoryID      uuid.UUID       `json:"category_id"`
	LocationID      uuid.UUID       `json:"location_id"`
	Make            string          `json:"make" validate:"required"`
	Model           string          `json:"model" validate:"required"`
	Year            int             `json:"year" validate:"required,gte=1990"`
	PlateNumber     string          `json:"plate_number" validate:"required"`
	VehicleType     string          `json:"vehicle_type" validate:"required"`
	Status          string          `json:"status"`
	Odometer        int             `json:"odometer"`
	FuelType        string          `json:"fuel_type"`
	Transmission    string          `json:"transmission"`
	SeatingCapacity int             `json:"seating_capacity"`
	PrimaryImage    string          `json:"primary_image"`
	DailyRate       float64         `json:"daily_rate" validate:"required,gte=0"`
	WeeklyRate      float64         `json:"weekly_rate"`
	MonthlyRate     float64         `json:"monthly_rate"`
	DepositAmount   float64         `json:"deposit_amount"`
	AllowedKmPerDay int             `json:"allowed_km_per_day"`
	ExtraKmRate     float64         `json:"extra_km_rate"`
	Specs           json.RawMessage `json:"specs"`
	Notes           string          `json:"notes"`
}

type UpdateVehicleRequest struct {
	CategoryID      *uuid.UUID       `json:"category_id,omitempty"`
	LocationID      *uuid.UUID       `json:"location_id,omitempty"`
	Make            *string          `json:"make,omitempty"`
	Model           *string          `json:"model,omitempty"`
	Year            *int             `json:"year,omitempty"`
	PlateNumber     *string          `json:"plate_number,omitempty"`
	VehicleType     *string          `json:"vehicle_type,omitempty"`
	Status          *string          `json:"status,omitempty"`
	Odometer        *int             `json:"odometer,omitempty"`
	FuelType        *string          `json:"fuel_type,omitempty"`
	Transmission    *string          `json:"transmission,omitempty"`
	SeatingCapacity *int             `json:"seating_capacity,omitempty"`
	PrimaryImage    *string          `json:"primary_image,omitempty"`
	DailyRate       *float64         `json:"daily_rate,omitempty"`
	WeeklyRate      *float64         `json:"weekly_rate,omitempty"`
	MonthlyRate     *float64         `json:"monthly_rate,omitempty"`
	DepositAmount   *float64         `json:"deposit_amount,omitempty"`
	AllowedKmPerDay *int             `json:"allowed_km_per_day,omitempty"`
	ExtraKmRate     *float64         `json:"extra_km_rate,omitempty"`
	Specs           *json.RawMessage `json:"specs,omitempty"`
	Notes           *string          `json:"notes,omitempty"`
}

type AvailabilityQuery struct {
	StartDate  time.Time `json:"start_date"`
	EndDate    time.Time `json:"end_date"`
	LocationID uuid.UUID `json:"location_id,omitempty"`
	CategoryID uuid.UUID `json:"category_id,omitempty"`
	Type       string    `json:"type,omitempty"`
}

type VehicleDocument struct {
	ID                 uuid.UUID  `json:"id"`
	TenantID           uuid.UUID  `json:"tenant_id"`
	VehicleID          uuid.UUID  `json:"vehicle_id"`
	VehiclePlate       string     `json:"vehicle_plate,omitempty"`
	VehicleName        string     `json:"vehicle_name,omitempty"`
	DocType            string     `json:"doc_type"` // bluebook, insurance, fitness, pollution, permit, road_tax, ownership_lease, inspection_certificate, other
	Name               string     `json:"name"`
	DocumentNumber     string     `json:"document_number"`
	IssuingAuthority   string     `json:"issuing_authority"`
	FileURL            string     `json:"file_url"`
	FileName           string     `json:"file_name,omitempty"`
	FileSize           int64      `json:"file_size,omitempty"`
	MimeType           string     `json:"mime_type,omitempty"`
	IssueDate          *time.Time `json:"issue_date,omitempty"`
	ExpiryDate         *time.Time `json:"expiry_date,omitempty"`
	Status             string     `json:"status"` // valid, expiring_soon, expired, pending, rejected
	VerificationStatus string     `json:"verification_status"` // pending, verified, rejected
	VerifiedBy         string     `json:"verified_by,omitempty"`
	VerifiedAt         *time.Time `json:"verified_at,omitempty"`
	Version            int        `json:"version"`
	Notes              string     `json:"notes,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type CreateDocumentRequest struct {
	VehicleID        uuid.UUID  `json:"vehicle_id" validate:"required"`
	DocType          string     `json:"doc_type" validate:"required"`
	Name             string     `json:"name" validate:"required"`
	DocumentNumber   string     `json:"document_number"`
	IssuingAuthority string     `json:"issuing_authority"`
	FileURL          string     `json:"file_url"`
	FileName         string     `json:"file_name"`
	FileSize         int64      `json:"file_size"`
	MimeType         string     `json:"mime_type"`
	IssueDate        *time.Time `json:"issue_date"`
	ExpiryDate       *time.Time `json:"expiry_date"`
	Notes            string     `json:"notes"`
}

type UpdateDocumentRequest struct {
	Name             *string    `json:"name,omitempty"`
	DocType          *string    `json:"doc_type,omitempty"`
	DocumentNumber   *string    `json:"document_number,omitempty"`
	IssuingAuthority *string    `json:"issuing_authority,omitempty"`
	FileURL          *string    `json:"file_url,omitempty"`
	IssueDate        *time.Time `json:"issue_date,omitempty"`
	ExpiryDate       *time.Time `json:"expiry_date,omitempty"`
	Status           *string    `json:"status,omitempty"`
	Notes            *string    `json:"notes,omitempty"`
}

type VerifyDocumentRequest struct {
	VerificationStatus string `json:"verification_status" validate:"required,oneof=verified rejected pending"`
	AuditorNotes       string `json:"auditor_notes"`
}

type DocumentSummaryStats struct {
	TotalDocuments      int `json:"total_documents"`
	ValidDocuments      int `json:"valid_documents"`
	ExpiringSoon        int `json:"expiring_soon"`
	ExpiredDocuments    int `json:"expired_documents"`
	PendingVerification int `json:"pending_verification"`
}
