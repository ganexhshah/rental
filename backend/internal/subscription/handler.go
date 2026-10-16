package subscription

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/rental/backend/internal/auth"
	"github.com/rental/backend/pkg/httpx"
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

	r.Get("/", h.GetSubscription)
	r.Put("/plan", h.UpdatePlan)
	r.Post("/change", h.UpdatePlan)
	r.Get("/usage", h.GetUsage)
	r.Get("/invoices", h.GetInvoices)

	return r
}

func (h *Handler) GetSubscription(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	sub, err := h.service.GetTenantSubscription(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "SUBSCRIPTION_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, sub)
}

func (h *Handler) UpdatePlan(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req UpdateSubscriptionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	sub, err := h.service.UpdateSubscriptionPlan(r.Context(), tenantID, req.PlanTier)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "UPDATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, sub)
}

func (h *Handler) GetUsage(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	usage, err := h.service.GetUsage(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "USAGE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, usage)
}

func (h *Handler) GetInvoices(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	invoices, _ := h.service.GetInvoices(r.Context(), tenantID)
	httpx.JSON(w, http.StatusOK, invoices)
}

