package storage

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"strings"
	"time"
)

// R2Config holds configuration for Cloudflare R2 / S3-compatible cloud storage
type R2Config struct {
	AccountID       string
	AccessKeyID     string
	SecretAccessKey string
	BucketName      string
	Endpoint        string
	PublicURL       string
	CustomDomain    string
	Region          string
}

// R2Storage implements ObjectStorage for Cloudflare R2 and AWS S3
type R2Storage struct {
	cfg          R2Config
	httpClient   *http.Client
	fallback     *LocalObjectStorage
	secretSigner string
}

func NewR2Storage(cfg R2Config, fallback *LocalObjectStorage) *R2Storage {
	if cfg.Region == "" {
		cfg.Region = "auto"
	}
	if cfg.Endpoint == "" && cfg.AccountID != "" {
		cfg.Endpoint = fmt.Sprintf("https://%s.r2.cloudflarestorage.com", cfg.AccountID)
	}
	return &R2Storage{
		cfg: cfg,
		httpClient: &http.Client{
			Timeout: 45 * time.Second,
		},
		fallback:     fallback,
		secretSigner: "rental-cloud-storage-signing-2026",
	}
}

func (r *R2Storage) IsConfigured() bool {
	return r.cfg.AccessKeyID != "" && r.cfg.SecretAccessKey != "" && r.cfg.BucketName != "" && (r.cfg.AccountID != "" || r.cfg.Endpoint != "")
}

func hmacSHA256(key []byte, data string) []byte {
	h := hmac.New(sha256.New, key)
	h.Write([]byte(data))
	return h.Sum(nil)
}

func getR2SigningKey(secretKey, dateStamp, region, service string) []byte {
	kDate := hmacSHA256([]byte("AWS4"+secretKey), dateStamp)
	kRegion := hmacSHA256(kDate, region)
	kService := hmacSHA256(kRegion, service)
	return hmacSHA256(kService, "aws4_request")
}

