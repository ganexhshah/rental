-- Migration 000005: Enterprise Financials, Document Generation Subsystem, Operations & Fleet Workflows

-- 1. Document Sequences (Concurrency-safe gapless numbering per tenant)
CREATE TABLE IF NOT EXISTS document_sequences (
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL,
    prefix VARCHAR(20) NOT NULL DEFAULT '',
    current_val BIGINT NOT NULL DEFAULT 0,
    padding INT NOT NULL DEFAULT 6,
    PRIMARY KEY(tenant_id, doc_type)
);

-- 2. Master Document Subsystem (Section C, D, I, J)
CREATE TABLE IF NOT EXISTS document_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    content_html TEXT NOT NULL,
    variable_definitions JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_default BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, doc_type, name)
);

CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL, -- invoice, payment_receipt, deposit_receipt, refund_receipt, credit_note, rental_contract, handover_sheet, return_report, work_order, expense_report, booking_confirmation
    document_number VARCHAR(100) NOT NULL,
    title VARCHAR(255) NOT NULL,
    entity_type VARCHAR(100) NOT NULL, -- booking, payment, invoice, inspection, maintenance, expense
    entity_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'issued', -- draft, issued, signed, voided, archived
    current_version INT NOT NULL DEFAULT 1,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, document_number)
);

CREATE TABLE IF NOT EXISTS document_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
    version INT NOT NULL,
    file_url TEXT NOT NULL,
    storage_key TEXT NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    mime_type VARCHAR(100) NOT NULL DEFAULT 'application/pdf',
    snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    generated_by VARCHAR(255) NOT NULL DEFAULT 'system',
    rendered_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(document_id, version)
);

CREATE TABLE IF NOT EXISTS document_generation_jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    doc_type VARCHAR(50) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id UUID NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processing, completed, failed
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    completed_at TIMESTAMPTZ
);

-- 3. Payment Enhancements, Attempts, Webhooks, Receipts, Allocations & Credit Notes (Section B.1, B.2, E, F)
ALTER TABLE payments
    ADD COLUMN IF NOT EXISTS customer_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS billing_address TEXT,
    ADD COLUMN IF NOT EXISTS failure_reason TEXT,
    ADD COLUMN IF NOT EXISTS recorded_by_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS receipt_number VARCHAR(100),
    ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS settled_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS payment_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_id UUID REFERENCES payments(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    gateway VARCHAR(100) NOT NULL,
    attempt_number INT NOT NULL DEFAULT 1,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'NPR',
    status VARCHAR(50) NOT NULL DEFAULT 'initiated', -- initiated, pending, success, failed
    request_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    response_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    error_code VARCHAR(100),
    error_message TEXT,
    ip_address VARCHAR(50),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payment_webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    gateway VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    event_id VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    signature VARCHAR(500),
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, processed, failed, ignored
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(gateway, event_id)
);

CREATE TABLE IF NOT EXISTS payment_receipts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    receipt_number VARCHAR(100) NOT NULL,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    customer_id UUID REFERENCES customers(id) ON DELETE SET NULL,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(10) NOT NULL DEFAULT 'NPR',
    payment_method VARCHAR(50) NOT NULL,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, receipt_number)
);

CREATE TABLE IF NOT EXISTS payment_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    payment_id UUID NOT NULL REFERENCES payments(id) ON DELETE CASCADE,
    invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    allocation_type VARCHAR(50) NOT NULL DEFAULT 'invoice_settlement',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS credit_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    credit_note_number VARCHAR(100) NOT NULL,
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    amount NUMERIC(12,2) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'issued', -- draft, issued, void
    issued_date DATE NOT NULL DEFAULT CURRENT_DATE,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, credit_note_number)
);

ALTER TABLE invoices
    ADD COLUMN IF NOT EXISTS locked_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS terms TEXT,
    ADD COLUMN IF NOT EXISTS payment_instructions TEXT,
    ADD COLUMN IF NOT EXISTS voided_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS void_reason TEXT,
    ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

ALTER TABLE deposits
    ADD COLUMN IF NOT EXISTS forfeited_amount NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS release_notes TEXT,
    ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS inspector_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- 4. Contract Enhancements & Multi-party E-Signatures (Section B.3, G)
