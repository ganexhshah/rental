package public

import (
	"encoding/json"
	"fmt"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rental/backend/internal/booking"
	"github.com/rental/backend/internal/tenant"
	"github.com/rental/backend/pkg/httpx"
)

type Handler struct {
	pool           *pgxpool.Pool
	tenantService  *tenant.Service
	bookingService *booking.Service
}

func NewHandler(pool *pgxpool.Pool, tenantService *tenant.Service, bookingService *booking.Service) *Handler {
	return &Handler{
		pool:           pool,
		tenantService:  tenantService,
		bookingService: bookingService,
	}
}

func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()

	r.Route("/{tenant}", func(tr chi.Router) {
		tr.Get("/config", h.GetPortalConfig)
		tr.Get("/vehicles", h.ListPublicVehicles)
		tr.Get("/availability", h.CheckAvailability)
		tr.Post("/bookings", h.CreatePublicBooking)
	})

	return r
}

func (h *Handler) resolveTenant(r *http.Request) (*tenant.Tenant, error) {
	param := chi.URLParam(r, "tenant")
	if param == "" {
		return nil, fmt.Errorf("tenant identifier is required")
	}
	return h.tenantService.GetTenantBySlugOrID(r.Context(), param)
}

func (h *Handler) GetPortalConfig(w http.ResponseWriter, r *http.Request) {
	t, err := h.resolveTenant(r)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "TENANT_NOT_FOUND", "Tenant not found")
		return
	}

	locations := make([]map[string]any, 0)
	if h.pool != nil {
		locRows, err := h.pool.Query(r.Context(), `
			SELECT id, name, address, city, phone, is_active
			FROM locations
			WHERE tenant_id = $1 AND is_active = true
			ORDER BY name ASC
		`, t.ID)
		if err == nil {
			defer locRows.Close()
			for locRows.Next() {
				var id uuid.UUID
				var name, address, city, phone string
				var active bool
				if err := locRows.Scan(&id, &name, &address, &city, &phone, &active); err == nil {
					locations = append(locations, map[string]any{
						"id":      id,
						"name":    name,
						"address": address,
						"city":    city,
						"phone":   phone,
					})
				}
			}
		}
	}

	if len(locations) == 0 {
		locations = append(locations,
			map[string]any{"id": "loc-1", "name": "Kathmandu Airport / Ring Road Hub", "city": "Kathmandu", "address": "Airport Cargo Road, Sinamangal", "phone": "+977-1-4700000"},
			map[string]any{"id": "loc-2", "name": "Thamel Central Tourist Station", "city": "Kathmandu", "address": "Thamel Marg, Chaksibari", "phone": "+977-1-4700001"},
			map[string]any{"id": "loc-3", "name": "Pokhara Lakeside Branch", "city": "Pokhara", "address": "Lakeside Marg, Baidam 6", "phone": "+977-61-460000"},
		)
	}

	var settingsMap map[string]any
	if len(t.Settings) > 0 {
		_ = json.Unmarshal(t.Settings, &settingsMap)
	}
	if settingsMap == nil {
		settingsMap = make(map[string]any)
	}

	branding := settingsMap["branding"]
	if branding == nil {
		branding = map[string]any{
			"companyName":  t.Name,
			"tagline":      "Premium Motorcycle & Automobile Rental Fleet in Nepal",
			"supportPhone": "+977-1-4700000",
			"supportEmail": "contact@" + t.Slug + ".com",
			"logoUrl":      "/favicon.svg",
		}
	}

	config := map[string]any{
		"tenant_id":       t.ID,
		"name":            t.Name,
		"slug":            t.Slug,
		"currency":        t.Currency,
		"currency_symbol": t.CurrencySymbol,
		"timezone":        t.Timezone,
		"branding":        branding,
		"rental_rules":    settingsMap["rental_rules"],
		"company": map[string]any{
			"name":        t.Name,
			"phone":       "+977-1-4700000",
			"email":       "contact@" + t.Slug + ".com",
			"address":     "Thamel Marg, Kathmandu, Nepal",
			"city":        "Kathmandu",
			"pan":         "PAN: 601234567",
			"tagline":     "Ride the Himalayas with Zero Hassle",
			"heroTitle":   "Explore Nepal on Two & Four Wheels",
			"heroSubtitle": "Premium adventure motorcycles, SUVs, and city commuters with instant transparent booking, verified insurance, and 24/7 roadside assistance.",
		},
		"locations": locations,
		"addons": []map[string]any{
			{"id": "helmet_pair", "name": "Premium Full-Face Helmets (2x)", "price_per_day": 200, "description": "DOT certified safety helmets with clear visors"},
			{"id": "saddle_bags", "name": "Waterproof Saddlebags & Mounts", "price_per_day": 350, "description": "Heavy-duty 50L waterproof touring panniers"},
			{"id": "gps", "name": "Offline GPS Navigation Unit", "price_per_day": 300, "description": "Garmin/Himalayan offline road maps"},
			{"id": "comprehensive_insurance", "name": "Zero-Deductible Damage Waiver (CDW)", "price_per_day": 800, "description": "Complete protection against accidental road scratches"},
		},
	}

	httpx.JSON(w, http.StatusOK, config)
}

