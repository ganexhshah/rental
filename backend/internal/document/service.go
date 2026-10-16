package document

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rental/backend/pkg/pagination"
	"github.com/rental/backend/pkg/storage"
)

var (
	ErrDocumentNotFound = errors.New("document not found")
	ErrTemplateNotFound = errors.New("document template not found")
)

type Service struct {
	pool     *pgxpool.Pool
	storage  storage.ObjectStorage
	renderer *PDFRenderer
}

func NewService(pool *pgxpool.Pool, store storage.ObjectStorage) *Service {
	return &Service{
		pool:     pool,
		storage:  store,
		renderer: NewPDFRenderer(),
	}
}

// Concurrency-safe atomic gapless sequence generator per tenant
func (s *Service) GetNextSequenceNumber(ctx context.Context, tenantID uuid.UUID, docType DocType, defaultPrefix string, padding int) (string, error) {
	if padding <= 0 {
		padding = 6
	}

	query := `
		INSERT INTO document_sequences (tenant_id, doc_type, prefix, current_val, padding)
		VALUES ($1, $2, $3, 1, $4)
		ON CONFLICT (tenant_id, doc_type)
		DO UPDATE SET current_val = document_sequences.current_val + 1
		RETURNING prefix, current_val, padding
	`

	var prefix string
	var currentVal int64
	var pad int

	err := s.pool.QueryRow(ctx, query, tenantID, string(docType), defaultPrefix, padding).Scan(&prefix, &currentVal, &pad)
	if err != nil {
		return "", fmt.Errorf("failed to allocate sequence number: %w", err)
	}

	if prefix == "" {
		prefix = defaultPrefix
	}

	currentYear := time.Now().Format("2006")
	return fmt.Sprintf("%s-%s-%0*d", prefix, currentYear, pad, currentVal), nil
}

