package contract

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type ContractTemplate struct {
	ID                  uuid.UUID       `json:"id"`
	TenantID            uuid.UUID       `json:"tenant_id"`
	Name                string          `json:"name"`
	TermsBody           string          `json:"terms_body"`
	Clauses             json.RawMessage `json:"clauses,omitempty"`
	VariableDefinitions json.RawMessage `json:"variable_definitions,omitempty"`
	IsDefault           bool            `json:"is_default"`
	CreatedAt           time.Time       `json:"created_at"`
	UpdatedAt           time.Time       `json:"updated_at"`
}

type RentalContract struct {
	ID               uuid.UUID  `json:"id"`
	TenantID         uuid.UUID  `json:"tenant_id"`
	BookingID        uuid.UUID  `json:"booking_id"`
	ContractNumber   string     `json:"contract_number"`
	ContentHTML      string     `json:"content_html"`
	SignedByCustomer bool       `json:"signed_by_customer"`
	SignedAt         *time.Time `json:"signed_at,omitempty"`
	SignatureURL     string     `json:"signature_url,omitempty"`
	SignerName       string     `json:"signer_name,omitempty"`
	SignerIP         string     `json:"signer_ip,omitempty"`
	SignerUserAgent  string     `json:"signer_user_agent,omitempty"`
	Version          int        `json:"version"`
	DocumentID       *uuid.UUID `json:"document_id,omitempty"`
	DocumentURL      string     `json:"document_url,omitempty"`
	CreatedAt        time.Time  `json:"created_at"`
}

type ContractVersionRecord struct {
	ID               uuid.UUID       `json:"id"`
	TenantID         uuid.UUID       `json:"tenant_id"`
	ContractID       uuid.UUID       `json:"contract_id"`
	Version          int             `json:"version"`
	ContentHTML      string          `json:"content_html"`
	SnapshotData     json.RawMessage `json:"snapshot_data"`
	SignedByCustomer bool            `json:"signed_by_customer"`
	SignatureURL     string          `json:"signature_url,omitempty"`
	SignedAt         *time.Time      `json:"signed_at,omitempty"`
	DocumentID       *uuid.UUID      `json:"document_id,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
}

type ContractSignature struct {
	ID                uuid.UUID `json:"id"`
	TenantID          uuid.UUID `json:"tenant_id"`
	ContractID        uuid.UUID `json:"contract_id"`
	SignerRole        string    `json:"signer_role"` // customer, driver, staff_witness
	SignerName        string    `json:"signer_name"`
	SignerEmail       string    `json:"signer_email,omitempty"`
	SignatureImageURL string    `json:"signature_image_url"`
	SignedAt          time.Time `json:"signed_at"`
	IPAddress         string    `json:"ip_address,omitempty"`
	UserAgent         string    `json:"user_agent,omitempty"`
	EvidenceHash      string    `json:"evidence_hash"`
	CreatedAt         time.Time `json:"created_at"`
}

type SignContractRequest struct {
	SignatureURL string `json:"signature_url" validate:"required"`
	SignerName   string `json:"signer_name" validate:"required"`
	SignerRole   string `json:"signer_role"` // customer, driver, staff
	SignerEmail  string `json:"signer_email"`
}

type CreateTemplateRequest struct {
	Name      string          `json:"name" validate:"required"`
	TermsBody string          `json:"terms_body" validate:"required"`
	Clauses   json.RawMessage `json:"clauses"`
	IsDefault bool            `json:"is_default"`
}
