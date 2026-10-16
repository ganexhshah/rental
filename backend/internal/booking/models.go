package booking

import (
	"time"

	"github.com/google/uuid"
)

type BookingStatus string

const (
	StatusDraft               BookingStatus = "draft"
	StatusQuote               BookingStatus = "quote"
	StatusPendingVerification BookingStatus = "pending_verification"
	StatusPendingPayment      BookingStatus = "pending_payment"
	StatusPendingConfirmation BookingStatus = "pending_confirmation"
	StatusPending             BookingStatus = "pending" // backward-compat alias
	StatusConfirmed           BookingStatus = "confirmed"
	StatusPickupScheduled     BookingStatus = "pickup_scheduled"
	StatusPickupInProgress    BookingStatus = "pickup_in_progress"
	StatusActive              BookingStatus = "active"
	StatusReturnInProgress    BookingStatus = "return_in_progress"
	StatusCompleted           BookingStatus = "completed"
	StatusCancelled           BookingStatus = "cancelled"
	StatusNoShow              BookingStatus = "no_show"
	StatusExpired             BookingStatus = "expired"
	StatusRejected            BookingStatus = "rejected"
)

type PaymentStatus string

const (
	PaymentStatusUnpaid        PaymentStatus = "unpaid"
	PaymentStatusPartiallyPaid PaymentStatus = "partially_paid"
	PaymentStatusPaid          PaymentStatus = "paid"
	PaymentStatusRefunded      PaymentStatus = "refunded"
)

type Extra struct {
	Name     string  `json:"name"`
	Price    float64 `json:"price"`
	Quantity int     `json:"quantity,omitempty"`
}

type PricingSnapshot struct {
	RentalDays       int       `json:"rental_days"`
	BaseRentalRate   float64   `json:"base_rental_rate"`
	RentalAmount     float64   `json:"rental_amount"`
	InsuranceAmount  float64   `json:"insurance_amount"`
	DiscountAmount   float64   `json:"discount_amount"`
	CouponCode       string    `json:"coupon_code,omitempty"`
	DeliveryFee      float64   `json:"delivery_fee,omitempty"`
	CollectionFee    float64   `json:"collection_fee,omitempty"`
	OneWayFee        float64   `json:"one_way_fee,omitempty"`
	ExtraKmFee       float64   `json:"extra_km_fee,omitempty"`
	FuelCharge       float64   `json:"fuel_charge,omitempty"`
	DamageCharge     float64   `json:"damage_charge,omitempty"`
	ExtraCharges     float64   `json:"extra_charges"`
	Extras           []Extra   `json:"extras,omitempty"`
	TaxableBase      float64   `json:"taxable_base"`
	TaxRate          float64   `json:"tax_rate"`
	TaxAmount        float64   `json:"tax_amount"`
	DepositAmount    float64   `json:"deposit_amount"`
	TotalAmount      float64   `json:"total_amount"`
	Currency         string    `json:"currency"`
	CurrencySymbol   string    `json:"currency_symbol"`
	CalculatedAt     time.Time `json:"calculated_at"`
}