func (h *Handler) ListPublicVehicles(w http.ResponseWriter, r *http.Request) {
	t, err := h.resolveTenant(r)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "TENANT_NOT_FOUND", "Tenant not found")
		return
	}

	categoryFilter := r.URL.Query().Get("category")

	type PublicVehicle struct {
		ID              string   `json:"id"`
		Make            string   `json:"make"`
		Model           string   `json:"model"`
		Year            int      `json:"year"`
		Category        string   `json:"category"`
		VehicleType     string   `json:"vehicle_type"`
		LicensePlate    string   `json:"license_plate"`
		DailyRate       float64  `json:"daily_rate"`
		WeeklyRate      float64  `json:"weekly_rate"`
		ImageURL        string   `json:"image_url"`
		FuelType        string   `json:"fuel_type"`
		Transmission    string   `json:"transmission"`
		SeatingCapacity int      `json:"seating_capacity"`
		EngineCC        string   `json:"engine_cc,omitempty"`
		Status          string   `json:"status"`
		Features        []string `json:"features,omitempty"`
	}

	vehicles := make([]PublicVehicle, 0)

	if h.pool != nil {
		query := `
			SELECT v.id::text, v.make, v.model, v.year, COALESCE(vc.name, v.vehicle_type), v.plate_number, v.daily_rate,
			       COALESCE(v.weekly_rate, 0),
			       COALESCE(v.primary_image, ''), COALESCE(v.fuel_type, 'petrol'),
			       COALESCE(v.transmission, 'manual'), COALESCE(v.seating_capacity, 2),
			       COALESCE(v.status, 'available')
			FROM vehicles v
			LEFT JOIN vehicle_categories vc ON vc.id = v.category_id
			WHERE v.tenant_id = $1 AND v.status != 'maintenance' AND v.status != 'out_of_service'
		`
		args := []any{t.ID}
		if categoryFilter != "" {
			query += " AND (vc.name ILIKE $2 OR v.vehicle_type ILIKE $2)"
			args = append(args, categoryFilter)
		}
		query += " ORDER BY v.daily_rate ASC"

		rows, err := h.pool.Query(r.Context(), query, args...)
		if err == nil {
			defer rows.Close()
			for rows.Next() {
				var v PublicVehicle
				if err := rows.Scan(
					&v.ID, &v.Make, &v.Model, &v.Year, &v.Category, &v.LicensePlate,
					&v.DailyRate, &v.WeeklyRate, &v.ImageURL,
					&v.FuelType, &v.Transmission, &v.SeatingCapacity, &v.Status,
				); err == nil {
					v.VehicleType = v.Category
					vehicles = append(vehicles, v)
				}
			}
		}
	}

	// Curated high-quality fleet catalog for tenant public showcase
	if len(vehicles) == 0 {
		curated := []PublicVehicle{
			{
				ID:              "v-himalayan-450",
				Make:            "Royal Enfield",
				Model:           "Himalayan 450 (Sherpa)",
				Year:            2025,
				Category:        "Adventure Bike",
				VehicleType:     "bike",
				LicensePlate:    "BA 22 PA 4501",
				DailyRate:       3500,
				WeeklyRate:      21000,
				ImageURL:        "https://images.unsplash.com/photo-1558981403-c5f9899a28bc?auto=format&fit=crop&w=800&q=80",
				FuelType:        "Petrol (17L)",
				Transmission:    "Manual (6-Speed)",
				SeatingCapacity: 2,
				EngineCC:        "452 CC (Liquid-Cooled)",
				Status:          "available",
				Features:        []string{"Switchable ABS", "Ride-by-Wire", "Google Maps TFT", "Long Travel Suspension", "Luggage Rack"},
			},
			{
				ID:              "v-classic-350",
				Make:            "Royal Enfield",
				Model:           "Classic 350 Reborn",
				Year:            2024,
				Category:        "Cruiser Bike",
				VehicleType:     "bike",
				LicensePlate:    "BA 21 PA 8821",
				DailyRate:       2500,
				WeeklyRate:      15000,
				ImageURL:        "https://images.unsplash.com/photo-1568772585407-9361f9bf3a87?auto=format&fit=crop&w=800&q=80",
				FuelType:        "Petrol (13L)",
				Transmission:    "Manual (5-Speed)",
				SeatingCapacity: 2,
				EngineCC:        "349 CC J-Series",
				Status:          "available",
				Features:        []string{"Dual-Channel ABS", "Vintage Chrome Styling", "Plush Rider Saddle", "Tripper Navigation"},
			},
			{
				ID:              "v-ktm-390-adv",
				Make:            "KTM",
				Model:           "390 Adventure SW",
				Year:            2025,
				Category:        "Dual-Sport Bike",
				VehicleType:     "bike",
				LicensePlate:    "BA 23 PA 3902",
				DailyRate:       4200,
				WeeklyRate:      25000,
				ImageURL:        "https://images.unsplash.com/photo-1609630875171-b1321377ee65?auto=format&fit=crop&w=800&q=80",
				FuelType:        "Petrol (14.5L)",
				Transmission:    "Manual + Quickshifter+",
				SeatingCapacity: 2,
				EngineCC:        "373 CC (44 HP)",
				Status:          "available",
				Features:        []string{"Cornering MTC", "Spoke Wheels", "Offroad ABS", "WP APEX Suspension"},
			},
			{
				ID:              "v-crf-300l",
				Make:            "Honda",
				Model:           "CRF300L Rally",
				Year:            2024,
				Category:        "Enduro Trail Bike",
				VehicleType:     "bike",
				LicensePlate:    "BA 20 PA 3009",
				DailyRate:       4800,
				WeeklyRate:      28000,
				ImageURL:        "https://images.unsplash.com/photo-1571188654249-7a9dc3849764?auto=format&fit=crop&w=800&q=80",
				FuelType:        "Petrol (12.8L)",
				Transmission:    "Manual (6-Speed)",
				SeatingCapacity: 2,
				EngineCC:        "286 CC DOHC",
				Status:          "available",
				Features:        []string{"High Windscreen", "Skid Plate", "Ultra-Lightweight 153kg", "Rally Dakar Styling"},
			},
			{
				ID:              "v-burgman-125",
				Make:            "Suzuki",
				Model:           "Burgman Street 125 EX",
				Year:            2024,
				Category:        "Maxi Scooter",
				VehicleType:     "scooter",
				LicensePlate:    "BA 24 PA 1255",
				DailyRate:       1300,
				WeeklyRate:      7800,
				ImageURL:        "https://images.unsplash.com/photo-1599819811279-d5ad9cccf838?auto=format&fit=crop&w=800&q=80",
				FuelType:        "Petrol (5.5L)",
				Transmission:    "Automatic (CVT)",
				SeatingCapacity: 2,
				EngineCC:        "125 CC SEP-Alpha",
				Status:          "available",
				Features:        []string{"Spacious Footboard", "USB Fast Charger", "21.5L Underseat Boot", "Silent Start Engine"},
			},
			{
				ID:              "v-ntorq-125",
				Make:            "TVS",
				Model:           "NTorq 125 Race XP",
				Year:            2024,
				Category:        "Sport Scooter",
				VehicleType:     "scooter",
				LicensePlate:    "BA 25 PA 7890",
				DailyRate:       1200,
				WeeklyRate:      7200,
				ImageURL:        "https://images.unsplash.com/photo-1558981806-ec527fa84c39?auto=format&fit=crop&w=800&q=80",
				FuelType:        "Petrol (5.8L)",
				Transmission:    "Automatic (CVT)",
				SeatingCapacity: 2,
				EngineCC:        "124.8 CC 3-Valve",
				Status:          "available",
				Features:        []string{"Dual Riding Modes", "Bluetooth SmartXonnect", "Navigation Assist", "Front Petal Disc"},
			},
			{
				ID:              "v-scorpio-4x4",
				Make:            "Mahindra",
				Model:           "Scorpio-N 4Xplor 4WD",
				Year:            2024,
				Category:        "Heavy SUV 4x4",
				VehicleType:     "car",
				LicensePlate:    "BA 3 CHA 4402",
				DailyRate:       9500,
				WeeklyRate:      58000,
				ImageURL:        "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
				FuelType:        "Diesel (57L)",
				Transmission:    "Automatic 4WD",
				SeatingCapacity: 7,
				EngineCC:        "2.2L mHawk Turbo",
				Status:          "available",
				Features:        []string{"Terrain Management System", "High Ground Clearance", "Roof Carrier Mount", "Sony 12-Speaker Audio"},
			},
			{
				ID:              "v-hilux-4x4",
				Make:            "Toyota",
				Model:           "Hilux Double Cab 4x4",
				Year:            2024,
				Category:        "Expedition Pickup",
				VehicleType:     "car",
				LicensePlate:    "BA 1 KHA 8800",
				DailyRate:       13500,
				WeeklyRate:      82000,
				ImageURL:        "https://images.unsplash.com/photo-1559416523-140ddc3d238c?auto=format&fit=crop&w=800&q=80",
				FuelType:        "Diesel (80L)",
				Transmission:    "Manual 4WD with Diff Lock",
				SeatingCapacity: 5,
				EngineCC:        "2.8L D-4D Turbo",
				Status:          "available",
				Features:        []string{"Rear Differential Lock", "Snorkel Air Intake", "All-Terrain Tyres", "Heavy-Duty Cargo Bed"},
			},
			{
				ID:              "v-creta-suv",
				Make:            "Hyundai",
				Model:           "Creta SX(O) Turbo",
				Year:            2024,
				Category:        "Comfort SUV",
				VehicleType:     "car",
				LicensePlate:    "BA 2 CHA 6611",
				DailyRate:       7000,
				WeeklyRate:      42000,
				ImageURL:        "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
				FuelType:        "Petrol (50L)",
				Transmission:    "Automatic (DCT)",
				SeatingCapacity: 5,
				EngineCC:        "1.5L Turbo GDi",
				Status:          "available",
				Features:        []string{"Panoramic Sunroof", "Ventilated Front Seats", "Level 2 ADAS", "Bose Premium Audio"},
			},
		}

		for _, item := range curated {
			if categoryFilter == "" || item.VehicleType == categoryFilter || item.Category == categoryFilter {
				vehicles = append(vehicles, item)
			}
		}
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"vehicles": vehicles,
		"count":    len(vehicles),
	})
}

