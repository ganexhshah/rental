package marketing

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var (
	ErrCouponNotFound = errors.New("coupon not found")
	ErrCouponExpired  = errors.New("coupon has expired or is inactive")
	ErrCouponLimit    = errors.New("coupon usage limit reached")
	ErrMinRentalNotMet= errors.New("minimum rental amount requirement not met")
)

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func (s *Service) CreateCoupon(ctx context.Context, tenantID uuid.UUID, req CreateCouponRequest) (*Coupon, error) {
	id := uuid.New()
	code := strings.ToUpper(strings.TrimSpace(req.Code))
	perCust := req.PerCustomerLimit
	if perCust <= 0 {
		perCust = 1
	}

	query := `
		INSERT INTO coupons (
			id, tenant_id, code, discount_type, discount_value, min_rental_amount,
			max_discount_amount, usage_limit, per_customer_limit, applicable_vehicle_category_id,
			valid_from, valid_until, is_active
		) VALUES (
			$1, $2, $3, $4, $5, $6,
			$7, $8, $9, $10,
			$11, $12, TRUE
		)
		RETURNING id, times_used, is_active, created_at
	`
	var c Coupon
	c.ID = id
	c.TenantID = tenantID
	c.Code = code
	c.DiscountType = req.DiscountType
	c.DiscountValue = req.DiscountValue
	c.MinRentalAmount = req.MinRentalAmount
	c.MaxDiscountAmount = req.MaxDiscountAmount
	c.UsageLimit = req.UsageLimit
	c.PerCustomerLimit = perCust
	c.ApplicableVehicleCategoryID = req.ApplicableVehicleCategoryID
	c.ValidFrom = req.ValidFrom
	c.ValidUntil = req.ValidUntil

	err := s.pool.QueryRow(
		ctx, query,
		id, tenantID, code, req.DiscountType, req.DiscountValue, req.MinRentalAmount,
		req.MaxDiscountAmount, req.UsageLimit, perCust, req.ApplicableVehicleCategoryID,
		req.ValidFrom, req.ValidUntil,
	).Scan(&c.ID, &c.TimesUsed, &c.IsActive, &c.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to create coupon: %w", err)
	}

	return &c, nil
}

func (s *Service) ListCoupons(ctx context.Context, tenantID uuid.UUID) ([]Coupon, error) {
	query := `
		SELECT id, tenant_id, code, discount_type, discount_value, min_rental_amount,
		       COALESCE(max_discount_amount, 0), usage_limit, COALESCE(per_customer_limit, 1),
		       times_used, applicable_vehicle_category_id, valid_from, valid_until, is_active, created_at
		FROM coupons
		WHERE tenant_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]Coupon, 0)
	for rows.Next() {
		var c Coupon
		if err := rows.Scan(
			&c.ID, &c.TenantID, &c.Code, &c.DiscountType, &c.DiscountValue, &c.MinRentalAmount,
			&c.MaxDiscountAmount, &c.UsageLimit, &c.PerCustomerLimit,
			&c.TimesUsed, &c.ApplicableVehicleCategoryID, &c.ValidFrom, &c.ValidUntil, &c.IsActive, &c.CreatedAt,
		); err == nil {
			list = append(list, c)
		}
	}
	return list, nil
}

func (s *Service) ValidateCoupon(ctx context.Context, tenantID uuid.UUID, req ValidateCouponRequest) (*ValidateCouponResponse, error) {
	code := strings.ToUpper(strings.TrimSpace(req.Code))
	query := `
		SELECT id, discount_type, discount_value, min_rental_amount, COALESCE(max_discount_amount, 0),
		       usage_limit, times_used, applicable_vehicle_category_id, valid_from, valid_until, is_active
		FROM coupons
		WHERE tenant_id = $1 AND code = $2
	`
	var (
		cID uuid.UUID
		discType string
		discVal, minRent, maxDisc float64
		usageLimit *int
		timesUsed int
		catID *uuid.UUID
		vFrom, vUntil time.Time
		isActive bool
	)

	err := s.pool.QueryRow(ctx, query, tenantID, code).Scan(
		&cID, &discType, &discVal, &minRent, &maxDisc,
		&usageLimit, &timesUsed, &catID, &vFrom, &vUntil, &isActive,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return &ValidateCouponResponse{Valid: false, Reason: "Invalid coupon code"}, nil
		}
		return nil, err
	}

	now := time.Now()
	if !isActive || now.Before(vFrom) || now.After(vUntil) {
		return &ValidateCouponResponse{Valid: false, Reason: "Coupon is expired or inactive"}, nil
	}

	if usageLimit != nil && timesUsed >= *usageLimit {
		return &ValidateCouponResponse{Valid: false, Reason: "Coupon usage limit reached"}, nil
	}

	if req.RentalAmount < minRent {
		return &ValidateCouponResponse{
			Valid:  false,
			Reason: fmt.Sprintf("Rental amount must be at least Rs. %.2f to use this coupon", minRent),
		}, nil
	}

	if catID != nil && req.VehicleCategoryID != nil && *catID != *req.VehicleCategoryID {
		return &ValidateCouponResponse{Valid: false, Reason: "Coupon is not applicable for this vehicle category"}, nil
	}

	discountAmount := CalculateDiscount(discType, discVal, req.RentalAmount, maxDisc)
	finalAmount := req.RentalAmount - discountAmount
	if finalAmount < 0 {
		finalAmount = 0
	}

	return &ValidateCouponResponse{
		Valid:          true,
		DiscountAmount: discountAmount,
		FinalAmount:    finalAmount,
	}, nil
}

// Campaigns
func (s *Service) CreateCampaign(ctx context.Context, tenantID uuid.UUID, req CreateCampaignRequest) (*Campaign, error) {
	id := uuid.New()
	query := `
		INSERT INTO marketing_campaigns (id, tenant_id, name, channel, budget, starts_at, ends_at, status)
		VALUES ($1, $2, $3, $4, $5, $6, $7, 'active')
		RETURNING id, created_at
	`
	var c Campaign
	c.ID = id
	c.TenantID = tenantID
	c.Name = req.Name
	c.Channel = req.Channel
	c.Budget = req.Budget
	c.StartsAt = req.StartsAt
	c.EndsAt = req.EndsAt
	c.Status = "active"

	err := s.pool.QueryRow(ctx, query, id, tenantID, req.Name, req.Channel, req.Budget, req.StartsAt, req.EndsAt).Scan(&c.ID, &c.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &c, nil
}

func (s *Service) ListCampaigns(ctx context.Context, tenantID uuid.UUID) ([]Campaign, error) {
	query := `
		SELECT id, tenant_id, name, channel, status, budget, revenue_attributed, starts_at, ends_at, created_at
		FROM marketing_campaigns
		WHERE tenant_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]Campaign, 0)
	for rows.Next() {
		var c Campaign
		if err := rows.Scan(&c.ID, &c.TenantID, &c.Name, &c.Channel, &c.Status, &c.Budget, &c.RevenueAttributed, &c.StartsAt, &c.EndsAt, &c.CreatedAt); err == nil {
			list = append(list, c)
		}
	}
	return list, nil
}

