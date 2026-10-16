package customer

import (
	"context"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rental/backend/pkg/pagination"
)

var (
	ErrCustomerNotFound = errors.New("customer not found")
	ErrDocumentNotFound = errors.New("customer document not found")
	ErrDriverNotFound   = errors.New("customer driver not found")
)

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

// --- Customer CRUD & Lifecycle ---

func (s *Service) ListCustomers(ctx context.Context, tenantID uuid.UUID, verificationStatus, customerType, status string, isBlacklisted *bool, p pagination.Params) ([]Customer, pagination.Meta, error) {
	if s.pool == nil {
		return []Customer{}, pagination.BuildMeta(0, p), nil
	}
	where := "WHERE tenant_id = $1 AND deleted_at IS NULL"
	args := []any{tenantID}
	argIdx := 2

	if verificationStatus != "" && verificationStatus != "all" {
		where += fmt.Sprintf(" AND verification_status = $%d", argIdx)
		args = append(args, verificationStatus)
		argIdx++
	}

	if customerType != "" && customerType != "all" {
		where += fmt.Sprintf(" AND customer_type = $%d", argIdx)
		args = append(args, customerType)
		argIdx++
	}

	if status != "" && status != "all" {
		where += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	if isBlacklisted != nil {
		where += fmt.Sprintf(" AND is_blacklisted = $%d", argIdx)
		args = append(args, *isBlacklisted)
		argIdx++
	}

	if p.Search != "" {
		where += fmt.Sprintf(" AND (LOWER(full_name) LIKE $%d OR LOWER(email) LIKE $%d OR LOWER(phone) LIKE $%d OR LOWER(COALESCE(license_number, '')) LIKE $%d)", argIdx, argIdx, argIdx, argIdx)
		args = append(args, "%"+strings.ToLower(p.Search)+"%")
		argIdx++
	}

	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM customers %s", where)
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, pagination.Meta{}, err
	}

	query := fmt.Sprintf(`
		SELECT 
			id, tenant_id, customer_type, COALESCE(customer_code, ''), full_name,
			COALESCE(first_name, ''), COALESCE(middle_name, ''), COALESCE(last_name, ''), COALESCE(preferred_name, ''),
			email, phone, COALESCE(secondary_phone, ''), date_of_birth, COALESCE(gender, ''), nationality,
			COALESCE(profile_photo, ''), status, verification_status, rental_eligibility_status,
			COALESCE(address, ''), country, province, district_city, COALESCE(postal_code, ''),
			COALESCE(billing_address, ''), COALESCE(company_name, ''), COALESCE(company_tax_id, ''),
			COALESCE(license_number, ''), license_category, license_expiry,
			COALESCE(emergency_contact_name, ''), COALESCE(emergency_contact_relationship, ''), COALESCE(emergency_contact_phone, ''),
			is_blacklisted, COALESCE(blacklist_reason, ''), blacklisted_at, COALESCE(blacklisted_by, ''),
			COALESCE(notes, ''), created_at, updated_at
		FROM customers
		%s
		ORDER BY created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, p.Limit, p.Offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	defer rows.Close()

	list := make([]Customer, 0)
	for rows.Next() {
		var c Customer
		if err := rows.Scan(
			&c.ID, &c.TenantID, &c.CustomerType, &c.CustomerCode, &c.FullName,
			&c.FirstName, &c.MiddleName, &c.LastName, &c.PreferredName,
			&c.Email, &c.Phone, &c.SecondaryPhone, &c.DateOfBirth, &c.Gender, &c.Nationality,
			&c.ProfilePhoto, &c.Status, &c.VerificationStatus, &c.RentalEligibilityStatus,
			&c.Address, &c.Country, &c.Province, &c.DistrictCity, &c.PostalCode,
			&c.BillingAddress, &c.CompanyName, &c.CompanyTaxID,
			&c.LicenseNumber, &c.LicenseCategory, &c.LicenseExpiry,
			&c.EmergencyContactName, &c.EmergencyContactRelationship, &c.EmergencyContactPhone,
			&c.IsBlacklisted, &c.BlacklistReason, &c.BlacklistedAt, &c.BlacklistedBy,
			&c.Notes, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, pagination.Meta{}, err
		}
		list = append(list, c)
	}

	return list, pagination.BuildMeta(total, p), nil
}

func (s *Service) GetCustomer(ctx context.Context, tenantID, customerID uuid.UUID) (*Customer, error) {
	query := `
		SELECT 
			id, tenant_id, customer_type, COALESCE(customer_code, ''), full_name,
			COALESCE(first_name, ''), COALESCE(middle_name, ''), COALESCE(last_name, ''), COALESCE(preferred_name, ''),
			email, phone, COALESCE(secondary_phone, ''), date_of_birth, COALESCE(gender, ''), nationality,
			COALESCE(profile_photo, ''), status, verification_status, rental_eligibility_status,
			COALESCE(address, ''), country, province, district_city, COALESCE(postal_code, ''),
			COALESCE(billing_address, ''), COALESCE(company_name, ''), COALESCE(company_tax_id, ''),
			COALESCE(license_number, ''), license_category, license_expiry,
			COALESCE(emergency_contact_name, ''), COALESCE(emergency_contact_relationship, ''), COALESCE(emergency_contact_phone, ''),
			is_blacklisted, COALESCE(blacklist_reason, ''), blacklisted_at, COALESCE(blacklisted_by, ''),
			COALESCE(notes, ''), created_at, updated_at
		FROM customers
		WHERE tenant_id = $1 AND id = $2 AND deleted_at IS NULL
	`
	var c Customer
	err := s.pool.QueryRow(ctx, query, tenantID, customerID).Scan(
		&c.ID, &c.TenantID, &c.CustomerType, &c.CustomerCode, &c.FullName,
		&c.FirstName, &c.MiddleName, &c.LastName, &c.PreferredName,
		&c.Email, &c.Phone, &c.SecondaryPhone, &c.DateOfBirth, &c.Gender, &c.Nationality,
		&c.ProfilePhoto, &c.Status, &c.VerificationStatus, &c.RentalEligibilityStatus,
		&c.Address, &c.Country, &c.Province, &c.DistrictCity, &c.PostalCode,
		&c.BillingAddress, &c.CompanyName, &c.CompanyTaxID,
		&c.LicenseNumber, &c.LicenseCategory, &c.LicenseExpiry,
		&c.EmergencyContactName, &c.EmergencyContactRelationship, &c.EmergencyContactPhone,
		&c.IsBlacklisted, &c.BlacklistReason, &c.BlacklistedAt, &c.BlacklistedBy,
		&c.Notes, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrCustomerNotFound
		}
		return nil, err
	}
	return &c, nil
}

func (s *Service) CreateCustomer(ctx context.Context, tenantID uuid.UUID, req CreateCustomerRequest) (*Customer, error) {
	id := uuid.New()

	cType := req.CustomerType
	if cType == "" {
		cType = "individual"
	}

	nat := req.Nationality
	if nat == "" {
		nat = "Nepalese"
	}

	country := req.Country
	if country == "" {
		country = "Nepal"
	}

	province := req.Province
	if province == "" {
		province = "Bagmati"
	}

	city := req.DistrictCity
	if city == "" {
		city = "Kathmandu"
	}

	licCategory := req.LicenseCategory
	if licCategory == "" {
		licCategory = "B"
	}

	code := req.CustomerCode
	if code == "" {
		code = fmt.Sprintf("CUST-%d", time.Now().Unix()%1000000)
	}

	query := `
		INSERT INTO customers (
			id, tenant_id, customer_type, customer_code, full_name,
			first_name, middle_name, last_name, preferred_name,
			email, phone, secondary_phone, date_of_birth, gender, nationality,
			status, verification_status, rental_eligibility_status,
			address, country, province, district_city, postal_code,
			billing_address, company_name, company_tax_id,
			license_number, license_category, license_expiry,
			emergency_contact_name, emergency_contact_relationship, emergency_contact_phone,
			notes, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9,
			$10, $11, $12, $13, $14, $15,
			'active', 'pending', 'eligible',
			$16, $17, $18, $19, $20,
			$21, $22, $23,
			$24, $25, $26,
			$27, $28, $29,
			$30, NOW(), NOW()
		)
		RETURNING id
	`

	_, err := s.pool.Exec(ctx, query,
		id, tenantID, cType, code, req.FullName,
		req.FirstName, req.MiddleName, req.LastName, req.PreferredName,
		strings.ToLower(req.Email), req.Phone, req.SecondaryPhone, req.DateOfBirth, req.Gender, nat,
		req.Address, country, province, city, req.PostalCode,
		req.BillingAddress, req.CompanyName, req.CompanyTaxID,
		req.LicenseNumber, licCategory, req.LicenseExpiry,
		req.EmergencyContactName, req.EmergencyContactRelationship, req.EmergencyContactPhone,
		req.Notes,
	)
	if err != nil {
		return nil, err
	}

	return s.GetCustomer(ctx, tenantID, id)
}

func (s *Service) UpdateCustomer(ctx context.Context, tenantID, customerID uuid.UUID, req UpdateCustomerRequest) (*Customer, error) {
	current, err := s.GetCustomer(ctx, tenantID, customerID)
	if err != nil {
		return nil, err
	}

	if req.CustomerType != nil {
		current.CustomerType = *req.CustomerType
	}
	if req.FullName != nil {
		current.FullName = *req.FullName
	}
	if req.FirstName != nil {
		current.FirstName = *req.FirstName
	}
	if req.MiddleName != nil {
		current.MiddleName = *req.MiddleName
	}
	if req.LastName != nil {
		current.LastName = *req.LastName
	}
	if req.PreferredName != nil {
		current.PreferredName = *req.PreferredName
	}
	if req.Phone != nil {
		current.Phone = *req.Phone
	}
	if req.SecondaryPhone != nil {
		current.SecondaryPhone = *req.SecondaryPhone
	}
	if req.DateOfBirth != nil {
		current.DateOfBirth = req.DateOfBirth
	}
	if req.Gender != nil {
		current.Gender = *req.Gender
	}
	if req.Nationality != nil {
		current.Nationality = *req.Nationality
	}
	if req.Address != nil {
		current.Address = *req.Address
	}
	if req.Country != nil {
		current.Country = *req.Country
	}
	if req.Province != nil {
		current.Province = *req.Province
	}
	if req.DistrictCity != nil {
		current.DistrictCity = *req.DistrictCity
	}
	if req.PostalCode != nil {
		current.PostalCode = *req.PostalCode
	}
	if req.BillingAddress != nil {
		current.BillingAddress = *req.BillingAddress
	}
	if req.CompanyName != nil {
		current.CompanyName = *req.CompanyName
	}
	if req.CompanyTaxID != nil {
		current.CompanyTaxID = *req.CompanyTaxID
	}
	if req.LicenseNumber != nil {
		current.LicenseNumber = *req.LicenseNumber
	}
	if req.LicenseCategory != nil {
		current.LicenseCategory = *req.LicenseCategory
	}
	if req.LicenseExpiry != nil {
		current.LicenseExpiry = req.LicenseExpiry
	}
	if req.EmergencyContactName != nil {
		current.EmergencyContactName = *req.EmergencyContactName
	}
	if req.EmergencyContactRelationship != nil {
		current.EmergencyContactRelationship = *req.EmergencyContactRelationship
	}
	if req.EmergencyContactPhone != nil {
		current.EmergencyContactPhone = *req.EmergencyContactPhone
	}
	if req.Status != nil {
		current.Status = *req.Status
	}
	if req.RentalEligibilityStatus != nil {
		current.RentalEligibilityStatus = *req.RentalEligibilityStatus
	}
	if req.Notes != nil {
		current.Notes = *req.Notes
	}

	query := `
		UPDATE customers
		SET customer_type = $1, full_name = $2, first_name = $3, middle_name = $4, last_name = $5, preferred_name = $6,
		    phone = $7, secondary_phone = $8, date_of_birth = $9, gender = $10, nationality = $11,
		    address = $12, country = $13, province = $14, district_city = $15, postal_code = $16,
		    billing_address = $17, company_name = $18, company_tax_id = $19,
		    license_number = $20, license_category = $21, license_expiry = $22,
		    emergency_contact_name = $23, emergency_contact_relationship = $24, emergency_contact_phone = $25,
		    status = $26, rental_eligibility_status = $27, notes = $28, updated_at = NOW()
		WHERE tenant_id = $29 AND id = $30 AND deleted_at IS NULL
	`

	_, err = s.pool.Exec(ctx, query,
		current.CustomerType, current.FullName, current.FirstName, current.MiddleName, current.LastName, current.PreferredName,
		current.Phone, current.SecondaryPhone, current.DateOfBirth, current.Gender, current.Nationality,
		current.Address, current.Country, current.Province, current.DistrictCity, current.PostalCode,
		current.BillingAddress, current.CompanyName, current.CompanyTaxID,
		current.LicenseNumber, current.LicenseCategory, current.LicenseExpiry,
		current.EmergencyContactName, current.EmergencyContactRelationship, current.EmergencyContactPhone,
		current.Status, current.RentalEligibilityStatus, current.Notes,
		tenantID, customerID,
	)
	if err != nil {
		return nil, err
	}

	return s.GetCustomer(ctx, tenantID, customerID)
}

func (s *Service) VerifyCustomer(ctx context.Context, tenantID, customerID uuid.UUID, req VerifyCustomerRequest) (*Customer, error) {
	status := req.Status
	if status == "verified" {
		status = "verified"
	}

	auditNote := ""
	if req.Notes != "" {
		auditNote = fmt.Sprintf("\n[Verification Audit: %s]: %s", status, req.Notes)
	}

	query := `
		UPDATE customers
		SET verification_status = $1,
		    notes = COALESCE(notes || $2, $2),
		    updated_at = NOW()
		WHERE tenant_id = $3 AND id = $4 AND deleted_at IS NULL
	`
	res, err := s.pool.Exec(ctx, query, status, auditNote, tenantID, customerID)
	if err != nil {
		return nil, err
	}
	if res.RowsAffected() == 0 {
		return nil, ErrCustomerNotFound
	}

	return s.GetCustomer(ctx, tenantID, customerID)
}

func (s *Service) BlacklistCustomer(ctx context.Context, tenantID, customerID uuid.UUID, reason, staffEmail string) (*Customer, error) {
	auditNote := fmt.Sprintf("\n[BLACKLISTED by %s]: %s", staffEmail, reason)
	query := `
		UPDATE customers
		SET is_blacklisted = TRUE,
		    blacklist_reason = $1,
		    blacklisted_at = NOW(),
		    blacklisted_by = $2,
		    status = 'blacklisted',
		    rental_eligibility_status = 'ineligible',
		    notes = COALESCE(notes || $3, $3),
		    updated_at = NOW()
		WHERE tenant_id = $4 AND id = $5 AND deleted_at IS NULL
	`
	res, err := s.pool.Exec(ctx, query, reason, staffEmail, auditNote, tenantID, customerID)
	if err != nil {
		return nil, err
	}
	if res.RowsAffected() == 0 {
		return nil, ErrCustomerNotFound
	}

	return s.GetCustomer(ctx, tenantID, customerID)
}

func (s *Service) UnblacklistCustomer(ctx context.Context, tenantID, customerID uuid.UUID, staffEmail string) (*Customer, error) {
	auditNote := fmt.Sprintf("\n[UNBLACKLISTED by %s]: Customer restriction removed.", staffEmail)
	query := `
		UPDATE customers
		SET is_blacklisted = FALSE,
		    blacklist_reason = NULL,
		    blacklisted_at = NULL,
		    blacklisted_by = NULL,
		    status = 'active',
		    rental_eligibility_status = 'eligible',
		    notes = COALESCE(notes || $1, $1),
		    updated_at = NOW()
		WHERE tenant_id = $2 AND id = $3 AND deleted_at IS NULL
	`
	res, err := s.pool.Exec(ctx, query, auditNote, tenantID, customerID)
	if err != nil {
		return nil, err
	}
	if res.RowsAffected() == 0 {
		return nil, ErrCustomerNotFound
	}

	return s.GetCustomer(ctx, tenantID, customerID)
}

func (s *Service) GetCustomerSummary(ctx context.Context, tenantID uuid.UUID) (*CustomerSummaryStats, error) {
	if s.pool == nil {
		return &CustomerSummaryStats{
			TotalCustomers:       45,
			ActiveCustomers:      42,
			PendingVerification: 3,
			BlacklistedCustomers: 0,
		}, nil
	}
	query := `
		SELECT 
			COUNT(*),
			COUNT(*) FILTER (WHERE status = 'active' AND is_blacklisted = FALSE),
			COUNT(*) FILTER (WHERE verification_status = 'pending'),
			COUNT(*) FILTER (WHERE is_blacklisted = TRUE)
		FROM customers
		WHERE tenant_id = $1 AND deleted_at IS NULL
	`
	var stats CustomerSummaryStats
	err := s.pool.QueryRow(ctx, query, tenantID).Scan(
		&stats.TotalCustomers,
		&stats.ActiveCustomers,
		&stats.PendingVerification,
		&stats.BlacklistedCustomers,
	)
	if err != nil {
		return nil, err
	}
	return &stats, nil
}

func (s *Service) ListAllDrivers(ctx context.Context, tenantID uuid.UUID) ([]CustomerDriver, error) {
	query := `
		SELECT 
			d.id, d.tenant_id, d.customer_id, c.full_name,
			d.full_name, d.phone, COALESCE(d.email, ''), d.date_of_birth,
			d.relationship, d.license_number, d.license_category,
			d.license_issue_date, d.license_expiry_date,
			d.verification_status, COALESCE(d.notes, ''),
			d.created_at, d.updated_at
		FROM customer_drivers d
		JOIN customers c ON c.id = d.customer_id
		WHERE d.tenant_id = $1
		ORDER BY d.created_at DESC
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]CustomerDriver, 0)
	for rows.Next() {
		var drv CustomerDriver
		if err := rows.Scan(
			&drv.ID, &drv.TenantID, &drv.CustomerID, &drv.CustomerName,
			&drv.FullName, &drv.Phone, &drv.Email, &drv.DateOfBirth,
			&drv.Relationship, &drv.LicenseNumber, &drv.LicenseCategory,
			&drv.LicenseIssueDate, &drv.LicenseExpiryDate,
			&drv.VerificationStatus, &drv.Notes,
			&drv.CreatedAt, &drv.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, drv)
	}
	return list, nil
}

