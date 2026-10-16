package payment

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type PaymentCategory string

const (
	CategoryRental    PaymentCategory = "rental"
	CategoryDeposit   PaymentCategory = "deposit"
	CategoryExtension PaymentCategory = "extension"
	CategoryDamageFee PaymentCategory = "damage_fee"
	CategoryLateFee   PaymentCategory = "late_fee"
)

type PaymentMethod string

const (
	MethodCash         PaymentMethod = "cash"
	MethodCard         PaymentMethod = "card"
	MethodEsewa        PaymentMethod = "esewa"
	MethodKhalti       PaymentMethod = "khalti"
	MethodFonepay      PaymentMethod = "fonepay"
	MethodBankTransfer PaymentMethod = "bank_transfer"
)

type Payment struct {
	ID                uuid.UUID       `json:"id"`
	TenantID          uuid.UUID       `json:"tenant_id"`
	BookingID         *uuid.UUID      `json:"booking_id,omitempty"`
	CustomerID        *uuid.UUID      `json:"customer_id,omitempty"`
	CustomerName      string          `json:"customer_name,omitempty"`
	TransactionNumber string          `json:"transaction_number"`
	Amount            float64         `json:"amount"`
	Currency          string          `json:"currency"`
	Category          PaymentCategory `json:"category"`
	Method            PaymentMethod   `json:"method"`
	Gateway           string          `json:"gateway"`
	GatewayReference  string          `json:"gateway_reference,omitempty"`
	IdempotencyKey    string          `json:"idempotency_key,omitempty"`
	Status            string          `json:"status"` // completed, pending, failed, refunded
	Notes             string          `json:"notes,omitempty"`
	ReceiptNumber     string          `json:"receipt_number,omitempty"`
	DocumentID        *uuid.UUID      `json:"document_id,omitempty"`
	SettledAt         *time.Time      `json:"settled_at,omitempty"`
	CreatedAt         time.Time       `json:"created_at"`
}

type ProcessPaymentRequest struct {
	BookingID      *uuid.UUID      `json:"booking_id,omitempty"`
	CustomerID     *uuid.UUID      `json:"customer_id,omitempty"`
	Amount         float64         `json:"amount" validate:"required,gt=0"`
	Category       PaymentCategory `json:"category" validate:"required"`
	Method         PaymentMethod   `json:"method" validate:"required"`
	IdempotencyKey string          `json:"idempotency_key"`
	ReturnURL      string          `json:"return_url,omitempty"`
	Notes          string          `json:"notes,omitempty"`
	InvoiceID      *uuid.UUID      `json:"invoice_id,omitempty"`
}

type ProcessPaymentResponse struct {
	Payment       *Payment `json:"payment"`
	PaymentURL    string   `json:"payment_url,omitempty"`
	ReceiptNumber string   `json:"receipt_number,omitempty"`
	ReceiptURL    string   `json:"receipt_url,omitempty"`
}

type PaymentAttempt struct {
	ID              uuid.UUID       `json:"id"`
	TenantID        uuid.UUID       `json:"tenant_id"`
	PaymentID       *uuid.UUID      `json:"payment_id,omitempty"`
	BookingID       *uuid.UUID      `json:"booking_id,omitempty"`
	Gateway         string          `json:"gateway"`
	AttemptNumber   int             `json:"attempt_number"`
	Amount          float64         `json:"amount"`
	Currency        string          `json:"currency"`
	Status          string          `json:"status"` // initiated, pending, success, failed
	RequestPayload  json.RawMessage `json:"request_payload"`
	ResponsePayload json.RawMessage `json:"response_payload"`
	ErrorCode       string          `json:"error_code,omitempty"`
	ErrorMessage    string          `json:"error_message,omitempty"`
	IPAddress       string          `json:"ip_address,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
}

type PaymentReceipt struct {
	ID            uuid.UUID  `json:"id"`
	TenantID      uuid.UUID  `json:"tenant_id"`
	ReceiptNumber string     `json:"receipt_number"`
	PaymentID     uuid.UUID  `json:"payment_id"`
	CustomerID    *uuid.UUID `json:"customer_id,omitempty"`
	BookingID     *uuid.UUID `json:"booking_id,omitempty"`
	Amount        float64    `json:"amount"`
	Currency      string     `json:"currency"`
	PaymentMethod string     `json:"payment_method"`
	DocumentID    *uuid.UUID `json:"document_id,omitempty"`
	ReceiptURL    string     `json:"receipt_url,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
}

type PaymentAllocation struct {
	ID             uuid.UUID `json:"id"`
	TenantID       uuid.UUID `json:"tenant_id"`
	PaymentID      uuid.UUID `json:"payment_id"`
	InvoiceID      uuid.UUID `json:"invoice_id"`
	Amount         float64   `json:"amount"`
	AllocationType string    `json:"allocation_type"`
	CreatedAt      time.Time `json:"created_at"`
}

type RefundRequest struct {
	PaymentID uuid.UUID `json:"payment_id" validate:"required"`
	Amount    float64   `json:"amount" validate:"required,gt=0"`
	Reason    string    `json:"reason" validate:"required"`
}

