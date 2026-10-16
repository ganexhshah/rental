package auth

import (
	"context"
	"net/http"
	"strings"

	"github.com/google/uuid"
	"github.com/rental/backend/pkg/httpx"
	"github.com/rental/backend/pkg/logger"
)

type contextKey string

const (
	UserContextKey contextKey = "auth_user_context"
)

type ContextUser struct {
	UserID   uuid.UUID
	TenantID uuid.UUID
	Email    string
	Role     string
}

func FromContext(ctx context.Context) (*ContextUser, bool) {
	u, ok := ctx.Value(UserContextKey).(*ContextUser)
	return u, ok && u != nil
}

func GetTenantID(ctx context.Context) (uuid.UUID, bool) {
	u, ok := FromContext(ctx)
	if !ok {
		return uuid.Nil, false
	}
	return u.TenantID, true
}

func GetUserID(ctx context.Context) (uuid.UUID, bool) {
	u, ok := FromContext(ctx)
	if !ok {
		return uuid.Nil, false
	}
	return u.UserID, true
}

func GetUserEmail(ctx context.Context) (string, bool) {
	u, ok := FromContext(ctx)
	if !ok {
		return "", false
	}
	return u.Email, true
}

func RequireAuth(jwtSecret string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			authHeader := r.Header.Get("Authorization")
			if authHeader == "" {
				httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Missing authorization header")
				return
			}

			parts := strings.SplitN(authHeader, " ", 2)
			if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
				httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid authorization header format")
				return
			}

			claims, err := ValidateToken(parts[1], jwtSecret)
			if err != nil || claims.TokenType != "access" {
				httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Invalid or expired access token")
				return
			}

			userCtx := &ContextUser{
				UserID:   claims.UserID,
				TenantID: claims.TenantID,
				Email:    claims.Email,
				Role:     claims.Role,
			}

			// Add to standard logger context for auditability
			ctx := context.WithValue(r.Context(), UserContextKey, userCtx)
			ctx = context.WithValue(ctx, logger.UserIDKey, userCtx.UserID.String())
			ctx = context.WithValue(ctx, logger.TenantIDKey, userCtx.TenantID.String())

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func RequireRole(allowedRoles ...string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			user, ok := FromContext(r.Context())
			if !ok {
				httpx.Error(w, http.StatusUnauthorized, "UNAUTHORIZED", "Authentication required")
				return
			}

			for _, role := range allowedRoles {
				if strings.EqualFold(user.Role, role) {
					next.ServeHTTP(w, r)
					return
				}
			}

			httpx.Error(w, http.StatusForbidden, "FORBIDDEN", "Insufficient role privileges")
		})
	}
}