func (s *Service) ListDrivers(ctx context.Context, tenantID, customerID uuid.UUID) ([]CustomerDriver, error) {
	query := `
		SELECT 
			d.id, d.tenant_id, d.customer_id, c.full_name,
			d.full_name, d.phone, COALESCE(d.email, ''), d.date_of_birth,
			d.relationship, d.license_number, d.license_category,
			d.license_issue_date, d.license_expiry_date,
			d.verification_status, COALESCE(d.notes, ''),
			d.created_at, d.updated_at
		FROM customer_drivers d
		JOIN customers c ON c.id = d.customer_id
		WHERE d.tenant_id = $1 AND d.customer_id = $2
		ORDER BY d.created_at DESC
	`
	rows, err := s.pool.Query(ctx, query, tenantID, customerID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]CustomerDriver, 0)
	for rows.Next() {
		var drv CustomerDriver
		if err := rows.Scan(
			&drv.ID, &drv.TenantID, &drv.CustomerID, &drv.CustomerName,
			&drv.FullName, &drv.Phone, &drv.Email, &drv.DateOfBirth,
			&drv.Relationship, &drv.LicenseNumber, &drv.LicenseCategory,
			&drv.LicenseIssueDate, &drv.LicenseExpiryDate,
			&drv.VerificationStatus, &drv.Notes,
			&drv.CreatedAt, &drv.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, drv)
	}
	return list, nil
}

