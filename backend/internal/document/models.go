package document

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type DocType string

const (
	DocTypeInvoice             DocType = "invoice"
	DocTypePaymentReceipt      DocType = "payment_receipt"
	DocTypeDepositReceipt      DocType = "deposit_receipt"
	DocTypeRefundReceipt       DocType = "refund_receipt"
	DocTypeCreditNote          DocType = "credit_note"
	DocTypeRentalContract      DocType = "rental_contract"
	DocTypeHandoverSheet       DocType = "handover_sheet"
	DocTypeReturnReport        DocType = "return_report"
	DocTypeMaintenanceWorkOrder DocType = "maintenance_work_order"
	DocTypeExpenseReport       DocType = "expense_report"
	DocTypeBookingConfirmation DocType = "booking_confirmation"
	DocTypeDailyOpsReport      DocType = "daily_ops_report"
)

type Document struct {
	ID             uuid.UUID       `json:"id"`
	TenantID       uuid.UUID       `json:"tenant_id"`
	DocType        DocType         `json:"doc_type"`
	DocumentNumber string          `json:"document_number"`
	Title          string          `json:"title"`
	EntityType     string          `json:"entity_type"`
	EntityID       uuid.UUID       `json:"entity_id"`
	Status         string          `json:"status"` // issued, signed, voided, draft
	CurrentVersion int             `json:"current_version"`
	Metadata       json.RawMessage `json:"metadata,omitempty"`
	CreatedAt      time.Time       `json:"created_at"`
	UpdatedAt      time.Time       `json:"updated_at"`

	// Populated from latest version
	LatestVersion *DocumentVersion `json:"latest_version,omitempty"`
}

type DocumentVersion struct {
	ID            uuid.UUID       `json:"id"`
	TenantID      uuid.UUID       `json:"tenant_id"`
	DocumentID    uuid.UUID       `json:"document_id"`
	Version       int             `json:"version"`
	FileURL       string          `json:"file_url"`
	StorageKey    string          `json:"storage_key"`
	SHA256Hash    string          `json:"sha256_hash"`
	FileSizeBytes int64           `json:"file_size_bytes"`
	MimeType      string          `json:"mime_type"`
	SnapshotData  json.RawMessage `json:"snapshot_data"`
	GeneratedBy   string          `json:"generated_by"`
	RenderedAt    time.Time       `json:"rendered_at"`
}

type DocumentTemplate struct {
	ID                  uuid.UUID       `json:"id"`
	TenantID            uuid.UUID       `json:"tenant_id"`
	DocType             DocType         `json:"doc_type"`
	Name                string          `json:"name"`
	ContentHTML         string          `json:"content_html"`
	VariableDefinitions json.RawMessage `json:"variable_definitions"`
	IsDefault           bool            `json:"is_default"`
	CreatedAt           time.Time       `json:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at"`
}

type DocumentPayload struct {
	TenantName      string                 `json:"tenant_name"`
	TenantAddress   string                 `json:"tenant_address"`
	TenantPhone     string                 `json:"tenant_phone"`
	TenantEmail     string                 `json:"tenant_email"`
	TenantTaxID     string                 `json:"tenant_tax_id"`
	Currency        string                 `json:"currency"`
	CurrencySymbol  string                 `json:"currency_symbol"`
	DocNumber       string                 `json:"doc_number"`
	DocTitle        string                 `json:"doc_title"`
	DateStr         string                 `json:"date_str"`
	DueDateStr      string                 `json:"due_date_str,omitempty"`
	CustomerName    string                 `json:"customer_name"`
	CustomerEmail   string                 `json:"customer_email,omitempty"`
	CustomerPhone   string                 `json:"customer_phone,omitempty"`
	CustomerAddress string                 `json:"customer_address,omitempty"`
	VehicleInfo     string                 `json:"vehicle_info,omitempty"`
	PlateNumber     string                 `json:"plate_number,omitempty"`
	BookingCode     string                 `json:"booking_code,omitempty"`
	RentalPeriod    string                 `json:"rental_period,omitempty"`
	Items           []DocumentLineItem     `json:"items,omitempty"`
	Subtotal        float64                `json:"subtotal"`
	TaxAmount       float64                `json:"tax_amount"`
	TaxRate         float64                `json:"tax_rate"`
	DiscountAmount  float64                `json:"discount_amount"`
	TotalAmount     float64                `json:"total_amount"`
	PaidAmount      float64                `json:"paid_amount"`
	BalanceDue      float64                `json:"balance_due"`
	PaymentMethod   string                 `json:"payment_method,omitempty"`
	TransactionRef  string                 `json:"transaction_ref,omitempty"`
	Notes           string                 `json:"notes,omitempty"`
	Terms           string                 `json:"terms,omitempty"`
	SignerName      string                 `json:"signer_name,omitempty"`
	SignerRole      string                 `json:"signer_role,omitempty"`
	SignatureData   string                 `json:"signature_data,omitempty"`
	ExtraAttributes map[string]interface{} `json:"extra_attributes,omitempty"`
}

type DocumentLineItem struct {
	Description string  `json:"description"`
	Quantity    int     `json:"quantity"`
	UnitPrice   float64 `json:"unit_price"`
	TotalPrice  float64 `json:"total_price"`
}

type GenerateDocumentRequest struct {
	DocType         DocType         `json:"doc_type" validate:"required"`
	EntityType      string          `json:"entity_type" validate:"required"`
	EntityID        uuid.UUID       `json:"entity_id" validate:"required"`
	ForceNewVersion bool            `json:"force_new_version"`
	SnapshotData    json.RawMessage `json:"snapshot_data,omitempty"`
}
