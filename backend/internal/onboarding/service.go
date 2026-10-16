package onboarding

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"image"
	_ "image/gif"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"mime"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rental/backend/internal/tenant"
	"github.com/rental/backend/internal/vehicle"
	"github.com/rental/backend/pkg/pagination"
)

type Service struct {
	pool           *pgxpool.Pool
	tenantService  *tenant.Service
	vehicleService *vehicle.Service
	baseDir        string
	baseURL        string
	mu             sync.Mutex
}

func NewService(
	pool *pgxpool.Pool,
	tenantService *tenant.Service,
	vehicleService *vehicle.Service,
	baseDir string,
	baseURL string,
) *Service {
	if baseDir == "" {
		baseDir = "./uploads"
	}
	_ = os.MkdirAll(filepath.Join(baseDir, "logos"), 0755)

	return &Service{
		pool:           pool,
		tenantService:  tenantService,
		vehicleService: vehicleService,
		baseDir:        baseDir,
		baseURL:        strings.TrimRight(baseURL, "/"),
	}
}

// GetStatus checks whether onboarding has been completed and returns prefilled tenant details
func (s *Service) GetStatus(ctx context.Context, tenantID uuid.UUID) (*OnboardingStatusResponse, error) {
	t, err := s.tenantService.GetCurrentTenant(ctx, tenantID)
	if err != nil {
		return nil, err
	}

	res := &OnboardingStatusResponse{
		Completed:      false,
		TenantID:       tenantID,
		CompanyName:    t.Name,
		Currency:       t.Currency,
		CurrencySymbol: t.CurrencySymbol,
		Timezone:       t.Timezone,
	}

	if len(t.Settings) > 0 {
		var sm map[string]any
		if err := json.Unmarshal(t.Settings, &sm); err == nil {
			if ob, ok := sm["onboarding"].(map[string]any); ok {
				if completed, ok := ob["completed"].(bool); ok {
					res.Completed = completed
				}
				if caStr, ok := ob["completed_at"].(string); ok && caStr != "" {
					if tParsed, err := time.Parse(time.RFC3339, caStr); err == nil {
						res.CompletedAt = &tParsed
					}
				}
			}

			if branding, ok := sm["branding"].(map[string]any); ok {
				if logo, ok := branding["logoUrl"].(string); ok {
					res.LogoURL = logo
				} else if logo, ok := branding["logo_url"].(string); ok {
					res.LogoURL = logo
				}
			}
		}
	}

	// Check if branches exist
	if s.vehicleService != nil {
		locs, _ := s.vehicleService.ListLocations(ctx, tenantID)
		if len(locs) > 0 {
			res.HasBranches = true
			res.PrimaryBranch = &PrimaryBranchInput{
				Name:         locs[0].Name,
				Code:         locs[0].Code,
				City:         locs[0].City,
				Address:      locs[0].Address,
				ContactPhone: locs[0].Phone,
			}
		}

		vehs, _, _ := s.vehicleService.ListVehicles(ctx, tenantID, "", "", pagination.Params{Page: 1, Limit: 5})
		if len(vehs) > 0 {
			res.HasVehicles = true
		}
	}

	return res, nil
}

// UploadLogo stores an uploaded logo on disk and records it in tenant branding settings
func (s *Service) UploadLogo(ctx context.Context, tenantID uuid.UUID, originalFilename string, r io.Reader, contentType string) (*LogoUploadResponse, error) {
	s.mu.Lock()
	defer s.mu.Unlock()

	data, err := io.ReadAll(r)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}

	if len(data) == 0 {
		return nil, fmt.Errorf("uploaded file is empty")
	}

	if len(data) > 10*1024*1024 {
		return nil, fmt.Errorf("file exceeds maximum size of 10MB")
	}

	// Detect content type if empty
	if contentType == "" || contentType == "application/octet-stream" {
		contentType = http.DetectContentType(data)
	}

	// Determine file extension
	ext := strings.ToLower(filepath.Ext(originalFilename))
	if ext == "" {
		exts, _ := mime.ExtensionsByType(contentType)
		if len(exts) > 0 {
			ext = exts[0]
		} else {
			ext = ".png"
		}
	}

	if !strings.HasPrefix(ext, ".") {
		ext = "." + ext
	}

	// Validate allowed image types
	allowedExts := map[string]bool{
		".png": true, ".jpg": true, ".jpeg": true, ".svg": true, ".webp": true, ".gif": true, ".ico": true,
	}
	if !allowedExts[ext] {
		return nil, fmt.Errorf("unsupported image format '%s'. Please upload PNG, JPG, SVG, WebP, or GIF", ext)
	}

	logosDir := filepath.Join(s.baseDir, "logos")
	if err := os.MkdirAll(logosDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create logos directory: %w", err)
	}

	safeName := fmt.Sprintf("logo-%s-%d%s", tenantID.String(), time.Now().UnixNano(), ext)
	targetPath := filepath.Join(logosDir, safeName)

	if err := os.WriteFile(targetPath, data, 0644); err != nil {
		return nil, fmt.Errorf("failed to save logo file: %w", err)
	}

	publicURL := fmt.Sprintf("%s/uploads/logos/%s", s.baseURL, safeName)

	// Persist to tenant branding settings
	if s.tenantService != nil {
		_, _ = s.tenantService.UpdateSettingsSection(ctx, tenantID, "branding", map[string]any{
			"logoUrl":  publicURL,
			"logo_url": publicURL,
		})
	}

	return &LogoUploadResponse{
		URL:         publicURL,
		Filename:    safeName,
		Size:        int64(len(data)),
		ContentType: contentType,
	}, nil
}