type Booking struct {
	ID                       uuid.UUID        `json:"id"`
	TenantID                 uuid.UUID        `json:"tenant_id"`
	BookingCode              string           `json:"booking_code"`
	CustomerID               uuid.UUID        `json:"customer_id"`
	CustomerName             string           `json:"customer_name,omitempty"`
	CustomerEmail            string           `json:"customer_email,omitempty"`
	CustomerPhone            string           `json:"customer_phone,omitempty"`
	CustomerKYCStatus        string           `json:"customer_kyc_status,omitempty"`
	PrimaryDriverID          *uuid.UUID       `json:"primary_driver_id,omitempty"`
	DriverName               string           `json:"driver_name,omitempty"`
	DriverLicense            string           `json:"driver_license,omitempty"`
	VehicleID                uuid.UUID        `json:"vehicle_id"`
	VehicleMake              string           `json:"vehicle_make,omitempty"`
	VehicleModel             string           `json:"vehicle_model,omitempty"`
	VehiclePlate             string           `json:"vehicle_plate,omitempty"`
	VehicleType              string           `json:"vehicle_type,omitempty"`
	VehicleCategoryID        *uuid.UUID       `json:"vehicle_category_id,omitempty"`
	CategoryName             string           `json:"category_name,omitempty"`
	Source                   string           `json:"source"`
	PickupLocationID         uuid.UUID        `json:"pickup_location_id"`
	PickupLocation           string           `json:"pickup_location,omitempty"`
	ReturnLocationID         uuid.UUID        `json:"return_location_id"`
	ReturnLocation           string           `json:"return_location,omitempty"`
	StartDate                time.Time        `json:"start_date"`
	EndDate                  time.Time        `json:"end_date"`
	ActualPickupAt           *time.Time       `json:"actual_pickup_at,omitempty"`
	ActualReturnAt           *time.Time       `json:"actual_return_at,omitempty"`
	Status                   BookingStatus    `json:"status"`
	RentalAmount             float64          `json:"rental_amount"`
	InsuranceAmount          float64          `json:"insurance_amount"`
	DiscountAmount           float64          `json:"discount_amount"`
	TaxAmount                float64          `json:"tax_amount"`
	ExtraCharges             float64          `json:"extra_charges"`
	TotalAmount              float64          `json:"total_amount"`
	DepositAmount            float64          `json:"deposit_amount"`
	PaidAmount               float64          `json:"paid_amount"`
	BalanceDue               float64          `json:"balance_due"`
	PaymentStatus            PaymentStatus    `json:"payment_status"`
	PickupOdometer           *int             `json:"pickup_odometer,omitempty"`
	ReturnOdometer           *int             `json:"return_odometer,omitempty"`
	PickupFuel               string           `json:"pickup_fuel,omitempty"`
	ReturnFuel               string           `json:"return_fuel,omitempty"`
	PricingSnapshot          PricingSnapshot  `json:"pricing_snapshot"`
	Extras                   []Extra          `json:"extras,omitempty"`
	CancellationReason       string           `json:"cancellation_reason,omitempty"`
	CancelledAt              *time.Time       `json:"cancelled_at,omitempty"`
	CancelledBy              string           `json:"cancelled_by,omitempty"`
	CancellationFee          float64          `json:"cancellation_fee"`
	CompletedAt              *time.Time       `json:"completed_at,omitempty"`
	PickupNotes              string           `json:"pickup_notes,omitempty"`
	ReturnNotes              string           `json:"return_notes,omitempty"`
	PickupPhotos             []string         `json:"pickup_photos,omitempty"`
	ReturnPhotos             []string         `json:"return_photos,omitempty"`
	RejectionReason          string           `json:"rejection_reason,omitempty"`
	ReassignedFromVehicleID  *uuid.UUID       `json:"reassigned_from_vehicle_id,omitempty"`
	ReassignReason           string           `json:"reassign_reason,omitempty"`
	Notes                    string           `json:"notes,omitempty"`
	CreatedAt                time.Time        `json:"created_at"`
	UpdatedAt                time.Time        `json:"updated_at"`
}

