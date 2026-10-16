package integration

import (
	"encoding/json"
	"time"

	"github.com/google/uuid"
)

type ConnectionStatus string

const (
	StatusActive     ConnectionStatus = "active"
	StatusInactive   ConnectionStatus = "inactive"
	StatusTestFailed ConnectionStatus = "test_failed"
)

type IntegrationConnection struct {
	ID            uuid.UUID        `json:"id"`
	TenantID      uuid.UUID        `json:"tenant_id"`
	Provider      string           `json:"provider"` // esewa, khalti, stripe, twilio, sendgrid, s3
	Status        ConnectionStatus `json:"status"`
	Settings      json.RawMessage  `json:"settings"`
	LastSyncedAt  *time.Time       `json:"last_synced_at,omitempty"`
	CreatedAt     time.Time        `json:"created_at"`
	UpdatedAt     time.Time        `json:"updated_at"`
}

type IntegrationEvent struct {
	ID           uuid.UUID       `json:"id"`
	TenantID     uuid.UUID       `json:"tenant_id"`
	Provider     string          `json:"provider"`
	EventType    string          `json:"event_type"`
	Payload      json.RawMessage `json:"payload"`
	Status       string          `json:"status"`
	ErrorMessage string          `json:"error_message,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
}

type SaveConnectionRequest struct {
	Provider    string                 `json:"provider" validate:"required"`
	Settings    map[string]interface{} `json:"settings"`
	Credentials map[string]interface{} `json:"credentials"`
}

type TestConnectionResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message"`
	Latency string `json:"latency"`
}
