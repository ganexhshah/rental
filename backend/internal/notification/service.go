package notification

import (
	"context"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

type Service struct {
	pool *pgxpool.Pool
}

func NewService(pool *pgxpool.Pool) *Service {
	return &Service{pool: pool}
}

func (s *Service) SendNotification(ctx context.Context, tenantID uuid.UUID, req SendNotificationRequest) (*Notification, error) {
	id := uuid.New()
	channel := req.Channel
	if channel == "" {
		channel = "in_app"
	}

	dataJSON, _ := json.Marshal(req.Data)
	now := time.Now()

	query := `
		INSERT INTO notifications (id, tenant_id, user_id, channel, title, body, data, is_read, sent_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE, $8)
		RETURNING id, tenant_id, user_id, channel, title, body, data, is_read, sent_at, created_at
	`
	var n Notification
	var rawData []byte
	err := s.pool.QueryRow(ctx, query, id, tenantID, req.UserID, channel, req.Title, req.Body, dataJSON, now).Scan(
		&n.ID, &n.TenantID, &n.UserID, &n.Channel, &n.Title, &n.Body, &rawData, &n.IsRead, &n.SentAt, &n.CreatedAt,
	)
	if err != nil {
		return nil, err
	}
	_ = json.Unmarshal(rawData, &n.Data)

	// Record delivery log
	_, _ = s.pool.Exec(ctx, `
		INSERT INTO notification_deliveries (id, tenant_id, notification_id, recipient, channel, status, sent_at)
		VALUES ($1, $2, $3, $4, $5, 'sent', NOW())
	`, uuid.New(), tenantID, id, req.UserID.String(), channel)

	return &n, nil
}

func (s *Service) ListUserNotifications(ctx context.Context, tenantID, userID uuid.UUID, unreadOnly bool) ([]Notification, error) {
	if s.pool == nil {
		return []Notification{}, nil
	}
	where := "WHERE tenant_id = $1 AND user_id = $2"
	if unreadOnly {
		where += " AND is_read = FALSE"
	}
	query := `
		SELECT id, tenant_id, user_id, channel, title, body, data, is_read, sent_at, created_at
		FROM notifications
		` + where + `
		ORDER BY created_at DESC
		LIMIT 50
	`
	rows, err := s.pool.Query(ctx, query, tenantID, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]Notification, 0)
	for rows.Next() {
		var n Notification
		var rawData []byte
		if err := rows.Scan(&n.ID, &n.TenantID, &n.UserID, &n.Channel, &n.Title, &n.Body, &rawData, &n.IsRead, &n.SentAt, &n.CreatedAt); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(rawData, &n.Data)
		list = append(list, n)
	}
	return list, nil
}

func (s *Service) MarkAsRead(ctx context.Context, tenantID, userID, notificationID uuid.UUID) error {
	if s.pool == nil {
		return nil
	}
	_, err := s.pool.Exec(ctx, "UPDATE notifications SET is_read = TRUE WHERE id = $1 AND tenant_id = $2 AND user_id = $3", notificationID, tenantID, userID)
	return err
}

