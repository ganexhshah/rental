import { apiGet, apiPost } from '@/lib/api/client'
import { mockDb } from '@/lib/api/mockDb'
import type { Expense, ExpenseCategory } from '@/types/expense'

interface ApiExpense {
  id: string
  tenant_id?: string
  expense_number?: string
  expenseNumber?: string
  category: string
  title: string
  description?: string
  amount: number | string
  currency?: string
  date: string
  vehicle_id?: string
  vehicle_plate?: string
  vehiclePlate?: string
  vendor?: string
  payment_method?: string
  paymentMethod?: string
  receipt_url?: string
  receiptUrl?: string
  recorded_by?: string
  recordedBy?: string
  is_tax_deductible?: boolean
  isTaxDeductible?: boolean
  status: string
  created_at?: string
  createdAt?: string
  updated_at?: string
  updatedAt?: string
}

function mapApiExpense(item: ApiExpense): Expense {
  return {
    id: item.id,
    expenseNumber: item.expense_number || item.expenseNumber || `EXP-${item.id.slice(0, 8)}`,
    tenantId: item.tenant_id || '78248f8f-e390-4f85-a03f-58e4974fa366',
    category: (item.category as ExpenseCategory) || 'other',
    title: item.title,
    description: item.description,
    amount: typeof item.amount === 'string' ? parseFloat(item.amount) : item.amount,
    currency: item.currency || 'NPR',
    date: item.date,
    vehicleId: item.vehicle_id,
    vehiclePlate: item.vehicle_plate || item.vehiclePlate,
    vendor: item.vendor,
    paymentMethod: (item.payment_method || item.paymentMethod || 'company_account') as any,
    receiptUrl: item.receipt_url || item.receiptUrl,
    recordedBy: item.recorded_by || item.recordedBy || 'Staff Admin',
    isTaxDeductible: item.is_tax_deductible ?? item.isTaxDeductible ?? true,
    status: (item.status as any) || 'approved',
    createdAt: item.created_at || item.createdAt || new Date().toISOString(),
    updatedAt: item.updated_at || item.updatedAt || new Date().toISOString(),
  }
}

export const expensesApi = {
  getExpenses: async (params?: { search?: string; category?: string; status?: string }): Promise<Expense[]> => {
    try {
      const qParams: Record<string, string> = {}
      if (params?.search) qParams.search = params.search
      if (params?.category && params.category !== 'all') qParams.category = params.category
      if (params?.status && params.status !== 'all') qParams.status = params.status

      const res = await apiGet<ApiExpense[]>('/expenses', Object.keys(qParams).length > 0 ? qParams : undefined)
      if (Array.isArray(res)) {
        return res.map(mapApiExpense)
      }
    } catch (err) {
      console.warn('API getExpenses failed, falling back to mockDb:', err)
    }

    let list = [...mockDb.get('expenses')]
    if (params?.search) {
      const q = params.search.toLowerCase()
      list = list.filter(
        (e) =>
          e.expenseNumber?.toLowerCase().includes(q) ||
          e.title?.toLowerCase().includes(q) ||
          e.vehiclePlate?.toLowerCase().includes(q) ||
          e.vendor?.toLowerCase().includes(q)
      )
    }
    if (params?.category && params.category !== 'all') {
      list = list.filter((e) => e.category === params.category)
    }
    if (params?.status && params.status !== 'all') {
      list = list.filter((e) => e.status === params.status)
    }
    return list
  },

  createExpense: async (data: Omit<Expense, 'id' | 'expenseNumber' | 'createdAt' | 'updatedAt'>): Promise<Expense> => {
    try {
      const payload = {
        category: data.category,
        title: data.title,
        description: data.description,
        amount: data.amount,
        currency: data.currency || 'NPR',
        date: data.date,
        vehicle_id: data.vehicleId,
        vendor: data.vendor,
        payment_method: data.paymentMethod,
        is_tax_deductible: data.isTaxDeductible,
      }
      const res = await apiPost<ApiExpense>('/expenses', payload)
      if (res && res.id) {
        const created = mapApiExpense(res)
        const list = mockDb.get('expenses')
        mockDb.set('expenses', [created, ...list])
        return created
      }
    } catch (err) {
      console.warn('API createExpense failed, persisting to mockDb:', err)
    }

    const list = mockDb.get('expenses')
    const expNum = `EXP-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    const newExp: Expense = {
      ...data,
      id: `exp-${Date.now()}`,
      expenseNumber: expNum,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockDb.set('expenses', [newExp, ...list])
    return newExp
  },

  updateStatus: async (id: string, status: 'approved' | 'rejected'): Promise<Expense> => {
    const list = mockDb.get('expenses')
    const idx = list.findIndex((e) => e.id === id)
    if (idx !== -1) {
      list[idx].status = status
      list[idx].updatedAt = new Date().toISOString()
      mockDb.set('expenses', [...list])
      return list[idx]
    }
    throw new Error('Expense not found')
  },
}