type Refund struct {
	ID          uuid.UUID  `json:"id"`
	TenantID    uuid.UUID  `json:"tenant_id"`
	PaymentID   *uuid.UUID `json:"payment_id,omitempty"`
	BookingID   *uuid.UUID `json:"booking_id,omitempty"`
	Amount      float64    `json:"amount"`
	Reason      string     `json:"reason"`
	Status      string     `json:"status"`
	ProcessedAt *time.Time `json:"processed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

type Invoice struct {
	ID                  uuid.UUID     `json:"id"`
	TenantID            uuid.UUID     `json:"tenant_id"`
	BookingID           *uuid.UUID    `json:"booking_id,omitempty"`
	BookingCode         string        `json:"booking_code,omitempty"`
	CustomerID          uuid.UUID     `json:"customer_id"`
	CustomerName        string        `json:"customer_name,omitempty"`
	CustomerEmail       string        `json:"customer_email,omitempty"`
	InvoiceNumber       string        `json:"invoice_number"`
	Subtotal            float64       `json:"subtotal"`
	TaxAmount           float64       `json:"tax_amount"`
	DiscountAmount      float64       `json:"discount_amount"`
	TotalAmount         float64       `json:"total_amount"`
	PaidAmount          float64       `json:"paid_amount"`
	BalanceDue          float64       `json:"balance_due"`
	Status              string        `json:"status"` // draft, issued, partially_paid, paid, void, overdue, cancelled
	DueDate             time.Time     `json:"due_date"`
	IssuedDate          time.Time     `json:"issued_date"`
	Terms               string        `json:"terms,omitempty"`
	PaymentInstructions string        `json:"payment_instructions,omitempty"`
	VoidedAt            *time.Time    `json:"voided_at,omitempty"`
	VoidReason          string        `json:"void_reason,omitempty"`
	DocumentID          *uuid.UUID    `json:"document_id,omitempty"`
	DocumentURL         string        `json:"document_url,omitempty"`
	Items               []InvoiceItem `json:"items,omitempty"`
	CreatedAt           time.Time     `json:"created_at"`
	UpdatedAt           time.Time     `json:"updated_at"`
}

type InvoiceItem struct {
	ID          uuid.UUID `json:"id"`
	InvoiceID   uuid.UUID `json:"invoice_id"`
	Description string    `json:"description"`
	Quantity    int       `json:"quantity"`
	UnitPrice   float64   `json:"unit_price"`
	TotalPrice  float64   `json:"total_price"`
}

type CreateInvoiceRequest struct {
	CustomerID          uuid.UUID         `json:"customer_id" validate:"required"`
	BookingID           *uuid.UUID        `json:"booking_id,omitempty"`
	DueDate             time.Time         `json:"due_date" validate:"required"`
	IssuedDate          time.Time         `json:"issued_date"`
	Items               []CreateItemInput `json:"items" validate:"required,min=1"`
	DiscountAmount      float64           `json:"discount_amount"`
	TaxRate             float64           `json:"tax_rate"` // e.g. 13 for 13%
	Terms               string            `json:"terms,omitempty"`
	PaymentInstructions string            `json:"payment_instructions,omitempty"`
	IssueImmediately    bool              `json:"issue_immediately"`
}

type CreateItemInput struct {
	Description string  `json:"description" validate:"required"`
	Quantity    int     `json:"quantity" validate:"required,gt=0"`
	UnitPrice   float64 `json:"unit_price" validate:"required,gte=0"`
}

type CreditNote struct {
	ID               uuid.UUID  `json:"id"`
	TenantID         uuid.UUID  `json:"tenant_id"`
	InvoiceID        uuid.UUID  `json:"invoice_id"`
	CustomerID       uuid.UUID  `json:"customer_id"`
	CreditNoteNumber string     `json:"credit_note_number"`
	Amount           float64    `json:"amount"`
	Reason           string     `json:"reason"`
	Status           string     `json:"status"` // issued, void
	IssuedDate       time.Time  `json:"issued_date"`
	DocumentID       *uuid.UUID `json:"document_id,omitempty"`
	DocumentURL      string     `json:"document_url,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

type CreateCreditNoteRequest struct {
	InvoiceID uuid.UUID `json:"invoice_id" validate:"required"`
	Amount    float64   `json:"amount" validate:"required,gt=0"`
	Reason    string    `json:"reason" validate:"required"`
}

type VoidInvoiceRequest struct {
	Reason string `json:"reason" validate:"required"`
}

type DepositRecord struct {
	ID              uuid.UUID  `json:"id"`
	TenantID        uuid.UUID  `json:"tenant_id"`
	BookingID       uuid.UUID  `json:"booking_id"`
	BookingCode     string     `json:"booking_code,omitempty"`
	CustomerID      uuid.UUID  `json:"customer_id"`
	CustomerName    string     `json:"customer_name,omitempty"`
	Amount          float64    `json:"amount"`
	Status          string     `json:"status"` // held, released, partially_deducted, forfeited, refunded
	HoldMethod      string     `json:"hold_method"`
	DeductedAmount  float64    `json:"deducted_amount"`
	RefundedAmount  float64    `json:"refunded_amount"`
	ForfeitedAmount float64    `json:"forfeited_amount"`
	DeductionReason string     `json:"deduction_reason,omitempty"`
	ReleaseNotes    string     `json:"release_notes,omitempty"`
	ReleasedAt      *time.Time `json:"released_at,omitempty"`
	DocumentID      *uuid.UUID `json:"document_id,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
}

type DeductDepositRequest struct {
	DeductedAmount   float64 `json:"deducted_amount" validate:"required,gt=0"`
	Reason           string  `json:"reason" validate:"required"`
	ForfeitRemaining bool    `json:"forfeit_remaining"`
}
