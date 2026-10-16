package vehicle

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rental/backend/pkg/pagination"
)

var (
	ErrNotFound = errors.New("resource not found")
)

type Service struct {
	pool              *pgxpool.Pool
	mu                sync.RWMutex
	inMemoryLocations map[uuid.UUID][]Location
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{
		pool:              pool,
		inMemoryLocations: make(map[uuid.UUID][]Location),
	}
}

// --- Locations ---

func (s *Service) ListLocations(ctx context.Context, tenantID uuid.UUID) ([]Location, error) {
	if s.pool == nil {
		s.mu.RLock()
		defer s.mu.RUnlock()
		if locs, ok := s.inMemoryLocations[tenantID]; ok && len(locs) > 0 {
			res := make([]Location, len(locs))
			copy(res, locs)
			return res, nil
		}
		return []Location{}, nil
	}
	query := `
		SELECT l.id, l.tenant_id, l.name, l.code, l.address, l.city, l.country, COALESCE(l.phone, ''), l.is_active,
		       COALESCE((SELECT COUNT(*) FROM vehicles v WHERE v.location_id = l.id AND v.tenant_id = l.tenant_id), 0) AS active_vehicles_count,
		       l.created_at, l.updated_at
		FROM locations l
		WHERE l.tenant_id = $1
		ORDER BY l.name ASC
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]Location, 0)
	for rows.Next() {
		var l Location
		if err := rows.Scan(&l.ID, &l.TenantID, &l.Name, &l.Code, &l.Address, &l.City, &l.Country, &l.Phone, &l.IsActive, &l.ActiveVehiclesCount, &l.CreatedAt, &l.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, l)
	}

	// If tenant has no locations yet, auto-seed standard Nepal station hubs
	if len(list) == 0 {
		defaults := []struct {
			name, code, city, address, phone string
		}{
			{"Kathmandu Central Hub (HQ)", "KTM-HQ", "Kathmandu", "Kantipath, Near Garden of Dreams, Kathmandu", "+977 1-4428901"},
			{"Pokhara Lakeside Branch", "PKR-01", "Pokhara", "Baidam, Lakeside-6, Pokhara, Kaski", "+977 61-523190"},
			{"Tribhuvan Int. Airport Station", "TIA-ARR", "Kathmandu", "Arrival Terminal Lane, TIA Airport, Ring Road", "+977 9801239912"},
			{"Chitwan Sauraha Station", "CHW-01", "Sauraha / Chitwan", "Hatti Chowk, Sauraha, Chitwan National Park Entrance", "+977 56-580122"},
			{"Lalitpur Patan Service Station", "LTR-01", "Lalitpur", "Jhamsikhel Road, Lalitpur-3, Bagmati", "+977 1-5542899"},
		}

		for _, d := range defaults {
			newID := uuid.New()
			insQuery := `
				INSERT INTO locations (id, tenant_id, name, code, address, city, country, phone, is_active)
				VALUES ($1, $2, $3, $4, $5, $6, 'Nepal', $7, true)
				ON CONFLICT (id) DO NOTHING
				RETURNING id, tenant_id, name, code, address, city, country, COALESCE(phone, ''), is_active, created_at, updated_at
			`
			var l Location
			if err := s.pool.QueryRow(ctx, insQuery, newID, tenantID, d.name, d.code, d.address, d.city, d.phone).Scan(
				&l.ID, &l.TenantID, &l.Name, &l.Code, &l.Address, &l.City, &l.Country, &l.Phone, &l.IsActive, &l.CreatedAt, &l.UpdatedAt,
			); err == nil {
				l.ActiveVehiclesCount = 0
				list = append(list, l)
			}
		}
	}

	return list, nil
}

func (s *Service) CreateLocation(ctx context.Context, tenantID uuid.UUID, req CreateLocationRequest) (*Location, error) {
	id := uuid.New()
	country := req.Country
	if country == "" {
		country = "Nepal"
	}

	if s.pool == nil {
		now := time.Now().UTC()
		loc := &Location{
			ID:                  id,
			TenantID:            tenantID,
			Name:                req.Name,
			Code:                req.Code,
			Address:             req.Address,
			City:                req.City,
			Country:             country,
			Phone:               req.Phone,
			IsActive:            req.IsActive,
			ActiveVehiclesCount: 0,
			CreatedAt:           now,
			UpdatedAt:           now,
		}
		s.mu.Lock()
		if s.inMemoryLocations == nil {
			s.inMemoryLocations = make(map[uuid.UUID][]Location)
		}
		s.inMemoryLocations[tenantID] = append(s.inMemoryLocations[tenantID], *loc)
		s.mu.Unlock()
		return loc, nil
	}

	query := `
		INSERT INTO locations (id, tenant_id, name, code, address, city, country, phone, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, tenant_id, name, code, address, city, country, COALESCE(phone, ''), is_active, created_at, updated_at
	`
	var l Location
	err := s.pool.QueryRow(ctx, query, id, tenantID, req.Name, req.Code, req.Address, req.City, country, req.Phone, req.IsActive).Scan(
		&l.ID, &l.TenantID, &l.Name, &l.Code, &l.Address, &l.City, &l.Country, &l.Phone, &l.IsActive, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	l.ActiveVehiclesCount = 0
	return &l, nil
}

func (s *Service) UpdateLocation(ctx context.Context, tenantID, locationID uuid.UUID, req UpdateLocationRequest) (*Location, error) {
	if s.pool == nil {
		s.mu.Lock()
		defer s.mu.Unlock()
		if locs, ok := s.inMemoryLocations[tenantID]; ok {
			for i := range locs {
				if locs[i].ID == locationID {
					if req.Name != "" {
						locs[i].Name = req.Name
					}
					if req.Code != "" {
						locs[i].Code = req.Code
					}
					if req.Address != "" {
						locs[i].Address = req.Address
					}
					if req.City != "" {
						locs[i].City = req.City
					}
					if req.Country != "" {
						locs[i].Country = req.Country
					}
					if req.Phone != "" {
						locs[i].Phone = req.Phone
					}
					if req.IsActive != nil {
						locs[i].IsActive = *req.IsActive
					}
					locs[i].UpdatedAt = time.Now().UTC()
					return &locs[i], nil
				}
			}
		}
		return nil, ErrNotFound
	}

	query := `
		UPDATE locations
		SET name = COALESCE(NULLIF($3, ''), name),
		    code = COALESCE(NULLIF($4, ''), code),
		    address = COALESCE(NULLIF($5, ''), address),
		    city = COALESCE(NULLIF($6, ''), city),
		    country = COALESCE(NULLIF($7, ''), country),
		    phone = COALESCE(NULLIF($8, ''), phone),
		    is_active = COALESCE($9, is_active),
		    updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, name, code, address, city, country, COALESCE(phone, ''), is_active, created_at, updated_at
	`
	var l Location
	err := s.pool.QueryRow(ctx, query, locationID, tenantID, req.Name, req.Code, req.Address, req.City, req.Country, req.Phone, req.IsActive).Scan(
		&l.ID, &l.TenantID, &l.Name, &l.Code, &l.Address, &l.City, &l.Country, &l.Phone, &l.IsActive, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM vehicles WHERE location_id = $1 AND tenant_id = $2`, locationID, tenantID).Scan(&l.ActiveVehiclesCount)
	return &l, nil
}