type BookingStatusHistory struct {
	ID         uuid.UUID `json:"id"`
	TenantID   uuid.UUID `json:"tenant_id"`
	BookingID  uuid.UUID `json:"booking_id"`
	FromStatus string    `json:"from_status"`
	ToStatus   string    `json:"to_status"`
	ChangedBy  string    `json:"changed_by"`
	Reason     string    `json:"reason,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
}

type OperationsSummary struct {
	ActiveRentalsCount       int     `json:"active_rentals_count"`
	PickupsTodayCount        int     `json:"pickups_today_count"`
	ReturnsTodayCount        int     `json:"returns_today_count"`
	PendingConfirmationCount int     `json:"pending_confirmation_count"`
	OverdueReturnsCount      int     `json:"overdue_returns_count"`
	TotalDepositsHeld        float64 `json:"total_deposits_held"`
	TotalFleetCount          int     `json:"total_fleet_count"`
	RentedFleetCount         int     `json:"rented_fleet_count"`
	AvailableFleetCount      int     `json:"available_fleet_count"`
	Currency                 string  `json:"currency"`
	CurrencySymbol           string  `json:"currency_symbol"`
}

type EligibilityCheckResponse struct {
	IsEligible          bool     `json:"is_eligible"`
	CustomerKYCStatus   string   `json:"customer_kyc_status"`
	IsBlacklisted       bool     `json:"is_blacklisted"`
	BlacklistReason     string   `json:"blacklist_reason,omitempty"`
	DriverLicenseValid  bool     `json:"driver_license_valid"`
	DriverLicenseNumber string   `json:"driver_license_number,omitempty"`
	DriverLicenseExpiry *string  `json:"driver_license_expiry,omitempty"`
	Warnings            []string `json:"warnings"`
	Errors              []string `json:"errors"`
}

type PricingQuoteRequest struct {
	VehicleID     uuid.UUID `json:"vehicle_id" validate:"required"`
	StartDate     time.Time `json:"start_date" validate:"required"`
	EndDate       time.Time `json:"end_date" validate:"required"`
	CouponCode    string    `json:"coupon_code,omitempty"`
	Insurance     bool      `json:"insurance"`
	ExtraItems    []Extra   `json:"extra_items,omitempty"`
	DeliveryFee   float64   `json:"delivery_fee,omitempty"`
	CollectionFee float64   `json:"collection_fee,omitempty"`
	OneWayFee     float64   `json:"one_way_fee,omitempty"`
}

type PricingQuoteResponse struct {
	RentalDays      int     `json:"rental_days"`
	BaseRentalRate  float64 `json:"base_rental_rate"`
	RentalAmount    float64 `json:"rental_amount"`
	InsuranceAmount float64 `json:"insurance_amount"`
	DiscountAmount  float64 `json:"discount_amount"`
	ExtraCharges    float64 `json:"extra_charges"`
	TaxAmount       float64 `json:"tax_amount"` // 13% Nepal VAT
	DepositAmount   float64 `json:"deposit_amount"`
	TotalAmount     float64 `json:"total_amount"`
	Currency        string  `json:"currency"`       // Default NPR
	CurrencySymbol  string  `json:"currency_symbol"` // Default Rs.
}

type CreateBookingRequest struct {
	CustomerID        uuid.UUID     `json:"customer_id" validate:"required"`
	PrimaryDriverID   *uuid.UUID    `json:"primary_driver_id,omitempty"`
	VehicleID         uuid.UUID     `json:"vehicle_id" validate:"required"`
	VehicleCategoryID *uuid.UUID    `json:"vehicle_category_id,omitempty"`
	PickupLocationID  uuid.UUID     `json:"pickup_location_id" validate:"required"`
	ReturnLocationID  uuid.UUID     `json:"return_location_id" validate:"required"`
	StartDate         time.Time     `json:"start_date" validate:"required"`
	EndDate           time.Time     `json:"end_date" validate:"required"`
	InitialStatus     BookingStatus `json:"initial_status,omitempty"`
	Source            string        `json:"source,omitempty"`
	CouponCode        string        `json:"coupon_code,omitempty"`
	Insurance         bool          `json:"insurance"`
	ExtraItems        []Extra       `json:"extra_items,omitempty"`
	DeliveryFee       float64       `json:"delivery_fee,omitempty"`
	CollectionFee     float64       `json:"collection_fee,omitempty"`
	OneWayFee         float64       `json:"one_way_fee,omitempty"`
	Notes             string        `json:"notes,omitempty"`
}

type UpdateBookingRequest struct {
	StartDate        *time.Time `json:"start_date,omitempty"`
	EndDate          *time.Time `json:"end_date,omitempty"`
	PickupLocationID *uuid.UUID `json:"pickup_location_id,omitempty"`
	ReturnLocationID *uuid.UUID `json:"return_location_id,omitempty"`
	Notes            *string    `json:"notes,omitempty"`
}

type ChangeStatusRequest struct {
	Status BookingStatus `json:"status" validate:"required"`
	Reason string        `json:"reason,omitempty"`
}

type CancelBookingRequest struct {
	Reason string  `json:"reason" validate:"required"`
	Fee    float64 `json:"fee,omitempty"`
}

type NoShowRequest struct {
	Reason string  `json:"reason,omitempty"`
	Fee    float64 `json:"fee,omitempty"`
}

type AssignVehicleRequest struct {
	NewVehicleID uuid.UUID `json:"new_vehicle_id" validate:"required"`
	Reason       string    `json:"reason" validate:"required"`
}

type PickupRequest struct {
	Odometer          int      `json:"odometer" validate:"required,min=0"`
	FuelLevel         string   `json:"fuel_level" validate:"required"`
	ExteriorCondition string   `json:"exterior_condition"`
	InteriorCondition string   `json:"interior_condition"`
	Photos            []string `json:"photos,omitempty"`
	Notes             string   `json:"notes,omitempty"`
	CustomerSignature string   `json:"customer_signature,omitempty"`
}

type ReturnRequest struct {
	Odometer          int      `json:"odometer" validate:"required,min=0"`
	FuelLevel         string   `json:"fuel_level" validate:"required"`
	ExteriorCondition string   `json:"exterior_condition"`
	InteriorCondition string   `json:"interior_condition"`
	Photos            []string `json:"photos,omitempty"`
	Notes             string   `json:"notes,omitempty"`
	CustomerSignature string   `json:"customer_signature,omitempty"`
	AdditionalDamages float64  `json:"additional_damages,omitempty"`
	FuelCharge        float64  `json:"fuel_charge,omitempty"`
	DamageDescription string   `json:"damage_description,omitempty"`
	DepositDeduction  float64  `json:"deposit_deduction,omitempty"`
	DepositRefundNote string   `json:"deposit_refund_note,omitempty"`
}

type RentalChecklist struct {
	ID                uuid.UUID  `json:"id"`
	BookingID         uuid.UUID  `json:"booking_id"`
	ChecklistType     string     `json:"checklist_type"` // pickup, return
	Odometer          int        `json:"odometer"`
	FuelLevel         string     `json:"fuel_level"`
	ExteriorCondition string     `json:"exterior_condition,omitempty"`
	InteriorCondition string     `json:"interior_condition,omitempty"`
	Photos            []string   `json:"photos"`
	InspectorID       *uuid.UUID `json:"inspector_id,omitempty"`
	CustomerSignature string     `json:"customer_signature,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
}
