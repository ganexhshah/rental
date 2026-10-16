package document

import (
	"bytes"
	"fmt"
	"strings"

	"github.com/phpdave11/gofpdf"
)

type PDFRenderer struct{}

func NewPDFRenderer() *PDFRenderer {
	return &PDFRenderer{}
}

func (r *PDFRenderer) Render(payload *DocumentPayload) ([]byte, error) {
	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.SetMargins(15, 15, 15)
	pdf.SetAutoPageBreak(true, 15)
	pdf.AddPage()

	// Theme colors
	primaryR, primaryG, primaryB := 31, 78, 121
	lightGrayR, lightGrayG, lightGrayB := 245, 247, 250
	textDarkR, textDarkG, textDarkB := 30, 41, 59
	textMutedR, textMutedG, textMutedB := 100, 116, 139

	// 1. Header Banner
	pdf.SetFillColor(primaryR, primaryG, primaryB)
	pdf.Rect(15, 15, 180, 22, "F")

	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 16)
	pdf.SetXY(20, 19)
	pdf.Cell(100, 8, payload.TenantName)

	pdf.SetFont("Arial", "B", 14)
	pdf.SetXY(120, 19)
	title := strings.ToUpper(payload.DocTitle)
	if title == "" {
		title = "DOCUMENT"
	}
	pdf.CellFormat(70, 8, title, "", 0, "R", false, 0, "")

	pdf.SetFont("Arial", "", 8)
	pdf.SetXY(20, 27)
	companyInfo := fmt.Sprintf("%s | Phone: %s | Email: %s", payload.TenantAddress, payload.TenantPhone, payload.TenantEmail)
	if payload.TenantTaxID != "" {
		companyInfo += fmt.Sprintf(" | Tax ID: %s", payload.TenantTaxID)
	}
	pdf.Cell(170, 6, companyInfo)

	pdf.Ln(18)

	// 2. Document & Customer Meta Block
	startY := 42.0
	pdf.SetFillColor(lightGrayR, lightGrayG, lightGrayB)
	pdf.Rect(15, startY, 88, 38, "F")
	pdf.Rect(107, startY, 88, 38, "F")

	// Left box: Customer Details
	pdf.SetTextColor(primaryR, primaryG, primaryB)
	pdf.SetFont("Arial", "B", 10)
	pdf.SetXY(18, startY+3)
	pdf.Cell(80, 5, "CLIENT / RENTER DETAILS")

	pdf.SetTextColor(textDarkR, textDarkG, textDarkB)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(18, startY+9)
	pdf.Cell(80, 5, payload.CustomerName)

	pdf.SetFont("Arial", "", 8)
	pdf.SetXY(18, startY+14)
	if payload.CustomerPhone != "" {
		pdf.Cell(80, 4, fmt.Sprintf("Phone: %s", payload.CustomerPhone))
	}
	pdf.SetXY(18, startY+18)
	if payload.CustomerEmail != "" {
		pdf.Cell(80, 4, fmt.Sprintf("Email: %s", payload.CustomerEmail))
	}
	pdf.SetXY(18, startY+22)
	if payload.CustomerAddress != "" {
		pdf.MultiCell(82, 3.5, fmt.Sprintf("Address: %s", payload.CustomerAddress), "", "L", false)
	}

	// Right box: Document & Booking Details
	pdf.SetTextColor(primaryR, primaryG, primaryB)
	pdf.SetFont("Arial", "B", 10)
	pdf.SetXY(110, startY+3)
	pdf.Cell(80, 5, "REFERENCE DETAILS")

	pdf.SetTextColor(textDarkR, textDarkG, textDarkB)
	pdf.SetFont("Arial", "", 8)

	pdf.SetXY(110, startY+9)
	pdf.Cell(30, 4, "Document #:")
	pdf.SetFont("Arial", "B", 8)
	pdf.Cell(50, 4, payload.DocNumber)

	pdf.SetFont("Arial", "", 8)
	pdf.SetXY(110, startY+14)
	pdf.Cell(30, 4, "Date:")
	pdf.Cell(50, 4, payload.DateStr)

	if payload.DueDateStr != "" {
		pdf.SetXY(110, startY+18)
		pdf.Cell(30, 4, "Due Date:")
		pdf.Cell(50, 4, payload.DueDateStr)
	}

	if payload.BookingCode != "" {
		pdf.SetXY(110, startY+22)
		pdf.Cell(30, 4, "Booking Code:")
		pdf.SetFont("Arial", "B", 8)
		pdf.Cell(50, 4, payload.BookingCode)
	}

	if payload.VehicleInfo != "" {
		pdf.SetFont("Arial", "", 8)
		pdf.SetXY(110, startY+26)
		pdf.Cell(30, 4, "Vehicle:")
		vehicleStr := payload.VehicleInfo
		if payload.PlateNumber != "" {
			vehicleStr += fmt.Sprintf(" [%s]", payload.PlateNumber)
		}
		pdf.Cell(50, 4, vehicleStr)
	}

	if payload.RentalPeriod != "" {
		pdf.SetXY(110, startY+30)
		pdf.Cell(30, 4, "Rental Period:")
		pdf.Cell(50, 4, payload.RentalPeriod)
	}

	pdf.Ln(44)

	// 3. Line Items Table Header
	currentY := 84.0
	pdf.SetFillColor(primaryR, primaryG, primaryB)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 8)

	pdf.SetXY(15, currentY)
	pdf.CellFormat(90, 7, "DESCRIPTION", "1", 0, "L", true, 0, "")
	pdf.CellFormat(25, 7, "QTY", "1", 0, "C", true, 0, "")
	pdf.CellFormat(30, 7, "RATE ("+payload.Currency+")", "1", 0, "R", true, 0, "")
	pdf.CellFormat(35, 7, "AMOUNT ("+payload.Currency+")", "1", 0, "R", true, 0, "")

	currentY += 7.0
	pdf.SetTextColor(textDarkR, textDarkG, textDarkB)
	pdf.SetFont("Arial", "", 8)

	for i, item := range payload.Items {
		if currentY > 240 {
			pdf.AddPage()
			currentY = 20
		}

		if i%2 == 1 {
			pdf.SetFillColor(lightGrayR, lightGrayG, lightGrayB)
		} else {
			pdf.SetFillColor(255, 255, 255)
		}

		pdf.SetXY(15, currentY)
		pdf.CellFormat(90, 6.5, " "+item.Description, "1", 0, "L", true, 0, "")
		pdf.CellFormat(25, 6.5, fmt.Sprintf("%d", item.Quantity), "1", 0, "C", true, 0, "")
		pdf.CellFormat(30, 6.5, fmt.Sprintf("%.2f ", item.UnitPrice), "1", 0, "R", true, 0, "")
		pdf.CellFormat(35, 6.5, fmt.Sprintf("%.2f ", item.TotalPrice), "1", 0, "R", true, 0, "")

		currentY += 6.5
	}

	// 4. Financial Totals Section
	currentY += 3.0
	if currentY > 220 {
		pdf.AddPage()
		currentY = 20
	}

	totX := 115.0
	totW := 45.0
	valW := 35.0

	// Subtotal
	pdf.SetFont("Arial", "", 8)
	pdf.SetXY(totX, currentY)
	pdf.Cell(totW, 5, "Subtotal:")
	pdf.CellFormat(valW, 5, fmt.Sprintf("%s %.2f", payload.CurrencySymbol, payload.Subtotal), "", 0, "R", false, 0, "")
	currentY += 5

	if payload.DiscountAmount > 0 {
		pdf.SetXY(totX, currentY)
		pdf.Cell(totW, 5, "Discount:")
		pdf.CellFormat(valW, 5, fmt.Sprintf("- %s %.2f", payload.CurrencySymbol, payload.DiscountAmount), "", 0, "R", false, 0, "")
		currentY += 5
	}

	if payload.TaxAmount > 0 {
		pdf.SetXY(totX, currentY)
		ratePct := payload.TaxRate
		if ratePct > 0 && ratePct <= 1.0 {
			ratePct = ratePct * 100.0
		}
		pdf.Cell(totW, 5, fmt.Sprintf("Tax (VAT/GST %.0f%%):", ratePct))
		pdf.CellFormat(valW, 5, fmt.Sprintf("+ %s %.2f", payload.CurrencySymbol, payload.TaxAmount), "", 0, "R", false, 0, "")
		currentY += 5
	}

	// Grand Total
	pdf.SetFillColor(primaryR, primaryG, primaryB)
	pdf.SetTextColor(255, 255, 255)
	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(totX-2, currentY)
	pdf.CellFormat(87, 7, fmt.Sprintf(" TOTAL: %s %.2f", payload.CurrencySymbol, payload.TotalAmount), "", 0, "R", true, 0, "")
	currentY += 8

	pdf.SetTextColor(textDarkR, textDarkG, textDarkB)
	pdf.SetFont("Arial", "", 8)

	if payload.PaidAmount > 0 {
		pdf.SetXY(totX, currentY)
		pdf.Cell(totW, 5, "Paid Amount:")
		pdf.CellFormat(valW, 5, fmt.Sprintf("%s %.2f", payload.CurrencySymbol, payload.PaidAmount), "", 0, "R", false, 0, "")
		currentY += 5
	}

	pdf.SetFont("Arial", "B", 9)
	pdf.SetXY(totX, currentY)
	pdf.Cell(totW, 5, "Balance Due:")
	pdf.CellFormat(valW, 5, fmt.Sprintf("%s %.2f", payload.CurrencySymbol, payload.BalanceDue), "", 0, "R", false, 0, "")
	currentY += 9

	// 5. Notes & Terms
	pdf.SetTextColor(textDarkR, textDarkG, textDarkB)
	if payload.Notes != "" {
		pdf.SetFont("Arial", "B", 8)
		pdf.SetXY(15, currentY)
		pdf.Cell(180, 4, "Notes & Instructions:")
		currentY += 4
		pdf.SetFont("Arial", "", 7.5)
		pdf.SetXY(15, currentY)
		pdf.MultiCell(180, 3.5, payload.Notes, "", "L", false)
		currentY = pdf.GetY() + 3
	}

	if payload.Terms != "" {
		pdf.SetFont("Arial", "B", 8)
		pdf.SetXY(15, currentY)
		pdf.Cell(180, 4, "Terms & Conditions:")
		currentY += 4
		pdf.SetFont("Arial", "", 7.5)
		pdf.SetXY(15, currentY)
		pdf.MultiCell(180, 3.5, payload.Terms, "", "L", false)
		currentY = pdf.GetY() + 3
	}

	// 6. Signatures & Audit Seal Footer
	if currentY > 235 {
		pdf.AddPage()
		currentY = 20
	}

	pdf.SetXY(15, currentY+10)
	pdf.SetFont("Arial", "", 8)

	// Authorized Stamp / Signature line
	pdf.SetXY(20, currentY+8)
	pdf.Cell(60, 4, "Authorized Signature & Stamp")
	pdf.Line(20, currentY+22, 80, currentY+22)

	// Customer Acceptance line
	pdf.SetXY(130, currentY+8)
	if payload.SignerName != "" {
		pdf.Cell(60, 4, fmt.Sprintf("Signed by: %s", payload.SignerName))
	} else {
		pdf.Cell(60, 4, "Customer Acceptance & Signature")
	}
	pdf.Line(130, currentY+22, 190, currentY+22)

	// Immutable audit footer
	pdf.SetTextColor(textMutedR, textMutedG, textMutedB)
	pdf.SetFont("Arial", "I", 7)
	pdf.SetXY(15, 282)
	pdf.Cell(180, 4, fmt.Sprintf("System Generated Official Record | Document #%s | Tenant: %s | Verifiable Audit Copy", payload.DocNumber, payload.TenantName))

	var buf bytes.Buffer
	if err := pdf.Output(&buf); err != nil {
		return nil, fmt.Errorf("failed to output PDF: %w", err)
	}

	return buf.Bytes(), nil
}
