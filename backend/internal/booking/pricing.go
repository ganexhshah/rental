package booking

import (
	"context"
	"fmt"
	"math"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

const (
	StandardNepalVATRate = 0.13 // 13% Nepal VAT
)

type PricingEngine struct {
	pool *pgxpool.Pool
}

func NewPricingEngine(pool *pgxpool.Pool) *PricingEngine {
	return &PricingEngine{pool: pool}
}

type VehiclePricingInfo struct {
	DailyRate     float64
	WeeklyRate    float64
	MonthlyRate   float64
	DepositAmount float64
}

// CalculateRentalDays computes billing duration in full calendar days (minimum 1 day).
func CalculateRentalDays(start, end time.Time) int {
	duration := end.Sub(start)
	hours := duration.Hours()
	if hours <= 0 {
		return 1
	}
	days := int(math.Ceil(hours / 24.0))
	if days < 1 {
		days = 1
	}
	return days
}

// CalculateBaseRental computes base rental amount using tiered discounts (monthly > weekly > daily).
func CalculateBaseRental(info VehiclePricingInfo, days int) float64 {
	if days >= 30 && info.MonthlyRate > 0 {
		months := days / 30
		remDays := days % 30
		return float64(months)*info.MonthlyRate + float64(remDays)*info.DailyRate
	}

	if days >= 7 && info.WeeklyRate > 0 {
		weeks := days / 7
		remDays := days % 7
		return float64(weeks)*info.WeeklyRate + float64(remDays)*info.DailyRate
	}

	return float64(days) * info.DailyRate
}

func (pe *PricingEngine) CalculateQuote(
	ctx context.Context,
	tenantID uuid.UUID,
	vehicleID uuid.UUID,
	start, end time.Time,
	couponCode string,
	withInsurance bool,
	extras []Extra,
	deliveryFee, collectionFee, oneWayFee float64,
) (*PricingQuoteResponse, *PricingSnapshot, error) {
	if end.Before(start) || end.Equal(start) {
		return nil, nil, fmt.Errorf("end date must be after start date")
	}

	// Fetch vehicle pricing rates
	var vInfo VehiclePricingInfo
	var currency, currencySymbol string
	queryVehicle := `
		SELECT v.daily_rate, v.weekly_rate, v.monthly_rate, v.deposit_amount, t.currency, t.currency_symbol
		FROM vehicles v
		JOIN tenants t ON t.id = v.tenant_id
		WHERE v.id = $1 AND v.tenant_id = $2
	`
	err := pe.pool.QueryRow(ctx, queryVehicle, vehicleID, tenantID).Scan(
		&vInfo.DailyRate, &vInfo.WeeklyRate, &vInfo.MonthlyRate, &vInfo.DepositAmount,
		&currency, &currencySymbol,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil, fmt.Errorf("vehicle not found")
		}
		return nil, nil, err
	}

	days := CalculateRentalDays(start, end)
	rentalAmount := CalculateBaseRental(vInfo, days)

	var insuranceAmount float64
	if withInsurance {
		// Comprehensive rental insurance: 10% of rental amount or minimum Rs. 500 per day
		dailyIns := 500.0
		pctIns := rentalAmount * 0.10
		minIns := float64(days) * dailyIns
		if pctIns > minIns {
			insuranceAmount = math.Round(pctIns*100) / 100
		} else {
			insuranceAmount = minIns
		}
	}

	var itemExtrasTotal float64
	for _, ext := range extras {
		qty := ext.Quantity
		if qty < 1 {
			qty = 1
		}
		itemExtrasTotal += ext.Price * float64(qty)
	}

	extraCharges := itemExtrasTotal + deliveryFee + collectionFee + oneWayFee

	var discountAmount float64
	if couponCode != "" {
		discount, err := pe.evaluateCoupon(ctx, tenantID, couponCode, rentalAmount)
		if err == nil {
			discountAmount = discount
		}
	}

	netRental := rentalAmount - discountAmount
	if netRental < 0 {
		netRental = 0
	}

	// 13% VAT calculated on taxable base (net rental + insurance + extras)
	taxableBase := netRental + insuranceAmount + extraCharges
	taxAmount := math.Round(taxableBase*StandardNepalVATRate*100) / 100
	totalAmount := math.Round((taxableBase+taxAmount)*100) / 100

	if currency == "" {
		currency = "NPR"
	}
	if currencySymbol == "" {
		currencySymbol = "Rs."
	}

	snapshot := &PricingSnapshot{
		RentalDays:      days,
		BaseRentalRate:  vInfo.DailyRate,
		RentalAmount:    rentalAmount,
		InsuranceAmount: insuranceAmount,
		DiscountAmount:  discountAmount,
		CouponCode:      couponCode,
		DeliveryFee:     deliveryFee,
		CollectionFee:   collectionFee,
		OneWayFee:       oneWayFee,
		ExtraCharges:    extraCharges,
		Extras:          extras,
		TaxableBase:     taxableBase,
		TaxRate:         StandardNepalVATRate,
		TaxAmount:       taxAmount,
		DepositAmount:   vInfo.DepositAmount,
		TotalAmount:     totalAmount,
		Currency:        currency,
		CurrencySymbol:  currencySymbol,
		CalculatedAt:    time.Now(),
	}

	resp := &PricingQuoteResponse{
		RentalDays:      days,
		BaseRentalRate:  vInfo.DailyRate,
		RentalAmount:    rentalAmount,
		InsuranceAmount: insuranceAmount,
		DiscountAmount:  discountAmount,
		ExtraCharges:    extraCharges,
		TaxAmount:       taxAmount,
		DepositAmount:   vInfo.DepositAmount,
		TotalAmount:     totalAmount,
		Currency:        currency,
		CurrencySymbol:  currencySymbol,
	}

	return resp, snapshot, nil
}

func (pe *PricingEngine) evaluateCoupon(ctx context.Context, tenantID uuid.UUID, code string, rentalAmount float64) (float64, error) {
	var (
		discountType    string
		discountValue   float64
		minRentalAmount float64
		usageLimit      *int
		timesUsed       int
		validFrom       time.Time
		validUntil      time.Time
		isActive        bool
	)

	query := `
		SELECT discount_type, discount_value, COALESCE(min_rental_amount, 0), usage_limit, times_used, valid_from, valid_until, is_active
		FROM coupons
		WHERE tenant_id = $1 AND UPPER(code) = UPPER($2)
	`
	err := pe.pool.QueryRow(ctx, query, tenantID, code).Scan(
		&discountType, &discountValue, &minRentalAmount, &usageLimit, &timesUsed, &validFrom, &validUntil, &isActive,
	)
	if err != nil {
		return 0, err
	}

	now := time.Now()
	if !isActive || now.Before(validFrom) || now.After(validUntil) {
		return 0, fmt.Errorf("coupon is not valid or has expired")
	}

	if usageLimit != nil && timesUsed >= *usageLimit {
		return 0, fmt.Errorf("coupon usage limit exceeded")
	}

	if rentalAmount < minRentalAmount {
		return 0, fmt.Errorf("minimum rental amount of %v not met", minRentalAmount)
	}

	var discount float64
	if discountType == "percentage" {
		discount = rentalAmount * (discountValue / 100.0)
	} else {
		discount = discountValue
	}

	if discount > rentalAmount {
		discount = rentalAmount
	}

	return math.Round(discount*100) / 100, nil
}
