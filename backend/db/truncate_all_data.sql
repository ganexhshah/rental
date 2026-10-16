-- Truncate all operational data in Vehicle Rental SaaS Database
BEGIN;

TRUNCATE TABLE 
    notifications,
    notification_deliveries,
    automation_rules,
    audit_logs,
    system_activity_logs,
    contract_signatures,
    contracts,
    document_access_logs,
    documents,
    invoices,
    deposits,
    refund_requests,
    payments,
    damage_records,
    inspection_items,
    vehicle_inspections,
    maintenance_tasks,
    maintenance_schedules,
    maintenance_vendors,
    expenses,
    booking_status_history,
    booking_checklists,
    bookings,
    vehicle_documents,
    vehicles,
    customer_drivers,
    customer_documents,
    customer_activities,
    customers,
    coupons,
    marketing_campaigns,
    referral_codes
CASCADE;

COMMIT;

