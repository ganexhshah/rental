import { apiGet, apiPost } from '@/lib/api/client'
import { mockDb } from '@/lib/api/mockDb'
import type { PaymentTransaction, DepositRecord, Invoice, RefundRequest } from '@/types/payment'

function mapBackendPayment(p: any): PaymentTransaction {
  return {
    id: p.id,
    transactionNumber: p.transaction_number,
    tenantId: p.tenant_id,
    bookingId: p.booking_id || '',
    customerId: p.customer_id || '',
    customerName: 'Customer',
    amount: Number(p.amount) || 0,
    currency: p.currency || 'NPR',
    category: p.category || 'rental',
    method: p.method || 'cash',
    gateway: p.gateway || 'Direct',
    status: p.status || 'completed',
    notes: p.notes,
    timestamp: p.created_at || new Date().toISOString(),
    createdAt: p.created_at || new Date().toISOString(),
  }
}

function mapBackendInvoice(i: any): Invoice {
  return {
    id: i.id,
    invoiceNumber: i.invoice_number,
    tenantId: i.tenant_id || '78248f8f-e390-4f85-a03f-58e4974fa366',
    bookingId: i.booking_id || '',
    bookingCode: i.booking_code || 'BK-1001',
    customerId: i.customer_id,
    customerName: i.customer_name || 'Customer',
    customerEmail: i.customer_email || '',
    subtotal: Number(i.subtotal) || 0,
    taxRate: 13,
    taxAmount: Number(i.tax_amount) || 0,
    discountAmount: Number(i.discount_amount) || 0,
    totalAmount: Number(i.total_amount) || 0,
    paidAmount: Number(i.paid_amount) || 0,
    balanceDue: Number(i.balance_due) || 0,
    status: i.status || 'issued',
    issueDate: i.issued_date || i.issue_date || new Date().toISOString(),
    dueDate: i.due_date,
    items: [],
    createdAt: i.created_at || new Date().toISOString(),
  }
}

