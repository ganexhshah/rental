package maintenance

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/rental/backend/internal/document"
	"github.com/rental/backend/pkg/pagination"
)

var (
	ErrRecordNotFound = errors.New("maintenance record not found")
	ErrVendorNotFound = errors.New("maintenance vendor not found")
)

type Service struct {
	pool   *pgxpool.Pool
	docSvc *document.Service
}

func NewService(pool *pgxpool.Pool, docSvc *document.Service) *Service {
	return &Service{
		pool:   pool,
		docSvc: docSvc,
	}
}

func generateTaskNumber() string {
	b := make([]byte, 4)
	_, _ = rand.Read(b)
	return fmt.Sprintf("MNT-%s-%s", time.Now().Format("20060102"), strings.ToUpper(hex.EncodeToString(b)))
}

// Vendors
func (s *Service) CreateVendor(ctx context.Context, tenantID uuid.UUID, req CreateVendorRequest) (*MaintenanceVendor, error) {
	vID := uuid.New()
	query := `
		INSERT INTO maintenance_vendors (id, tenant_id, name, service_type, contact_phone, contact_email, address)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING id, tenant_id, name, service_type, COALESCE(contact_phone, ''), COALESCE(contact_email, ''), COALESCE(address, ''), created_at, updated_at
	`
	var v MaintenanceVendor
	err := s.pool.QueryRow(ctx, query, vID, tenantID, req.Name, req.ServiceType, req.ContactPhone, req.ContactEmail, req.Address).Scan(
		&v.ID, &v.TenantID, &v.Name, &v.ServiceType, &v.ContactPhone, &v.ContactEmail, &v.Address, &v.CreatedAt, &v.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	return &v, nil
}

func (s *Service) ListVendors(ctx context.Context, tenantID uuid.UUID) ([]MaintenanceVendor, error) {
	if s.pool == nil {
		return []MaintenanceVendor{
			{
				ID:           uuid.MustParse("11111111-2222-3333-4444-555555555551"),
				TenantID:     tenantID,
				Name:         "Apex Moto Care & Suspension Works",
				ServiceType:  "Engine & Mechanical",
				ContactPhone: "+977 1-4422331",
				ContactEmail: "service@apexmotocare.np",
				Address:      "Balaju Industrial Area, Kathmandu",
				CreatedAt:    time.Now().AddDate(0, -6, 0),
				UpdatedAt:    time.Now(),
			},
			{
				ID:           uuid.MustParse("11111111-2222-3333-4444-555555555552"),
				TenantID:     tenantID,
				Name:         "Himalayan Tyre & Alignment Centre",
				ServiceType:  "Tyres & Wheels",
				ContactPhone: "+977 1-4781200",
				ContactEmail: "support@himalayantyre.com",
				Address:      "Tinkune Ring Road, Kathmandu",
				CreatedAt:    time.Now().AddDate(0, -3, 0),
				UpdatedAt:    time.Now(),
			},
			{
				ID:           uuid.MustParse("11111111-2222-3333-4444-555555555553"),
				TenantID:     tenantID,
				Name:         "Pokhara 4x4 & Auto Workshop",
				ServiceType:  "SUV & Diesel Maintenance",
				ContactPhone: "+977 61-532100",
				ContactEmail: "workshop@pokhara4x4.np",
				Address:      "Airport Road, Pokhara",
				CreatedAt:    time.Now().AddDate(0, -2, 0),
				UpdatedAt:    time.Now(),
			},
		}, nil
	}
	query := `
		SELECT id, tenant_id, name, service_type, COALESCE(contact_phone, ''), COALESCE(contact_email, ''), COALESCE(address, ''), created_at, updated_at
		FROM maintenance_vendors
		WHERE tenant_id = $1
		ORDER BY name ASC
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]MaintenanceVendor, 0)
	for rows.Next() {
		var v MaintenanceVendor
		if err := rows.Scan(&v.ID, &v.TenantID, &v.Name, &v.ServiceType, &v.ContactPhone, &v.ContactEmail, &v.Address, &v.CreatedAt, &v.UpdatedAt); err == nil {
			list = append(list, v)
		}
	}
	return list, nil
}

// Records
func (s *Service) CreateRecord(ctx context.Context, tenantID uuid.UUID, req CreateRecordRequest) (*MaintenanceRecord, error) {
	taskNum := generateTaskNumber()
	rID := uuid.New()

	query := `
		INSERT INTO maintenance_records (
			id, tenant_id, vehicle_id, vendor_id, task_number, title, description,
			priority, status, estimated_cost, odometer_reading, scheduled_date
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7,
			$8, 'scheduled', $9, $10, $11
		)
		RETURNING id, created_at, updated_at
	`
	var rec MaintenanceRecord
	rec.ID = rID
	rec.TenantID = tenantID
	rec.VehicleID = req.VehicleID
	rec.VendorID = req.VendorID
	rec.TaskNumber = taskNum
	rec.Title = req.Title
	rec.Description = req.Description
	rec.Priority = req.Priority
	rec.Status = "scheduled"
	rec.EstimatedCost = req.EstimatedCost
	rec.OdometerReading = req.OdometerReading
	rec.ScheduledDate = req.ScheduledDate

	err := s.pool.QueryRow(
		ctx, query,
		rID, tenantID, req.VehicleID, req.VendorID, taskNum, req.Title, req.Description,
		req.Priority, req.EstimatedCost, req.OdometerReading, req.ScheduledDate,
	).Scan(&rec.CreatedAt, &rec.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Sync vehicle status to maintenance
	_, _ = s.pool.Exec(ctx, `UPDATE vehicles SET status = 'maintenance', updated_at = NOW() WHERE id = $1 AND tenant_id = $2`, req.VehicleID, tenantID)

	return &rec, nil
}

func (s *Service) CompleteRecord(ctx context.Context, tenantID, recordID uuid.UUID) error {
	var vehicleID uuid.UUID
	err := s.pool.QueryRow(ctx, `
		UPDATE maintenance_records
		SET status = 'completed', completed_date = NOW(), updated_at = NOW()
		WHERE id = $1 AND tenant_id = $2
		RETURNING vehicle_id
	`, recordID, tenantID).Scan(&vehicleID)
	if err != nil {
		return err
	}

	_, _ = s.pool.Exec(ctx, `UPDATE vehicles SET status = 'available', updated_at = NOW() WHERE id = $1 AND tenant_id = $2 AND status = 'maintenance'`, vehicleID, tenantID)
	return nil
}

func (s *Service) ListRecords(ctx context.Context, tenantID uuid.UUID, vehicleID *uuid.UUID, status string, p pagination.Params) ([]MaintenanceRecord, pagination.Meta, error) {
	if s.pool == nil {
		now := time.Now()
		vID := uuid.MustParse("11111111-1111-1111-1111-111111111111")
		if vehicleID != nil {
			vID = *vehicleID
		}
		vendorID := uuid.MustParse("11111111-2222-3333-4444-555555555551")
		odo1 := 5120
		odo2 := 18450
		records := []MaintenanceRecord{
			{
				ID:              uuid.MustParse("99999999-1111-2222-3333-444444444441"),
				TenantID:        tenantID,
				VehicleID:       vID,
				VehicleMake:     "Royal Enfield",
				VehicleModel:    "Himalayan 450",
				VehiclePlate:    "BA 22 PA 4501",
				VendorID:        &vendorID,
				VendorName:      "Apex Moto Care & Suspension Works",
				TaskNumber:      "MNT-20261015-A101",
				Title:           "Periodic 5,000 KM Engine Oil & Filter Service",
				Description:     "Replaced Motul 15W-50 fully synthetic engine oil, oil filter, chain lubed and adjusted.",
				Priority:        "medium",
				Status:          "scheduled",
				EstimatedCost:   4500,
				OdometerReading: &odo1,
				ScheduledDate:   now.AddDate(0, 0, 2),
				CreatedAt:       now.AddDate(0, 0, -1),
				UpdatedAt:       now,
			},
			{
				ID:              uuid.MustParse("99999999-1111-2222-3333-444444444442"),
				TenantID:        tenantID,
				VehicleID:       vID,
				VehicleMake:     "Mahindra",
				VehicleModel:    "Scorpio-N 4WD",
				VehiclePlate:    "BA 3 CHA 4402",
				VendorID:        &vendorID,
				VendorName:      "Pokhara 4x4 & Auto Workshop",
				TaskNumber:      "MNT-20261010-B202",
				Title:           "Brake Pad Replacement & Rotor Skimming",
				Description:     "Front ceramic brake pads replaced, brake fluid flush, rotor skimmed.",
				Priority:        "high",
				Status:          "completed",
				EstimatedCost:   12000,
				ActualCost:      11500,
				OdometerReading: &odo2,
				ScheduledDate:   now.AddDate(0, 0, -5),
				CompletedDate:   &now,
				CreatedAt:       now.AddDate(0, 0, -6),
				UpdatedAt:       now,
			},
		}
		return records, pagination.Meta{
			CurrentPage: 1,
			PerPage:     50,
			TotalItems:  int64(len(records)),
			TotalPages:  1,
		}, nil
	}

	where := "WHERE mr.tenant_id = $1"
	args := []any{tenantID}
	argIdx := 2

	if vehicleID != nil {
		where += fmt.Sprintf(" AND mr.vehicle_id = $%d", argIdx)
		args = append(args, *vehicleID)
		argIdx++
	}

	if status != "" {
		where += fmt.Sprintf(" AND mr.status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	var total int64
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM maintenance_records mr %s", where)
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, pagination.Meta{}, err
	}

	query := fmt.Sprintf(`
		SELECT mr.id, mr.tenant_id, mr.vehicle_id, v.make, v.model, v.plate_number,
		       mr.vendor_id, COALESCE(mv.name, ''), mr.task_number, mr.title, COALESCE(mr.description, ''),
		       mr.priority, mr.status, mr.estimated_cost, mr.actual_cost, mr.odometer_reading,
		       mr.scheduled_date, mr.completed_date, mr.created_at, mr.updated_at
		FROM maintenance_records mr
		JOIN vehicles v ON v.id = mr.vehicle_id
		LEFT JOIN maintenance_vendors mv ON mv.id = mr.vendor_id
		%s
		ORDER BY mr.scheduled_date DESC
		LIMIT $%d OFFSET $%d
	`, where, argIdx, argIdx+1)
	args = append(args, p.Limit, p.Offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, pagination.Meta{}, err
	}
	defer rows.Close()

	list := make([]MaintenanceRecord, 0)
	for rows.Next() {
		var mr MaintenanceRecord
		if err := rows.Scan(
			&mr.ID, &mr.TenantID, &mr.VehicleID, &mr.VehicleMake, &mr.VehicleModel, &mr.VehiclePlate,
			&mr.VendorID, &mr.VendorName, &mr.TaskNumber, &mr.Title, &mr.Description,
			&mr.Priority, &mr.Status, &mr.EstimatedCost, &mr.ActualCost, &mr.OdometerReading,
			&mr.ScheduledDate, &mr.CompletedDate, &mr.CreatedAt, &mr.UpdatedAt,
		); err != nil {
			return nil, pagination.Meta{}, err
		}
		list = append(list, mr)
	}

	return list, pagination.BuildMeta(total, p), nil
}

// Work Orders
func (s *Service) CreateWorkOrder(ctx context.Context, tenantID uuid.UUID, req CreateWorkOrderRequest) (*MaintenanceWorkOrder, error) {
	woNumber := fmt.Sprintf("WO-%s", generateTaskNumber()[4:])
	if s.docSvc != nil {
		seq, err := s.docSvc.GetNextSequenceNumber(ctx, tenantID, document.DocTypeMaintenanceWorkOrder, "WO", 6)
		if err == nil && seq != "" {
			woNumber = seq
		}
	}

	partsJSON := req.PartsList
	if len(partsJSON) == 0 {
		partsJSON = []byte("[]")
	}

	totalCost := req.LaborCost + req.PartsCost
	woID := uuid.New()

	query := `
		INSERT INTO maintenance_work_orders (
			id, tenant_id, maintenance_record_id, work_order_number,
			labor_cost, parts_cost, total_cost, parts_list, downtime_days, mechanic_notes, status
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'approved'
		)
		RETURNING id, created_at, updated_at
	`
	var wo MaintenanceWorkOrder
	wo.ID = woID
	wo.TenantID = tenantID
	wo.MaintenanceRecordID = req.MaintenanceRecordID
	wo.WorkOrderNumber = woNumber
	wo.LaborCost = req.LaborCost
	wo.PartsCost = req.PartsCost
	wo.TotalCost = totalCost
	wo.PartsList = partsJSON
	wo.DowntimeDays = req.DowntimeDays
	wo.MechanicNotes = req.MechanicNotes
	wo.Status = "approved"

	err := s.pool.QueryRow(
		ctx, query,
		woID, tenantID, req.MaintenanceRecordID, woNumber,
		req.LaborCost, req.PartsCost, totalCost, partsJSON, req.DowntimeDays, req.MechanicNotes,
	).Scan(&wo.CreatedAt, &wo.UpdatedAt)
	if err != nil {
		return nil, err
	}

	// Generate Printable Work Order PDF
	if s.docSvc != nil {
		doc, err := s.docSvc.CreateOrUpdateDocument(
			ctx, tenantID, document.DocTypeMaintenanceWorkOrder, woNumber, "Maintenance Work Order",
			"maintenance_work_order", woID, &document.DocumentPayload{
				TenantName:     "Vehicle Rental SaaS",
				Currency:       "NPR",
				CurrencySymbol: "Rs.",
				DocNumber:      woNumber,
				DocTitle:       "Maintenance Service Work Order",
				DateStr:        time.Now().Format("2006-01-02"),
				Subtotal:       totalCost,
				TotalAmount:    totalCost,
				Notes:          fmt.Sprintf("Labor: Rs. %.2f | Parts: Rs. %.2f | Est. Downtime: %d days. Notes: %s", req.LaborCost, req.PartsCost, req.DowntimeDays, req.MechanicNotes),
				Items: []document.DocumentLineItem{
					{Description: "Mechanic Labor Charges", Quantity: 1, UnitPrice: req.LaborCost, TotalPrice: req.LaborCost},
					{Description: "Replacement Parts & Supplies", Quantity: 1, UnitPrice: req.PartsCost, TotalPrice: req.PartsCost},
				},
			}, "fleet_service", false,
		)
		if err == nil && doc != nil {
			wo.DocumentID = &doc.ID
			_, _ = s.pool.Exec(ctx, `UPDATE maintenance_work_orders SET document_id = $1 WHERE id = $2`, doc.ID, woID)
			wo.DocumentURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, doc.ID, 30*time.Minute)
		}
	}

	return &wo, nil
}

func (s *Service) ListWorkOrders(ctx context.Context, tenantID uuid.UUID) ([]MaintenanceWorkOrder, error) {
	query := `
		SELECT id, tenant_id, maintenance_record_id, work_order_number, labor_cost, parts_cost, total_cost,
		       parts_list, downtime_days, COALESCE(mechanic_notes, ''), COALESCE(invoice_url, ''),
		       document_id, status, created_at, updated_at
		FROM maintenance_work_orders
		WHERE tenant_id = $1
		ORDER BY created_at DESC
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]MaintenanceWorkOrder, 0)
	for rows.Next() {
		var wo MaintenanceWorkOrder
		if err := rows.Scan(
			&wo.ID, &wo.TenantID, &wo.MaintenanceRecordID, &wo.WorkOrderNumber, &wo.LaborCost, &wo.PartsCost, &wo.TotalCost,
			&wo.PartsList, &wo.DowntimeDays, &wo.MechanicNotes, &wo.InvoiceURL,
			&wo.DocumentID, &wo.Status, &wo.CreatedAt, &wo.UpdatedAt,
		); err == nil {
			if wo.DocumentID != nil && s.docSvc != nil {
				wo.DocumentURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, *wo.DocumentID, 30*time.Minute)
			}
			list = append(list, wo)
		}
	}
	return list, nil
}

