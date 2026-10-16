export type PaymentMethod =
  | 'card'
  | 'bank_transfer'
  | 'cash'
  | 'stripe'
  | 'paypal'
  | 'crypto'

export type PaymentCategory =
  | 'rental'
  | 'deposit'
  | 'deposit_refund'
  | 'extension'
  | 'late_fee'
  | 'damage_fee'
  | 'fuel_charge'

export type PaymentStatus =
  | 'completed'
  | 'pending'
  | 'failed'
  | 'refunded'
  | 'partially_refunded'

export interface PaymentTransaction {
  id: string
  transactionNumber: string
  tenantId: string
  bookingId: string
  bookingCode?: string
  customerId: string
  customerName: string
  amount: number
  currency: string
  category: PaymentCategory
  method: PaymentMethod
  gateway: string
  gatewayReference?: string
  status: PaymentStatus
  refundedAmount?: number
  notes?: string
  timestamp: string
  createdAt: string
}

export interface DepositRecord {
  id: string
  tenantId: string
  bookingId: string
  bookingCode: string
  customerId: string
  customerName: string
  amount: number
  currency?: string
  heldAt: string
  status: 'held' | 'released' | 'partially_released' | 'claimed'
  releasedAmount?: number
  deductionsAmount?: number
  deductionReason?: string
  releasedAt?: string
  method: PaymentMethod
  paymentId?: string
  notes?: string
}

export interface InvoiceItem {
  id: string
  description: string
  quantity: number
  unitPrice: number
  totalPrice: number
}

export interface Invoice {
  id: string
  invoiceNumber: string
  tenantId: string
  bookingId: string
  bookingCode: string
  customerId: string
  customerName: string
  customerEmail: string
  customerAddress?: string
  issueDate: string
  dueDate: string
  status: 'draft' | 'issued' | 'paid' | 'overdue' | 'void'
  items: InvoiceItem[]
  subtotal: number
  taxRate: number
  taxAmount: number
  discountAmount: number
  totalAmount: number
  paidAmount: number
  balanceDue: number
  pdfUrl?: string
  notes?: string
  createdAt: string
}

export interface RefundRequest {
  id: string
  tenantId: string
  transactionId: string
  bookingId: string
  customerId: string
  customerName: string
  amount: number
  reason: string
  status: 'pending' | 'approved' | 'processed' | 'rejected'
  processedBy?: string
  processedAt?: string
  requestedAt: string
}
