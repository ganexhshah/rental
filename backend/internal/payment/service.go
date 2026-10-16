package payment

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rental/backend/internal/document"
	"github.com/rental/backend/pkg/pagination"
)

var (
	ErrPaymentNotFound = errors.New("payment not found")
	ErrInvoiceNotFound = errors.New("invoice not found")
	ErrInvoiceLocked   = errors.New("cannot modify issued or paid invoice; create a credit note or void instead")
	ErrAlreadyRefunded = errors.New("payment has already been refunded")
	ErrDepositNotFound = errors.New("deposit not found")
	ErrInvalidAmount   = errors.New("invalid amount specified")
)

type Service struct {
	pool      *pgxpool.Pool
	providers map[ProviderName]Provider
	docSvc    *document.Service
}

func NewService(pool *pgxpool.Pool, docSvc *document.Service) *Service {
	s := &Service{
		pool:      pool,
		providers: make(map[ProviderName]Provider),
		docSvc:    docSvc,
	}
	s.providers[ProviderCash] = &CashProvider{}
	s.providers[ProviderEsewa] = &EsewaProvider{IsSandbox: true}
	s.providers[ProviderKhalti] = &KhaltiProvider{IsSandbox: true}
	s.providers[ProviderStripe] = &StripeProvider{}
	return s
}

func generateTxNumber() string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return fmt.Sprintf("TXN-%s-%s", time.Now().Format("20060102"), strings.ToUpper(hex.EncodeToString(b)))
}