// UploadBase64Logo decodes a base64 data URI and saves it as a logo
func (s *Service) UploadBase64Logo(ctx context.Context, tenantID uuid.UUID, dataURI, filename string) (*LogoUploadResponse, error) {
	// Expected format: data:image/png;base64,...
	var contentType string
	var rawBase64 string

	if strings.HasPrefix(dataURI, "data:") {
		parts := strings.SplitN(dataURI, ",", 2)
		if len(parts) != 2 {
			return nil, fmt.Errorf("malformed data URI")
		}
		header := parts[0]
		rawBase64 = parts[1]

		semi := strings.Index(header, ";")
		if semi != -1 {
			contentType = strings.TrimPrefix(header[:semi], "data:")
		}
	} else {
		rawBase64 = dataURI
		contentType = "image/png"
	}

	decoded, err := base64.StdEncoding.DecodeString(rawBase64)
	if err != nil {
		return nil, fmt.Errorf("invalid base64 encoding: %w", err)
	}

	if filename == "" {
		filename = "uploaded-logo.png"
	}

	return s.UploadLogo(ctx, tenantID, filename, bytes.NewReader(decoded), contentType)
}

// CompleteOnboarding saves all step values from the wizard and creates initial locations and vehicles
func (s *Service) CompleteOnboarding(ctx context.Context, tenantID uuid.UUID, req CompleteOnboardingRequest) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// 1. Update Core Tenant Metadata (Name, Currency, Timezone)
	tenantUpdate := tenant.UpdateTenantRequest{}
	if req.CompanyName != "" {
		tenantUpdate.Name = &req.CompanyName
	}
	if req.Currency != "" {
		tenantUpdate.Currency = &req.Currency
	}
	if req.CurrencySymbol != "" {
		tenantUpdate.CurrencySymbol = &req.CurrencySymbol
	}
	if req.Timezone != "" {
		tenantUpdate.Timezone = &req.Timezone
	}

	if s.tenantService != nil {
		_, _ = s.tenantService.UpdateCurrentTenant(ctx, tenantID, tenantUpdate)

		// 2. Persist Company Profile Section
		companyData := map[string]any{
			"name":                req.CompanyName,
			"registrationNumber": req.RegistrationNumber,
			"taxId":               req.TaxID,
			"email":               req.Email,
			"phone":               req.Phone,
			"headquartersAddress": req.HeadquartersAddress,
			"city":                req.City,
			"country":             req.Country,
			"currency":            req.Currency,
		}
		_, _ = s.tenantService.UpdateSettingsSection(ctx, tenantID, "company", companyData)

		// 3. Persist Branding Section
		brandingData := map[string]any{
			"companyName": req.CompanyName,
		}
		if req.LogoURL != "" {
			brandingData["logoUrl"] = req.LogoURL
			brandingData["logo_url"] = req.LogoURL
		}
		_, _ = s.tenantService.UpdateSettingsSection(ctx, tenantID, "branding", brandingData)

		// 4. Persist Rental Rules Section
		if req.RentalRules != nil {
			rulesData := map[string]any{
				"defaultDeposit":  req.RentalRules.DefaultDeposit,
				"minRentalHours":  req.RentalRules.MinRentalHours,
				"allowedKmPerDay": req.RentalRules.AllowedKmPerDay,
				"extraKmRate":     req.RentalRules.ExtraKmRate,
				"fuelPolicy":      req.RentalRules.FuelPolicy,
				"gracePeriodMins": req.RentalRules.GracePeriodMins,
			}
			_, _ = s.tenantService.UpdateSettingsSection(ctx, tenantID, "rental_rules", rulesData)
		}

		// 5. Mark Onboarding as Completed
		_, _ = s.tenantService.UpdateSettingsSection(ctx, tenantID, "onboarding", map[string]any{
			"completed":      true,
			"completed_at":   time.Now().UTC().Format(time.RFC3339),
			"starter_option": req.StarterOption,
		})
	}

	// 6. Create Primary Branch if provided
	var createdLocationID uuid.UUID
	if req.PrimaryBranch != nil && s.vehicleService != nil {
		locReq := vehicle.CreateLocationRequest{
			Name:     req.PrimaryBranch.Name,
			Code:     req.PrimaryBranch.Code,
			City:     req.PrimaryBranch.City,
			Address:  req.PrimaryBranch.Address,
			Phone:    req.PrimaryBranch.ContactPhone,
			Country:  req.Country,
			IsActive: true,
		}
		if locReq.Country == "" {
			locReq.Country = "Nepal"
		}
		loc, err := s.vehicleService.CreateLocation(ctx, tenantID, locReq)
		if err == nil && loc != nil {
			createdLocationID = loc.ID
		}
	}

	// 7. Seed Sample Vehicles if selected
	if req.StarterOption == "sample" && s.vehicleService != nil {
		s.seedSampleFleet(ctx, tenantID, createdLocationID)
	}

	return nil
}

