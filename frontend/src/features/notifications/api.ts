import { apiGet, apiPost, apiPut, apiPatch, apiDelete } from '@/lib/api/client'
import { useAuthStore } from '@/store/useAuthStore'
import type { NotificationTemplate, AutomationRule, AppNotification, NotificationType } from '@/types/notification'

export interface NotificationDelivery {
  id: string
  tenantId: string
  notificationId: string
  recipient: string
  channel: string
  status: string
  errorMessage?: string
  attempts: number
  sentAt?: string
  createdAt: string
}

export function mapBackendNotification(n: any): AppNotification {
  const data = n.data || {}
  return {
    id: n.id,
    tenantId: n.tenant_id,
    type: (data.type || (n.channel === 'in_app' ? 'system_alert' : n.channel) || 'system_alert') as NotificationType,
    title: n.title || 'Notification',
    message: n.body || '',
    read: Boolean(n.is_read),
    link: data.link,
    createdAt: n.created_at || new Date().toISOString(),
  }
}

export function mapBackendTemplate(t: any): NotificationTemplate {
  let vars: string[] = []
  if (Array.isArray(t.variables)) {
    vars = t.variables
  } else if (typeof t.variables === 'string') {
    try {
      vars = JSON.parse(t.variables)
    } catch {
      vars = []
    }
  }

  return {
    id: t.id,
    tenantId: t.tenant_id,
    name: t.name || t.code || 'Template',
    channel: (t.channel || 'email') as any,
    triggerEvent: (t.code?.toLowerCase() || 'booking_created') as NotificationType,
    subject: t.subject,
    bodyTemplate: t.body_template || '',
    availableVariables: vars.length > 0 ? vars : ['customer_name', 'booking_code', 'vehicle_model', 'start_date', 'total_amount'],
    isActive: Boolean(t.is_active),
    updatedAt: t.updated_at || t.created_at || new Date().toISOString(),
  }
}

export function mapBackendRule(r: any): AutomationRule {
  return {
    id: r.id,
    tenantId: r.tenant_id,
    name: r.event_trigger ? r.event_trigger.replace('_', ' ').toUpperCase() + ' Trigger' : 'Automation Rule',
    trigger: (r.event_trigger || 'booking_created') as any,
    condition: typeof r.conditions === 'string' ? r.conditions : JSON.stringify(r.conditions || {}),
    action: (r.action_type || 'send_email') as any,
    isActive: Boolean(r.is_active),
    lastRunAt: r.created_at,
  }
}

let localNotificationsFallback: AppNotification[] = []

