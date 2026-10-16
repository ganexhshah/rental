package booking

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
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Routes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()

	r.Use(authMiddleware)

	r.Get("/operations-summary", h.GetOperationsSummary)
	r.Post("/quote", h.GetPricingQuote)
	r.Get("/", h.List)
	r.Post("/", h.Create)
	r.Get("/{id}", h.GetByID)
	r.Patch("/{id}", h.Update)
	r.Post("/{id}/confirm", h.Confirm)
	r.Post("/{id}/cancel", h.Cancel)
	r.Post("/{id}/extend", h.Extend)
	r.Patch("/{id}/schedule", h.Schedule)
	r.Post("/{id}/pickup", h.Pickup)
	r.Post("/{id}/return", h.Return)
	r.Post("/{id}/status", h.ChangeStatus)
	r.Post("/{id}/no-show", h.NoShow)
	r.Post("/{id}/assign-vehicle", h.AssignVehicle)
	r.Post("/{id}/verify-eligibility", h.VerifyEligibility)
	r.Get("/{id}/checklists", h.GetChecklists)
	r.Get("/{id}/history", h.GetStatusHistory)

	return r
}

func (h *Handler) CalendarRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)
	r.Get("/", h.GetCalendar)
	return r
}

func (h *Handler) PickupRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)
	r.Post("/", h.PickupDirect)
	return r
}

func (h *Handler) ReturnRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)
	r.Post("/", h.ReturnDirect)
	return r
}

func (h *Handler) RentalRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)
	r.Get("/active", h.ListActiveRentals)
	return r
}

func (h *Handler) AvailabilityRoutes(authMiddleware func(http.Handler) http.Handler) chi.Router {
	r := chi.NewRouter()
	r.Use(authMiddleware)
	r.Get("/", h.CheckAvailability)
	return r
}

func (h *Handler) GetOperationsSummary(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	summary, err := h.service.GetOperationsSummary(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "SUMMARY_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, summary)
}

func (h *Handler) GetPricingQuote(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req PricingQuoteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	quote, err := h.service.GetPricingQuote(r.Context(), tenantID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "QUOTE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, quote)
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var customerID *uuid.UUID
	if cid := r.URL.Query().Get("customer_id"); cid != "" {
		if id, err := uuid.Parse(cid); err == nil {
			customerID = &id
		}
	}

	var vehicleID *uuid.UUID
	if vid := r.URL.Query().Get("vehicle_id"); vid != "" {
		if id, err := uuid.Parse(vid); err == nil {
			vehicleID = &id
		}
	}

	status := r.URL.Query().Get("status")
	paymentStatus := r.URL.Query().Get("payment_status")
	p := pagination.FromRequest(r)

	bookings, meta, err := h.service.ListBookings(r.Context(), tenantID, customerID, vehicleID, status, paymentStatus, p)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "LIST_FAILED", err.Error())
		return
	}

	httpx.Paginated(w, http.StatusOK, bookings, meta)
}