export const paymentsApi = {
  getTransactions: async (params?: { search?: string; status?: string; method?: string; category?: string }): Promise<PaymentTransaction[]> => {
    let list: PaymentTransaction[] = []
    try {
      const backendList = await apiGet<any[]>('/payments')
      if (Array.isArray(backendList)) {
        list = backendList.map(mapBackendPayment)
      }
    } catch (e) {
      console.warn('Live backend payments error, using fallback:', e)
    }

    if (list.length === 0) {
      list = [...(mockDb.get('payments') || [])]
    }

    // Enrich missing customer names and booking codes if available
    const allCustomers = mockDb.get('customers') || []
    const allBookings = mockDb.get('bookings') || []
    list = list.map((p) => {
      let custName = p.customerName
      let bkCode = p.bookingCode
      if ((!custName || custName === 'Customer') && p.customerId) {
        const c = allCustomers.find((cust: any) => cust.id === p.customerId)
        if (c) custName = c.fullName
      }
      if (!bkCode && p.bookingId) {
        const b = allBookings.find((bk: any) => bk.id === p.bookingId)
        if (b) {
          bkCode = b.bookingCode
          if (!custName || custName === 'Customer') custName = b.customerName
        }
      }
      return { ...p, customerName: custName || 'Customer', bookingCode: bkCode }
    })

    if (params?.search) {
      const q = params.search.toLowerCase()
      list = list.filter(
        (p) =>
          p.transactionNumber?.toLowerCase().includes(q) ||
          p.customerName?.toLowerCase().includes(q) ||
          p.bookingCode?.toLowerCase().includes(q)
      )
    }
    if (params?.status && params.status !== 'all') {
      list = list.filter((p) => p.status === params.status)
    }
    if (params?.method && params.method !== 'all') {
      list = list.filter((p) => p.method === params.method)
    }
    if (params?.category && params.category !== 'all') {
      list = list.filter((p) => p.category === params.category)
    }
    return list
  },

  getTransactionById: async (id: string): Promise<PaymentTransaction | null> => {
    try {
      const p = await apiGet<any>(`/payments/${id}`)
      if (p && p.id) return mapBackendPayment(p)
    } catch (_) {}

    const all = await paymentsApi.getTransactions()
    return all.find((p) => p.id === id || p.transactionNumber === id) || null
  },

  recordPayment: async (data: Omit<PaymentTransaction, 'id' | 'transactionNumber' | 'timestamp' | 'createdAt' | 'tenantId' | 'customerName'> & { tenantId?: string; customerName?: string }): Promise<PaymentTransaction> => {
    try {
      const payload = {
        booking_id: data.bookingId ? data.bookingId : undefined,
        amount: data.amount,
        category: data.category,
        method: data.method,
        idempotency_key: `IDEM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        notes: data.notes || '',
      }
      const resp = await apiPost<any>('/payments', payload)
      if (resp && resp.payment) return mapBackendPayment(resp.payment)
    } catch (e) {
      console.warn('Live backend recordPayment error, saving to mockDb:', e)
    }

    const list = mockDb.get('payments') || []
    const randomTxn = `TXN-${Math.floor(1000 + Math.random() * 9000)}-${Date.now().toString().slice(-4)}`
    const newTxn: PaymentTransaction = {
      tenantId: data.tenantId || '78248f8f-e390-4f85-a03f-58e4974fa366',
      customerName: data.customerName || 'Customer',
      ...data,
      id: `pay-${Date.now()}`,
      transactionNumber: randomTxn,
      timestamp: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }
    mockDb.set('payments', [newTxn, ...list])
    return newTxn
  },

  createDeposit: async (data: Omit<DepositRecord, 'id' | 'heldAt' | 'status'>): Promise<DepositRecord> => {
    const list = mockDb.get('deposits') || []
    const newDeposit: DepositRecord = {
      ...data,
      id: `dep-${Date.now()}`,
      heldAt: new Date().toISOString(),
      status: 'held',
    }
    mockDb.set('deposits', [newDeposit, ...list])
    return newDeposit
  },

  getDeposits: async (): Promise<DepositRecord[]> => {
    try {
      const backendList = await apiGet<any[]>('/deposits')
      if (Array.isArray(backendList)) {
        return backendList.map((d: any) => ({
          id: d.id,
          tenantId: d.tenant_id || '78248f8f-e390-4f85-a03f-58e4974fa366',
          bookingId: d.booking_id,
          bookingCode: d.booking_code || 'BK-1001',
          customerId: d.customer_id,
          customerName: d.customer_name || 'Customer',
          amount: Number(d.amount) || 0,
          currency: d.currency || 'NPR',
          method: d.payment_method || 'cash',
          status: d.status || 'held',
          heldAt: d.created_at || new Date().toISOString(),
          releasedAt: d.released_at,
          releasedAmount: d.refunded_amount ? Number(d.refunded_amount) : undefined,
          deductionsAmount: d.deducted_amount ? Number(d.deducted_amount) : undefined,
          deductionReason: d.deduction_reason,
          notes: d.notes,
        }))
      }
    } catch (e) {
      console.warn('Live backend getDeposits error, using fallback:', e)
    }
    return mockDb.get('deposits')
  },

  releaseDeposit: async (id: string, refundAmount?: number, deductionAmount?: number, reason?: string): Promise<DepositRecord> => {
    try {
      if (deductionAmount && deductionAmount > 0) {
        await apiPost(`/deposits/${id}/deduct`, { amount: deductionAmount, reason: reason || 'Damage / extra charges' })
      } else {
        await apiPost(`/deposits/${id}/refund`, {})
      }
    } catch (e) {
      console.warn('Live backend releaseDeposit error, falling back to mockDb:', e)
    }

    const list = mockDb.get('deposits')
    const idx = list.findIndex((d) => d.id === id)
    if (idx === -1) throw new Error('Deposit record not found')

    list[idx].status = deductionAmount && deductionAmount > 0 ? 'partially_released' : 'released'
    list[idx].releasedAmount = refundAmount || list[idx].amount
    list[idx].deductionsAmount = deductionAmount || 0
    list[idx].deductionReason = reason
    list[idx].releasedAt = new Date().toISOString()
    mockDb.set('deposits', [...list])
    return list[idx]
  },

  getInvoices: async (): Promise<Invoice[]> => {
    try {
      const backendList = await apiGet<any[]>('/invoices')
      if (Array.isArray(backendList)) {
        return backendList.map(mapBackendInvoice)
      }
    } catch (e) {
      console.warn('Live backend getInvoices error:', e)
    }
    return mockDb.get('invoices')
  },

  createInvoice: async (data: Omit<Invoice, 'id' | 'invoiceNumber' | 'createdAt'>): Promise<Invoice> => {
    try {
      const payload = {
        booking_id: data.bookingId ? data.bookingId : undefined,
        customer_id: data.customerId,
        due_date: data.dueDate ? data.dueDate.split('T')[0] : new Date(Date.now() + 86400000 * 7).toISOString().split('T')[0],
        tax_rate: data.taxRate || 13,
        notes: data.notes,
        terms: 'Payment due on presentation. Standard vehicle rental terms apply.',
        line_items: (data.items || []).map((it) => ({
          description: it.description,
          quantity: it.quantity,
          unit_price: it.unitPrice,
        })),
      }
      const resp = await apiPost<any>('/invoices', payload)
      if (resp && resp.id) {
        return mapBackendInvoice(resp)
      }
    } catch (e) {
      console.warn('Live backend createInvoice error, saving to mockDb:', e)
    }

    const list = mockDb.get('invoices')
    const invNumber = `INV-${new Date().getFullYear()}-${Math.floor(100 + Math.random() * 900)}`
    const newInvoice: Invoice = {
      ...data,
      id: `inv-${Date.now()}`,
      invoiceNumber: invNumber,
      createdAt: new Date().toISOString(),
    }
    mockDb.set('invoices', [newInvoice, ...list])
    return newInvoice
  },

  issueInvoice: async (id: string): Promise<any> => {
    return apiPost(`/invoices/${id}/issue`)
  },

  voidInvoice: async (id: string, reason?: string): Promise<any> => {
    return apiPost(`/invoices/${id}/void`, { reason: reason || 'Voided by administrative user' })
  },

  createCreditNote: async (invoiceId: string, amount: number, reason: string): Promise<any> => {
    return apiPost(`/invoices/${invoiceId}/credit-note`, { amount, reason })
  },

  getRefunds: async (): Promise<RefundRequest[]> => {
    return mockDb.get('refunds')
  },

  createRefundRequest: async (data: Omit<RefundRequest, 'id' | 'status' | 'requestedAt'>): Promise<RefundRequest> => {
    const list = mockDb.get('refunds')
    const newRefund: RefundRequest = {
      ...data,
      id: `ref-${Date.now()}`,
      status: 'pending',
      requestedAt: new Date().toISOString(),
    }
    mockDb.set('refunds', [newRefund, ...list])
    return newRefund
  },

  processRefund: async (id: string, status: 'approved' | 'rejected'): Promise<RefundRequest> => {
    try {
      if (status === 'approved') {
        await apiPost(`/payments/${id}/refund`, { amount: 0, reason: 'Approved refund' })
      }
    } catch (e) {
      console.warn('Live backend processRefund error, updating mockDb:', e)
    }

    const list = mockDb.get('refunds')
    const idx = list.findIndex((r) => r.id === id)
    if (idx !== -1) {
      list[idx] = {
        ...list[idx],
        status: status === 'approved' ? 'approved' : 'rejected',
        processedAt: new Date().toISOString(),
      }
      mockDb.set('refunds', [...list])
      return list[idx]
    }
    throw new Error('Refund not found')
  },
}