func (s *Service) DeleteLocation(ctx context.Context, tenantID, locationID uuid.UUID) error {
	if s.pool == nil {
		s.mu.Lock()
		defer s.mu.Unlock()
		if locs, ok := s.inMemoryLocations[tenantID]; ok {
			filtered := make([]Location, 0, len(locs))
			for _, l := range locs {
				if l.ID != locationID {
					filtered = append(filtered, l)
				}
			}
			s.inMemoryLocations[tenantID] = filtered
		}
		return nil
	}

	var count int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM vehicles WHERE location_id = $1 AND tenant_id = $2`, locationID, tenantID).Scan(&count)
	if err == nil && count > 0 {
		return fmt.Errorf("cannot delete station: %d active vehicles are currently assigned to this hub", count)
	}

	tag, err := s.pool.Exec(ctx, `DELETE FROM locations WHERE id = $1 AND tenant_id = $2`, locationID, tenantID)
	if err != nil {
		// If foreign key constraint from historical bookings, soft delete by setting is_active = false
		_, err2 := s.pool.Exec(ctx, `UPDATE locations SET is_active = false WHERE id = $1 AND tenant_id = $2`, locationID, tenantID)
		return err2
	}
	if tag.RowsAffected() == 0 {
		return errors.New("location not found")
	}
	return nil
}

// --- Categories ---

func (s *Service) ListCategories(ctx context.Context, tenantID uuid.UUID) ([]Category, error) {
	if s.pool == nil {
		return []Category{}, nil
	}
	query := `
		SELECT id, tenant_id, name, slug, vehicle_type, base_daily_rate, COALESCE(description, ''), created_at, updated_at
		FROM vehicle_categories
		WHERE tenant_id = $1
		ORDER BY base_daily_rate ASC
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]Category, 0)
	for rows.Next() {
		var c Category
		if err := rows.Scan(&c.ID, &c.TenantID, &c.Name, &c.Slug, &c.VehicleType, &c.BaseDailyRate, &c.Description, &c.CreatedAt, &c.UpdatedAt); err != nil {
			return nil, err
		}
		list = append(list, c)
	}

	// If tenant has no categories yet, auto-seed standard categories
	if len(list) == 0 {
		defaults := []struct {
			name        string
			slug        string
			vehicleType string
			rate        float64
			desc        string
		}{
			{"Standard Sedan", "standard-sedan", "car", 4500.0, "Economical 5-seater sedan with AC"},
			{"Compact SUV & 4x4", "compact-suv-4x4", "car", 6500.0, "All-terrain high clearance 4WD SUV"},
			{"Adventure Motorcycle", "adventure-motorcycle", "bike", 2500.0, "Touring & off-road motorbike with disc brakes"},
			{"City Commuter Scooter", "city-commuter-scooter", "scooter", 1500.0, "Fuel-efficient automatic scooter with helmet"},
			{"Tourist Minibus & Van", "tourist-minibus-van", "van", 9500.0, "Spacious 12-14 seater passenger van"},
		}

		for _, d := range defaults {
			newID := uuid.New()
			insQuery := `
				INSERT INTO vehicle_categories (id, tenant_id, name, slug, vehicle_type, base_daily_rate, description)
				VALUES ($1, $2, $3, $4, $5, $6, $7)
				ON CONFLICT (id) DO NOTHING
				RETURNING id, tenant_id, name, slug, vehicle_type, base_daily_rate, COALESCE(description, ''), created_at, updated_at
			`
			var c Category
			if err := s.pool.QueryRow(ctx, insQuery, newID, tenantID, d.name, d.slug, d.vehicleType, d.rate, d.desc).Scan(
				&c.ID, &c.TenantID, &c.Name, &c.Slug, &c.VehicleType, &c.BaseDailyRate, &c.Description, &c.CreatedAt, &c.UpdatedAt,
			); err == nil {
				list = append(list, c)
			}
		}
	}

	return list, nil
}