func (s *Service) CreateDriver(ctx context.Context, tenantID uuid.UUID, req CreateDriverRequest) (*CustomerDriver, error) {
	driverID := uuid.New()
	licCat := req.LicenseCategory
	if licCat == "" {
		licCat = "B"
	}
	rel := req.Relationship
	if rel == "" {
		rel = "authorized_driver"
	}

	query := `
		INSERT INTO customer_drivers (
			id, tenant_id, customer_id, full_name, phone, email, date_of_birth,
			relationship, license_number, license_category, license_issue_date, license_expiry_date,
			verification_status, notes, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, $10, $11, $12,
			'pending', $13, NOW(), NOW()
		)
	`
	_, err := s.pool.Exec(ctx, query,
		driverID, tenantID, req.CustomerID, req.FullName, req.Phone, req.Email, req.DateOfBirth,
		rel, req.LicenseNumber, licCat, req.LicenseIssueDate, req.LicenseExpiryDate,
		req.Notes,
	)
	if err != nil {
		return nil, err
	}

	drivers, err := s.ListDrivers(ctx, tenantID, req.CustomerID)
	if err != nil {
		return nil, err
	}
	for _, d := range drivers {
		if d.ID == driverID {
			return &d, nil
		}
	}
	return nil, ErrDriverNotFound
}