func (s *Service) seedSampleFleet(ctx context.Context, tenantID, locationID uuid.UUID) {
	// Find or fallback to location ID
	if locationID == uuid.Nil {
		locs, _ := s.vehicleService.ListLocations(ctx, tenantID)
		if len(locs) > 0 {
			locationID = locs[0].ID
		}
	}

	// Sample starter fleet tailored for Nepal terrain (SUV, Royal Enfield, EV, Sedan)
	samples := []vehicle.CreateVehicleRequest{
		{
			Make:            "Mahindra",
			Model:           "Scorpio 4x4 S11",
			Year:            2024,
			PlateNumber:     "BA 2 KHA 8801",
			VehicleType:     "car",
			Status:          "available",
			Odometer:        14500,
			FuelType:        "diesel",
			Transmission:    "manual",
			SeatingCapacity: 7,
			PrimaryImage:    "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
			DailyRate:       8500,
			WeeklyRate:      55000,
			MonthlyRate:     200000,
			DepositAmount:   15000,
			AllowedKmPerDay: 200,
			ExtraKmRate:     25,
			Specs:           json.RawMessage(`{"color":"Pearl White","hasAC":true,"has4WD":true,"hasGPS":true,"groundClearance":"209mm"}`),
			Notes:           "4WD Mountain Spec. Verified for Pokhara, Mustang, and Everest Highway trips.",
			LocationID:      locationID,
		},
		{
			Make:            "Royal Enfield",
			Model:           "Classic 350 Reborn",
			Year:            2024,
			PlateNumber:     "BA PRA 02-042 PA 9921",
			VehicleType:     "motorcycle",
			Status:          "available",
			Odometer:        6200,
			FuelType:        "petrol",
			Transmission:    "manual",
			SeatingCapacity: 2,
			PrimaryImage:    "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80",
			DailyRate:       2500,
			WeeklyRate:      16000,
			MonthlyRate:     55000,
			DepositAmount:   8000,
			AllowedKmPerDay: 180,
			ExtraKmRate:     15,
			Specs:           json.RawMessage(`{"color":"Stealth Black","engine":"349cc","hasLuggageCarrier":true,"helmetIncluded":true}`),
			Notes:           "Equipped with crash guards and saddle stays. Ideal for valley and highway tours.",
			LocationID:      locationID,
		},
		{
			Make:            "Hyundai",
			Model:           "Creta SX(O)",
			Year:            2024,
			PlateNumber:     "BA 3 CHA 3412",
			VehicleType:     "car",
			Status:          "available",
			Odometer:        11200,
			FuelType:        "petrol",
			Transmission:    "automatic",
			SeatingCapacity: 5,
			PrimaryImage:    "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
			DailyRate:       6500,
			WeeklyRate:      42000,
			MonthlyRate:     150000,
			DepositAmount:   12000,
			AllowedKmPerDay: 200,
			ExtraKmRate:     20,
			Specs:           json.RawMessage(`{"color":"Titan Grey","hasAC":true,"hasBluetooth":true,"sunroof":true}`),
			Notes:           "Premium urban automatic crossover with panoramic sunroof and Bose sound.",
			LocationID:      locationID,
		},
		{
			Make:            "Niu",
			Model:           "MQi GT Extended Range",
			Year:            2024,
			PlateNumber:     "BA 01 PRA 1024",
			VehicleType:     "scooter",
			Status:          "available",
			Odometer:        3400,
			FuelType:        "electric",
			Transmission:    "automatic",
			SeatingCapacity: 2,
			PrimaryImage:    "https://images.unsplash.com/photo-1558980664-769d59546b3d?auto=format&fit=crop&w=800&q=80",
			DailyRate:       1800,
			WeeklyRate:      11000,
			MonthlyRate:     38000,
			DepositAmount:   5000,
			AllowedKmPerDay: 100,
			ExtraKmRate:     10,
			Specs:           json.RawMessage(`{"color":"Gloss Red","range":"90km","battery":"Dual Lithium 48V","chargingTime":"4.5 hours"}`),
			Notes:           "Zero emissions city commuter. Includes portable 220V home charger and 2 helmets.",
			LocationID:      locationID,
		},
	}

	for _, sVeh := range samples {
		_, _ = s.vehicleService.CreateVehicle(ctx, tenantID, sVeh)
	}
}

// Suppress unused imports check
var _ = image.Rect
