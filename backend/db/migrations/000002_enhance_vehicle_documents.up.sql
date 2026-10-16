-- ==========================================================
-- Migration: 000002_enhance_vehicle_documents.up.sql
-- Vehicle & Document Management Specification Alignment
-- ==========================================================

ALTER TABLE vehicle_documents 
    ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS document_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS issuing_authority VARCHAR(255),
    ADD COLUMN IF NOT EXISTS file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS file_size BIGINT,
    ADD COLUMN IF NOT EXISTS mime_type VARCHAR(100),
    ADD COLUMN IF NOT EXISTS issue_date DATE,
    ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    ADD COLUMN IF NOT EXISTS verified_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Backfill tenant_id from vehicles if any exist
UPDATE vehicle_documents vd
SET tenant_id = v.tenant_id
FROM vehicles v
WHERE vd.vehicle_id = v.id AND vd.tenant_id IS NULL;

-- Dedicated indexes for compliance filtering and expiry cron queries
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_tenant_status ON vehicle_documents(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_vehicle ON vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_expiry ON vehicle_documents(expiry_date);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_type ON vehicle_documents(doc_type);
CREATE INDEX IF NOT EXISTS idx_vehicle_docs_verification ON vehicle_documents(tenant_id, verification_status);
