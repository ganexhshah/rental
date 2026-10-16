package notification

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type Notification struct {
	ID        uuid.UUID              `json:"id"`
	TenantID  uuid.UUID              `json:"tenant_id"`
	UserID    uuid.UUID              `json:"user_id"`
	Channel   string                 `json:"channel"` // in_app, email, sms, whatsapp
	Title     string                 `json:"title"`
	Body      string                 `json:"body"`
	Data      map[string]interface{} `json:"data"`
	IsRead    bool                   `json:"is_read"`
	SentAt    *time.Time             `json:"sent_at,omitempty"`
	CreatedAt time.Time              `json:"created_at"`
}

type NotificationTemplate struct {
	ID           uuid.UUID       `json:"id"`
	TenantID     uuid.UUID       `json:"tenant_id"`
	Code         string          `json:"code"`
	Name         string          `json:"name"`
	Channel      string          `json:"channel"`
	Subject      string          `json:"subject,omitempty"`
	BodyTemplate string          `json:"body_template"`
	Variables    json.RawMessage `json:"variables"`
	IsActive     bool            `json:"is_active"`
	CreatedAt    time.Time       `json:"created_at"`
}

type NotificationDelivery struct {
	ID             uuid.UUID  `json:"id"`
	TenantID       uuid.UUID  `json:"tenant_id"`
	NotificationID uuid.UUID  `json:"notification_id"`
	Recipient      string     `json:"recipient"`
	Channel        string     `json:"channel"`
	Status         string     `json:"status"` // sent, failed, retry
	ErrorMessage   string     `json:"error_message,omitempty"`
	Attempts       int        `json:"attempts"`
	SentAt         *time.Time `json:"sent_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
}

type AutomationRule struct {
	ID            uuid.UUID       `json:"id"`
	TenantID      uuid.UUID       `json:"tenant_id"`
	EventTrigger  string          `json:"event_trigger"` // booking_created, payment_completed, vehicle_returned, maintenance_due
	Conditions    json.RawMessage `json:"conditions"`
	ActionType    string          `json:"action_type"`
	ActionPayload json.RawMessage `json:"action_payload"`
	IsActive      bool            `json:"is_active"`
	CreatedAt     time.Time       `json:"created_at"`
}

type SendNotificationRequest struct {
	UserID  uuid.UUID              `json:"user_id" validate:"required"`
	Channel string                 `json:"channel"`
	Title   string                 `json:"title" validate:"required"`
	Body    string                 `json:"body" validate:"required"`
	Data    map[string]interface{} `json:"data,omitempty"`
}

type CreateTemplateRequest struct {
	Code         string          `json:"code" validate:"required"`
	Name         string          `json:"name" validate:"required"`
	Channel      string          `json:"channel" validate:"required"`
	Subject      string          `json:"subject"`
	BodyTemplate string          `json:"body_template" validate:"required"`
	Variables    json.RawMessage `json:"variables"`
}