export const notificationsApi = {
  getNotifications: async (unreadOnly?: boolean): Promise<AppNotification[]> => {
    try {
      const url = `/notifications${unreadOnly ? '?unread=true' : ''}`
      const res = await apiGet<any[]>(url)
      if (Array.isArray(res)) {
        return res.map(mapBackendNotification)
      }
    } catch (e) {
      console.warn('Live backend notifications error, using local state:', e)
    }
    return unreadOnly ? localNotificationsFallback.filter((n) => !n.read) : [...localNotificationsFallback]
  },

  sendNotification: async (input: {
    title: string
    body: string
    channel?: string
    type?: NotificationType
    link?: string
    userId?: string
    data?: Record<string, any>
  }): Promise<AppNotification> => {
    const user = useAuthStore.getState().user
    const userId = input.userId || user?.id || '145ec6d5-08ad-4f06-b165-d67f42d6d7f4'

    const payload = {
      user_id: userId,
      channel: input.channel || 'in_app',
      title: input.title,
      body: input.body,
      data: {
        ...(input.data || {}),
        type: input.type || 'system_alert',
        link: input.link,
      },
    }

    try {
      const res = await apiPost<any>('/notifications', payload)
      if (res && res.id) {
        return mapBackendNotification(res)
      }
    } catch (e) {
      console.warn('Live backend sendNotification error, saving locally:', e)
    }

    const fallback: AppNotification = {
      id: `notif-${Date.now()}`,
      tenantId: user?.tenantId || 'a84c60b9-47f6-48f5-abdf-29d23989c5b5',
      type: input.type || 'system_alert',
      title: input.title,
      message: input.body,
      read: false,
      link: input.link,
      createdAt: new Date().toISOString(),
    }
    localNotificationsFallback = [fallback, ...localNotificationsFallback]
    return fallback
  },

  markAsRead: async (id: string): Promise<void> => {
    try {
      await apiPut(`/notifications/${id}/read`)
    } catch (e) {
      try {
        await apiPatch(`/notifications/${id}/read`)
      } catch (err) {
        console.warn('Backend markAsRead fallback:', err)
      }
    }
    localNotificationsFallback = localNotificationsFallback.map((n) =>
      n.id === id ? { ...n, read: true } : n
    )
  },

  markAllAsRead: async (): Promise<void> => {
    try {
      await apiPut('/notifications/read-all')
    } catch {
      // ignore
    }
    localNotificationsFallback = localNotificationsFallback.map((n) => ({ ...n, read: true }))
  },

  clearAll: async (): Promise<void> => {
    try {
      await apiDelete('/notifications')
    } catch {
      // ignore
    }
    localNotificationsFallback = []
  },

  getTemplates: async (): Promise<NotificationTemplate[]> => {
    try {
      const res = await apiGet<any[]>('/notifications/templates')
      if (Array.isArray(res) && res.length > 0) {
        return res.map(mapBackendTemplate)
      }
    } catch (e) {
      console.warn('Live backend getTemplates error:', e)
    }
    return []
  },

  createTemplate: async (data: {
    code: string
    name: string
    channel: string
    subject?: string
    bodyTemplate: string
    variables?: string[]
  }): Promise<NotificationTemplate> => {
    const payload = {
      code: data.code,
      name: data.name,
      channel: data.channel,
      subject: data.subject || '',
      body_template: data.bodyTemplate,
      variables: data.variables || [],
    }
    const res = await apiPost<any>('/notifications/templates', payload)
    return mapBackendTemplate(res)
  },

  updateTemplate: async (id: string, updates: Partial<NotificationTemplate>): Promise<NotificationTemplate> => {
    try {
      const payload = {
        name: updates.name,
        channel: updates.channel,
        subject: updates.subject,
        body_template: updates.bodyTemplate,
        variables: updates.availableVariables,
        is_active: updates.isActive,
      }
      const res = await apiPut<any>(`/notifications/templates/${id}`, payload)
      if (res && res.id) return mapBackendTemplate(res)
    } catch (e) {
      console.warn('Live backend updateTemplate error:', e)
    }
    return {
      id,
      tenantId: 'a84c60b9-47f6-48f5-abdf-29d23989c5b5',
      name: updates.name || 'Template',
      channel: (updates.channel || 'email') as any,
      triggerEvent: (updates.triggerEvent || 'booking_created') as any,
      subject: updates.subject,
      bodyTemplate: updates.bodyTemplate || '',
      availableVariables: updates.availableVariables || [],
      isActive: updates.isActive ?? true,
      updatedAt: new Date().toISOString(),
    }
  },

  getAutomationRules: async (): Promise<AutomationRule[]> => {
    try {
      const res = await apiGet<any[]>('/notifications/automation-rules')
      if (Array.isArray(res)) {
        return res.map(mapBackendRule)
      }
    } catch (e) {
      console.warn('Live backend getAutomationRules error:', e)
    }
    return []
  },

  toggleRule: async (id: string, isActive: boolean): Promise<AutomationRule> => {
    try {
      const res = await apiPatch<any>(`/notifications/automation-rules/${id}`, { is_active: isActive })
      if (res && res.id) return mapBackendRule(res)
    } catch (e) {
      console.warn('Backend toggleRule fallback:', e)
    }
    return {
      id,
      tenantId: 'a84c60b9-47f6-48f5-abdf-29d23989c5b5',
      name: 'Automation Rule',
      trigger: 'booking_created',
      condition: 'Status == Confirmed',
      action: 'send_email',
      isActive,
      lastRunAt: new Date().toISOString(),
    }
  },

  getDeliveries: async (): Promise<NotificationDelivery[]> => {
    try {
      const res = await apiGet<any[]>('/notifications/deliveries')
      if (Array.isArray(res)) {
        return res.map((d) => ({
          id: d.id,
          tenantId: d.tenant_id,
          notificationId: d.notification_id,
          recipient: d.recipient,
          channel: d.channel,
          status: d.status,
          errorMessage: d.error_message,
          attempts: d.attempts || 1,
          sentAt: d.sent_at,
          createdAt: d.created_at,
        }))
      }
    } catch (e) {
      console.warn('Live backend getDeliveries error:', e)
    }
    return []
  },
}

