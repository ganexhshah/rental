package notification

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
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
	r.Post("/", h.Send)
	r.Put("/{id}/read", h.MarkRead)
	r.Patch("/{id}/read", h.MarkRead)
	r.Get("/templates", h.ListTemplates)
	r.Post("/templates", h.CreateTemplate)
	r.Get("/deliveries", h.ListDeliveries)
	r.Get("/automation-rules", h.ListAutomationRules)

	return r
}

func (h *Handler) TemplateRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)
	r.Get("/", h.ListTemplates)
	r.Post("/", h.CreateTemplate)
	return r
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

func (h *Handler) ListDeliveries(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	deliveries, _ := h.service.ListDeliveries(r.Context(), tenantID)
	httpx.JSON(w, http.StatusOK, deliveries)
}

func (h *Handler) ListAutomationRules(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	rules, _ := h.service.ListAutomationRules(r.Context(), tenantID)
	httpx.JSON(w, http.StatusOK, rules)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing user context")
		return
	}

	unreadOnly := r.URL.Query().Get("unread") == "true"
	list, err := h.service.ListUserNotifications(r.Context(), tenantID, userID, unreadOnly)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, list)
}

func (h *Handler) Send(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req SendNotificationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	notif, err := h.service.SendNotification(r.Context(), tenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "SEND_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, notif)
}

func (h *Handler) MarkRead(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}
	userID, ok := auth.GetUserID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing user context")
		return
	}

	idStr := chi.URLParam(r, "id")
	notifID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid notification ID")
		return
	}

	if err := h.service.MarkAsRead(r.Context(), tenantID, userID, notifID); err != nil {
		httpx.Error(w, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "notification marked as read"})
}