// Inspections
func (s *Service) CreateInspection(ctx context.Context, tenantID uuid.UUID, req CreateInspectionRequest) (*Inspection, error) {
	checklistJSON := req.ChecklistData
	if len(checklistJSON) == 0 {
		checklistJSON = []byte("{}")
	}
	photosJSON := req.Photos
	if len(photosJSON) == 0 {
		photosJSON = []byte("[]")
	}

	insID := uuid.New()
	query := `
		INSERT INTO inspections (
			id, tenant_id, booking_id, vehicle_id, inspection_type,
			odometer, fuel_level, checklist_data, exterior_notes, interior_notes,
			photos, customer_signature_url, staff_signature_url
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13
		)
		RETURNING id, created_at
	`
	var ins Inspection
	ins.ID = insID
	ins.TenantID = tenantID
	ins.BookingID = req.BookingID
	ins.VehicleID = req.VehicleID
	ins.InspectionType = req.InspectionType
	ins.Odometer = req.Odometer
	ins.FuelLevel = req.FuelLevel
	ins.ChecklistData = checklistJSON
	ins.ExteriorNotes = req.ExteriorNotes
	ins.InteriorNotes = req.InteriorNotes
	ins.Photos = photosJSON
	ins.CustomerSignatureURL = req.CustomerSignatureURL
	ins.StaffSignatureURL = req.StaffSignatureURL

	err := s.pool.QueryRow(
		ctx, query,
		insID, tenantID, req.BookingID, req.VehicleID, req.InspectionType,
		req.Odometer, req.FuelLevel, checklistJSON, req.ExteriorNotes, req.InteriorNotes,
		photosJSON, req.CustomerSignatureURL, req.StaffSignatureURL,
	).Scan(&ins.ID, &ins.CreatedAt)
	if err != nil {
		return nil, err
	}

	// Fetch vehicle & booking info
	_ = s.pool.QueryRow(ctx, "SELECT plate_number FROM vehicles WHERE id = $1", req.VehicleID).Scan(&ins.VehiclePlate)
	_ = s.pool.QueryRow(ctx, "SELECT booking_code FROM bookings WHERE id = $1", req.BookingID).Scan(&ins.BookingCode)

	// Generate Handover / Return Inspection Report PDF
	docType := document.DocTypeHandoverSheet
	title := "Vehicle Handover & Inspection Sheet"
	if req.InspectionType == "return" {
		docType = document.DocTypeReturnReport
		title = "Vehicle Return Inspection Report"
	}

	docNum := fmt.Sprintf("INSP-%s-%s", strings.ToUpper(req.InspectionType[:3]), insID.String()[:8])
	if s.docSvc != nil {
		doc, err := s.docSvc.CreateOrUpdateDocument(
			ctx, tenantID, docType, docNum, title,
			"inspection", insID, &document.DocumentPayload{
				TenantName:    "Vehicle Rental SaaS",
				DocNumber:     docNum,
				DocTitle:      title,
				DateStr:       ins.CreatedAt.Format("2006-01-02 15:04"),
				BookingCode:   ins.BookingCode,
				PlateNumber:   ins.VehiclePlate,
				Notes:         fmt.Sprintf("Odometer: %d km | Fuel Level: %s. Exterior: %s | Interior: %s", req.Odometer, req.FuelLevel, req.ExteriorNotes, req.InteriorNotes),
				SignatureData: req.CustomerSignatureURL,
				Items: []document.DocumentLineItem{
					{Description: fmt.Sprintf("Condition Assessment (%s)", req.InspectionType), Quantity: 1, UnitPrice: 0, TotalPrice: 0},
				},
			}, "inspection_service", false,
		)
		if err == nil && doc != nil {
			ins.DocumentID = &doc.ID
			_, _ = s.pool.Exec(ctx, `UPDATE inspections SET document_id = $1 WHERE id = $2`, doc.ID, insID)
			ins.DocumentURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, doc.ID, 30*time.Minute)
		}
	}

	return &ins, nil
}

