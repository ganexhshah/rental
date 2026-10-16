-- Migration 000003 Rollback: Enhance Customer & Driver Management

DROP TABLE IF EXISTS customer_documents CASCADE;
DROP TABLE IF EXISTS customer_drivers CASCADE;

ALTER TABLE customers
    DROP COLUMN IF EXISTS customer_type,
    DROP COLUMN IF EXISTS first_name,
    DROP COLUMN IF EXISTS middle_name,
    DROP COLUMN IF EXISTS last_name,
    DROP COLUMN IF EXISTS preferred_name,
    DROP COLUMN IF EXISTS date_of_birth,
    DROP COLUMN IF EXISTS gender,
    DROP COLUMN IF EXISTS nationality,
    DROP COLUMN IF EXISTS customer_code,
    DROP COLUMN IF EXISTS profile_photo,
    DROP COLUMN IF EXISTS status,
    DROP COLUMN IF EXISTS secondary_phone,
    DROP COLUMN IF EXISTS country,
    DROP COLUMN IF EXISTS province,
    DROP COLUMN IF EXISTS district_city,
    DROP COLUMN IF EXISTS postal_code,
    DROP COLUMN IF EXISTS emergency_contact_name,
    DROP COLUMN IF EXISTS emergency_contact_relationship,
    DROP COLUMN IF EXISTS emergency_contact_phone,
    DROP COLUMN IF EXISTS billing_address,
    DROP COLUMN IF EXISTS company_name,
    DROP COLUMN IF EXISTS company_tax_id,
    DROP COLUMN IF EXISTS license_category,
    DROP COLUMN IF EXISTS rental_eligibility_status,
    DROP COLUMN IF EXISTS is_blacklisted,
    DROP COLUMN IF EXISTS blacklist_reason,
    DROP COLUMN IF EXISTS blacklisted_at,
    DROP COLUMN IF EXISTS blacklisted_by,
    DROP COLUMN IF EXISTS deleted_at;
