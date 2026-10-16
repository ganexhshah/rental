import React from 'react'

export interface DocumentDataProps {
  data: any
}

export const AgreementDocument: React.FC<DocumentDataProps> = ({ data }) => {
  const company = data?.company || {
    name: 'Himalayan Rides Nepal Pvt. Ltd.',
    registrationNumber: 'REG-2026-KTM',
    taxId: 'PAN: 601234567',
    headquartersAddress: 'Thamel Marg, Kathmandu, Nepal',
    phone: '+977-1-4700000',
    email: 'operations@himalayanrides.com',
  }

  const docSettings = data?.docSettings || {}
  const booking = data?.booking || {}
  const customer = data?.customer || {}
  const vehicle = data?.vehicle || {}
  const collateral = data?.collateral || {}

  const prefix = docSettings.agreementPrefix || 'BRA-'
  const cleanCode = booking.bookingCode ? booking.bookingCode.replace(/^HRN-|^CTR-|^BRA-/, '') : '2026-0001'
  const agreementNo = `${prefix}${cleanCode}`

  const agreementDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const pickupDate = booking.startDate ? new Date(booking.startDate).toLocaleDateString('en-GB') : '____________________'
  const pickupTime = booking.startDate
    ? new Date(booking.startDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '10:00'
  const returnDate = booking.endDate ? new Date(booking.endDate).toLocaleDateString('en-GB') : '____________________'
  const returnTime = booking.endDate
    ? new Date(booking.endDate).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '10:00'

  const dailyRate = booking.dailyRate || vehicle?.pricing?.dailyRate || 1500
  const rentalDays = booking.totalDays || 1
  const rentalSubtotal = booking.rentalAmount || dailyRate * rentalDays
  const extraCharges = booking.extraCharges || 0
  const taxAmount = booking.taxAmount || 0
  const totalAmount = booking.totalAmount || rentalSubtotal + extraCharges + taxAmount
  const paidAmount = booking.paidAmount || 0
  const balanceDue = booking.balanceDue !== undefined ? booking.balanceDue : totalAmount - paidAmount
  const securityDeposit = collateral?.depositAmount ?? booking.depositAmount ?? 10000

  const logoUrl = company?.logoUrl || docSettings?.logoUrl || data?.branding?.logoUrl || '/favicon.svg'

  return (
    <>
      {/* ========================================================
          PAGE 1 OF 4: PARTICULARS, VEHICLE & FINANCIAL SCHEDULE
          ======================================================== */}
      <div className="doc-page doc-sheet">
        <div className="doc-sheet-badge" style={{ position: 'absolute', top: 18, right: 24 }}>
          Page 1 of 4
        </div>

        {/* Title Block */}
        <div style={{ textAlign: 'center', marginBottom: '14px', borderBottom: '2px solid #0f172a', paddingBottom: '12px' }}>
          <h1 style={{ margin: '0 0 3px 0', fontSize: '18px', fontWeight: 900, letterSpacing: '0.8px', textTransform: 'uppercase', color: '#0f172a' }}>
            MOTORCYCLE RENTAL AGREEMENT
          </h1>
          <h3 style={{ margin: '0 0 12px 0', fontSize: '11.5px', fontWeight: 700, letterSpacing: '0.6px', textTransform: 'uppercase', color: '#2563eb' }}>
            RENTAL TERMS &amp; CONDITIONS
          </h3>

          {/* Company Header with Logo & Vector Icons */}
          <div className="modern-header" style={{ borderBottom: 'none', paddingBottom: 0, marginBottom: 0, textAlign: 'left' }}>
            <div className="brand-header-left">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt={company.name || 'Company Logo'}
                  className="brand-logo-img"
                  onError={(e) => {
                    const target = e.currentTarget
                    target.style.display = 'none'
                    const fallback = target.parentElement?.querySelector('.brand-logo-badge-fallback')
                    if (fallback) (fallback as HTMLElement).style.display = 'flex'
                  }}
                />
              ) : null}
              <div
                className={`brand-logo-badge ${logoUrl ? 'brand-logo-badge-fallback' : ''}`}
                style={logoUrl ? { display: 'none' } : undefined}
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  style={{ width: 28, height: 28 }}
                >
                  <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.5 2.8C2.1 10.7 2 11 2 11.3V16c0 .6.4 1 1 1h2" />
                  <circle cx="7" cy="17" r="2" />
                  <path d="M9 17h6" />
                  <circle cx="17" cy="17" r="2" />
                </svg>
              </div>
              <div>
                <div className="brand-title" style={{ fontSize: '15px' }}>{company.name}</div>
                <div className="brand-sub" style={{ marginTop: '3px' }}>
                  <div className="header-meta-row">
                    {company.headquartersAddress && (
                      <span className="header-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                        {company.headquartersAddress}
                      </span>
                    )}
                    {company.phone && (
                      <span className="header-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                        </svg>
                        {company.phone}
                      </span>
                    )}
                    {company.email && (
                      <span className="header-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <rect width="20" height="16" x="2" y="4" rx="2" />
                          <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                        </svg>
                        {company.email}
                      </span>
                    )}
                  </div>
                  <div className="header-meta-row" style={{ marginTop: '2px' }}>
                    {company.registrationNumber && (
                      <span className="header-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="8" r="6" />
                          <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                        </svg>
                        Reg: {company.registrationNumber}
                      </span>
                    )}
                    {company.taxId && (
                      <span className="header-meta-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                        </svg>
                        {company.taxId}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="doc-info">
              <div className="doc-type-badge">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
                Agreement Document
              </div>
              <div className="doc-meta-line">
                <span className="doc-meta-row">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                    <line x1="7" y1="7" x2="7.01" y2="7" />
                  </svg>
                  Agreement No: <strong>{agreementNo}</strong>
                </span>
                <span className="doc-meta-row">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  Date: <strong>{agreementDate}</strong>
                  {booking.bookingCode && (
                    <>
                      <span style={{ margin: '0 4px', color: '#cbd5e1' }}>•</span>
                      Booking: <strong>{booking.bookingCode}</strong>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* AGREEMENT INFORMATION */}
        <div className="doc-section-card">
          <div className="sec-title">AGREEMENT INFORMATION</div>
          <div className="clean-grid">
            <div className="clean-field">
              <span className="clean-field-lbl">Agreement Number</span>
              <span className="clean-field-val">{agreementNo}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Booking Reference ID</span>
              <span className="clean-field-val">{booking.bookingCode || 'Direct Agreement'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Execution Date</span>
              <span className="clean-field-val">{agreementDate}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Execution Location</span>
              <span className="clean-field-val">{booking.pickupLocationName || company.city || 'Kathmandu, Nepal'}</span>
            </div>
          </div>
          <p className="doc-legal-p" style={{ fontStyle: 'italic', color: '#64748b', margin: '4px 0 8px 0' }}>
            This Motorcycle Rental Agreement (&quot;Agreement&quot;) is made between the Rental Company (&quot;Owner&quot;) and the Customer (&quot;Renter&quot;) identified below. Both parties agree to comply with the following terms and conditions.
          </p>
        </div>

        {/* 1. RENTAL COMPANY INFORMATION */}
        <div className="doc-section-card">
          <div className="sec-title">1. RENTAL COMPANY INFORMATION</div>
          <div className="clean-grid">
            <div className="clean-field">
              <span className="clean-field-lbl">Company Name</span>
              <span className="clean-field-val">{company.name}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Authorized Representative</span>
              <span className="clean-field-val">{docSettings.authorizedRepresentative || 'Operations Officer'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Business Address</span>
              <span className="clean-field-val">{company.headquartersAddress}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Contact &amp; Support</span>
              <span className="clean-field-val">{company.phone} • {company.email}</span>
            </div>
          </div>
        </div>

        {/* 2. CUSTOMER INFORMATION */}
        <div className="doc-section-card">
          <div className="sec-title">2. CUSTOMER INFORMATION</div>
          <div className="clean-grid">
            <div className="clean-field">
              <span className="clean-field-lbl">Full Legal Name</span>
              <span className="clean-field-val">{customer.fullName || booking.customerName || '—'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Date of Birth</span>
              <span className="clean-field-val">{customer.dob || customer.dateOfBirth || '—'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Contact Number</span>
              <span className="clean-field-val">{customer.phone || booking.customerPhone || '—'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Email Address</span>
              <span className="clean-field-val">{customer.email || '—'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Current Address</span>
              <span className="clean-field-val">{customer.currentAddress || customer.address || '—'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Permanent Address</span>
              <span className="clean-field-val">{customer.permanentAddress || customer.address || '—'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Citizenship / Passport</span>
              <span className="clean-field-val">
                {customer.passportNumber || customer.citizenshipNumber || '—'}
                {customer.nationality ? ` (${customer.nationality})` : ''}
              </span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Driving Licence</span>
              <span className="clean-field-val">
                {customer.licenseNumber || '—'} • {customer.licenseCategory || 'Cat A'} {customer.licenseExpiryDate ? `(Exp: ${customer.licenseExpiryDate})` : ''}
              </span>
            </div>
            <div className="clean-field" style={{ gridColumn: 'span 2' }}>
              <span className="clean-field-lbl">Emergency Contact</span>
              <span className="clean-field-val">
                {customer.emergencyContactName || collateral.guarantorName || '—'}
                {(customer.emergencyContactPhone || collateral.guarantorPhone) ? ` (${customer.emergencyContactPhone || collateral.guarantorPhone})` : ''}
                {(customer.emergencyContactRelationship || collateral.guarantorRelationship) ? ` — ${customer.emergencyContactRelationship || collateral.guarantorRelationship}` : ''}
              </span>
            </div>
          </div>
          <p className="doc-legal-p" style={{ fontSize: '10.5px', color: '#64748b' }}>
            The Renter confirms that all provided particulars and licence documents are authentic and valid under the Motor Vehicles Act of Nepal.
          </p>
        </div>

        {/* 3. MOTORCYCLE INFORMATION */}
        <div className="doc-section-card">
          <div className="sec-title">3. MOTORCYCLE INFORMATION</div>
          <div className="clean-grid-3">
            <div className="clean-field">
              <span className="clean-field-lbl">Brand &amp; Model</span>
              <span className="clean-field-val">{vehicle.make || 'Royal Enfield'} {vehicle.model || booking.vehicleModel || 'Classic 350'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Plate Number</span>
              <span className="clean-field-val">{vehicle.plateNumber || booking.vehiclePlate || '—'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Capacity / Colour</span>
              <span className="clean-field-val">{vehicle.specs?.engineCc || '350 CC'} • {vehicle.color || 'Standard'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Chassis / VIN</span>
              <span className="clean-field-val" style={{ fontFamily: 'monospace' }}>{vehicle.chassisNumber || vehicle.vin || '—'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Engine Number</span>
              <span className="clean-field-val" style={{ fontFamily: 'monospace' }}>{vehicle.engineNumber || '—'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Handover Odometer</span>
              <span className="clean-field-val">{vehicle.odometer ? `${vehicle.odometer.toLocaleString()} km` : '14,200 km'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Pickup Fuel Level</span>
              <span className="clean-field-val">{booking.pickupFuelLevel || '100% Full'}</span>
            </div>
            <div className="clean-field" style={{ gridColumn: 'span 2' }}>
              <span className="clean-field-lbl">Accessories Handed Over</span>
              <span className="clean-field-val">{vehicle.accessoriesProvided || 'Helmets (1x), Tool Kit, Bluebook Copy, Disc Lock'}</span>
            </div>
          </div>

          <div style={{ marginTop: '6px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Recorded Pre-existing Scratches / Damage:</div>
            <div className="doc-remarks-box">
              {vehicle.existingDamage || 'No significant pre-existing body or mechanical damages noted during pickup inspection.'}
            </div>
          </div>
        </div>

        {/* 4. RENTAL PERIOD */}
        <div className="doc-section-card">
          <div className="sec-title">4. RENTAL PERIOD</div>
          <div className="clean-grid">
            <div className="clean-field">
              <span className="clean-field-lbl">Pickup Schedule</span>
              <span className="clean-field-val">{pickupDate} at {pickupTime}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Expected Return Schedule</span>
              <span className="clean-field-val">{returnDate} at {returnTime}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Pickup &amp; Return Location</span>
              <span className="clean-field-val">{booking.pickupLocationName || 'Kathmandu Central'} → {booking.returnLocationName || 'Kathmandu Central'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Authorized Duration</span>
              <span className="clean-field-val">{rentalDays} Day(s)</span>
            </div>
          </div>
        </div>

        {/* 5. RENTAL CHARGES AND PAYMENT */}
        <div className="doc-section-card">
          <div className="sec-title">5. RENTAL CHARGES AND PAYMENT</div>
          <table className="doc-particulars-table">
            <thead>
              <tr>
                <th>Description</th>
                <th style={{ width: '30%', textAlign: 'center' }}>Rate / Computation</th>
                <th style={{ width: '25%', textAlign: 'right' }}>Amount (NPR)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="col-lbl">Base Motorcycle Rental</td>
                <td style={{ textAlign: 'center', color: '#64748b' }}>{rentalDays} Day(s) @ NPR {dailyRate.toLocaleString()}/d</td>
                <td className="col-val" style={{ textAlign: 'right' }}>{rentalSubtotal.toLocaleString()}</td>
              </tr>
              {extraCharges > 0 && (
                <tr>
                  <td className="col-lbl">Add-on Accessories &amp; Services</td>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>Gear / Delivery</td>
                  <td className="col-val" style={{ textAlign: 'right' }}>{extraCharges.toLocaleString()}</td>
                </tr>
              )}
              {taxAmount > 0 && (
                <tr>
                  <td className="col-lbl">Government Taxes / VAT</td>
                  <td style={{ textAlign: 'center', color: '#64748b' }}>Statutory Levy</td>
                  <td className="col-val" style={{ textAlign: 'right' }}>{taxAmount.toLocaleString()}</td>
                </tr>
              )}
              <tr style={{ borderTop: '1.5px solid #0f172a', borderBottom: '1.5px solid #0f172a' }}>
                <td className="col-lbl" style={{ fontWeight: 800, color: '#0f172a' }}>Total Rental Amount</td>
                <td style={{ textAlign: 'center', color: '#64748b', fontSize: '10px' }}>Agreed Total Payable</td>
                <td className="col-val" style={{ textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>{totalAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="col-lbl">Payment Advance Paid</td>
                <td style={{ textAlign: 'center', color: '#166534', fontSize: '10.5px' }}>{booking.paymentMethod || 'Settled'}</td>
                <td className="col-val" style={{ textAlign: 'right', color: '#166534', fontWeight: 600 }}>{paidAmount.toLocaleString()}</td>
              </tr>
              <tr>
                <td className="col-lbl">Balance Outstanding Due</td>
                <td style={{ textAlign: 'center', color: balanceDue > 0 ? '#b91c1c' : '#166534', fontSize: '10.5px' }}>
                  {balanceDue > 0 ? 'Pending Settlement' : 'Fully Paid'}
                </td>
                <td className="col-val" style={{ textAlign: 'right', color: balanceDue > 0 ? '#b91c1c' : '#166534', fontWeight: 700 }}>{balanceDue.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>

          <div className="clean-grid" style={{ marginTop: '6px' }}>
            <div className="clean-field">
              <span className="clean-field-lbl">Payment Method</span>
              <span className="clean-field-val">{booking.paymentMethod || 'Cash / QR / Card / Bank Transfer'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Payment Status &amp; Ref</span>
              <span className="clean-field-val">{balanceDue <= 0 ? 'Paid' : 'Partially Paid'} • Ref: {booking.transactionRef || booking.paymentReference || 'Direct Record'}</span>
            </div>
          </div>
        </div>

        {/* 6. SECURITY DEPOSIT */}
        <div className="doc-section-card">
          <div className="sec-title">6. SECURITY DEPOSIT</div>
          <div className="clean-grid">
            <div className="clean-field">
              <span className="clean-field-lbl">Refundable Deposit</span>
              <span className="clean-field-val" style={{ color: '#166534', fontWeight: 800 }}>NPR {securityDeposit.toLocaleString()}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Deposit Payment Method</span>
              <span className="clean-field-val">
                {collateral.collateralType === 'bank_cheque'
                  ? `Bank Cheque (${collateral.chequeBankName || 'Nabil Bank'}) • Cheque No: ${collateral.chequeNumber || 'On Record'}`
                  : collateral.collateralType === 'cash_card'
                  ? 'Cash / Digital Escrow'
                  : 'Refundable Security Deposit'}
              </span>
            </div>
          </div>
          <p className="doc-legal-p" style={{ marginTop: '4px' }}>
            The deposit is held as guarantee for vehicle return in intact condition. Documented deductions are permitted solely for outstanding rental charges, attributable traffic fines, or verified repair costs. The remaining balance shall be returned within {docSettings.depositRefundDays || '1 to 3'} working days after check-in.
          </p>
        </div>

        {/* Sheet 1 Footer */}
        <div className="doc-sheet-footer">
          <div>Page 1 of 4 • Agreement No: <strong>{agreementNo}</strong></div>
          <div>{company.name} • Official Motorcycle Rental Agreement</div>
        </div>
      </div>

      {/* ========================================================
          PAGE 2 OF 4: RULES OF USE, SAFETY & ROAD PROCEDURES
          ======================================================== */}
      <div className="doc-page doc-sheet">
        <div className="doc-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: '#0f172a' }}>
            <span>MOTORCYCLE RENTAL AGREEMENT</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#2563eb' }}>TERMS &amp; CONDITIONS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              Ref: <strong>{agreementNo}</strong>
            </span>
            <span className="doc-sheet-badge">Page 2 of 4</span>
          </div>
        </div>

        {/* 7. FUEL AND MILEAGE POLICY */}
        <div className="doc-section-card">
          <div className="sec-title">7. FUEL AND MILEAGE POLICY</div>
          <div className="clean-grid">
            <div className="clean-field">
              <span className="clean-field-lbl">Fuel Handover Level</span>
              <span className="clean-field-val">100% Full Tank (Return same as pickup)</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Mileage Allowance</span>
              <span className="clean-field-val">
                {vehicle.pricing?.allowedKmPerDay ? `${vehicle.pricing.allowedKmPerDay * rentalDays} km (${vehicle.pricing.allowedKmPerDay} km/day)` : 'Unlimited Kilometres'}
              </span>
            </div>
          </div>
          <p className="doc-legal-p">
            The Renter must return the motorcycle with the same fuel level. Any fuel shortfall will be charged at current commercial pump rates plus a modest refuelling surcharge. Excess kilometres, where applicable, are billed at NPR {vehicle.pricing?.extraKmRate || 20}/km.
          </p>
        </div>

        {/* 8. LATE RETURN POLICY */}
        <div className="doc-section-card">
          <div className="sec-title">8. LATE RETURN POLICY</div>
          <div className="clean-grid">
            <div className="clean-field">
              <span className="clean-field-lbl">Grace Period Allowed</span>
              <span className="clean-field-val">{docSettings.gracePeriod || '60 Minutes'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Late Return Charge Rate</span>
              <span className="clean-field-val">NPR {docSettings.lateFeePerHour || 500} / hour</span>
            </div>
          </div>
          <p className="doc-legal-p">
            Any extension must be requested and approved at least 3 hours prior to the return deadline. Unauthorized overdue returns incur standard hourly penalties and may result in immobilisation or recovery.
          </p>
        </div>

        {/* 9. RENTER'S RESPONSIBILITIES */}
        <div className="doc-section-card">
          <div className="sec-title">9. RENTER&apos;S RESPONSIBILITIES</div>
          <p className="doc-legal-p" style={{ marginBottom: '4px' }}>The Renter agrees to unconditionally:</p>
          <ol className="doc-legal-ol">
            <li>Operate the motorcycle strictly in accordance with Nepal Traffic Regulations and safety norms.</li>
            <li>Possess and carry the valid driving licence category and identity documents at all times.</li>
            <li>Wear an approved safety helmet and ensure all pillion passengers do the same.</li>
            <li>Keep the vehicle securely locked (using provided disc lock) when parked or unattended.</li>
            <li>Notify the Owner immediately in case of accident, damage, theft, or mechanical difficulty.</li>
            <li>Return the vehicle with all keys, helmets, Bluebook copies, and tools provided.</li>
            <li>Refrain from any unauthorized repairs, electrical modifications, or engine alterations.</li>
            <li>Never sublet, assign, transfer, or allow unauthorized third parties to operate the vehicle.</li>
            <li>Pay all tolls, parking charges, and violation fines incurred during the custody period.</li>
            <li>Cooperate fully with insurance adjusters, roadside units, and police investigations if required.</li>
          </ol>
        </div>

        {/* 10. PROHIBITED USE */}
        <div className="doc-section-card">
          <div className="sec-title">10. PROHIBITED USE</div>
          <p className="doc-legal-p" style={{ marginBottom: '4px' }}>The following uses are strictly prohibited and void all damage waivers:</p>
          <ol className="doc-legal-ol">
            <li>Operating the motorcycle under the influence of alcohol, narcotics, or intoxicating drugs.</li>
            <li>Engaging in racing, speed stunts, rallies, off-track stunts, or driving school tutoring.</li>
            <li>Transporting illegal substances, contraband, hazardous materials, or commercial freight.</li>
            <li>Carrying more than one pillion rider or exceeding manufacturer weight capacities.</li>
            <li>Crossing international borders (including India / Tibet) without written permits from the Owner.</li>
            <li>Operating in restricted geopolitical zones without explicit permits and permissions.</li>
            <li>Tampering with speed governors, odometers, telemetry wiring, or registration plates.</li>
            <li>Subleasing or transferring the vehicle to any individual not named in this Agreement.</li>
          </ol>
        </div>

        {/* 11. DAMAGE AND REPAIR POLICY */}
        <div className="doc-section-card">
          <div className="sec-title">11. DAMAGE AND REPAIR POLICY</div>
          <p className="doc-legal-p">
            All damages incurred during the rental period are assessed transparently using official manufacturer parts catalogues. The Renter is liable only for damage caused during their custody, excluding ordinary wear and tear.
          </p>
          <p className="doc-legal-p">
            Unauthorized roadside repairs or third-party modifications are strictly prohibited. In case of mechanical faults, the Owner will dispatch authorized assistance or provide a replacement unit.
          </p>
        </div>

        {/* 12. ACCIDENT AND INSURANCE POLICY */}
        <div className="doc-section-card">
          <div className="sec-title">12. ACCIDENT AND INSURANCE POLICY</div>
          <p className="doc-legal-p" style={{ marginBottom: '4px' }}>In the unfortunate event of an accident or collision, the Renter must:</p>
          <ol className="doc-legal-ol">
            <li>Ensure personal safety, stop in a safe spot, and call emergency medical services if needed.</li>
            <li>Immediately notify the Owner and report the incident to Nepal Police (Dial: 100 / 103).</li>
            <li>Secure contact details, registration numbers, and insurance information of any other parties involved.</li>
            <li>Take clear photographs of the vehicles, damage points, road situation, and surrounding landmarks.</li>
            <li>Obtain a formal Police Report copy (Sarjamin Muchulka) required for third-party insurance processing.</li>
          </ol>
          <div className="clean-grid" style={{ marginTop: '6px' }}>
            <div className="clean-field">
              <span className="clean-field-lbl">Insurance Provider</span>
              <span className="clean-field-val">{docSettings.insuranceProvider || 'Comprehensive Motor Insurance'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">24/7 Emergency Helpline</span>
              <span className="clean-field-val">{docSettings.emergencyContact || company.phone || '+977-1-4700000'}</span>
            </div>
          </div>
        </div>

        {/* Sheet 2 Footer */}
        <div className="doc-sheet-footer">
          <div>Page 2 of 4 • Agreement No: <strong>{agreementNo}</strong></div>
          <div>{company.name} • Road Safety &amp; Usage Policies</div>
        </div>
      </div>

      {/* ========================================================
          PAGE 3 OF 4: LEGAL PROVISIONS, INSPECTION & DISPUTES
          ======================================================== */}
      <div className="doc-page doc-sheet">
        <div className="doc-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: '#0f172a' }}>
            <span>MOTORCYCLE RENTAL AGREEMENT</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#2563eb' }}>TERMS &amp; CONDITIONS</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              Ref: <strong>{agreementNo}</strong>
            </span>
            <span className="doc-sheet-badge">Page 3 of 4</span>
          </div>
        </div>

        {/* 13. TRAFFIC FINES AND PENALTIES */}
        <div className="doc-section-card">
          <div className="sec-title">13. TRAFFIC FINES AND PENALTIES</div>
          <p className="doc-legal-p">
            The Renter is solely responsible for all traffic fines, speeding citations, parking tickets, and municipal levies incurred during the rental possession period. The Owner is authorized to deduct verified unpaid fines from the deposit or re-invoice the Renter.
          </p>
        </div>

        {/* 14. THEFT OR LOSS OF MOTORCYCLE */}
        <div className="doc-section-card">
          <div className="sec-title">14. THEFT OR LOSS OF MOTORCYCLE</div>
          <p className="doc-legal-p">
            If the motorcycle or any accessory is stolen, the Renter must notify the Owner and the nearest Police Station within 2 hours. The Renter must promptly deliver the motorcycle key and formal police report to the Owner. Liability shall be determined under applicable insurance terms and statutory guidelines.
          </p>
        </div>

        {/* 15. CANCELLATION AND REFUND POLICY */}
        <div className="doc-section-card">
          <div className="sec-title">15. CANCELLATION AND REFUND POLICY</div>
          <div className="clean-grid">
            <div className="clean-field">
              <span className="clean-field-lbl">Cancellation Deadline</span>
              <span className="clean-field-val">{docSettings.cancellationDeadline || '24 Hours prior to scheduled pickup'}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Applicable Cancellation Fee</span>
              <span className="clean-field-val">NPR {docSettings.cancellationFee !== undefined ? docSettings.cancellationFee : '500 or 10% of booking'}</span>
            </div>
          </div>
          <p className="doc-legal-p">
            Cancellations made within the permitted window receive full refunds less standard bank gateway handling fees. Early returns are subject to adjusted rates based on actual rental duration utilized.
          </p>
        </div>

        {/* 16. MECHANICAL FAILURE */}
        <div className="doc-section-card">
          <div className="sec-title">16. MECHANICAL FAILURE</div>
          <p className="doc-legal-p">
            In the event of manufacturing defects, engine breakdown, or mechanical failures not attributable to rider misuse or negligence, the Owner shall arrange prompt breakdown recovery and provide an equivalent replacement vehicle or proportional refund.
          </p>
        </div>

        {/* 17. RETURN INSPECTION */}
        <div className="doc-section-card">
          <div className="sec-title">17. RETURN CHECK-IN &amp; INSPECTION</div>
          <p className="doc-legal-p">
            Upon return, the motorcycle undergoes joint inspection for odometer verification, fuel level, and condition checklist:
          </p>
          <div className="clean-grid-3">
            <div className="clean-field">
              <span className="clean-field-lbl">Return Date &amp; Time</span>
              <span className="clean-field-val">{returnDate} (Standard Check-in)</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Return Odometer</span>
              <span className="clean-field-val">Recorded at check-in</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Return Fuel Level</span>
              <span className="clean-field-val">100% Full Tank</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Keys &amp; Accessories</span>
              <span className="clean-field-val">Verified Complete (Yes)</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">New Damage Observed</span>
              <span className="clean-field-val">None (Satisfactory)</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Settlement Outcome</span>
              <span className="clean-field-val" style={{ color: '#166534' }}>Full Deposit Refund Approved</span>
            </div>
          </div>
          <div style={{ marginTop: '6px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>Return Inspection Remarks:</div>
            <div className="doc-remarks-box">
              Vehicle returned in satisfactory mechanical and physical condition. Fuel and odometer verified. Security deposit release processed.
            </div>
          </div>
        </div>

        {/* 18. PRIVACY AND DOCUMENT HANDLING */}
        <div className="doc-section-card">
          <div className="sec-title">18. PRIVACY AND DOCUMENT HANDLING</div>
          <p className="doc-legal-p">
            Customer personal identification data, driving licence scans, and emergency contact details are handled confidentially in full compliance with the Privacy Act of Nepal and used solely for lawful rental verification and administration.
          </p>
        </div>

        {/* 19. TERMINATION OF AGREEMENT */}
        <div className="doc-section-card">
          <div className="sec-title">19. TERMINATION OF AGREEMENT</div>
          <p className="doc-legal-p">
            The Owner reserves the right to immediately terminate this Agreement and repossess the vehicle without prior notice if the Renter engages in unlawful operations, impairs rider safety, fails to settle dues, or commits material breach of terms.
          </p>
        </div>

        {/* 20. DISPUTE RESOLUTION AND GOVERNING LAW */}
        <div className="doc-section-card">
          <div className="sec-title">20. DISPUTE RESOLUTION AND GOVERNING LAW</div>
          <p className="doc-legal-p">
            This Agreement shall be interpreted and enforced under the laws of Nepal. Any dispute arising out of this Agreement shall first be submitted to mutual amicable consultation, failing which the courts located in {docSettings.disputeVenue || 'Kathmandu, Nepal'} shall have exclusive jurisdiction.
          </p>
        </div>

        {/* Sheet 3 Footer */}
        <div className="doc-sheet-footer">
          <div>Page 3 of 4 • Agreement No: <strong>{agreementNo}</strong></div>
          <div>{company.name} • Legal Provisions &amp; Inspection</div>
        </div>
      </div>

      {/* ========================================================
          PAGE 4 OF 4: DECLARATIONS, SIGNATURES & EXECUTION
          ======================================================== */}
      <div className="doc-page doc-sheet">
        <div className="doc-sheet-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', color: '#0f172a' }}>
            <span>MOTORCYCLE RENTAL AGREEMENT</span>
            <span style={{ color: '#94a3b8' }}>•</span>
            <span style={{ color: '#166534' }}>EXECUTION &amp; SIGNATURES</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '11px', color: '#64748b', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              Ref: <strong>{agreementNo}</strong>
            </span>
            <span className="doc-sheet-badge">Page 4 of 4</span>
          </div>
        </div>

        {/* 21. CUSTOMER DECLARATION */}
        <div className="doc-section-card">
          <div className="sec-title">21. CUSTOMER DECLARATION</div>
          <p className="doc-legal-p" style={{ marginBottom: '4px' }}>I, the undersigned Renter, hereby solemnly declare and confirm that:</p>
          <ul className="doc-legal-ol" style={{ listStyleType: 'disc' }}>
            <li>All personal particulars, licence numbers, and identification documents supplied are genuine and correct.</li>
            <li>I have thoroughly inspected the motorcycle and agree with the recorded pre-handover physical condition.</li>
            <li>I fully understand the rental schedule, financial charges, fuel expectations, and security deposit terms.</li>
            <li>I have carefully read, understood, and agreed to all 24 sections and clauses of this Motorcycle Rental Agreement.</li>
            <li>I shall ride responsibly, obey all traffic rules of Nepal, and safeguard the vehicle from neglect or damage.</li>
            <li>I acknowledge receiving the original copy of this Agreement, Bluebook copy, and keys.</li>
          </ul>
        </div>

        {/* 22. SIGNATURES OF THE PARTIES */}
        <div className="doc-section-card">
          <div className="sec-title">22. SIGNATURES OF THE PARTIES</div>
          <div className="modern-signatures" style={{ marginTop: '20px' }}>
            <div className="sig-block">
              <div className="sig-role">RENTER / CUSTOMER</div>
              <div style={{ minHeight: '44px' }} />
              <div className="sig-line" />
              <div className="sig-name">{customer.fullName || booking.customerName || 'Authorized Hirer'}</div>
              <div className="sig-meta">Date: {agreementDate} • Signature / Acceptance</div>
            </div>

            <div className="sig-block">
              <div className="sig-role">OWNER / REPRESENTATIVE</div>
              <div style={{ minHeight: '44px' }} />
              <div className="sig-line" />
              <div className="sig-name">{company.name}</div>
              <div className="sig-meta">{docSettings.authorizedRepresentative || 'Operations Officer'} • Stamp &amp; Signature</div>
            </div>

            <div className="sig-block">
              <div className="sig-role">WITNESS / GUARANTOR</div>
              <div style={{ minHeight: '44px' }} />
              <div className="sig-line" />
              <div className="sig-name">{collateral?.guarantorName || 'Witness'}</div>
              <div className="sig-meta">Date: {agreementDate} • Verification Witness</div>
            </div>
          </div>
        </div>

        {/* 23. MOTORCYCLE HANDOVER CONFIRMATION */}
        <div className="doc-section-card" style={{ marginTop: '22px' }}>
          <div className="sec-title">23. MOTORCYCLE HANDOVER CONFIRMATION</div>
          <p className="doc-legal-p">
            I confirm that the motorcycle and listed accessories were inspected and handed over in satisfactory roadworthy condition.
          </p>
          <div className="clean-grid">
            <div className="clean-field">
              <span className="clean-field-lbl">Handover Schedule</span>
              <span className="clean-field-val">{pickupDate} at {pickupTime}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Handover Location</span>
              <span className="clean-field-val">{booking.pickupLocationName || 'Kathmandu Station'}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px', marginTop: '16px' }}>
            <div>
              <div style={{ borderBottom: '1px solid #0f172a', minHeight: '26px' }} />
              <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>Staff / Handover Officer Signature</div>
            </div>
            <div>
              <div style={{ borderBottom: '1px solid #0f172a', minHeight: '26px' }} />
              <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>Renter Acceptance Signature</div>
            </div>
          </div>
        </div>

        {/* 24. MOTORCYCLE RETURN CONFIRMATION */}
        <div className="doc-section-card" style={{ marginTop: '18px' }}>
          <div className="sec-title">24. MOTORCYCLE RETURN CONFIRMATION</div>
          <p className="doc-legal-p">
            I confirm that the motorcycle was returned and check-in inspected. Applicable settlement, fuel adjustments, and deposit refunds recorded.
          </p>
          <div className="clean-grid">
            <div className="clean-field">
              <span className="clean-field-lbl">Return Schedule</span>
              <span className="clean-field-val">{returnDate} at {returnTime}</span>
            </div>
            <div className="clean-field">
              <span className="clean-field-lbl">Return Location</span>
              <span className="clean-field-val">{booking.returnLocationName || 'Kathmandu Station'}</span>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '36px', marginTop: '16px' }}>
            <div>
              <div style={{ borderBottom: '1px solid #0f172a', minHeight: '26px' }} />
              <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>Return Check-In Officer Signature</div>
            </div>
            <div>
              <div style={{ borderBottom: '1px solid #0f172a', minHeight: '26px' }} />
              <div style={{ fontSize: '10.5px', color: '#64748b', marginTop: '4px' }}>Renter Final Check-In Signature</div>
            </div>
          </div>
        </div>

        {/* ATTACHMENTS & CHECKLIST REFERENCE */}
        <div className="doc-section-card" style={{ marginTop: '20px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <div style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#0f172a', marginBottom: '8px' }}>
            VERIFIED ATTACHMENTS &amp; CHECKLIST
          </div>
          <ol className="doc-legal-ol" style={{ columnCount: 2, columnGap: '28px', margin: 0, paddingLeft: '16px' }}>
            <li>Customer identity document verification record</li>
            <li>Valid driving licence verification scan</li>
            <li>Motorcycle pre-handover condition photographs</li>
            <li>Handover checklist (helmet, tools, bluebook)</li>
            <li>Return inspection report &amp; fuel verification</li>
            <li>Rental payment &amp; security deposit receipt</li>
            <li>Comprehensive motor insurance certificate</li>
            <li>Additional mutually agreed rider terms</li>
          </ol>
          <div style={{ textAlign: 'center', marginTop: '16px', fontSize: '11px', fontWeight: 800, color: '#0f172a', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            ••• END OF MOTORCYCLE RENTAL AGREEMENT •••
          </div>
        </div>

        {/* Sheet 4 Footer */}
        <div className="doc-sheet-footer">
          <div>Page 4 of 4 • Agreement No: <strong>{agreementNo}</strong></div>
          <div>{company.name} • Execution &amp; Verified Signatures</div>
        </div>
      </div>
    </>
  )
}

export default AgreementDocument