func (s *Service) ListInspections(ctx context.Context, tenantID uuid.UUID, bookingID *uuid.UUID) ([]Inspection, error) {
	where := "WHERE i.tenant_id = $1"
	args := []any{tenantID}
	if bookingID != nil {
		where += " AND i.booking_id = $2"
		args = append(args, *bookingID)
	}

	query := fmt.Sprintf(`
		SELECT i.id, i.tenant_id, i.booking_id, COALESCE(b.booking_code, ''), i.vehicle_id, v.plate_number,
		       i.inspector_id, i.inspection_type, i.odometer, i.fuel_level, i.checklist_data,
		       COALESCE(i.exterior_notes, ''), COALESCE(i.interior_notes, ''), i.photos,
		       COALESCE(i.customer_signature_url, ''), COALESCE(i.staff_signature_url, ''),
		       i.document_id, i.created_at
		FROM inspections i
		JOIN vehicles v ON v.id = i.vehicle_id
		JOIN bookings b ON b.id = i.booking_id
		%s
		ORDER BY i.created_at DESC
	`, where)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]Inspection, 0)
	for rows.Next() {
		var ins Inspection
		if err := rows.Scan(
			&ins.ID, &ins.TenantID, &ins.BookingID, &ins.BookingCode, &ins.VehicleID, &ins.VehiclePlate,
			&ins.InspectorID, &ins.InspectionType, &ins.Odometer, &ins.FuelLevel, &ins.ChecklistData,
			&ins.ExteriorNotes, &ins.InteriorNotes, &ins.Photos,
			&ins.CustomerSignatureURL, &ins.StaffSignatureURL,
			&ins.DocumentID, &ins.CreatedAt,
		); err == nil {
			if ins.DocumentID != nil && s.docSvc != nil {
				ins.DocumentURL, _ = s.docSvc.GetSignedDownloadURL(ctx, tenantID, *ins.DocumentID, 30*time.Minute)
			}
			list = append(list, ins)
		}
	}
	return list, nil
}

