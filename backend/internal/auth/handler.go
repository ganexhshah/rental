package auth

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/rental/backend/pkg/httpx"
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

	r.Post("/register", h.Register)
	r.Post("/login", h.Login)
	r.Post("/refresh", h.RefreshToken)
	r.Post("/logout", h.Logout)

	r.Group(func(protected chi.Router) {
		protected.Use(RequireAuth(h.jwtSecret))
		protected.Get("/me", h.GetMe)
		protected.Patch("/profile", h.UpdateProfile)
		protected.Put("/profile", h.UpdateProfile)
	})

	return r
}

func (h *Handler) Register(w http.ResponseWriter, r *http.Request) {
	var req RegisterRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	if req.CompanyName == "" || req.CompanySlug == "" || req.Email == "" || req.Password == "" {
		httpx.ValidationError(w, map[string]string{
			"error": "company_name, company_slug, email, and password (min 8 chars) are required",
		})
		return
	}

	res, err := h.service.Register(r.Context(), req)
	if err != nil {
		if errors.Is(err, ErrEmailAlreadyTaken) {
			httpx.Error(w, http.StatusConflict, "EMAIL_EXISTS", "This email address is already registered")
			return
		}
		if errors.Is(err, ErrSlugAlreadyTaken) {
			httpx.Error(w, http.StatusConflict, "SLUG_EXISTS", "This company slug is already taken")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "REGISTRATION_FAILED", "Failed to register account")
		return
	}

	httpx.JSON(w, http.StatusCreated, res)
}

func (h *Handler) Login(w http.ResponseWriter, r *http.Request) {
	var req LoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	if req.Email == "" || req.Password == "" {
		httpx.ValidationError(w, map[string]string{
			"error": "email and password are required",
		})
		return
	}

	res, err := h.service.Login(r.Context(), req)
	if err != nil {
		if errors.Is(err, ErrUserNotFound) {
			httpx.Error(w, http.StatusUnauthorized, "INVALID_CREDENTIALS", "Invalid email or password")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "LOGIN_FAILED", "Failed to authenticate")
		return
	}

	httpx.JSON(w, http.StatusOK, res)
}

func (h *Handler) RefreshToken(w http.ResponseWriter, r *http.Request) {
	var req RefreshTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.RefreshToken == "" {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "refresh_token is required")
		return
	}

	tokens, err := h.service.RefreshToken(r.Context(), req.RefreshToken)
	if err != nil {
		httpx.Error(w, http.StatusUnauthorized, "INVALID_REFRESH_TOKEN", "Invalid or expired refresh token")
		return
	}

	httpx.JSON(w, http.StatusOK, tokens)
}

func (h *Handler) Logout(w http.ResponseWriter, r *http.Request) {
	// Stateless JWT logout (client discards tokens; can add Redis token blacklist if required)
	httpx.JSON(w, http.StatusOK, map[string]string{"message": "Logged out successfully"})
}

func (h *Handler) GetMe(w http.ResponseWriter, r *http.Request) {
	user, ok := FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	res, err := h.service.GetMe(r.Context(), user.UserID, user.TenantID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "USER_NOT_FOUND", "User profile not found")
		return
	}

	httpx.JSON(w, http.StatusOK, res)
}

func (h *Handler) UpdateProfile(w http.ResponseWriter, r *http.Request) {
	user, ok := FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req UpdateProfileRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse JSON body")
		return
	}

	updated, err := h.service.UpdateProfile(r.Context(), user.UserID, user.TenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "UPDATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, updated)
}
