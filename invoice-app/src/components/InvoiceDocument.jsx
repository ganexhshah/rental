import React from 'react'

export function InvoiceDocument({ data }) {
  const company = data?.company || {
    name: 'Himalayan Rides Nepal Pvt. Ltd.',
    registrationNumber: 'REG-2026-KTM',
    taxId: 'PAN: 601234567',
    headquartersAddress: 'Thamel Marg, Kathmandu, Nepal',
    phone: '+977-1-4700000',
    email: 'operations@himalayanrides.com',
  }

  const booking = data?.booking || {}
  const customer = data?.customer || {}
  const vehicle = data?.vehicle || {}

  const invNo = `INV-${booking.bookingCode || '001'}`
  const invNo = `INV-${booking.bookingCode ? booking.bookingCode.replace(/^HRN-/, '') : '2026-0001'}`
  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  const subtotal = (booking.rentalAmount || 0) + (booking.extraCharges || 0) - (booking.discountAmount || 0)
  const vatTax = booking.taxAmount || Math.round(subtotal * 0.13)
  const grandTotal = booking.totalAmount || (subtotal + vatTax)
  const paid = booking.paidAmount || 0
  const due = booking.balanceDue !== undefined ? booking.balanceDue : (grandTotal - paid)

  return (
    <div className="doc-page">
      {/* Header */}
      <div className="doc-header">
      <div className="modern-header">
        <div>
          <div className="company-name">{company.name}</div>
          <div className="company-sub">
            {company.headquartersAddress} • Phone: {company.phone}
          <div className="brand-title">{company.name}</div>
          <div className="brand-sub">
            {company.headquartersAddress} • Tel: {company.phone} • Email: {company.email}
            <br />
            {company.taxId} • Reg: {company.registrationNumber}
          </div>
        </div>
        <div className="doc-meta">
          <div className="doc-badge" style={{ backgroundColor: '#0f172a', color: '#ffffff' }}>
            TAX INVOICE
          </div>
          <div className="doc-meta-text">
        <div className="doc-info">
          <div className="doc-type-badge">Tax Invoice</div>
          <div className="doc-meta-line">
            Invoice No: <strong>{invNo}</strong>
            <br />
            Booking Ref: <strong>{booking.bookingCode || 'N/A'}</strong>
            <br />
            Date: <strong>{formattedDate}</strong>
            Date: <strong>{formattedDate}</strong> • Booking: <strong>{booking.bookingCode || 'N/A'}</strong>
          </div>
        </div>
      </div>

      {/* Bill To & Reference */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', margin: '16px 0' }}>
        <div className="info-card">
          <div className="card-lbl">Billed To (Customer):</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
            {customer.fullName || booking.customerName || 'N/A'}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>
      {/* Bill To & Details */}
      <div className="grid-fields" style={{ marginBottom: '20px' }}>
        <div className="field-item">
          <span className="field-lbl">Billed To (Customer)</span>
          <span className="field-val"><strong>{customer.fullName || booking.customerName || 'N/A'}</strong></span>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            {customer.phone || booking.customerPhone || 'N/A'}
            <br />
            {customer.currentAddress || customer.address || 'Kathmandu, Nepal'}
          </div>
          </span>
        </div>

        <div className="info-card">
          <div className="card-lbl">Asset & Rental Details:</div>
          <div style={{ fontSize: '14px', fontWeight: 700, color: '#0f172a', marginTop: '2px' }}>
            {vehicle.make ? `${vehicle.make} ${vehicle.model} (${vehicle.year || ''})` : booking.vehicleModel || 'Fleet Asset'}
          </div>
          <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>
            Plate: <strong>{vehicle.plateNumber || booking.vehiclePlate || 'N/A'}</strong>
            <br />
            Period: {booking.totalDays || 1} Days ({booking.startDate ? new Date(booking.startDate).toLocaleDateString('en-GB') : 'N/A'} — {booking.endDate ? new Date(booking.endDate).toLocaleDateString('en-GB') : 'N/A'})
          </div>
        <div className="field-item">
          <span className="field-lbl">Asset & Rental Period</span>
          <span className="field-val">
            <strong>{vehicle.make ? `${vehicle.make} ${vehicle.model}` : booking.vehicleModel || 'Vehicle Rental'}</strong>
            {' '}({vehicle.plateNumber || booking.vehiclePlate || 'N/A'})
          </span>
          <span style={{ fontSize: '11.5px', color: '#64748b' }}>
            {booking.totalDays || 1} Day(s) ({booking.startDate ? new Date(booking.startDate).toLocaleDateString('en-GB') : 'N/A'} — {booking.endDate ? new Date(booking.endDate).toLocaleDateString('en-GB') : 'N/A'})
          </span>
        </div>
      </div>

      {/* Line Items Table */}
      <table className="doc-table-items">
      {/* Line Items */}
      <div className="sec-title">Invoice Itemization</div>
      <table className="modern-table">
        <thead>
          <tr>
            <th style={{ width: '45%' }}>Description</th>
            <th style={{ width: '15%', textAlign: 'center' }}>Duration</th>
            <th style={{ width: '20%', textAlign: 'right' }}>Rate (NPR)</th>
            <th style={{ width: '20%', textAlign: 'right' }}>Amount (NPR)</th>
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
              <td>Logistics & Delivery / Collection Surcharges</td>
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
            <td colSpan={3} style={{ textAlign: 'right', color: '#64748b' }}>Subtotal:</td>
            <td style={{ textAlign: 'right', fontWeight: 600 }}>Rs. {subtotal.toLocaleString()}</td>
          </tr>
          <tr>
            <td colSpan={3} style={{ textAlign: 'right', color: '#64748b' }}>VAT Tax (13%):</td>
            <td style={{ textAlign: 'right', fontWeight: 600 }}>Rs. {vatTax.toLocaleString()}</td>
          </tr>
          <tr className="highlight-total">
            <td colSpan={3} style={{ textAlign: 'right' }}><strong>Grand Total:</strong></td>
            <td style={{ textAlign: 'right' }}><strong>Rs. {grandTotal.toLocaleString()}</strong></td>
          </tr>
          <tr>
            <td colSpan={3} style={{ textAlign: 'right', color: '#166534' }}>Advance Paid:</td>
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

      {/* Summary Totals */}
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
        <table className="totals-table">
          <tbody>
            <tr>
              <td className="lbl">Subtotal:</td>
              <td className="val">NPR {subtotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="lbl">VAT (13%):</td>
              <td className="val">NPR {vatTax.toLocaleString()}</td>
            </tr>
            <tr className="total-highlight">
              <td className="lbl">Grand Total:</td>
              <td className="val" style={{ fontSize: '16px', color: '#0f172a' }}>NPR {grandTotal.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="lbl">Advance Paid:</td>
              <td className="val" style={{ color: '#166534', fontWeight: 700 }}>NPR {paid.toLocaleString()}</td>
            </tr>
            <tr style={{ borderTop: '1px solid #cbd5e1' }}>
              <td className="lbl">Balance Due:</td>
              <td className="val" style={{ color: due > 0 ? '#b91c1c' : '#166534', fontWeight: 800 }}>
                NPR {due.toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Notes */}
      <div style={{ marginTop: '36px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b' }}>
        <div>
      {/* Modern Signatures & Notes */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px', marginTop: '30px' }}>
        <div style={{ fontSize: '11px', color: '#64748b' }}>
          <strong>Payment Terms:</strong> Settlement via Cash / Card / Fonepay / Bank Transfer.
          <br />
          Thank you for choosing Himalayan Rides.
          Thank you for choosing {company.name}.
        </div>
        <div style={{ textAlign: 'right' }}>
          <div>Authorized Signatory</div>
          <div style={{ marginTop: '28px', borderTop: '1px dashed #94a3b8', width: '160px', marginLeft: 'auto' }}></div>

        <div className="sig-block" style={{ marginTop: '0' }}>
          <div className="sig-role">Authorized Signatory</div>
          <div className="sig-line"></div>
          <div className="sig-name">{company.name}</div>
          <div className="sig-meta">Finance Officer</div>
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

