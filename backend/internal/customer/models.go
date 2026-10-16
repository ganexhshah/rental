package customer

import (
	"time"

	"github.com/google/uuid"
)

type Customer struct {
	ID                         uuid.UUID  `json:"id"`
	TenantID                   uuid.UUID  `json:"tenant_id"`
	CustomerType               string     `json:"customer_type"` // individual, business, organization
	CustomerCode               string     `json:"customer_code,omitempty"`
	FullName                   string     `json:"full_name"`
	FirstName                  string     `json:"first_name,omitempty"`
	MiddleName                 string     `json:"middle_name,omitempty"`
	LastName                   string     `json:"last_name,omitempty"`
	PreferredName              string     `json:"preferred_name,omitempty"`
	Email                      string     `json:"email"`
	Phone                      string     `json:"phone"`
	SecondaryPhone             string     `json:"secondary_phone,omitempty"`
	DateOfBirth                *time.Time `json:"date_of_birth,omitempty"`
	Gender                     string     `json:"gender,omitempty"`
	Nationality                string     `json:"nationality"`
	ProfilePhoto               string     `json:"profile_photo,omitempty"`
	Status                     string     `json:"status"` // active, pending_verification, suspended, blacklisted, archived
	VerificationStatus         string     `json:"verification_status"` // verified, pending, rejected
	RentalEligibilityStatus    string     `json:"rental_eligibility_status"` // eligible, restricted, ineligible
	Address                    string     `json:"address,omitempty"`
	Country                    string     `json:"country"`
	Province                   string     `json:"province"`
	DistrictCity               string     `json:"district_city"`
	PostalCode                 string     `json:"postal_code,omitempty"`
	BillingAddress             string     `json:"billing_address,omitempty"`
	CompanyName                string     `json:"company_name,omitempty"`
	CompanyTaxID               string     `json:"company_tax_id,omitempty"`
	LicenseNumber              string     `json:"license_number,omitempty"`
	LicenseCategory            string     `json:"license_category,omitempty"`
	LicenseExpiry              *time.Time `json:"license_expiry,omitempty"`
	EmergencyContactName       string     `json:"emergency_contact_name,omitempty"`
	EmergencyContactRelationship string   `json:"emergency_contact_relationship,omitempty"`
	EmergencyContactPhone      string     `json:"emergency_contact_phone,omitempty"`
	IsBlacklisted              bool       `json:"is_blacklisted"`
	BlacklistReason            string     `json:"blacklist_reason,omitempty"`
	BlacklistedAt              *time.Time `json:"blacklisted_at,omitempty"`
	BlacklistedBy              string     `json:"blacklisted_by,omitempty"`
	Notes                      string     `json:"notes,omitempty"`
	CreatedAt                  time.Time  `json:"created_at"`
	UpdatedAt                  time.Time  `json:"updated_at"`
}

type CreateCustomerRequest struct {
	CustomerType               string     `json:"customer_type"` // individual, business, organization
	CustomerCode               string     `json:"customer_code"`
	FullName                   string     `json:"full_name" validate:"required"`
	FirstName                  string     `json:"first_name"`
	MiddleName                 string     `json:"middle_name"`
	LastName                   string     `json:"last_name"`
	PreferredName              string     `json:"preferred_name"`
	Email                      string     `json:"email" validate:"required,email"`
	Phone                      string     `json:"phone" validate:"required"`
	SecondaryPhone             string     `json:"secondary_phone"`
	DateOfBirth                *time.Time `json:"date_of_birth"`
	Gender                     string     `json:"gender"`
	Nationality                string     `json:"nationality"`
	Address                    string     `json:"address"`
	Country                    string     `json:"country"`
	Province                   string     `json:"province"`
	DistrictCity               string     `json:"district_city"`
	PostalCode                 string     `json:"postal_code"`
	BillingAddress             string     `json:"billing_address"`
	CompanyName                string     `json:"company_name"`
	CompanyTaxID               string     `json:"company_tax_id"`
	LicenseNumber              string     `json:"license_number"`
	LicenseCategory            string     `json:"license_category"`
	LicenseExpiry              *time.Time `json:"license_expiry"`
	EmergencyContactName       string     `json:"emergency_contact_name"`
	EmergencyContactRelationship string   `json:"emergency_contact_relationship"`
	EmergencyContactPhone      string     `json:"emergency_contact_phone"`
	Notes                      string     `json:"notes"`
}

type UpdateCustomerRequest struct {
	CustomerType               *string    `json:"customer_type,omitempty"`
	FullName                   *string    `json:"full_name,omitempty"`
	FirstName                  *string    `json:"first_name,omitempty"`
	MiddleName                 *string    `json:"middle_name,omitempty"`
	LastName                   *string    `json:"last_name,omitempty"`
	PreferredName              *string    `json:"preferred_name,omitempty"`
	Phone                      *string    `json:"phone,omitempty"`
	SecondaryPhone             *string    `json:"secondary_phone,omitempty"`
	DateOfBirth                *time.Time `json:"date_of_birth,omitempty"`
	Gender                     *string    `json:"gender,omitempty"`
	Nationality                *string    `json:"nationality,omitempty"`
	Address                    *string    `json:"address,omitempty"`
	Country                    *string    `json:"country,omitempty"`
	Province                   *string    `json:"province,omitempty"`
	DistrictCity               *string    `json:"district_city,omitempty"`
	PostalCode                 *string    `json:"postal_code,omitempty"`
	BillingAddress             *string    `json:"billing_address,omitempty"`
	CompanyName                *string    `json:"company_name,omitempty"`
	CompanyTaxID               *string    `json:"company_tax_id,omitempty"`
	LicenseNumber              *string    `json:"license_number,omitempty"`
	LicenseCategory            *string    `json:"license_category,omitempty"`
	LicenseExpiry              *time.Time `json:"license_expiry,omitempty"`
	EmergencyContactName       *string    `json:"emergency_contact_name,omitempty"`
	EmergencyContactRelationship *string  `json:"emergency_contact_relationship,omitempty"`
	EmergencyContactPhone      *string    `json:"emergency_contact_phone,omitempty"`
	Status                     *string    `json:"status,omitempty"`
	RentalEligibilityStatus    *string    `json:"rental_eligibility_status,omitempty"`
	Notes                      *string    `json:"notes,omitempty"`
}