func (h *Handler) Create(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var req CreateBookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	booking, err := h.service.CreateBooking(r.Context(), tenantID, req)
	if err != nil {
		if errors.Is(err, ErrVehicleAlreadyBooked) {
			httpx.Error(w, http.StatusConflict, "VEHICLE_ALREADY_BOOKED", "Vehicle is already booked or reserved for the selected date range. Please select another vehicle or choose different dates.")
			return
		}
		httpx.Error(w, http.StatusBadRequest, "CREATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusCreated, booking)
}

func (h *Handler) GetByID(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	booking, err := h.service.GetBooking(r.Context(), tenantID, bookingID)
	if err != nil {
		if err == ErrBookingNotFound {
			httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "booking not found")
			return
		}
		httpx.Error(w, http.StatusInternalServerError, "GET_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, booking)
}

func (h *Handler) Confirm(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	b, err := h.service.ConfirmBooking(r.Context(), tenantID, bookingID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "CONFIRM_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, b)
}

func (h *Handler) Cancel(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	var req CancelBookingRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	if err := h.service.CancelBooking(r.Context(), tenantID, bookingID, req.Reason, req.Fee, "staff"); err != nil {
		httpx.Error(w, http.StatusBadRequest, "CANCEL_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "booking cancelled successfully"})
}

func (h *Handler) NoShow(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	var req NoShowRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	if err := h.service.NoShowBooking(r.Context(), tenantID, bookingID, req.Reason, req.Fee); err != nil {
		httpx.Error(w, http.StatusBadRequest, "NO_SHOW_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, map[string]string{"message": "booking marked as no-show"})
}

func (h *Handler) ChangeStatus(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	var req ChangeStatusRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid status request body")
		return
	}

	b, err := h.service.ChangeStatus(r.Context(), tenantID, bookingID, req.Status, "staff", req.Reason)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "STATUS_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, b)
}

func (h *Handler) AssignVehicle(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	var req AssignVehicleRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	b, err := h.service.AssignVehicle(r.Context(), tenantID, bookingID, req.NewVehicleID, req.Reason, "staff")
	if err != nil {
		if errors.Is(err, ErrVehicleAlreadyBooked) {
			httpx.Error(w, http.StatusConflict, "VEHICLE_ALREADY_BOOKED", "Cannot assign vehicle: selected target vehicle is already booked for this rental schedule.")
			return
		}
		httpx.Error(w, http.StatusBadRequest, "ASSIGN_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, b)
}

func (h *Handler) VerifyEligibility(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	booking, err := h.service.GetBooking(r.Context(), tenantID, bookingID)
	if err != nil {
		httpx.Error(w, http.StatusNotFound, "NOT_FOUND", "booking not found")
		return
	}

	elig, err := h.service.VerifyEligibility(r.Context(), tenantID, booking.CustomerID, booking.PrimaryDriverID)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "VERIFY_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, elig)
}

func (h *Handler) GetChecklists(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	checklists, err := h.service.GetChecklists(r.Context(), tenantID, bookingID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "CHECKLISTS_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, checklists)
}

func (h *Handler) GetStatusHistory(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	history, err := h.service.GetStatusHistory(r.Context(), tenantID, bookingID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "HISTORY_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, history)
}

func (h *Handler) Pickup(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	var req PickupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	userID, _ := auth.GetUserID(r.Context())
	checklist, err := h.service.PickupWorkflow(r.Context(), tenantID, bookingID, &userID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "PICKUP_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, checklist)
}

func (h *Handler) Return(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	var req ReturnRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	userID, _ := auth.GetUserID(r.Context())
	checklist, err := h.service.ReturnWorkflow(r.Context(), tenantID, bookingID, &userID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "RETURN_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, checklist)
}

type ExtendBookingRequest struct {
	NewEndDate time.Time `json:"new_end_date"`
}

func (h *Handler) Extend(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	var req ExtendBookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	b, err := h.service.ExtendBooking(r.Context(), tenantID, bookingID, req.NewEndDate)
	if err != nil {
		if errors.Is(err, ErrVehicleAlreadyBooked) {
			httpx.Error(w, http.StatusConflict, "VEHICLE_ALREADY_BOOKED", "Cannot extend rental: vehicle is already booked by another customer for the requested extension dates.")
			return
		}
		httpx.Error(w, http.StatusBadRequest, "EXTEND_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, b)
}

type ScheduleBookingRequest struct {
	NewStartDate time.Time `json:"new_start_date"`
	NewEndDate   time.Time `json:"new_end_date"`
}

func (h *Handler) Schedule(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	var req ScheduleBookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	b, err := h.service.ScheduleBooking(r.Context(), tenantID, bookingID, req.NewStartDate, req.NewEndDate)
	if err != nil {
		if errors.Is(err, ErrVehicleAlreadyBooked) {
			httpx.Error(w, http.StatusConflict, "VEHICLE_ALREADY_BOOKED", "Cannot reschedule booking: vehicle is already booked for the new dates.")
			return
		}
		httpx.Error(w, http.StatusBadRequest, "SCHEDULE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, b)
}

func (h *Handler) Update(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	idStr := chi.URLParam(r, "id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_ID", "invalid booking ID")
		return
	}

	var req UpdateBookingRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	b, err := h.service.UpdateBooking(r.Context(), tenantID, bookingID, req)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "UPDATE_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, b)
}

func (h *Handler) GetCalendar(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var start, end time.Time
	if s := r.URL.Query().Get("start"); s != "" {
		start, _ = time.Parse(time.RFC3339, s)
	}
	if e := r.URL.Query().Get("end"); e != "" {
		end, _ = time.Parse(time.RFC3339, e)
	}

	events, err := h.service.GetCalendarEvents(r.Context(), tenantID, start, end)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "CALENDAR_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, events)
}

type DirectPickupRequest struct {
	BookingID uuid.UUID `json:"booking_id"`
	PickupRequest
}

func (h *Handler) PickupDirect(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}
	userID, _ := auth.GetUserID(r.Context())

	var req DirectPickupRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	checklist, err := h.service.PickupWorkflow(r.Context(), tenantID, req.BookingID, &userID, req.PickupRequest)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "PICKUP_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, checklist)
}

type DirectReturnRequest struct {
	BookingID uuid.UUID `json:"booking_id"`
	ReturnRequest
}

func (h *Handler) ReturnDirect(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}
	userID, _ := auth.GetUserID(r.Context())

	var req DirectReturnRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httpx.Error(w, http.StatusBadRequest, "INVALID_REQUEST", "invalid request body")
		return
	}

	checklist, err := h.service.ReturnWorkflow(r.Context(), tenantID, req.BookingID, &userID, req.ReturnRequest)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "RETURN_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, checklist)
}

func (h *Handler) ListActiveRentals(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	list, err := h.service.ListActiveRentals(r.Context(), tenantID)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "RENTALS_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, list)
}

func (h *Handler) CheckAvailability(w http.ResponseWriter, r *http.Request) {
	tenantID, ok := auth.GetTenantID(r.Context())
	if !ok {
		httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "missing tenant context")
		return
	}

	var start, end time.Time
	if s := r.URL.Query().Get("start_date"); s != "" {
		if t, err := time.Parse(time.RFC3339, s); err == nil {
			start = t
		} else if t, err := time.Parse("2006-01-02", s); err == nil {
			start = t
		}
	}
	if e := r.URL.Query().Get("end_date"); e != "" {
		if t, err := time.Parse(time.RFC3339, e); err == nil {
			end = t
		} else if t, err := time.Parse("2006-01-02", e); err == nil {
			end = t
		}
	}

	var query string
	var args []any

	if !start.IsZero() && !end.IsZero() && end.After(start) {
		query = `
			SELECT v.id, v.make, v.model, v.year, v.plate_number, v.status, v.daily_rate, COALESCE(v.primary_image, '')
			FROM vehicles v
			WHERE v.tenant_id = $1
			  AND v.status NOT IN ('maintenance', 'out_of_service')
			  AND NOT EXISTS (
			      SELECT 1 FROM bookings b
			      WHERE b.vehicle_id = v.id
			        AND b.status IN ('confirmed', 'pickup_scheduled', 'pickup_in_progress', 'active', 'return_in_progress')
			        AND tstzrange(b.start_date, b.end_date) && tstzrange($2, $3)
			  )
			ORDER BY v.make, v.model ASC
		`
		args = []any{tenantID, start, end}
	} else {
		query = `
			SELECT id, make, model, year, plate_number, status, daily_rate, COALESCE(primary_image, '')
			FROM vehicles
			WHERE tenant_id = $1 AND status = 'available'
			ORDER BY make, model ASC
		`
		args = []any{tenantID}
	}

	rows, err := h.service.pool.Query(r.Context(), query, args...)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "AVAILABILITY_FAILED", err.Error())
		return
	}
	defer rows.Close()

	list := make([]map[string]any, 0)
	for rows.Next() {
		var id, make, model, plate, status, img string
		var year int
		var dailyRate float64
		if err := rows.Scan(&id, &make, &model, &year, &plate, &status, &dailyRate, &img); err == nil {
			list = append(list, map[string]any{
				"id":                id,
				"make":              make,
				"model":             model,
				"year":              year,
				"plate_number":      plate,
				"status":            status,
				"daily_rate":        dailyRate,
				"primary_image_url": img,
				"start_date":        start,
				"end_date":          end,
			})
		}
	}

	httpx.JSON(w, http.StatusOK, list)
}
