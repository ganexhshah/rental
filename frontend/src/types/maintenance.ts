export type MaintenancePriority = 'low' | 'medium' | 'high' | 'urgent'

export type MaintenanceStatus =
  | 'scheduled'
  | 'in_progress'
  | 'waiting_parts'
  | 'completed'
  | 'cancelled'

export interface MaintenanceVendor {
  id: string
  name: string
  serviceType: string
  contactPerson: string
  phone: string
  email: string
  address: string
  rating: number
}

export interface MaintenanceTask {
  id: string
  workOrderNumber: string
  tenantId: string
  vehicleId: string
  vehiclePlate: string
  vehicleModel: string
  serviceType: 'regular_service' | 'oil_change' | 'brake_inspection' | 'tire_change' | 'engine_repair' | 'body_damage' | 'electrical' | 'other'
  title: string
  description: string
  priority: MaintenancePriority
  status: MaintenanceStatus
  vendorId?: string
  vendorName?: string
  scheduledDate: string
  completedDate?: string
  odometerReading: number
  estimatedCost: number
  actualCost?: number
  partsUsed?: string[]
  mechanicNotes?: string
  invoiceNumber?: string
  createdAt: string
  updatedAt: string
}

export interface MaintenanceSchedule {
  id: string
  tenantId: string
  vehicleId: string
  serviceName: string
  intervalKm?: number
  intervalMonths?: number
  lastPerformedDate?: string
  lastPerformedKm?: number
  nextDueKm?: number
  nextDueDate?: string
  status: 'due_soon' | 'overdue' | 'ok'
}