func (s *Service) ListTemplates(ctx context.Context, tenantID uuid.UUID) ([]NotificationTemplate, error) {
	defaultTemplates := []NotificationTemplate{
		{ID: uuid.New(), TenantID: tenantID, Code: "BOOKING_CONFIRMATION", Name: "Booking Confirmation", Channel: "email", Subject: "Booking Confirmed - {{booking_code}}", BodyTemplate: "Hi {{customer_name}}, your booking for {{vehicle}} is confirmed.", IsActive: true},
		{ID: uuid.New(), TenantID: tenantID, Code: "PICKUP_REMINDER", Name: "Pickup Reminder", Channel: "sms", BodyTemplate: "Reminder: Your vehicle pickup is scheduled for {{pickup_time}}.", IsActive: true},
		{ID: uuid.New(), TenantID: tenantID, Code: "RETURN_OVERDUE", Name: "Return Overdue Notice", Channel: "whatsapp", BodyTemplate: "Urgent: Vehicle return for booking {{booking_code}} is overdue.", IsActive: true},
		{ID: uuid.New(), TenantID: tenantID, Code: "PAYMENT_RECEIPT", Name: "Payment Receipt Issued", Channel: "email", Subject: "Payment Receipt #{{receipt_number}}", BodyTemplate: "Payment of {{amount}} received successfully.", IsActive: true},
	}
	if s.pool == nil {
		return defaultTemplates, nil
	}
	query := `
		SELECT id, tenant_id, code, name, channel, COALESCE(subject, ''), body_template, variables, is_active, created_at
		FROM notification_templates
		WHERE tenant_id = $1
		ORDER BY name ASC
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return defaultTemplates, nil
	}
	defer rows.Close()

	list := make([]NotificationTemplate, 0)
	for rows.Next() {
		var t NotificationTemplate
		if err := rows.Scan(&t.ID, &t.TenantID, &t.Code, &t.Name, &t.Channel, &t.Subject, &t.BodyTemplate, &t.Variables, &t.IsActive, &t.CreatedAt); err == nil {
			list = append(list, t)
		}
	}

	if len(list) == 0 {
		return []NotificationTemplate{
			{ID: uuid.New(), TenantID: tenantID, Code: "BOOKING_CONFIRMATION", Name: "Booking Confirmation", Channel: "email", Subject: "Booking Confirmed - {{booking_code}}", BodyTemplate: "Hi {{customer_name}}, your booking for {{vehicle}} is confirmed.", IsActive: true},
			{ID: uuid.New(), TenantID: tenantID, Code: "PICKUP_REMINDER", Name: "Pickup Reminder", Channel: "sms", BodyTemplate: "Reminder: Your vehicle pickup is scheduled for {{pickup_time}}.", IsActive: true},
			{ID: uuid.New(), TenantID: tenantID, Code: "RETURN_OVERDUE", Name: "Return Overdue Notice", Channel: "whatsapp", BodyTemplate: "Urgent: Vehicle return for booking {{booking_code}} is overdue.", IsActive: true},
			{ID: uuid.New(), TenantID: tenantID, Code: "PAYMENT_RECEIPT", Name: "Payment Receipt Issued", Channel: "email", Subject: "Payment Receipt #{{receipt_number}}", BodyTemplate: "Payment of {{amount}} received successfully.", IsActive: true},
		}, nil
	}

	return list, nil
}

func (s *Service) CreateTemplate(ctx context.Context, tenantID uuid.UUID, req CreateTemplateRequest) (*NotificationTemplate, error) {
	tID := uuid.New()
	varJSON := req.Variables
	if len(varJSON) == 0 {
		varJSON = []byte("[]")
	}

	query := `
		INSERT INTO notification_templates (id, tenant_id, code, name, channel, subject, body_template, variables, is_active)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
		RETURNING id, created_at
	`
	var t NotificationTemplate
	t.ID = tID
	t.TenantID = tenantID
	t.Code = req.Code
	t.Name = req.Name
	t.Channel = req.Channel
	t.Subject = req.Subject
	t.BodyTemplate = req.BodyTemplate
	t.Variables = varJSON
	t.IsActive = true

	err := s.pool.QueryRow(ctx, query, tID, tenantID, req.Code, req.Name, req.Channel, req.Subject, req.BodyTemplate, varJSON).Scan(&t.ID, &t.CreatedAt)
	if err != nil {
		return nil, err
	}
	return &t, nil
}

func (s *Service) ListDeliveries(ctx context.Context, tenantID uuid.UUID) ([]NotificationDelivery, error) {
	if s.pool == nil {
		return []NotificationDelivery{}, nil
	}
	query := `
		SELECT id, tenant_id, notification_id, recipient, channel, status, COALESCE(error_message, ''), attempts, sent_at, created_at
		FROM notification_deliveries
		WHERE tenant_id = $1
		ORDER BY created_at DESC
		LIMIT 100
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return []NotificationDelivery{}, nil
	}
	defer rows.Close()

	list := make([]NotificationDelivery, 0)
	for rows.Next() {
		var d NotificationDelivery
		if err := rows.Scan(&d.ID, &d.TenantID, &d.NotificationID, &d.Recipient, &d.Channel, &d.Status, &d.ErrorMessage, &d.Attempts, &d.SentAt, &d.CreatedAt); err == nil {
			list = append(list, d)
		}
	}
	return list, nil
}

func (s *Service) ListAutomationRules(ctx context.Context, tenantID uuid.UUID) ([]AutomationRule, error) {
	if s.pool == nil {
		return []AutomationRule{}, nil
	}
	query := `
		SELECT id, tenant_id, event_trigger, conditions, action_type, action_payload, is_active, created_at
		FROM automation_rules
		WHERE tenant_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return []AutomationRule{}, nil
	}
	defer rows.Close()

	list := make([]AutomationRule, 0)
	for rows.Next() {
		var a AutomationRule
		if err := rows.Scan(&a.ID, &a.TenantID, &a.EventTrigger, &a.Conditions, &a.ActionType, &a.ActionPayload, &a.IsActive, &a.CreatedAt); err == nil {
			list = append(list, a)
		}
	}
	return list, nil
}
