package contract

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rental/backend/internal/document"
	"github.com/rental/backend/pkg/pagination"
)

var (
	ErrContractNotFound = errors.New("contract not found")
	ErrBookingNotFound  = errors.New("booking not found")
)

type Service struct {
	pool   *pgxpool.Pool
	docSvc *document.Service
}

func NewService(pool *pgxpool.Pool, docSvc *document.Service) *Service {
	return &Service{
		pool:   pool,
		docSvc: docSvc,
	}
}

func (s *Service) GetOrCreateContract(ctx context.Context, tenantID, bookingID uuid.UUID) (*RentalContract, error) {
	var c RentalContract
	queryExisting := `
		SELECT rc.id, b.tenant_id, rc.booking_id, rc.contract_number, rc.content_html, rc.signed_by_customer,
		       rc.signed_at, COALESCE(rc.signature_url, ''), COALESCE(rc.signer_name, ''), COALESCE(rc.signer_ip, ''),
		       COALESCE(rc.signer_user_agent, ''), rc.version, rc.document_id, rc.created_at
		FROM rental_contracts rc
		JOIN bookings b ON b.id = rc.booking_id
		WHERE rc.booking_id = $1 AND b.tenant_id = $2
	`
	err := s.pool.QueryRow(ctx, queryExisting, bookingID, tenantID).Scan(
		&c.ID, &c.TenantID, &c.BookingID, &c.ContractNumber, &c.ContentHTML, &c.SignedByCustomer,
		&c.SignedAt, &c.SignatureURL, &c.SignerName, &c.SignerIP,
		&c.SignerUserAgent, &c.Version, &c.DocumentID, &c.CreatedAt,
	)
	if err == nil {
		if c.DocumentID != nil && s.docSvc != nil {
			c.DocumentURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, *c.DocumentID, 30*time.Minute)
		}
		return &c, nil
	}

	// Not found, generate contract from authoritative booking records
	var (
		bookingCode   string
		startDate     time.Time
		endDate       time.Time
		rentalAmount  float64
		taxAmount     float64
		depositAmount float64
		totalAmount   float64
		custName      string
		custEmail     string
		custPhone     string
		custLicense   string
		vMake         string
		vModel        string
		vPlate        string
		vYear         int
		tenantName    string
		currency      string
	)

	queryData := `
		SELECT b.booking_code, b.start_date, b.end_date, b.rental_amount, b.tax_amount, b.deposit_amount, b.total_amount,
		       c.full_name, c.email, c.phone, COALESCE(c.license_number, 'N/A'),
		       v.make, v.model, v.plate_number, v.year,
		       t.name, t.currency
		FROM bookings b
		JOIN customers c ON c.id = b.customer_id
		JOIN vehicles v ON v.id = b.vehicle_id
		JOIN tenants t ON t.id = b.tenant_id
		WHERE b.id = $1 AND b.tenant_id = $2
	`
	err = s.pool.QueryRow(ctx, queryData, bookingID, tenantID).Scan(
		&bookingCode, &startDate, &endDate, &rentalAmount, &taxAmount, &depositAmount, &totalAmount,
		&custName, &custEmail, &custPhone, &custLicense,
		&vMake, &vModel, &vPlate, &vYear,
		&tenantName, &currency,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrBookingNotFound
		}
		return nil, err
	}

	contractNumber := fmt.Sprintf("AGR-%s", bookingCode)
	if s.docSvc != nil {
		seq, err := s.docSvc.GetNextSequenceNumber(ctx, tenantID, document.DocTypeRentalContract, "AGR", 6)
		if err == nil && seq != "" {
			contractNumber = seq
		}
	}

	htmlBody := fmt.Sprintf(`
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Vehicle Rental Agreement</title></head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; padding: 20px;">
  <h2>VEHICLE RENTAL AGREEMENT & TERMS OF SERVICE</h2>
  <p><strong>Agreement Number:</strong> %s | <strong>Date:</strong> %s</p>
  <hr/>
  <h3>1. PARTIES</h3>
  <p><strong>Rental Operator:</strong> %s</p>
  <p><strong>Renter / Customer:</strong> %s (Phone: %s, Email: %s, License: %s)</p>
  
  <h3>2. ASSIGNED VEHICLE</h3>
  <p><strong>Vehicle:</strong> %d %s %s | <strong>Registration / Plate:</strong> %s</p>
  
  <h3>3. RENTAL PERIOD & RATES</h3>
  <p><strong>Pickup Date:</strong> %s</p>
  <p><strong>Scheduled Return Date:</strong> %s</p>
  <p><strong>Rental Charge:</strong> %s %.2f | <strong>Security Deposit:</strong> %s %.2f</p>
  <p><strong>Total Agreed Cost:</strong> %s %.2f</p>
  
  <h3>4. STANDARD TERMS & OBLIGATIONS</h3>
  <ol>
    <li>The Renter agrees to operate the vehicle in strict compliance with all traffic safety and transport laws.</li>
    <li>Smoking, unauthorized third-party driving, and off-road racing are strictly prohibited.</li>
    <li>The vehicle must be returned at the agreed return location with equal fuel level and during operating hours.</li>
    <li>Any traffic violations, parking fines, or unacknowledged physical damage during the custody period remain Renter's liability.</li>
    <li>Security deposit is released upon successful completion of the Return Inspection report without pending liabilities.</li>
  </ol>
</body>
</html>`,
		contractNumber, time.Now().Format("2006-01-02"),
		tenantName,
		custName, custPhone, custEmail, custLicense,
		vYear, vMake, vModel, vPlate,
		startDate.Format("2006-01-02 15:04"), endDate.Format("2006-01-02 15:04"),
		currency, rentalAmount, currency, depositAmount,
		currency, totalAmount,
	)

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	contractID := uuid.New()
	insertQuery := `
		INSERT INTO rental_contracts (id, booking_id, contract_number, content_html, signed_by_customer, version)
		VALUES ($1, $2, $3, $4, FALSE, 1)
		RETURNING id, created_at
	`
	c = RentalContract{
		ID:               contractID,
		TenantID:         tenantID,
		BookingID:        bookingID,
		ContractNumber:   contractNumber,
		ContentHTML:      htmlBody,
		SignedByCustomer: false,
		Version:          1,
	}
	if err := tx.QueryRow(ctx, insertQuery, contractID, bookingID, contractNumber, htmlBody).Scan(&c.ID, &c.CreatedAt); err != nil {
		return nil, err
	}

	// Insert Contract Version 1
	snapshotData, _ := json.Marshal(map[string]any{
		"contract_number": contractNumber,
		"booking_code":    bookingCode,
		"customer_name":   custName,
		"vehicle":         fmt.Sprintf("%d %s %s (%s)", vYear, vMake, vModel, vPlate),
		"start_date":      startDate,
		"end_date":        endDate,
		"total_amount":    totalAmount,
		"deposit_amount":  depositAmount,
	})
	_, _ = tx.Exec(ctx, `
		INSERT INTO contract_versions (tenant_id, contract_id, version, content_html, snapshot_data, signed_by_customer)
		VALUES ($1, $2, 1, $3, $4, FALSE)
	`, tenantID, contractID, htmlBody, snapshotData)

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// Generate PDF preview document
	if s.docSvc != nil {
		doc, err := s.docSvc.CreateOrUpdateDocument(
			ctx, tenantID, document.DocTypeRentalContract, contractNumber, "Rental Contract & Terms",
			"contract", c.ID, &document.DocumentPayload{
				TenantName:     tenantName,
				Currency:       currency,
				CurrencySymbol: "Rs.",
				DocNumber:      contractNumber,
				DocTitle:       "Vehicle Rental Agreement",
				DateStr:        time.Now().Format("2006-01-02"),
				CustomerName:   custName,
				CustomerPhone:  custPhone,
				CustomerEmail:  custEmail,
				BookingCode:    bookingCode,
				VehicleInfo:    fmt.Sprintf("%d %s %s", vYear, vMake, vModel),
				PlateNumber:    vPlate,
				RentalPeriod:   fmt.Sprintf("%s to %s", startDate.Format("2006-01-02"), endDate.Format("2006-01-02")),
				Subtotal:       rentalAmount,
				TaxAmount:      taxAmount,
				TotalAmount:    totalAmount,
				PaidAmount:     0,
				BalanceDue:     totalAmount,
				Terms:          "Standard terms: Lawful operation required. Renter is liable for fines and damage during rental period.",
				Items: []document.DocumentLineItem{
					{
						Description: fmt.Sprintf("Vehicle Rental (%s to %s)", startDate.Format("2006-01-02"), endDate.Format("2006-01-02")),
						Quantity:    1,
						UnitPrice:   rentalAmount,
						TotalPrice:  rentalAmount,
					},
					{
						Description: "Refundable Security Deposit",
						Quantity:    1,
						UnitPrice:   depositAmount,
						TotalPrice:  depositAmount,
					},
				},
			}, "contract_service", false,
		)
		if err == nil && doc != nil {
			c.DocumentID = &doc.ID
			_, _ = s.pool.Exec(ctx, `UPDATE rental_contracts SET document_id = $1 WHERE id = $2`, doc.ID, c.ID)
			c.DocumentURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, doc.ID, 30*time.Minute)
		}
	}

	return &c, nil
}

