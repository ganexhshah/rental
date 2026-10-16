package tenant

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/rental/backend/internal/auth"
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
	r.Use(auth.RequireAuth(h.jwtSecret))

	r.Get("/current", h.GetCurrentTenant)
	r.Group(func(adminOnly chi.Router) {
		adminOnly.Use(auth.RequireRole("admin"))
		adminOnly.Patch("/current", h.UpdateCurrentTenant)
	})

	return r
}

func (h *Handler) SettingsRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)

	r.Get("/", h.GetAllSettings)
	r.Get("/company", h.GetCompanySettings)
	r.Patch("/company", h.UpdateCompanySettings)
	r.Put("/company", h.UpdateCompanySettings)

	r.Get("/{section}", h.GetSectionSettings)
	r.Patch("/{section}", h.UpdateSectionSettings)
	r.Put("/{section}", h.UpdateSectionSettings)

	return r
}

func (h *Handler) GetAllSettings(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	t, err := h.service.GetCurrentTenant(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "TENANT_NOT_FOUND", "Tenant not found")
		return
	}

	var settingsMap map[string]any
	if len(t.Settings) > 0 {
		_ = json.Unmarshal(t.Settings, &settingsMap)
	}
	if settingsMap == nil {
		settingsMap = make(map[string]any)
	}

	companyMap, _ := settingsMap["company"].(map[string]any)
	if companyMap == nil {
		companyMap = make(map[string]any)
	}
	companyMap["name"] = t.Name
	companyMap["slug"] = t.Slug
	companyMap["currency"] = t.Currency
	companyMap["currency_symbol"] = t.CurrencySymbol
	companyMap["timezone"] = t.Timezone
	companyMap["plan"] = t.Plan
	if logo := t.GetLogoURL(); logo != "" {
		companyMap["logoUrl"] = logo
		companyMap["logo_url"] = logo
	}
	settingsMap["company"] = companyMap

	brandingMap, _ := settingsMap["branding"].(map[string]any)
	if brandingMap == nil {
		brandingMap = make(map[string]any)
	}
	if brandingMap["companyName"] == nil || brandingMap["companyName"] == "" {
		brandingMap["companyName"] = t.Name
	}
	if logo := t.GetLogoURL(); logo != "" {
		brandingMap["logoUrl"] = logo
		brandingMap["logo_url"] = logo
	}
	settingsMap["branding"] = brandingMap

	httpx.JSON(w, http.StatusOK, settingsMap)
}

func (h *Handler) GetCompanySettings(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	t, err := h.service.GetCurrentTenant(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "TENANT_NOT_FOUND", "Tenant not found")
		return
	}

	sec, _ := h.service.GetSettingsSection(r.Context(), tenantID, "company")
	if sec == nil {
		sec = make(map[string]any)
	}
	sec["name"] = t.Name
	sec["slug"] = t.Slug
	sec["currency"] = t.Currency
	sec["currency_symbol"] = t.CurrencySymbol
	sec["timezone"] = t.Timezone
	sec["plan"] = t.Plan

	httpx.JSON(w, http.StatusOK, sec)
}

func (h *Handler) UpdateCompanySettings(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	var req UpdateTenantRequest
	if nameVal, ok := body["name"].(string); ok && nameVal != "" {
		req.Name = &nameVal
	}
	if currVal, ok := body["currency"].(string); ok && currVal != "" {
		req.Currency = &currVal
	}
	if symVal, ok := body["currency_symbol"].(string); ok && symVal != "" {
		req.CurrencySymbol = &symVal
	}
	if tzVal, ok := body["timezone"].(string); ok && tzVal != "" {
		req.Timezone = &tzVal
	}

	if req.Name != nil || req.Currency != nil || req.CurrencySymbol != nil || req.Timezone != nil {
		if _, err := h.service.UpdateCurrentTenant(r.Context(), tenantID, req); err != nil {
			httpx.Error(w, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
			return
		}
	}

	updatedSec, err := h.service.UpdateSettingsSection(r.Context(), tenantID, "company", body)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, updatedSec)
}

func (h *Handler) GetSectionSettings(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	section := chi.URLParam(r, "section")
	sec, err := h.service.GetSettingsSection(r.Context(), tenantID, section)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "GET_FAILED", err.Error())
		return
	}
	if sec == nil {
		sec = make(map[string]any)
	}

	t, _ := h.service.GetCurrentTenant(r.Context(), tenantID)
	if t != nil {
		if section == "company" {
			sec["name"] = t.Name
			sec["slug"] = t.Slug
			sec["currency"] = t.Currency
			sec["currency_symbol"] = t.CurrencySymbol
			sec["timezone"] = t.Timezone
			sec["plan"] = t.Plan
			if logo := t.GetLogoURL(); logo != "" {
				sec["logoUrl"] = logo
				sec["logo_url"] = logo
			}
		} else if section == "branding" {
			if sec["companyName"] == nil || sec["companyName"] == "" {
				sec["companyName"] = t.Name
			}
			if logo := t.GetLogoURL(); logo != "" {
				sec["logoUrl"] = logo
				sec["logo_url"] = logo
			}
		} else if section == "pricing" {
			if sec["currencyCode"] == nil || sec["currencyCode"] == "" {
				sec["currencyCode"] = t.Currency
			}
			if sec["currencySymbol"] == nil || sec["currencySymbol"] == "" {
				sec["currencySymbol"] = t.CurrencySymbol
			}
		}
	}

	httpx.JSON(w, http.StatusOK, sec)
}

func (h *Handler) UpdateSectionSettings(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	section := chi.URLParam(r, "section")
	var body map[string]any
	if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	updated, err := h.service.UpdateSettingsSection(r.Context(), tenantID, section, body)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "UPDATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, updated)
}

func (h *Handler) GetCurrentTenant(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	t, err := h.service.GetCurrentTenant(r.Context(), user.TenantID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "TENANT_NOT_FOUND", "Tenant not found")
		return
	}

	httpx.JSON(w, http.StatusOK, t)
}

func (h *Handler) UpdateCurrentTenant(w http.ResponseWriter, r *http.Request) {
	user, ok := auth.FromContext(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
		return
	}

	var req UpdateTenantRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", "Failed to parse request JSON")
		return
	}

	updated, err := h.service.UpdateCurrentTenant(r.Context(), user.TenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "UPDATE_FAILED", "Failed to update tenant settings")
		return
	}

	httpx.JSON(w, http.StatusOK, updated)
}
