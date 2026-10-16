-- Drop added indexes
DROP INDEX IF EXISTS idx_vehicle_docs_verification;
DROP INDEX IF EXISTS idx_vehicle_docs_type;
DROP INDEX IF EXISTS idx_vehicle_docs_expiry;
DROP INDEX IF EXISTS idx_vehicle_docs_vehicle;
DROP INDEX IF EXISTS idx_vehicle_docs_tenant_status;

-- Drop added columns
ALTER TABLE vehicle_documents
    DROP COLUMN IF EXISTS deleted_at,
    DROP COLUMN IF EXISTS notes,
    DROP COLUMN IF EXISTS version,
    DROP COLUMN IF EXISTS verified_at,
    DROP COLUMN IF EXISTS verified_by,
    DROP COLUMN IF EXISTS verification_status,
    DROP COLUMN IF EXISTS issue_date,
    DROP COLUMN IF EXISTS mime_type,
    DROP COLUMN IF EXISTS file_size,
    DROP COLUMN IF EXISTS file_name,
    DROP COLUMN IF EXISTS issuing_authority,
    DROP COLUMN IF EXISTS document_number,
    DROP COLUMN IF EXISTS tenant_id;