func (s *Service) ProcessPayment(ctx context.Context, tenantID uuid.UUID, req ProcessPaymentRequest) (*ProcessPaymentResponse, error) {
	// 1. Idempotency Check
	if req.IdempotencyKey != "" {
		var existing Payment
		queryCheck := `
			SELECT id, tenant_id, booking_id, customer_id, transaction_number, amount, currency, category, method, gateway, COALESCE(gateway_reference, ''), COALESCE(idempotency_key, ''), status, COALESCE(notes, ''), receipt_number, document_id, created_at
			FROM payments
			WHERE tenant_id = $1 AND idempotency_key = $2
		`
		err := s.pool.QueryRow(ctx, queryCheck, tenantID, req.IdempotencyKey).Scan(
			&existing.ID, &existing.TenantID, &existing.BookingID, &existing.CustomerID, &existing.TransactionNumber,
			&existing.Amount, &existing.Currency, &existing.Category, &existing.Method, &existing.Gateway,
			&existing.GatewayReference, &existing.IdempotencyKey, &existing.Status, &existing.Notes,
			&existing.ReceiptNumber, &existing.DocumentID, &existing.CreatedAt,
		)
		if err == nil {
			var receiptURL string
			if existing.DocumentID != nil && s.docSvc != nil {
				receiptURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, *existing.DocumentID, 30*time.Minute)
			}
			return &ProcessPaymentResponse{
				Payment:       &existing,
				ReceiptNumber: existing.ReceiptNumber,
				ReceiptURL:    receiptURL,
			}, nil
		}
	}

	// 2. Select Payment Provider
	var provider Provider
	switch req.Method {
	case MethodEsewa:
		provider = s.providers[ProviderEsewa]
	case MethodKhalti:
		provider = s.providers[ProviderKhalti]
	case MethodCard:
		provider = s.providers[ProviderStripe]
	default:
		provider = s.providers[ProviderCash]
	}

	txNum := generateTxNumber()
	chargeResp, err := provider.InitiatePayment(ctx, ChargeRequest{
		Amount:         req.Amount,
		Currency:       "NPR",
		OrderID:        txNum,
		IdempotencyKey: req.IdempotencyKey,
		ReturnURL:      req.ReturnURL,
	})
	if err != nil {
		return nil, fmt.Errorf("provider error: %w", err)
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// If customer ID not explicitly provided but booking ID is, resolve customer from booking
	var customerName string
	if req.BookingID != nil {
		var cID uuid.UUID
		if err := tx.QueryRow(ctx, `
			SELECT b.customer_id, c.full_name
			FROM bookings b
			JOIN customers c ON c.id = b.customer_id
			WHERE b.id = $1 AND b.tenant_id = $2
		`, *req.BookingID, tenantID).Scan(&cID, &customerName); err == nil {
			if req.CustomerID == nil {
				req.CustomerID = &cID
			}
		}
	} else if req.CustomerID != nil {
		_ = tx.QueryRow(ctx, "SELECT full_name FROM customers WHERE id = $1 AND tenant_id = $2", *req.CustomerID, tenantID).Scan(&customerName)
	}

	paymentID := uuid.New()
	insertPayment := `
		INSERT INTO payments (
			id, tenant_id, booking_id, customer_id, customer_name, transaction_number,
			amount, currency, category, method, gateway,
			gateway_reference, idempotency_key, status, notes
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, 'NPR', $8, $9, $10,
			$11, $12, $13, $14
		)
		RETURNING id, tenant_id, booking_id, customer_id, customer_name, transaction_number, amount, currency, category, method, gateway, COALESCE(gateway_reference, ''), COALESCE(idempotency_key, ''), status, COALESCE(notes, ''), created_at
	`
	var p Payment
	err = tx.QueryRow(
		ctx, insertPayment,
		paymentID, tenantID, req.BookingID, req.CustomerID, customerName, txNum,
		req.Amount, req.Category, req.Method, string(provider.Name()),
		chargeResp.GatewayReference, req.IdempotencyKey, chargeResp.Status, req.Notes,
	).Scan(
		&p.ID, &p.TenantID, &p.BookingID, &p.CustomerID, &p.CustomerName, &p.TransactionNumber,
		&p.Amount, &p.Currency, &p.Category, &p.Method, &p.Gateway,
		&p.GatewayReference, &p.IdempotencyKey, &p.Status, &p.Notes, &p.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to save payment record: %w", err)
	}

	// Record payment attempt
	reqPayload, _ := json.Marshal(req)
	respPayload, _ := json.Marshal(chargeResp)
	_, _ = tx.Exec(ctx, `
		INSERT INTO payment_attempts (tenant_id, payment_id, booking_id, gateway, attempt_number, amount, currency, status, request_payload, response_payload)
		VALUES ($1, $2, $3, $4, 1, $5, 'NPR', $6, $7, $8)
	`, tenantID, p.ID, req.BookingID, p.Gateway, p.Amount, chargeResp.Status, reqPayload, respPayload)

	var receiptNum string
	var receiptURL string

	// If payment is completed immediately (e.g. Cash / Sandbox approval), apply updates & generate receipt
	if chargeResp.Status == "completed" {
		p.SettledAt = &p.CreatedAt

		// Generate official sequence receipt number
		if s.docSvc != nil {
			receiptNum, _ = s.docSvc.GetNextSequenceNumber(ctx, tenantID, document.DocTypePaymentReceipt, "REC", 6)
			p.ReceiptNumber = receiptNum
			_, _ = tx.Exec(ctx, `UPDATE payments SET receipt_number = $1, settled_at = NOW() WHERE id = $2`, receiptNum, p.ID)
		}

		if req.BookingID != nil {
			if err := s.applyPaymentToBookingAndInvoice(ctx, tx, tenantID, *req.BookingID, req.Amount, req.InvoiceID, p.ID); err != nil {
				return nil, err
			}
		}

		// Also record payment_receipt row
		if receiptNum != "" {
			_, _ = tx.Exec(ctx, `
				INSERT INTO payment_receipts (tenant_id, receipt_number, payment_id, customer_id, booking_id, amount, currency, payment_method)
				VALUES ($1, $2, $3, $4, $5, $6, 'NPR', $7)
			`, tenantID, receiptNum, p.ID, req.CustomerID, req.BookingID, req.Amount, string(req.Method))
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// Generate PDF Receipt asynchronously or after commit
	if chargeResp.Status == "completed" && receiptNum != "" && s.docSvc != nil {
		doc, err := s.docSvc.CreateOrUpdateDocument(
			ctx, tenantID, document.DocTypePaymentReceipt, receiptNum, "Official Payment Receipt",
			"payment", p.ID, &document.DocumentPayload{
				TenantName:     "Vehicle Rental SaaS",
				Currency:       "NPR",
				CurrencySymbol: "Rs.",
				DocNumber:      receiptNum,
				DocTitle:       "Official Payment Receipt",
				DateStr:        p.CreatedAt.Format("2006-01-02 15:04"),
				CustomerName:   p.CustomerName,
				PaymentMethod:  string(p.Method),
				TransactionRef: p.TransactionNumber,
				Subtotal:       p.Amount,
				TotalAmount:    p.Amount,
				PaidAmount:     p.Amount,
				BalanceDue:     0,
				Notes:          p.Notes,
				Items: []document.DocumentLineItem{
					{
						Description: fmt.Sprintf("Payment for %s via %s (Ref: %s)", p.Category, p.Method, p.TransactionNumber),
						Quantity:    1,
						UnitPrice:   p.Amount,
						TotalPrice:  p.Amount,
					},
				},
			}, "payment_service", false,
		)
		if err == nil && doc != nil {
			p.DocumentID = &doc.ID
			_, _ = s.pool.Exec(ctx, `UPDATE payments SET document_id = $1 WHERE id = $2`, doc.ID, p.ID)
			_, _ = s.pool.Exec(ctx, `UPDATE payment_receipts SET document_id = $1 WHERE payment_id = $2`, doc.ID, p.ID)
			receiptURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, doc.ID, 30*time.Minute)
		}
	}

	return &ProcessPaymentResponse{
		Payment:       &p,
		PaymentURL:    chargeResp.PaymentURL,
		ReceiptNumber: receiptNum,
		ReceiptURL:    receiptURL,
	}, nil
}

func (s *Service) applyPaymentToBookingAndInvoice(ctx context.Context, tx pgx.Tx, tenantID, bookingID uuid.UUID, amount float64, specificInvoiceID *uuid.UUID, paymentID uuid.UUID) error {
	var totalAmount, paidAmount float64
	queryBooking := `
		SELECT total_amount, paid_amount
		FROM bookings
		WHERE id = $1 AND tenant_id = $2
		FOR UPDATE
	`
	if err := tx.QueryRow(ctx, queryBooking, bookingID, tenantID).Scan(&totalAmount, &paidAmount); err != nil {
		return nil
	}

	newPaid := paidAmount + amount
	balanceDue := totalAmount - newPaid
	if balanceDue < 0 {
		balanceDue = 0
	}

	paymentStatus := "partially_paid"
	if balanceDue == 0 {
		paymentStatus = "paid"
	}

	updateBooking := `
		UPDATE bookings
		SET paid_amount = $1,
		    balance_due = $2,
		    payment_status = $3,
		    updated_at = NOW()
		WHERE id = $4
	`
	if _, err := tx.Exec(ctx, updateBooking, newPaid, balanceDue, paymentStatus, bookingID); err != nil {
		return err
	}

	// Update corresponding invoice if exists
	var invoiceID uuid.UUID
	if specificInvoiceID != nil {
		invoiceID = *specificInvoiceID
	} else {
		_ = tx.QueryRow(ctx, "SELECT id FROM invoices WHERE booking_id = $1 AND tenant_id = $2 ORDER BY created_at DESC LIMIT 1", bookingID, tenantID).Scan(&invoiceID)
	}

	if invoiceID != uuid.Nil {
		updateInvoice := `
			UPDATE invoices
			SET paid_amount = paid_amount + $1,
			    balance_due = GREATEST(0, total_amount - (paid_amount + $1)),
			    status = CASE WHEN total_amount <= (paid_amount + $1) THEN 'paid' ELSE 'partially_paid' END,
			    updated_at = NOW()
			WHERE id = $2 AND tenant_id = $3
		`
		_, _ = tx.Exec(ctx, updateInvoice, amount, invoiceID, tenantID)

		// Record allocation
		_, _ = tx.Exec(ctx, `
			INSERT INTO payment_allocations (tenant_id, payment_id, invoice_id, amount, allocation_type)
			VALUES ($1, $2, $3, $4, 'invoice_settlement')
		`, tenantID, paymentID, invoiceID, amount)
	}

	return nil
}

func (s *Service) ListPayments(ctx context.Context, tenantID uuid.UUID, bookingID *uuid.UUID, status string, p pagination.Params) ([]Payment, pagination.Meta, error) {
	if s.pool == nil {
		return []Payment{}, pagination.BuildMeta(0, p), nil
	}
	where := "WHERE tenant_id = $1"
	args := []any{tenantID}
	argIdx := 2

	if bookingID != nil {
		where += fmt.Sprintf(" AND booking_id = $%d", argIdx)
		args = append(args, *bookingID)
		argIdx++
	}

	if status != "" {
		where += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM payments %s", where)
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, pagination.Meta{}, err
	}

	query := fmt.Sprintf(`
		SELECT id, tenant_id, booking_id, customer_id, COALESCE(customer_name, ''), transaction_number, amount, currency, category, method, gateway, COALESCE(gateway_reference, ''), COALESCE(idempotency_key, ''), status, COALESCE(notes, ''), COALESCE(receipt_number, ''), document_id, settled_at, created_at
		FROM payments
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

	list := make([]Payment, 0)
	for rows.Next() {
		var pm Payment
		if err := rows.Scan(
			&pm.ID, &pm.TenantID, &pm.BookingID, &pm.CustomerID, &pm.CustomerName, &pm.TransactionNumber,
			&pm.Amount, &pm.Currency, &pm.Category, &pm.Method, &pm.Gateway,
			&pm.GatewayReference, &pm.IdempotencyKey, &pm.Status, &pm.Notes,
			&pm.ReceiptNumber, &pm.DocumentID, &pm.SettledAt, &pm.CreatedAt,
		); err != nil {
			return nil, pagination.Meta{}, err
		}
		list = append(list, pm)
	}

	return list, pagination.BuildMeta(total, p), nil
}

func (s *Service) GetPayment(ctx context.Context, tenantID, paymentID uuid.UUID) (*Payment, error) {
	query := `
		SELECT id, tenant_id, booking_id, customer_id, COALESCE(customer_name, ''), transaction_number, amount, currency, category, method, gateway, COALESCE(gateway_reference, ''), COALESCE(idempotency_key, ''), status, COALESCE(notes, ''), COALESCE(receipt_number, ''), document_id, settled_at, created_at
		FROM payments
		WHERE id = $1 AND tenant_id = $2
	`
	var pm Payment
	err := s.pool.QueryRow(ctx, query, paymentID, tenantID).Scan(
		&pm.ID, &pm.TenantID, &pm.BookingID, &pm.CustomerID, &pm.CustomerName, &pm.TransactionNumber,
		&pm.Amount, &pm.Currency, &pm.Category, &pm.Method, &pm.Gateway,
		&pm.GatewayReference, &pm.IdempotencyKey, &pm.Status, &pm.Notes,
		&pm.ReceiptNumber, &pm.DocumentID, &pm.SettledAt, &pm.CreatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPaymentNotFound
		}
		return nil, err
	}
	return &pm, nil
}

func (s *Service) CreateRefund(ctx context.Context, tenantID uuid.UUID, req RefundRequest) (*Refund, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var p Payment
	queryPay := `
		SELECT id, tenant_id, booking_id, amount, status
		FROM payments
		WHERE id = $1 AND tenant_id = $2
		FOR UPDATE
	`
	err = tx.QueryRow(ctx, queryPay, req.PaymentID, tenantID).Scan(&p.ID, &p.TenantID, &p.BookingID, &p.Amount, &p.Status)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrPaymentNotFound
		}
		return nil, err
	}

	if p.Status == "refunded" {
		return nil, ErrAlreadyRefunded
	}

	var alreadyRefunded float64
	err = tx.QueryRow(ctx, "SELECT COALESCE(SUM(amount), 0) FROM refunds WHERE payment_id = $1 AND tenant_id = $2 AND status = 'processed'", p.ID, tenantID).Scan(&alreadyRefunded)
	if err != nil {
		return nil, fmt.Errorf("failed to check existing refunds: %w", err)
	}

	availableToRefund := p.Amount - alreadyRefunded
	if req.Amount <= 0 {
		return nil, errors.New("refund amount must be greater than zero")
	}
	if req.Amount > availableToRefund {
		return nil, fmt.Errorf("refund amount (%.2f) exceeds refundable balance (%.2f)", req.Amount, availableToRefund)
	}

	refundID := uuid.New()
	insertRefund := `
		INSERT INTO refunds (id, tenant_id, payment_id, booking_id, amount, reason, status, processed_at)
		VALUES ($1, $2, $3, $4, $5, $6, 'processed', NOW())
		RETURNING id, tenant_id, payment_id, booking_id, amount, reason, status, processed_at, created_at
	`
	var ref Refund
	err = tx.QueryRow(ctx, insertRefund, refundID, tenantID, p.ID, p.BookingID, req.Amount, req.Reason).Scan(
		&ref.ID, &ref.TenantID, &ref.PaymentID, &ref.BookingID, &ref.Amount, &ref.Reason, &ref.Status, &ref.ProcessedAt, &ref.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to save refund record: %w", err)
	}

	// Update Payment status (refunded or partially_refunded)
	newPaymentStatus := "partially_refunded"
	if (alreadyRefunded + req.Amount) >= p.Amount {
		newPaymentStatus = "refunded"
	}
	_, _ = tx.Exec(ctx, "UPDATE payments SET status = $1 WHERE id = $2", newPaymentStatus, p.ID)

	// Adjust Booking and Invoice amounts if attached
	if p.BookingID != nil {
		updateBooking := `
			UPDATE bookings
			SET paid_amount = GREATEST(0, paid_amount - $1),
			    balance_due = balance_due + $1,
			    payment_status = CASE WHEN paid_amount - $1 <= 0 THEN 'unpaid' ELSE 'partially_paid' END,
			    updated_at = NOW()
			WHERE id = $2
		`
		_, _ = tx.Exec(ctx, updateBooking, req.Amount, *p.BookingID)

		updateInvoice := `
			UPDATE invoices
			SET paid_amount = GREATEST(0, paid_amount - $1),
			    balance_due = balance_due + $1,
			    status = CASE WHEN paid_amount - $1 <= 0 THEN 'issued' ELSE 'partially_paid' END,
			    updated_at = NOW()
			WHERE booking_id = $2 AND tenant_id = $3
		`
		_, _ = tx.Exec(ctx, updateInvoice, req.Amount, *p.BookingID, tenantID)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return &ref, nil
}

// ==========================================
// INVOICE & BILLING SYSTEM (Section B.2, E)
// ==========================================

func (s *Service) CreateInvoice(ctx context.Context, tenantID uuid.UUID, req CreateInvoiceRequest) (*Invoice, error) {
	if len(req.Items) == 0 {
		return nil, errors.New("invoice must have at least one line item")
	}

	// Calculate authoritative totals
	var subtotal float64
	for _, it := range req.Items {
		subtotal += it.UnitPrice * float64(it.Quantity)
	}

	if req.DiscountAmount < 0 {
		req.DiscountAmount = 0
	}
	if req.DiscountAmount > subtotal {
		req.DiscountAmount = subtotal
	}

	taxableAmount := subtotal - req.DiscountAmount
	taxRate := req.TaxRate
	if taxRate <= 0 {
		taxRate = 13.0 // Default Nepal VAT
	}
	taxAmount := (taxableAmount * taxRate) / 100.0
	totalAmount := taxableAmount + taxAmount

	// Concurrency-safe gapless invoice numbering
	invNumber, err := s.docSvc.GetNextSequenceNumber(ctx, tenantID, document.DocTypeInvoice, "INV", 6)
	if err != nil {
		return nil, fmt.Errorf("failed to generate invoice sequence: %w", err)
	}

	if req.IssuedDate.IsZero() {
		req.IssuedDate = time.Now()
	}

	status := "draft"
	if req.IssueImmediately {
		status = "issued"
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	invoiceID := uuid.New()
	insertInvoice := `
		INSERT INTO invoices (
			id, tenant_id, booking_id, customer_id, invoice_number, subtotal, tax_amount,
			discount_amount, total_amount, paid_amount, balance_due, status, due_date,
			issued_date, terms, payment_instructions
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, $9, 0.00, $9, $10, $11,
			$12, $13, $14
		)
		RETURNING id, created_at, updated_at
	`
	var inv Invoice
	inv.ID = invoiceID
	inv.TenantID = tenantID
	inv.BookingID = req.BookingID
	inv.CustomerID = req.CustomerID
	inv.InvoiceNumber = invNumber
	inv.Subtotal = subtotal
	inv.TaxAmount = taxAmount
	inv.DiscountAmount = req.DiscountAmount
	inv.TotalAmount = totalAmount
	inv.PaidAmount = 0.0
	inv.BalanceDue = totalAmount
	inv.Status = status
	inv.DueDate = req.DueDate
	inv.IssuedDate = req.IssuedDate
	inv.Terms = req.Terms
	inv.PaymentInstructions = req.PaymentInstructions

	err = tx.QueryRow(
		ctx, insertInvoice,
		invoiceID, tenantID, req.BookingID, req.CustomerID, invNumber, subtotal, taxAmount,
		req.DiscountAmount, totalAmount, status, req.DueDate, req.IssuedDate,
		req.Terms, req.PaymentInstructions,
	).Scan(&inv.ID, &inv.CreatedAt, &inv.UpdatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to insert invoice: %w", err)
	}

	// Insert Items
	inv.Items = make([]InvoiceItem, 0, len(req.Items))
	for _, it := range req.Items {
		itemTotal := it.UnitPrice * float64(it.Quantity)
		itemID := uuid.New()
		_, err := tx.Exec(ctx, `
			INSERT INTO invoice_items (id, invoice_id, description, quantity, unit_price, total_price)
			VALUES ($1, $2, $3, $4, $5, $6)
		`, itemID, invoiceID, it.Description, it.Quantity, it.UnitPrice, itemTotal)
		if err != nil {
			return nil, fmt.Errorf("failed to insert invoice item: %w", err)
		}
		inv.Items = append(inv.Items, InvoiceItem{
			ID:          itemID,
			InvoiceID:   invoiceID,
			Description: it.Description,
			Quantity:    it.Quantity,
			UnitPrice:   it.UnitPrice,
			TotalPrice:  itemTotal,
		})
	}

	// Fetch Customer Details
	_ = tx.QueryRow(ctx, "SELECT full_name, email FROM customers WHERE id = $1", req.CustomerID).Scan(&inv.CustomerName, &inv.CustomerEmail)

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// If issued immediately, freeze snapshot & generate official PDF
	if req.IssueImmediately {
		s.generateAndAttachInvoicePDF(ctx, tenantID, &inv, taxRate)
	}

	return &inv, nil
}

func (s *Service) IssueInvoice(ctx context.Context, tenantID, invoiceID uuid.UUID) (*Invoice, error) {
	inv, err := s.GetInvoice(ctx, tenantID, invoiceID)
	if err != nil {
		return nil, err
	}

	if inv.Status != "draft" {
		return inv, nil // already issued
	}

	_, err = s.pool.Exec(ctx, `UPDATE invoices SET status = 'issued', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`, invoiceID, tenantID)
	if err != nil {
		return nil, err
	}

	inv.Status = "issued"
	s.generateAndAttachInvoicePDF(ctx, tenantID, inv, 13.0)
	return inv, nil
}

func (s *Service) generateAndAttachInvoicePDF(ctx context.Context, tenantID uuid.UUID, inv *Invoice, taxRate float64) {
	if s.docSvc == nil {
		return
	}

	lineItems := make([]document.DocumentLineItem, len(inv.Items))
	for i, it := range inv.Items {
		lineItems[i] = document.DocumentLineItem{
			Description: it.Description,
			Quantity:    it.Quantity,
			UnitPrice:   it.UnitPrice,
			TotalPrice:  it.TotalPrice,
		}
	}

	doc, err := s.docSvc.CreateOrUpdateDocument(
		ctx, tenantID, document.DocTypeInvoice, inv.InvoiceNumber, "Official Tax Invoice",
		"invoice", inv.ID, &document.DocumentPayload{
			TenantName:     "Vehicle Rental SaaS",
			Currency:       "NPR",
			CurrencySymbol: "Rs.",
			DocNumber:      inv.InvoiceNumber,
			DocTitle:       "Official Tax Invoice",
			DateStr:        inv.IssuedDate.Format("2006-01-02"),
			DueDateStr:     inv.DueDate.Format("2006-01-02"),
			CustomerName:   inv.CustomerName,
			CustomerEmail:  inv.CustomerEmail,
			Items:          lineItems,
			Subtotal:       inv.Subtotal,
			TaxAmount:      inv.TaxAmount,
			TaxRate:        taxRate,
			DiscountAmount: inv.DiscountAmount,
			TotalAmount:    inv.TotalAmount,
			PaidAmount:     inv.PaidAmount,
			BalanceDue:     inv.BalanceDue,
			Notes:          inv.PaymentInstructions,
			Terms:          inv.Terms,
		}, "billing_service", false,
	)

	if err == nil && doc != nil {
		inv.DocumentID = &doc.ID
		_, _ = s.pool.Exec(ctx, `UPDATE invoices SET document_id = $1 WHERE id = $2`, doc.ID, inv.ID)
		inv.DocumentURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, doc.ID, 30*time.Minute)
	}
}

func (s *Service) VoidInvoice(ctx context.Context, tenantID, invoiceID uuid.UUID, req VoidInvoiceRequest) (*Invoice, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	var inv Invoice
	query := `SELECT id, status, paid_amount FROM invoices WHERE id = $1 AND tenant_id = $2 FOR UPDATE`
	err = tx.QueryRow(ctx, query, invoiceID, tenantID).Scan(&inv.ID, &inv.Status, &inv.PaidAmount)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvoiceNotFound
		}
		return nil, err
	}

	if inv.PaidAmount > 0 {
		return nil, errors.New("cannot void invoice with recorded payments; issue a refund or credit note instead")
	}

	_, err = tx.Exec(ctx, `
		UPDATE invoices
		SET status = 'void', voided_at = NOW(), void_reason = $1, updated_at = NOW()
		WHERE id = $2 AND tenant_id = $3
	`, req.Reason, invoiceID, tenantID)
	if err != nil {
		return nil, err
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	return s.GetInvoice(ctx, tenantID, invoiceID)
}

func (s *Service) CreateCreditNote(ctx context.Context, tenantID uuid.UUID, req CreateCreditNoteRequest) (*CreditNote, error) {
	inv, err := s.GetInvoice(ctx, tenantID, req.InvoiceID)
	if err != nil {
		return nil, err
	}

	if req.Amount <= 0 || req.Amount > inv.TotalAmount {
		return nil, fmt.Errorf("credit note amount must be between 0 and invoice total %.2f", inv.TotalAmount)
	}

	cnNumber, err := s.docSvc.GetNextSequenceNumber(ctx, tenantID, document.DocTypeCreditNote, "CN", 6)
	if err != nil {
		return nil, err
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	cnID := uuid.New()
	insertCN := `
		INSERT INTO credit_notes (id, tenant_id, invoice_id, customer_id, credit_note_number, amount, reason, status, issued_date)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'issued', CURRENT_DATE)
		RETURNING id, created_at
	`
	var cn CreditNote
	cn.ID = cnID
	cn.TenantID = tenantID
	cn.InvoiceID = req.InvoiceID
	cn.CustomerID = inv.CustomerID
	cn.CreditNoteNumber = cnNumber
	cn.Amount = req.Amount
	cn.Reason = req.Reason
	cn.Status = "issued"
	cn.IssuedDate = time.Now()

	err = tx.QueryRow(ctx, insertCN, cnID, tenantID, req.InvoiceID, inv.CustomerID, cnNumber, req.Amount, req.Reason, "issued").Scan(&cn.ID, &cn.CreatedAt)
	if err != nil {
		return nil, err
	}

	// Update invoice balance due
	_, _ = tx.Exec(ctx, `
		UPDATE invoices
		SET balance_due = GREATEST(0, balance_due - $1),
		    status = CASE WHEN balance_due - $1 <= 0 THEN 'paid' ELSE status END,
		    updated_at = NOW()
		WHERE id = $2 AND tenant_id = $3
	`, req.Amount, req.InvoiceID, tenantID)

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	// Generate PDF for Credit note
	if s.docSvc != nil {
		doc, err := s.docSvc.CreateOrUpdateDocument(
			ctx, tenantID, document.DocTypeCreditNote, cnNumber, "Official Credit Note",
			"credit_note", cn.ID, &document.DocumentPayload{
				TenantName:     "Vehicle Rental SaaS",
				Currency:       "NPR",
				CurrencySymbol: "Rs.",
				DocNumber:      cnNumber,
				DocTitle:       "Official Credit Note",
				DateStr:        cn.IssuedDate.Format("2006-01-02"),
				CustomerName:   inv.CustomerName,
				CustomerEmail:  inv.CustomerEmail,
				Subtotal:       cn.Amount,
				TotalAmount:    cn.Amount,
				Notes:          fmt.Sprintf("Adjustment against Invoice %s. Reason: %s", inv.InvoiceNumber, cn.Reason),
				Items: []document.DocumentLineItem{
					{
						Description: fmt.Sprintf("Credit adjustment against Invoice %s (%s)", inv.InvoiceNumber, cn.Reason),
						Quantity:    1,
						UnitPrice:   cn.Amount,
						TotalPrice:  cn.Amount,
					},
				},
			}, "billing_service", false,
		)
		if err == nil && doc != nil {
			cn.DocumentID = &doc.ID
			_, _ = s.pool.Exec(ctx, `UPDATE credit_notes SET document_id = $1 WHERE id = $2`, doc.ID, cn.ID)
			cn.DocumentURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, doc.ID, 30*time.Minute)
		}
	}

	return &cn, nil
}

func (s *Service) ListInvoices(ctx context.Context, tenantID uuid.UUID, status string, p pagination.Params) ([]Invoice, pagination.Meta, error) {
	if s.pool == nil {
		return []Invoice{}, pagination.BuildMeta(0, p), nil
	}
	where := "WHERE i.tenant_id = $1"
	args := []any{tenantID}
	argIdx := 2

	if status != "" {
		where += fmt.Sprintf(" AND i.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM invoices i %s", where)
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, pagination.Meta{}, err
	}

	query := fmt.Sprintf(`
		SELECT i.id, i.tenant_id, i.booking_id, COALESCE(b.booking_code, ''), i.customer_id, c.full_name, c.email, i.invoice_number,
		       i.subtotal, i.tax_amount, i.discount_amount, i.total_amount, i.paid_amount, i.balance_due,
		       i.status, i.due_date, i.issued_date, COALESCE(i.terms, ''), COALESCE(i.payment_instructions, ''),
		       i.document_id, i.created_at, i.updated_at
		FROM invoices i
		JOIN customers c ON c.id = i.customer_id
		LEFT JOIN bookings b ON b.id = i.booking_id
		%s
		ORDER BY i.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, p.Limit, p.Offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	defer rows.Close()

	list := make([]Invoice, 0)
	for rows.Next() {
		var inv Invoice
		if err := rows.Scan(
			&inv.ID, &inv.TenantID, &inv.BookingID, &inv.BookingCode, &inv.CustomerID, &inv.CustomerName, &inv.CustomerEmail,
			&inv.InvoiceNumber, &inv.Subtotal, &inv.TaxAmount, &inv.DiscountAmount, &inv.TotalAmount,
			&inv.PaidAmount, &inv.BalanceDue, &inv.Status, &inv.DueDate, &inv.IssuedDate, &inv.Terms, &inv.PaymentInstructions,
			&inv.DocumentID, &inv.CreatedAt, &inv.UpdatedAt,
		); err != nil {
			return nil, pagination.Meta{}, err
		}
		if inv.DocumentID != nil && s.docSvc != nil {
			inv.DocumentURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, *inv.DocumentID, 30*time.Minute)
		}
		list = append(list, inv)
	}

	return list, pagination.BuildMeta(total, p), nil
}

