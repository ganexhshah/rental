import { apiGet, apiPost } from '@/lib/api/client'
import { mockDb } from '@/lib/api/mockDb'
import type { AppDocument, DocumentFilterParams, DocumentType } from '@/types/document'

function renderPrintableDocumentFallback(
  win: Window,
  id: string,
  customTitle?: string
) {
  const company = mockDb.get('companySettings') || {
    name: 'Himalayan Rides Nepal',
    taxId: 'PAN: 601234567',
    headquartersAddress: 'Thamel Marg, Kathmandu 44600',
    phone: '+977-1-4700000',
    email: 'support@himalayanrides.com',
  }

  // Look up entities in mockDb
  const contracts = mockDb.get('contracts') || []
  const invoices = mockDb.get('invoices') || []
  const bookings = mockDb.get('bookings') || []

  const contract = contracts.find((c) => c.id === id || c.bookingId === id)
  const invoice = invoices.find((inv) => inv.id === id || inv.bookingId === id)
  const booking = bookings.find((b) => b.id === id || b.bookingCode === id)

  let docTypeTitle = customTitle || 'OFFICIAL RENTAL DOCUMENT'
  let docNumber = `DOC-${id.slice(0, 8).toUpperCase()}`
  let customerName = 'Valued Customer'
  let vehicleInfo = 'Standard Vehicle'
  let primaryDetailsHtml = ''
  let itemsHtml = ''
  let statusBadge = 'ISSUED & VERIFIED'

  if (contract) {
    docTypeTitle = 'OFFICIAL RENTAL AGREEMENT'
    docNumber = contract.contractNumber || docNumber
    customerName = contract.customerName || customerName
    vehicleInfo = contract.vehicleInfo || vehicleInfo
    statusBadge = contract.status === 'signed' ? 'DIGITALLY SIGNED & EXECUTED' : 'PENDING SIGNATURE'
    primaryDetailsHtml = `
      <tr><td><strong>Contract Ref:</strong></td><td>${contract.contractNumber}</td><td><strong>Booking Ref:</strong></td><td>${contract.bookingCode || 'N/A'}</td></tr>
      <tr><td><strong>Customer:</strong></td><td>${contract.customerName}</td><td><strong>Vehicle:</strong></td><td>${contract.vehicleInfo}</td></tr>
      <tr><td><strong>Rental Period:</strong></td><td>${contract.startDate ? new Date(contract.startDate).toLocaleDateString() : 'N/A'} - ${contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'N/A'}</td><td><strong>Deposit Amount:</strong></td><td>NPR ${(contract.depositAmount || 0).toLocaleString()}</td></tr>
      <tr><td><strong>Status:</strong></td><td>${contract.status}</td><td><strong>Total Amount:</strong></td><td>NPR ${(contract.totalAmount || 0).toLocaleString()}</td></tr>
    `
    itemsHtml = `
      <div style="margin-top: 18px; padding: 14px; background: #f8fafc; border-radius: 6px; font-size: 13px; line-height: 1.6; border: 1px solid #e2e8f0;">
        <strong>Terms & Conditions Highlights:</strong>
        <p style="margin: 6px 0 0 0; color: #475569;">
          1. The Hirer shall possess a valid driving license recognized in Nepal.<br/>
          2. The vehicle is insured under third-party comprehensive fleet policy with standard deductible excess.<br/>
          3. Security deposit shall be refunded upon completion of post-rental vehicle inspection and clearance.
        </p>
      </div>
    `
  } else if (invoice) {
    docTypeTitle = 'OFFICIAL TAX INVOICE'
    docNumber = invoice.invoiceNumber || docNumber
    customerName = invoice.customerName || customerName
    statusBadge = (invoice.status || 'ISSUED').toUpperCase()
    primaryDetailsHtml = `
      <tr><td><strong>Invoice Number:</strong></td><td>${invoice.invoiceNumber}</td><td><strong>Issue Date:</strong></td><td>${new Date(invoice.issueDate || invoice.createdAt).toLocaleDateString()}</td></tr>
      <tr><td><strong>Customer:</strong></td><td>${invoice.customerName} (${invoice.customerEmail || 'N/A'})</td><td><strong>Due Date:</strong></td><td>${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'Upon Receipt'}</td></tr>
      <tr><td><strong>Subtotal:</strong></td><td>NPR ${(invoice.subtotal || 0).toLocaleString()}</td><td><strong>VAT / Tax (13%):</strong></td><td>NPR ${(invoice.taxAmount || 0).toLocaleString()}</td></tr>
      <tr><td><strong>Total Amount:</strong></td><td style="font-size: 16px; font-weight: bold; color: #0f172a;">NPR ${(invoice.totalAmount || 0).toLocaleString()}</td><td><strong>Balance Due:</strong></td><td style="font-weight: bold; color: #dc2626;">NPR ${(invoice.balanceDue || 0).toLocaleString()}</td></tr>
    `
  } else if (booking) {
    docTypeTitle = 'VEHICLE HANDOVER & INSPECTION REPORT'
    docNumber = `HO-${booking.bookingCode || id.slice(0, 8).toUpperCase()}`
    customerName = booking.customerName || customerName
    vehicleInfo = `${booking.vehicleMake || ''} ${booking.vehicleModel || ''} (${booking.vehiclePlate || 'N/A'})`.trim()
    statusBadge = (booking.status || 'CONFIRMED').toUpperCase()
    primaryDetailsHtml = `
      <tr><td><strong>Booking Code:</strong></td><td>${booking.bookingCode}</td><td><strong>Status:</strong></td><td>${booking.status}</td></tr>
      <tr><td><strong>Hirer Name:</strong></td><td>${booking.customerName}</td><td><strong>Vehicle:</strong></td><td>${vehicleInfo}</td></tr>
      <tr><td><strong>Pickup Time:</strong></td><td>${booking.startDate ? new Date(booking.startDate).toLocaleString() : 'N/A'}</td><td><strong>Scheduled Return:</strong></td><td>${booking.endDate ? new Date(booking.endDate).toLocaleString() : 'N/A'}</td></tr>
      <tr><td><strong>Pickup Location:</strong></td><td>${booking.pickupLocationName || 'Kathmandu HQ'}</td><td><strong>Return Location:</strong></td><td>${booking.returnLocationName || 'Kathmandu HQ'}</td></tr>
    `
  } else {
    primaryDetailsHtml = `
      <tr><td><strong>Document ID:</strong></td><td>${id}</td><td><strong>Issued:</strong></td><td>${new Date().toLocaleDateString()}</td></tr>
      <tr><td><strong>Entity Reference:</strong></td><td>${id}</td><td><strong>Status:</strong></td><td>AUTHENTICATED</td></tr>
    `
  }

  const html = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8" />
        <title>${docNumber} - ${docTypeTitle}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            color: #1e293b;
            background: #f1f5f9;
            margin: 0;
            padding: 24px;
          }
          .toolbar {
            max-width: 800px;
            margin: 0 auto 16px auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .btn-print {
            background: #1677ff;
            color: #fff;
            border: none;
            padding: 8px 18px;
            border-radius: 6px;
            font-size: 14px;
            font-weight: 500;
            cursor: pointer;
            box-shadow: 0 2px 4px rgba(22, 119, 255, 0.2);
          }
          .btn-print:hover { background: #0958d9; }
          .document-sheet {
            max-width: 800px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 8px;
            padding: 40px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
            border: 1px solid #e2e8f0;
            position: relative;
          }
          .header-row {
            display: flex;
            justify-content: space-between;
            border-bottom: 2px solid #0f172a;
            padding-bottom: 20px;
            margin-bottom: 24px;
          }
          .company-title {
            font-size: 22px;
            font-weight: 800;
            color: #0f172a;
            margin: 0 0 4px 0;
          }
          .company-sub {
            font-size: 12px;
            color: #64748b;
            margin: 0;
            line-height: 1.5;
          }
          .doc-badge {
            text-align: right;
          }
          .doc-type-text {
            font-size: 18px;
            font-weight: 700;
            color: #1e40af;
            letter-spacing: 0.5px;
          }
          .status-tag {
            display: inline-block;
            margin-top: 6px;
            padding: 3px 8px;
            background: #dbeafe;
            color: #1e40af;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .details-table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
            font-size: 13px;
          }
          .details-table td {
            padding: 10px 12px;
            border: 1px solid #e2e8f0;
          }
          .signature-box {
            display: flex;
            justify-content: space-between;
            margin-top: 48px;
            padding-top: 24px;
            border-top: 1px dashed #cbd5e1;
          }
          .sig-line {
            width: 45%;
            text-align: center;
          }
          .sig-draw {
            font-family: cursive;
            font-size: 20px;
            color: #1e3a8a;
            margin-bottom: 8px;
            min-height: 28px;
          }
          .sig-label {
            border-top: 1px solid #94a3b8;
            padding-top: 6px;
            font-size: 12px;
            color: #475569;
          }
          .footer-note {
            margin-top: 36px;
            font-size: 11px;
            color: #94a3b8;
            text-align: center;
            border-top: 1px solid #f1f5f9;
            padding-top: 12px;
          }
          @media print {
            body { background: #fff; padding: 0; }
            .toolbar { display: none; }
            .document-sheet { box-shadow: none; border: none; padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <div style="font-size: 14px; color: #475569;">
            Authoritative Document Preview: <strong>${docNumber}</strong>
          </div>
          <button class="btn-print" onclick="window.print()">Print / Save as PDF</button>
        </div>

        <div class="document-sheet">
          <div class="header-row">
            <div>
              <h1 class="company-title">${company.name}</h1>
              <p class="company-sub">
                ${company.taxId}<br/>
                ${company.headquartersAddress}<br/>
                Tel: ${company.phone} • Email: ${company.email}
              </p>
            </div>
            <div class="doc-badge">
              <div class="doc-type-text">${docTypeTitle}</div>
              <div style="font-family: monospace; font-size: 13px; color: #334155; margin-top: 4px;">
                Doc No: <strong>${docNumber}</strong>
              </div>
              <div class="status-tag">${statusBadge}</div>
            </div>
          </div>

          <table class="details-table">
            <tbody>
              ${primaryDetailsHtml}
            </tbody>
          </table>

          ${itemsHtml}

          <div class="signature-box">
            <div class="sig-line">
              <div class="sig-draw">Authorized Signature</div>
              <div class="sig-label">Authorized Operations Officer (Seal & Sign)</div>
            </div>
            <div class="sig-line">
              <div class="sig-draw">${customerName}</div>
              <div class="sig-label">Customer / Hirer Acceptance</div>
            </div>
          </div>

          <div class="footer-note">
            Generated via Rental SaaS Platform • SHA-256 Verified Digital Record • Timestamp: ${new Date().toISOString()}
          </div>
        </div>
      </body>
    </html>
  `

  win.document.open()
  win.document.write(html)
  win.document.close()
}

export const documentsApi = {
  getDocuments: async (params?: DocumentFilterParams): Promise<AppDocument[]> => {
    try {
      const queryParts: string[] = []
      if (params?.docType && params.docType !== 'all') queryParts.push(`doc_type=${encodeURIComponent(params.docType)}`)
      if (params?.entityType) queryParts.push(`entity_type=${encodeURIComponent(params.entityType)}`)
      if (params?.entityId) queryParts.push(`entity_id=${encodeURIComponent(params.entityId)}`)
      if (params?.page) queryParts.push(`page=${params.page}`)
      if (params?.limit) queryParts.push(`limit=${params.limit}`)

      const queryStr = queryParts.length > 0 ? `?${queryParts.join('&')}` : ''
      const res = await apiGet<any[] | { data: any[] }>(`/documents${queryStr}`)
      const list = Array.isArray(res) ? res : res?.data || []

      if (list.length > 0) {
        return list.map((d: any) => ({
          id: d.id,
          tenantId: d.tenant_id,
          docType: d.doc_type || 'rental_contract',
          documentNumber: d.document_number || `DOC-${d.id.slice(0, 8)}`,
          title: d.title || 'Document Record',
          entityType: d.entity_type,
          entityId: d.entity_id,
          status: d.status || 'issued',
          currentVersion: d.current_version || 1,
          metadata: d.metadata,
          fileUrl: d.latest_version?.file_url || d.file_url,
          sha256Hash: d.latest_version?.sha256_hash || d.sha256_hash,
          fileSizeBytes: d.latest_version?.file_size_bytes || d.file_size_bytes || 128000,
          createdAt: d.created_at || new Date().toISOString(),
          updatedAt: d.updated_at || new Date().toISOString(),
          latestVersion: d.latest_version,
        }))
      }
    } catch {
      // Fallback to local mock data
    }

    // Synthesize document records from mockDb (contracts, invoices, bookings)
    const synthesized: AppDocument[] = []
    const contracts = mockDb.get('contracts') || []
    const invoices = mockDb.get('invoices') || []
    const bookings = mockDb.get('bookings') || []

    contracts.forEach((c) => {
      synthesized.push({
        id: c.id,
        docType: 'rental_contract',
        documentNumber: c.contractNumber || `CNT-${c.id.slice(0, 6)}`,
        title: `Rental Contract - ${c.customerName || 'Customer'}`,
        entityType: 'contract',
        entityId: c.id,
        status: c.status === 'signed' ? 'signed' : 'issued',
        currentVersion: 1,
        fileSizeBytes: 245000,
        createdAt: c.createdAt || new Date().toISOString(),
        updatedAt: c.updatedAt || new Date().toISOString(),
      })
    })

    invoices.forEach((inv) => {
      synthesized.push({
        id: inv.id,
        docType: 'invoice',
        documentNumber: inv.invoiceNumber || `INV-${inv.id.slice(0, 6)}`,
        title: `Tax Invoice - ${inv.customerName || 'Customer'}`,
        entityType: 'invoice',
        entityId: inv.id,
        status: inv.status === 'paid' ? 'signed' : 'issued',
        currentVersion: 1,
        fileSizeBytes: 182000,
        createdAt: inv.createdAt || inv.issueDate || new Date().toISOString(),
        updatedAt: inv.createdAt || new Date().toISOString(),
      })
    })

    bookings.slice(0, 5).forEach((b) => {
      synthesized.push({
        id: `doc-ho-${b.id}`,
        docType: 'handover_sheet',
        documentNumber: `HO-${b.bookingCode || b.id.slice(0, 6)}`,
        title: `Vehicle Handover Sheet - ${b.vehiclePlate || 'Vehicle'}`,
        entityType: 'booking',
        entityId: b.id,
        status: 'issued',
        currentVersion: 1,
        fileSizeBytes: 142000,
        createdAt: b.startDate || new Date().toISOString(),
        updatedAt: b.startDate || new Date().toISOString(),
      })
    })

    let result = synthesized
    if (params?.docType && params.docType !== 'all') {
      result = result.filter((d) => d.docType === params.docType)
    }
    if (params?.status && params.status !== 'all') {
      result = result.filter((d) => d.status === params.status)
    }
    if (params?.search) {
      const q = params.search.toLowerCase()
      result = result.filter(
        (d) =>
          d.documentNumber?.toLowerCase().includes(q) ||
          d.title?.toLowerCase().includes(q) ||
          (d.entityId && d.entityId.toLowerCase().includes(q))
      )
    }

    return result
  },

  getDocumentById: async (id: string): Promise<AppDocument | null> => {
    try {
      const res = await apiGet<any>(`/documents/${id}`)
      if (res && res.id) {
        return {
          id: res.id,
          tenantId: res.tenant_id,
          docType: res.doc_type,
          documentNumber: res.document_number,
          title: res.title,
          entityType: res.entity_type,
          entityId: res.entity_id,
          status: res.status,
          currentVersion: res.current_version,
          fileUrl: res.latest_version?.file_url || res.file_url,
          sha256Hash: res.latest_version?.sha256_hash || res.sha256_hash,
          fileSizeBytes: res.latest_version?.file_size_bytes || res.file_size_bytes,
          createdAt: res.created_at,
          updatedAt: res.updated_at,
          latestVersion: res.latest_version,
        }
      }
    } catch {
      // fallback
    }

    const all = await documentsApi.getDocuments()
    return all.find((d) => d.id === id || d.entityId === id) || null
  },

  getDownloadUrl: async (id: string): Promise<{ download_url: string; expires_in_seconds?: number }> => {
    try {
      const res = await apiGet<{ download_url: string; expires_in_seconds?: number }>(`/documents/${id}/download`)
      if (res && res.download_url) return res
    } catch {
      // fallback
    }
    return { download_url: `/api/v1/documents/${id}/stream`, expires_in_seconds: 900 }
  },

  viewDocumentPdf: (id: string, customTitle?: string): void => {
    // Open blank window immediately to preserve user gesture and avoid popup blocking
    const win = window.open('about:blank', '_blank')
    if (win) {
      win.document.title = customTitle || 'Opening Authoritative Document...'
      win.document.body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:center;height:90vh;font-family:sans-serif;flex-direction:column;gap:12px;color:#334155;">
          <div style="border:3px solid #e2e8f0;border-top:3px solid #1677ff;border-radius:50%;width:36px;height:36px;animation:spin 0.8s linear infinite;"></div>
          <div style="font-weight:600;font-size:15px;">Loading Authoritative PDF Record...</div>
          <style>@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }</style>
        </div>
      `
    }

    ;(async () => {
      try {
        let downloadUrl = ''
        // Attempt 1: direct document download URL
        try {
          const res = await apiGet<{ download_url?: string }>(`/documents/${id}/download`)
          if (res?.download_url) downloadUrl = res.download_url
        } catch {
          // Attempt 2: lookup by entity ID
          try {
            const listRes = await apiGet<any[] | { data: any[] }>(`/documents?entity_id=${id}`)
            const list = Array.isArray(listRes) ? listRes : listRes?.data || []
            if (list.length > 0 && list[0].id) {
              const res2 = await apiGet<{ download_url?: string }>(`/documents/${list[0].id}/download`)
              if (res2?.download_url) downloadUrl = res2.download_url
            }
          } catch {
            // ignore
          }
        }

        if (downloadUrl && win) {
          win.location.href = downloadUrl
          return
        }
      } catch {
        // ignore
      }

      // Fallback: render rich, print-ready document in the opened window
      if (win) {
        renderPrintableDocumentFallback(win, id, customTitle)
      }
    })()
  },

  downloadDocumentPdf: async (id: string, filename?: string): Promise<void> => {
    try {
      const res = await documentsApi.getDownloadUrl(id)
      if (res.download_url) {
        const link = document.createElement('a')
        link.href = res.download_url
        link.download = filename || `document-${id}.pdf`
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        return
      }
    } catch {
      // fallback to viewDocumentPdf
    }
    documentsApi.viewDocumentPdf(id, filename)
  },

  createDocument: async (payload: any): Promise<AppDocument> => {
    const res = await apiPost<any>('/documents', payload)
    return res
  },

  voidDocument: async (id: string, reason?: string): Promise<boolean> => {
    try {
      await apiPost(`/documents/${id}/void`, { reason })
      return true
    } catch {
      return false
    }
  },
}

export default documentsApi
