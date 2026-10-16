import React from 'react'

export interface DocumentDataProps {
  data: any
}

export const HandoverDocument: React.FC<DocumentDataProps> = ({ data }) => {
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

  const prefix = docSettings.handoverPrefix || 'HO-'
  const cleanCode = booking.bookingCode ? booking.bookingCode.replace(/^HRN-|^CTR-|^HO-/, '') : '2026-0001'
  const sheetNo = `${prefix}${cleanCode}`

  const formattedDate = new Date().toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })

  // Default checklist items or from settings
  const defaultChecklist = [
    'Bluebook Copy in Glovebox',
    'Headlamps & Indicators Working',
    'Comprehensive Insurance Policy',
    'Helmets Provided (Two-Wheeler)',
    'Spare Tyre & Toolkit / Jack',
    'First Aid Kit & Warning Triangle',
    'Road Tax & Pollution Token',
    'Clean Exterior & Interior Wash',
  ]

  const checklistItems = docSettings.checklistItems
    ? docSettings.checklistItems
        .split('\n')
        .map((item: string) => item.trim())
        .filter(Boolean)
    : defaultChecklist

  // Split into pairs for 2-column table
  const pairs: Array<[string, string | null]> = []
  for (let i = 0; i < checklistItems.length; i += 2) {
    pairs.push([checklistItems[i], checklistItems[i + 1] || null])
  }

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
            Handover & Inspection
          </div>
          <div className="doc-meta-line">
            <span className="doc-meta-row">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              Sheet No: <strong>{sheetNo}</strong>
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

      {/* Grid Fields */}
      <div className="sec-title">01 — Vehicle & Hirer Particulars</div>
      <div className="grid-fields">
        <div className="field-item">
          <span className="field-lbl">Vehicle Make / Model</span>
          <span className="field-val">
            <strong>
              {vehicle.make
                ? `${vehicle.make} ${vehicle.model} (${vehicle.year || ''})`
                : booking.vehicleModel || 'N/A'}
            </strong>
          </span>
        </div>
        <div className="field-item">
          <span className="field-lbl">Registration / Plate No.</span>
          <span className="field-val">
            <strong>{vehicle.plateNumber || booking.vehiclePlate || 'N/A'}</strong>
          </span>
        </div>
        <div className="field-item">
          <span className="field-lbl">Renter Name & Contact</span>
          <span className="field-val">
            <strong>{customer.fullName || booking.customerName || 'N/A'}</strong> (
            {customer.phone || booking.customerPhone || 'N/A'})
          </span>
        </div>
        <div className="field-item">
          <span className="field-lbl">Rental Period</span>
          <span className="field-val">
            {booking.startDate ? new Date(booking.startDate).toLocaleDateString('en-GB') : 'N/A'} —{' '}
            {booking.endDate ? new Date(booking.endDate).toLocaleDateString('en-GB') : 'N/A'}
          </span>
        </div>
        <div className="field-item">
          <span className="field-lbl">Starting Odometer</span>
          <span className="field-val">
            {vehicle.odometer ? `${vehicle.odometer.toLocaleString()} km` : '________________ km'}
          </span>
        </div>
        <div className="field-item">
          <span className="field-lbl">Fuel Level at Handover</span>
          <span className="field-val">
            <strong>[ Full / 100% ]</strong> (Gauge: E • 1/4 • 1/2 • 3/4 • F)
          </span>
        </div>
      </div>

      {/* Checklist */}
      <div className="sec-title">02 — Fleet Inventory & Verification Checklist</div>
      <table className="modern-table">
        <thead>
          <tr>
            <th style={{ width: '8%', textAlign: 'center' }}>Check</th>
            <th>Inspection Item</th>
            <th style={{ width: '8%', textAlign: 'center' }}>Check</th>
            <th>Inspection Item</th>
          </tr>
        </thead>
        <tbody>
          {pairs.map((pair, idx) => (
            <tr key={idx}>
              <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, border: '1.5px solid #16a34a', borderRadius: 3, background: '#f0fdf4' }}>
                  <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              </td>
              <td>{pair[0]}</td>
              <td style={{ textAlign: 'center', verticalAlign: 'middle' }}>
                {pair[1] ? (
                  <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 16, height: 16, border: '1.5px solid #16a34a', borderRadius: 3, background: '#f0fdf4' }}>
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="#16a34a" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </span>
                ) : ''}
              </td>
              <td>{pair[1] || ''}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Exterior Notes */}
      <div className="sec-title">03 — Pre-Existing Scratches & Exterior Notes</div>
      <div
        style={{
          minHeight: '60px',
          padding: '10px 0',
          borderBottom: '1px dashed #cbd5e1',
          fontSize: '11.5px',
          color: '#64748b',
        }}
      >
        No critical structural damage observed. Vehicle handed over in roadworthy operating condition.
      </div>

      {/* Signatures */}
      <div className="modern-signatures" style={{ gridTemplateColumns: '1fr 1fr', marginTop: '28px' }}>
        <div className="sig-block">
          <div className="sig-role">Customer Acceptance Signature</div>
          <div className="sig-line"></div>
          <div className="sig-name">{customer.fullName || booking.customerName || 'Customer'}</div>
          <div className="sig-meta">Vehicle and listed inventory received in good condition.</div>
        </div>

        <div className="sig-block">
          <div className="sig-role">Dispatch Officer Signature</div>
          <div className="sig-line"></div>
          <div className="sig-name">{company.name}</div>
          <div className="sig-meta">Keys dispatched and security collateral recorded.</div>
        </div>
      </div>

      {/* Modern Footer */}
      <div className="modern-footer">
        <div>{sheetNo} • Handover & Inspection Sheet</div>
        <div>Himalayan Rides Enterprise Fleet System</div>
      </div>
    </div>
  )
}

export default HandoverDocument

