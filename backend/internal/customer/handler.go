package customer

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

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

	// Customer summary & list
	r.Get("/summary", h.GetCustomerSummary)
	r.Get("/drivers", h.ListAllDrivers)
	r.Get("/", h.ListCustomers)
	r.Post("/", h.CreateCustomer)

	// Single customer actions
	r.Get("/{id}", h.GetCustomer)
	r.Patch("/{id}", h.UpdateCustomer)
	r.Post("/{id}/verify", h.VerifyCustomer)
	r.Post("/{id}/blacklist", h.BlacklistCustomer)
	r.Post("/{id}/unblacklist", h.UnblacklistCustomer)

	// Customer Documents
	r.Get("/{id}/documents", h.ListCustomerDocuments)
	r.Post("/{id}/documents", h.CreateCustomerDocumentForCustomer)

	// Customer Drivers
	r.Get("/{id}/drivers", h.ListDrivers)
	r.Post("/{id}/drivers", h.CreateDriver)
	r.Delete("/{id}/drivers/{driverId}", h.DeleteDriver)

	return r
}

func (h *Handler) DocumentRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)

	r.Get("/", h.ListAllCustomerDocuments)
	r.Get("/summary", h.GetCustomerDocumentSummary)
	r.Post("/", h.CreateCustomerDocument)
	r.Get("/{id}", h.GetCustomerDocument)
	r.Post("/{id}/verify", h.VerifyCustomerDocument)
	r.Delete("/{id}", h.DeleteCustomerDocument)

	return r
}

// --- Customer Handlers ---

func (h *Handler) GetCustomerSummary(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.service.GetCustomerSummary(r.Context(), user.TenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "STATS_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, stats)
}

func (h *Handler) ListCustomers(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := pagination.FromRequest(r)
	verificationStatus := r.URL.Query().Get("verification_status")
	customerType := r.URL.Query().Get("customer_type")
	status := r.URL.Query().Get("status")

	var isBlacklisted *bool
	if blStr := r.URL.Query().Get("is_blacklisted"); blStr != "" {
		if blVal, err := strconv.ParseBool(blStr); err == nil {
			isBlacklisted = &blVal
		}
	}

	customers, meta, err := h.service.ListCustomers(r.Context(), user.TenantID, verificationStatus, customerType, status, isBlacklisted, params)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", "Failed to retrieve customers")
		return
	}

	httpx.Paginated(w, http.StatusOK, customers, meta)
}

func (h *Handler) CreateCustomer(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateCustomerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	if req.FullName == "" || req.Email == "" || req.Phone == "" {
		httpx.ValidationError(w, map[string]string{
			"error": "full_name, email, and phone are required",
		})
		return
	}

	created, err := h.service.CreateCustomer(r.Context(), user.TenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "CREATE_FAILED", "Failed to create customer: "+err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, created)
}

func (h *Handler) GetCustomer(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid customer ID format")
		return
	}

	found, err := h.service.GetCustomer(r.Context(), user.TenantID, id)
	if err != nil {
		if errors.Is(err, ErrCustomerNotFound) {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "Customer not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "GET_FAILED", "Failed to retrieve customer")
		return
	}

	httpx.JSON(w, http.StatusOK, found)
}

func (h *Handler) UpdateCustomer(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid customer ID format")
		return
	}

	var req UpdateCustomerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	updated, err := h.service.UpdateCustomer(r.Context(), user.TenantID, id, req)
	if err != nil {
		if errors.Is(err, ErrCustomerNotFound) {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "Customer not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "UPDATE_FAILED", "Failed to update customer: "+err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, updated)
}

func (h *Handler) VerifyCustomer(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid customer ID format")
		return
	}

	var req VerifyCustomerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	updated, err := h.service.VerifyCustomer(r.Context(), user.TenantID, id, req)
	if err != nil {
		if errors.Is(err, ErrCustomerNotFound) {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "Customer not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "VERIFY_FAILED", "Failed to update verification status")
		return
	}

	httpx.JSON(w, http.StatusOK, updated)
}

func (h *Handler) BlacklistCustomer(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid customer ID format")
		return
	}

	var req BlacklistCustomerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	if req.Reason == "" {
		req.Reason = "Flagged by fleet manager"
	}

	updated, err := h.service.BlacklistCustomer(r.Context(), user.TenantID, id, req.Reason, user.Email)
	if err != nil {
		if errors.Is(err, ErrCustomerNotFound) {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "Customer not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "BLACKLIST_FAILED", "Failed to blacklist customer")
		return
	}

	httpx.JSON(w, http.StatusOK, updated)
}

func (h *Handler) UnblacklistCustomer(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid customer ID format")
		return
	}

	updated, err := h.service.UnblacklistCustomer(r.Context(), user.TenantID, id, user.Email)
	if err != nil {
		if errors.Is(err, ErrCustomerNotFound) {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "Customer not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "UNBLACKLIST_FAILED", "Failed to unblacklist customer")
		return
	}

	httpx.JSON(w, http.StatusOK, updated)
}

// --- Customer Drivers Handlers ---

func (h *Handler) ListAllDrivers(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	drivers, err := h.service.ListAllDrivers(r.Context(), user.TenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, drivers)
}

func (h *Handler) ListDrivers(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	customerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid customer ID")
		return
	}

	drivers, err := h.service.ListDrivers(r.Context(), user.TenantID, customerID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, drivers)
}