func (s *Service) CreateCategory(ctx context.Context, tenantID uuid.UUID, req CreateCategoryRequest) (*Category, error) {
	id := uuid.New()
	slug := req.Slug
	if slug == "" {
		slug = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(req.Name), " ", "-"))
	}
	query := `
		INSERT INTO vehicle_categories (id, tenant_id, name, slug, vehicle_type, base_daily_rate, description)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, tenant_id, name, slug, vehicle_type, base_daily_rate, COALESCE(description, ''), created_at, updated_at
	`
	var c Category
	err := s.pool.QueryRow(ctx, query, id, tenantID, req.Name, slug, req.VehicleType, req.BaseDailyRate, req.Description).Scan(
		&c.ID, &c.TenantID, &c.Name, &c.Slug, &c.VehicleType, &c.BaseDailyRate, &c.Description, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *Service) UpdateCategory(ctx context.Context, tenantID uuid.UUID, id uuid.UUID, req UpdateCategoryRequest) (*Category, error) {
	slug := req.Slug
	if slug == "" && req.Name != "" {
		slug = strings.ToLower(strings.ReplaceAll(strings.TrimSpace(req.Name), " ", "-"))
	}
	query := `
		UPDATE vehicle_categories
		SET name = COALESCE(NULLIF($3, ''), name),
		    slug = COALESCE(NULLIF($4, ''), slug),
		    vehicle_type = COALESCE(NULLIF($5, ''), vehicle_type),
		    base_daily_rate = CASE WHEN $6 > 0 THEN $6 ELSE base_daily_rate END,
		    description = COALESCE(NULLIF($7, ''), description),
		    updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
		RETURNING id, tenant_id, name, slug, vehicle_type, base_daily_rate, COALESCE(description, ''), created_at, updated_at
	`
	var c Category
	err := s.pool.QueryRow(ctx, query, id, tenantID, req.Name, slug, req.VehicleType, req.BaseDailyRate, req.Description).Scan(
		&c.ID, &c.TenantID, &c.Name, &c.Slug, &c.VehicleType, &c.BaseDailyRate, &c.Description, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *Service) DeleteCategory(ctx context.Context, tenantID uuid.UUID, id uuid.UUID) error {
	var count int
	_ = s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM vehicles WHERE category_id = $1 AND tenant_id = $2`, id, tenantID).Scan(&count)
	if count > 0 {
		return errors.New("cannot delete category because active vehicles are assigned to it")
	}

	tag, err := s.pool.Exec(ctx, `DELETE FROM vehicle_categories WHERE id = $1 AND tenant_id = $2`, id, tenantID)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return errors.New("category not found")
	}
	return nil
}

// --- Vehicles ---

func (s *Service) ListVehicles(ctx context.Context, tenantID uuid.UUID, status, vehicleType string, p pagination.Params) ([]Vehicle, pagination.Meta, error) {
	if s.pool == nil {
		return []Vehicle{}, pagination.BuildMeta(0, p), nil
	}
	where := "WHERE v.tenant_id = $1"
	args := []any{tenantID}
	argIdx := 2

	if status != "" {
		where += fmt.Sprintf(" AND v.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	if vehicleType != "" {
		where += fmt.Sprintf(" AND v.vehicle_type = $%d", argIdx)
		args = append(args, vehicleType)
		argIdx++
	}

	if p.Search != "" {
		where += fmt.Sprintf(" AND (LOWER(v.make) LIKE LOWER($%d) OR LOWER(v.model) LIKE LOWER($%d) OR LOWER(v.plate_number) LIKE LOWER($%d))", argIdx, argIdx, argIdx)
		args = append(args, "%"+p.Search+"%")
		argIdx++
	}

	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM vehicles v %s", where)
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, pagination.Meta{}, err
	}

	query := fmt.Sprintf(`
		SELECT 
			v.id, v.tenant_id, v.category_id, c.name, v.location_id, l.name,
			v.make, v.model, v.year, v.plate_number, v.vehicle_type, v.status,
			v.odometer, v.fuel_type, v.transmission, v.seating_capacity, COALESCE(v.primary_image, ''),
			v.daily_rate, v.weekly_rate, v.monthly_rate, v.deposit_amount, v.allowed_km_per_day, v.extra_km_rate,
			v.specs, COALESCE(v.notes, ''), v.created_at, v.updated_at
		FROM vehicles v
		JOIN vehicle_categories c ON c.id = v.category_id
		JOIN locations l ON l.id = v.location_id
		%s
		ORDER BY v.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, p.Limit, p.Offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	defer rows.Close()

	list := make([]Vehicle, 0)
	for rows.Next() {
		var v Vehicle
		if err := rows.Scan(
			&v.ID, &v.TenantID, &v.CategoryID, &v.CategoryName, &v.LocationID, &v.LocationName,
			&v.Make, &v.Model, &v.Year, &v.PlateNumber, &v.VehicleType, &v.Status,
			&v.Odometer, &v.FuelType, &v.Transmission, &v.SeatingCapacity, &v.PrimaryImage,
			&v.DailyRate, &v.WeeklyRate, &v.MonthlyRate, &v.DepositAmount, &v.AllowedKmPerDay, &v.ExtraKmRate,
			&v.Specs, &v.Notes, &v.CreatedAt, &v.UpdatedAt,
		); err != nil {
			return nil, pagination.Meta{}, err
		}
		list = append(list, v)
	}

	return list, pagination.BuildMeta(total, p), nil
}

func (s *Service) GetVehicle(ctx context.Context, tenantID, vehicleID uuid.UUID) (*Vehicle, error) {
	query := `
		SELECT 
			v.id, v.tenant_id, v.category_id, c.name, v.location_id, l.name,
			v.make, v.model, v.year, v.plate_number, v.vehicle_type, v.status,
			v.odometer, v.fuel_type, v.transmission, v.seating_capacity, COALESCE(v.primary_image, ''),
			v.daily_rate, v.weekly_rate, v.monthly_rate, v.deposit_amount, v.allowed_km_per_day, v.extra_km_rate,
			v.specs, COALESCE(v.notes, ''), v.created_at, v.updated_at
		FROM vehicles v
		JOIN vehicle_categories c ON c.id = v.category_id
		JOIN locations l ON l.id = v.location_id
		WHERE v.tenant_id = $1 AND v.id = $2
	`
	var v Vehicle
	err := s.pool.QueryRow(ctx, query, tenantID, vehicleID).Scan(
		&v.ID, &v.TenantID, &v.CategoryID, &v.CategoryName, &v.LocationID, &v.LocationName,
		&v.Make, &v.Model, &v.Year, &v.PlateNumber, &v.VehicleType, &v.Status,
		&v.Odometer, &v.FuelType, &v.Transmission, &v.SeatingCapacity, &v.PrimaryImage,
		&v.DailyRate, &v.WeeklyRate, &v.MonthlyRate, &v.DepositAmount, &v.AllowedKmPerDay, &v.ExtraKmRate,
		&v.Specs, &v.Notes, &v.CreatedAt, &v.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}
	return &v, nil
}

func (s *Service) CreateVehicle(ctx context.Context, tenantID uuid.UUID, req CreateVehicleRequest) (*Vehicle, error) {
	id := uuid.New()
	status := req.Status
	if status == "" {
		status = "available"
	}
	specs := req.Specs
	if len(specs) == 0 {
		specs = json.RawMessage("{}")
	}

	categoryID := req.CategoryID
	if categoryID == uuid.Nil {
		cats, err := s.ListCategories(ctx, tenantID)
		if err == nil && len(cats) > 0 {
			categoryID = cats[0].ID
		}
	}

	locationID := req.LocationID
	if locationID == uuid.Nil {
		locs, err := s.ListLocations(ctx, tenantID)
		if err == nil && len(locs) > 0 {
			locationID = locs[0].ID
		}
	}

	if s.pool == nil {
		now := time.Now().UTC()
		return &Vehicle{
			ID:              id,
			TenantID:        tenantID,
			CategoryID:      categoryID,
			CategoryName:    "Standard",
			LocationID:      locationID,
			LocationName:    "Kathmandu HQ",
			Make:            req.Make,
			Model:           req.Model,
			Year:            req.Year,
			PlateNumber:     req.PlateNumber,
			VehicleType:     req.VehicleType,
			Status:          status,
			Odometer:        req.Odometer,
			FuelType:        req.FuelType,
			Transmission:    req.Transmission,
			SeatingCapacity: req.SeatingCapacity,
			PrimaryImage:    req.PrimaryImage,
			DailyRate:       req.DailyRate,
			WeeklyRate:      req.WeeklyRate,
			MonthlyRate:     req.MonthlyRate,
			DepositAmount:   req.DepositAmount,
			AllowedKmPerDay: req.AllowedKmPerDay,
			ExtraKmRate:     req.ExtraKmRate,
			Specs:           specs,
			Notes:           req.Notes,
			CreatedAt:       now,
			UpdatedAt:       now,
		}, nil
	}

	query := `
		INSERT INTO vehicles (
			id, tenant_id, category_id, location_id, make, model, year, plate_number, vehicle_type,
			status, odometer, fuel_type, transmission, seating_capacity, primary_image,
			daily_rate, weekly_rate, monthly_rate, deposit_amount, allowed_km_per_day, extra_km_rate,
			specs, notes
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23)
	`
	_, err := s.pool.Exec(ctx, query,
		id, tenantID, categoryID, locationID, req.Make, req.Model, req.Year, req.PlateNumber, req.VehicleType,
		status, req.Odometer, req.FuelType, req.Transmission, req.SeatingCapacity, req.PrimaryImage,
		req.DailyRate, req.WeeklyRate, req.MonthlyRate, req.DepositAmount, req.AllowedKmPerDay, req.ExtraKmRate,
		specs, req.Notes,
	)
	if err != nil {
		return nil, err
	}

	return s.GetVehicle(ctx, tenantID, id)
}

func (s *Service) UpdateVehicle(ctx context.Context, tenantID, vehicleID uuid.UUID, req UpdateVehicleRequest) (*Vehicle, error) {
	current, err := s.GetVehicle(ctx, tenantID, vehicleID)
	if err != nil {
		return nil, err
	}

	if req.CategoryID != nil {
		current.CategoryID = *req.CategoryID
	}
	if req.LocationID != nil {
		current.LocationID = *req.LocationID
	}
	if req.Make != nil {
		current.Make = *req.Make
	}
	if req.Model != nil {
		current.Model = *req.Model
	}
	if req.Year != nil {
		current.Year = *req.Year
	}
	if req.PlateNumber != nil {
		current.PlateNumber = *req.PlateNumber
	}
	if req.VehicleType != nil {
		current.VehicleType = *req.VehicleType
	}
	if req.Status != nil {
		current.Status = *req.Status
	}
	if req.Odometer != nil {
		current.Odometer = *req.Odometer
	}
	if req.FuelType != nil {
		current.FuelType = *req.FuelType
	}
	if req.Transmission != nil {
		current.Transmission = *req.Transmission
	}
	if req.SeatingCapacity != nil {
		current.SeatingCapacity = *req.SeatingCapacity
	}
	if req.PrimaryImage != nil {
		current.PrimaryImage = *req.PrimaryImage
	}
	if req.DailyRate != nil {
		current.DailyRate = *req.DailyRate
	}
	if req.WeeklyRate != nil {
		current.WeeklyRate = *req.WeeklyRate
	}
	if req.MonthlyRate != nil {
		current.MonthlyRate = *req.MonthlyRate
	}
	if req.DepositAmount != nil {
		current.DepositAmount = *req.DepositAmount
	}
	if req.AllowedKmPerDay != nil {
		current.AllowedKmPerDay = *req.AllowedKmPerDay
	}
	if req.ExtraKmRate != nil {
		current.ExtraKmRate = *req.ExtraKmRate
	}
	if req.Specs != nil {
		current.Specs = *req.Specs
	}
	if req.Notes != nil {
		current.Notes = *req.Notes
	}

	query := `
		UPDATE vehicles
		SET 
			category_id = $1, location_id = $2, make = $3, model = $4, year = $5, plate_number = $6,
			vehicle_type = $7, status = $8, odometer = $9, fuel_type = $10, transmission = $11,
			seating_capacity = $12, primary_image = $13, daily_rate = $14, weekly_rate = $15, monthly_rate = $16,
			deposit_amount = $17, allowed_km_per_day = $18, extra_km_rate = $19, specs = $20, notes = $21, updated_at = NOW()
		WHERE tenant_id = $22 AND id = $23
	`
	_, err = s.pool.Exec(ctx, query,
		current.CategoryID, current.LocationID, current.Make, current.Model, current.Year, current.PlateNumber,
		current.VehicleType, current.Status, current.Odometer, current.FuelType, current.Transmission,
		current.SeatingCapacity, current.PrimaryImage, current.DailyRate, current.WeeklyRate, current.MonthlyRate,
		current.DepositAmount, current.AllowedKmPerDay, current.ExtraKmRate, current.Specs, current.Notes,
		tenantID, vehicleID,
	)
	if err != nil {
		return nil, err
	}

	return s.GetVehicle(ctx, tenantID, vehicleID)
}

func (s *Service) DeleteVehicle(ctx context.Context, tenantID, vehicleID uuid.UUID) error {
	cmd, err := s.pool.Exec(ctx, "DELETE FROM vehicles WHERE tenant_id = $1 AND id = $2", tenantID, vehicleID)
	if err != nil {
		return err
	}
	if cmd.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// --- Availability Engine ---

func (s *Service) CheckAvailability(ctx context.Context, tenantID uuid.UUID, q AvailabilityQuery) ([]Vehicle, error) {
	if q.StartDate.IsZero() || q.EndDate.IsZero() || !q.EndDate.After(q.StartDate) {
		return nil, errors.New("valid start_date and end_date (end > start) are required")
	}

	// Query vehicles that are NOT out_of_service/maintenance AND have NO overlapping confirmed/active bookings
	query := `
		SELECT 
			v.id, v.tenant_id, v.category_id, c.name, v.location_id, l.name,
			v.make, v.model, v.year, v.plate_number, v.vehicle_type, v.status,
			v.odometer, v.fuel_type, v.transmission, v.seating_capacity, COALESCE(v.primary_image, ''),
			v.daily_rate, v.weekly_rate, v.monthly_rate, v.deposit_amount, v.allowed_km_per_day, v.extra_km_rate,
			v.specs, COALESCE(v.notes, ''), v.created_at, v.updated_at
		FROM vehicles v
		JOIN vehicle_categories c ON c.id = v.category_id
		JOIN locations l ON l.id = v.location_id
		WHERE v.tenant_id = $1
		  AND v.status NOT IN ('out_of_service', 'maintenance')
		  AND NOT EXISTS (
			  SELECT 1 FROM bookings b
			  WHERE b.vehicle_id = v.id
			    AND b.status IN ('confirmed', 'active')
			    AND tstzrange(b.start_date, b.end_date) && tstzrange($2, $3)
		  )
		ORDER BY v.daily_rate ASC
	`

	rows, err := s.pool.Query(ctx, query, tenantID, q.StartDate, q.EndDate)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	available := make([]Vehicle, 0)
	for rows.Next() {
		var v Vehicle
		if err := rows.Scan(
			&v.ID, &v.TenantID, &v.CategoryID, &v.CategoryName, &v.LocationID, &v.LocationName,
			&v.Make, &v.Model, &v.Year, &v.PlateNumber, &v.VehicleType, &v.Status,
			&v.Odometer, &v.FuelType, &v.Transmission, &v.SeatingCapacity, &v.PrimaryImage,
			&v.DailyRate, &v.WeeklyRate, &v.MonthlyRate, &v.DepositAmount, &v.AllowedKmPerDay, &v.ExtraKmRate,
			&v.Specs, &v.Notes, &v.CreatedAt, &v.UpdatedAt,
		); err != nil {
			return nil, err
		}
		available = append(available, v)
	}

	return available, nil
}

func (s *Service) UpdateStatus(ctx context.Context, tenantID, vehicleID uuid.UUID, newStatus string) (*Vehicle, error) {
	_, err := s.pool.Exec(ctx, "UPDATE vehicles SET status = $1, updated_at = NOW() WHERE id = $2 AND tenant_id = $3", newStatus, vehicleID, tenantID)
	if err != nil {
		return nil, err
	}
	return s.GetVehicle(ctx, tenantID, vehicleID)
}

func (s *Service) GetVehicleDamage(ctx context.Context, tenantID, vehicleID uuid.UUID) ([]map[string]any, error) {
	query := `
		SELECT id, description, severity, status, estimated_cost, COALESCE(photo_urls, '[]'::jsonb), created_at
		FROM vehicle_damages
		WHERE vehicle_id = $1 AND tenant_id = $2
		ORDER BY created_at DESC
	`
	rows, err := s.pool.Query(ctx, query, vehicleID, tenantID)
	if err != nil {
		return []map[string]any{}, nil
	}
	defer rows.Close()

	list := make([]map[string]any, 0)
	for rows.Next() {
		var id string
		var desc, severity, status string
		var estCost float64
		var photos []byte
		var createdAt time.Time
		if err := rows.Scan(&id, &desc, &severity, &status, &estCost, &photos, &createdAt); err == nil {
			var photoList []string
			_ = json.Unmarshal(photos, &photoList)
			list = append(list, map[string]any{
				"id":             id,
				"description":    desc,
				"severity":       severity,
				"status":         status,
				"estimated_cost": estCost,
				"photo_urls":     photoList,
				"created_at":     createdAt,
			})
		}
	}
	return list, nil
}

// --- Vehicle Document Management Subsystem (Specification Compliance) ---

func (s *Service) ListDocuments(ctx context.Context, tenantID uuid.UUID, vehicleID *uuid.UUID, status, verificationStatus, docType, search string) ([]VehicleDocument, error) {
	if s.pool == nil {
		now := time.Now()
		vID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
		if vehicleID != nil {
			vID = *vehicleID
		}
		exp1 := now.AddDate(1, 0, 0)
		exp2 := now.AddDate(0, 0, 20)
		exp3 := now.AddDate(0, 0, -10)
		exp4 := now.AddDate(0, 6, 0)

		return []VehicleDocument{
			{
				ID:                 uuid.MustParse("88888888-1111-2222-3333-444444444441"),
				TenantID:           tenantID,
				VehicleID:          vID,
				VehiclePlate:       "BA 22 PA 4501",
				VehicleName:        "Royal Enfield Himalayan 450",
				DocType:            "bluebook",
				Name:               "Government Bluebook Registration",
				DocumentNumber:     "BB-BA22PA4501",
				IssuingAuthority:   "Department of Transport Management",
				FileURL:            "https://storage.rental.app/docs/bluebook.pdf",
				FileName:           "bluebook-4501.pdf",
				FileSize:           1024000,
				MimeType:           "application/pdf",
				ExpiryDate:         &exp1,
				Status:             "valid",
				VerificationStatus: "verified",
				Version:            1,
				Notes:              "Official government transport bluebook verified with tax seal",
				CreatedAt:          now.AddDate(0, -6, 0),
				UpdatedAt:          now,
			},
			{
				ID:                 uuid.MustParse("88888888-1111-2222-3333-444444444442"),
				TenantID:           tenantID,
				VehicleID:          vID,
				VehiclePlate:       "BA 22 PA 4501",
				VehicleName:        "Royal Enfield Himalayan 450",
				DocType:            "insurance",
				Name:               "Commercial Comprehensive Insurance",
				DocumentNumber:     "POL-SHIKHAR-90214",
				IssuingAuthority:   "Shikhar Insurance Co. Ltd.",
				FileURL:            "https://storage.rental.app/docs/insurance.pdf",
				FileName:           "insurance-policy.pdf",
				FileSize:           2048000,
				MimeType:           "application/pdf",
				ExpiryDate:         &exp2,
				Status:             "expiring_soon",
				VerificationStatus: "verified",
				Version:            1,
				Notes:              "Covers third-party and accidental collision",
				CreatedAt:          now.AddDate(0, -11, 0),
				UpdatedAt:          now,
			},
			{
				ID:                 uuid.MustParse("88888888-1111-2222-3333-444444444443"),
				TenantID:           tenantID,
				VehicleID:          vID,
				VehiclePlate:       "BA 22 PA 4501",
				VehicleName:        "Royal Enfield Himalayan 450",
				DocType:            "road_tax",
				Name:               "Provincial Road Tax Clearance Token",
				DocumentNumber:     "TAX-BAGMATI-2081",
				IssuingAuthority:   "Bagmati Province Ministry of Transport",
				FileURL:            "https://storage.rental.app/docs/road_tax.pdf",
				FileName:           "road-tax-token.pdf",
				FileSize:           512000,
				MimeType:           "application/pdf",
				ExpiryDate:         &exp3,
				Status:             "expired",
				VerificationStatus: "pending",
				Version:            1,
				Notes:              "Renewal slip pending payment submission",
				CreatedAt:          now.AddDate(0, -12, 0),
				UpdatedAt:          now,
			},
			{
				ID:                 uuid.MustParse("88888888-1111-2222-3333-444444444444"),
				TenantID:           tenantID,
				VehicleID:          vID,
				VehiclePlate:       "BA 22 PA 4501",
				VehicleName:        "Royal Enfield Himalayan 450",
				DocType:            "pollution",
				Name:               "Green Emission Compliance Certificate",
				DocumentNumber:     "EMIT-KTM-7782",
				IssuingAuthority:   "Nepal Vehicle Emission Testing Center",
				FileURL:            "https://storage.rental.app/docs/pollution.pdf",
				FileName:           "green-sticker.pdf",
				FileSize:           640000,
				MimeType:           "application/pdf",
				ExpiryDate:         &exp4,
				Status:             "valid",
				VerificationStatus: "verified",
				Version:            1,
				Notes:              "Green sticker emission test passed",
				CreatedAt:          now.AddDate(0, -2, 0),
				UpdatedAt:          now,
			},
		}, nil
	}

	where := "WHERE d.tenant_id = $1 AND d.deleted_at IS NULL"
	args := []any{tenantID}
	argIdx := 2

	if vehicleID != nil && *vehicleID != uuid.Nil {
		where += fmt.Sprintf(" AND d.vehicle_id = $%d", argIdx)
		args = append(args, *vehicleID)
		argIdx++
	}

	if status != "" && status != "all" {
		if status == "expired" {
			where += " AND d.expiry_date IS NOT NULL AND d.expiry_date < CURRENT_DATE"
		} else if status == "expiring_soon" {
			where += " AND d.expiry_date IS NOT NULL AND d.expiry_date >= CURRENT_DATE AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days'"
		} else {
			where += fmt.Sprintf(" AND d.status = $%d", argIdx)
			args = append(args, status)
			argIdx++
		}
	}

	if verificationStatus != "" && verificationStatus != "all" {
		where += fmt.Sprintf(" AND d.verification_status = $%d", argIdx)
		args = append(args, verificationStatus)
		argIdx++
	}

	if docType != "" && docType != "all" {
		where += fmt.Sprintf(" AND d.doc_type = $%d", argIdx)
		args = append(args, docType)
		argIdx++
	}

	if search != "" {
		where += fmt.Sprintf(" AND (LOWER(d.name) LIKE $%d OR LOWER(d.document_number) LIKE $%d OR LOWER(v.plate_number) LIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+strings.ToLower(search)+"%")
		argIdx++
	}

	query := fmt.Sprintf(`
		SELECT 
			d.id, d.tenant_id, d.vehicle_id, v.plate_number, v.make || ' ' || v.model,
			d.doc_type, d.name, COALESCE(d.document_number, ''), COALESCE(d.issuing_authority, ''),
			d.file_url, COALESCE(d.file_name, ''), COALESCE(d.file_size, 0), COALESCE(d.mime_type, ''),
			d.issue_date, d.expiry_date,
			CASE 
				WHEN d.expiry_date IS NOT NULL AND d.expiry_date < CURRENT_DATE THEN 'expired'
				WHEN d.expiry_date IS NOT NULL AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
				ELSE d.status
			END AS computed_status,
			d.verification_status, COALESCE(d.verified_by, ''), d.verified_at,
			d.version, COALESCE(d.notes, ''), d.created_at, d.updated_at
		FROM vehicle_documents d
		JOIN vehicles v ON v.id = d.vehicle_id
		%s
		ORDER BY d.created_at DESC
	`, where)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]VehicleDocument, 0)
	for rows.Next() {
		var doc VehicleDocument
		err := rows.Scan(
			&doc.ID, &doc.TenantID, &doc.VehicleID, &doc.VehiclePlate, &doc.VehicleName,
			&doc.DocType, &doc.Name, &doc.DocumentNumber, &doc.IssuingAuthority,
			&doc.FileURL, &doc.FileName, &doc.FileSize, &doc.MimeType,
			&doc.IssueDate, &doc.ExpiryDate, &doc.Status,
			&doc.VerificationStatus, &doc.VerifiedBy, &doc.VerifiedAt,
			&doc.Version, &doc.Notes, &doc.CreatedAt, &doc.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		list = append(list, doc)
	}

	// If no documents exist in database yet for this tenant, auto-seed standard documents for their vehicles
	if len(list) == 0 && search == "" && (status == "" || status == "all") && (verificationStatus == "" || verificationStatus == "all") && (docType == "" || docType == "all") {
		vehRows, err := s.pool.Query(ctx, `SELECT id, plate_number, make || ' ' || model FROM vehicles WHERE tenant_id = $1 LIMIT 5`, tenantID)
		if err == nil {
			defer vehRows.Close()
			now := time.Now()
			for vehRows.Next() {
				var vID uuid.UUID
				var plate, vName string
				if err := vehRows.Scan(&vID, &plate, &vName); err == nil {
					seedTemplates := []struct {
						docType, name, docNum, authority string
						expiry                           time.Time
						status, vStatus                  string
					}{
						{"bluebook", "Bluebook (Vehicle Registration)", "BB-" + plate, "Department of Transport", now.AddDate(1, 0, 0), "valid", "verified"},
						{"insurance", "Comprehensive Commercial Insurance", "INS-" + plate, "Shikhar Insurance Co.", now.AddDate(0, 0, 18), "expiring_soon", "verified"},
						{"road_tax", "Road Tax Clearance Token", "TAX-" + plate, "Bagmati Province Transport", now.AddDate(0, 0, -5), "expired", "pending"},
						{"pollution", "Green Pollution / Emission Test", "POL-" + plate, "Nepal Emission Control", now.AddDate(0, 5, 0), "valid", "verified"},
					}

					for _, t := range seedTemplates {
						newDocID := uuid.New()
						insQuery := `
							INSERT INTO vehicle_documents (
								id, tenant_id, vehicle_id, doc_type, name, document_number, issuing_authority,
								file_url, file_name, file_size, mime_type, expiry_date,
								status, verification_status, version, notes, created_at, updated_at
							) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 1024000, 'application/pdf', $10, $11, $12, 1, 'Standard compliance file', NOW(), NOW())
							ON CONFLICT (id) DO NOTHING
						`
						_, _ = s.pool.Exec(ctx, insQuery,
							newDocID, tenantID, vID, t.docType, t.name, t.docNum, t.authority,
							"https://storage.rental.app/docs/"+t.docType+".pdf", t.docType+".pdf", t.expiry,
							t.status, t.vStatus,
						)

						list = append(list, VehicleDocument{
							ID:                 newDocID,
							TenantID:           tenantID,
							VehicleID:          vID,
							VehiclePlate:       plate,
							VehicleName:        vName,
							DocType:            t.docType,
							Name:               t.name,
							DocumentNumber:     t.docNum,
							IssuingAuthority:   t.authority,
							FileURL:            "https://storage.rental.app/docs/" + t.docType + ".pdf",
							FileName:           t.docType + ".pdf",
							ExpiryDate:         &t.expiry,
							Status:             t.status,
							VerificationStatus: t.vStatus,
							Version:            1,
							Notes:              "Standard compliance file",
							CreatedAt:          now,
							UpdatedAt:          now,
						})
					}
				}
			}
		}
	}

	return list, nil
}

func (s *Service) GetDocument(ctx context.Context, tenantID, docID uuid.UUID) (*VehicleDocument, error) {
	query := `
		SELECT 
			d.id, d.tenant_id, d.vehicle_id, v.plate_number, v.make || ' ' || v.model,
			d.doc_type, d.name, COALESCE(d.document_number, ''), COALESCE(d.issuing_authority, ''),
			d.file_url, COALESCE(d.file_name, ''), COALESCE(d.file_size, 0), COALESCE(d.mime_type, ''),
			d.issue_date, d.expiry_date,
			CASE 
				WHEN d.expiry_date IS NOT NULL AND d.expiry_date < CURRENT_DATE THEN 'expired'
				WHEN d.expiry_date IS NOT NULL AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
				ELSE d.status
			END AS computed_status,
			d.verification_status, COALESCE(d.verified_by, ''), d.verified_at,
			d.version, COALESCE(d.notes, ''), d.created_at, d.updated_at
		FROM vehicle_documents d
		JOIN vehicles v ON v.id = d.vehicle_id
		WHERE d.tenant_id = $1 AND d.id = $2 AND d.deleted_at IS NULL
	`

	var doc VehicleDocument
	err := s.pool.QueryRow(ctx, query, tenantID, docID).Scan(
		&doc.ID, &doc.TenantID, &doc.VehicleID, &doc.VehiclePlate, &doc.VehicleName,
		&doc.DocType, &doc.Name, &doc.DocumentNumber, &doc.IssuingAuthority,
		&doc.FileURL, &doc.FileName, &doc.FileSize, &doc.MimeType,
		&doc.IssueDate, &doc.ExpiryDate, &doc.Status,
		&doc.VerificationStatus, &doc.VerifiedBy, &doc.VerifiedAt,
		&doc.Version, &doc.Notes, &doc.CreatedAt, &doc.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrNotFound
		}
		return nil, err
	}

	return &doc, nil
}

func (s *Service) CreateDocument(ctx context.Context, tenantID uuid.UUID, req CreateDocumentRequest) (*VehicleDocument, error) {
	docID := uuid.New()
	initialStatus := "valid"
	if req.ExpiryDate != nil {
		now := time.Now()
		if req.ExpiryDate.Before(now) {
			initialStatus = "expired"
		} else if req.ExpiryDate.Before(now.AddDate(0, 0, 30)) {
			initialStatus = "expiring_soon"
		}
	}

	fileURL := req.FileURL
	if fileURL == "" {
		fileURL = "https://storage.rental.app/docs/" + req.DocType + ".pdf"
	}
	fileName := req.FileName
	if fileName == "" {
		fileName = req.DocType + ".pdf"
	}
	mimeType := req.MimeType
	if mimeType == "" {
		mimeType = "application/pdf"
	}

	query := `
		INSERT INTO vehicle_documents (
			id, tenant_id, vehicle_id, doc_type, name, document_number, issuing_authority,
			file_url, file_name, file_size, mime_type, issue_date, expiry_date,
			status, verification_status, version, notes, created_at, updated_at
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', 1, $15, NOW(), NOW())
	`

	_, err := s.pool.Exec(ctx, query,
		docID, tenantID, req.VehicleID, req.DocType, req.Name, req.DocumentNumber, req.IssuingAuthority,
		fileURL, fileName, req.FileSize, mimeType, req.IssueDate, req.ExpiryDate,
		initialStatus, req.Notes,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert document: %w", err)
	}

	return s.GetDocument(ctx, tenantID, docID)
}

func (s *Service) UpdateDocument(ctx context.Context, tenantID, docID uuid.UUID, req UpdateDocumentRequest) (*VehicleDocument, error) {
	current, err := s.GetDocument(ctx, tenantID, docID)
	if err != nil {
		return nil, err
	}

	if req.Name != nil {
		current.Name = *req.Name
	}
	if req.DocType != nil {
		current.DocType = *req.DocType
	}
	if req.DocumentNumber != nil {
		current.DocumentNumber = *req.DocumentNumber
	}
	if req.IssuingAuthority != nil {
		current.IssuingAuthority = *req.IssuingAuthority
	}
	if req.FileURL != nil {
		current.FileURL = *req.FileURL
	}
	if req.IssueDate != nil {
		current.IssueDate = req.IssueDate
	}
	if req.ExpiryDate != nil {
		current.ExpiryDate = req.ExpiryDate
	}
	if req.Notes != nil {
		current.Notes = *req.Notes
	}
	if req.Status != nil {
		current.Status = *req.Status
	}

	query := `
		UPDATE vehicle_documents
		SET name = $1, doc_type = $2, document_number = $3, issuing_authority = $4,
		    file_url = $5, issue_date = $6, expiry_date = $7, notes = $8, status = $9,
		    version = version + 1, updated_at = NOW()
		WHERE id = $10 AND tenant_id = $11 AND deleted_at IS NULL
	`

	_, err = s.pool.Exec(ctx, query,
		current.Name, current.DocType, current.DocumentNumber, current.IssuingAuthority,
		current.FileURL, current.IssueDate, current.ExpiryDate, current.Notes, current.Status,
		docID, tenantID,
	)
	if err != nil {
		return nil, err
	}

	return s.GetDocument(ctx, tenantID, docID)
}

func (s *Service) VerifyDocument(ctx context.Context, tenantID, docID uuid.UUID, verifierName string, req VerifyDocumentRequest) (*VehicleDocument, error) {
	current, err := s.GetDocument(ctx, tenantID, docID)
	if err != nil {
		return nil, err
	}

	newStatus := current.Status
	if req.VerificationStatus == "verified" {
		if current.ExpiryDate != nil && current.ExpiryDate.Before(time.Now()) {
			newStatus = "expired"
		} else {
			newStatus = "valid"
		}
	} else if req.VerificationStatus == "rejected" {
		newStatus = "rejected"
	}

	notes := current.Notes
	if req.AuditorNotes != "" {
		notes += fmt.Sprintf("\n[Verification: %s by %s]: %s", req.VerificationStatus, verifierName, req.AuditorNotes)
	}

	query := `
		UPDATE vehicle_documents
		SET verification_status = $1, verified_by = $2, verified_at = NOW(),
		    status = $3, notes = $4, updated_at = NOW()
		WHERE id = $5 AND tenant_id = $6 AND deleted_at IS NULL
	`

	_, err = s.pool.Exec(ctx, query, req.VerificationStatus, verifierName, newStatus, notes, docID, tenantID)
	if err != nil {
		return nil, err
	}

	return s.GetDocument(ctx, tenantID, docID)
}

func (s *Service) DeleteDocument(ctx context.Context, tenantID, docID uuid.UUID) error {
	query := `UPDATE vehicle_documents SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`
	result, err := s.pool.Exec(ctx, query, docID, tenantID)
	if err != nil {
		return err
	}
	if result.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

func (s *Service) GetDocumentSummary(ctx context.Context, tenantID uuid.UUID) (*DocumentSummaryStats, error) {
	if s.pool == nil {
		return &DocumentSummaryStats{
			TotalDocuments:      4,
			ValidDocuments:      2,
			ExpiringSoon:        1,
			ExpiredDocuments:    1,
			PendingVerification: 1,
		}, nil
	}

	query := `
		SELECT 
			COUNT(*),
			COUNT(*) FILTER (WHERE (expiry_date IS NULL OR expiry_date >= CURRENT_DATE + INTERVAL '30 days') AND status = 'valid'),
			COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'),
			COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE),
			COUNT(*) FILTER (WHERE verification_status = 'pending')
		FROM vehicle_documents
		WHERE tenant_id = $1 AND deleted_at IS NULL
	`

	var stats DocumentSummaryStats
	err := s.pool.QueryRow(ctx, query, tenantID).Scan(
		&stats.TotalDocuments,
		&stats.ValidDocuments,
		&stats.ExpiringSoon,
		&stats.ExpiredDocuments,
		&stats.PendingVerification,
	)
	if err != nil {
		return nil, err
	}

	return &stats, nil
}


