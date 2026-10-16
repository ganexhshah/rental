package vehicle

import (
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rental/backend/internal/auth"
	"github.com/rental/backend/pkg/httpx"
	"github.com/rental/backend/pkg/pagination"
)

type Handler struct {
	service   *Service
	jwtSecret string
}

func NewHandler(service *Service, jwtSecret string) *Handler {
	return &Handler{service: service, jwtSecret: jwtSecret}
}

func (h *Handler) Routes() chi.Router {
	r := chi.NewRouter()
	r.Use(auth.RequireAuth(h.jwtSecret))

	// Locations
	r.Get("/locations", h.ListLocations)
	r.Post("/locations", h.CreateLocation)
	r.Patch("/locations/{id}", h.UpdateLocation)
	r.Put("/locations/{id}", h.UpdateLocation)
	r.Delete("/locations/{id}", h.DeleteLocation)

	// Categories
	r.Get("/categories", h.ListCategories)
	r.Post("/categories", h.CreateCategory)
	r.Patch("/categories/{id}", h.UpdateCategory)
	r.Put("/categories/{id}", h.UpdateCategory)
	r.Delete("/categories/{id}", h.DeleteCategory)

	// Vehicle Documents
	r.Get("/documents", h.ListAllDocuments)
	r.Get("/documents/summary", h.GetDocumentSummary)
	r.Post("/documents", h.CreateDocument)
	r.Get("/documents/{id}", h.GetDocument)
	r.Patch("/documents/{id}", h.UpdateDocument)
	r.Post("/documents/{id}/verify", h.VerifyDocument)
	r.Delete("/documents/{id}", h.DeleteDocument)

	// Vehicles
	r.Get("/", h.ListVehicles)
	r.Post("/", h.CreateVehicle)
	r.Get("/availability", h.CheckAvailability)
	r.Get("/{id}", h.GetVehicle)
	r.Patch("/{id}", h.UpdateVehicle)
	r.Delete("/{id}", h.DeleteVehicle)
	r.Post("/{id}/status", h.UpdateStatus)
	r.Get("/{id}/damage", h.GetDamage)
	r.Get("/{id}/documents", h.ListVehicleDocuments)
	r.Post("/{id}/documents", h.CreateVehicleDocument)

	return r
}

func (h *Handler) DocumentRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)

	r.Get("/", h.ListAllDocuments)
	r.Get("/summary", h.GetDocumentSummary)
	r.Post("/", h.CreateDocument)
	r.Get("/{id}", h.GetDocument)
	r.Patch("/{id}", h.UpdateDocument)
	r.Post("/{id}/verify", h.VerifyDocument)
	r.Delete("/{id}", h.DeleteDocument)

	return r
}

func (h *Handler) ListLocations(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	locations, err := h.service.ListLocations(r.Context(), user.TenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", "Failed to retrieve locations")
		return
	}

	httpx.JSON(w, http.StatusOK, locations)
}

func (h *Handler) CreateLocation(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateLocationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	created, err := h.service.CreateLocation(r.Context(), user.TenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "CREATE_FAILED", "Failed to create location")
		return
	}

	httpx.JSON(w, http.StatusCreated, created)
}

func (h *Handler) DeleteLocation(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	locationID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid location ID format")
		return
	}

	if err := h.service.DeleteLocation(r.Context(), user.TenantID, locationID); err != nil {
		httpx.Error(w, http.StatusBadRequest, "DELETE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (h *Handler) UpdateLocation(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	locationID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid location ID format")
		return
	}

	var req UpdateLocationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	updated, err := h.service.UpdateLocation(r.Context(), user.TenantID, locationID, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, updated)
}

func (h *Handler) ListCategories(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	categories, err := h.service.ListCategories(r.Context(), user.TenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", "Failed to retrieve vehicle categories")
		return
	}

	httpx.JSON(w, http.StatusOK, categories)
}

func (h *Handler) CreateCategory(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	created, err := h.service.CreateCategory(r.Context(), user.TenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "CREATE_FAILED", "Failed to create category")
		return
	}

	httpx.JSON(w, http.StatusCreated, created)
}

func (h *Handler) UpdateCategory(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid category ID")
		return
	}

	var req UpdateCategoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	updated, err := h.service.UpdateCategory(r.Context(), user.TenantID, id, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, updated)
}

func (h *Handler) DeleteCategory(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid category ID")
		return
	}

	if err := h.service.DeleteCategory(r.Context(), user.TenantID, id); err != nil {
		httpx.Error(w, http.StatusBadRequest, "DELETE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]bool{"success": true})
}

func (h *Handler) ListVehicles(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := pagination.FromRequest(r)
	status := r.URL.Query().Get("status")
	vehicleType := r.URL.Query().Get("vehicle_type")

	vehicles, meta, err := h.service.ListVehicles(r.Context(), user.TenantID, status, vehicleType, params)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", "Failed to retrieve vehicles")
		return
	}

	httpx.Paginated(w, http.StatusOK, vehicles, meta)
}

