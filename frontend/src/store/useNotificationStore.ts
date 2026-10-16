import { create } from 'zustand'
import type { AppNotification } from '@/types/notification'
import { notificationsApi } from '@/features/notifications/api'

interface NotificationState {
  notifications: AppNotification[]
  unreadCount: number
  isLoading: boolean
  fetchNotifications: (unreadOnly?: boolean) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllAsRead: () => Promise<void>
  addNotification: (notification: Omit<AppNotification, 'id' | 'createdAt' | 'read' | 'tenantId'>) => Promise<void>
  removeNotification: (id: string) => void
  clearAll: () => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,

  fetchNotifications: async (unreadOnly?: boolean) => {
    set({ isLoading: true })
    try {
      const list = await notificationsApi.getNotifications(unreadOnly)
      set({
        notifications: list,
        unreadCount: list.filter((n) => !n.read).length,
        isLoading: false,
      })
    } catch {
      set({ isLoading: false })
    }
  },

  markAsRead: async (id: string) => {
    const list = get().notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
    set({
      notifications: list,
      unreadCount: list.filter((n) => !n.read).length,
    })
    await notificationsApi.markAsRead(id)
  },

  markAllAsRead: async () => {
    const list = get().notifications.map((n) => ({ ...n, read: true }))
    set({
      notifications: list,
      unreadCount: 0,
    })
    await notificationsApi.markAllAsRead()
  },

  addNotification: async (item) => {
    const created = await notificationsApi.sendNotification({
      title: item.title,
      body: item.message,
      type: item.type,
      link: item.link,
    })
    const list = [created, ...get().notifications.filter((n) => n.id !== created.id)]
    set({
      notifications: list,
      unreadCount: list.filter((n) => !n.read).length,
    })
  },

  removeNotification: (id: string) => {
    const list = get().notifications.filter((n) => n.id !== id)
    set({
      notifications: list,
      unreadCount: list.filter((n) => !n.read).length,
    })
  },

  clearAll: async () => {
    set({
      notifications: [],
      unreadCount: 0,
    })
    await notificationsApi.clearAll()
  },
}))

