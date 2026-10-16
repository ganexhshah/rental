package expense

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

	r.Get("/categories", h.ListCategories)
	r.Post("/categories", h.CreateCategory)
	r.Get("/", h.ListExpenses)
	r.Post("/", h.CreateExpense)
	r.Patch("/{id}", h.UpdateExpense)
	r.Post("/{id}/approve", h.ApproveExpense)
	r.Post("/{id}/reject", h.RejectExpense)

	return r
}

func (h *Handler) CategoryRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)
	r.Get("/", h.ListCategories)
	r.Post("/", h.CreateCategory)
	return r
}

func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	categories, err := h.service.ListCategories(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, categories)
}

func (h *Handler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req CreateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	cat, err := h.service.CreateCategory(r.Context(), tenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, cat)
}

func (h *Handler) ListExpenses(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	p := pagination.FromRequest(r)
	category := r.URL.Query().Get("category")

	var vehicleID *uuid.UUID
	if vStr := r.URL.Query().Get("vehicle_id"); vStr != "" {
		if vid, err := uuid.Parse(vStr); err == nil {
			vehicleID = &vid
		}
	}

	expenses, meta, err := h.service.ListExpenses(r.Context(), tenantID, vehicleID, category, p)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.Paginated(w, http.StatusOK, expenses, meta)
}

func (h *Handler) CreateExpense(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	email, _ := auth.GetUserEmail(r.Context())

	var req CreateExpenseRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	exp, err := h.service.CreateExpense(r.Context(), tenantID, email, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, exp)
}

func (h *Handler) UpdateExpense(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	expID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid expense ID")
		return
	}

	var req map[string]any
	_ = json.NewDecoder(r.Body).Decode(&req)

	if err := h.service.UpdateExpense(r.Context(), tenantID, expID, req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "UPDATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *Handler) ApproveExpense(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	expID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid expense ID")
		return
	}

	email, _ := auth.GetUserEmail(r.Context())
	if err := h.service.ApproveExpense(r.Context(), tenantID, expID, email); err != nil {
		httpx.Error(w, http.StatusBadRequest, "APPROVE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"status": "approved"})
}

func (h *Handler) RejectExpense(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	expID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid expense ID")
		return
	}

	if err := h.service.RejectExpense(r.Context(), tenantID, expID); err != nil {
		httpx.Error(w, http.StatusBadRequest, "REJECT_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"status": "rejected"})
}