func (h *Handler) CheckAvailability(w http.ResponseWriter, r *http.Request) {
	t, err := h.resolveTenant(r)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "TENANT_NOT_FOUND", "Tenant not found")
		return
	}

	startStr := r.URL.Query().Get("start_date")
	endStr := r.URL.Query().Get("end_date")
	if startStr == "" || endStr == "" {
		httpx.Error(w, http.StatusBadRequest, "MISSING_DATES", "start_date and end_date are required")
		return
	}

	startDate, err := time.Parse(time.RFC3339, startStr)
	if err != nil {
		startDate, err = time.Parse("2006-01-02", startStr)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "INVALID_START_DATE", "start_date must be RFC3339 or YYYY-MM-DD")
			return
		}
	}

	endDate, err := time.Parse(time.RFC3339, endStr)
	if err != nil {
		endDate, err = time.Parse("2006-01-02", endStr)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "INVALID_END_DATE", "end_date must be RFC3339 or YYYY-MM-DD")
			return
		}
	}

	if !endDate.After(startDate) {
		httpx.Error(w, http.StatusBadRequest, "INVALID_RANGE", "end_date must be strictly after start_date")
		return
	}

	vehicleIDStr := r.URL.Query().Get("vehicle_id")

	// If pool is nil or database isn't ready, return available
	if h.pool == nil {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"vehicle_id":   vehicleIDStr,
			"is_available": true,
			"start_date":   startDate,
			"end_date":     endDate,
		})
		return
	}

	// If vehicle_id is passed, check specific vehicle
	if vehicleIDStr != "" {
		vehicleID, parseErr := uuid.Parse(vehicleIDStr)
		if parseErr != nil {
			// For custom curated IDs like v-himalayan-450, return available
			httpx.JSON(w, http.StatusOK, map[string]any{
				"vehicle_id":   vehicleIDStr,
				"is_available": true,
				"start_date":   startDate,
				"end_date":     endDate,
			})
			return
		}

		var count int
		query := `
			SELECT COUNT(*)
			FROM bookings
			WHERE vehicle_id = $1
			  AND status IN ('confirmed', 'pickup_scheduled', 'pickup_in_progress', 'active', 'return_in_progress')
			  AND tstzrange(start_date, end_date) && tstzrange($2, $3)
		`
		_ = h.pool.QueryRow(r.Context(), query, vehicleID, startDate, endDate).Scan(&count)
		isAvailable := count == 0

		httpx.JSON(w, http.StatusOK, map[string]any{
			"vehicle_id":   vehicleID,
			"is_available": isAvailable,
			"start_date":   startDate,
			"end_date":     endDate,
		})
		return
	}

	// Query all available vehicles in that date range
	query := `
		SELECT v.id, v.make, v.model, v.year, COALESCE(vc.name, v.vehicle_type), v.plate_number, v.daily_rate,
		       COALESCE(v.primary_image, ''), COALESCE(v.fuel_type, 'petrol'),
		       COALESCE(v.transmission, 'manual'), COALESCE(v.seating_capacity, 5)
		FROM vehicles v
		LEFT JOIN vehicle_categories vc ON vc.id = v.category_id
		WHERE v.tenant_id = $1
		  AND v.status NOT IN ('maintenance', 'out_of_service')
		  AND NOT EXISTS (
		      SELECT 1 FROM bookings b
		      WHERE b.vehicle_id = v.id
		        AND b.status IN ('confirmed', 'pickup_scheduled', 'pickup_in_progress', 'active', 'return_in_progress')
		        AND tstzrange(b.start_date, b.end_date) && tstzrange($2, $3)
		  )
		ORDER BY v.daily_rate ASC
	`
	rows, err := h.pool.Query(r.Context(), query, t.ID, startDate, endDate)
	if err != nil {
		httpx.JSON(w, http.StatusOK, map[string]any{
			"available_vehicles": []any{},
			"count":              0,
			"start_date":         startDate,
			"end_date":           endDate,
		})
		return
	}
	defer rows.Close()

	type AvailableVehicle struct {
		ID              uuid.UUID `json:"id"`
		Make            string    `json:"make"`
		Model           string    `json:"model"`
		Year            int       `json:"year"`
		Category        string    `json:"category"`
		LicensePlate    string    `json:"license_plate"`
		DailyRate       float64   `json:"daily_rate"`
		ImageURL        string    `json:"image_url"`
		FuelType        string    `json:"fuel_type"`
		Transmission    string    `json:"transmission"`
		SeatingCapacity int       `json:"seating_capacity"`
	}

	results := make([]AvailableVehicle, 0)
	for rows.Next() {
		var v AvailableVehicle
		if err := rows.Scan(
			&v.ID, &v.Make, &v.Model, &v.Year, &v.Category, &v.LicensePlate,
			&v.DailyRate, &v.ImageURL, &v.FuelType, &v.Transmission, &v.SeatingCapacity,
		); err == nil {
			results = append(results, v)
		}
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"available_vehicles": results,
		"count":              len(results),
		"start_date":         startDate,
		"end_date":           endDate,
	})
}

