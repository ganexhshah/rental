import React from 'react'

export interface DocumentDataProps {
  data: any
}

export const InvoiceDocument: React.FC<DocumentDataProps> = ({ data }) => {
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

  const prefix = docSettings.invoicePrefix || 'INV-'
  const cleanCode = booking.bookingCode ? booking.bookingCode.replace(/^HRN-|^CTR-|^INV-/, '') : '2026-0001'
  const invNo = `${prefix}${cleanCode}`

  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const vatRate = docSettings.invoiceVatRate !== undefined ? docSettings.invoiceVatRate : 13
  const subtotal = (booking.rentalAmount || 0) + (booking.extraCharges || 0) - (booking.discountAmount || 0)
  const vatTax = booking.taxAmount !== undefined ? booking.taxAmount : Math.round(subtotal * (vatRate / 100))
  const grandTotal = booking.totalAmount || subtotal + vatTax
  const paid = booking.paidAmount || 0
  const due = booking.balanceDue !== undefined ? booking.balanceDue : grandTotal - paid

  const logoUrl = company?.logoUrl || docSettings?.logoUrl || data?.branding?.logoUrl || '/favicon.svg'

  return (
    <div className="doc-page">
      {/* Header */}
      <div className="modern-header">
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
            <div className="brand-title">{company.name}</div>
            <div className="brand-sub">
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
                    Tel: {company.phone}
                  </span>
                )}
                {company.email && (
                  <span className="header-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="20" height="16" x="2" y="4" rx="2" />
                      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
                    </svg>
                    Email: {company.email}
                  </span>
                )}
              </div>
              <div className="header-meta-row" style={{ marginTop: '2px' }}>
                {company.taxId && (
                  <span className="header-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    {company.taxId}
                  </span>
                )}
                {company.registrationNumber && (
                  <span className="header-meta-item">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="8" r="6" />
                      <path d="M15.477 12.89 17 22l-5-3-5 3 1.523-9.11" />
                    </svg>
                    Reg: {company.registrationNumber}
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
            Tax Invoice
          </div>
          <div className="doc-meta-line">
            <span className="doc-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              Invoice No: <strong>{invNo}</strong>
            </span>
            <span className="doc-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              Date: <strong>{formattedDate}</strong>
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

      {/* Bill To & Details */}
      <div className="grid-fields" style={{ marginBottom: '20px' }}>
        <div className="field-item">
          <span className="field-lbl">Billed To (Customer)</span>
          <span className="field-val">
            <strong>{customer.fullName || booking.customerName || 'N/A'}</strong>
          </span>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            {customer.phone || booking.customerPhone || 'N/A'}
            <br />
            {customer.currentAddress || customer.address || 'Kathmandu, Nepal'}
          </span>
        </div>
        <div className="field-item">
          <span className="field-lbl">Asset & Rental Period</span>
          <span className="field-val">
            <strong>
              {vehicle.make ? `${vehicle.make} ${vehicle.model}` : booking.vehicleModel || 'Vehicle Rental'}
            </strong>{' '}
            ({vehicle.plateNumber || booking.vehiclePlate || 'N/A'})
          </span>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            {booking.totalDays || 1} Day(s) (
            {booking.startDate ? new Date(booking.startDate).toLocaleDateString('en-GB') : 'N/A'} —{' '}
            {booking.endDate ? new Date(booking.endDate).toLocaleDateString('en-GB') : 'N/A'})
          </span>
        </div>
      </div>

      {/* Line Items */}
      <div className="sec-title">Invoice Itemization</div>
      <table className="modern-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style={{ width: '18%', textAlign: 'center' }}>Duration</th>
            <th style={{ width: '22%', textAlign: 'right' }}>Unit Rate (NPR)</th>
            <th style={{ width: '22%', textAlign: 'right' }}>Amount (NPR)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              <strong>Vehicle Rental Service</strong>
              <div style={{ fontSize: '11px', color: '#64748b' }}>
                {vehicle.make ? `${vehicle.make} ${vehicle.model} (${vehicle.plateNumber || ''})` : booking.vehicleModel}
              </div>
            </td>
            <td style={{ textAlign: 'center' }}>{booking.totalDays || 1} Day(s)</td>
            <td style={{ textAlign: 'right' }}>{(booking.dailyRate || 0).toLocaleString()}</td>
            <td style={{ textAlign: 'right', fontWeight: 600 }}>{(booking.rentalAmount || 0).toLocaleString()}</td>
          </tr>

          {(booking.extraCharges || 0) > 0 && (
            <tr>
              <td>Logistics & Delivery Surcharges</td>
              <td style={{ textAlign: 'center' }}>1 Item</td>
              <td style={{ textAlign: 'right' }}>{(booking.extraCharges || 0).toLocaleString()}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>{(booking.extraCharges || 0).toLocaleString()}</td>
            </tr>
          )}

          {(booking.discountAmount || 0) > 0 && (
            <tr style={{ color: '#b91c1c' }}>
              <td>Promotional Discount</td>
              <td style={{ textAlign: 'center' }}>1</td>
              <td style={{ textAlign: 'right' }}>-{(booking.discountAmount || 0).toLocaleString()}</td>
              <td style={{ textAlign: 'right', fontWeight: 600 }}>-{(booking.discountAmount || 0).toLocaleString()}</td>
            </tr>
          )}

          <tr>
            <td colSpan={3} style={{ textAlign: 'right', color: '#64748b' }}>
              Subtotal:
            </td>
            <td style={{ textAlign: 'right', fontWeight: 600 }}>Rs. {subtotal.toLocaleString()}</td>
          </tr>
          <tr>
            <td colSpan={3} style={{ textAlign: 'right', color: '#64748b' }}>
              VAT Tax ({vatRate}%):
            </td>
            <td style={{ textAlign: 'right', fontWeight: 600 }}>Rs. {vatTax.toLocaleString()}</td>
          </tr>
          <tr className="highlight-total">
            <td colSpan={3} style={{ textAlign: 'right' }}>
              <strong>Grand Total:</strong>
            </td>
            <td style={{ textAlign: 'right' }}>
              <strong>Rs. {grandTotal.toLocaleString()}</strong>
            </td>
          </tr>
          <tr>
            <td colSpan={3} style={{ textAlign: 'right', color: '#166534' }}>
              Advance Paid:
            </td>
            <td style={{ textAlign: 'right', color: '#166534', fontWeight: 700 }}>Rs. {paid.toLocaleString()}</td>
          </tr>
          <tr>
            <td colSpan={3} style={{ textAlign: 'right', color: due > 0 ? '#b91c1c' : '#166534' }}>
              <strong>Balance Due:</strong>
            </td>
            <td style={{ textAlign: 'right', color: due > 0 ? '#b91c1c' : '#166534', fontWeight: 800 }}>
              Rs. {due.toLocaleString()}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Modern Signatures & Notes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px', marginTop: '30px' }}>
        <div style={{ fontSize: '11px', color: '#64748b' }}>
          <strong>Payment Terms:</strong>{' '}
          {docSettings.invoicePaymentTerms ||
            'Settlement via Cash / Card / Fonepay / Bank Transfer. Thank you for your business.'}
          <br />
          Thank you for choosing {company.name}.
        </div>

        <div className="sig-block" style={{ marginTop: '0' }}>
          <div className="sig-role">Authorized Signatory</div>
          <div className="sig-line"></div>
          <div className="sig-name">{company.name}</div>
          <div className="sig-meta">{docSettings.invoiceSignatory || 'Finance Desk'}</div>
        </div>
      </div>

      {/* Modern Footer */}
      <div className="modern-footer">
        <div>{invNo} • Official Tax Invoice</div>
        <div>Himalayan Rides Enterprise Fleet System</div>
      </div>
    </div>
  )
}

export default InvoiceDocument