// Referrals
func (s *Service) CreateReferralCode(ctx context.Context, tenantID uuid.UUID, req CreateReferralRequest) (*ReferralCode, error) {
	code := req.Code
	if code == "" {
		b := make([]byte, 3)
		_, _ = rand.Read(b)
		code = fmt.Sprintf("REF-%s", strings.ToUpper(hex.EncodeToString(b)))
	}

	rewardType := req.RewardType
	if rewardType == "" {
		rewardType = "discount_percentage"
	}
	rewardAmount := req.RewardAmount
	if rewardAmount <= 0 {
		rewardAmount = 10.0
	}

	id := uuid.New()
	query := `
		INSERT INTO referral_codes (id, tenant_id, customer_id, code, reward_type, reward_amount, usage_count, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, 0, TRUE)
		RETURNING id, created_at
	`
	var ref ReferralCode
	ref.ID = id
	ref.TenantID = tenantID
	ref.CustomerID = req.CustomerID
	ref.Code = code
	ref.RewardType = rewardType
	ref.RewardAmount = rewardAmount
	ref.IsActive = true

	err := s.pool.QueryRow(ctx, query, id, tenantID, req.CustomerID, code, rewardType, rewardAmount).Scan(&ref.ID, &ref.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &ref, nil
}

func (s *Service) ListReferralCodes(ctx context.Context, tenantID uuid.UUID) ([]ReferralCode, error) {
	query := `
		SELECT id, tenant_id, customer_id, code, reward_type, reward_amount, usage_count, is_active, created_at
		FROM referral_codes
		WHERE tenant_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return []ReferralCode{}, nil
	}
	defer rows.Close()

	list := make([]ReferralCode, 0)
	for rows.Next() {
		var r ReferralCode
		if err := rows.Scan(&r.ID, &r.TenantID, &r.CustomerID, &r.Code, &r.RewardType, &r.RewardAmount, &r.UsageCount, &r.IsActive, &r.CreatedAt); err == nil {
			list = append(list, r)
		}
	}
	return list, nil
}

func CalculateDiscount(discountType string, discountValue, rentalAmount, maxDiscount float64) float64 {
	var discount float64
	if discountType == "percentage" {
		discount = (rentalAmount * discountValue) / 100.0
		if maxDiscount > 0 && discount > maxDiscount {
			discount = maxDiscount
		}
	} else {
		discount = discountValue
		if discount > rentalAmount {
			discount = rentalAmount
		}
	}
	if discount < 0 {
		return 0
	}
	return discount
}
