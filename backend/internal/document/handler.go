package document

import (
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"github.com/rental/backend/internal/auth"
	"github.com/rental/backend/pkg/httpx"
	"github.com/rental/backend/pkg/pagination"
	"github.com/rental/backend/pkg/storage"
)

type Handler struct {
	service *Service
	storage storage.ObjectStorage
}

func NewHandler(service *Service, store storage.ObjectStorage) *Handler {
	return &Handler{
		service: service,
		storage: store,
	}
}

func (h *Handler) Routes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()

	// Public/Signed file download route (secured by HMAC signed token)
	r.Get("/files/*", h.ServeProtectedFile)

	// Authenticated document management
	r.Group(func(authed chi.Router) {
		authed.Use(authMiddleware)

		authed.Get("/", h.List)
		authed.Get("/{id}", h.GetByID)
		authed.Get("/{id}/download", h.GetDownloadURL)
		authed.Get("/{id}/download-url", h.GetDownloadURL)
		authed.Get("/{id}/stream", h.StreamDocument)
		authed.Get("/{id}/view", h.StreamDocument)
	})

	return r
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	docType := r.URL.Query().Get("doc_type")
	entityType := r.URL.Query().Get("entity_type")
	p := pagination.FromRequest(r)

	docs, meta, err := h.service.ListDocuments(r.Context(), tenantID, docType, entityType, p)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.Paginated(w, http.StatusOK, docs, meta)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	docID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid document uuid")
		return
	}

	doc, err := h.service.GetDocument(r.Context(), tenantID, docID)
	if err != nil {
		if err == ErrDocumentNotFound {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "document not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "FETCH_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, doc)
}

func (h *Handler) GetDownloadURL(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	docID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid document uuid")
		return
	}

	ttl := 15 * time.Minute
	signedURL, err := h.service.GetSignedDownloadURL(r.Context(), tenantID, docID, ttl)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "SIGN_URL_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]any{
		"document_id": docID,
		"download_url": signedURL,
		"expires_in_seconds": int(ttl.Seconds()),
	})
}

func (h *Handler) StreamDocument(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	docID, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid document uuid")
		return
	}

	doc, err := h.service.GetDocument(r.Context(), tenantID, docID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "document not found")
		return
	}

	if doc.LatestVersion == nil || doc.LatestVersion.StorageKey == "" {
		httpx.Error(w, http.StatusNotFound, "FILE_NOT_FOUND", "no file rendered for this document")
		return
	}

	data, err := h.storage.Download(r.Context(), doc.LatestVersion.StorageKey)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "DOWNLOAD_FAILED", err.Error())
		return
	}

	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s.pdf\"", doc.DocumentNumber))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}

func (h *Handler) ServeProtectedFile(w http.ResponseWriter, r *http.Request) {
	key := chi.URLParam(r, "*")
	if key == "" {
		httpx.Error(w, http.StatusBadRequest, "MISSING_KEY", "missing file key")
		return
	}

	token := r.URL.Query().Get("token")
	expires := r.URL.Query().Get("expires")

	if token == "" || expires == "" {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing signature parameters")
		return
	}

	if !h.storage.VerifySignedURLToken(key, token, expires) {
		httpx.Error(w, http.StatusForbidden, "FORBIDDEN", "invalid or expired download token")
		return
	}

	data, err := h.storage.Download(r.Context(), key)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "file not found")
		return
	}

	filename := key[strings.LastIndex(key, "/")+1:]
	w.Header().Set("Content-Type", "application/pdf")
	w.Header().Set("Content-Disposition", fmt.Sprintf("inline; filename=\"%s\"", filename))
	w.Header().Set("Content-Length", fmt.Sprintf("%d", len(data)))
	w.WriteHeader(http.StatusOK)
	_, _ = w.Write(data)
}
