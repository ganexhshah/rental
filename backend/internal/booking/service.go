package booking

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rental/backend/pkg/pagination"
)

var (
	ErrBookingNotFound      = errors.New("booking not found")
	ErrVehicleAlreadyBooked = errors.New("vehicle is already booked or unavailable for selected time range")
	ErrInvalidBookingStatus = errors.New("invalid booking status for this operation")
	ErrInvalidOdometerValue = errors.New("return odometer cannot be lower than pickup odometer")
	ErrCustomerBlacklisted  = errors.New("customer is blacklisted from renting vehicles")
	ErrDriverIneligible     = errors.New("assigned driver is not eligible or driver license is expired")
)

type Service struct {
	pool    *pgxpool.Pool
	pricing *PricingEngine
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{
		pool:    pool,
		pricing: NewPricingEngine(pool),
	}
}

func generateBookingCode() string {
	b := make([]byte, 3)
	_, _ = rand.Read(b)
	return fmt.Sprintf("BK-%s-%s", time.Now().Format("20060102"), strings.ToUpper(hex.EncodeToString(b)))
}

func (s *Service) recordStatusHistory(ctx context.Context, tx pgx.Tx, tenantID, bookingID uuid.UUID, fromStatus, toStatus, changedBy, reason string) error {
	historyID := uuid.New()
	query := `
		INSERT INTO booking_status_history (id, tenant_id, booking_id, from_status, to_status, changed_by, reason, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
	`
	_, err := tx.Exec(ctx, query, historyID, tenantID, bookingID, fromStatus, toStatus, changedBy, reason)
	return err
}

func (s *Service) GetPricingQuote(ctx context.Context, tenantID uuid.UUID, req PricingQuoteRequest) (*PricingQuoteResponse, error) {
	resp, _, err := s.pricing.CalculateQuote(ctx, tenantID, req.VehicleID, req.StartDate, req.EndDate, req.CouponCode, req.Insurance, req.ExtraItems, req.DeliveryFee, req.CollectionFee, req.OneWayFee)
	return resp, err
}

func (s *Service) VerifyEligibility(ctx context.Context, tenantID, customerID uuid.UUID, driverID *uuid.UUID) (*EligibilityCheckResponse, error) {
	resp := &EligibilityCheckResponse{
		IsEligible:         true,
		DriverLicenseValid: true,
		Warnings:           make([]string, 0),
		Errors:             make([]string, 0),
	}

	// 1. Check Customer
	var (
		cKYC         string
		cBlacklisted bool
		cReason      *string
		cEligStatus  string
	)
	queryCust := `
		SELECT verification_status, is_blacklisted, blacklist_reason, rental_eligibility_status
		FROM customers
		WHERE id = $1 AND tenant_id = $2
	`
	err := s.pool.QueryRow(ctx, queryCust, customerID, tenantID).Scan(&cKYC, &cBlacklisted, &cReason, &cEligStatus)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("customer not found")
		}
		return nil, err
	}

	resp.CustomerKYCStatus = cKYC
	resp.IsBlacklisted = cBlacklisted
	if cReason != nil {
		resp.BlacklistReason = *cReason
	}

	if cBlacklisted {
		resp.IsEligible = false
		msg := "Customer is currently blacklisted from renting"
		if cReason != nil && *cReason != "" {
			msg += fmt.Sprintf(" (Reason: %s)", *cReason)
		}
		resp.Errors = append(resp.Errors, msg)
	}

	if cEligStatus != "eligible" {
		resp.IsEligible = false
		resp.Errors = append(resp.Errors, fmt.Sprintf("Customer rental eligibility status is '%s'", cEligStatus))
	}

	if cKYC != "verified" {
		resp.Warnings = append(resp.Warnings, fmt.Sprintf("Customer KYC identity verification is '%s' (pending verification)", cKYC))
	}

	// 2. Check Driver if provided
	if driverID != nil && *driverID != uuid.Nil {
		var (
			dLicense   string
			dExpiry    *time.Time
			dElig      string
			dVerif     string
		)
		queryDriver := `
			SELECT license_number, license_expiry, eligibility_status, verification_status
			FROM customer_drivers
			WHERE id = $1 AND tenant_id = $2
		`
		err = s.pool.QueryRow(ctx, queryDriver, *driverID, tenantID).Scan(&dLicense, &dExpiry, &dElig, &dVerif)
		if err == nil {
			resp.DriverLicenseNumber = dLicense
			if dExpiry != nil {
				expStr := dExpiry.Format("2006-01-02")
				resp.DriverLicenseExpiry = &expStr
				if dExpiry.Before(time.Now()) {
					resp.DriverLicenseValid = false
					resp.IsEligible = false
					resp.Errors = append(resp.Errors, fmt.Sprintf("Driver driving licence expired on %s", expStr))
				}
			}
			if dElig != "eligible" {
				resp.IsEligible = false
				resp.Errors = append(resp.Errors, fmt.Sprintf("Driver eligibility status is '%s'", dElig))
			}
			if dVerif != "verified" {
				resp.Warnings = append(resp.Warnings, fmt.Sprintf("Driver verification is '%s'", dVerif))
			}
		}
	}

	return resp, nil
}

