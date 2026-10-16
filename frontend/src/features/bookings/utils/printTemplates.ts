import { mockDb } from '@/lib/api/mockDb'
import type { Booking } from '@/types/booking'
import type { Vehicle } from '@/types/vehicle'
import type { Customer } from '@/types/customer'

export interface CollateralPrintDetails {
  collateralType?: 'bank_cheque' | 'cash_card' | 'original_document' | 'guarantor_only' | 'waived'
  depositAmount?: number
  isBlankCheque?: boolean
  chequeAmount?: number
  chequeBankName?: string
  chequeNumber?: string
  chequeAccountHolder?: string
  chequePhotoUrl?: string
  originalDocType?: string
  originalDocNumber?: string
  lockerReference?: string
  hasGuarantor?: boolean
  guarantorName?: string
  guarantorPhone?: string
  guarantorRelationship?: string
  guarantorIdNumber?: string
  guarantorAddress?: string
  guarantorPhotoUrl?: string
  notes?: string
}

export function getCompanyBranding() {
  const comp = mockDb.get('companySettings') || {}
  return {
    name: comp.name || comp.branding?.companyName || 'Himalayan Rides Nepal Pvt. Ltd.',
    registrationNumber: comp.registrationNumber || 'REG-2026-KTM',
    taxId: comp.taxId || 'PAN: 601234567',
    headquartersAddress: comp.headquartersAddress || 'Thamel Marg, Kathmandu, Nepal',
    city: comp.city || 'Kathmandu',
    country: comp.country || 'Nepal',
    phone: comp.phone || comp.branding?.publicSupportPhone || '+977-1-4700000',
    email: comp.email || comp.branding?.publicSupportEmail || 'operations@himalayanrides.com',
    logoUrl: comp.logoUrl || comp.branding?.logoUrl || '/favicon.svg',
  }
}

// Clean vector SVG icons for high-resolution print documents (no emojis)
const PRINT_ICONS = {
  location: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:4px;color:#2563eb;"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`,
  phone: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:4px;color:#2563eb;"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,
  email: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:4px;color:#2563eb;"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>`,
  shield: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:4px;color:#2563eb;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
  certificate: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:4px;color:#2563eb;"><circle cx="12" cy="8" r="6"/><path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11"/></svg>`,
  document: `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-2px;margin-right:5px;color:#0f172a;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>`,
  tag: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:4px;color:#475569;"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>`,
  bookmark: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:4px;color:#475569;"><path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/></svg>`,
  calendar: `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:inline-block;vertical-align:-1px;margin-right:4px;color:#475569;"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>`,
}

function launchPrintDocument(
  docType: 'agreement' | 'invoice' | 'handover',
  payload: any,
  html: string
) {
  try {
    localStorage.setItem('rental_print_payload', JSON.stringify({ ...payload, docType }))
  } catch (_) {}

  // Open self-contained document window directly without routing through Vite dev server
  const printWindow = window.open('', '_blank', 'width=950,height=1000')

  if (!printWindow) {
    alert('Please allow popups in your browser to view and print documents.')
    return
  }

  // Inject auto-print script so document automatically triggers print dialog upon rendering
  const autoPrintScript = `
    <script>
      window.addEventListener('DOMContentLoaded', function() {
        setTimeout(function() { window.print(); }, 400);
      });
      setTimeout(function() {
        try { window.print(); } catch(e) {}
      }, 800);
    </script>
  `
  const finalHtml = html.includes('</body>')
    ? html.replace('</body>', `${autoPrintScript}</body>`)
    : `${html}${autoPrintScript}`

  printWindow.document.open()
  printWindow.document.write(finalHtml)
  printWindow.document.close()
  printWindow.focus()
}

/**
 * 1. Official Vehicle Rental Agreement
 */
