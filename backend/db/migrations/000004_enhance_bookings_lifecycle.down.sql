-- Rollback Migration 000004
DROP TABLE IF EXISTS booking_status_history;

ALTER TABLE bookings DROP CONSTRAINT IF EXISTS no_overlapping_bookings;

ALTER TABLE bookings ADD CONSTRAINT no_overlapping_bookings 
    EXCLUDE USING gist (
        vehicle_id WITH =, 
        tstzrange(start_date, end_date) WITH &&
    ) 
    WHERE (status IN ('confirmed', 'active'));

ALTER TABLE bookings
    DROP COLUMN IF EXISTS primary_driver_id,
    DROP COLUMN IF EXISTS vehicle_category_id,
    DROP COLUMN IF EXISTS source,
    DROP COLUMN IF EXISTS pricing_snapshot,
    DROP COLUMN IF EXISTS extras,
    DROP COLUMN IF EXISTS cancellation_reason,
    DROP COLUMN IF EXISTS cancelled_at,
    DROP COLUMN IF EXISTS cancelled_by,
    DROP COLUMN IF EXISTS cancellation_fee,
    DROP COLUMN IF EXISTS completed_at,
    DROP COLUMN IF EXISTS pickup_notes,
    DROP COLUMN IF EXISTS return_notes,
    DROP COLUMN IF EXISTS pickup_photos,
    DROP COLUMN IF EXISTS return_photos,
    DROP COLUMN IF EXISTS rejection_reason,
    DROP COLUMN IF EXISTS reassigned_from_vehicle_id,
    DROP COLUMN IF EXISTS reassign_reason;