type VerifyCustomerRequest struct {
	Status string `json:"status" validate:"required,oneof=verified rejected pending"`
	Notes  string `json:"notes"`
}

type BlacklistCustomerRequest struct {
	Reason string `json:"reason" validate:"required"`
}

type CustomerSummaryStats struct {
	TotalCustomers      int `json:"total_customers"`
	ActiveCustomers     int `json:"active_customers"`
	PendingVerification int `json:"pending_verification"`
	BlacklistedCustomers int `json:"blacklisted_customers"`
}

// --- Customer Drivers ---

type CustomerDriver struct {
	ID                 uuid.UUID  `json:"id"`
	TenantID           uuid.UUID  `json:"tenant_id"`
	CustomerID         uuid.UUID  `json:"customer_id"`
	CustomerName       string     `json:"customer_name,omitempty"`
	FullName           string     `json:"full_name"`
	Phone              string     `json:"phone"`
	Email              string     `json:"email,omitempty"`
	DateOfBirth        *time.Time `json:"date_of_birth,omitempty"`
	Relationship       string     `json:"relationship"`
	LicenseNumber      string     `json:"license_number"`
	LicenseCategory    string     `json:"license_category"`
	LicenseIssueDate   *time.Time `json:"license_issue_date,omitempty"`
	LicenseExpiryDate  *time.Time `json:"license_expiry_date,omitempty"`
	VerificationStatus string     `json:"verification_status"`
	Notes              string     `json:"notes,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type CreateDriverRequest struct {
	CustomerID        uuid.UUID  `json:"customer_id" validate:"required"`
	FullName          string     `json:"full_name" validate:"required"`
	Phone             string     `json:"phone" validate:"required"`
	Email             string     `json:"email"`
	DateOfBirth       *time.Time `json:"date_of_birth"`
	Relationship      string     `json:"relationship"`
	LicenseNumber     string     `json:"license_number" validate:"required"`
	LicenseCategory   string     `json:"license_category"`
	LicenseIssueDate  *time.Time `json:"license_issue_date"`
	LicenseExpiryDate *time.Time `json:"license_expiry_date"`
	Notes             string     `json:"notes"`
}

// --- Customer Documents ---

type CustomerDocument struct {
	ID                 uuid.UUID  `json:"id"`
	TenantID           uuid.UUID  `json:"tenant_id"`
	CustomerID         uuid.UUID  `json:"customer_id"`
	CustomerName       string     `json:"customer_name,omitempty"`
	CustomerEmail      string     `json:"customer_email,omitempty"`
	DriverID           *uuid.UUID `json:"driver_id,omitempty"`
	DriverName         string     `json:"driver_name,omitempty"`
	DocType            string     `json:"doc_type"` // citizenship, passport, driving_licence, license_front, license_back, visa_residency, address_proof, business_registration, tax_pan_vat, signed_form, other
	Name               string     `json:"name"`
	DocumentNumber     string     `json:"document_number"`
	IssuingAuthority   string     `json:"issuing_authority"`
	FileURL            string     `json:"file_url"`
	FileName           string     `json:"file_name,omitempty"`
	FileSize           int64      `json:"file_size,omitempty"`
	MimeType           string     `json:"mime_type,omitempty"`
	IssueDate          *time.Time `json:"issue_date,omitempty"`
	ExpiryDate         *time.Time `json:"expiry_date,omitempty"`
	Status             string     `json:"status"` // valid, expiring_soon, expired
	VerificationStatus string     `json:"verification_status"` // pending, verified, rejected
	RejectionReason    string     `json:"rejection_reason,omitempty"`
	VerifiedBy         string     `json:"verified_by,omitempty"`
	VerifiedAt         *time.Time `json:"verified_at,omitempty"`
	Version            int        `json:"version"`
	Notes              string     `json:"notes,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}

type CreateCustomerDocumentRequest struct {
	CustomerID       uuid.UUID  `json:"customer_id" validate:"required"`
	DriverID         *uuid.UUID `json:"driver_id,omitempty"`
	DocType          string     `json:"doc_type" validate:"required"`
	Name             string     `json:"name" validate:"required"`
	DocumentNumber   string     `json:"document_number"`
	IssuingAuthority string     `json:"issuing_authority"`
	FileURL          string     `json:"file_url" validate:"required"`
	FileName         string     `json:"file_name"`
	FileSize         int64      `json:"file_size"`
	MimeType         string     `json:"mime_type"`
	IssueDate        *time.Time `json:"issue_date"`
	ExpiryDate       *time.Time `json:"expiry_date"`
	Notes            string     `json:"notes"`
}

type VerifyCustomerDocumentRequest struct {
	VerificationStatus string `json:"verification_status" validate:"required,oneof=verified rejected pending"`
	RejectionReason    string `json:"rejection_reason"`
	AuditorNotes       string `json:"auditor_notes"`
}

type CustomerDocumentSummaryStats struct {
	TotalDocuments      int `json:"total_documents"`
	ValidDocuments      int `json:"valid_documents"`
	ExpiringSoon        int `json:"expiring_soon"`
	ExpiredDocuments    int `json:"expired_documents"`
	PendingVerification int `json:"pending_verification"`
}
