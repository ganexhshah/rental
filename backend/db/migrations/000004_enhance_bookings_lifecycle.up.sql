-- Migration 000004: Enhance Bookings Lifecycle & State Machine

-- 1. Add fields to bookings table
ALTER TABLE bookings
    ADD COLUMN IF NOT EXISTS primary_driver_id UUID REFERENCES customer_drivers(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS vehicle_category_id UUID REFERENCES vehicle_categories(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS source VARCHAR(50) NOT NULL DEFAULT 'admin',
    ADD COLUMN IF NOT EXISTS pricing_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
    ADD COLUMN IF NOT EXISTS extras JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS cancellation_reason TEXT,
    ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS cancelled_by VARCHAR(255),
    ADD COLUMN IF NOT EXISTS cancellation_fee NUMERIC(12,2) NOT NULL DEFAULT 0.00,
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS pickup_notes TEXT,
    ADD COLUMN IF NOT EXISTS return_notes TEXT,
    ADD COLUMN IF NOT EXISTS pickup_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS return_photos JSONB NOT NULL DEFAULT '[]'::jsonb,
    ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
    ADD COLUMN IF NOT EXISTS reassigned_from_vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS reassign_reason TEXT;

-- 2. Update overlapping booking exclusion constraint to include all active/reserved lifecycle states
ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings;

ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings 
    EXCLUDE USING gist (
        vehicle_id WITH =, 
        tstzrange(start_date, end_date) WITH &&
    ) 
    WHERE (status IN ('confirmed', 'pickup_scheduled', 'pickup_in_progress', 'active', 'return_in_progress'));

-- 3. Create booking status history table for audit trails
CREATE TABLE IF NOT EXISTS booking_status_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
    from_status VARCHAR(50) NOT NULL,
    to_status VARCHAR(50) NOT NULL,
    changed_by VARCHAR(255) NOT NULL DEFAULT 'system',
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking ON booking_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_tenant ON booking_status_history(tenant_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_driver ON bookings(primary_driver_id);
