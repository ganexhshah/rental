import { apiGet, apiPost } from '@/lib/api/client'
import { mockDb } from '@/lib/api/mockDb'
import type { MaintenanceTask, MaintenanceVendor, MaintenanceSchedule } from '@/types/maintenance'

function mapBackendMaintenance(m: any): MaintenanceTask {
  return {
    id: m.id,
    workOrderNumber: m.task_number || m.work_order_number || `WO-${m.id.slice(0, 8)}`,
    tenantId: m.tenant_id || '78248f8f-e390-4f85-a03f-58e4974fa366',
    vehicleId: m.vehicle_id,
    vehiclePlate: m.vehicle_plate || 'BA 2 CHA',
    vehicleModel: m.vehicle_model ? `${m.vehicle_make || ''} ${m.vehicle_model}` : 'Vehicle',
    serviceType: m.service_type || 'regular_service',
    title: m.title,
    description: m.description || '',
    priority: m.priority || 'medium',
    status: m.status || 'scheduled',
    odometerReading: m.odometer_reading || 0,
    estimatedCost: Number(m.estimated_cost) || 0,
    actualCost: Number(m.actual_cost) || 0,
    scheduledDate: m.scheduled_date || new Date().toISOString(),
    completedDate: m.completed_date,
    vendorName: m.vendor_name,
    createdAt: m.created_at || new Date().toISOString(),
    updatedAt: m.updated_at || new Date().toISOString(),
  }
}

export const maintenanceApi = {
  getTasks: async (params?: { search?: string; status?: string; priority?: string }): Promise<MaintenanceTask[]> => {
    try {
      const records = await apiGet<any[]>('/maintenance/records')
      if (Array.isArray(records)) {
        let list = records.map(mapBackendMaintenance)
        if (params?.status && params.status !== 'all') {
          list = list.filter((t) => t.status === params.status)
        }
        return list
      }
    } catch (e) {
      console.warn('Live backend maintenance error, using fallback:', e)
    }

    let list = [...mockDb.get('maintenanceTasks')]
    if (params?.search) {
      const q = params.search.toLowerCase()
      list = list.filter(
        (t) =>
          t.workOrderNumber?.toLowerCase().includes(q) ||
          t.vehiclePlate?.toLowerCase().includes(q) ||
          t.vehicleModel?.toLowerCase().includes(q) ||
          t.title?.toLowerCase().includes(q)
      )
    }
    if (params?.status && params.status !== 'all') {
      list = list.filter((t) => t.status === params.status)
    }
    if (params?.priority && params.priority !== 'all') {
      list = list.filter((t) => t.priority === params.priority)
    }
    return list
  },

  createTask: async (data: Omit<MaintenanceTask, 'id' | 'workOrderNumber' | 'createdAt' | 'updatedAt'>): Promise<MaintenanceTask> => {
    try {
      const payload = {
        vehicle_id: data.vehicleId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        estimated_cost: data.estimatedCost,
        scheduled_date: data.scheduledDate || new Date().toISOString(),
      }
      const created = await apiPost<any>('/maintenance/records', payload)
      if (created && created.id) return mapBackendMaintenance(created)
    } catch (e) {
      console.warn('Live backend createTask error, saving to mockDb:', e)
    }

    const list = mockDb.get('maintenanceTasks')
    const woNum = `WO-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`
    const newTask: MaintenanceTask = {
      ...data,
      id: `task-${Date.now()}`,
      workOrderNumber: woNum,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
    mockDb.set('maintenanceTasks', [newTask, ...list])
    return newTask
  },

  updateTask: async (id: string, updates: Partial<MaintenanceTask>): Promise<MaintenanceTask> => {
    const list = mockDb.get('maintenanceTasks')
    const idx = list.findIndex((t) => t.id === id)
    if (idx === -1) throw new Error('Task not found')

    const updated = {
      ...list[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    }
    list[idx] = updated
    mockDb.set('maintenanceTasks', [...list])
    return updated
  },

  getVendors: async (): Promise<MaintenanceVendor[]> => {
    try {
      const vends = await apiGet<any[]>('/maintenance/vendors')
      if (Array.isArray(vends)) {
        return vends.map((v) => ({
          id: v.id,
          name: v.name,
          serviceType: v.service_type || 'Fleet Mechanical & Electric',
          contactPerson: v.contact_person || v.contact_phone || 'Manager',
          phone: v.contact_phone || v.phone || '+977-9800000000',
          email: v.contact_email || v.email || 'vendor@example.com',
          address: v.address || 'Kathmandu, Nepal',
          rating: v.rating ?? 4.8,
        }))
      }
    } catch (e) {
      console.warn('Live backend getVendors error:', e)
    }
    return mockDb.get('maintenanceVendors')
  },

  createVendor: async (data: Omit<MaintenanceVendor, 'id'>): Promise<MaintenanceVendor> => {
    try {
      const payload = {
        name: data.name,
        service_type: data.serviceType,
        contact_phone: data.phone,
        contact_email: data.email,
        address: data.address,
      }
      const v = await apiPost<any>('/maintenance/vendors', payload)
      if (v && v.id) {
        return {
          id: v.id,
          name: v.name,
          serviceType: v.service_type || data.serviceType,
          contactPerson: data.contactPerson,
          phone: v.contact_phone || data.phone,
          email: v.contact_email || data.email,
          address: v.address || data.address,
          rating: data.rating || 4.8,
        }
      }
    } catch (e) {
      console.warn('Live backend createVendor error:', e)
    }

    const list = mockDb.get('maintenanceVendors')
    const newVendor: MaintenanceVendor = {
      ...data,
      id: `vnd-${Date.now()}`,
    }
    mockDb.set('maintenanceVendors', [newVendor, ...list])
    return newVendor
  },

  getSchedules: async (): Promise<MaintenanceSchedule[]> => {
    return mockDb.get('maintenanceSchedules')
  },

  createSchedule: async (data: Omit<MaintenanceSchedule, 'id'>): Promise<MaintenanceSchedule> => {
    const list = mockDb.get('maintenanceSchedules')
    const newSched: MaintenanceSchedule = {
      ...data,
      id: `sched-${Date.now()}`,
    }
    mockDb.set('maintenanceSchedules', [newSched, ...list])
    return newSched
  },
}