// Damages
func (s *Service) CreateDamageRecord(ctx context.Context, tenantID uuid.UUID, req CreateDamageRequest) (*DamageRecord, error) {
	photosJSON := req.Photos
	if len(photosJSON) == 0 {
		photosJSON = []byte("[]")
	}

	dID := uuid.New()
	query := `
		INSERT INTO damage_records (
			id, tenant_id, vehicle_id, booking_id, inspection_id, description,
			category, severity, estimated_repair_cost, is_chargeable, photos
		) VALUES (
			$1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11
		)
		RETURNING id, created_at, updated_at
	`
	var d DamageRecord
	d.ID = dID
	d.TenantID = tenantID
	d.VehicleID = req.VehicleID
	d.BookingID = req.BookingID
	d.InspectionID = req.InspectionID
	d.Description = req.Description
	d.Category = req.Category
	d.Severity = req.Severity
	d.EstimatedRepairCost = req.EstimatedRepairCost
	d.IsChargeable = req.IsChargeable
	d.Photos = photosJSON

	err := s.pool.QueryRow(
		ctx, query,
		dID, tenantID, req.VehicleID, req.BookingID, req.InspectionID, req.Description,
		req.Category, req.Severity, req.EstimatedRepairCost, req.IsChargeable, photosJSON,
	).Scan(&d.CreatedAt, &d.UpdatedAt)
	if err != nil {
		return nil, err
	}

	_ = s.pool.QueryRow(ctx, "SELECT plate_number FROM vehicles WHERE id = $1", req.VehicleID).Scan(&d.VehiclePlate)

	return &d, nil
}

