import { apiGet, apiPost, apiPut } from '@/lib/api/client'
import { mockDb } from '@/lib/api/mockDb'
import type { StaffMember, SystemActivityLog } from '@/types/staff'
import type { UserRole } from '@/types/auth'

interface ApiUser {
  id: string
  tenant_id: string
  email: string
  full_name?: string
  name?: string
  phone?: string
  role: string
  status: string
  avatar_url?: string
  created_at: string
  updated_at: string
}

function mapApiStaff(u: ApiUser): StaffMember {
  return {
    id: u.id,
    tenantId: u.tenant_id,
    name: u.full_name || u.name || u.email.split('@')[0],
    email: u.email,
    phone: u.phone || '+977-9800000000',
    role: (u.role as UserRole) || 'staff',
    customRoleTitle: u.role === 'admin' ? 'Fleet Director' : u.role === 'manager' ? 'Fleet Operations Manager' : 'Front Desk Officer',
    assignedLocationName: 'Tribhuvan Airport Hub',
    status: (u.status as any) || 'active',
    avatarUrl: u.avatar_url,
    permissions: [],
    createdAt: u.created_at || new Date().toISOString(),
  }
}

export const staffApi = {
  getStaff: async (): Promise<StaffMember[]> => {
    try {
      const res = await apiGet<ApiUser[]>('/users')
      if (Array.isArray(res)) {
        return res.map(mapApiStaff)
      }
    } catch (err) {
      console.warn('API getStaff failed, falling back to mockDb:', err)
    }

    return mockDb.get('staff')
  },

  createStaff: async (data: Omit<StaffMember, 'id' | 'createdAt'>): Promise<StaffMember> => {
    try {
      const payload = {
        email: data.email,
        password: 'Password123#',
        full_name: data.name,
        phone: data.phone,
        role: data.role,
      }
      const res = await apiPost<ApiUser>('/users', payload)
      if (res && res.id) {
        const created = mapApiStaff(res)
        const list = mockDb.get('staff')
        mockDb.set('staff', [created, ...list])
        return created
      }
    } catch (err) {
      console.warn('API createStaff failed, falling back to mockDb:', err)
    }

    const list = mockDb.get('staff')
    const newMember: StaffMember = {
      ...data,
      id: `staff-${Date.now()}`,
      createdAt: new Date().toISOString(),
    }
    mockDb.set('staff', [newMember, ...list])
    return newMember
  },

  updateStaff: async (id: string, updates: Partial<StaffMember>): Promise<StaffMember> => {
    try {
      const payload: Record<string, any> = {}
      if (updates.name) payload.full_name = updates.name
      if (updates.phone) payload.phone = updates.phone
      if (updates.role) payload.role = updates.role
      if (updates.status) payload.status = updates.status

      const res = await apiPut<ApiUser>(`/users/${id}`, payload)
      if (res && res.id) {
        return mapApiStaff(res)
      }
    } catch (err) {
      console.warn('API updateStaff failed, falling back to mockDb:', err)
    }

    const list = mockDb.get('staff')
    const idx = list.findIndex((s) => s.id === id)
    if (idx === -1) throw new Error('Staff member not found')
    list[idx] = { ...list[idx], ...updates }
    mockDb.set('staff', [...list])
    return list[idx]
  },

  getActivityLogs: async (params?: { search?: string; entityType?: string }): Promise<SystemActivityLog[]> => {
    await new Promise((r) => setTimeout(r, 80))
    let list = [...mockDb.get('activityLogs')]

    if (params?.search) {
      const q = params.search.toLowerCase()
      list = list.filter(
        (l) =>
          l.userName?.toLowerCase().includes(q) ||
          l.action?.toLowerCase().includes(q) ||
          l.details?.toLowerCase().includes(q)
      )
    }

    if (params?.entityType && params.entityType !== 'all') {
      list = list.filter((l) => l.entityType === params.entityType)
    }

    return list
  },
}