func (s *Service) GetInvoice(ctx context.Context, tenantID, invoiceID uuid.UUID) (*Invoice, error) {
	query := `
		SELECT i.id, i.tenant_id, i.booking_id, COALESCE(b.booking_code, ''), i.customer_id, c.full_name, c.email, i.invoice_number,
		       i.subtotal, i.tax_amount, i.discount_amount, i.total_amount, i.paid_amount, i.balance_due,
		       i.status, i.due_date, i.issued_date, COALESCE(i.terms, ''), COALESCE(i.payment_instructions, ''),
		       i.document_id, i.created_at, i.updated_at
		FROM invoices i
		JOIN customers c ON c.id = i.customer_id
		LEFT JOIN bookings b ON b.id = i.booking_id
		WHERE i.id = $1 AND i.tenant_id = $2
	`
	var inv Invoice
	err := s.pool.QueryRow(ctx, query, invoiceID, tenantID).Scan(
		&inv.ID, &inv.TenantID, &inv.BookingID, &inv.BookingCode, &inv.CustomerID, &inv.CustomerName, &inv.CustomerEmail,
		&inv.InvoiceNumber, &inv.Subtotal, &inv.TaxAmount, &inv.DiscountAmount, &inv.TotalAmount,
		&inv.PaidAmount, &inv.BalanceDue, &inv.Status, &inv.DueDate, &inv.IssuedDate, &inv.Terms, &inv.PaymentInstructions,
		&inv.DocumentID, &inv.CreatedAt, &inv.UpdatedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrInvoiceNotFound
		}
		return nil, err
	}

	// Fetch items
	rows, err := s.pool.Query(ctx, "SELECT id, invoice_id, description, quantity, unit_price, total_price FROM invoice_items WHERE invoice_id = $1", inv.ID)
	if err == nil {
		defer rows.Close()
		for rows.Next() {
			var it InvoiceItem
			if err := rows.Scan(&it.ID, &it.InvoiceID, &it.Description, &it.Quantity, &it.UnitPrice, &it.TotalPrice); err == nil {
				inv.Items = append(inv.Items, it)
			}
		}
	}

	if inv.DocumentID != nil && s.docSvc != nil {
		inv.DocumentURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, *inv.DocumentID, 30*time.Minute)
	}

	return &inv, nil
}

