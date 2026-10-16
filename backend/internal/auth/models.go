package auth

import (
	"time"

	"github.com/google/uuid"
)

type RegisterRequest struct {
	CompanyName string `json:"company_name" validate:"required,min=2,max=100"`
	CompanySlug string `json:"company_slug" validate:"required,min=2,max=50,alphanumunicode"`
	FullName    string `json:"full_name" validate:"required,min=2,max=100"`
	Email       string `json:"email" validate:"required,email"`
	Password    string `json:"password" validate:"required,min=8"`
	Phone       string `json:"phone"`
	Currency    string `json:"currency"`
}

type LoginRequest struct {
	Email    string `json:"email" validate:"required,email"`
	Password string `json:"password" validate:"required"`
}

type RefreshTokenRequest struct {
	RefreshToken string `json:"refresh_token" validate:"required"`
}

type AuthResponse struct {
	User         UserDTO   `json:"user"`
	Tenant       TenantDTO `json:"tenant"`
	TokenPair    TokenPair `json:"tokens"`
}

type UserDTO struct {
	ID        uuid.UUID `json:"id"`
	Email     string    `json:"email"`
	FullName  string    `json:"full_name"`
	Phone     string    `json:"phone,omitempty"`
	Role      string    `json:"role"`
	Status    string    `json:"status"`
	AvatarURL string    `json:"avatar_url,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

type TenantDTO struct {
	ID             uuid.UUID `json:"id"`
	Name           string    `json:"name"`
	Slug           string    `json:"slug"`
	Currency       string    `json:"currency"`
	CurrencySymbol string    `json:"currency_symbol"`
	Timezone       string    `json:"timezone"`
	Plan           string    `json:"plan"`
	Status         string    `json:"status"`
}