func (s *Service) CreateOrUpdateDocument(
	ctx context.Context,
	tenantID uuid.UUID,
	docType DocType,
	docNumber string,
	title string,
	entityType string,
	entityID uuid.UUID,
	payload *DocumentPayload,
	generatedBy string,
	forceNewVersion bool,
) (*Document, error) {
	// 1. Render PDF authoritative vector layout
	pdfBytes, err := s.renderer.Render(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to render PDF: %w", err)
	}

	if len(pdfBytes) == 0 {
		return nil, errors.New("rendered PDF is empty")
	}

	// 2. Compute SHA256 & storage key
	shaHash := storage.CalculateSHA256(pdfBytes)
	storageKey := fmt.Sprintf("tenants/%s/documents/%s/%s_v1.pdf", tenantID.String(), string(docType), docNumber)

	// 3. Begin database transaction to store document and version
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, err
	}
	defer tx.Rollback(ctx)

	// Check if document already exists
	var existingDoc Document
	queryExisting := `
		SELECT id, tenant_id, doc_type, document_number, title, entity_type, entity_id, status, current_version, metadata, created_at, updated_at
		FROM documents
		WHERE tenant_id = $1 AND (document_number = $2 OR (entity_type = $3 AND entity_id = $4 AND doc_type = $5))
		FOR UPDATE
	`
	err = tx.QueryRow(ctx, queryExisting, tenantID, docNumber, entityType, entityID, string(docType)).Scan(
		&existingDoc.ID, &existingDoc.TenantID, &existingDoc.DocType, &existingDoc.DocumentNumber,
		&existingDoc.Title, &existingDoc.EntityType, &existingDoc.EntityID, &existingDoc.Status,
		&existingDoc.CurrentVersion, &existingDoc.Metadata, &existingDoc.CreatedAt, &existingDoc.UpdatedAt,
	)

	docID := uuid.New()
	versionNum := 1

	if err == nil {
		docID = existingDoc.ID
		docNumber = existingDoc.DocumentNumber
		if forceNewVersion {
			versionNum = existingDoc.CurrentVersion + 1
			storageKey = fmt.Sprintf("tenants/%s/documents/%s/%s_v%d.pdf", tenantID.String(), string(docType), docNumber, versionNum)
			// Update document version
			_, err = tx.Exec(ctx, `UPDATE documents SET current_version = $1, updated_at = NOW() WHERE id = $2`, versionNum, docID)
			if err != nil {
				return nil, err
			}
		} else {
			// Reuse latest version
			versionNum = existingDoc.CurrentVersion
			storageKey = fmt.Sprintf("tenants/%s/documents/%s/%s_v%d.pdf", tenantID.String(), string(docType), docNumber, versionNum)
		}
	} else if errors.Is(err, pgx.ErrNoRows) {
		// Insert brand new document
		insertDoc := `
			INSERT INTO documents (id, tenant_id, doc_type, document_number, title, entity_type, entity_id, status, current_version, metadata)
			VALUES ($1, $2, $3, $4, $5, $6, $7, 'issued', 1, '{}')
			RETURNING id, created_at, updated_at
		`
		if err := tx.QueryRow(ctx, insertDoc, docID, tenantID, string(docType), docNumber, title, entityType, entityID).Scan(&existingDoc.ID, &existingDoc.CreatedAt, &existingDoc.UpdatedAt); err != nil {
			return nil, fmt.Errorf("failed to create document record: %w", err)
		}
		existingDoc.TenantID = tenantID
		existingDoc.DocType = docType
		existingDoc.DocumentNumber = docNumber
		existingDoc.Title = title
		existingDoc.EntityType = entityType
		existingDoc.EntityID = entityID
		existingDoc.Status = "issued"
		existingDoc.CurrentVersion = 1
	} else {
		return nil, err
	}

	// 4. Upload PDF to private object storage
	fileURL, err := s.storage.Upload(ctx, storageKey, pdfBytes, "application/pdf")
	if err != nil {
		return nil, fmt.Errorf("failed to store PDF file: %w", err)
	}

	snapshotJSON, _ := json.Marshal(payload)

	// 5. Insert document_version record
	versionID := uuid.New()
	insertVersion := `
		INSERT INTO document_versions (
			id, tenant_id, document_id, version, file_url, storage_key, sha256_hash, file_size_bytes,
			mime_type, snapshot_data, generated_by, rendered_at
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, 'application/pdf', $9, $10, NOW()
		)
		ON CONFLICT (document_id, version) DO UPDATE SET
			file_url = EXCLUDED.file_url,
			storage_key = EXCLUDED.storage_key,
			sha256_hash = EXCLUDED.sha256_hash,
			file_size_bytes = EXCLUDED.file_size_bytes,
			snapshot_data = EXCLUDED.snapshot_data,
			rendered_at = NOW()
		RETURNING id, rendered_at
	`
	var renderedAt time.Time
	err = tx.QueryRow(
		ctx, insertVersion,
		versionID, tenantID, docID, versionNum, fileURL, storageKey, shaHash, int64(len(pdfBytes)),
		snapshotJSON, generatedBy,
	).Scan(&versionID, &renderedAt)
	if err != nil {
		return nil, fmt.Errorf("failed to save document version: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, err
	}

	existingDoc.LatestVersion = &DocumentVersion{
		ID:            versionID,
		TenantID:      tenantID,
		DocumentID:    docID,
		Version:       versionNum,
		FileURL:       fileURL,
		StorageKey:    storageKey,
		SHA256Hash:    shaHash,
		FileSizeBytes: int64(len(pdfBytes)),
		MimeType:      "application/pdf",
		SnapshotData:  snapshotJSON,
		GeneratedBy:   generatedBy,
		RenderedAt:    renderedAt,
	}

	return &existingDoc, nil
}