// ==========================================
// DEPOSIT SYSTEM (Section B.1, D)
// ==========================================

func (s *Service) ListDeposits(ctx context.Context, tenantID uuid.UUID) ([]DepositRecord, error) {
	if s.pool == nil {
		return []DepositRecord{}, nil
	}
	query := `
		SELECT d.id, d.tenant_id, d.booking_id, COALESCE(b.booking_code, ''), d.customer_id, c.full_name,
		       d.amount, d.status, d.hold_method, d.deducted_amount, d.refunded_amount, d.forfeited_amount,
		       COALESCE(d.deduction_reason, ''), COALESCE(d.release_notes, ''), d.released_at, d.document_id,
		       d.created_at, d.updated_at
		FROM deposits d
		JOIN bookings b ON b.id = d.booking_id
		JOIN customers c ON c.id = b.customer_id
		WHERE d.tenant_id = $1
		ORDER BY d.created_at DESC
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return []DepositRecord{}, nil
	}
	defer rows.Close()

	list := make([]DepositRecord, 0)
	for rows.Next() {
		var dep DepositRecord
		if err := rows.Scan(
			&dep.ID, &dep.TenantID, &dep.BookingID, &dep.BookingCode, &dep.CustomerID, &dep.CustomerName,
			&dep.Amount, &dep.Status, &dep.HoldMethod, &dep.DeductedAmount, &dep.RefundedAmount, &dep.ForfeitedAmount,
			&dep.DeductionReason, &dep.ReleaseNotes, &dep.ReleasedAt, &dep.DocumentID,
			&dep.CreatedAt, &dep.UpdatedAt,
		); err == nil {
			list = append(list, dep)
		}
	}
	return list, nil
}

func (s *Service) ReleaseDeposit(ctx context.Context, tenantID, depositID uuid.UUID, releaseNotes string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE deposits
		SET status = 'released', release_notes = $1, released_at = NOW(), updated_at = NOW()
		WHERE id = $2 AND tenant_id = $3
	`, releaseNotes, depositID, tenantID)
	return err
}

