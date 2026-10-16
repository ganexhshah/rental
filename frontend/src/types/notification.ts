export type NotificationType =
  | 'booking_created'
  | 'booking_cancelled'
  | 'pickup_due'
  | 'return_overdue'
  | 'payment_received'
  | 'maintenance_due'
  | 'document_expiring'
  | 'system_alert'

export interface AppNotification {
  id: string
  tenantId: string
  type: NotificationType
  title: string
  message: string
  read: boolean
  link?: string
  createdAt: string
}

export interface NotificationTemplate {
  id: string
  tenantId: string
  name: string
  channel: 'email' | 'sms' | 'whatsapp' | 'in_app'
  triggerEvent: NotificationType
  subject?: string
  bodyTemplate: string
  availableVariables: string[]
  isActive: boolean
  updatedAt: string
}

export interface AutomationRule {
  id: string
  tenantId: string
  name: string
  trigger: 'booking_created' | 'return_tomorrow' | 'overdue_1hr' | 'service_due_km'
  condition: string
  action: 'send_email' | 'send_sms' | 'create_task' | 'flag_customer'
  templateId?: string
  isActive: boolean
  lastRunAt?: string
}