func (s *Service) SignContract(ctx context.Context, tenantID, contractID uuid.UUID, req SignContractRequest, ip, userAgent string) (*RentalContract, error) {
	c, err := s.GetContract(ctx, tenantID, contractID)
	if err != nil {
		return nil, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	now := time.Now()
	evidenceRaw := fmt.Sprintf("%s:%s:%s:%s", contractID, req.SignerName, req.SignatureURL, now.UTC().Format(time.RFC3339))
	hash := sha256.Sum256([]byte(evidenceRaw))
	evidenceHash := hex.EncodeToString(hash[:])

	signerRole := req.SignerRole
	if signerRole == "" {
		signerRole = "customer"
	}

	// Record signature in contract_signatures
	sigID := uuid.New()
	insertSig := `
		INSERT INTO contract_signatures (
			id, tenant_id, contract_id, signer_role, signer_name, signer_email,
			signature_image_url, signed_at, ip_address, user_agent, evidence_hash
		) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
	`
	_, err = tx.Exec(
		ctx, insertSig,
		sigID, tenantID, contractID, signerRole, req.SignerName, req.SignerEmail,
		req.SignatureURL, now, ip, userAgent, evidenceHash,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to save contract signature: %w", err)
	}

	// Update contract
	updateContract := `
		UPDATE rental_contracts
		SET signed_by_customer = TRUE,
		    signed_at = $1,
		    signature_url = $2,
		    signer_name = $3,
		    signer_ip = $4,
		    signer_user_agent = $5
		WHERE id = $6
	`
	_, err = tx.Exec(ctx, updateContract, now, req.SignatureURL, req.SignerName, ip, userAgent, contractID)
	if err != nil {
		return nil, err
	}

	// Update contract version
	_, _ = tx.Exec(ctx, `
		UPDATE contract_versions
		SET signed_by_customer = TRUE, signature_url = $1, signed_at = $2
		WHERE contract_id = $3 AND version = $4
	`, req.SignatureURL, now, contractID, c.Version)

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// Render immutable signed PDF document
	if s.docSvc != nil {
		doc, err := s.docSvc.CreateOrUpdateDocument(
			ctx, tenantID, document.DocTypeRentalContract, c.ContractNumber, "Signed Rental Agreement",
			"contract", c.ID, &document.DocumentPayload{
				TenantName:     "Vehicle Rental SaaS",
				Currency:       "NPR",
				CurrencySymbol: "Rs.",
				DocNumber:      c.ContractNumber,
				DocTitle:       "Signed Vehicle Rental Agreement",
				DateStr:        now.Format("2006-01-02 15:04"),
				CustomerName:   req.SignerName,
				CustomerEmail:  req.SignerEmail,
				SignerName:     req.SignerName,
				SignerRole:     signerRole,
				SignatureData:  req.SignatureURL,
				Terms:          fmt.Sprintf("Digitally signed and sealed. Verification Evidence Hash: %s", evidenceHash),
			}, "esign_service", true,
		)
		if err == nil && doc != nil {
			_, _ = s.pool.Exec(ctx, `UPDATE rental_contracts SET document_id = $1 WHERE id = $2`, doc.ID, c.ID)
		}
	}

	return s.GetContract(ctx, tenantID, contractID)
}

func (s *Service) GetContract(ctx context.Context, tenantID, contractID uuid.UUID) (*RentalContract, error) {
	query := `
		SELECT rc.id, b.tenant_id, rc.booking_id, rc.contract_number, rc.content_html, rc.signed_by_customer,
		       rc.signed_at, COALESCE(rc.signature_url, ''), COALESCE(rc.signer_name, ''), COALESCE(rc.signer_ip, ''),
		       COALESCE(rc.signer_user_agent, ''), rc.version, rc.document_id, rc.created_at
		FROM rental_contracts rc
		JOIN bookings b ON b.id = rc.booking_id
		WHERE rc.id = $1 AND b.tenant_id = $2
	`
	var c RentalContract
	err := s.pool.QueryRow(ctx, query, contractID, tenantID).Scan(
		&c.ID, &c.TenantID, &c.BookingID, &c.ContractNumber, &c.ContentHTML, &c.SignedByCustomer,
		&c.SignedAt, &c.SignatureURL, &c.SignerName, &c.SignerIP,
		&c.SignerUserAgent, &c.Version, &c.DocumentID, &c.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrContractNotFound
		}
		return nil, err
	}

	if c.DocumentID != nil && s.docSvc != nil {
		c.DocumentURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, *c.DocumentID, 30*time.Minute)
	}

	return &c, nil
}

