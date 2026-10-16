package user

import (
	"encoding/json"
	"errors"
	"net/http"

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

	r.Get("/", h.ListUsers)
	r.Get("/roles", h.ListRoles)
	r.Get("/{id}", h.GetUser)

	r.Group(func(adminOnly chi.Router) {
		adminOnly.Use(auth.RequireRole("admin", "manager"))
		adminOnly.Post("/", h.CreateUser)
		adminOnly.Post("/invite", h.InviteStaff)
		adminOnly.Patch("/{id}", h.UpdateUser)
		adminOnly.Patch("/{id}/roles", h.UpdateUserRole)
		adminOnly.Delete("/{id}", h.DeleteUser)
	})

	return r
}

func (h *Handler) RoleRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)
	r.Get("/", h.ListRoles)
	r.Post("/", h.CreateRole)
	return r
}

func (h *Handler) AuditLogRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)
	r.Get("/", h.ListAuditLogs)
	return r
}


func (h *Handler) ListUsers(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	params := pagination.FromRequest(r)
	users, meta, err := h.service.ListUsers(r.Context(), user.TenantID, params)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", "Failed to retrieve users")
		return
	}

	httpx.Paginated(w, http.StatusOK, users, meta)
}

func (h *Handler) CreateUser(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req CreateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	if req.Email == "" || req.Password == "" || req.FullName == "" || req.Role == "" {
		httpx.ValidationError(w, map[string]string{
			"error": "email, password, full_name, and role are required",
		})
		return
	}

	created, err := h.service.CreateUser(r.Context(), user.TenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "CREATE_FAILED", "Failed to create user member")
		return
	}

	httpx.JSON(w, http.StatusCreated, created)
}

func (h *Handler) GetUser(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid user ID format")
		return
	}

	found, err := h.service.GetUser(r.Context(), user.TenantID, id)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "User not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "GET_FAILED", "Failed to fetch user")
		return
	}

	httpx.JSON(w, http.StatusOK, found)
}

func (h *Handler) UpdateUser(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid user ID format")
		return
	}

	var req UpdateUserRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	updated, err := h.service.UpdateUser(r.Context(), user.TenantID, id, req)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "User not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "UPDATE_FAILED", "Failed to update user")
		return
	}

	httpx.JSON(w, http.StatusOK, updated)
}

func (h *Handler) DeleteUser(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid user ID format")
		return
	}

	if err := h.service.DeleteUser(r.Context(), user.TenantID, id); err != nil {
		if errors.Is(err, ErrUserNotFound) {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "User not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "DELETE_FAILED", "Failed to delete user")
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "User deleted successfully"})
}

func (h *Handler) ListRoles(w http.ResponseWriter, r *http.Request) {
	roles, err := h.service.ListRoles(r.Context())
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", "Failed to list roles")
		return
	}
	httpx.JSON(w, http.StatusOK, roles)
}

type UpdateUserRoleRequest struct {
	Role  string   `json:"role"`
	Roles []string `json:"roles"`
}

func (h *Handler) UpdateUserRole(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	id, err := uuid.Parse(chi.URLParam(r, "id"))
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "Invalid user ID format")
		return
	}

	var req UpdateUserRoleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	roleToSet := req.Role
	if roleToSet == "" && len(req.Roles) > 0 {
		roleToSet = req.Roles[0]
	}
	if roleToSet == "" {
		roleToSet = "staff"
	}

	updated, err := h.service.UpdateUserRole(r.Context(), user.TenantID, id, roleToSet)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, updated)
}

func (h *Handler) CreateRole(w http.ResponseWriter, r *http.Request) {
	var req map[string]any
	_ = json.NewDecoder(r.Body).Decode(&req)
	httpx.JSON(w, http.StatusCreated, map[string]any{
		"id":          uuid.New(),
		"name":        req["name"],
		"description": req["description"],
		"permissions": req["permissions"],
	})
}

func (h *Handler) ListAuditLogs(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	logs, _ := h.service.ListAuditLogs(r.Context(), user.TenantID)
	httpx.JSON(w, http.StatusOK, logs)
}

func (h *Handler) InviteStaff(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req InviteStaffRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	inv, err := h.service.InviteStaff(r.Context(), user.TenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVITE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, inv)
}


