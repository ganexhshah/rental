package httpx

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/rental/backend/pkg/pagination"
)

type APIResponse struct {
	Success   bool             `json:"success"`
	Data      any              `json:"data,omitempty"`
	Meta      *pagination.Meta `json:"meta,omitempty"`
	Timestamp string           `json:"timestamp"`
}

type APIErrorResponse struct {
	Success   bool       `json:"success"`
	Error     ErrorBlock `json:"error"`
	Timestamp string     `json:"timestamp"`
}

type ErrorBlock struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Details any    `json:"details,omitempty"`
}

func JSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(APIResponse{
		Success:   true,
		Data:      data,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}

func Paginated(w http.ResponseWriter, status int, data any, meta pagination.Meta) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(APIResponse{
		Success:   true,
		Data:      data,
		Meta:      &meta,
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}

func Error(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(APIErrorResponse{
		Success: false,
		Error: ErrorBlock{
			Code:    code,
			Message: message,
		},
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}

func ValidationError(w http.ResponseWriter, details any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnprocessableEntity)
	_ = json.NewEncoder(w).Encode(APIErrorResponse{
		Success: false,
		Error: ErrorBlock{
			Code:    "VALIDATION_FAILED",
			Message: "The request payload failed schema validation",
			Details: details,
		},
		Timestamp: time.Now().UTC().Format(time.RFC3339),
	})
}
