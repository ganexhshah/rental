package onboarding

import (
	"encoding/json"
	"net/http"
	"strings"

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

	r.Get("/status", h.GetStatus)
	r.Post("/complete", h.CompleteOnboarding)
	r.Post("/upload-logo", h.UploadLogo)

	return r
}

func (h *Handler) DirectUploadRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()

	r.Use(authMiddleware)
	r.Post("/logo", h.UploadLogo)

	return r
}

// GetStatus returns the current onboarding state
func (h *Handler) GetStatus(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	status, err := h.service.GetStatus(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "STATUS_ERROR", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, status)
}

// CompleteOnboarding commits all wizard inputs
func (h *Handler) CompleteOnboarding(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req CompleteOnboardingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "Failed to parse JSON body: "+err.Error())
		return
	}

	if req.CompanyName == "" {
		httpx.Error(w, http.StatusBadRequest, "VALIDATION_FAILED", "Company name is required")
		return
	}

	if err := h.service.CompleteOnboarding(r.Context(), tenantID, req); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "ONBOARDING_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"message":   "Onboarding completed successfully! Your workspace is ready.",
		"completed": true,
	})
}

// UploadLogo accepts either multipart/form-data or a JSON Base64 data URI
func (h *Handler) UploadLogo(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	contentType := r.Header.Get("Content-Type")

	// 1. Handle JSON Base64 upload
	if strings.HasPrefix(contentType, "application/json") {
		var req Base64LogoRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Invalid request body: "+err.Error())
			return
		}

		if req.DataURI == "" {
			httpx.Error(w, http.StatusBadRequest, "MISSING_DATA", "data_uri field is required")
			return
		}

		resp, err := h.service.UploadBase64Logo(r.Context(), tenantID, req.DataURI, req.Filename)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "UPLOAD_FAILED", err.Error())
			return
		}

		httpx.JSON(w, http.StatusOK, resp)
		return
	}

	// 2. Handle Multipart Form File upload
	// 10MB max memory
	if err := r.ParseMultipartForm(10 << 20); err != nil {
		httpx.Error(w, http.StatusBadRequest, "PARSE_FAILED", "Failed to parse multipart form: "+err.Error())
		return
	}

	// Look for field "logo" or "file"
	file, header, err := r.FormFile("logo")
	if err != nil {
		file, header, err = r.FormFile("file")
	}

	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "FILE_NOT_FOUND", "Please provide a 'logo' or 'file' form field")
		return
	}
	defer file.Close()

	fileContentType := header.Header.Get("Content-Type")
	resp, err := h.service.UploadLogo(r.Context(), tenantID, header.Filename, file, fileContentType)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "UPLOAD_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, resp)
}

