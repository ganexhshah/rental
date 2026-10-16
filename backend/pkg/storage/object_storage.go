package storage

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"
)

type ObjectStorage interface {
	Upload(ctx context.Context, key string, data []byte, contentType string) (url string, err error)
	Download(ctx context.Context, key string) ([]byte, error)
	GenerateSignedURL(ctx context.Context, key string, ttl time.Duration) (string, error)
	VerifySignedURLToken(key, token, expiresAtStr string) bool
	Delete(ctx context.Context, key string) error
}

type LocalObjectStorage struct {
	baseDir   string
	baseURL   string
	secretKey string
	mu        sync.RWMutex
}

func NewLocalObjectStorage(baseDir, baseURL, secretKey string) (*LocalObjectStorage, error) {
	if err := os.MkdirAll(baseDir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create storage dir: %w", err)
	}
	if secretKey == "" {
		secretKey = "rental-saas-secure-document-signing-key-2026"
	}
	return &LocalObjectStorage{
		baseDir:   baseDir,
		baseURL:   baseURL,
		secretKey: secretKey,
	}, nil
}

func normalizeKey(key string) string {
	k := strings.ReplaceAll(key, "\\", "/")
	k = strings.TrimPrefix(k, "/")
	parts := strings.Split(k, "/")
	cleanParts := make([]string, 0, len(parts))
	for _, p := range parts {
		if p == "" || p == "." || p == ".." {
			continue
		}
		cleanParts = append(cleanParts, p)
	}
	return strings.Join(cleanParts, "/")
}

func (l *LocalObjectStorage) resolvePath(key string) (string, error) {
	normKey := normalizeKey(key)
	if normKey == "" {
		return "", fmt.Errorf("invalid empty storage key")
	}

	absBase, err := filepath.Abs(l.baseDir)
	if err != nil {
		return "", fmt.Errorf("failed to resolve base directory: %w", err)
	}

	fullPath := filepath.Clean(filepath.Join(absBase, filepath.FromSlash(normKey)))
	if !strings.HasPrefix(fullPath, absBase+string(filepath.Separator)) && fullPath != absBase {
		return "", fmt.Errorf("path traversal forbidden: %s", key)
	}

	return fullPath, nil
}

func (l *LocalObjectStorage) Upload(ctx context.Context, key string, data []byte, contentType string) (string, error) {
	l.mu.Lock()
	defer l.mu.Unlock()

	normKey := normalizeKey(key)
	fullPath, err := l.resolvePath(normKey)
	if err != nil {
		return "", err
	}

	dir := filepath.Dir(fullPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	if err := os.WriteFile(fullPath, data, 0644); err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	url := fmt.Sprintf("%s/api/v1/documents/files/%s", l.baseURL, normKey)
	return url, nil
}

func (l *LocalObjectStorage) Download(ctx context.Context, key string) ([]byte, error) {
	l.mu.RLock()
	defer l.mu.RUnlock()

	fullPath, err := l.resolvePath(key)
	if err != nil {
		return nil, err
	}

	data, err := os.ReadFile(fullPath)
	if err != nil {
		return nil, fmt.Errorf("failed to read file: %w", err)
	}
	return data, nil
}

func (l *LocalObjectStorage) GenerateSignedURL(ctx context.Context, key string, ttl time.Duration) (string, error) {
	normKey := normalizeKey(key)
	expiresAt := time.Now().Add(ttl).Unix()
	expiresAtStr := strconv.FormatInt(expiresAt, 10)

	mac := hmac.New(sha256.New, []byte(l.secretKey))
	mac.Write([]byte(fmt.Sprintf("%s:%s", normKey, expiresAtStr)))
	signature := hex.EncodeToString(mac.Sum(nil))

	signedURL := fmt.Sprintf("%s/api/v1/documents/files/%s?expires=%s&token=%s", l.baseURL, normKey, expiresAtStr, signature)
	return signedURL, nil
}

func (l *LocalObjectStorage) VerifySignedURLToken(key, token, expiresAtStr string) bool {
	normKey := normalizeKey(key)
	expiresAt, err := strconv.ParseInt(expiresAtStr, 10, 64)
	if err != nil {
		return false
	}
	if time.Now().Unix() > expiresAt {
		return false // Expired
	}

	mac := hmac.New(sha256.New, []byte(l.secretKey))
	mac.Write([]byte(fmt.Sprintf("%s:%s", normKey, expiresAtStr)))
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	return strings.EqualFold(token, expectedSig)
}

func (l *LocalObjectStorage) Delete(ctx context.Context, key string) error {
	l.mu.Lock()
	defer l.mu.Unlock()

	fullPath, err := l.resolvePath(key)
	if err != nil {
		return err
	}
	return os.Remove(fullPath)
}

func CalculateSHA256(data []byte) string {
	hash := sha256.Sum256(data)
	return hex.EncodeToString(hash[:])
}