func (s *Service) DeleteDriver(ctx context.Context, tenantID, customerID, driverID uuid.UUID) error {
	query := `DELETE FROM customer_drivers WHERE id = $1 AND tenant_id = $2 AND customer_id = $3`
	res, err := s.pool.Exec(ctx, query, driverID, tenantID, customerID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return ErrDriverNotFound
	}
	return nil
}

// --- Customer Documents ---

func (s *Service) ListCustomerDocuments(ctx context.Context, tenantID uuid.UUID, customerID, driverID *uuid.UUID, docType, status, verificationStatus, search string) ([]CustomerDocument, error) {
	where := "WHERE d.tenant_id = $1 AND d.deleted_at IS NULL"
	args := []any{tenantID}
	argIdx := 2

	if customerID != nil {
		where += fmt.Sprintf(" AND d.customer_id = $%d", argIdx)
		args = append(args, *customerID)
		argIdx++
	}

	if driverID != nil {
		where += fmt.Sprintf(" AND d.driver_id = $%d", argIdx)
		args = append(args, *driverID)
		argIdx++
	}

	if docType != "" && docType != "all" {
		where += fmt.Sprintf(" AND d.doc_type = $%d", argIdx)
		args = append(args, docType)
		argIdx++
	}

	if status != "" && status != "all" {
		if status == "expired" {
			where += " AND d.expiry_date IS NOT NULL AND d.expiry_date < CURRENT_DATE"
		} else if status == "expiring_soon" {
			where += " AND d.expiry_date IS NOT NULL AND d.expiry_date >= CURRENT_DATE AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days'"
		} else if status == "valid" {
			where += " AND (d.expiry_date IS NULL OR d.expiry_date > CURRENT_DATE + INTERVAL '30 days')"
		}
	}

	if verificationStatus != "" && verificationStatus != "all" {
		where += fmt.Sprintf(" AND d.verification_status = $%d", argIdx)
		args = append(args, verificationStatus)
		argIdx++
	}

	if search != "" {
		where += fmt.Sprintf(" AND (LOWER(d.name) LIKE $%d OR LOWER(COALESCE(d.document_number, '')) LIKE $%d OR LOWER(c.full_name) LIKE $%d OR LOWER(c.email) LIKE $%d)", argIdx, argIdx, argIdx, argIdx)
		args = append(args, "%"+strings.ToLower(search)+"%")
		argIdx++
	}

	query := fmt.Sprintf(`
		SELECT 
			d.id, d.tenant_id, d.customer_id, c.full_name, c.email,
			d.driver_id, COALESCE(drv.full_name, ''),
			d.doc_type, d.name, COALESCE(d.document_number, ''), COALESCE(d.issuing_authority, ''),
			d.file_url, COALESCE(d.file_name, ''), COALESCE(d.file_size, 0), COALESCE(d.mime_type, ''),
			d.issue_date, d.expiry_date,
			CASE 
				WHEN d.expiry_date IS NOT NULL AND d.expiry_date < CURRENT_DATE THEN 'expired'
				WHEN d.expiry_date IS NOT NULL AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
				ELSE d.status
			END AS computed_status,
			d.verification_status, COALESCE(d.rejection_reason, ''),
			COALESCE(d.verified_by, ''), d.verified_at,
			d.version, COALESCE(d.notes, ''), d.created_at, d.updated_at
		FROM customer_documents d
		JOIN customers c ON c.id = d.customer_id
		LEFT JOIN customer_drivers drv ON drv.id = d.driver_id
		%s
		ORDER BY d.created_at DESC
	`, where)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]CustomerDocument, 0)
	for rows.Next() {
		var doc CustomerDocument
		if err := rows.Scan(
			&doc.ID, &doc.TenantID, &doc.CustomerID, &doc.CustomerName, &doc.CustomerEmail,
			&doc.DriverID, &doc.DriverName,
			&doc.DocType, &doc.Name, &doc.DocumentNumber, &doc.IssuingAuthority,
			&doc.FileURL, &doc.FileName, &doc.FileSize, &doc.MimeType,
			&doc.IssueDate, &doc.ExpiryDate,
			&doc.Status, &doc.VerificationStatus, &doc.RejectionReason,
			&doc.VerifiedBy, &doc.VerifiedAt,
			&doc.Version, &doc.Notes, &doc.CreatedAt, &doc.UpdatedAt,
		); err != nil {
			return nil, err
		}
		list = append(list, doc)
	}
	return list, nil
}

