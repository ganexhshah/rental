export type ExpenseCategory =
  | 'fuel'
  | 'maintenance'
  | 'insurance'
  | 'cleaning'
  | 'toll_parking'
  | 'registration_tax'
  | 'marketing'
  | 'salaries'
  | 'office_rent'
  | 'utilities'
  | 'other'

export interface Expense {
  id: string
  expenseNumber: string
  tenantId: string
  category: ExpenseCategory
  title: string
  description?: string
  amount: number
  currency: string
  date: string
  vehicleId?: string
  vehiclePlate?: string
  vendor?: string
  paymentMethod: 'credit_card' | 'bank_transfer' | 'petty_cash' | 'company_account'
  receiptUrl?: string
  recordedBy: string
  isTaxDeductible: boolean
  status: 'approved' | 'pending_approval' | 'rejected'
  createdAt: string
  updatedAt: string
}