ALTER TABLE rental_contracts
    ADD COLUMN IF NOT EXISTS version INT NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS locked_snapshot JSONB,
    ADD COLUMN IF NOT EXISTS signer_ip VARCHAR(50),
    ADD COLUMN IF NOT EXISTS signer_user_agent TEXT,
    ADD COLUMN IF NOT EXISTS signer_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS contract_versions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    version INT NOT NULL,
    content_html TEXT NOT NULL,
    snapshot_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    signed_by_customer BOOLEAN NOT NULL DEFAULT FALSE,
    signature_url TEXT,
    signed_at TIMESTAMPTZ,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(contract_id, version)
);

CREATE TABLE IF NOT EXISTS contract_signatures (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL REFERENCES rental_contracts(id) ON DELETE CASCADE,
    signer_role VARCHAR(50) NOT NULL, -- customer, secondary_driver, staff_witness
    signer_name VARCHAR(255) NOT NULL,
    signer_email VARCHAR(255),
    signature_image_url TEXT NOT NULL,
    signed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    ip_address VARCHAR(50),
    user_agent TEXT,
    evidence_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Operations: Inspections, Pickups, Returns & Damages (Section B.4, B.5)
CREATE TABLE IF NOT EXISTS inspection_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    inspection_type VARCHAR(50) NOT NULL DEFAULT 'standard', -- standard, bike, commercial
    checklist_points JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inspections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    inspector_id UUID REFERENCES users(id) ON DELETE SET NULL,
    inspection_type VARCHAR(50) NOT NULL, -- pickup, return, routine
    odometer INT NOT NULL,
    fuel_level VARCHAR(50) NOT NULL,
    checklist_data JSONB NOT NULL DEFAULT '{}'::jsonb,
    exterior_notes TEXT,
    interior_notes TEXT,
    photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    customer_signature_url TEXT,
    staff_signature_url TEXT,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE damage_records
    ADD COLUMN IF NOT EXISTS inspection_id UUID REFERENCES inspections(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL DEFAULT 'exterior',
    ADD COLUMN IF NOT EXISTS is_chargeable BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS customer_acknowledged BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS customer_acknowledged_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS maintenance_record_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL;

-- 6. Maintenance & Fleet Service Enhancements (Section B.6)
CREATE TABLE IF NOT EXISTS maintenance_work_orders (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    maintenance_record_id UUID NOT NULL REFERENCES maintenance_records(id) ON DELETE CASCADE,
    work_order_number VARCHAR(100) NOT NULL,
    labor_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    parts_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    parts_list JSONB NOT NULL DEFAULT '[]'::jsonb,
    downtime_days INT NOT NULL DEFAULT 0,
    mechanic_notes TEXT,
    invoice_url TEXT,
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft', -- draft, approved, completed, cancelled
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, work_order_number)
);

CREATE TABLE IF NOT EXISTS preventive_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    service_type VARCHAR(100) NOT NULL,
    interval_km INT NOT NULL DEFAULT 5000,
    interval_months INT NOT NULL DEFAULT 6,
    last_service_km INT NOT NULL DEFAULT 0,
    last_service_date DATE,
    next_due_km INT NOT NULL DEFAULT 5000,
    next_due_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Expenses Cost Allocation (Section B.7)
CREATE TABLE IF NOT EXISTS expense_allocations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    expense_id UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    location_id UUID REFERENCES locations(id) ON DELETE SET NULL,
    amount NUMERIC(12,2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE expenses
    ADD COLUMN IF NOT EXISTS receipt_url TEXT,
    ADD COLUMN IF NOT EXISTS storage_key TEXT,
    ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents(id) ON DELETE SET NULL;

-- 8. Staff Invitations, User Sessions & Activity (Section B.11, B.15)
CREATE TABLE IF NOT EXISTS staff_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    email VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL DEFAULT 'staff',
    role_id UUID REFERENCES roles(id) ON DELETE SET NULL,
    token VARCHAR(100) NOT NULL UNIQUE,
    status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, accepted, expired
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(50),
    user_agent TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    revoked_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 9. Notifications Delivery & Automation Rules (Section B.9)
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    code VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    channel VARCHAR(50) NOT NULL DEFAULT 'in_app', -- in_app, email, sms, whatsapp
    subject VARCHAR(255),
    body_template TEXT NOT NULL,
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

CREATE TABLE IF NOT EXISTS notification_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    notification_id UUID REFERENCES notifications(id) ON DELETE CASCADE,
    recipient VARCHAR(255) NOT NULL,
    channel VARCHAR(50) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'sent', -- sent, failed, retry
    error_message TEXT,
    attempts INT NOT NULL DEFAULT 1,
    sent_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS automation_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_trigger VARCHAR(100) NOT NULL, -- booking_created, payment_completed, vehicle_returned, maintenance_due
    conditions JSONB NOT NULL DEFAULT '{}'::jsonb,
    action_type VARCHAR(100) NOT NULL, -- send_notification, generate_invoice, trigger_webhook
    action_payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 10. Marketing Promotions & Referral Codes (Section B.10)
CREATE TABLE IF NOT EXISTS referral_codes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
    code VARCHAR(50) NOT NULL,
    reward_type VARCHAR(50) NOT NULL DEFAULT 'discount_percentage',
    reward_amount NUMERIC(12,2) NOT NULL DEFAULT 10.00,
    usage_count INT NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, code)
);