func (s *Service) GetCustomerDocument(ctx context.Context, tenantID, docID uuid.UUID) (*CustomerDocument, error) {
	query := `
		SELECT 
			d.id, d.tenant_id, d.customer_id, c.full_name, c.email,
			d.driver_id, COALESCE(drv.full_name, ''),
			d.doc_type, d.name, COALESCE(d.document_number, ''), COALESCE(d.issuing_authority, ''),
			d.file_url, COALESCE(d.file_name, ''), COALESCE(d.file_size, 0), COALESCE(d.mime_type, ''),
			d.issue_date, d.expiry_date,
			CASE 
				WHEN d.expiry_date IS NOT NULL AND d.expiry_date < CURRENT_DATE THEN 'expired'
				WHEN d.expiry_date IS NOT NULL AND d.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN 'expiring_soon'
				ELSE d.status
			END AS computed_status,
			d.verification_status, COALESCE(d.rejection_reason, ''),
			COALESCE(d.verified_by, ''), d.verified_at,
			d.version, COALESCE(d.notes, ''), d.created_at, d.updated_at
		FROM customer_documents d
		JOIN customers c ON c.id = d.customer_id
		LEFT JOIN customer_drivers drv ON drv.id = d.driver_id
		WHERE d.tenant_id = $1 AND d.id = $2 AND d.deleted_at IS NULL
	`
	var doc CustomerDocument
	err := s.pool.QueryRow(ctx, query, tenantID, docID).Scan(
		&doc.ID, &doc.TenantID, &doc.CustomerID, &doc.CustomerName, &doc.CustomerEmail,
		&doc.DriverID, &doc.DriverName,
		&doc.DocType, &doc.Name, &doc.DocumentNumber, &doc.IssuingAuthority,
		&doc.FileURL, &doc.FileName, &doc.FileSize, &doc.MimeType,
		&doc.IssueDate, &doc.ExpiryDate,
		&doc.Status, &doc.VerificationStatus, &doc.RejectionReason,
		&doc.VerifiedBy, &doc.VerifiedAt,
		&doc.Version, &doc.Notes, &doc.CreatedAt, &doc.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDocumentNotFound
		}
		return nil, err
	}
	return &doc, nil
}

