package marketing

import (
	"time"

	"github.com/google/uuid"
)

type Coupon struct {
	ID                          uuid.UUID  `json:"id"`
	TenantID                    uuid.UUID  `json:"tenant_id"`
	Code                        string     `json:"code"`
	DiscountType                string     `json:"discount_type"` // percentage, fixed_amount
	DiscountValue               float64    `json:"discount_value"`
	MinRentalAmount             float64    `json:"min_rental_amount"`
	MaxDiscountAmount           float64    `json:"max_discount_amount"`
	UsageLimit                  *int       `json:"usage_limit,omitempty"`
	PerCustomerLimit            int        `json:"per_customer_limit"`
	TimesUsed                   int        `json:"times_used"`
	ApplicableVehicleCategoryID *uuid.UUID `json:"applicable_vehicle_category_id,omitempty"`
	ValidFrom                   time.Time  `json:"valid_from"`
	ValidUntil                  time.Time  `json:"valid_until"`
	IsActive                    bool       `json:"is_active"`
	CreatedAt                   time.Time  `json:"created_at"`
}

type CreateCouponRequest struct {
	Code                        string     `json:"code" validate:"required"`
	DiscountType                string     `json:"discount_type" validate:"required,oneof=percentage fixed_amount"`
	DiscountValue               float64    `json:"discount_value" validate:"required,gt=0"`
	MinRentalAmount             float64    `json:"min_rental_amount"`
	MaxDiscountAmount           float64    `json:"max_discount_amount"`
	UsageLimit                  *int       `json:"usage_limit"`
	PerCustomerLimit            int        `json:"per_customer_limit"`
	ApplicableVehicleCategoryID *uuid.UUID `json:"applicable_vehicle_category_id"`
	ValidFrom                   time.Time  `json:"valid_from" validate:"required"`
	ValidUntil                  time.Time  `json:"valid_until" validate:"required"`
}

type ValidateCouponRequest struct {
	Code              string     `json:"code" validate:"required"`
	RentalAmount      float64    `json:"rental_amount" validate:"required,gt=0"`
	VehicleCategoryID *uuid.UUID `json:"vehicle_category_id"`
	CustomerID        *uuid.UUID `json:"customer_id"`
}

type ValidateCouponResponse struct {
	Valid          bool    `json:"valid"`
	DiscountAmount float64 `json:"discount_amount"`
	FinalAmount    float64 `json:"final_amount"`
	Reason         string  `json:"reason,omitempty"`
}

type Campaign struct {
	ID                uuid.UUID  `json:"id"`
	TenantID          uuid.UUID  `json:"tenant_id"`
	Name              string     `json:"name"`
	Channel           string     `json:"channel"` // email, sms, social
	Status            string     `json:"status"`  // draft, active, completed
	Budget            float64    `json:"budget"`
	RevenueAttributed float64    `json:"revenue_attributed"`
	StartsAt          *time.Time `json:"starts_at,omitempty"`
	EndsAt            *time.Time `json:"ends_at,omitempty"`
	CreatedAt         time.Time  `json:"created_at"`
}

type CreateCampaignRequest struct {
	Name     string     `json:"name" validate:"required"`
	Channel  string     `json:"channel" validate:"required"`
	Budget   float64    `json:"budget"`
	StartsAt *time.Time `json:"starts_at"`
	EndsAt   *time.Time `json:"ends_at"`
}

type ReferralCode struct {
	ID           uuid.UUID  `json:"id"`
	TenantID     uuid.UUID  `json:"tenant_id"`
	CustomerID   *uuid.UUID `json:"customer_id,omitempty"`
	Code         string     `json:"code"`
	RewardType   string     `json:"reward_type"` // discount_percentage, fixed_reward
	RewardAmount float64    `json:"reward_amount"`
	UsageCount   int        `json:"usage_count"`
	IsActive     bool       `json:"is_active"`
	CreatedAt    time.Time  `json:"created_at"`
}

type CreateReferralRequest struct {
	CustomerID   *uuid.UUID `json:"customer_id"`
	Code         string     `json:"code"`
	RewardType   string     `json:"reward_type"`
	RewardAmount float64    `json:"reward_amount"`
}