func (s *Service) ListDamages(ctx context.Context, tenantID uuid.UUID, vehicleID *uuid.UUID) ([]DamageRecord, error) {
	where := "WHERE dr.tenant_id = $1"
	args := []any{tenantID}
	if vehicleID != nil {
		where += " AND dr.vehicle_id = $2"
		args = append(args, *vehicleID)
	}

	query := fmt.Sprintf(`
		SELECT dr.id, dr.tenant_id, dr.vehicle_id, v.plate_number, dr.booking_id, dr.inspection_id,
		       dr.description, dr.category, dr.severity, dr.photos, dr.estimated_repair_cost,
		       dr.is_chargeable, dr.customer_acknowledged, dr.customer_acknowledged_at,
		       dr.invoice_id, dr.maintenance_record_id, dr.is_repaired, dr.created_at, dr.updated_at
		FROM damage_records dr
		JOIN vehicles v ON v.id = dr.vehicle_id
		%s
		ORDER BY dr.created_at DESC
	`, where)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]DamageRecord, 0)
	for rows.Next() {
		var d DamageRecord
		if err := rows.Scan(
			&d.ID, &d.TenantID, &d.VehicleID, &d.VehiclePlate, &d.BookingID, &d.InspectionID,
			&d.Description, &d.Category, &d.Severity, &d.Photos, &d.EstimatedRepairCost,
			&d.IsChargeable, &d.CustomerAcknowledged, &d.CustomerAcknowledgedAt,
			&d.InvoiceID, &d.MaintenanceRecordID, &d.IsRepaired, &d.CreatedAt, &d.UpdatedAt,
		); err == nil {
			list = append(list, d)
		}
	}
	return list, nil
}