ALTER TABLE coupons
    ADD COLUMN IF NOT EXISTS applicable_vehicle_category_id UUID REFERENCES vehicle_categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS max_discount_amount NUMERIC(12,2) DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS per_customer_limit INT NOT NULL DEFAULT 1;

-- 11. Subscription & SaaS Plans (Section B.13)
CREATE TABLE IF NOT EXISTS subscription_plans (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    price_monthly NUMERIC(12,2) NOT NULL,
    max_vehicles INT NOT NULL DEFAULT 5,
    max_users INT NOT NULL DEFAULT 2,
    max_locations INT NOT NULL DEFAULT 1,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS subscription_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL, -- plan_upgraded, plan_downgraded, payment_failed, renewed
    plan_tier VARCHAR(50) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 12. Integrations & External Webhooks (Section B.16)
CREATE TABLE IF NOT EXISTS integration_connections (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL, -- esewa, khalti, stripe, twilio, s3, sendgrid
    status VARCHAR(50) NOT NULL DEFAULT 'inactive', -- active, inactive, test_failed
    credentials_encrypted JSONB NOT NULL DEFAULT '{}'::jsonb,
    settings JSONB NOT NULL DEFAULT '{}'::jsonb,
    last_synced_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(tenant_id, provider)
);

CREATE TABLE IF NOT EXISTS integration_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    provider VARCHAR(100) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    status VARCHAR(50) NOT NULL DEFAULT 'success',
    error_message TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 13. Report Exports & Accounting Definitions (Section B.8, H)
CREATE TABLE IF NOT EXISTS report_exports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    report_type VARCHAR(100) NOT NULL, -- revenue, pnl, fleet_utilization, customer_performance, expenses
    export_format VARCHAR(20) NOT NULL, -- csv, pdf
    accounting_basis VARCHAR(50) NOT NULL DEFAULT 'accrual', -- accrual (issued invoices), cash (received payments)
    status VARCHAR(50) NOT NULL DEFAULT 'completed', -- pending, processing, completed, failed
    filter_params JSONB NOT NULL DEFAULT '{}'::jsonb,
    file_url TEXT,
    storage_key TEXT,
    file_size_bytes BIGINT NOT NULL DEFAULT 0,
    requested_by VARCHAR(255) NOT NULL DEFAULT 'staff',
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes for performance & security
CREATE INDEX IF NOT EXISTS idx_documents_tenant_type ON documents(tenant_id, doc_type);
CREATE INDEX IF NOT EXISTS idx_documents_entity ON documents(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_payment_receipts_tenant ON payment_receipts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_credit_notes_invoice ON credit_notes(invoice_id);
CREATE INDEX IF NOT EXISTS idx_inspections_booking ON inspections(booking_id);
CREATE INDEX IF NOT EXISTS idx_maintenance_work_orders_tenant ON maintenance_work_orders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_preventive_schedules_vehicle ON preventive_schedules(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_report_exports_tenant ON report_exports(tenant_id, report_type);
