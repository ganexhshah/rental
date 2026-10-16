package report

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/rental/backend/internal/auth"
	"github.com/rental/backend/pkg/httpx"
)

func parseDaysFromQuery(r *http.Request) int {
	rangeParam := r.URL.Query().Get("range")
	if rangeParam == "" {
		rangeParam = r.URL.Query().Get("timeRange")
	}
	if rangeParam == "" {
		rangeParam = r.URL.Query().Get("time_range")
	}

	switch rangeParam {
	case "30d", "30":
		return 30
	case "90d", "90":
		return 90
	case "ytd":
		now := time.Now()
		startOfYear := time.Date(now.Year(), 1, 1, 0, 0, 0, 0, now.Location())
		days := int(now.Sub(startOfYear).Hours()/24) + 1
		if days < 30 {
			days = 30
		}
		return days
	case "365d", "1y", "365":
		return 365
	}

	if daysStr := r.URL.Query().Get("days"); daysStr != "" {
		if d, err := strconv.Atoi(daysStr); err == nil && d > 0 {
			return d
		}
	}
	return 30
}

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Routes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)

	r.Get("/summary", h.DashboardSummary)
	r.Get("/revenue", h.RevenueChart)
	r.Get("/bookings", h.BookingsChart)
	r.Get("/category-revenue", h.CategoryRevenue)
	r.Get("/fleet-utilization", h.FleetUtilization)
	r.Get("/utilization", h.FleetUtilization)
	r.Get("/pnl", h.FinancialPnL)
	r.Get("/exports", h.ListExports)
	r.Post("/exports", h.CreateExport)
	r.Get("/report-exports", h.ListExports)
	r.Post("/report-exports", h.CreateExport)

	return r
}

func (h *Handler) DashboardRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)

	r.Get("/summary", h.DashboardSummary)
	r.Get("/revenue", h.RevenueChart)
	r.Get("/bookings", h.BookingsChart)
	r.Get("/category-revenue", h.CategoryRevenue)
	r.Get("/fleet-utilization", h.FleetUtilization)

	return r
}

func (h *Handler) RevenueChart(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	days := parseDaysFromQuery(r)
	data, err := h.service.GetRevenueTimeSeries(r.Context(), tenantID, days)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "REVENUE_CHART_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, data)
}

func (h *Handler) BookingsChart(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	days := parseDaysFromQuery(r)
	data, err := h.service.GetBookingsTimeSeries(r.Context(), tenantID, days)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "BOOKINGS_CHART_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, data)
}

func (h *Handler) DashboardSummary(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	days := parseDaysFromQuery(r)
	summary, err := h.service.GetDashboardSummaryWithDays(r.Context(), tenantID, days)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "SUMMARY_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, summary)
}

func (h *Handler) FinancialPnL(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	basis := r.URL.Query().Get("basis")
	if basis == "" {
		basis = "accrual"
	}

	pnl, err := h.service.GetFinancialPnL(r.Context(), tenantID, basis)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "PNL_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, pnl)
}

func (h *Handler) FleetUtilization(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	utilization, err := h.service.GetFleetUtilization(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "UTILIZATION_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, utilization)
}

func (h *Handler) CategoryRevenue(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	days := parseDaysFromQuery(r)
	data, err := h.service.GetCategoryRevenueWithDays(r.Context(), tenantID, days)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "CATEGORY_REVENUE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, data)
}

func (h *Handler) CreateExport(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req CreateExportRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	email, _ := auth.GetUserEmail(r.Context())
	exp, err := h.service.CreateReportExport(r.Context(), tenantID, email, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "EXPORT_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, exp)
}

func (h *Handler) ListExports(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	exports, err := h.service.ListExports(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_EXPORTS_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, exports)
}
