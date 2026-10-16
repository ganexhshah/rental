package maintenance

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type MaintenanceVendor struct {
	ID           uuid.UUID `json:"id"`
	TenantID     uuid.UUID `json:"tenant_id"`
	Name         string    `json:"name"`
	ServiceType  string    `json:"service_type"`
	ContactPhone string    `json:"contact_phone,omitempty"`
	ContactEmail string    `json:"contact_email,omitempty"`
	Address      string    `json:"address,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

type MaintenanceRecord struct {
	ID              uuid.UUID  `json:"id"`
	TenantID        uuid.UUID  `json:"tenant_id"`
	VehicleID       uuid.UUID  `json:"vehicle_id"`
	VehicleMake     string     `json:"vehicle_make,omitempty"`
	VehicleModel    string     `json:"vehicle_model,omitempty"`
	VehiclePlate    string     `json:"vehicle_plate,omitempty"`
	VendorID        *uuid.UUID `json:"vendor_id,omitempty"`
	VendorName      string     `json:"vendor_name,omitempty"`
	TaskNumber      string     `json:"task_number"`
	Title           string     `json:"title"`
	Description     string     `json:"description,omitempty"`
	Priority        string     `json:"priority"` // low, medium, high, urgent
	Status          string     `json:"status"`   // scheduled, in_progress, completed, cancelled
	EstimatedCost   float64    `json:"estimated_cost"`
	ActualCost      float64    `json:"actual_cost"`
	OdometerReading *int       `json:"odometer_reading,omitempty"`
	ScheduledDate   time.Time  `json:"scheduled_date"`
	CompletedDate   *time.Time `json:"completed_date,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type MaintenanceWorkOrder struct {
	ID                  uuid.UUID       `json:"id"`
	TenantID            uuid.UUID       `json:"tenant_id"`
	MaintenanceRecordID uuid.UUID       `json:"maintenance_record_id"`
	WorkOrderNumber     string          `json:"work_order_number"`
	LaborCost           float64         `json:"labor_cost"`
	PartsCost           float64         `json:"parts_cost"`
	TotalCost           float64         `json:"total_cost"`
	PartsList           json.RawMessage `json:"parts_list"`
	DowntimeDays        int             `json:"downtime_days"`
	MechanicNotes       string          `json:"mechanic_notes,omitempty"`
	InvoiceURL          string          `json:"invoice_url,omitempty"`
	DocumentID          *uuid.UUID      `json:"document_id,omitempty"`
	DocumentURL         string          `json:"document_url,omitempty"`
	Status              string          `json:"status"` // draft, approved, completed, cancelled
	CreatedAt           time.Time       `json:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at"`
}

