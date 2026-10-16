package expense

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rental/backend/internal/document"
	"github.com/rental/backend/pkg/pagination"
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

func generateExpenseNumber() string {
	b := make([]byte, 3)
	_, _ = rand.Read(b)
	return fmt.Sprintf("EXP-%s-%s", time.Now().Format("20060102"), strings.ToUpper(hex.EncodeToString(b)))
}

// Categories
func (s *Service) CreateCategory(ctx context.Context, tenantID uuid.UUID, req CreateCategoryRequest) (*ExpenseCategory, error) {
	id := uuid.New()
	query := `
		INSERT INTO expense_categories (id, tenant_id, name, monthly_budget)
		VALUES ($1, $2, $3, $4)
		RETURNING id, tenant_id, name, monthly_budget, created_at
	`
	var c ExpenseCategory
	err := s.pool.QueryRow(ctx, query, id, tenantID, req.Name, req.MonthlyBudget).Scan(
		&c.ID, &c.TenantID, &c.Name, &c.MonthlyBudget, &c.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *Service) ListCategories(ctx context.Context, tenantID uuid.UUID) ([]ExpenseCategory, error) {
	query := `SELECT id, tenant_id, name, monthly_budget, created_at FROM expense_categories WHERE tenant_id = $1 ORDER BY name ASC`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]ExpenseCategory, 0)
	for rows.Next() {
		var c ExpenseCategory
		if err := rows.Scan(&c.ID, &c.TenantID, &c.Name, &c.MonthlyBudget, &c.CreatedAt); err == nil {
			list = append(list, c)
		}
	}
	return list, nil
}

// Expenses
func (s *Service) CreateExpense(ctx context.Context, tenantID uuid.UUID, recordedBy string, req CreateExpenseRequest) (*Expense, error) {
	id := uuid.New()
	expNum := generateExpenseNumber()
	if s.docSvc != nil {
		seq, err := s.docSvc.GetNextSequenceNumber(ctx, tenantID, document.DocTypeExpenseReport, "EXP", 6)
		if err == nil && seq != "" {
			expNum = seq
		}
	}

	query := `
		INSERT INTO expenses (
			id, tenant_id, category_id, vehicle_id, expense_number,
			category, title, description, amount, currency,
			date, vendor, payment_method, recorded_by, is_tax_deductible, status, receipt_url
		) VALUES (
			$1, $2, $3, $4, $5,
			$6, $7, $8, $9, 'NPR',
			$10, $11, $12, $13, $14, 'approved', $15
		)
		RETURNING id, tenant_id, category_id, vehicle_id, expense_number, category, title,
		          COALESCE(description, ''), amount, currency, date, COALESCE(vendor, ''),
		          payment_method, COALESCE(recorded_by, ''), is_tax_deductible, status,
		          COALESCE(receipt_url, ''), created_at, updated_at
	`
	var e Expense
	err := s.pool.QueryRow(
		ctx, query,
		id, tenantID, req.CategoryID, req.VehicleID, expNum,
		req.Category, req.Title, req.Description, req.Amount,
		req.Date, req.Vendor, req.PaymentMethod, recordedBy, req.IsTaxDeductible, req.ReceiptURL,
	).Scan(
		&e.ID, &e.TenantID, &e.CategoryID, &e.VehicleID, &e.ExpenseNumber, &e.Category, &e.Title,
		&e.Description, &e.Amount, &e.Currency, &e.Date, &e.Vendor,
		&e.PaymentMethod, &e.RecordedBy, &e.IsTaxDeductible, &e.Status,
		&e.ReceiptURL, &e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Cost allocation if vehicle provided
	if req.VehicleID != nil {
		_, _ = s.pool.Exec(ctx, `
			INSERT INTO expense_allocations (tenant_id, expense_id, vehicle_id, amount)
			VALUES ($1, $2, $3, $4)
		`, tenantID, id, req.VehicleID, req.Amount)
	}

	// Generate Official Expense Voucher PDF
	if s.docSvc != nil {
		doc, err := s.docSvc.CreateOrUpdateDocument(
			ctx, tenantID, document.DocTypeExpenseReport, expNum, "Expense Disbursement Voucher",
			"expense", id, &document.DocumentPayload{
				TenantName:     "Vehicle Rental SaaS",
				Currency:       "NPR",
				CurrencySymbol: "Rs.",
				DocNumber:      expNum,
				DocTitle:       "Official Expense Voucher",
				DateStr:        req.Date.Format("2006-01-02"),
				CustomerName:   req.Vendor,
				PaymentMethod:  req.PaymentMethod,
				Subtotal:       req.Amount,
				TotalAmount:    req.Amount,
				PaidAmount:     req.Amount,
				BalanceDue:     0,
				Notes:          fmt.Sprintf("Category: %s | Description: %s | Recorded By: %s", req.Category, req.Description, recordedBy),
				Items: []document.DocumentLineItem{
					{Description: fmt.Sprintf("[%s] %s", req.Category, req.Title), Quantity: 1, UnitPrice: req.Amount, TotalPrice: req.Amount},
				},
			}, "expense_service", false,
		)
		if err == nil && doc != nil {
			e.DocumentID = &doc.ID
			_, _ = s.pool.Exec(ctx, `UPDATE expenses SET document_id = $1 WHERE id = $2`, doc.ID, id)
			e.DocumentURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, doc.ID, 30*time.Minute)
		}
	}

	return &e, nil
}