func (h *Handler) CreateDriver(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	customerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid customer ID")
		return
	}

	var req CreateDriverRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}
	req.CustomerID = customerID

	created, err := h.service.CreateDriver(r.Context(), user.TenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "CREATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, created)
}

func (h *Handler) DeleteDriver(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	customerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid customer ID")
		return
	}

	driverID, err := uuid.Parse(chi.URLParam(r, "driverId"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_DRIVER_ID", "Invalid driver ID")
		return
	}

	if err := h.service.DeleteDriver(r.Context(), user.TenantID, customerID, driverID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "Driver removed successfully"})
}

// --- Customer Documents Handlers ---

func (h *Handler) ListCustomerDocuments(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	customerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid customer ID")
		return
	}

	docs, err := h.service.ListCustomerDocuments(r.Context(), user.TenantID, &customerID, nil, "", "", "", "")
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, docs)
}

func (h *Handler) CreateCustomerDocumentForCustomer(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	customerID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid customer ID")
		return
	}

	var req CreateCustomerDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}
	req.CustomerID = customerID

	created, err := h.service.CreateCustomerDocument(r.Context(), user.TenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "CREATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, created)
}

func (h *Handler) ListAllCustomerDocuments(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var customerID *uuid.UUID
	if cidStr := r.URL.Query().Get("customer_id"); cidStr != "" {
		if cid, err := uuid.Parse(cidStr); err == nil {
			customerID = &cid
		}
	}

	var driverID *uuid.UUID
	if didStr := r.URL.Query().Get("driver_id"); didStr != "" {
		if did, err := uuid.Parse(didStr); err == nil {
			driverID = &did
		}
	}

	docType := r.URL.Query().Get("doc_type")
	status := r.URL.Query().Get("status")
	verificationStatus := r.URL.Query().Get("verification_status")
	search := r.URL.Query().Get("search")

	docs, err := h.service.ListCustomerDocuments(r.Context(), user.TenantID, customerID, driverID, docType, status, verificationStatus, search)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, docs)
}

func (h *Handler) GetCustomerDocumentSummary(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	stats, err := h.service.GetCustomerDocumentSummary(r.Context(), user.TenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "STATS_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, stats)
}

func (h *Handler) CreateCustomerDocument(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateCustomerDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}

	created, err := h.service.CreateCustomerDocument(r.Context(), user.TenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "CREATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, created)
}

func (h *Handler) GetCustomerDocument(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	docID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid document ID")
		return
	}

	doc, err := h.service.GetCustomerDocument(r.Context(), user.TenantID, docID)
	if err != nil {
		if errors.Is(err, ErrDocumentNotFound) {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "Customer document not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "GET_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, doc)
}

func (h *Handler) VerifyCustomerDocument(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	docID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid document ID")
		return
	}

	var req VerifyCustomerDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request body")
		return
	}

	verifierName := user.Email
	if verifierName == "" {
		verifierName = "Staff Auditor"
	}

	verified, err := h.service.VerifyCustomerDocument(r.Context(), user.TenantID, docID, verifierName, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "VERIFY_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, verified)
}

func (h *Handler) DeleteCustomerDocument(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	docID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid document ID")
		return
	}

	if err := h.service.DeleteCustomerDocument(r.Context(), user.TenantID, docID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "DELETE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "Customer document archived successfully"})
}
