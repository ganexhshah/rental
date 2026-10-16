package maintenance

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

	r.Get("/", h.ListRecords)
	r.Post("/", h.CreateRecord)
	r.Get("/vendors", h.ListVendors)
	r.Post("/vendors", h.CreateVendor)
	r.Get("/records", h.ListRecords)
	r.Post("/records", h.CreateRecord)
	r.Post("/records/{id}/complete", h.CompleteRecord)
	r.Post("/{id}/complete", h.CompleteRecord)
	r.Get("/work-orders", h.ListWorkOrders)
	r.Post("/work-orders", h.CreateWorkOrder)
	r.Get("/inspections", h.ListInspections)
	r.Post("/inspections", h.CreateInspection)
	r.Get("/damages", h.ListDamages)
	r.Post("/damages", h.CreateDamage)
	r.Get("/preventive-schedules", h.ListPreventiveSchedules)

	return r
}

func (h *Handler) DamageRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)

	r.Get("/", h.ListDamages)
	r.Post("/", h.CreateDamage)

	return r
}

func (h *Handler) InspectionRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)

	r.Get("/", h.ListInspections)
	r.Post("/", h.CreateInspection)

	return r
}

func (h *Handler) ListVendors(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	vendors, err := h.service.ListVendors(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, vendors)
}

func (h *Handler) CreateVendor(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req CreateVendorRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	vendor, err := h.service.CreateVendor(r.Context(), tenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, vendor)
}

func (h *Handler) ListRecords(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	p := pagination.FromRequest(r)
	status := r.URL.Query().Get("status")

	var vehicleID *uuid.UUID
	if vStr := r.URL.Query().Get("vehicle_id"); vStr != "" {
		if vid, err := uuid.Parse(vStr); err == nil {
			vehicleID = &vid
		}
	}

	records, meta, err := h.service.ListRecords(r.Context(), tenantID, vehicleID, status, p)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.Paginated(w, http.StatusOK, records, meta)
}

func (h *Handler) CreateRecord(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req CreateRecordRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	rec, err := h.service.CreateRecord(r.Context(), tenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, rec)
}

func (h *Handler) CreateWorkOrder(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req CreateWorkOrderRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	wo, err := h.service.CreateWorkOrder(r.Context(), tenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "CREATE_WORK_ORDER_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, wo)
}

func (h *Handler) ListWorkOrders(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	orders, err := h.service.ListWorkOrders(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_WORK_ORDERS_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, orders)
}

func (h *Handler) CreateInspection(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req CreateInspectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	ins, err := h.service.CreateInspection(r.Context(), tenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INSPECTION_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, ins)
}

func (h *Handler) ListInspections(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var bookingID *uuid.UUID
	if bStr := r.URL.Query().Get("booking_id"); bStr != "" {
		if bid, err := uuid.Parse(bStr); err == nil {
			bookingID = &bid
		}
	}

	inspections, err := h.service.ListInspections(r.Context(), tenantID, bookingID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_INSPECTIONS_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, inspections)
}

func (h *Handler) CreateDamage(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req CreateDamageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	dmg, err := h.service.CreateDamageRecord(r.Context(), tenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "DAMAGE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, dmg)
}

func (h *Handler) ListDamages(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var vehicleID *uuid.UUID
	if vStr := r.URL.Query().Get("vehicle_id"); vStr != "" {
		if vid, err := uuid.Parse(vStr); err == nil {
			vehicleID = &vid
		}
	}

	damages, err := h.service.ListDamages(r.Context(), tenantID, vehicleID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_DAMAGES_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, damages)
}

func (h *Handler) ListPreventiveSchedules(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	schedules, err := h.service.ListPreventiveSchedules(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_SCHEDULES_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, schedules)
}

func (h *Handler) CompleteRecord(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	recID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid maintenance record ID")
		return
	}

	if err := h.service.CompleteRecord(r.Context(), tenantID, recID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "COMPLETE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{"status": "completed", "message": "Maintenance task marked as completed and vehicle restored to available fleet"})
}