export function printBookingAgreement(
  booking: Booking,
  vehicle?: Vehicle | null,
  customer?: Customer | null,
  collateral?: CollateralPrintDetails
) {
  const company = getCompanyBranding()
  const cust: any = customer || {}
  const veh: any = vehicle || {}
  const bk: any = booking || {}
  const contractNo = `CTR-${bk.bookingCode || '001'}`
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const startStr = bk.startDate ? new Date(bk.startDate).toLocaleString('en-GB') : 'N/A'
  const endStr = bk.endDate ? new Date(bk.endDate).toLocaleString('en-GB') : 'N/A'

  const colType = collateral?.collateralType || 'bank_cheque'
  const depositAmt = collateral?.depositAmount ?? bk.depositAmount ?? 15000

  let collateralHtml = ''
  if (colType === 'bank_cheque') {
    const isBlank = collateral?.isBlankCheque !== false
    const chequeAmtStr = isBlank
      ? 'Blank Cheque (Security Collateral)'
      : `NPR ${(collateral?.chequeAmount || depositAmt).toLocaleString()}`

    collateralHtml = `
      <div class="section">
        <div class="section-heading">Security Deposit & Bank Cheque Guarantee</div>
        <table class="grid-table">
          <tr>
            <td class="lbl">Collateral Type:</td>
            <td>Bank Cheque Guarantee</td>
            <td class="lbl">Cheque Amount:</td>
            <td><strong>${chequeAmtStr}</strong></td>
          </tr>
          <tr>
            <td class="lbl">Bank Name:</td>
            <td>${collateral?.chequeBankName || 'Nabil Bank Ltd.'}</td>
            <td class="lbl">Cheque Number:</td>
            <td style="font-family: monospace;">${collateral?.chequeNumber || '-'}</td>
          </tr>
          <tr>
            <td class="lbl">Account Holder:</td>
            <td>${collateral?.chequeAccountHolder || customer?.fullName || booking.customerName}</td>
            <td class="lbl">Refundable Cash Deposit:</td>
            <td>NPR ${depositAmt.toLocaleString()}</td>
          </tr>
        </table>
        <p class="terms-note">
          <strong>Security Guarantee Clause:</strong> The Hirer has submitted the above bank cheque as collateral for the due performance of this agreement, safe return of the vehicle, and settlement of any fines or damages. The cheque will be returned upon completion of post-rental vehicle inspection.
        </p>
      </div>
    `
  } else if (colType === 'cash_card') {
    collateralHtml = `
      <div class="section">
        <div class="section-heading">Security Deposit</div>
        <table class="grid-table">
          <tr>
            <td class="lbl">Deposit Type:</td>
            <td>Cash / Card Authorization Hold</td>
            <td class="lbl">Deposit Amount:</td>
            <td><strong>NPR ${depositAmt.toLocaleString()}</strong></td>
          </tr>
        </table>
        <p class="terms-note">
          Deposit will be refunded upon return inspection, subject to deductions for fuel deficit, excess mileage, or damages.
        </p>
      </div>
    `
  } else if (colType === 'original_document') {
    collateralHtml = `
      <div class="section">
        <div class="section-heading">Document Deposit</div>
        <table class="grid-table">
          <tr>
            <td class="lbl">Document Held:</td>
            <td>${collateral?.originalDocType || 'Original Passport'}</td>
            <td class="lbl">Document / ID No:</td>
            <td style="font-family: monospace;">${collateral?.originalDocNumber || '-'}</td>
          </tr>
          <tr>
            <td class="lbl">Vault Reference:</td>
            <td>${collateral?.lockerReference || 'Safe Locker'}</td>
            <td class="lbl">Deposit Amount:</td>
            <td>NPR ${depositAmt.toLocaleString()}</td>
          </tr>
        </table>
      </div>
    `
  } else {
    collateralHtml = `
      <div class="section">
        <div class="section-heading">Security Deposit</div>
        <table class="grid-table">
          <tr>
            <td class="lbl">Deposit Status:</td>
            <td>Waived / Corporate Account</td>
            <td class="lbl">Agreed Deposit:</td>
            <td>NPR ${depositAmt.toLocaleString()}</td>
          </tr>
        </table>
      </div>
    `
  }

  let guarantorHtml = ''
  if (collateral?.hasGuarantor && collateral?.guarantorName) {
    guarantorHtml = `
      <div class="section">
        <div class="section-heading">Guarantor Information</div>
        <table class="grid-table">
          <tr>
            <td class="lbl">Guarantor Name:</td>
            <td><strong>${collateral.guarantorName}</strong></td>
            <td class="lbl">Relationship:</td>
            <td>${collateral.guarantorRelationship || 'Relative'}</td>
          </tr>
          <tr>
            <td class="lbl">Phone Number:</td>
            <td>${collateral.guarantorPhone || '-'}</td>
            <td class="lbl">Citizenship / ID No:</td>
            <td style="font-family: monospace;">${collateral.guarantorIdNumber || '-'}</td>
          </tr>
          <tr>
            <td class="lbl">Address:</td>
            <td colspan="3">${collateral.guarantorAddress || '-'}</td>
          </tr>
        </table>
      </div>
    `
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${contractNo} - Rental Agreement</title>
        <style>
          @page { size: A4; margin: 12mm 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 24px;
            font-size: 12px;
            line-height: 1.5;
          }
          .toolbar {
            max-width: 800px;
            margin: 0 auto 16px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .btn-print {
            background: #0f172a;
            color: #ffffff;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }
          .btn-print:hover { background: #334155; }
          .document {
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 32px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 18px;
          }
          .company-title {
            font-size: 18px;
            font-weight: 700;
            color: #0f172a;
            margin: 0 0 4px 0;
          }
          .company-details {
            font-size: 11px;
            color: #64748b;
          }
          .doc-meta {
            text-align: right;
          }
          .doc-title {
            font-size: 15px;
            font-weight: 700;
            color: #0f172a;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          .doc-sub {
            font-size: 11px;
            color: #64748b;
            margin-top: 4px;
          }
          .section {
            margin-bottom: 16px;
          }
          .section-heading {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            color: #0f172a;
            padding-bottom: 4px;
            border-bottom: 1px solid #cbd5e1;
            margin-bottom: 8px;
            letter-spacing: 0.3px;
          }
          .grid-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 11.5px;
          }
          .grid-table td {
            padding: 6px 8px;
            border: 1px solid #e2e8f0;
          }
          .grid-table .lbl {
            width: 22%;
            color: #475569;
            font-weight: 600;
            background: #f8fafc;
          }
          .terms-note {
            font-size: 10.5px;
            color: #475569;
            line-height: 1.5;
            margin: 6px 0 0 0;
          }
          .terms-list {
            font-size: 10.5px;
            color: #475569;
            padding-left: 18px;
            margin: 4px 0 0 0;
            line-height: 1.45;
          }
          .terms-list li {
            margin-bottom: 3px;
          }
          .signatures {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 16px;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
          }
          .sig-card {
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 10px;
            min-height: 85px;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }
          .sig-head {
            font-size: 11px;
            font-weight: 600;
            color: #0f172a;
            border-bottom: 1px solid #f1f5f9;
            padding-bottom: 4px;
          }
          .sig-foot {
            font-size: 10px;
            color: #64748b;
          }
          @media print {
            @page { size: A4 portrait; margin: 10mm 12mm; }
            html, body { background: #fff !important; height: auto !important; overflow: visible !important; padding: 0 !important; }
            .toolbar { display: none !important; }
            .document { border: none !important; padding: 0 !important; box-shadow: none !important; max-width: 100% !important; }
            .section { page-break-inside: avoid; break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <span style="font-weight: 600; font-size: 13px;">Rental Agreement Preview (${contractNo})</span>
          <button class="btn-print" onclick="window.print()">Print Agreement</button>
        </div>

          <div class="header" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 18px; gap: 16px;">
            <div style="display: flex; align-items: flex-start; gap: 14px;">
              <img src="${company.logoUrl || '/favicon.svg'}" alt="Logo" style="max-height: 48px; max-width: 120px; object-fit: contain; border-radius: 6px;" onerror="this.style.display='none'" />
              <div>
                <div class="company-title" style="font-size: 17px; font-weight: 800; text-transform: uppercase; margin: 0; color: #0f172a;">${company.name}</div>
                <div style="font-size: 11px; font-weight: 600; color: #2563eb; text-transform: uppercase; margin-top: 2px;">Motorcycle Rental Agreement • Terms & Conditions</div>
                <div class="company-details" style="font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.5;">
                  ${PRINT_ICONS.location} ${company.headquartersAddress} &bull; ${PRINT_ICONS.phone} ${company.phone} &bull; ${PRINT_ICONS.email} ${company.email}<br/>
                  ${PRINT_ICONS.shield} ${company.taxId} &bull; ${PRINT_ICONS.certificate} Reg: ${company.registrationNumber || 'Standard'}
                </div>
              </div>
            </div>
            <div class="doc-meta" style="text-align: right;">
              <div class="doc-title" style="display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 800; color: #0f172a;">${PRINT_ICONS.document} MOTORCYCLE AGREEMENT</div>
              <div class="doc-sub" style="font-size: 11px; color: #475569; margin-top: 6px; line-height: 1.5;">
                ${PRINT_ICONS.tag} Contract No: <strong>${contractNo}</strong><br/>
                ${PRINT_ICONS.bookmark} Booking Ref: <strong>${booking.bookingCode}</strong><br/>
                ${PRINT_ICONS.calendar} Date: <strong>${formattedDate}</strong>
              </div>
            </div>
          </div>

          <!-- AGREEMENT INFORMATION -->
          <div class="section">
            <div class="section-heading">AGREEMENT INFORMATION</div>
            <table class="grid-table">
              <tr>
                <td class="lbl">Agreement Number:</td>
                <td><strong>${contractNo}</strong></td>
                <td class="lbl">Booking ID:</td>
                <td><strong>${booking.bookingCode || '______________________________'}</strong></td>
              </tr>
              <tr>
                <td class="lbl">Agreement Date:</td>
                <td>${formattedDate}</td>
                <td class="lbl">Agreement Location:</td>
                <td>${booking.pickupLocationName || company.city || 'Kathmandu, Nepal'}</td>
              </tr>
            </table>
            <p class="terms-note" style="font-style: italic; margin-top: 6px;">
              This Motorcycle Rental Agreement (&quot;Agreement&quot;) is made between the Rental Company (&quot;Owner&quot;) and the Customer (&quot;Renter&quot;) identified below. Both parties agree to comply with the following terms and conditions.
            </p>
          </div>

          <!-- 1. RENTAL COMPANY INFORMATION -->
          <div class="section">
            <div class="section-heading">1. RENTAL COMPANY INFORMATION</div>
            <div style="font-size: 11.5px; line-height: 1.8; color: #1e293b; padding: 4px 0;">
              <div><strong>Company Name:</strong> ${company.name || '___________________________________________'}</div>
              <div><strong>Authorized Representative:</strong> Fleet Operations Officer</div>
              <div><strong>Business Address:</strong> ${company.headquartersAddress || '_________________________________________'}</div>
              <div><strong>Contact Number:</strong> ${company.phone || '__________________________________________'}</div>
              <div><strong>Email Address:</strong> ${company.email || '___________________________________________'}</div>
            </div>
          </div>

          <!-- 2. CUSTOMER INFORMATION -->
          <div class="section">
            <div class="section-heading">2. CUSTOMER INFORMATION</div>
            <table class="grid-table">
              <tr>
                <td class="lbl">Full Legal Name:</td>
                <td><strong>${cust?.fullName || bk.customerName || ''}</strong></td>
                <td class="lbl">Date of Birth:</td>
                <td>${cust?.dob || cust?.dateOfBirth || ''}</td>
              </tr>
              <tr>
                <td class="lbl">Permanent Address:</td>
                <td>${cust?.permanentAddress || cust?.address || ''}</td>
                <td class="lbl">Current Address:</td>
                <td>${cust?.currentAddress || cust?.address || ''}</td>
              </tr>
              <tr>
                <td class="lbl">Contact Number:</td>
                <td><strong>${cust?.phone || bk.customerPhone || ''}</strong></td>
                <td class="lbl">Email Address:</td>
                <td>${cust?.email || ''}</td>
              </tr>
              <tr>
                <td class="lbl">Citizenship / Passport Type:</td>
                <td>${cust?.originType === 'international' || cust?.isInternational ? `Passport (${cust?.nationality || 'Foreign'})` : cust?.nationality ? `Nepali Citizenship (${cust.nationality})` : ''}</td>
                <td class="lbl">Citizenship / Passport Number:</td>
                <td style="font-family: monospace;">${cust?.passportNumber || cust?.citizenshipNumber || ''}</td>
              </tr>
              <tr>
                <td class="lbl">Driving Licence Number:</td>
                <td style="font-family: monospace;">${cust?.licenseNumber || cust?.idpNumber || ''}</td>
                <td class="lbl">Licence Category:</td>
                <td>${cust?.licenseCategory || 'Category A'}</td>
              </tr>
              <tr>
                <td class="lbl">Licence Expiry Date:</td>
                <td>${cust?.licenseExpiryDate || cust?.licenseExpiry || ''}</td>
                <td class="lbl">Relationship:</td>
                <td>${cust?.emergencyContactRelationship || collateral?.guarantorRelationship || ''}</td>
              </tr>
              <tr>
                <td class="lbl">Emergency Contact Name:</td>
                <td>${cust?.emergencyContactName || collateral?.guarantorName || ''}</td>
                <td class="lbl">Emergency Contact Number:</td>
                <td>${cust?.emergencyContactPhone || collateral?.guarantorPhone || ''}</td>
              </tr>
            </table>
            <p class="terms-note">
              The Renter confirms that the information and documents provided are accurate to the best of their knowledge. The Owner may verify documents where reasonably necessary and legally permitted.
            </p>
          </div>

          <!-- 3. MOTORCYCLE INFORMATION -->
          <div class="section">
            <div class="section-heading">3. MOTORCYCLE INFORMATION</div>
            <table class="grid-table">
              <tr>
                <td class="lbl">Motorcycle Brand:</td>
                <td><strong>${veh?.make || 'Royal Enfield'}</strong></td>
                <td class="lbl">Motorcycle Model:</td>
                <td><strong>${veh?.model ? `${veh.model} (${veh.year || ''})` : bk.vehicleModel || 'Classic 350'}</strong></td>
              </tr>
              <tr>
                <td class="lbl">Registration Number:</td>
                <td><strong>${veh?.plateNumber || bk.vehiclePlate || ''}</strong></td>
                <td class="lbl">Engine Capacity (CC):</td>
                <td>${veh?.specs?.engineCc || veh?.specs?.engineCapacity || (veh?.model?.includes('350') ? '350 CC' : veh?.model?.includes('500') ? '500 CC' : '350 CC')}</td>
              </tr>
              <tr>
                <td class="lbl">Colour:</td>
                <td>${veh?.color || veh?.specs?.color || ''}</td>
                <td class="lbl">Chassis Number:</td>
                <td style="font-family: monospace;">${veh?.chassisNumber || veh?.vin || ''}</td>
              </tr>
              <tr>
                <td class="lbl">Engine Number:</td>
                <td style="font-family: monospace;">${veh?.engineNumber || ''}</td>
                <td class="lbl">Odometer Reading at Pickup:</td>
                <td>${veh?.odometer ? `${veh.odometer.toLocaleString()} km` : ''}</td>
              </tr>
              <tr>
                <td class="lbl">Fuel Level at Pickup:</td>
                <td>${bk.pickupFuelLevel || bk.pickupFuel || '100%'}</td>
                <td class="lbl">Accessories Provided:</td>
                <td>${veh?.accessoriesProvided || 'Helmet (1x), Tool Kit, Bluebook Copy, Disc Lock'}</td>
              </tr>
            </table>
            <div style="margin-top: 8px; font-size: 11px;">
              <strong>Existing Scratches / Damage:</strong>
              <div style="border: 1px dashed #cbd5e1; padding: 6px 8px; margin-top: 4px; border-radius: 4px; color: #475569;">
                ${veh?.existingDamage || '________________________________________________________________<br/>________________________________________________________________'}
              </div>
            </div>
            <div style="margin-top: 6px; font-size: 11px;">
              <strong>Additional Remarks:</strong>
              <div style="border: 1px dashed #cbd5e1; padding: 6px 8px; margin-top: 4px; border-radius: 4px; color: #475569;">
                ${veh?.remarks || '________________________________________________________________<br/>________________________________________________________________'}
              </div>
            </div>
            <p class="terms-note">
              The parties should record existing damage and inspect the motorcycle before handover. Photographs and an inspection report may be attached to this Agreement.
            </p>
          </div>

          <!-- 4. RENTAL PERIOD -->
          <div class="section">
            <div class="section-heading">4. RENTAL PERIOD</div>
            <table class="grid-table">
              <tr>
                <td class="lbl">Pickup Date:</td>
                <td>${bk.startDate ? new Date(bk.startDate).toLocaleDateString('en-GB') : '____________________'}</td>
                <td class="lbl">Pickup Time:</td>
                <td>${bk.startDate ? new Date(bk.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00'}</td>
              </tr>
              <tr>
                <td class="lbl">Expected Return Date:</td>
                <td>${bk.endDate ? new Date(bk.endDate).toLocaleDateString('en-GB') : '____________________'}</td>
                <td class="lbl">Expected Return Time:</td>
                <td>${bk.endDate ? new Date(bk.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00'}</td>
              </tr>
              <tr>
                <td class="lbl">Pickup Location:</td>
                <td>${bk.pickupLocationName || 'Kathmandu, Nepal'}</td>
                <td class="lbl">Return Location:</td>
                <td>${bk.returnLocationName || 'Kathmandu, Nepal'}</td>
              </tr>
              <tr>
                <td class="lbl">Approved Rental Duration:</td>
                <td colspan="3"><strong>${bk.totalDays || 1} Day(s)</strong></td>
              </tr>
            </table>
            <p class="terms-note">
              The Renter must return the motorcycle at the agreed date, time, and location. Any extension must be approved by the Owner before the original return deadline.
            </p>
          </div>

          <!-- 5. RENTAL CHARGES AND PAYMENT -->
          <div class="section">
            <div class="section-heading">5. RENTAL CHARGES AND PAYMENT</div>
            <table class="grid-table">
              <tr>
                <th>Description</th>
                <th style="width: 35%; text-align: right;">Amount (NPR)</th>
              </tr>
              <tr>
                <td class="lbl">Rental Rate</td>
                <td style="text-align: right;">${(bk.dailyRate || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td class="lbl">Rental Duration</td>
                <td style="text-align: right;">${bk.totalDays || 1} Day(s)</td>
              </tr>
              <tr>
                <td class="lbl">Base Rental Amount</td>
                <td style="text-align: right;">${(bk.rentalAmount || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td class="lbl">Additional Charges</td>
                <td style="text-align: right;">${(bk.extraCharges || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td class="lbl">Applicable Taxes</td>
                <td style="text-align: right;">${(bk.taxAmount || 0).toLocaleString()}</td>
              </tr>
              <tr style="background: #f8fafc; font-weight: 700;">
                <td class="lbl">Total Rental Amount</td>
                <td style="text-align: right; font-size: 13px;">${(bk.totalAmount || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td class="lbl">Amount Paid</td>
                <td style="text-align: right; color: #166534; font-weight: 600;">${(bk.paidAmount || 0).toLocaleString()}</td>
              </tr>
              <tr>
                <td class="lbl">Outstanding Balance</td>
                <td style="text-align: right; color: ${(bk.balanceDue || 0) > 0 ? '#b91c1c' : '#166534'}; font-weight: 700;">${(bk.balanceDue || 0).toLocaleString()}</td>
              </tr>
              <tr style="background: #f0fdf4;">
                <td class="lbl" style="color: #166534;">Security Deposit</td>
                <td style="text-align: right; color: #166534; font-weight: 700;">${depositAmt.toLocaleString()}</td>
              </tr>
            </table>
            <div style="font-size: 11px; line-height: 1.8; margin: 8px 0;">
              <div><strong>Payment Method:</strong> ${bk.paymentMethod || 'Cash / Bank Transfer / QR Payment / Other'}</div>
              <div><strong>Transaction Reference:</strong> ${bk.transactionRef || bk.paymentReference || '_____________________________________'}</div>
              <div><strong>Payment Status:</strong> ${(bk.balanceDue || 0) <= 0 ? 'Paid' : (bk.paidAmount || 0) > 0 ? 'Partially Paid' : 'Unpaid'}</div>
            </div>
            <p class="terms-note">
              The Renter agrees to pay the charges disclosed and agreed upon before the rental begins. Additional charges must have a basis in this Agreement or another agreed written record and comply with applicable law.
            </p>
          </div>

          <!-- 6. SECURITY DEPOSIT -->
          <div class="section">
            <div class="section-heading">6. SECURITY DEPOSIT</div>
            <div style="font-size: 11px; line-height: 1.8; margin-bottom: 6px;">
              <div><strong>Security Deposit Amount:</strong> NPR ${depositAmt.toLocaleString()}</div>
              <div><strong>Deposit Payment Date:</strong> ${formattedDate}</div>
              <div><strong>Deposit Payment Method:</strong> ${colType === 'bank_cheque' ? `Bank Cheque (${collateral?.chequeBankName || 'Security Cheque'})` : colType === 'cash_card' ? 'Cash / Card' : 'Refundable Deposit'}</div>
            </div>
            <p class="terms-note">The security deposit is held as security for obligations specified in this Agreement.</p>
            <p class="terms-note">The Owner may deduct documented amounts properly payable by the Renter under the agreed terms, including applicable unpaid rental charges, attributable traffic fines, or repair costs for damage for which the Renter is responsible.</p>
            <p class="terms-note">The Owner must provide an explanation of any deductions. The remaining refundable deposit shall be returned within ______ days after the return inspection and applicable settlement are completed.</p>
            <p class="terms-note">The deposit shall not automatically be treated as a penalty. Any disputed deduction shall be handled according to applicable law and the dispute-resolution terms of this Agreement.</p>
          </div>

          <!-- 7. FUEL AND MILEAGE POLICY -->
          <div class="section">
            <div class="section-heading">7. FUEL AND MILEAGE POLICY</div>
            <table class="grid-table">
              <tr>
                <td class="lbl">Fuel Level at Pickup:</td>
                <td>100% Full</td>
                <td class="lbl">Fuel Level at Return:</td>
                <td>Same as pickup (100% Full)</td>
              </tr>
              <tr>
                <td class="lbl">Odometer at Pickup:</td>
                <td>${veh?.odometer ? `${veh.odometer.toLocaleString()} km` : ''}</td>
                <td class="lbl">Odometer at Return:</td>
                <td></td>
              </tr>
              <tr>
                <td class="lbl">Included Mileage, if applicable:</td>
                <td>${veh?.pricing?.allowedKmPerDay ? `${veh.pricing.allowedKmPerDay * (bk.totalDays || 1)} km (${veh.pricing.allowedKmPerDay} km/day)` : 'Unlimited'}</td>
                <td class="lbl">Excess Mileage Rate, if applicable:</td>
                <td>${veh?.pricing?.extraKmRate ? `NPR ${veh.pricing.extraKmRate} / km` : ''}</td>
              </tr>
            </table>
            <p class="terms-note">
              The Renter must comply with the agreed fuel and mileage policy. Any applicable fuel shortfall or excess-mileage charge must be calculated using recorded readings and the pricing terms disclosed before the rental begins.
            </p>
          </div>

          <!-- 8. LATE RETURN POLICY -->
          <div class="section">
            <div class="section-heading">8. LATE RETURN POLICY</div>
            <div style="font-size: 11px; line-height: 1.8; margin-bottom: 6px;">
              <div><strong>Grace Period:</strong> 60 Minutes</div>
              <div><strong>Late Return Charge:</strong> NPR 500 / hour</div>
              <div><strong>Charge Calculation:</strong> Hourly / Daily / Other</div>
            </div>
            <p class="terms-note">The Renter must request approval for an extension before the agreed return deadline.</p>
            <p class="terms-note">Late return charges must follow the agreed pricing terms and applicable law. If the motorcycle is overdue, the Owner may take lawful steps to recover it without using unlawful threats, force, or unauthorized access.</p>
          </div>

          <!-- 9. RENTER'S RESPONSIBILITIES -->
          <div class="section">
            <div class="section-heading">9. RENTER'S RESPONSIBILITIES</div>
            <p class="terms-note" style="margin-bottom: 4px;">The Renter agrees to:</p>
            <ol class="terms-list">
              <li>Operate the motorcycle carefully and comply with applicable traffic laws.</li>
              <li>Hold the valid driving licence and permissions required by law.</li>
              <li>Wear a helmet and follow applicable road-safety requirements.</li>
              <li>Keep the motorcycle reasonably secure when unattended.</li>
              <li>Notify the Owner promptly of accidents, theft, damage, or mechanical faults.</li>
              <li>Return the motorcycle with the keys, documents, and accessories provided.</li>
              <li>Avoid unauthorized repairs, modifications, or tampering.</li>
              <li>Not lend, transfer, or sub-rent the motorcycle to an unauthorized person.</li>
              <li>Pay charges properly due under this Agreement.</li>
              <li>Cooperate with lawful insurance, police, and incident-reporting procedures where required.</li>
            </ol>
          </div>

          <!-- 10. PROHIBITED USE -->
          <div class="section">
            <div class="section-heading">10. PROHIBITED USE</div>
            <p class="terms-note" style="margin-bottom: 4px;">The Renter must not:</p>
            <ol class="terms-list">
              <li>Use the motorcycle for unlawful activities.</li>
              <li>Allow an unauthorized or unlicensed person to operate it.</li>
              <li>Use it for racing, reckless riding, or unauthorized commercial purposes.</li>
              <li>Ride while impaired by alcohol, drugs, or another substance that makes riding unsafe.</li>
              <li>Tamper with the odometer, registration plate, engine, or identification numbers.</li>
              <li>Take the motorcycle outside the agreed geographical area without permission.</li>
              <li>Carry passengers or loads contrary to applicable law or manufacturer restrictions.</li>
              <li>Remove or disable disclosed safety equipment or lawfully installed tracking equipment.</li>
            </ol>
          </div>

          <!-- 11. DAMAGE AND REPAIR POLICY -->
          <div class="section">
            <div class="section-heading">11. DAMAGE AND REPAIR POLICY</div>
            <p class="terms-note">The Renter must notify the Owner promptly if the motorcycle is damaged.</p>
            <p class="terms-note">Responsibility for damage shall be assessed using the handover report, return inspection, photographs, repair estimates, applicable insurance coverage, and other relevant evidence.</p>
            <p class="terms-note">Where the Renter is responsible under this Agreement and applicable law, reasonable and substantiated repair costs may be charged.</p>
            <p class="terms-note">The Renter is not automatically responsible for pre-existing damage, ordinary wear and tear, or mechanical failures not caused by the Renter.</p>
            <p class="terms-note">The Owner should provide supporting documentation for any damage-related deduction or payment request.</p>
          </div>

          <!-- 12. ACCIDENT AND INSURANCE POLICY -->
          <div class="section">
            <div class="section-heading">12. ACCIDENT AND INSURANCE POLICY</div>
            <p class="terms-note" style="margin-bottom: 4px;">If an accident occurs, the Renter must:</p>
            <ol class="terms-list">
              <li>Stop in a safe location where possible.</li>
              <li>Seek emergency assistance when necessary.</li>
              <li>Notify the appropriate authorities when legally required.</li>
              <li>Inform the Owner as soon as reasonably possible.</li>
              <li>Record the incident details and available evidence.</li>
              <li>Cooperate with lawful investigations and insurance procedures.</li>
            </ol>
            <div style="font-size: 11px; line-height: 1.8; margin: 6px 0;">
              <div><strong>Insurance Provider:</strong> Sagarmatha Lumbini Insurance Co. Ltd.</div>
              <div><strong>Insurance Policy Number:</strong> POL-2026-HRN-MOT</div>
              <div><strong>Emergency Contact Number:</strong> ${company.phone}</div>
            </div>
            <p class="terms-note">Insurance coverage, exclusions, deductibles, and claim requirements are governed by the applicable policy and law. Financial responsibility shall depend on the circumstances and the obligations established by applicable law and this Agreement.</p>
          </div>

          <!-- 13. TRAFFIC FINES AND PENALTIES -->
          <div class="section">
            <div class="section-heading">13. TRAFFIC FINES AND PENALTIES</div>
            <p class="terms-note">The Renter is responsible for traffic fines and penalties attributable to the Renter's conduct during the rental period, subject to applicable law.</p>
            <p class="terms-note">The Owner may provide relevant rental records to competent authorities where legally required.</p>
            <p class="terms-note">The Renter is not automatically responsible for fines arising before handover or after the motorcycle has been returned unless otherwise legally established.</p>
          </div>

          <!-- 14. THEFT OR LOSS OF MOTORCYCLE -->
          <div class="section">
            <div class="section-heading">14. THEFT OR LOSS OF MOTORCYCLE</div>
            <p class="terms-note">If the motorcycle is stolen or goes missing, the Renter must promptly inform the Owner and the appropriate authorities.</p>
            <p class="terms-note">The Renter must cooperate with the investigation and any applicable insurance claim.</p>
            <p class="terms-note">Responsibility for financial loss will depend on the circumstances, the parties' conduct, the applicable insurance policy, and applicable law. Theft does not automatically make the Renter liable for the motorcycle's full replacement value.</p>
          </div>

          <!-- 15. CANCELLATION AND REFUND POLICY -->
          <div class="section">
            <div class="section-heading">15. CANCELLATION AND REFUND POLICY</div>
            <div style="font-size: 11px; line-height: 1.8; margin-bottom: 6px;">
              <div><strong>Cancellation Deadline:</strong> 24 Hours prior to scheduled departure</div>
              <div><strong>Cancellation Fee, if applicable:</strong> NPR 0</div>
              <div><strong>No-Show Policy:</strong> 1 Day rental charge retained</div>
              <div><strong>Refund Processing Period:</strong> 3 - 5 Business Days</div>
            </div>
            <p class="terms-note">Cancellations and refunds shall follow the policy disclosed to the Renter before payment and applicable law.</p>
            <p class="terms-note">If the Owner cannot provide the agreed motorcycle, the parties shall follow the disclosed replacement or refund policy. Mandatory consumer rights shall not be excluded by this Agreement.</p>
          </div>

          <!-- 16. MECHANICAL FAILURE -->
          <div class="section">
            <div class="section-heading">16. MECHANICAL FAILURE</div>
            <p class="terms-note">If a mechanical fault occurs, the Renter must stop riding when continued operation would be unsafe and contact the Owner.</p>
            <p class="terms-note">The Owner shall provide reasonable instructions concerning inspection, repair, or recovery.</p>
            <p class="terms-note">Responsibility for repair costs and any refund for unused rental time shall depend on the cause of the failure, the agreed terms, and applicable law.</p>
          </div>

          <!-- 17. RETURN INSPECTION -->
          <div class="section">
            <div class="section-heading">17. RETURN INSPECTION</div>
            <p class="terms-note">The motorcycle shall be inspected when returned.</p>
            <table class="grid-table">
              <tr>
                <td class="lbl">Actual Return Date:</td>
                <td></td>
                <td class="lbl">Actual Return Time:</td>
                <td></td>
              </tr>
              <tr>
                <td class="lbl">Return Odometer Reading:</td>
                <td></td>
                <td class="lbl">Fuel Level at Return:</td>
                <td></td>
              </tr>
              <tr>
                <td class="lbl">Keys Returned:</td>
                <td>Yes / No</td>
                <td class="lbl">Accessories Returned:</td>
                <td>Yes / No</td>
              </tr>
              <tr>
                <td class="lbl">New Damage Observed:</td>
                <td>Yes / No</td>
                <td class="lbl">Additional Charges:</td>
                <td></td>
              </tr>
              <tr>
                <td class="lbl">Security Deposit Deduction:</td>
                <td></td>
                <td class="lbl">Refund Amount:</td>
                <td></td>
              </tr>
            </table>
            <div style="margin-top: 8px; font-size: 11px;">
              <strong>Return Condition / Remarks:</strong>
              <div style="border: 1px dashed #cbd5e1; min-height: 36px; padding: 6px; margin-top: 4px; border-radius: 4px;">
                ________________________________________________________________<br/>
                ________________________________________________________________
              </div>
            </div>
            <p class="terms-note">Both parties should record any disagreement about the motorcycle's condition or the final settlement.</p>
          </div>

          <!-- 18. PRIVACY AND DOCUMENT HANDLING -->
          <div class="section">
            <div class="section-heading">18. PRIVACY AND DOCUMENT HANDLING</div>
            <p class="terms-note">The Owner may collect and process customer information as reasonably necessary to verify identity, administer the rental, process payments, manage incidents, and comply with legal obligations.</p>
            <p class="terms-note">Personal documents must be stored securely and accessed only by authorized personnel for legitimate purposes.</p>
            <p class="terms-note">The Owner must comply with applicable privacy and data-protection requirements when collecting, retaining, disclosing, or deleting personal information.</p>
          </div>

          <!-- 19. TERMINATION OF AGREEMENT -->
          <div class="section">
            <div class="section-heading">19. TERMINATION OF AGREEMENT</div>
            <p class="terms-note">Either party may exercise termination rights available under this Agreement and applicable law.</p>
            <p class="terms-note">The Owner may seek the return of the motorcycle in the event of a material breach, provided that any recovery action is lawful.</p>
            <p class="terms-note">Termination does not remove payment obligations, refund rights, or claims that arose before termination.</p>
          </div>

          <!-- 20. DISPUTE RESOLUTION AND GOVERNING LAW -->
          <div class="section">
            <div class="section-heading">20. DISPUTE RESOLUTION AND GOVERNING LAW</div>
            <p class="terms-note">The parties should first attempt to resolve any dispute through good-faith discussion.</p>
            <p class="terms-note">If the dispute remains unresolved, either party may pursue remedies available under the applicable laws and competent forums in Nepal.</p>
            <div style="font-size: 11px; line-height: 1.8; margin: 4px 0;">
              <div><strong>Governing Law:</strong> Applicable laws of Nepal.</div>
              <div><strong>Agreed Dispute-Resolution Venue:</strong> ___________________________</div>
            </div>
            <p class="terms-note">This Agreement does not remove any mandatory legal rights of either party.</p>
          </div>

          <!-- 21. CUSTOMER DECLARATION -->
          <div class="section">
            <div class="section-heading">21. CUSTOMER DECLARATION</div>
            <p class="terms-note" style="margin-bottom: 4px;">I, the undersigned Renter, confirm that:</p>
            <ul class="terms-list" style="list-style-type: disc;">
              <li>I have provided accurate information to the best of my knowledge.</li>
              <li>I have reviewed the motorcycle and its recorded condition.</li>
              <li>I understand the rental period, charges, security deposit, and return requirements.</li>
              <li>I have read and understood the terms and conditions of this Agreement.</li>
              <li>I agree to comply with applicable traffic laws and the obligations set out in this Agreement.</li>
              <li>I acknowledge receipt of a copy of this Agreement.</li>
            </ul>
          </div>

          <!-- 22. SIGNATURES OF THE PARTIES -->
          <div class="section">
            <div class="section-heading">22. SIGNATURES OF THE PARTIES</div>
            <div class="signatures">
              <div class="sig-card">
                <div class="sig-head">RENTER / CUSTOMER</div>
                <div style="font-size: 11px; line-height: 1.6; padding: 6px 0;">
                  <div><strong>Full Name:</strong> ${cust?.fullName || bk.customerName || '____________________'}</div>
                  <div style="margin-top: 14px;"><strong>Signature:</strong> ____________________</div>
                  <div><strong>Date:</strong> ${formattedDate}</div>
                </div>
              </div>

              <div class="sig-card">
                <div class="sig-head">OWNER / AUTHORIZED REPRESENTATIVE</div>
                <div style="font-size: 11px; line-height: 1.6; padding: 6px 0;">
                  <div><strong>Full Name:</strong> ${company.name}</div>
                  <div><strong>Position:</strong> Fleet Operations Officer</div>
                  <div style="margin-top: 6px;"><strong>Signature:</strong> ____________________</div>
                  <div><strong>Date:</strong> ${formattedDate}</div>
                </div>
              </div>

              <div class="sig-card">
                <div class="sig-head">WITNESS, IF REQUIRED OR AGREED</div>
                <div style="font-size: 11px; line-height: 1.6; padding: 6px 0;">
                  <div><strong>Full Name:</strong> ${collateral?.guarantorName || 'Witness on record'}</div>
                  <div><strong>Address:</strong> ${collateral?.guarantorAddress || 'Kathmandu, Nepal'}</div>
                  <div style="margin-top: 6px;"><strong>Signature:</strong> ____________________</div>
                  <div><strong>Date:</strong> ${formattedDate}</div>
                </div>
              </div>
            </div>
          </div>

          <!-- 23. MOTORCYCLE HANDOVER CONFIRMATION -->
          <div class="section">
            <div class="section-heading">23. MOTORCYCLE HANDOVER CONFIRMATION</div>
            <p class="terms-note">I confirm that the motorcycle and the listed accessories were handed over to the Renter, subject to the recorded inspection report.</p>
            <div style="font-size: 11px; line-height: 1.8; margin-top: 6px;">
              <div><strong>Handover Date:</strong> ${bk.startDate ? new Date(bk.startDate).toLocaleDateString('en-GB') : '____________________'}</div>
              <div><strong>Handover Time:</strong> ${bk.startDate ? new Date(bk.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '10:00'}</div>
              <div><strong>Owner/Staff Signature:</strong> ____________________________________</div>
              <div><strong>Renter Signature:</strong> _________________________________________</div>
            </div>
          </div>

          <!-- 24. MOTORCYCLE RETURN CONFIRMATION -->
          <div class="section">
            <div class="section-heading">24. MOTORCYCLE RETURN CONFIRMATION</div>
            <p class="terms-note">I confirm that the motorcycle has been returned and inspected. Any agreed outstanding charges, damage claims, or deposit deductions shall be documented separately.</p>
            <div style="font-size: 11px; line-height: 1.8; margin-top: 6px;">
              <div><strong>Return Date:</strong> _____________________________________________</div>
              <div><strong>Return Time:</strong> _____________________________________________</div>
              <div><strong>Owner/Staff Signature:</strong> ____________________________________</div>
              <div><strong>Renter Signature:</strong> _________________________________________</div>
            </div>
          </div>

          <hr style="border: none; border-top: 1px solid #cbd5e1; margin: 16px 0 12px 0;" />

          <!-- ATTACHMENTS -->
          <div class="section">
            <div class="section-heading">ATTACHMENTS</div>
            <ol class="terms-list" style="columns: 2; -webkit-columns: 2;">
              <li>Customer identity verification record</li>
              <li>Driving licence verification record</li>
              <li>Motorcycle handover photographs</li>
              <li>Motorcycle handover inspection checklist</li>
              <li>Motorcycle return inspection checklist</li>
              <li>Rental payment and security deposit receipt</li>
              <li>Applicable insurance information</li>
              <li>Additional agreed terms, if any</li>
            </ol>
            <div style="text-align: center; margin-top: 14px; font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0f172a;">
              **END OF MOTORCYCLE RENTAL AGREEMENT**
            </div>
          </div>
        </div>
      </body>
    </html>
  `

  launchPrintDocument('agreement', { company, booking, vehicle, customer, collateral }, html)
}

/**
 * 2. Official Tax Invoice
 */
export function printBookingInvoice(
  booking: Booking,
  vehicle?: Vehicle | null,
  customer?: Customer | null
) {
  const company = getCompanyBranding()
  const invNo = `INV-${booking.bookingCode || '001'}`
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${invNo} - Tax Invoice</title>
        <style>
          @page { size: A4; margin: 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 24px;
            font-size: 12px;
          }
          .toolbar {
            max-width: 750px;
            margin: 0 auto 16px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .btn-print {
            background: #0f172a;
            color: #ffffff;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }
          .sheet {
            max-width: 750px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 32px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 16px;
            margin-bottom: 20px;
          }
          .table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          .table th {
            background: #f8fafc;
            text-align: left;
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
            font-size: 11px;
            text-transform: uppercase;
          }
          .table td {
            padding: 8px 10px;
            border: 1px solid #e2e8f0;
          }
          .totals {
            width: 280px;
            margin-left: auto;
            border-collapse: collapse;
          }
          .totals td {
            padding: 5px 8px;
          }
          @media print {
            body { padding: 0; }
            .toolbar { display: none; }
            .sheet { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <span style="font-weight: 600;">Tax Invoice (${invNo})</span>
          <button class="btn-print" onclick="window.print()">Print Invoice</button>
        </div>
        <div class="sheet">
          <div class="header" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 16px; margin-bottom: 20px; gap: 16px;">
            <div style="display: flex; align-items: flex-start; gap: 14px;">
              <img src="${company.logoUrl || '/favicon.svg'}" alt="Logo" style="max-height: 48px; max-width: 120px; object-fit: contain; border-radius: 6px;" onerror="this.style.display='none'" />
              <div>
                <h3 style="margin: 0 0 2px 0; font-size: 17px; font-weight: 800; text-transform: uppercase;">${company.name}</h3>
                <div style="font-size: 11px; color: #475569; line-height: 1.5;">
                  ${PRINT_ICONS.location} ${company.headquartersAddress} &bull; ${PRINT_ICONS.phone} ${company.phone} &bull; ${PRINT_ICONS.email} ${company.email}<br/>
                  ${PRINT_ICONS.shield} ${company.taxId}
                </div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 10px; border-radius: 4px; font-size: 12px; font-weight: 800; color: #0f172a;">${PRINT_ICONS.document} TAX INVOICE</div>
              <div style="font-size: 11px; color: #475569; margin-top: 6px; line-height: 1.5;">
                ${PRINT_ICONS.tag} Invoice No: <strong>${invNo}</strong><br/>
                ${PRINT_ICONS.calendar} Date: <strong>${formattedDate}</strong>
              </div>
            </div>
          </div>

          <div style="display: flex; justify-content: space-between; margin-bottom: 16px;">
            <div>
              <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Customer:</div>
              <div style="font-size: 13px; font-weight: 700;">${customer?.fullName || booking.customerName}</div>
              <div>${customer?.phone || booking.customerPhone}</div>
              <div>${customer?.address || 'Kathmandu, Nepal'}</div>
            </div>
            <div style="text-align: right;">
              <div style="font-size: 11px; color: #64748b; font-weight: 600; text-transform: uppercase;">Booking Reference:</div>
              <div style="font-size: 13px; font-weight: 700;">${booking.bookingCode}</div>
              <div>Vehicle: ${vehicle ? `${vehicle.make} ${vehicle.model}` : booking.vehicleModel}</div>
              <div>Plate: ${vehicle?.plateNumber || booking.vehiclePlate}</div>
            </div>
          </div>

          <table class="table">
            <thead>
              <tr>
                <th style="width: 50%;">Description</th>
                <th style="text-align: center; width: 15%;">Days</th>
                <th style="text-align: right; width: 15%;">Rate (NPR)</th>
                <th style="text-align: right; width: 20%;">Amount (NPR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Vehicle Rental: ${vehicle ? `${vehicle.make} ${vehicle.model}` : booking.vehicleModel} (${vehicle?.plateNumber || booking.vehiclePlate})</td>
                <td style="text-align: center;">${booking.totalDays || 1}</td>
                <td style="text-align: right;">${(booking.dailyRate || 0).toLocaleString()}</td>
                <td style="text-align: right;">${(booking.rentalAmount || 0).toLocaleString()}</td>
              </tr>
              ${(booking.extraCharges || 0) > 0 ? `
              <tr>
                <td>Delivery / Collection Fees</td>
                <td style="text-align: center;">1</td>
                <td style="text-align: right;">${(booking.extraCharges || 0).toLocaleString()}</td>
                <td style="text-align: right;">${(booking.extraCharges || 0).toLocaleString()}</td>
              </tr>` : ''}
              ${(booking.discountAmount || 0) > 0 ? `
              <tr>
                <td>Discount</td>
                <td style="text-align: center;">1</td>
                <td style="text-align: right;">-${(booking.discountAmount || 0).toLocaleString()}</td>
                <td style="text-align: right;">-${(booking.discountAmount || 0).toLocaleString()}</td>
              </tr>` : ''}
            </tbody>
          </table>

          <table class="totals">
            <tr>
              <td>Subtotal:</td>
              <td style="text-align: right;">NPR ${((booking.rentalAmount || 0) + (booking.extraCharges || 0) - (booking.discountAmount || 0)).toLocaleString()}</td>
            </tr>
            <tr>
              <td>VAT (13%):</td>
              <td style="text-align: right;">NPR ${(booking.taxAmount || 0).toLocaleString()}</td>
            </tr>
            <tr style="border-top: 1px solid #0f172a; font-weight: 700;">
              <td>Grand Total:</td>
              <td style="text-align: right;">NPR ${(booking.totalAmount || 0).toLocaleString()}</td>
            </tr>
            <tr>
              <td>Paid Amount:</td>
              <td style="text-align: right;">NPR ${(booking.paidAmount || 0).toLocaleString()}</td>
            </tr>
            <tr style="border-top: 1px solid #e2e8f0; font-weight: 700;">
              <td>Balance Due:</td>
              <td style="text-align: right; color: ${(booking.balanceDue || 0) > 0 ? '#dc2626' : '#166534'};">NPR ${(booking.balanceDue || 0).toLocaleString()}</td>
            </tr>
          </table>

          <div style="margin-top: 40px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
            <div>Thank you for your business.</div>
            <div>Authorized Signature: ______________________</div>
          </div>
        </div>
      </body>
    </html>
  `

  launchPrintDocument('invoice', { company, booking, vehicle, customer }, html)
}

/**
 * 3. Vehicle Handover & Inspection Sheet
 */
export function printHandoverSheet(
  booking: Booking,
  vehicle?: Vehicle | null,
  customer?: Customer | null
) {
  const company = getCompanyBranding()
  const sheetNo = `HO-${booking.bookingCode || '001'}`
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${sheetNo} - Handover Inspection</title>
        <style>
          @page { size: A4; margin: 12mm 15mm; }
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif;
            color: #1e293b;
            background: #ffffff;
            margin: 0;
            padding: 20px;
            font-size: 11.5px;
          }
          .toolbar {
            max-width: 780px;
            margin: 0 auto 16px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .btn-print {
            background: #0f172a;
            color: #ffffff;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-size: 13px;
            font-weight: 600;
            cursor: pointer;
          }
          .sheet {
            max-width: 780px;
            margin: 0 auto;
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            padding: 28px;
          }
          .header {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 12px;
            margin-bottom: 14px;
          }
          .grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 14px;
            margin-bottom: 14px;
          }
          .box {
            border: 1px solid #cbd5e1;
            border-radius: 4px;
            padding: 10px;
          }
          .box-title {
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
            margin-bottom: 6px;
          }
          .checklist {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr;
            gap: 6px;
            font-size: 11px;
          }
          .chk {
            display: flex;
            align-items: center;
            gap: 6px;
          }
          .sq {
            width: 12px;
            height: 12px;
            border: 1px solid #0f172a;
            display: inline-block;
          }
          @media print {
            body { padding: 0; }
            .toolbar { display: none; }
            .sheet { border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <span style="font-weight: 600;">Handover Sheet (${sheetNo})</span>
          <button class="btn-print" onclick="window.print()">Print Handover Sheet</button>
        </div>
        <div class="sheet">
          <div class="header" style="display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #0f172a; padding-bottom: 14px; margin-bottom: 16px; gap: 16px;">
            <div style="display: flex; align-items: flex-start; gap: 14px;">
              <img src="${company.logoUrl || '/favicon.svg'}" alt="Logo" style="max-height: 44px; max-width: 110px; object-fit: contain; border-radius: 6px;" onerror="this.style.display='none'" />
              <div>
                <h3 style="margin: 0 0 2px 0; font-size: 16px; font-weight: 800; text-transform: uppercase;">${company.name}</h3>
                <div style="font-size: 11px; color: #475569;">${PRINT_ICONS.location} ${company.headquartersAddress} &bull; ${PRINT_ICONS.phone} Tel: ${company.phone}</div>
              </div>
            </div>
            <div style="text-align: right;">
              <div style="display: inline-block; background: #f1f5f9; border: 1px solid #cbd5e1; padding: 3px 8px; border-radius: 4px; font-size: 11.5px; font-weight: 800; color: #0f172a;">${PRINT_ICONS.document} HANDOVER &amp; INSPECTION</div>
              <div style="font-size: 10.5px; color: #475569; margin-top: 4px;">${PRINT_ICONS.tag} Sheet: <strong>${sheetNo}</strong> &bull; ${PRINT_ICONS.calendar} Date: <strong>${formattedDate}</strong></div>
            </div>
          </div>

          <div class="grid">
            <div class="box">
              <div class="box-title">Vehicle Information</div>
              <div>Model: <strong>${vehicle ? `${vehicle.make} ${vehicle.model}` : booking.vehicleModel}</strong></div>
              <div>Plate No: <strong>${vehicle?.plateNumber || booking.vehiclePlate}</strong></div>
              <div>Starting Odometer: ________________ km</div>
              <div>Fuel Level: [ E ] -- [ 1/4 ] -- [ 1/2 ] -- [ 3/4 ] -- [ F ]</div>
            </div>
            <div class="box">
              <div class="box-title">Customer & Schedule</div>
              <div>Customer: <strong>${customer?.fullName || booking.customerName}</strong></div>
              <div>Contact: ${customer?.phone || booking.customerPhone}</div>
              <div>Pickup: ${booking.startDate ? new Date(booking.startDate).toLocaleString('en-GB') : 'N/A'}</div>
              <div>Return: ${booking.endDate ? new Date(booking.endDate).toLocaleString('en-GB') : 'N/A'}</div>
            </div>
          </div>

          <div class="box" style="margin-bottom: 14px;">
            <div class="box-title">Inventory & Fleet Inspection Checklist</div>
            <div class="checklist">
              <div class="chk"><span class="sq"></span> Bluebook Copy in Glovebox</div>
              <div class="chk"><span class="sq"></span> Insurance Certificate</div>
              <div class="chk"><span class="sq"></span> Spare Tyre & Tool Kit</div>
              <div class="chk"><span class="sq"></span> Road Tax / Pollution Token</div>
              <div class="chk"><span class="sq"></span> AC & Audio System Checked</div>
              <div class="chk"><span class="sq"></span> Headlamps & Indicators Working</div>
              <div class="chk"><span class="sq"></span> Helmets (Two-Wheeler)</div>
              <div class="chk"><span class="sq"></span> First Aid Kit & Triangle</div>
              <div class="chk"><span class="sq"></span> Clean Interior & Exterior</div>
            </div>
          </div>

          <div class="box" style="margin-bottom: 16px;">
            <div class="box-title">Exterior Condition / Notes</div>
            <div style="height: 50px; color: #94a3b8; font-size: 11px;">
              Mark pre-existing scratches, dents, or notes...
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 20px;">
            <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px; min-height: 70px;">
              <div style="font-weight: 600; font-size: 11px;">Customer Acceptance Signature</div>
              <div style="margin-top: 30px; font-size: 10px; color: #64748b;">Vehicle received in satisfactory operational condition.</div>
            </div>
            <div style="border: 1px solid #cbd5e1; border-radius: 4px; padding: 10px; min-height: 70px;">
              <div style="font-weight: 600; font-size: 11px;">Dispatch Officer Signature</div>
              <div style="margin-top: 30px; font-size: 10px; color: #64748b;">Keys handed over and collateral recorded.</div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `

  launchPrintDocument('handover', { company, booking, vehicle, customer }, html)
}