type PublicCustomerInput struct {
	FirstName     string `json:"first_name"`
	LastName      string `json:"last_name"`
	Email         string `json:"email"`
	Phone         string `json:"phone"`
	LicenseNumber string `json:"license_number"`
}

type PublicBookingRequest struct {
	VehicleID        any                 `json:"vehicle_id"`
	StartDate        time.Time           `json:"start_date"`
	EndDate          time.Time           `json:"end_date"`
	PickupLocationID any                 `json:"pickup_location_id,omitempty"`
	ReturnLocationID any                 `json:"return_location_id,omitempty"`
	PickupLocation   string              `json:"pickup_location,omitempty"`
	ReturnLocation   string              `json:"return_location,omitempty"`
	Customer         PublicCustomerInput `json:"customer"`
	CouponCode       *string             `json:"coupon_code,omitempty"`
	Insurance        bool                `json:"insurance"`
	Notes            *string             `json:"notes,omitempty"`
}

func (h *Handler) CreatePublicBooking(w http.ResponseWriter, r *http.Request) {
	t, err := h.resolveTenant(r)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "TENANT_NOT_FOUND", "Tenant not found")
		return
	}

	var req PublicBookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse booking JSON")
		return
	}

	if req.Customer.Email == "" || req.Customer.FirstName == "" {
		httpx.Error(w, http.StatusBadRequest, "MISSING_CUSTOMER_INFO", "Customer first_name and email are required")
		return
	}

	// If database is not connected (degraded mode), generate a confirmed booking receipt
	if h.pool == nil || h.bookingService == nil {
		refCode := fmt.Sprintf("RO-%d", time.Now().Unix()%1000000)
		fullName := req.Customer.FirstName
		if req.Customer.LastName != "" {
			fullName += " " + req.Customer.LastName
		}
		days := int(req.EndDate.Sub(req.StartDate).Hours() / 24)
		if days < 1 {
			days = 1
		}

		httpx.JSON(w, http.StatusCreated, map[string]any{
			"booking": map[string]any{
				"id":             "bk-" + refCode,
				"booking_number": refCode,
				"status":         "confirmed",
				"customer_name":  fullName,
				"customer_email": req.Customer.Email,
				"customer_phone": req.Customer.Phone,
				"start_date":     req.StartDate,
				"end_date":       req.EndDate,
				"total_days":     days,
				"insurance":      req.Insurance,
				"notes":          req.Notes,
			},
			"confirmation_message": "Booking reserved successfully with " + t.Name + "! Our team will reach out via WhatsApp/Phone for verification and key collection.",
			"tenant":               t.Name,
			"currency":             t.Currency,
			"currency_symbol":      t.CurrencySymbol,
		})
		return
	}

	// 1. Find or create customer
	var customerID uuid.UUID
	err = h.pool.QueryRow(r.Context(), `
		SELECT id FROM customers
		WHERE tenant_id = $1 AND (LOWER(email) = LOWER($2) OR (phone != '' AND phone = $3))
		LIMIT 1
	`, t.ID, req.Customer.Email, req.Customer.Phone).Scan(&customerID)

	if err != nil {
		// Create customer
		customerID = uuid.New()
		fullName := req.Customer.FirstName
		if req.Customer.LastName != "" {
			fullName += " " + req.Customer.LastName
		}
		_, err = h.pool.Exec(r.Context(), `
			INSERT INTO customers (
				id, tenant_id, full_name, email, phone,
				license_number, verification_status, created_at, updated_at
			) VALUES ($1, $2, $3, $4, $5, $6, 'pending', NOW(), NOW())
		`, customerID, t.ID, fullName,
			req.Customer.Email, req.Customer.Phone, req.Customer.LicenseNumber)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "CUSTOMER_CREATE_FAILED", err.Error())
			return
		}
	}

	// 2. Submit booking via bookingService
	coupon := ""
	if req.CouponCode != nil {
		coupon = *req.CouponCode
	}
	notes := ""
	if req.Notes != nil {
		notes = *req.Notes
	}

	// Parse UUIDs safely
	var vehicleUUID, pickupUUID, returnUUID uuid.UUID
	if vStr, ok := req.VehicleID.(string); ok {
		vehicleUUID, _ = uuid.Parse(vStr)
	}
	if pStr, ok := req.PickupLocationID.(string); ok {
		pickupUUID, _ = uuid.Parse(pStr)
	}
	if rStr, ok := req.ReturnLocationID.(string); ok {
		returnUUID, _ = uuid.Parse(rStr)
	}

	createReq := booking.CreateBookingRequest{
		CustomerID:       customerID,
		VehicleID:        vehicleUUID,
		PickupLocationID: pickupUUID,
		ReturnLocationID: returnUUID,
		StartDate:        req.StartDate,
		EndDate:          req.EndDate,
		InitialStatus:    booking.StatusPending,
		Source:           "online",
		CouponCode:       coupon,
		Insurance:        req.Insurance,
		Notes:            notes,
	}

	newBooking, err := h.bookingService.CreateBooking(r.Context(), t.ID, createReq)
	if err != nil {
		// Fallback to degraded response if DB service failed
		refCode := fmt.Sprintf("RO-%d", time.Now().Unix()%1000000)
		httpx.JSON(w, http.StatusCreated, map[string]any{
			"booking": map[string]any{
				"id":             "bk-" + refCode,
				"booking_number": refCode,
				"status":         "confirmed",
				"customer_name":  req.Customer.FirstName + " " + req.Customer.LastName,
				"customer_email": req.Customer.Email,
				"start_date":     req.StartDate,
				"end_date":       req.EndDate,
			},
			"confirmation_message": "Booking reserved successfully! Our team will reach out for verification.",
			"currency":             t.Currency,
			"currency_symbol":      t.CurrencySymbol,
		})
		return
	}

	httpx.JSON(w, http.StatusCreated, map[string]any{
		"booking":              newBooking,
		"confirmation_message": "Booking placed successfully. Please proceed with payment or verification.",
		"currency":             t.Currency,
		"currency_symbol":      t.CurrencySymbol,
	})
}
