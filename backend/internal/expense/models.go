package expense

import (
	"time"

	"github.com/google/uuid"
)

type ExpenseCategory struct {
	ID            uuid.UUID `json:"id"`
	TenantID      uuid.UUID `json:"tenant_id"`
	Name          string    `json:"name"`
	MonthlyBudget float64   `json:"monthly_budget"`
	CreatedAt     time.Time `json:"created_at"`
}

type Expense struct {
	ID              uuid.UUID  `json:"id"`
	TenantID        uuid.UUID  `json:"tenant_id"`
	CategoryID      *uuid.UUID `json:"category_id,omitempty"`
	CategoryName    string     `json:"category_name,omitempty"`
	VehicleID       *uuid.UUID `json:"vehicle_id,omitempty"`
	VehiclePlate    string     `json:"vehicle_plate,omitempty"`
	ExpenseNumber   string     `json:"expense_number"`
	Category        string     `json:"category"` // fuel, maintenance, insurance, parts, marketing, other
	Title           string     `json:"title"`
	Description     string     `json:"description,omitempty"`
	Amount          float64    `json:"amount"`
	Currency        string     `json:"currency"`
	Date            time.Time  `json:"date"`
	Vendor          string     `json:"vendor,omitempty"`
	PaymentMethod   string     `json:"payment_method"`
	RecordedBy      string     `json:"recorded_by,omitempty"`
	IsTaxDeductible bool       `json:"is_tax_deductible"`
	Status          string     `json:"status"` // approved, pending, rejected
	ReceiptURL      string     `json:"receipt_url,omitempty"`
	ApprovedBy      string     `json:"approved_by,omitempty"`
	DocumentID      *uuid.UUID `json:"document_id,omitempty"`
	DocumentURL     string     `json:"document_url,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type ExpenseAllocation struct {
	ID         uuid.UUID  `json:"id"`
	TenantID   uuid.UUID  `json:"tenant_id"`
	ExpenseID  uuid.UUID  `json:"expense_id"`
	VehicleID  *uuid.UUID `json:"vehicle_id,omitempty"`
	LocationID *uuid.UUID `json:"location_id,omitempty"`
	Amount     float64    `json:"amount"`
	CreatedAt  time.Time  `json:"created_at"`
}

type CreateCategoryRequest struct {
	Name          string  `json:"name" validate:"required"`
	MonthlyBudget float64 `json:"monthly_budget"`
}

type CreateExpenseRequest struct {
	CategoryID      *uuid.UUID `json:"category_id"`
	VehicleID       *uuid.UUID `json:"vehicle_id"`
	Category        string     `json:"category" validate:"required"`
	Title           string     `json:"title" validate:"required"`
	Description     string     `json:"description"`
	Amount          float64    `json:"amount" validate:"required,gt=0"`
	Date            time.Time  `json:"date" validate:"required"`
	Vendor          string     `json:"vendor"`
	PaymentMethod   string     `json:"payment_method"`
	IsTaxDeductible bool       `json:"is_tax_deductible"`
	ReceiptURL      string     `json:"receipt_url"`
}
