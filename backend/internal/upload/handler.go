package upload

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/rental/backend/internal/auth"
	"github.com/rental/backend/pkg/httpx"
	"github.com/rental/backend/pkg/storage"
)

type Handler struct {
	storage storage.ObjectStorage
}

func NewHandler(store storage.ObjectStorage) *Handler {
	return &Handler{storage: store}
}

type UploadResponse struct {
	Success     bool   `json:"success"`
	URL         string `json:"url"`
	Key         string `json:"key"`
	Filename    string `json:"filename"`
	Size        int64  `json:"size"`
	ContentType string `json:"contentType"`
}

type Base64UploadRequest struct {
	DataURI     string `json:"data_uri"`
	Filename    string `json:"filename"`
	Key         string `json:"key"`
	Folder      string `json:"folder"`
	ContentType string `json:"content_type"`
}

// Upload handles direct raw binary, multipart/form-data, and Base64 JSON uploads to cloud storage
func (h *Handler) Upload(w http.ResponseWriter, r *http.Request) {
	tenantIDStr := "global"
	if tID, ok := auth.GetTenantID(r.Context()); ok {
		tenantIDStr = tID.String()
	}

	contentType := r.Header.Get("Content-Type")

	// 1. Base64 JSON upload
	if strings.HasPrefix(contentType, "application/json") {
		var req Base64UploadRequest
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			httpx.Error(w, http.StatusBadRequest, "INVALID_JSON", err.Error())
			return
		}

		rawB64 := req.DataURI
		mimeType := req.ContentType
		if idx := strings.Index(rawB64, ","); idx != -1 {
			meta := rawB64[:idx]
			rawB64 = rawB64[idx+1:]
			if strings.Contains(meta, "data:") && strings.Contains(meta, ";") {
				parts := strings.Split(meta, ";")
				mimeType = strings.TrimPrefix(parts[0], "data:")
			}
		}

		data, err := base64.StdEncoding.DecodeString(rawB64)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "INVALID_BASE64", "Failed to decode base64 data: "+err.Error())
			return
		}

		key := req.Key
		if key == "" {
			folder := req.Folder
			if folder == "" {
				folder = "uploads"
			}
			ext := filepath.Ext(req.Filename)
			if ext == "" {
				ext = ".png"
			}
			key = fmt.Sprintf("%s/%s/%d-%s%s", folder, tenantIDStr, time.Now().UnixNano(), req.Filename, ext)
		}

		if mimeType == "" {
			mimeType = http.DetectContentType(data)
		}

		cloudURL, err := h.storage.Upload(r.Context(), key, data, mimeType)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "UPLOAD_FAILED", err.Error())
			return
		}

		httpx.JSON(w, http.StatusOK, UploadResponse{
			Success:     true,
			URL:         cloudURL,
			Key:         key,
			Filename:    req.Filename,
			Size:        int64(len(data)),
			ContentType: mimeType,
		})
		return
	}

	// 2. Raw binary upload via headers (e.g. from frontend R2 fallback with 'x-r2-key')
	if r.Header.Get("x-r2-key") != "" || !strings.HasPrefix(contentType, "multipart/form-data") {
		key := r.Header.Get("x-r2-key")
		if key == "" {
			key = r.URL.Query().Get("key")
		}

		data, err := io.ReadAll(r.Body)
		if err != nil {
			httpx.Error(w, http.StatusBadRequest, "READ_FAILED", err.Error())
			return
		}

		if len(data) == 0 {
			httpx.Error(w, http.StatusBadRequest, "EMPTY_BODY", "Request body is empty")
			return
		}

		if key == "" {
			ext := ".bin"
			if contentType == "image/png" {
				ext = ".png"
			} else if contentType == "image/jpeg" || contentType == "image/jpg" {
				ext = ".jpg"
			} else if contentType == "image/webp" {
				ext = ".webp"
			}
			key = fmt.Sprintf("uploads/%s/%d%s", tenantIDStr, time.Now().UnixNano(), ext)
		}

		cloudURL, err := h.storage.Upload(r.Context(), key, data, contentType)
		if err != nil {
			httpx.Error(w, http.StatusInternalServerError, "UPLOAD_FAILED", err.Error())
			return
		}

		httpx.JSON(w, http.StatusOK, UploadResponse{
			Success:     true,
			URL:         cloudURL,
			Key:         key,
			Filename:    filepath.Base(key),
			Size:        int64(len(data)),
			ContentType: contentType,
		})
		return
	}

	// 3. Multipart form-data upload
	if err := r.ParseMultipartForm(50 << 20); err != nil {
		httpx.Error(w, http.StatusBadRequest, "PARSE_FAILED", err.Error())
		return
	}

	// Check fields: "file", "image", "photo", "logo", "document"
	var fileHeader *interface{}
	_ = fileHeader
	fileKeys := []string{"file", "image", "photo", "logo", "document"}
	var (
		file        io.ReadCloser
		filename    string
		mime        string
		foundUpload bool
	)

	for _, k := range fileKeys {
		f, header, err := r.FormFile(k)
		if err == nil {
			file = f
			filename = header.Filename
			mime = header.Header.Get("Content-Type")
			foundUpload = true
			break
		}
	}

	if !foundUpload {
		httpx.Error(w, http.StatusBadRequest, "MISSING_FILE", "No file found in multipart form (expected field: file, image, photo, or logo)")
		return
	}
	defer file.Close()

	data, err := io.ReadAll(file)
	if err != nil {
		httpx.Error(w, http.StatusBadRequest, "READ_ERROR", err.Error())
		return
	}

	if mime == "" || mime == "application/octet-stream" {
		mime = http.DetectContentType(data)
	}

	folder := r.FormValue("folder")
	if folder == "" {
		folder = "fleet"
	}

	key := r.FormValue("key")
	if key == "" {
		ext := filepath.Ext(filename)
		if ext == "" {
			ext = ".jpg"
		}
		key = fmt.Sprintf("%s/%s/%d-%s", folder, tenantIDStr, time.Now().UnixNano(), filename)
	}

	cloudURL, err := h.storage.Upload(r.Context(), key, data, mime)
	if err != nil {
		httpx.Error(w, http.StatusInternalServerError, "UPLOAD_FAILED", err.Error())
		return
	}

	httpx.JSON(w, http.StatusOK, UploadResponse{
		Success:     true,
		URL:         cloudURL,
		Key:         key,
		Filename:    filename,
		Size:        int64(len(data)),
		ContentType: mime,
	})
}