func (s *Service) ListContracts(ctx context.Context, tenantID uuid.UUID, p pagination.Params) ([]RentalContract, pagination.Meta, error) {
	var total int64
	countQuery := `SELECT COUNT(*) FROM rental_contracts rc JOIN bookings b ON b.id = rc.booking_id WHERE b.tenant_id = $1`
	if err := s.pool.QueryRow(ctx, countQuery, tenantID).Scan(&total); err != nil {
		return nil, pagination.Meta{}, err
	}

	query := `
		SELECT rc.id, b.tenant_id, rc.booking_id, rc.contract_number, rc.content_html, rc.signed_by_customer,
		       rc.signed_at, COALESCE(rc.signature_url, ''), COALESCE(rc.signer_name, ''), COALESCE(rc.signer_ip, ''),
		       COALESCE(rc.signer_user_agent, ''), rc.version, rc.document_id, rc.created_at
		FROM rental_contracts rc
		JOIN bookings b ON b.id = rc.booking_id
		WHERE b.tenant_id = $1
		ORDER BY rc.created_at DESC
		LIMIT $2 OFFSET $3
	`
	rows, err := s.pool.Query(ctx, query, tenantID, p.Limit, p.Offset)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	defer rows.Close()

	list := make([]RentalContract, 0)
	for rows.Next() {
		var c RentalContract
		if err := rows.Scan(
			&c.ID, &c.TenantID, &c.BookingID, &c.ContractNumber, &c.ContentHTML, &c.SignedByCustomer,
			&c.SignedAt, &c.SignatureURL, &c.SignerName, &c.SignerIP,
			&c.SignerUserAgent, &c.Version, &c.DocumentID, &c.CreatedAt,
		); err != nil {
			return nil, pagination.Meta{}, err
		}
		if c.DocumentID != nil && s.docSvc != nil {
			c.DocumentURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, *c.DocumentID, 30*time.Minute)
		}
		list = append(list, c)
	}

	return list, pagination.BuildMeta(total, p), nil
}

