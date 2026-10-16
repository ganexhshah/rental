-- Migration 000003: Enhance Customer & Driver Management
ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS customer_type VARCHAR(50) NOT NULL DEFAULT 'individual',
    ADD COLUMN IF NOT EXISTS first_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS last_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS preferred_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS date_of_birth DATE,
    ADD COLUMN IF NOT EXISTS gender VARCHAR(20),
    ADD COLUMN IF NOT EXISTS nationality VARCHAR(100) DEFAULT 'Nepalese',
    ADD COLUMN IF NOT EXISTS customer_code VARCHAR(50),
    ADD COLUMN IF NOT EXISTS profile_photo TEXT,
    ADD COLUMN IF NOT EXISTS status VARCHAR(50) NOT NULL DEFAULT 'active',
    ADD COLUMN IF NOT EXISTS secondary_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS country VARCHAR(100) DEFAULT 'Nepal',
    ADD COLUMN IF NOT EXISTS province VARCHAR(100) DEFAULT 'Bagmati',
    ADD COLUMN IF NOT EXISTS district_city VARCHAR(100) DEFAULT 'Kathmandu',
    ADD COLUMN IF NOT EXISTS postal_code VARCHAR(20),
    ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(100),
    ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(50),
    ADD COLUMN IF NOT EXISTS emergency_contact_phone VARCHAR(50),
    ADD COLUMN IF NOT EXISTS billing_address TEXT,
    ADD COLUMN IF NOT EXISTS company_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS company_tax_id VARCHAR(100),
    ADD COLUMN IF NOT EXISTS license_category VARCHAR(50) DEFAULT 'B',
    ADD COLUMN IF NOT EXISTS rental_eligibility_status VARCHAR(50) NOT NULL DEFAULT 'eligible',
    ADD COLUMN IF NOT EXISTS is_blacklisted BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN IF NOT EXISTS blacklist_reason TEXT,
    ADD COLUMN IF NOT EXISTS blacklisted_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS blacklisted_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS customer_drivers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    full_name VARCHAR(255) NOT NULL,
    license_number VARCHAR(100) NOT NULL,
    license_category VARCHAR(50) NOT NULL DEFAULT 'B',
    license_expiry DATE,
    phone VARCHAR(50),
    email VARCHAR(255),
    relationship VARCHAR(50) DEFAULT 'primary',
    is_primary BOOLEAN NOT NULL DEFAULT false,
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    eligibility_status VARCHAR(50) NOT NULL DEFAULT 'eligible',
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS customer_documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES customer_drivers(id) ON DELETE SET NULL,
    document_type VARCHAR(100) NOT NULL,
    document_number VARCHAR(100),
    file_name VARCHAR(255) NOT NULL,
    file_url TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100),
    expiry_date DATE,
    issue_date DATE,
    issuing_authority VARCHAR(255),
    verification_status VARCHAR(50) NOT NULL DEFAULT 'pending',
    verified_by VARCHAR(255),
    verified_at TIMESTAMPTZ,
    rejection_reason TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customer_drivers_customer ON customer_drivers(customer_id);
CREATE INDEX IF NOT EXISTS idx_customer_documents_customer ON customer_documents(customer_id);