type PreventiveSchedule struct {
	ID              uuid.UUID  `json:"id"`
	TenantID        uuid.UUID  `json:"tenant_id"`
	VehicleID       uuid.UUID  `json:"vehicle_id"`
	VehiclePlate    string     `json:"vehicle_plate,omitempty"`
	ServiceType     string     `json:"service_type"`
	IntervalKM      int        `json:"interval_km"`
	IntervalMonths  int        `json:"interval_months"`
	LastServiceKM   int        `json:"last_service_km"`
	LastServiceDate *time.Time `json:"last_service_date,omitempty"`
	NextDueKM       int        `json:"next_due_km"`
	NextDueDate     *time.Time `json:"next_due_date,omitempty"`
	IsActive        bool       `json:"is_active"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type Inspection struct {
	ID                   uuid.UUID       `json:"id"`
	TenantID             uuid.UUID       `json:"tenant_id"`
	BookingID            uuid.UUID       `json:"booking_id"`
	BookingCode          string          `json:"booking_code,omitempty"`
	VehicleID            uuid.UUID       `json:"vehicle_id"`
	VehiclePlate         string          `json:"vehicle_plate,omitempty"`
	InspectorID          *uuid.UUID      `json:"inspector_id,omitempty"`
	InspectionType       string          `json:"inspection_type"` // pickup, return, routine
	Odometer             int             `json:"odometer"`
	FuelLevel            string          `json:"fuel_level"`
	ChecklistData        json.RawMessage `json:"checklist_data"`
	ExteriorNotes        string          `json:"exterior_notes,omitempty"`
	InteriorNotes        string          `json:"interior_notes,omitempty"`
	Photos               json.RawMessage `json:"photos"`
	CustomerSignatureURL string          `json:"customer_signature_url,omitempty"`
	StaffSignatureURL    string          `json:"staff_signature_url,omitempty"`
	DocumentID           *uuid.UUID      `json:"document_id,omitempty"`
	DocumentURL          string          `json:"document_url,omitempty"`
	CreatedAt            time.Time       `json:"created_at"`
}

type DamageRecord struct {
	ID                     uuid.UUID       `json:"id"`
	TenantID               uuid.UUID       `json:"tenant_id"`
	VehicleID              uuid.UUID       `json:"vehicle_id"`
	VehiclePlate           string          `json:"vehicle_plate,omitempty"`
	BookingID              *uuid.UUID      `json:"booking_id,omitempty"`
	InspectionID           *uuid.UUID      `json:"inspection_id,omitempty"`
	Description            string          `json:"description"`
	Category               string          `json:"category"` // exterior, interior, mechanical, tires
	Severity               string          `json:"severity"` // minor, moderate, severe
	Photos                 json.RawMessage `json:"photos"`
	EstimatedRepairCost    float64         `json:"estimated_repair_cost"`
	IsChargeable           bool            `json:"is_chargeable"`
	CustomerAcknowledged   bool            `json:"customer_acknowledged"`
	CustomerAcknowledgedAt *time.Time      `json:"customer_acknowledged_at,omitempty"`
	InvoiceID              *uuid.UUID      `json:"invoice_id,omitempty"`
	MaintenanceRecordID    *uuid.UUID      `json:"maintenance_record_id,omitempty"`
	IsRepaired             bool            `json:"is_repaired"`
	CreatedAt              time.Time       `json:"created_at"`
	UpdatedAt              time.Time       `json:"updated_at"`
}

type CreateVendorRequest struct {
	Name         string `json:"name" validate:"required"`
	ServiceType  string `json:"service_type" validate:"required"`
	ContactPhone string `json:"contact_phone"`
	ContactEmail string `json:"contact_email"`
	Address      string `json:"address"`
}

type CreateRecordRequest struct {
	VehicleID       uuid.UUID  `json:"vehicle_id" validate:"required"`
	VendorID        *uuid.UUID `json:"vendor_id"`
	Title           string     `json:"title" validate:"required"`
	Description     string     `json:"description"`
	Priority        string     `json:"priority" validate:"required,oneof=low medium high urgent"`
	EstimatedCost   float64    `json:"estimated_cost"`
	OdometerReading *int       `json:"odometer_reading"`
	ScheduledDate   time.Time  `json:"scheduled_date" validate:"required"`
}

type CreateWorkOrderRequest struct {
	MaintenanceRecordID uuid.UUID       `json:"maintenance_record_id" validate:"required"`
	LaborCost           float64         `json:"labor_cost"`
	PartsCost           float64         `json:"parts_cost"`
	PartsList           json.RawMessage `json:"parts_list"`
	DowntimeDays        int             `json:"downtime_days"`
	MechanicNotes       string          `json:"mechanic_notes"`
}

type CreateInspectionRequest struct {
	BookingID            uuid.UUID       `json:"booking_id" validate:"required"`
	VehicleID            uuid.UUID       `json:"vehicle_id" validate:"required"`
	InspectionType       string          `json:"inspection_type" validate:"required,oneof=pickup return routine"`
	Odometer             int             `json:"odometer" validate:"required"`
	FuelLevel            string          `json:"fuel_level" validate:"required"`
	ChecklistData        json.RawMessage `json:"checklist_data"`
	ExteriorNotes        string          `json:"exterior_notes"`
	InteriorNotes        string          `json:"interior_notes"`
	Photos               json.RawMessage `json:"photos"`
	CustomerSignatureURL string          `json:"customer_signature_url"`
	StaffSignatureURL    string          `json:"staff_signature_url"`
}

type CreateDamageRequest struct {
	VehicleID           uuid.UUID       `json:"vehicle_id" validate:"required"`
	BookingID           *uuid.UUID      `json:"booking_id"`
	InspectionID        *uuid.UUID      `json:"inspection_id"`
	Description         string          `json:"description" validate:"required"`
	Category            string          `json:"category"`
	Severity            string          `json:"severity" validate:"required,oneof=minor moderate severe"`
	EstimatedRepairCost float64         `json:"estimated_repair_cost"`
	IsChargeable        bool            `json:"is_chargeable"`
	Photos              json.RawMessage `json:"photos"`
}