func (h *Handler) GetVehicle(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid vehicle ID format")
		return
	}

	v, err := h.service.GetVehicle(r.Context(), user.TenantID, id)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "Vehicle not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "GET_FAILED", "Failed to fetch vehicle")
		return
	}

	httpx.JSON(w, http.StatusOK, v)
}

func (h *Handler) CreateVehicle(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateVehicleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	created, err := h.service.CreateVehicle(r.Context(), user.TenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "CREATE_FAILED", "Failed to create vehicle")
		return
	}

	httpx.JSON(w, http.StatusCreated, created)
}

func (h *Handler) UpdateVehicle(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid vehicle ID format")
		return
	}

	var req UpdateVehicleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	updated, err := h.service.UpdateVehicle(r.Context(), user.TenantID, id, req)
	if err != nil {
		if errors.Is(err, ErrNotFound) {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "Vehicle not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "UPDATE_FAILED", "Failed to update vehicle")
		return
	}

	httpx.JSON(w, http.StatusOK, updated)
}

func (h *Handler) DeleteVehicle(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid vehicle ID format")
		return
	}

	if err := h.service.DeleteVehicle(r.Context(), user.TenantID, id); err != nil {
		if errors.Is(err, ErrNotFound) {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "Vehicle not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "DELETE_FAILED", "Failed to delete vehicle")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "Vehicle deleted successfully"})
}

func (h *Handler) CheckAvailability(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	startStr := r.URL.Query().Get("start_date")
	endStr := r.URL.Query().Get("end_date")

	start, err1 := time.Parse(time.RFC3339, startStr)
	end, err2 := time.Parse(time.RFC3339, endStr)
	if err1 != nil || err2 != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_DATES", "start_date and end_date must be RFC3339 formatted timestamps")
		return
	}

	available, err := h.service.CheckAvailability(r.Context(), user.TenantID, AvailabilityQuery{
		StartDate: start,
		EndDate:   end,
	})
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "AVAILABILITY_ERROR", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, available)
}

type UpdateVehicleStatusRequest struct {
	Status string `json:"status"`
}

func (h *Handler) UpdateStatus(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	vehicleID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid vehicle ID")
		return
	}

	var req UpdateVehicleStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request JSON")
		return
	}

	v, err := h.service.UpdateStatus(r.Context(), user.TenantID, vehicleID, req.Status)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "UPDATE_STATUS_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, v)
}

func (h *Handler) GetDamage(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	vehicleID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid vehicle ID")
		return
	}

	damages, err := h.service.GetVehicleDamage(r.Context(), user.TenantID, vehicleID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "DAMAGE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, damages)
}

// --- Document Management Subsystem Handlers ---

func (h *Handler) ListAllDocuments(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	q := r.URL.Query()
	status := q.Get("status")
	verificationStatus := q.Get("verification_status")
	docType := q.Get("doc_type")
	search := q.Get("search")

	var vehicleID *uuid.UUID
	if vStr := q.Get("vehicle_id"); vStr != "" {
		if vID, err := uuid.Parse(vStr); err == nil {
			vehicleID = &vID
		}
	}

	docs, err := h.service.ListDocuments(r.Context(), user.TenantID, vehicleID, status, verificationStatus, docType, search)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, docs)
}

func (h *Handler) GetDocumentSummary(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	summary, err := h.service.GetDocumentSummary(r.Context(), user.TenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "SUMMARY_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, summary)
}

func (h *Handler) CreateDocument(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}

	doc, err := h.service.CreateDocument(r.Context(), user.TenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, doc)
}

func (h *Handler) GetDocument(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	docID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid document ID")
		return
	}

	doc, err := h.service.GetDocument(r.Context(), user.TenantID, docID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "Document not found")
		return
	}

	httpx.JSON(w, http.StatusOK, doc)
}

func (h *Handler) UpdateDocument(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	docID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid document ID")
		return
	}

	var req UpdateDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}

	updated, err := h.service.UpdateDocument(r.Context(), user.TenantID, docID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "UPDATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, updated)
}

func (h *Handler) VerifyDocument(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	docID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid document ID")
		return
	}

	var req VerifyDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}

	verifierName := user.Email
	if user.Email == "" {
		verifierName = "Admin Staff"
	}

	verified, err := h.service.VerifyDocument(r.Context(), user.TenantID, docID, verifierName, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "VERIFY_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, verified)
}

func (h *Handler) DeleteDocument(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	docID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid document ID")
		return
	}

	if err := h.service.DeleteDocument(r.Context(), user.TenantID, docID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "Document archived successfully"})
}

func (h *Handler) ListVehicleDocuments(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	vehicleID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid vehicle ID")
		return
	}

	docs, err := h.service.ListDocuments(r.Context(), user.TenantID, &vehicleID, "", "", "", "")
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, docs)
}

func (h *Handler) CreateVehicleDocument(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	idStr := chi.URLParam(r, "id")
	vehicleID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid vehicle ID")
		return
	}

	var req CreateDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}
	req.VehicleID = vehicleID

	doc, err := h.service.CreateDocument(r.Context(), user.TenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, doc)
}