func (s *Service) ListTemplates(ctx context.Context, tenantID uuid.UUID) ([]ContractTemplate, error) {
	query := `
		SELECT id, tenant_id, name, terms_body, is_default, created_at, updated_at
		FROM contract_templates
		WHERE tenant_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return []ContractTemplate{}, nil
	}
	defer rows.Close()

	list := make([]ContractTemplate, 0)
	for rows.Next() {
		var t ContractTemplate
		if err := rows.Scan(&t.ID, &t.TenantID, &t.Name, &t.TermsBody, &t.IsDefault, &t.CreatedAt, &t.UpdatedAt); err == nil {
			list = append(list, t)
		}
	}
	return list, nil
}

func (s *Service) CreateTemplate(ctx context.Context, tenantID uuid.UUID, req CreateTemplateRequest) (*ContractTemplate, error) {
	clausesJSON := req.Clauses
	if len(clausesJSON) == 0 {
		clausesJSON = []byte("[]")
	}

	tID := uuid.New()
	insertQuery := `
		INSERT INTO contract_templates (id, tenant_id, name, terms_body, is_default)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, created_at, updated_at
	`
	var t ContractTemplate
	t.ID = tID
	t.TenantID = tenantID
	t.Name = req.Name
	t.TermsBody = req.TermsBody
	t.IsDefault = req.IsDefault

	err := s.pool.QueryRow(ctx, insertQuery, tID, tenantID, req.Name, req.TermsBody, req.IsDefault).Scan(&t.ID, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, err
	}

	return &t, nil
}
