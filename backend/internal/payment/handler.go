package payment

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rental/backend/internal/auth"
	"github.com/rental/backend/pkg/httpx"
	"github.com/rental/backend/pkg/pagination"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Routes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()

	r.Use(authMiddleware)

	r.Get("/", h.List)
	r.Post("/", h.Process)
	r.Get("/{id}", h.GetByID)
	r.Post("/refund", h.Refund)
	r.Post("/{id}/refund", h.RefundByID)

	return r
}

func (h *Handler) DepositRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)

	r.Get("/", h.ListDeposits)
	r.Post("/{id}/release", h.ReleaseDeposit)
	r.Post("/{id}/deduct", h.DeductDeposit)
	r.Post("/{id}/refund", h.RefundDeposit)

	return r
}

func (h *Handler) WebhookRoutes() chi.Router {
	r := chi.NewRouter()
	r.Post("/{provider}", h.HandleWebhook)
	return r
}

func (h *Handler) InvoiceRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()

	r.Use(authMiddleware)

	r.Get("/", h.ListInvoices)
	r.Post("/", h.CreateInvoice)
	r.Get("/{id}", h.GetInvoice)
	r.Post("/{id}/issue", h.IssueInvoice)
	r.Post("/{id}/void", h.VoidInvoice)
	r.Post("/{id}/credit-note", h.CreateCreditNote)

	return r
}

func (h *Handler) Process(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req ProcessPaymentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	res, err := h.service.ProcessPayment(r.Context(), tenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "PAYMENT_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, res)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	p := pagination.FromRequest(r)
	status := r.URL.Query().Get("status")

	var bookingID *uuid.UUID
	if bStr := r.URL.Query().Get("booking_id"); bStr != "" {
		if bid, err := uuid.Parse(bStr); err == nil {
			bookingID = &bid
		}
	}

	payments, meta, err := h.service.ListPayments(r.Context(), tenantID, bookingID, status, p)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", "failed to fetch payments")
		return
	}

	httpx.Paginated(w, http.StatusOK, payments, meta)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	payID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid payment ID")
		return
	}

	pm, err := h.service.GetPayment(r.Context(), tenantID, payID)
	if err != nil {
		if err == ErrPaymentNotFound {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "payment not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, pm)
}

func (h *Handler) Refund(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req RefundRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	ref, err := h.service.CreateRefund(r.Context(), tenantID, req)
	if err != nil {
		if err == ErrPaymentNotFound {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "payment not found")
			return
		}
		httpx.Error(w, http.StatusBadRequest, "REFUND_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, ref)
}

func (h *Handler) RefundByID(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	paymentID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid payment ID")
		return
	}

	var req struct {
		Amount float64 `json:"amount"`
		Reason string  `json:"reason"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	ref, err := h.service.CreateRefund(r.Context(), tenantID, RefundRequest{
		PaymentID: paymentID,
		Amount:    req.Amount,
		Reason:    req.Reason,
	})
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "REFUND_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, ref)
}

// Invoices
func (h *Handler) ListInvoices(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	p := pagination.FromRequest(r)
	status := r.URL.Query().Get("status")

	invoices, meta, err := h.service.ListInvoices(r.Context(), tenantID, status, p)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", "failed to fetch invoices")
		return
	}

	httpx.Paginated(w, http.StatusOK, invoices, meta)
}

func (h *Handler) CreateInvoice(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req CreateInvoiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	inv, err := h.service.CreateInvoice(r.Context(), tenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, inv)
}

func (h *Handler) GetInvoice(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	invID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid invoice ID")
		return
	}

	inv, err := h.service.GetInvoice(r.Context(), tenantID, invID)
	if err != nil {
		if err == ErrInvoiceNotFound {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "invoice not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "GET_FAILED", "failed to get invoice")
		return
	}

	httpx.JSON(w, http.StatusOK, inv)
}

func (h *Handler) IssueInvoice(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	invID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid invoice ID")
		return
	}

	inv, err := h.service.IssueInvoice(r.Context(), tenantID, invID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "ISSUE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, inv)
}

func (h *Handler) VoidInvoice(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	invID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid invoice ID")
		return
	}

	var req VoidInvoiceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	inv, err := h.service.VoidInvoice(r.Context(), tenantID, invID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "VOID_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, inv)
}

func (h *Handler) CreateCreditNote(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	invID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid invoice ID")
		return
	}

	var req CreateCreditNoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}
	req.InvoiceID = invID

	cn, err := h.service.CreateCreditNote(r.Context(), tenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "CREDIT_NOTE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, cn)
}

// Deposits
func (h *Handler) ListDeposits(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	deposits, err := h.service.ListDeposits(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_DEPOSITS_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, deposits)
}

func (h *Handler) ReleaseDeposit(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	depID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid deposit ID")
		return
	}

	var req struct {
		Notes string `json:"notes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	if err := h.service.ReleaseDeposit(r.Context(), tenantID, depID, req.Notes); err != nil {
		httpx.Error(w, http.StatusBadRequest, "RELEASE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"status": "released"})
}

func (h *Handler) DeductDeposit(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	depID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid deposit ID")
		return
	}

	var req DeductDepositRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	if err := h.service.DeductDeposit(r.Context(), tenantID, depID, req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "DEDUCT_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"status": "deducted"})
}

func (h *Handler) RefundDeposit(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	depID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid deposit ID")
		return
	}

	var req struct {
		Notes string `json:"notes"`
	}
	_ = json.NewDecoder(r.Body).Decode(&req)

	if err := h.service.ReleaseDeposit(r.Context(), tenantID, depID, req.Notes); err != nil {
		httpx.Error(w, http.StatusBadRequest, "REFUND_DEPOSIT_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"status": "refunded"})
}

func (h *Handler) HandleWebhook(w http.ResponseWriter, r *http.Request) {
	provider := chi.URLParam(r, "provider")
	httpx.JSON(w, http.StatusOK, map[string]any{
		"received": true,
		"provider": provider,
		"status":   "processed",
	})
}