func (s *Service) GetDocument(ctx context.Context, tenantID, documentID uuid.UUID) (*Document, error) {
	query := `
		SELECT d.id, d.tenant_id, d.doc_type, d.document_number, d.title, d.entity_type, d.entity_id, d.status, d.current_version, d.metadata, d.created_at, d.updated_at,
		       v.id, v.version, v.file_url, v.storage_key, v.sha256_hash, v.file_size_bytes, v.mime_type, v.snapshot_data, v.generated_by, v.rendered_at
		FROM documents d
		LEFT JOIN document_versions v ON v.document_id = d.id AND v.version = d.current_version
		WHERE (d.id = $1 OR d.entity_id = $1) AND d.tenant_id = $2
		ORDER BY d.created_at DESC
		LIMIT 1
	`
	var d Document
	var v DocumentVersion
	err := s.pool.QueryRow(ctx, query, documentID, tenantID).Scan(
		&d.ID, &d.TenantID, &d.DocType, &d.DocumentNumber, &d.Title, &d.EntityType, &d.EntityID, &d.Status, &d.CurrentVersion, &d.Metadata, &d.CreatedAt, &d.UpdatedAt,
		&v.ID, &v.Version, &v.FileURL, &v.StorageKey, &v.SHA256Hash, &v.FileSizeBytes, &v.MimeType, &v.SnapshotData, &v.GeneratedBy, &v.RenderedAt,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, ErrDocumentNotFound
		}
		return nil, err
	}
	d.LatestVersion = &v
	return &d, nil
}

func (s *Service) GetSignedDownloadURL(ctx context.Context, tenantID, documentID uuid.UUID, ttl time.Duration) (string, error) {
	doc, err := s.GetDocument(ctx, tenantID, documentID)
	if err != nil {
		return "", err
	}
	if doc.LatestVersion == nil || doc.LatestVersion.StorageKey == "" {
		return "", errors.New("document has no rendered file available")
	}

	return s.storage.GenerateSignedURL(ctx, doc.LatestVersion.StorageKey, ttl)
}

func (s *Service) ListDocuments(ctx context.Context, tenantID uuid.UUID, docType, entityType string, p pagination.Params) ([]Document, pagination.Meta, error) {
	where := "WHERE d.tenant_id = $1"
	args := []any{tenantID}
	argIdx := 2

	if docType != "" {
		where += fmt.Sprintf(" AND d.doc_type = $%d", argIdx)
		args = append(args, docType)
		argIdx++
	}

	if entityType != "" {
		where += fmt.Sprintf(" AND d.entity_type = $%d", argIdx)
		args = append(args, entityType)
		argIdx++
	}

	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM documents d %s", where)
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, pagination.Meta{}, err
	}

	query := fmt.Sprintf(`
		SELECT d.id, d.tenant_id, d.doc_type, d.document_number, d.title, d.entity_type, d.entity_id, d.status, d.current_version, d.metadata, d.created_at, d.updated_at,
		       COALESCE(v.file_url, ''), COALESCE(v.sha256_hash, ''), COALESCE(v.file_size_bytes, 0)
		FROM documents d
		LEFT JOIN document_versions v ON v.document_id = d.id AND v.version = d.current_version
		%s
		ORDER BY d.created_at DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, p.Limit, p.Offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	defer rows.Close()

	list := make([]Document, 0)
	for rows.Next() {
		var d Document
		var fileURL, hash string
		var size int64
		if err := rows.Scan(
			&d.ID, &d.TenantID, &d.DocType, &d.DocumentNumber, &d.Title, &d.EntityType, &d.EntityID, &d.Status, &d.CurrentVersion, &d.Metadata, &d.CreatedAt, &d.UpdatedAt,
			&fileURL, &hash, &size,
		); err != nil {
			return nil, pagination.Meta{}, err
		}
		if fileURL != "" {
			d.LatestVersion = &DocumentVersion{
				FileURL:       fileURL,
				SHA256Hash:    hash,
				FileSizeBytes: size,
			}
		}
		list = append(list, d)
	}

	return list, pagination.BuildMeta(total, p), nil
}
