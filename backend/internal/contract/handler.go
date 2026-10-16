package contract

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
	r.Post("/", h.Create)
	r.Get("/{id}", h.GetByID)
	r.Get("/bookings/{bookingId}", h.GetBookingContract)
	r.Post("/{id}/sign", h.Sign)
	r.Post("/contracts/{id}/sign", h.Sign)

	return r
}

func (h *Handler) TemplateRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)
	r.Get("/", h.ListTemplates)
	r.Post("/", h.CreateTemplate)
	return r
}

func (h *Handler) GetBookingContract(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	bookingIDStr := chi.URLParam(r, "bookingId")
	bookingID, err := uuid.Parse(bookingIDStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	c, err := h.service.GetOrCreateContract(r.Context(), tenantID, bookingID)
	if err != nil {
		if err == ErrBookingNotFound {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "booking not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "CONTRACT_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, c)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	contractID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid contract ID")
		return
	}

	c, err := h.service.GetContract(r.Context(), tenantID, contractID)
	if err != nil {
		if err == ErrContractNotFound {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "contract not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "GET_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, c)
}

func (h *Handler) Sign(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	contractID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid contract ID")
		return
	}

	var req SignContractRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	ip := r.RemoteAddr
	userAgent := r.UserAgent()

	c, err := h.service.SignContract(r.Context(), tenantID, contractID, req, ip, userAgent)
	if err != nil {
		if err == ErrContractNotFound {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "contract not found")
			return
		}
		httpx.Error(w, http.StatusBadRequest, "SIGN_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, c)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	p := pagination.FromRequest(r)
	contracts, meta, err := h.service.ListContracts(r.Context(), tenantID, p)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.Paginated(w, http.StatusOK, contracts, meta)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req struct {
		BookingID uuid.UUID `json:"booking_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	c, err := h.service.GetOrCreateContract(r.Context(), tenantID, req.BookingID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, c)
}

func (h *Handler) ListTemplates(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	tpls, _ := h.service.ListTemplates(r.Context(), tenantID)
	httpx.JSON(w, http.StatusOK, tpls)
}

func (h *Handler) CreateTemplate(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req CreateTemplateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	tpl, err := h.service.CreateTemplate(r.Context(), tenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, tpl)
}
