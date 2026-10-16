package integration

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

	r.Get("/", h.List)
	r.Post("/", h.Save)
	r.Post("/{provider}/test", h.Test)
	r.Get("/events", h.ListEvents)

	return r
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	conns, err := h.service.ListConnections(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, conns)
}

func (h *Handler) Save(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req SaveConnectionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	conn, err := h.service.SaveConnection(r.Context(), tenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "SAVE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, conn)
}

func (h *Handler) Test(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	provider := chi.URLParam(r, "provider")
	resp, err := h.service.TestConnection(r.Context(), tenantID, provider)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "TEST_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, resp)
}

func (h *Handler) ListEvents(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	events, err := h.service.ListEvents(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, events)
}