// Preventive Schedules
func (s *Service) ListPreventiveSchedules(ctx context.Context, tenantID uuid.UUID) ([]PreventiveSchedule, error) {
	query := `
		SELECT ps.id, ps.tenant_id, ps.vehicle_id, v.plate_number, ps.service_type,
		       ps.interval_km, ps.interval_months, ps.last_service_km, ps.last_service_date,
		       ps.next_due_km, ps.next_due_date, ps.is_active, ps.created_at, ps.updated_at
		FROM preventive_schedules ps
		JOIN vehicles v ON v.id = ps.vehicle_id
		WHERE ps.tenant_id = $1
		ORDER BY ps.next_due_date ASC NULLS LAST
	`
	rows, err := s.pool.Query(ctx, query, tenantID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	list := make([]PreventiveSchedule, 0)
	for rows.Next() {
		var ps PreventiveSchedule
		if err := rows.Scan(
			&ps.ID, &ps.TenantID, &ps.VehicleID, &ps.VehiclePlate, &ps.ServiceType,
			&ps.IntervalKM, &ps.IntervalMonths, &ps.LastServiceKM, &ps.LastServiceDate,
			&ps.NextDueKM, &ps.NextDueDate, &ps.IsActive, &ps.CreatedAt, &ps.UpdatedAt,
		); err == nil {
			list = append(list, ps)
		}
	}
	return list, nil
}
