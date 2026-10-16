package config

import (
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"
)

type Config struct {
	Env                   string
	Port                  string
	DatabaseURL           string
	RedisURL              string
	JWTSecret             string
	JWTRefreshSecret      string
	JWTAccessTTL          time.Duration
	JWTRefreshTTL         time.Duration
	DefaultCurrency       string
	DefaultCurrencySymbol string
	Timezone              string
	AllowedOrigins        []string
	EsewaMerchantCode     string
	KhaltiSecretKey       string
	StripeSecretKey       string
	StripeWebhookSecret   string
}

func Load() (*Config, error) {
	cfg := &Config{
		Env:                   getEnv("ENV", "development"),
		Port:                  getEnv("PORT", "8080"),
		DatabaseURL:           getEnv("DATABASE_URL", "postgres://rental_admin:rental_secret_2026@localhost:5433/rental_saas_db?sslmode=disable"),
		RedisURL:              getEnv("REDIS_URL", "redis://localhost:6380/0"),
		JWTSecret:             getEnv("JWT_SECRET", "super-secure-rental-jwt-secret-key-32bytes-min"),
		JWTRefreshSecret:      getEnv("JWT_REFRESH_SECRET", "super-secure-rental-refresh-jwt-secret-key-min"),
		JWTAccessTTL:          time.Minute * time.Duration(getEnvInt("JWT_ACCESS_MINUTES", 60)),
		JWTRefreshTTL:         time.Hour * 24 * time.Duration(getEnvInt("JWT_REFRESH_DAYS", 7)),
		DefaultCurrency:       getEnv("DEFAULT_CURRENCY", "NPR"),
		DefaultCurrencySymbol: getEnv("DEFAULT_CURRENCY_SYMBOL", "Rs."),
		Timezone:              getEnv("TIMEZONE", "Asia/Kathmandu"),
		AllowedOrigins:        strings.Split(getEnv("ALLOWED_ORIGINS", "http://localhost:3000,http://localhost:3001"), ","),
		EsewaMerchantCode:     getEnv("ESEWA_MERCHANT_CODE", "EPAYTEST"),
		KhaltiSecretKey:       getEnv("KHALTI_SECRET_KEY", "test_secret_key_6789"),
		StripeSecretKey:       getEnv("STRIPE_SECRET_KEY", "sk_test_placeholder_rental"),
		StripeWebhookSecret:   getEnv("STRIPE_WEBHOOK_SECRET", "whsec_placeholder"),
	}

	if cfg.Env == "production" {
		if cfg.JWTSecret == "super-secure-rental-jwt-secret-key-32bytes-min" {
			return nil, fmt.Errorf("JWT_SECRET must be configured with a production secret")
		}
		if cfg.DatabaseURL == "" {
			return nil, fmt.Errorf("DATABASE_URL is required in production")
		}
	}

	return cfg, nil
}

func getEnv(key, defaultVal string) string {
	if val := os.Getenv(key); val != "" {
		return val
	}
	return defaultVal
}

func getEnvInt(key string, defaultVal int) int {
	if val := os.Getenv(key); val != "" {
		if intVal, err := strconv.Atoi(val); err == nil {
			return intVal
		}
	}
	return defaultVal
}
