package document

import (
	"strings"
	"testing"
)

func TestPDFRenderer_Render(t *testing.T) {
	renderer := NewPDFRenderer()

	payload := &DocumentPayload{
		TenantName:     "Himalayan Rides Nepal",
		TenantAddress:  "Durbar Marg 450, Kathmandu",
		TenantPhone:    "+977-1-4200000",
		TenantEmail:    "ops@himalayanrides.com",
		DocTitle:       "Official Invoice",
		DocNumber:      "INV-2026-0001",
		DateStr:        "2026-10-10",
		DueDateStr:     "2026-10-15",
		CustomerName:   "Aarav Sharma",
		CustomerEmail:  "aarav@example.com",
		CustomerPhone:  "+977-9812345678",
		BookingCode:    "BK-20261010-001",
		VehicleInfo:    "Mahindra Scorpio 4x4",
		PlateNumber:    "BA 2 PA 5678",
		RentalPeriod:   "2026-10-10 to 2026-10-15",
		Currency:       "NPR",
		CurrencySymbol: "Rs.",
		Subtotal:       25000.0,
		TaxRate:        0.13,
		TaxAmount:      3250.0,
		DiscountAmount: 1000.0,
		TotalAmount:    27250.0,
		PaidAmount:     10000.0,
		BalanceDue:     17250.0,
		Notes:          "Please return vehicle with full fuel tank.",
		Terms:          "Vehicle must be driven within designated national territories.",
		Items: []DocumentLineItem{
			{Description: "5-Day Rental Package", Quantity: 5, UnitPrice: 5000.0, TotalPrice: 25000.0},
		},
	}

	pdfBytes, err := renderer.Render(payload)
	if err != nil {
		t.Fatalf("unexpected error rendering PDF: %v", err)
	}

	if len(pdfBytes) == 0 {
		t.Fatalf("expected non-empty PDF bytes, got 0")
	}

	// Verify standard PDF header magic bytes
	header := string(pdfBytes[:8])
	if !strings.HasPrefix(header, "%PDF-") {
		t.Errorf("expected PDF header starting with %%PDF-, got %q", header)
	}
}