func (s *Service) CreateCustomerDocument(ctx context.Context, tenantID uuid.UUID, req CreateCustomerDocumentRequest) (*CustomerDocument, error) {
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

	query := `
		INSERT INTO customer_documents (
			id, tenant_id, customer_id, driver_id, doc_type, name, document_number, issuing_authority,
			file_url, file_name, file_size, mime_type, issue_date, expiry_date,
			status, verification_status, version, notes, created_at, updated_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8,
			$9, $10, $11, $12, $13, $14,
			$15, 'pending', 1, $16, NOW(), NOW()
		)
	`
	_, err := s.pool.Exec(ctx, query,
		docID, tenantID, req.CustomerID, req.DriverID, req.DocType, req.Name, req.DocumentNumber, req.IssuingAuthority,
		req.FileURL, req.FileName, req.FileSize, req.MimeType, req.IssueDate, req.ExpiryDate,
		initialStatus, req.Notes,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to insert customer document: %w", err)
	}

	return s.GetCustomerDocument(ctx, tenantID, docID)
}

func (s *Service) VerifyCustomerDocument(ctx context.Context, tenantID, docID uuid.UUID, verifierName string, req VerifyCustomerDocumentRequest) (*CustomerDocument, error) {
	current, err := s.GetCustomerDocument(ctx, tenantID, docID)
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

	auditNote := current.Notes
	if req.AuditorNotes != "" {
		if auditNote != "" {
			auditNote += "\n"
		}
		auditNote += fmt.Sprintf("[Doc Audit: %s by %s]: %s", req.VerificationStatus, verifierName, req.AuditorNotes)
	}

	query := `
		UPDATE customer_documents
		SET verification_status = $1, rejection_reason = $2, verified_by = $3,
		    verified_at = NOW(), status = $4, notes = $5, updated_at = NOW()
		WHERE id = $6 AND tenant_id = $7 AND deleted_at IS NULL
	`
	res, err := s.pool.Exec(ctx, query,
		req.VerificationStatus, req.RejectionReason, verifierName,
		newStatus, auditNote, docID, tenantID,
	)
	if err != nil {
		return nil, err
	}
	if res.RowsAffected() == 0 {
		return nil, ErrDocumentNotFound
	}

	return s.GetCustomerDocument(ctx, tenantID, docID)
}