func (s *Service) ListExpenses(ctx context.Context, tenantID uuid.UUID, vehicleID *uuid.UUID, category string, p pagination.Params) ([]Expense, pagination.Meta, error) {
	where := "WHERE e.tenant_id = $1"
	args := []any{tenantID}
	argIdx := 2

	if vehicleID != nil {
		where += fmt.Sprintf(" AND e.vehicle_id = $%d", argIdx)
		args = append(args, *vehicleID)
		argIdx++
	}

	if category != "" {
		where += fmt.Sprintf(" AND e.category = $%d", argIdx)
		args = append(args, category)
		argIdx++
	}

	if p.Search != "" {
		where += fmt.Sprintf(" AND (e.title ILIKE $%d OR e.expense_number ILIKE $%d OR e.vendor ILIKE $%d)", argIdx, argIdx, argIdx)
		args = append(args, "%"+p.Search+"%")
		argIdx++
	}

	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM expenses e %s", where)
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, pagination.Meta{}, err
	}

	query := fmt.Sprintf(`
		SELECT e.id, e.tenant_id, e.category_id, COALESCE(ec.name, ''), e.vehicle_id, COALESCE(v.plate_number, ''),
		       e.expense_number, e.category, e.title, COALESCE(e.description, ''), e.amount, e.currency,
		       e.date, COALESCE(e.vendor, ''), e.payment_method, COALESCE(e.recorded_by, ''),
		       e.is_tax_deductible, e.status, COALESCE(e.receipt_url, ''), e.document_id, e.created_at, e.updated_at
		FROM expenses e
		LEFT JOIN expense_categories ec ON ec.id = e.category_id
		LEFT JOIN vehicles v ON v.id = e.vehicle_id
		%s
		ORDER BY e.date DESC, e.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, p.Limit, p.Offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	defer rows.Close()

	list := make([]Expense, 0)
	for rows.Next() {
		var e Expense
		if err := rows.Scan(
			&e.ID, &e.TenantID, &e.CategoryID, &e.CategoryName, &e.VehicleID, &e.VehiclePlate,
			&e.ExpenseNumber, &e.Category, &e.Title, &e.Description, &e.Amount, &e.Currency,
			&e.Date, &e.Vendor, &e.PaymentMethod, &e.RecordedBy,
			&e.IsTaxDeductible, &e.Status, &e.ReceiptURL, &e.DocumentID, &e.CreatedAt, &e.UpdatedAt,
		); err != nil {
			return nil, pagination.Meta{}, err
		}
		if e.DocumentID != nil && s.docSvc != nil {
			e.DocumentURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, *e.DocumentID, 30*time.Minute)
		}
		list = append(list, e)
	}

	return list, pagination.BuildMeta(total, p), nil
}

func (s *Service) UpdateExpense(ctx context.Context, tenantID, expenseID uuid.UUID, updates map[string]any) error {
	if len(updates) == 0 {
		return nil
	}
	allowed := map[string]bool{
		"title": true, "description": true, "amount": true, "category": true,
		"vendor": true, "payment_method": true, "is_tax_deductible": true,
		"status": true, "receipt_url": true,
	}

	setClauses := []string{}
	args := []any{tenantID, expenseID}
	idx := 3

	for k, v := range updates {
		if allowed[k] {
			setClauses = append(setClauses, fmt.Sprintf("%s = $%d", k, idx))
			args = append(args, v)
			idx++
		}
	}

	if len(setClauses) == 0 {
		return nil
	}

	setClauses = append(setClauses, "updated_at = NOW()")
	query := fmt.Sprintf("UPDATE expenses SET %s WHERE tenant_id = $1 AND id = $2", strings.Join(setClauses, ", "))
	_, err := s.pool.Exec(ctx, query, args...)
	return err
}

func (s *Service) ApproveExpense(ctx context.Context, tenantID, expenseID uuid.UUID, approvedBy string) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE expenses
		SET status = 'approved', approved_by = $1, approved_at = NOW(), updated_at = NOW()
		WHERE id = $2 AND tenant_id = $3
	`, approvedBy, expenseID, tenantID)
	return err
}

func (s *Service) RejectExpense(ctx context.Context, tenantID, expenseID uuid.UUID) error {
	_, err := s.pool.Exec(ctx, `
		UPDATE expenses
		SET status = 'rejected', updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
	`, expenseID, tenantID)
	return err
}
