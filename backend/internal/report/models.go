package report

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type DashboardSummary struct {
	TotalVehicles       int     `json:"total_vehicles"`
	AvailableVehicles   int     `json:"available_vehicles"`
	RentedVehicles      int     `json:"rented_vehicles"`
	MaintenanceVehicles int     `json:"maintenance_vehicles"`
	UtilizationRate     float64 `json:"utilization_rate"` // percentage
	ActiveBookings      int     `json:"active_bookings"`
	TotalBookings       int     `json:"total_bookings"`
	TotalRevenue        float64 `json:"total_revenue"`
	TodayRevenue        float64 `json:"today_revenue"`
	TodayBookings       int     `json:"today_bookings"`
	PendingPayments     int     `json:"pending_payments"`
	TotalExpenses       float64 `json:"total_expenses"`
	NetProfit           float64 `json:"net_profit"`
	OutstandingBalance  float64 `json:"outstanding_balance"`
	Currency            string  `json:"currency"`
	CurrencySymbol      string  `json:"currency_symbol"`
}

type FinancialPnL struct {
	TotalRevenue       float64            `json:"total_revenue"`
	RentalRevenue      float64            `json:"rental_revenue"`
	ExtraRevenue       float64            `json:"extra_revenue"`
	TotalExpenses      float64            `json:"total_expenses"`
	ExpensesByCategory map[string]float64 `json:"expenses_by_category"`
	NetProfit          float64            `json:"net_profit"`
	Currency           string             `json:"currency"`
	AccountingBasis    string             `json:"accounting_basis"` // accrual, cash
}

type FleetUtilizationItem struct {
	VehicleID       string  `json:"vehicle_id"`
	PlateNumber     string  `json:"plate_number"`
	MakeModel       string  `json:"make_model"`
	Status          string  `json:"status"`
	TotalBookings   int     `json:"total_bookings"`
	DaysRented      int     `json:"days_rented"`
	UtilizationRate float64 `json:"utilization_rate"`
	Revenue         float64 `json:"revenue"`
}

type TimeSeriesPoint struct {
	Date    string  `json:"date"`
	Amount  float64 `json:"amount"`
	Revenue float64 `json:"revenue"`
	Count   int     `json:"count,omitempty"`
}

type CategoryRevenueItem struct {
	Category string  `json:"category"`
	Revenue  float64 `json:"revenue"`
	Count    int     `json:"count"`
}

type ReportExport struct {
	ID              uuid.UUID       `json:"id"`
	TenantID        uuid.UUID       `json:"tenant_id"`
	ReportType      string          `json:"report_type"`      // revenue, pnl, fleet_utilization, customer_performance, expenses
	ExportFormat    string          `json:"export_format"`    // csv, pdf
	AccountingBasis string          `json:"accounting_basis"` // accrual, cash
	Status          string          `json:"status"`           // pending, processing, completed, failed
	FilterParams    json.RawMessage `json:"filter_params"`
	FileURL         string          `json:"file_url,omitempty"`
	StorageKey      string          `json:"storage_key,omitempty"`
	FileSizeBytes   int64           `json:"file_size_bytes"`
	RequestedBy     string          `json:"requested_by"`
	CompletedAt     *time.Time      `json:"completed_at,omitempty"`
	CreatedAt       time.Time       `json:"created_at"`
}

type CreateExportRequest struct {
	ReportType      string    `json:"report_type" validate:"required,oneof=revenue pnl fleet_utilization customer_performance expenses"`
	ExportFormat    string    `json:"export_format" validate:"required,oneof=csv pdf"`
	AccountingBasis string    `json:"accounting_basis"` // accrual, cash
	StartDate       time.Time `json:"start_date"`
	EndDate         time.Time `json:"end_date"`
}