func (s *Service) CreateBooking(ctx context.Context, tenantID uuid.UUID, req CreateBookingRequest) (*Booking, error) {
	if req.EndDate.Before(req.StartDate) || req.EndDate.Equal(req.StartDate) {
		return nil, fmt.Errorf("end date must be after start date")
	}

	// Verify customer eligibility
	elig, err := s.VerifyEligibility(ctx, tenantID, req.CustomerID, req.PrimaryDriverID)
	if err != nil {
		return nil, err
	}
	if !elig.IsEligible && len(elig.Errors) > 0 {
		return nil, fmt.Errorf("customer or driver ineligible: %s", strings.Join(elig.Errors, "; "))
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// 1. Lock vehicle row for concurrency safety
	var vehicleStatus string
	var allowedKmPerDay int
	var extraKmRate float64
	var vehicleCategoryID *uuid.UUID
	lockQuery := `
		SELECT status, allowed_km_per_day, extra_km_rate, category_id
		FROM vehicles
		WHERE id = $1 AND tenant_id = $2
		FOR UPDATE
	`
	err = tx.QueryRow(ctx, lockQuery, req.VehicleID, tenantID).Scan(&vehicleStatus, &allowedKmPerDay, &extraKmRate, &vehicleCategoryID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("vehicle not found")
		}
		return nil, err
	}

	if vehicleStatus == "maintenance" || vehicleStatus == "out_of_service" {
		return nil, fmt.Errorf("vehicle is currently unavailable for rent (status: %s)", vehicleStatus)
	}

	// 2. Overlap check in PostgreSQL with tstzrange
	var overlapCount int
	overlapQuery := `
		SELECT COUNT(*)
		FROM bookings
		WHERE vehicle_id = $1
		  AND status IN ('confirmed', 'pickup_scheduled', 'pickup_in_progress', 'active', 'return_in_progress')
		  AND tstzrange(start_date, end_date) && tstzrange($2, $3)
	`
	if err := tx.QueryRow(ctx, overlapQuery, req.VehicleID, req.StartDate, req.EndDate).Scan(&overlapCount); err != nil {
		return nil, err
	}
	if overlapCount > 0 {
		return nil, ErrVehicleAlreadyBooked
	}

	// 3. Calculate Authoritative Canonical Pricing & Snapshot
	quote, snapshot, err := s.pricing.CalculateQuote(
		ctx, tenantID, req.VehicleID, req.StartDate, req.EndDate,
		req.CouponCode, req.Insurance, req.ExtraItems,
		req.DeliveryFee, req.CollectionFee, req.OneWayFee,
	)
	if err != nil {
		return nil, fmt.Errorf("pricing calculation error: %w", err)
	}

	snapshotJSON, _ := json.Marshal(snapshot)
	extrasJSON, _ := json.Marshal(req.ExtraItems)
	if req.ExtraItems == nil {
		extrasJSON = []byte("[]")
	}

	// Determine Initial Status
	initialStatus := req.InitialStatus
	if initialStatus == "" {
		initialStatus = StatusConfirmed
	}
	source := req.Source
	if source == "" {
		source = "admin"
	}
	catID := req.VehicleCategoryID
	if catID == nil {
		catID = vehicleCategoryID
	}

	// 4. Insert Booking
	bookingID := uuid.New()
	code := generateBookingCode()

	insertBookingQuery := `
		INSERT INTO bookings (
			id, tenant_id, booking_code, customer_id, primary_driver_id,
			vehicle_id, vehicle_category_id, source, pickup_location_id, return_location_id,
			start_date, end_date, status, rental_amount, insurance_amount,
			discount_amount, tax_amount, extra_charges, total_amount, deposit_amount,
			paid_amount, balance_due, payment_status, notes, pricing_snapshot, extras
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10,
			$11, $12, $13, $14, $15,
			$16, $17, $18, $19, $20,
			0.00, $21, 'unpaid', $22, $23, $24
		)
		RETURNING id
	`
	var insertedID uuid.UUID
	err = tx.QueryRow(
		ctx, insertBookingQuery,
		bookingID, tenantID, code, req.CustomerID, req.PrimaryDriverID,
		req.VehicleID, catID, source, req.PickupLocationID, req.ReturnLocationID,
		req.StartDate, req.EndDate, initialStatus, quote.RentalAmount, quote.InsuranceAmount,
		quote.DiscountAmount, quote.TaxAmount, quote.ExtraCharges, quote.TotalAmount, quote.DepositAmount,
		quote.TotalAmount, req.Notes, snapshotJSON, extrasJSON,
	).Scan(&insertedID)
	if err != nil {
		return nil, fmt.Errorf("failed to create booking: %w", err)
	}

	// 5. If confirmed, lock vehicle status to reserved
	if initialStatus == StatusConfirmed || initialStatus == StatusPickupScheduled {
		_, _ = tx.Exec(ctx, "UPDATE vehicles SET status = 'reserved', updated_at = NOW() WHERE id = $1 AND status = 'available'", req.VehicleID)
	}

	// 6. Record deposit requirement in deposits table
	if quote.DepositAmount > 0 {
		depID := uuid.New()
		insertDeposit := `
			INSERT INTO deposits (id, tenant_id, booking_id, customer_id, amount, status, hold_method)
			VALUES ($1, $2, $3, $4, $5, 'held', 'cash_or_card')
		`
		if _, err := tx.Exec(ctx, insertDeposit, depID, tenantID, bookingID, req.CustomerID, quote.DepositAmount); err != nil {
			return nil, fmt.Errorf("failed to create deposit ledger: %w", err)
		}
	}

	// 7. Increment coupon usage if used
	if req.CouponCode != "" && quote.DiscountAmount > 0 {
		_, _ = tx.Exec(ctx, "UPDATE coupons SET times_used = times_used + 1 WHERE tenant_id = $1 AND UPPER(code) = UPPER($2)", tenantID, req.CouponCode)
	}

	// 8. Record audit log
	if err := s.recordStatusHistory(ctx, tx, tenantID, bookingID, "none", string(initialStatus), "staff", "Initial booking reservation created"); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.GetBooking(ctx, tenantID, bookingID)
}