func (s *Service) DeleteCustomerDocument(ctx context.Context, tenantID, docID uuid.UUID) error {
	query := `UPDATE customer_documents SET deleted_at = NOW() WHERE id = $1 AND tenant_id = $2 AND deleted_at IS NULL`
	res, err := s.pool.Exec(ctx, query, docID, tenantID)
	if err != nil {
		return err
	}
	if res.RowsAffected() == 0 {
		return ErrDocumentNotFound
	}
	return nil
}

func (s *Service) GetCustomerDocumentSummary(ctx context.Context, tenantID uuid.UUID) (*CustomerDocumentSummaryStats, error) {
	query := `
		SELECT 
			COUNT(*),
			COUNT(*) FILTER (WHERE (expiry_date IS NULL OR expiry_date >= CURRENT_DATE + INTERVAL '30 days') AND status = 'valid'),
			COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date >= CURRENT_DATE AND expiry_date <= CURRENT_DATE + INTERVAL '30 days'),
			COUNT(*) FILTER (WHERE expiry_date IS NOT NULL AND expiry_date < CURRENT_DATE),
			COUNT(*) FILTER (WHERE verification_status = 'pending')
		FROM customer_documents
		WHERE tenant_id = $1 AND deleted_at IS NULL
	`
	var stats CustomerDocumentSummaryStats
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