func (s *Service) DeductDeposit(ctx context.Context, tenantID, depositID uuid.UUID, req DeductDepositRequest) error {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return err
	}
	defer tx.Rollback(ctx)

	var d DepositRecord
	query := `SELECT id, amount, deducted_amount FROM deposits WHERE id = $1 AND tenant_id = $2 FOR UPDATE`
	err = tx.QueryRow(ctx, query, depositID, tenantID).Scan(&d.ID, &d.Amount, &d.DeductedAmount)
	if err != nil {
		return err
	}

	remaining := d.Amount - d.DeductedAmount
	if req.DeductedAmount > remaining {
		return fmt.Errorf("deduction amount exceeds available deposit of %.2f", remaining)
	}

	newDeducted := d.DeductedAmount + req.DeductedAmount
	newStatus := "partially_deducted"
	forfeited := 0.0

	if req.ForfeitRemaining || newDeducted >= d.Amount {
		newStatus = "forfeited"
		forfeited = d.Amount - newDeducted
	}

	updateQuery := `
		UPDATE deposits
		SET status = $1, deducted_amount = $2, forfeited_amount = forfeited_amount + $3,
		    deduction_reason = $4, updated_at = NOW()
		WHERE id = $5 AND tenant_id = $6
	`
	_, err = tx.Exec(ctx, updateQuery, newStatus, newDeducted, forfeited, req.Reason, depositID, tenantID)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}