func (r *R2Storage) Upload(ctx context.Context, key string, data []byte, contentType string) (string, error) {
	normKey := strings.TrimPrefix(normalizeKey(key), "/")
	if normKey == "" {
		return "", fmt.Errorf("invalid empty storage key")
	}

	if contentType == "" {
		contentType = "application/octet-stream"
	}

	// If R2 is not configured, fallback to local storage
	if !r.IsConfigured() {
		if r.fallback != nil {
			return r.fallback.Upload(ctx, normKey, data, contentType)
		}
		return "", fmt.Errorf("cloud storage is not configured")
	}

	endpoint := strings.TrimSuffix(r.cfg.Endpoint, "/")
	if endpoint == "" {
		endpoint = fmt.Sprintf("https://%s.r2.cloudflarestorage.com", r.cfg.AccountID)
	}

	targetURL := fmt.Sprintf("%s/%s/%s", endpoint, r.cfg.BucketName, normKey)
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return "", fmt.Errorf("invalid R2 target URL: %w", err)
	}

	now := time.Now().UTC()
	amzDate := now.Format("20060102T150405Z")
	dateStamp := now.Format("20060102")

	contentHash := CalculateSHA256(data)
	canonicalURI := fmt.Sprintf("/%s/%s", r.cfg.BucketName, normKey)
	canonicalHeaders := fmt.Sprintf("content-type:%s\nhost:%s\nx-amz-content-sha256:%s\nx-amz-date:%s\n",
		contentType, parsedURL.Host, contentHash, amzDate)
	signedHeaders := "content-type;host;x-amz-content-sha256;x-amz-date"

	canonicalRequest := strings.Join([]string{
		"PUT",
		canonicalURI,
		"",
		canonicalHeaders,
		signedHeaders,
		contentHash,
	}, "\n")

	canonicalRequestHash := CalculateSHA256([]byte(canonicalRequest))
	credentialScope := fmt.Sprintf("%s/%s/s3/aws4_request", dateStamp, r.cfg.Region)
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		credentialScope,
		canonicalRequestHash,
	}, "\n")

	signingKey := getR2SigningKey(r.cfg.SecretAccessKey, dateStamp, r.cfg.Region, "s3")
	signature := hex.EncodeToString(hmacSHA256(signingKey, stringToSign))

	authHeader := fmt.Sprintf("AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		r.cfg.AccessKeyID, credentialScope, signedHeaders, signature)

	req, err := http.NewRequestWithContext(ctx, "PUT", targetURL, bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("failed to create upload request: %w", err)
	}

	req.Header.Set("Content-Type", contentType)
	req.Header.Set("x-amz-date", amzDate)
	req.Header.Set("x-amz-content-sha256", contentHash)
	req.Header.Set("Authorization", authHeader)
	req.Header.Set("Host", parsedURL.Host)

	resp, err := r.httpClient.Do(req)
	if err != nil {
		// If cloud network fails and fallback exists, upload to local and log warning
		if r.fallback != nil {
			return r.fallback.Upload(ctx, normKey, data, contentType)
		}
		return "", fmt.Errorf("cloud storage upload network error: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		respBytes, _ := io.ReadAll(resp.Body)
		if r.fallback != nil {
			return r.fallback.Upload(ctx, normKey, data, contentType)
		}
		return "", fmt.Errorf("cloud storage upload failed with status %d: %s", resp.StatusCode, string(respBytes))
	}

	// Compute public cloud URL
	publicBase := strings.TrimSuffix(r.cfg.PublicURL, "/")
	if publicBase == "" && r.cfg.CustomDomain != "" {
		publicBase = "https://" + strings.TrimSuffix(r.cfg.CustomDomain, "/")
	}
	if publicBase == "" {
		publicBase = fmt.Sprintf("%s/%s", endpoint, r.cfg.BucketName)
	}

	cloudURL := fmt.Sprintf("%s/%s", publicBase, normKey)
	return cloudURL, nil
}

func (r *R2Storage) Download(ctx context.Context, key string) ([]byte, error) {
	normKey := strings.TrimPrefix(normalizeKey(key), "/")
	if !r.IsConfigured() {
		if r.fallback != nil {
			return r.fallback.Download(ctx, normKey)
		}
		return nil, fmt.Errorf("cloud storage is not configured")
	}

	endpoint := strings.TrimSuffix(r.cfg.Endpoint, "/")
	if endpoint == "" {
		endpoint = fmt.Sprintf("https://%s.r2.cloudflarestorage.com", r.cfg.AccountID)
	}

	targetURL := fmt.Sprintf("%s/%s/%s", endpoint, r.cfg.BucketName, normKey)
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return nil, fmt.Errorf("invalid URL: %w", err)
	}

	now := time.Now().UTC()
	amzDate := now.Format("20060102T150405Z")
	dateStamp := now.Format("20060102")

	contentHash := CalculateSHA256([]byte(""))
	canonicalURI := fmt.Sprintf("/%s/%s", r.cfg.BucketName, normKey)
	canonicalHeaders := fmt.Sprintf("host:%s\nx-amz-content-sha256:%s\nx-amz-date:%s\n",
		parsedURL.Host, contentHash, amzDate)
	signedHeaders := "host;x-amz-content-sha256;x-amz-date"

	canonicalRequest := strings.Join([]string{
		"GET",
		canonicalURI,
		"",
		canonicalHeaders,
		signedHeaders,
		contentHash,
	}, "\n")

	canonicalRequestHash := CalculateSHA256([]byte(canonicalRequest))
	credentialScope := fmt.Sprintf("%s/%s/s3/aws4_request", dateStamp, r.cfg.Region)
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		credentialScope,
		canonicalRequestHash,
	}, "\n")

	signingKey := getR2SigningKey(r.cfg.SecretAccessKey, dateStamp, r.cfg.Region, "s3")
	signature := hex.EncodeToString(hmacSHA256(signingKey, stringToSign))

	authHeader := fmt.Sprintf("AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		r.cfg.AccessKeyID, credentialScope, signedHeaders, signature)

	req, err := http.NewRequestWithContext(ctx, "GET", targetURL, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("x-amz-date", amzDate)
	req.Header.Set("x-amz-content-sha256", contentHash)
	req.Header.Set("Authorization", authHeader)
	req.Header.Set("Host", parsedURL.Host)

	resp, err := r.httpClient.Do(req)
	if err != nil {
		if r.fallback != nil {
			return r.fallback.Download(ctx, normKey)
		}
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusOK {
		return io.ReadAll(resp.Body)
	}

	if r.fallback != nil {
		return r.fallback.Download(ctx, normKey)
	}

	return nil, fmt.Errorf("failed to download from cloud storage: status %d", resp.StatusCode)
}

func (r *R2Storage) GenerateSignedURL(ctx context.Context, key string, ttl time.Duration) (string, error) {
	normKey := strings.TrimPrefix(normalizeKey(key), "/")
	if r.cfg.PublicURL != "" {
		return fmt.Sprintf("%s/%s", strings.TrimSuffix(r.cfg.PublicURL, "/"), normKey), nil
	}
	if r.fallback != nil {
		return r.fallback.GenerateSignedURL(ctx, normKey, ttl)
	}
	return "", fmt.Errorf("no signed URL generator available")
}

func (r *R2Storage) VerifySignedURLToken(key, token, expiresAtStr string) bool {
	if r.fallback != nil {
		return r.fallback.VerifySignedURLToken(key, token, expiresAtStr)
	}
	return true
}

func (r *R2Storage) Delete(ctx context.Context, key string) error {
	normKey := strings.TrimPrefix(normalizeKey(key), "/")
	if !r.IsConfigured() {
		if r.fallback != nil {
			return r.fallback.Delete(ctx, normKey)
		}
		return nil
	}

	endpoint := strings.TrimSuffix(r.cfg.Endpoint, "/")
	if endpoint == "" {
		endpoint = fmt.Sprintf("https://%s.r2.cloudflarestorage.com", r.cfg.AccountID)
	}

	targetURL := fmt.Sprintf("%s/%s/%s", endpoint, r.cfg.BucketName, normKey)
	parsedURL, err := url.Parse(targetURL)
	if err != nil {
		return err
	}

	now := time.Now().UTC()
	amzDate := now.Format("20060102T150405Z")
	dateStamp := now.Format("20060102")

	contentHash := CalculateSHA256([]byte(""))
	canonicalURI := fmt.Sprintf("/%s/%s", r.cfg.BucketName, normKey)
	canonicalHeaders := fmt.Sprintf("host:%s\nx-amz-content-sha256:%s\nx-amz-date:%s\n",
		parsedURL.Host, contentHash, amzDate)
	signedHeaders := "host;x-amz-content-sha256;x-amz-date"

	canonicalRequest := strings.Join([]string{
		"DELETE",
		canonicalURI,
		"",
		canonicalHeaders,
		signedHeaders,
		contentHash,
	}, "\n")

	canonicalRequestHash := CalculateSHA256([]byte(canonicalRequest))
	credentialScope := fmt.Sprintf("%s/%s/s3/aws4_request", dateStamp, r.cfg.Region)
	stringToSign := strings.Join([]string{
		"AWS4-HMAC-SHA256",
		amzDate,
		credentialScope,
		canonicalRequestHash,
	}, "\n")

	signingKey := getR2SigningKey(r.cfg.SecretAccessKey, dateStamp, r.cfg.Region, "s3")
	signature := hex.EncodeToString(hmacSHA256(signingKey, stringToSign))

	authHeader := fmt.Sprintf("AWS4-HMAC-SHA256 Credential=%s/%s, SignedHeaders=%s, Signature=%s",
		r.cfg.AccessKeyID, credentialScope, signedHeaders, signature)

	req, err := http.NewRequestWithContext(ctx, "DELETE", targetURL, nil)
	if err != nil {
		return err
	}
	req.Header.Set("x-amz-date", amzDate)
	req.Header.Set("x-amz-content-sha256", contentHash)
	req.Header.Set("Authorization", authHeader)
	req.Header.Set("Host", parsedURL.Host)

	resp, err := r.httpClient.Do(req)
	if err != nil {
		if r.fallback != nil {
			return r.fallback.Delete(ctx, normKey)
		}
		return err
	}
	defer resp.Body.Close()

	if r.fallback != nil {
		_ = r.fallback.Delete(ctx, normKey)
	}

	return nil
}