func (s *Service) ListBookings(ctx context.Context, tenantID uuid.UUID, customerID, vehicleID *uuid.UUID, status, paymentStatus string, p pagination.Params) ([]Booking, pagination.Meta, error) {
	if s.pool == nil {
		return []Booking{}, pagination.BuildMeta(0, p), nil
	}
	where := "WHERE b.tenant_id = $1"
	args := []any{tenantID}
	argIdx := 2

	if customerID != nil && *customerID != uuid.Nil {
		where += fmt.Sprintf(" AND b.customer_id = $%d", argIdx)
		args = append(args, *customerID)
		argIdx++
	}

	if vehicleID != nil && *vehicleID != uuid.Nil {
		where += fmt.Sprintf(" AND b.vehicle_id = $%d", argIdx)
		args = append(args, *vehicleID)
		argIdx++
	}

	if status != "" && status != "all" {
		where += fmt.Sprintf(" AND b.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	if paymentStatus != "" && paymentStatus != "all" {
		where += fmt.Sprintf(" AND b.payment_status = $%d", argIdx)
		args = append(args, paymentStatus)
		argIdx++
	}

	if p.Search != "" {
		where += fmt.Sprintf(" AND (b.booking_code ILIKE $%d OR c.full_name ILIKE $%d OR v.plate_number ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+p.Search+"%")
		argIdx++
	}

	var total int64
	countQuery := fmt.Sprintf(`
		SELECT COUNT(*)
		FROM bookings b
		JOIN customers c ON c.id = b.customer_id
		JOIN vehicles v ON v.id = b.vehicle_id
		%s
	`, where)
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, pagination.Meta{}, err
	}

	query := fmt.Sprintf(`
		SELECT b.id, b.tenant_id, b.booking_code, b.customer_id, c.full_name, c.email, c.phone, c.verification_status,
		       b.primary_driver_id, COALESCE(cd.full_name, ''), COALESCE(cd.license_number, ''),
		       b.vehicle_id, v.make, v.model, v.plate_number, COALESCE(v.vehicle_type, 'car'),
		       b.vehicle_category_id, COALESCE(vc.name, ''), COALESCE(b.source, 'admin'),
		       b.pickup_location_id, lp.name, b.return_location_id, lr.name,
		       b.start_date, b.end_date, b.actual_pickup_at, b.actual_return_at,
		       b.status, b.rental_amount, b.insurance_amount, b.discount_amount,
		       b.tax_amount, b.extra_charges, b.total_amount, b.deposit_amount,
		       b.paid_amount, b.balance_due, b.payment_status,
		       b.pickup_odometer, b.return_odometer,
		       COALESCE(b.pickup_fuel, ''), COALESCE(b.return_fuel, ''),
		       b.pricing_snapshot, b.extras,
		       COALESCE(b.cancellation_reason, ''), b.cancelled_at, COALESCE(b.cancelled_by, ''), b.cancellation_fee,
		       b.completed_at, COALESCE(b.pickup_notes, ''), COALESCE(b.return_notes, ''),
		       b.pickup_photos, b.return_photos, COALESCE(b.rejection_reason, ''),
		       b.reassigned_from_vehicle_id, COALESCE(b.reassign_reason, ''),
		       COALESCE(b.notes, ''), b.created_at, b.updated_at
		FROM bookings b
		JOIN customers c ON c.id = b.customer_id
		LEFT JOIN customer_drivers cd ON cd.id = b.primary_driver_id
		JOIN vehicles v ON v.id = b.vehicle_id
		LEFT JOIN vehicle_categories vc ON vc.id = b.vehicle_category_id
		JOIN locations lp ON lp.id = b.pickup_location_id
		JOIN locations lr ON lr.id = b.return_location_id
		%s
		ORDER BY b.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, p.Limit, p.Offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	defer rows.Close()

	list := make([]Booking, 0)
	for rows.Next() {
		var b Booking
		var snapRaw, extrasRaw, pPhotosRaw, rPhotosRaw []byte
		if err := rows.Scan(
			&b.ID, &b.TenantID, &b.BookingCode, &b.CustomerID, &b.CustomerName, &b.CustomerEmail, &b.CustomerPhone, &b.CustomerKYCStatus,
			&b.PrimaryDriverID, &b.DriverName, &b.DriverLicense,
			&b.VehicleID, &b.VehicleMake, &b.VehicleModel, &b.VehiclePlate, &b.VehicleType,
			&b.VehicleCategoryID, &b.CategoryName, &b.Source,
			&b.PickupLocationID, &b.PickupLocation, &b.ReturnLocationID, &b.ReturnLocation,
			&b.StartDate, &b.EndDate, &b.ActualPickupAt, &b.ActualReturnAt,
			&b.Status, &b.RentalAmount, &b.InsuranceAmount, &b.DiscountAmount,
			&b.TaxAmount, &b.ExtraCharges, &b.TotalAmount, &b.DepositAmount,
			&b.PaidAmount, &b.BalanceDue, &b.PaymentStatus,
			&b.PickupOdometer, &b.ReturnOdometer,
			&b.PickupFuel, &b.ReturnFuel,
			&snapRaw, &extrasRaw,
			&b.CancellationReason, &b.CancelledAt, &b.CancelledBy, &b.CancellationFee,
			&b.CompletedAt, &b.PickupNotes, &b.ReturnNotes,
			&pPhotosRaw, &rPhotosRaw, &b.RejectionReason,
			&b.ReassignedFromVehicleID, &b.ReassignReason,
			&b.Notes, &b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, pagination.Meta{}, err
		}

		if len(snapRaw) > 0 {
			_ = json.Unmarshal(snapRaw, &b.PricingSnapshot)
		}
		if len(extrasRaw) > 0 {
			_ = json.Unmarshal(extrasRaw, &b.Extras)
		}
		if len(pPhotosRaw) > 0 {
			_ = json.Unmarshal(pPhotosRaw, &b.PickupPhotos)
		}
		if len(rPhotosRaw) > 0 {
			_ = json.Unmarshal(rPhotosRaw, &b.ReturnPhotos)
		}
		list = append(list, b)
	}

	return list, pagination.BuildMeta(total, p), nil
}

func (s *Service) GetBooking(ctx context.Context, tenantID, bookingID uuid.UUID) (*Booking, error) {
	query := `
		SELECT b.id, b.tenant_id, b.booking_code, b.customer_id, c.full_name, c.email, c.phone, c.verification_status,
		       b.primary_driver_id, COALESCE(cd.full_name, ''), COALESCE(cd.license_number, ''),
		       b.vehicle_id, v.make, v.model, v.plate_number, COALESCE(v.vehicle_type, 'car'),
		       b.vehicle_category_id, COALESCE(vc.name, ''), COALESCE(b.source, 'admin'),
		       b.pickup_location_id, lp.name, b.return_location_id, lr.name,
		       b.start_date, b.end_date, b.actual_pickup_at, b.actual_return_at,
		       b.status, b.rental_amount, b.insurance_amount, b.discount_amount,
		       b.tax_amount, b.extra_charges, b.total_amount, b.deposit_amount,
		       b.paid_amount, b.balance_due, b.payment_status,
		       b.pickup_odometer, b.return_odometer,
		       COALESCE(b.pickup_fuel, ''), COALESCE(b.return_fuel, ''),
		       b.pricing_snapshot, b.extras,
		       COALESCE(b.cancellation_reason, ''), b.cancelled_at, COALESCE(b.cancelled_by, ''), b.cancellation_fee,
		       b.completed_at, COALESCE(b.pickup_notes, ''), COALESCE(b.return_notes, ''),
		       b.pickup_photos, b.return_photos, COALESCE(b.rejection_reason, ''),
		       b.reassigned_from_vehicle_id, COALESCE(b.reassign_reason, ''),
		       COALESCE(b.notes, ''), b.created_at, b.updated_at
		FROM bookings b
		JOIN customers c ON c.id = b.customer_id
		LEFT JOIN customer_drivers cd ON cd.id = b.primary_driver_id
		JOIN vehicles v ON v.id = b.vehicle_id
		LEFT JOIN vehicle_categories vc ON vc.id = b.vehicle_category_id
		JOIN locations lp ON lp.id = b.pickup_location_id
		JOIN locations lr ON lr.id = b.return_location_id
		WHERE b.id = $1 AND b.tenant_id = $2
	`
	var b Booking
	var snapRaw, extrasRaw, pPhotosRaw, rPhotosRaw []byte
	err := s.pool.QueryRow(ctx, query, bookingID, tenantID).Scan(
		&b.ID, &b.TenantID, &b.BookingCode, &b.CustomerID, &b.CustomerName, &b.CustomerEmail, &b.CustomerPhone, &b.CustomerKYCStatus,
		&b.PrimaryDriverID, &b.DriverName, &b.DriverLicense,
		&b.VehicleID, &b.VehicleMake, &b.VehicleModel, &b.VehiclePlate, &b.VehicleType,
		&b.VehicleCategoryID, &b.CategoryName, &b.Source,
		&b.PickupLocationID, &b.PickupLocation, &b.ReturnLocationID, &b.ReturnLocation,
		&b.StartDate, &b.EndDate, &b.ActualPickupAt, &b.ActualReturnAt,
		&b.Status, &b.RentalAmount, &b.InsuranceAmount, &b.DiscountAmount,
		&b.TaxAmount, &b.ExtraCharges, &b.TotalAmount, &b.DepositAmount,
		&b.PaidAmount, &b.BalanceDue, &b.PaymentStatus,
		&b.PickupOdometer, &b.ReturnOdometer,
		&b.PickupFuel, &b.ReturnFuel,
		&snapRaw, &extrasRaw,
		&b.CancellationReason, &b.CancelledAt, &b.CancelledBy, &b.CancellationFee,
		&b.CompletedAt, &b.PickupNotes, &b.ReturnNotes,
		&pPhotosRaw, &rPhotosRaw, &b.RejectionReason,
		&b.ReassignedFromVehicleID, &b.ReassignReason,
		&b.Notes, &b.CreatedAt, &b.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}

	if len(snapRaw) > 0 {
		_ = json.Unmarshal(snapRaw, &b.PricingSnapshot)
	}
	if len(extrasRaw) > 0 {
		_ = json.Unmarshal(extrasRaw, &b.Extras)
	}
	if len(pPhotosRaw) > 0 {
		_ = json.Unmarshal(pPhotosRaw, &b.PickupPhotos)
	}
	if len(rPhotosRaw) > 0 {
		_ = json.Unmarshal(rPhotosRaw, &b.ReturnPhotos)
	}

	return &b, nil
}

func (s *Service) ConfirmBooking(ctx context.Context, tenantID, bookingID uuid.UUID) (*Booking, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var currentStatus BookingStatus
	var vehicleID uuid.UUID
	err = tx.QueryRow(ctx, "SELECT status, vehicle_id FROM bookings WHERE id = $1 AND tenant_id = $2 FOR UPDATE", bookingID, tenantID).Scan(&currentStatus, &vehicleID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}

	if currentStatus != StatusPending && currentStatus != StatusPendingConfirmation && currentStatus != StatusPendingPayment && currentStatus != StatusPendingVerification {
		return nil, fmt.Errorf("cannot confirm booking with current status %s", currentStatus)
	}

	_, err = tx.Exec(ctx, "UPDATE bookings SET status = 'confirmed', updated_at = NOW() WHERE id = $1", bookingID)
	if err != nil {
		return nil, err
	}

	_, _ = tx.Exec(ctx, "UPDATE vehicles SET status = 'reserved', updated_at = NOW() WHERE id = $1 AND status = 'available'", vehicleID)

	if err := s.recordStatusHistory(ctx, tx, tenantID, bookingID, string(currentStatus), string(StatusConfirmed), "staff", "Booking confirmed by dispatch"); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.GetBooking(ctx, tenantID, bookingID)
}

func (s *Service) ChangeStatus(ctx context.Context, tenantID, bookingID uuid.UUID, newStatus BookingStatus, changedBy, reason string) (*Booking, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var currentStatus BookingStatus
	var vehicleID uuid.UUID
	err = tx.QueryRow(ctx, "SELECT status, vehicle_id FROM bookings WHERE id = $1 AND tenant_id = $2 FOR UPDATE", bookingID, tenantID).Scan(&currentStatus, &vehicleID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}

	if currentStatus == newStatus {
		return s.GetBooking(ctx, tenantID, bookingID)
	}

	// Update booking status
	_, err = tx.Exec(ctx, "UPDATE bookings SET status = $1, updated_at = NOW() WHERE id = $2", newStatus, bookingID)
	if err != nil {
		return nil, err
	}

	// Handle vehicle state synchronization
	switch newStatus {
	case StatusConfirmed, StatusPickupScheduled:
		_, _ = tx.Exec(ctx, "UPDATE vehicles SET status = 'reserved', updated_at = NOW() WHERE id = $1 AND status = 'available'", vehicleID)
	case StatusActive:
		_, _ = tx.Exec(ctx, "UPDATE vehicles SET status = 'rented', updated_at = NOW() WHERE id = $1", vehicleID)
	case StatusCompleted, StatusCancelled, StatusNoShow, StatusExpired, StatusRejected:
		_, _ = tx.Exec(ctx, "UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = $1 AND status IN ('reserved', 'rented')", vehicleID)
		if newStatus == StatusCancelled || newStatus == StatusNoShow || newStatus == StatusRejected {
			_, _ = tx.Exec(ctx, "UPDATE deposits SET status = 'released', released_at = NOW(), updated_at = NOW() WHERE booking_id = $1 AND status = 'held'", bookingID)
		}
	}

	if changedBy == "" {
		changedBy = "staff"
	}
	if reason == "" {
		reason = fmt.Sprintf("Status updated to %s", newStatus)
	}
	if err := s.recordStatusHistory(ctx, tx, tenantID, bookingID, string(currentStatus), string(newStatus), changedBy, reason); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.GetBooking(ctx, tenantID, bookingID)
}

func (s *Service) CancelBooking(ctx context.Context, tenantID, bookingID uuid.UUID, reason string, fee float64, cancelledBy string) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var currentStatus BookingStatus
	var vehicleID uuid.UUID
	err = tx.QueryRow(ctx, "SELECT status, vehicle_id FROM bookings WHERE id = $1 AND tenant_id = $2 FOR UPDATE", bookingID, tenantID).Scan(&currentStatus, &vehicleID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ErrBookingNotFound
		}
		return err
	}

	if currentStatus == StatusCancelled || currentStatus == StatusCompleted {
		return fmt.Errorf("cannot cancel a %s booking", currentStatus)
	}

	if cancelledBy == "" {
		cancelledBy = "staff"
	}
	if reason == "" {
		reason = "Customer cancelled reservation"
	}

	updateQuery := `
		UPDATE bookings
		SET status = 'cancelled',
		    cancellation_reason = $1,
		    cancellation_fee = $2,
		    cancelled_at = NOW(),
		    cancelled_by = $3,
		    updated_at = NOW()
		WHERE id = $4
	`
	_, err = tx.Exec(ctx, updateQuery, reason, fee, cancelledBy, bookingID)
	if err != nil {
		return err
	}

	// Make vehicle available
	_, _ = tx.Exec(ctx, "UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = $1 AND status IN ('reserved', 'rented')", vehicleID)

	// Release any deposit held
	_, _ = tx.Exec(ctx, "UPDATE deposits SET status = 'released', released_at = NOW(), updated_at = NOW() WHERE booking_id = $1 AND status = 'held'", bookingID)

	if err := s.recordStatusHistory(ctx, tx, tenantID, bookingID, string(currentStatus), string(StatusCancelled), cancelledBy, reason); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (s *Service) NoShowBooking(ctx context.Context, tenantID, bookingID uuid.UUID, reason string, fee float64) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var currentStatus BookingStatus
	var vehicleID uuid.UUID
	err = tx.QueryRow(ctx, "SELECT status, vehicle_id FROM bookings WHERE id = $1 AND tenant_id = $2 FOR UPDATE", bookingID, tenantID).Scan(&currentStatus, &vehicleID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return ErrBookingNotFound
		}
		return err
	}

	if reason == "" {
		reason = "Customer did not show up within pickup window"
	}

	updateQuery := `
		UPDATE bookings
		SET status = 'no_show',
		    cancellation_reason = $1,
		    cancellation_fee = $2,
		    cancelled_at = NOW(),
		    cancelled_by = 'system',
		    updated_at = NOW()
		WHERE id = $3
	`
	_, err = tx.Exec(ctx, updateQuery, reason, fee, bookingID)
	if err != nil {
		return err
	}

	_, _ = tx.Exec(ctx, "UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = $1 AND status IN ('reserved', 'rented')", vehicleID)
	_, _ = tx.Exec(ctx, "UPDATE deposits SET status = 'released', released_at = NOW(), updated_at = NOW() WHERE booking_id = $1 AND status = 'held'", bookingID)

	if err := s.recordStatusHistory(ctx, tx, tenantID, bookingID, string(currentStatus), string(StatusNoShow), "staff", reason); err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (s *Service) AssignVehicle(ctx context.Context, tenantID, bookingID, newVehicleID uuid.UUID, reason, changedBy string) (*Booking, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var (
		currentStatus BookingStatus
		oldVehicleID  uuid.UUID
		start, end    time.Time
	)
	err = tx.QueryRow(ctx, "SELECT status, vehicle_id, start_date, end_date FROM bookings WHERE id = $1 AND tenant_id = $2 FOR UPDATE", bookingID, tenantID).Scan(&currentStatus, &oldVehicleID, &start, &end)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}

	if currentStatus == StatusCompleted || currentStatus == StatusCancelled || currentStatus == StatusNoShow {
		return nil, fmt.Errorf("cannot reassign vehicle for a %s booking", currentStatus)
	}

	if oldVehicleID == newVehicleID {
		return s.GetBooking(ctx, tenantID, bookingID)
	}

	// 1. Lock new vehicle
	var newStatus string
	err = tx.QueryRow(ctx, "SELECT status FROM vehicles WHERE id = $1 AND tenant_id = $2 FOR UPDATE", newVehicleID, tenantID).Scan(&newStatus)
	if err != nil {
		return nil, fmt.Errorf("target replacement vehicle not found")
	}
	if newStatus == "maintenance" || newStatus == "out_of_service" {
		return nil, fmt.Errorf("target vehicle is in %s", newStatus)
	}

	// 2. Check overlap for new vehicle
	var overlapCount int
	overlapQuery := `
		SELECT COUNT(*) FROM bookings
		WHERE vehicle_id = $1 AND id != $2
		  AND status IN ('confirmed', 'pickup_scheduled', 'pickup_in_progress', 'active', 'return_in_progress')
		  AND tstzrange(start_date, end_date) && tstzrange($3, $4)
	`
	err = tx.QueryRow(ctx, overlapQuery, newVehicleID, bookingID, start, end).Scan(&overlapCount)
	if err != nil {
		return nil, err
	}
	if overlapCount > 0 {
		return nil, ErrVehicleAlreadyBooked
	}

	// 3. Free old vehicle if reserved
	_, _ = tx.Exec(ctx, "UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = $1 AND status = 'reserved'", oldVehicleID)

	// 4. Update new vehicle to reserved if booking is confirmed
	if currentStatus == StatusConfirmed || currentStatus == StatusPickupScheduled {
		_, _ = tx.Exec(ctx, "UPDATE vehicles SET status = 'reserved', updated_at = NOW() WHERE id = $1 AND status = 'available'", newVehicleID)
	} else if currentStatus == StatusActive {
		_, _ = tx.Exec(ctx, "UPDATE vehicles SET status = 'rented', updated_at = NOW() WHERE id = $1", newVehicleID)
	}

	// 5. Update booking
	updateQuery := `
		UPDATE bookings
		SET vehicle_id = $1,
		    reassigned_from_vehicle_id = $2,
		    reassign_reason = $3,
		    updated_at = NOW()
		WHERE id = $4
	`
	_, err = tx.Exec(ctx, updateQuery, newVehicleID, oldVehicleID, reason, bookingID)
	if err != nil {
		return nil, err
	}

	if changedBy == "" {
		changedBy = "staff"
	}
	auditMsg := fmt.Sprintf("Vehicle reassigned from %s to %s: %s", oldVehicleID, newVehicleID, reason)
	if err := s.recordStatusHistory(ctx, tx, tenantID, bookingID, string(currentStatus), string(currentStatus), changedBy, auditMsg); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.GetBooking(ctx, tenantID, bookingID)
}

func (s *Service) PickupWorkflow(ctx context.Context, tenantID, bookingID uuid.UUID, inspectorID *uuid.UUID, req PickupRequest) (*RentalChecklist, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var currentStatus BookingStatus
	var vehicleID uuid.UUID
	var customerID uuid.UUID
	var driverID *uuid.UUID
	err = tx.QueryRow(ctx, "SELECT status, vehicle_id, customer_id, primary_driver_id FROM bookings WHERE id = $1 AND tenant_id = $2 FOR UPDATE", bookingID, tenantID).Scan(&currentStatus, &vehicleID, &customerID, &driverID)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}

	if currentStatus != StatusConfirmed && currentStatus != StatusPickupScheduled && currentStatus != StatusPickupInProgress && currentStatus != StatusPending {
		return nil, fmt.Errorf("booking cannot be picked up (current status: %s)", currentStatus)
	}

	// Repeat critical eligibility check at pickup
	elig, err := s.VerifyEligibility(ctx, tenantID, customerID, driverID)
	if err == nil && !elig.IsEligible {
		return nil, fmt.Errorf("cannot handover vehicle: customer/driver eligibility check failed: %s", strings.Join(elig.Errors, "; "))
	}

	photosJSON, _ := json.Marshal(req.Photos)
	if req.Photos == nil {
		photosJSON = []byte("[]")
	}

	// 1. Create Checklist record
	checklistID := uuid.New()
	insertChecklist := `
		INSERT INTO rental_checklists (
			id, booking_id, checklist_type, odometer, fuel_level,
			exterior_condition, interior_condition, photos, inspector_id, customer_signature
		) VALUES ($1, $2, 'pickup', $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, booking_id, checklist_type, odometer, fuel_level, COALESCE(exterior_condition, ''), COALESCE(interior_condition, ''), photos, inspector_id, COALESCE(customer_signature, ''), created_at
	`
	var rc RentalChecklist
	var photosRaw []byte
	err = tx.QueryRow(
		ctx, insertChecklist,
		checklistID, bookingID, req.Odometer, req.FuelLevel,
		req.ExteriorCondition, req.InteriorCondition, photosJSON, inspectorID, req.CustomerSignature,
	).Scan(
		&rc.ID, &rc.BookingID, &rc.ChecklistType, &rc.Odometer, &rc.FuelLevel,
		&rc.ExteriorCondition, &rc.InteriorCondition, &photosRaw, &rc.InspectorID, &rc.CustomerSignature, &rc.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to save pickup checklist: %w", err)
	}
	_ = json.Unmarshal(photosRaw, &rc.Photos)

	// 2. Update Booking
	updateBooking := `
		UPDATE bookings
		SET status = 'active',
		    actual_pickup_at = NOW(),
		    pickup_odometer = $1,
		    pickup_fuel = $2,
		    pickup_notes = $3,
		    pickup_photos = $4,
		    updated_at = NOW()
		WHERE id = $5
	`
	if _, err := tx.Exec(ctx, updateBooking, req.Odometer, req.FuelLevel, req.Notes, photosJSON, bookingID); err != nil {
		return nil, err
	}

	// 3. Update Vehicle status to rented and sync odometer
	updateVehicle := `
		UPDATE vehicles
		SET status = 'rented',
		    odometer = $1,
		    updated_at = NOW()
		WHERE id = $2
	`
	if _, err := tx.Exec(ctx, updateVehicle, req.Odometer, vehicleID); err != nil {
		return nil, err
	}

	// 4. Record status audit
	if err := s.recordStatusHistory(ctx, tx, tenantID, bookingID, string(currentStatus), string(StatusActive), "staff", "Vehicle inspected and handed over to customer (Active Rental)"); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &rc, nil
}

func (s *Service) ReturnWorkflow(ctx context.Context, tenantID, bookingID uuid.UUID, inspectorID *uuid.UUID, req ReturnRequest) (*RentalChecklist, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var (
		currentStatus   BookingStatus
		vehicleID       uuid.UUID
		customerID      uuid.UUID
		startDate       time.Time
		endDate         time.Time
		rentalAmount    float64
		insuranceAmount float64
		discountAmount  float64
		paidAmount      float64
		existingExtras  float64
		pickupOdo       *int
	)
	queryBooking := `
		SELECT status, vehicle_id, customer_id, start_date, end_date,
		       rental_amount, insurance_amount, discount_amount, paid_amount, extra_charges, pickup_odometer
		FROM bookings
		WHERE id = $1 AND tenant_id = $2
		FOR UPDATE
	`
	err = tx.QueryRow(ctx, queryBooking, bookingID, tenantID).Scan(
		&currentStatus, &vehicleID, &customerID, &startDate, &endDate,
		&rentalAmount, &insuranceAmount, &discountAmount, &paidAmount, &existingExtras, &pickupOdo,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}

	if currentStatus != StatusActive && currentStatus != StatusReturnInProgress {
		return nil, fmt.Errorf("booking cannot be returned (current status: %s)", currentStatus)
	}

	if pickupOdo != nil && req.Odometer < *pickupOdo {
		return nil, ErrInvalidOdometerValue
	}

	// 1. Calculate Extra Mileage Fees
	var allowedKmPerDay int
	var extraKmRate float64
	err = tx.QueryRow(ctx, "SELECT COALESCE(allowed_km_per_day, 0), COALESCE(extra_km_rate, 0) FROM vehicles WHERE id = $1", vehicleID).Scan(&allowedKmPerDay, &extraKmRate)
	if err != nil {
		return nil, err
	}

	extraKmFee := 0.0
	if allowedKmPerDay > 0 && pickupOdo != nil {
		days := CalculateRentalDays(startDate, endDate)
		maxAllowed := allowedKmPerDay * days
		driven := req.Odometer - *pickupOdo
		if driven > maxAllowed {
			extraKmFee = float64(driven-maxAllowed) * extraKmRate
		}
	}

	// 2. Sum new additional charges
	totalExtraCharges := existingExtras + req.AdditionalDamages + req.FuelCharge + extraKmFee
	taxableBase := (rentalAmount - discountAmount) + insuranceAmount + totalExtraCharges
	if taxableBase < 0 {
		taxableBase = 0
	}
	newTax := math.Round(taxableBase*StandardNepalVATRate*100) / 100
	newTotal := math.Round((taxableBase+newTax)*100) / 100
	newBalanceDue := math.Round((newTotal-paidAmount)*100) / 100
	if newBalanceDue < 0 {
		newBalanceDue = 0
	}

	newPaymentStatus := PaymentStatusPaid
	if newBalanceDue > 0 {
		if paidAmount > 0 {
			newPaymentStatus = PaymentStatusPartiallyPaid
		} else {
			newPaymentStatus = PaymentStatusUnpaid
		}
	}

	// 3. Insert Return Checklist
	photosJSON, _ := json.Marshal(req.Photos)
	if req.Photos == nil {
		photosJSON = []byte("[]")
	}
	checklistID := uuid.New()
	insertChecklist := `
		INSERT INTO rental_checklists (
			id, booking_id, checklist_type, odometer, fuel_level,
			exterior_condition, interior_condition, photos, inspector_id, customer_signature
		) VALUES ($1, $2, 'return', $3, $4, $5, $6, $7, $8, $9)
		RETURNING id, booking_id, checklist_type, odometer, fuel_level, COALESCE(exterior_condition, ''), COALESCE(interior_condition, ''), photos, inspector_id, COALESCE(customer_signature, ''), created_at
	`
	var rc RentalChecklist
	var photosRaw []byte
	err = tx.QueryRow(
		ctx, insertChecklist,
		checklistID, bookingID, req.Odometer, req.FuelLevel,
		req.ExteriorCondition, req.InteriorCondition, photosJSON, inspectorID, req.CustomerSignature,
	).Scan(
		&rc.ID, &rc.BookingID, &rc.ChecklistType, &rc.Odometer, &rc.FuelLevel,
		&rc.ExteriorCondition, &rc.InteriorCondition, &photosRaw, &rc.InspectorID, &rc.CustomerSignature, &rc.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to save return checklist: %w", err)
	}
	_ = json.Unmarshal(photosRaw, &rc.Photos)

	// 4. Record Damage if reported
	if req.AdditionalDamages > 0 || req.DamageDescription != "" {
		damageID := uuid.New()
		desc := req.DamageDescription
		if desc == "" {
			desc = "Damage reported upon vehicle return check-in"
		}
		insertDamage := `
			INSERT INTO damage_records (id, tenant_id, vehicle_id, booking_id, description, severity, estimated_repair_cost, photos)
			VALUES ($1, $2, $3, $4, $5, 'moderate', $6, $7)
		`
		_, _ = tx.Exec(ctx, insertDamage, damageID, tenantID, vehicleID, bookingID, desc, req.AdditionalDamages, photosJSON)
	}

	// 5. Update Deposit handling
	var depID uuid.UUID
	var depAmount float64
	err = tx.QueryRow(ctx, "SELECT id, amount FROM deposits WHERE booking_id = $1 AND tenant_id = $2 LIMIT 1", bookingID, tenantID).Scan(&depID, &depAmount)
	if err == nil {
		deduct := req.DepositDeduction
		if deduct > depAmount {
			deduct = depAmount
		}
		refund := depAmount - deduct
		depStatus := "released"
		if deduct > 0 {
			depStatus = "partially_deducted"
		}
		updateDeposit := `
			UPDATE deposits
			SET status = $1,
			    deducted_amount = $2,
			    refunded_amount = $3,
			    deduction_reason = $4,
			    released_at = NOW(),
			    updated_at = NOW()
			WHERE id = $5
		`
		_, _ = tx.Exec(ctx, updateDeposit, depStatus, deduct, refund, req.DepositRefundNote, depID)
	}

	// 6. Update Booking record
	updateBooking := `
		UPDATE bookings
		SET status = 'completed',
		    actual_return_at = NOW(),
		    completed_at = NOW(),
		    return_odometer = $1,
		    return_fuel = $2,
		    return_notes = $3,
		    return_photos = $4,
		    extra_charges = $5,
		    tax_amount = $6,
		    total_amount = $7,
		    balance_due = $8,
		    payment_status = $9,
		    updated_at = NOW()
		WHERE id = $10
	`
	if _, err := tx.Exec(ctx, updateBooking, req.Odometer, req.FuelLevel, req.Notes, photosJSON, totalExtraCharges, newTax, newTotal, newBalanceDue, newPaymentStatus, bookingID); err != nil {
		return nil, err
	}

	// 7. Update Vehicle record
	vNextStatus := "available"
	if req.AdditionalDamages > 0 {
		vNextStatus = "maintenance"
	}
	updateVehicle := `
		UPDATE vehicles
		SET status = $1,
		    odometer = $2,
		    updated_at = NOW()
		WHERE id = $3
	`
	if _, err := tx.Exec(ctx, updateVehicle, vNextStatus, req.Odometer, vehicleID); err != nil {
		return nil, err
	}

	// 8. Auto-generate Final Invoice
	invID := uuid.New()
	invNumber := fmt.Sprintf("INV-%s-%s", time.Now().Format("20060102"), strings.ToUpper(uuid.New().String()[:6]))
	insertInvoice := `
		INSERT INTO invoices (
			id, tenant_id, booking_id, customer_id, invoice_number,
			subtotal, tax_amount, discount_amount, total_amount, paid_amount, balance_due,
			status, due_date, issued_date
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, $10, $11,
			'issued', CURRENT_DATE, CURRENT_DATE
		)
	`
	subtotal := rentalAmount + insuranceAmount + totalExtraCharges
	_, _ = tx.Exec(ctx, insertInvoice, invID, tenantID, bookingID, customerID, invNumber, subtotal, newTax, discountAmount, newTotal, paidAmount, newBalanceDue)

	// Insert invoice items
	insertItem := `INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total_price) VALUES ($1, $2, $3, 1, $4, $4)`
	_, _ = tx.Exec(ctx, insertItem, uuid.New(), invID, "Base Rental Duration", rentalAmount)
	if insuranceAmount > 0 {
		_, _ = tx.Exec(ctx, insertItem, uuid.New(), invID, "Rental Insurance Coverage", insuranceAmount)
	}
	if extraKmFee > 0 {
		_, _ = tx.Exec(ctx, insertItem, uuid.New(), invID, "Excess Mileage Surcharge", extraKmFee)
	}
	if req.AdditionalDamages > 0 {
		_, _ = tx.Exec(ctx, insertItem, uuid.New(), invID, "Vehicle Damage Surcharge", req.AdditionalDamages)
	}
	if req.FuelCharge > 0 {
		_, _ = tx.Exec(ctx, insertItem, uuid.New(), invID, "Fuel Refill Surcharge", req.FuelCharge)
	}

	// 9. Record status audit
	if err := s.recordStatusHistory(ctx, tx, tenantID, bookingID, string(currentStatus), string(StatusCompleted), "staff", "Vehicle returned, checklist signed, charges finalized and invoice issued"); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &rc, nil
}

func (s *Service) GetChecklists(ctx context.Context, tenantID, bookingID uuid.UUID) ([]RentalChecklist, error) {
	query := `
		SELECT rc.id, rc.booking_id, rc.checklist_type, rc.odometer, rc.fuel_level,
		       COALESCE(rc.exterior_condition, ''), COALESCE(rc.interior_condition, ''),
		       rc.photos, rc.inspector_id, COALESCE(rc.customer_signature, ''), rc.created_at
		FROM rental_checklists rc
		JOIN bookings b ON b.id = rc.booking_id
		WHERE b.id = $1 AND b.tenant_id = $2
		ORDER BY rc.created_at ASC
	`
	rows, err := s.pool.Query(ctx, query, bookingID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]RentalChecklist, 0)
	for rows.Next() {
		var rc RentalChecklist
		var photosRaw []byte
		if err := rows.Scan(
			&rc.ID, &rc.BookingID, &rc.ChecklistType, &rc.Odometer, &rc.FuelLevel,
			&rc.ExteriorCondition, &rc.InteriorCondition, &photosRaw, &rc.InspectorID, &rc.CustomerSignature, &rc.CreatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(photosRaw, &rc.Photos)
		list = append(list, rc)
	}
	return list, nil
}

func (s *Service) GetStatusHistory(ctx context.Context, tenantID, bookingID uuid.UUID) ([]BookingStatusHistory, error) {
	query := `
		SELECT id, tenant_id, booking_id, from_status, to_status, changed_by, COALESCE(reason, ''), created_at
		FROM booking_status_history
		WHERE booking_id = $1 AND tenant_id = $2
		ORDER BY created_at ASC
	`
	rows, err := s.pool.Query(ctx, query, bookingID, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]BookingStatusHistory, 0)
	for rows.Next() {
		var h BookingStatusHistory
		if err := rows.Scan(&h.ID, &h.TenantID, &h.BookingID, &h.FromStatus, &h.ToStatus, &h.ChangedBy, &h.Reason, &h.CreatedAt); err != nil {
			return nil, err
		}
		list = append(list, h)
	}
	return list, nil
}

func (s *Service) GetOperationsSummary(ctx context.Context, tenantID uuid.UUID) (*OperationsSummary, error) {
	summary := &OperationsSummary{
		Currency:       "NPR",
		CurrencySymbol: "Rs.",
	}
	if s.pool == nil {
		return summary, nil
	}

	// Active rentals count
	_ = s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM bookings WHERE tenant_id = $1 AND status = 'active'", tenantID).Scan(&summary.ActiveRentalsCount)

	// Pickups today (start_date::date = CURRENT_DATE, status in confirmed, pickup_scheduled, pickup_in_progress)
	_ = s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM bookings WHERE tenant_id = $1 AND (start_date AT TIME ZONE 'Asia/Kathmandu')::date = (NOW() AT TIME ZONE 'Asia/Kathmandu')::date AND status IN ('confirmed', 'pickup_scheduled', 'pickup_in_progress')", tenantID).Scan(&summary.PickupsTodayCount)

	// Returns today (end_date::date = CURRENT_DATE, status = 'active')
	_ = s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM bookings WHERE tenant_id = $1 AND (end_date AT TIME ZONE 'Asia/Kathmandu')::date = (NOW() AT TIME ZONE 'Asia/Kathmandu')::date AND status = 'active'", tenantID).Scan(&summary.ReturnsTodayCount)

	// Pending confirmation count
	_ = s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM bookings WHERE tenant_id = $1 AND status IN ('pending', 'pending_confirmation', 'pending_verification', 'pending_payment')", tenantID).Scan(&summary.PendingConfirmationCount)

	// Overdue returns count (active but end_date < NOW())
	_ = s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM bookings WHERE tenant_id = $1 AND status = 'active' AND end_date < NOW()", tenantID).Scan(&summary.OverdueReturnsCount)

	// Deposits currently held sum
	_ = s.pool.QueryRow(ctx, "SELECT COALESCE(SUM(amount), 0) FROM deposits WHERE tenant_id = $1 AND status = 'held'", tenantID).Scan(&summary.TotalDepositsHeld)

	// Fleet counts
	_ = s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM vehicles WHERE tenant_id = $1", tenantID).Scan(&summary.TotalFleetCount)
	_ = s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM vehicles WHERE tenant_id = $1 AND status = 'rented'", tenantID).Scan(&summary.RentedFleetCount)
	_ = s.pool.QueryRow(ctx, "SELECT COUNT(*) FROM vehicles WHERE tenant_id = $1 AND status = 'available'", tenantID).Scan(&summary.AvailableFleetCount)

	return summary, nil
}

func (s *Service) ExtendBooking(ctx context.Context, tenantID, bookingID uuid.UUID, newEndDate time.Time) (*Booking, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var (
		currentStatus BookingStatus
		vehicleID     uuid.UUID
		currentEnd    time.Time
		rentalAmount  float64
		start         time.Time
	)
	query := `
		SELECT status, vehicle_id, start_date, end_date, rental_amount
		FROM bookings
		WHERE id = $1 AND tenant_id = $2
		FOR UPDATE
	`
	err = tx.QueryRow(ctx, query, bookingID, tenantID).Scan(&currentStatus, &vehicleID, &start, &currentEnd, &rentalAmount)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}

	if newEndDate.Before(currentEnd) || newEndDate.Equal(currentEnd) {
		return nil, fmt.Errorf("new end date must be after current end date")
	}

	// Overlap check
	var conflict bool
	overlapQuery := `
		SELECT EXISTS(
			SELECT 1 FROM bookings
			WHERE vehicle_id = $1 AND tenant_id = $2 AND id != $3
			AND status IN ('confirmed', 'pickup_scheduled', 'pickup_in_progress', 'active', 'return_in_progress')
			AND start_date < $4 AND end_date > $5
		)
	`
	err = tx.QueryRow(ctx, overlapQuery, vehicleID, tenantID, bookingID, newEndDate, currentEnd).Scan(&conflict)
	if err != nil {
		return nil, err
	}
	if conflict {
		return nil, ErrVehicleAlreadyBooked
	}

	// Recalculate duration and rate
	oldDays := CalculateRentalDays(start, currentEnd)
	newDays := CalculateRentalDays(start, newEndDate)
	extraDays := newDays - oldDays
	if extraDays < 1 {
		extraDays = 1
	}

	dailyRate := rentalAmount / float64(oldDays)
	extraAmount := float64(extraDays) * dailyRate
	taxOnExtra := math.Round(extraAmount*StandardNepalVATRate*100) / 100
	totalExtra := extraAmount + taxOnExtra

	_, err = tx.Exec(ctx, `
		UPDATE bookings
		SET end_date = $1,
		    rental_amount = rental_amount + $2,
		    tax_amount = tax_amount + $3,
		    total_amount = total_amount + $4,
		    balance_due = balance_due + $4,
		    updated_at = NOW()
		WHERE id = $5
	`, newEndDate, extraAmount, taxOnExtra, totalExtra, bookingID)
	if err != nil {
		return nil, err
	}

	auditMsg := fmt.Sprintf("Rental duration extended to %s (Added %d days, Rs. %.2f)", newEndDate.Format("2006-01-02 15:04"), extraDays, totalExtra)
	if err := s.recordStatusHistory(ctx, tx, tenantID, bookingID, string(currentStatus), string(currentStatus), "staff", auditMsg); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.GetBooking(ctx, tenantID, bookingID)
}

func (s *Service) ScheduleBooking(ctx context.Context, tenantID, bookingID uuid.UUID, newStartDate, newEndDate time.Time) (*Booking, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var currentStatus BookingStatus
	var vehicleID uuid.UUID
	var paidAmount float64
	err = tx.QueryRow(ctx, "SELECT status, vehicle_id, paid_amount FROM bookings WHERE id = $1 AND tenant_id = $2 FOR UPDATE", bookingID, tenantID).Scan(&currentStatus, &vehicleID, &paidAmount)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}

	if currentStatus == StatusActive || currentStatus == StatusCompleted || currentStatus == StatusCancelled {
		return nil, fmt.Errorf("cannot reschedule a %s booking", currentStatus)
	}

	// Overlap check
	var conflict bool
	overlapQuery := `
		SELECT EXISTS(
			SELECT 1 FROM bookings
			WHERE vehicle_id = $1 AND tenant_id = $2 AND id != $3
			AND status IN ('confirmed', 'pickup_scheduled', 'pickup_in_progress', 'active', 'return_in_progress')
			AND start_date < $4 AND end_date > $5
		)
	`
	err = tx.QueryRow(ctx, overlapQuery, vehicleID, tenantID, bookingID, newEndDate, newStartDate).Scan(&conflict)
	if err != nil {
		return nil, err
	}
	if conflict {
		return nil, ErrVehicleAlreadyBooked
	}

	// Recalculate quote
	quote, snapshot, err := s.pricing.CalculateQuote(ctx, tenantID, vehicleID, newStartDate, newEndDate, "", false, nil, 0, 0, 0)
	if err != nil {
		return nil, err
	}
	snapJSON, _ := json.Marshal(snapshot)

	balanceDue := math.Round((quote.TotalAmount-paidAmount)*100) / 100
	if balanceDue < 0 {
		balanceDue = 0
	}
	paymentStatus := PaymentStatusUnpaid
	if balanceDue == 0 && quote.TotalAmount > 0 {
		paymentStatus = PaymentStatusPaid
	} else if paidAmount > 0 {
		paymentStatus = PaymentStatusPartiallyPaid
	}

	_, err = tx.Exec(ctx, `
		UPDATE bookings
		SET start_date = $1, end_date = $2,
		    rental_amount = $3, tax_amount = $4, total_amount = $5, balance_due = $6,
		    payment_status = $7, pricing_snapshot = $8, updated_at = NOW()
		WHERE id = $9
	`, newStartDate, newEndDate, quote.RentalAmount, quote.TaxAmount, quote.TotalAmount, balanceDue, paymentStatus, snapJSON, bookingID)
	if err != nil {
		return nil, err
	}

	auditMsg := fmt.Sprintf("Booking rescheduled to %s - %s", newStartDate.Format("2006-01-02"), newEndDate.Format("2006-01-02"))
	if err := s.recordStatusHistory(ctx, tx, tenantID, bookingID, string(currentStatus), string(currentStatus), "staff", auditMsg); err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}
	return s.GetBooking(ctx, tenantID, bookingID)
}

func (s *Service) GetCalendarEvents(ctx context.Context, tenantID uuid.UUID, start, end time.Time) ([]map[string]any, error) {
	if start.IsZero() {
		start = time.Now().AddDate(0, -1, 0)
	}
	if end.IsZero() {
		end = time.Now().AddDate(0, 2, 0)
	}
	query := `
		SELECT b.id, b.booking_code, b.vehicle_id, v.make || ' ' || v.model, v.plate_number,
		       c.full_name, b.start_date, b.end_date, b.status, b.total_amount
		FROM bookings b
		JOIN vehicles v ON v.id = b.vehicle_id
		JOIN customers c ON c.id = b.customer_id
		WHERE b.tenant_id = $1 AND b.start_date < $3 AND b.end_date > $2
		ORDER BY b.start_date ASC
	`
	rows, err := s.pool.Query(ctx, query, tenantID, start, end)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	events := make([]map[string]any, 0)
	for rows.Next() {
		var id, bNum, vID, vName, plate, cName, status string
		var sDate, eDate time.Time
		var total float64
		if err := rows.Scan(&id, &bNum, &vID, &vName, &plate, &cName, &sDate, &eDate, &status, &total); err != nil {
			return nil, err
		}
		events = append(events, map[string]any{
			"id":             id,
			"booking_number": bNum,
			"vehicle_id":     vID,
			"vehicle_name":   vName,
			"plate_number":   plate,
			"customer_name":  cName,
			"start":          sDate,
			"end":            eDate,
			"status":         status,
			"total_amount":   total,
		})
	}
	return events, nil
}

func (s *Service) ListActiveRentals(ctx context.Context, tenantID uuid.UUID) ([]Booking, error) {
	list, _, err := s.ListBookings(ctx, tenantID, nil, nil, "active", "", pagination.Params{Page: 1, Limit: 100})
	return list, err
}

func (s *Service) UpdateBooking(ctx context.Context, tenantID, bookingID uuid.UUID, req UpdateBookingRequest) (*Booking, error) {
	current, err := s.GetBooking(ctx, tenantID, bookingID)
	if err != nil {
		return nil, err
	}

	pickupLoc := current.PickupLocationID
	if req.PickupLocationID != nil {
		pickupLoc = *req.PickupLocationID
	}

	returnLoc := current.ReturnLocationID
	if req.ReturnLocationID != nil {
		returnLoc = *req.ReturnLocationID
	}

	notes := current.Notes
	if req.Notes != nil {
		notes = *req.Notes
	}

	_, err = s.pool.Exec(ctx, `
		UPDATE bookings
		SET pickup_location_id = $1,
		    return_location_id = $2,
		    notes = $3,
		    updated_at = NOW()
		WHERE id = $4 AND tenant_id = $5
	`, pickupLoc, returnLoc, notes, bookingID, tenantID)
	if err != nil {
		return nil, err
	}

	if req.StartDate != nil && req.EndDate != nil {
		return s.ScheduleBooking(ctx, tenantID, bookingID, *req.StartDate, *req.EndDate)
	}

	return s.GetBooking(ctx, tenantID, bookingID)
}
