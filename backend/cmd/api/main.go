package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/rental/backend/internal/auth"
	"github.com/rental/backend/internal/booking"
	"github.com/rental/backend/internal/contract"
	"github.com/rental/backend/internal/customer"
	"github.com/rental/backend/internal/document"
	"github.com/rental/backend/internal/expense"
	"github.com/rental/backend/internal/integration"
	"github.com/rental/backend/internal/maintenance"
	"github.com/rental/backend/internal/marketing"
	"github.com/rental/backend/internal/notification"
	"github.com/rental/backend/internal/onboarding"
	"github.com/rental/backend/internal/payment"
	"github.com/rental/backend/internal/public"
	"github.com/rental/backend/internal/report"
	"github.com/rental/backend/internal/subscription"
	"github.com/rental/backend/internal/tenant"
	"github.com/rental/backend/internal/upload"
	"github.com/rental/backend/internal/user"
	"github.com/rental/backend/internal/vehicle"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rental/backend/pkg/config"
	"github.com/rental/backend/pkg/httpx"
	"github.com/rental/backend/pkg/logger"
	"github.com/rental/backend/pkg/storage"
)

var (
	Version   = "1.0.0"
	BuildTime = time.Now().UTC().Format(time.RFC3339)
	StartTime = time.Now().UTC()
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		fmt.Fprintf(os.Stderr, "failed to load config: %v\n", err)
		os.Exit(1)
	}

	log := logger.New(cfg.Env)
	log.Info("starting vehicle rental saas backend",
		"version", Version,
		"env", cfg.Env,
		"port", cfg.Port,
		"currency", cfg.DefaultCurrency,
		"timezone", cfg.Timezone,
	)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// 1. Initialize Database
	db, err := storage.NewDatabase(ctx, cfg.DatabaseURL, log)
	if err != nil {
		log.Warn("database initialization warning (service starting in degraded mode if offline)", "error", err)
	} else {
		defer db.Close()
		// Run migrations
		if err := db.AutoMigrate(ctx, "./db/migrations"); err != nil {
			log.Error("failed to apply migrations", "error", err)
		}
	}

	// 2. Initialize Redis
	redisClient, err := storage.NewRedis(ctx, cfg.RedisURL, log)
	if err != nil {
		log.Warn("redis initialization warning", "error", err)
	} else {
		defer redisClient.Close()
	}

	// 3. Setup Chi router
	r := chi.NewRouter()

	// Global middlewares
	r.Use(httpx.RequestID)
	r.Use(httpx.Logger(log))
	r.Use(httpx.Recoverer(log))
	r.Use(middleware.RealIP)
	r.Use(middleware.Timeout(60 * time.Second))

	// CORS configuration
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   cfg.AllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type", "X-Request-ID", "Idempotency-Key"},
		ExposedHeaders:   []string{"Link", "X-Request-ID"},
		AllowCredentials: true,
		MaxAge:           300,
	}))

	// Health, readiness, and liveness endpoints
	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		dbStatus := "down"
		if db != nil && db.Pool != nil {
			pingCtx, pingCancel := context.WithTimeout(r.Context(), 2*time.Second)
			defer pingCancel()
			if err := db.Pool.Ping(pingCtx); err == nil {
				dbStatus = "up"
			}
		}

		redisStatus := "down"
		if redisClient != nil && redisClient.Client != nil {
			pingCtx, pingCancel := context.WithTimeout(r.Context(), 2*time.Second)
			defer pingCancel()
			if err := redisClient.Client.Ping(pingCtx).Err(); err == nil {
				redisStatus = "up"
			}
		}

		httpx.JSON(w, http.StatusOK, map[string]any{
			"status":     "healthy",
			"version":    Version,
			"build_time": BuildTime,
			"uptime":     time.Since(StartTime).String(),
			"services": map[string]string{
				"database": dbStatus,
				"redis":    redisStatus,
			},
			"currency": map[string]string{
				"code":   cfg.DefaultCurrency,
				"symbol": cfg.DefaultCurrencySymbol,
			},
			"timezone": cfg.Timezone,
		})
	})

	r.Get("/ready", func(w http.ResponseWriter, r *http.Request) {
		if db == nil || db.Pool == nil {
			httpx.Error(w, http.StatusServiceUnavailable, "NOT_READY", "Database pool is not ready")
			return
		}
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "ready"})
	})

	r.Get("/live", func(w http.ResponseWriter, r *http.Request) {
		httpx.JSON(w, http.StatusOK, map[string]string{"status": "live"})
	})

	// Initialize Domain Services and Handlers
	var pool *pgxpool.Pool
	if db != nil {
		pool = db.Pool
	}

	authMiddleware := auth.RequireAuth(cfg.JWTSecret)

	tenantService := tenant.NewService(pool)
	tenantHandler := tenant.NewHandler(tenantService, cfg.JWTSecret)

	authService := auth.NewService(pool, cfg, tenantService)
	authHandler := auth.NewHandler(authService, cfg.JWTSecret)

	userService := user.NewService(pool)
	userHandler := user.NewHandler(userService, cfg.JWTSecret)

	vehicleService := vehicle.NewService(pool)
	vehicleHandler := vehicle.NewHandler(vehicleService, cfg.JWTSecret)

	customerService := customer.NewService(pool)
	customerHandler := customer.NewHandler(customerService, cfg.JWTSecret)

	bookingService := booking.NewService(pool)
	bookingHandler := booking.NewHandler(bookingService)

	localStorage, err := storage.NewLocalObjectStorage("./uploads", "http://localhost:"+cfg.Port, cfg.JWTSecret)
	if err != nil {
		log.Warn("local object storage init warning", "error", err)
	}

	cloudStorage := storage.NewR2Storage(storage.R2Config{
		AccountID:       cfg.R2AccountID,
		AccessKeyID:     cfg.R2AccessKeyID,
		SecretAccessKey: cfg.R2SecretAccessKey,
		BucketName:      cfg.R2BucketName,
		Endpoint:        cfg.R2Endpoint,
		PublicURL:       cfg.R2PublicURL,
		CustomDomain:    cfg.R2CustomDomain,
		Region:          "auto",
	}, localStorage)

	if cloudStorage.IsConfigured() {
		log.Info("cloud object storage configured and active",
			"bucket", cfg.R2BucketName,
			"public_url", cfg.R2PublicURL,
			"endpoint", cfg.R2Endpoint)
	} else {
		log.Warn("cloud object storage credentials not found, using local storage fallback")
	}

	uploadHandler := upload.NewHandler(cloudStorage)

	docService := document.NewService(pool, cloudStorage)
	docHandler := document.NewHandler(docService, cloudStorage)

	contractService := contract.NewService(pool, docService)
	contractHandler := contract.NewHandler(contractService)

	paymentService := payment.NewService(pool, docService)
	paymentHandler := payment.NewHandler(paymentService)

	maintenanceService := maintenance.NewService(pool, docService)
	maintenanceHandler := maintenance.NewHandler(maintenanceService)

	expenseService := expense.NewService(pool, docService)
	expenseHandler := expense.NewHandler(expenseService)

	marketingService := marketing.NewService(pool)
	marketingHandler := marketing.NewHandler(marketingService)

	notificationService := notification.NewService(pool)
	notificationHandler := notification.NewHandler(notificationService)

	reportService := report.NewService(pool, docService, cloudStorage)
	reportHandler := report.NewHandler(reportService)

	subscriptionService := subscription.NewService(pool)
	subscriptionHandler := subscription.NewHandler(subscriptionService)

	integrationService := integration.NewService(pool)
	integrationHandler := integration.NewHandler(integrationService)

	publicHandler := public.NewHandler(pool, tenantService, bookingService)

	onboardingService := onboarding.NewService(pool, tenantService, vehicleService, cloudStorage, "./uploads", "http://localhost:"+cfg.Port)
	onboardingHandler := onboarding.NewHandler(onboardingService)

	// Top-level direct Cloud Upload endpoint (Cloudflare R2 / S3)
	r.Post("/api/upload-to-r2", uploadHandler.Upload)
	r.Put("/api/upload-to-r2", uploadHandler.Upload)
	r.Post("/api/v1/upload", uploadHandler.Upload)
	r.Put("/api/v1/upload", uploadHandler.Upload)

	// Serve Static Uploads (logos, vehicle photos, attachments fallback)
	_ = os.MkdirAll("./uploads/logos", 0755)
	r.Handle("/uploads/*", http.StripPrefix("/uploads/", http.FileServer(http.Dir("./uploads"))))

	// Serve OpenAPI Specification
	r.Get("/api/openapi/openapi.yaml", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./api/openapi/openapi.yaml")
	})
	r.Get("/openapi.yaml", func(w http.ResponseWriter, r *http.Request) {
		http.ServeFile(w, r, "./api/openapi/openapi.yaml")
	})

	// Mount API v1 route groups
	r.Route("/api/v1", func(api chi.Router) {
		api.Get("/", func(w http.ResponseWriter, r *http.Request) {
			httpx.JSON(w, http.StatusOK, map[string]any{
				"message":  "Vehicle Rental SaaS API v1",
				"version":  Version,
				"currency": cfg.DefaultCurrency,
				"symbol":   cfg.DefaultCurrencySymbol,
				"timezone": cfg.Timezone,
				"docs":     "/api/openapi/openapi.yaml",
			})
		})

		// Public booking portal endpoints
		api.Mount("/public", publicHandler.Routes())

		// Standard domain endpoints
		api.Mount("/auth", authHandler.Routes())
		api.Mount("/tenants", tenantHandler.Routes())
		api.Mount("/users", userHandler.Routes())
		api.Mount("/vehicles", vehicleHandler.Routes())
		api.Mount("/customers", customerHandler.Routes())
		api.Mount("/bookings", bookingHandler.Routes(authMiddleware))
		api.Mount("/contracts", contractHandler.Routes(authMiddleware))
		api.Mount("/payments", paymentHandler.Routes(authMiddleware))
		api.Mount("/invoices", paymentHandler.InvoiceRoutes(authMiddleware))
		api.Mount("/maintenance", maintenanceHandler.Routes(authMiddleware))
		api.Mount("/expenses", expenseHandler.Routes(authMiddleware))
		api.Mount("/marketing", marketingHandler.Routes(authMiddleware))
		api.Mount("/notifications", notificationHandler.Routes(authMiddleware))
		api.Mount("/reports", reportHandler.Routes(authMiddleware))
		api.Mount("/subscriptions", subscriptionHandler.Routes(authMiddleware))
		api.Mount("/integrations", integrationHandler.Routes(authMiddleware))

		// Blueprint specific canonical endpoints
		api.Mount("/dashboard", reportHandler.DashboardRoutes(authMiddleware))
		api.Mount("/calendar", bookingHandler.CalendarRoutes(authMiddleware))
		api.Mount("/pickups", bookingHandler.PickupRoutes(authMiddleware))
		api.Mount("/returns", bookingHandler.ReturnRoutes(authMiddleware))
		api.Mount("/rentals", bookingHandler.RentalRoutes(authMiddleware))
		api.Mount("/availability", bookingHandler.AvailabilityRoutes(authMiddleware))
		api.Mount("/deposits", paymentHandler.DepositRoutes(authMiddleware))
		api.Mount("/webhooks", paymentHandler.WebhookRoutes())
		api.Mount("/contract-templates", contractHandler.TemplateRoutes(authMiddleware))
		api.Mount("/damage", maintenanceHandler.DamageRoutes(authMiddleware))
		api.Mount("/inspections", maintenanceHandler.InspectionRoutes(authMiddleware))
		api.Mount("/expense-categories", expenseHandler.CategoryRoutes(authMiddleware))
		api.Mount("/coupons", marketingHandler.CouponDirectRoutes(authMiddleware))
		api.Mount("/notification-templates", notificationHandler.TemplateRoutes(authMiddleware))
		api.Mount("/roles", userHandler.RoleRoutes(authMiddleware))
		api.Mount("/audit-logs", userHandler.AuditLogRoutes(authMiddleware))
		api.Mount("/subscription", subscriptionHandler.Routes(authMiddleware))
		api.Mount("/settings", tenantHandler.SettingsRoutes(authMiddleware))
		api.Mount("/documents", docHandler.Routes(authMiddleware))
		api.Mount("/vehicle-documents", vehicleHandler.DocumentRoutes(authMiddleware))
		api.Mount("/customer-documents", customerHandler.DocumentRoutes(authMiddleware))
		api.Mount("/onboarding", onboardingHandler.Routes(authMiddleware))
		api.Mount("/upload", onboardingHandler.DirectUploadRoutes(authMiddleware))
	})

	// 4. Start HTTP Server with Graceful Shutdown
	srv := &http.Server{
		Addr:         ":" + cfg.Port,
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 60 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	serverErrors := make(chan error, 1)
	go func() {
		log.Info("http server listening", "address", srv.Addr)
		serverErrors <- srv.ListenAndServe()
	}()

	shutdown := make(chan os.Signal, 1)
	signal.Notify(shutdown, os.Interrupt, syscall.SIGTERM)

	select {
	case err := <-serverErrors:
		if !errors.Is(err, http.ErrServerClosed) {
			log.Error("server error", "error", err)
			os.Exit(1)
		}
	case sig := <-shutdown:
		log.Info("shutdown signal received, stopping server", "signal", sig.String())
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			log.Error("graceful shutdown failed, forcing close", "error", err)
			_ = srv.Close()
		}
		log.Info("server exited cleanly")
	}
}
