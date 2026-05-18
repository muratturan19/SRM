import axios from 'axios'
import type { Contact, Deal, Reminder, DashboardStats, SystemSettings } from '../types'

const api = axios.create({ baseURL: '/api' })

// ── Contacts ──────────────────────────────────────────────────────
export const contactsApi = {
  list: (params?: { search?: string; stage?: string }) =>
    api.get<Contact[]>('/contacts', { params }).then((r) => r.data),

  get: (id: string) =>
    api.get<Contact>(`/contacts/${id}`).then((r) => r.data),

  create: (data: Partial<Contact>) =>
    api.post<Contact>('/contacts', data).then((r) => r.data),

  update: (id: string, data: Partial<Contact>) =>
    api.patch<Contact>(`/contacts/${id}`, data).then((r) => r.data),

  delete: (id: string) =>
    api.delete(`/contacts/${id}`),

  uploadAvatar: (id: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post<Contact>(`/contacts/${id}/avatar`, fd).then((r) => r.data)
  },
}

// ── Deals ─────────────────────────────────────────────────────────
export const dealsApi = {
  list: () => api.get<Deal[]>('/deals').then((r) => r.data),

  byContact: (contactId: string) =>
    api.get<Deal[]>(`/deals/contact/${contactId}`).then((r) => r.data),

  create: (data: Partial<Deal> & { contact_id: string }) =>
    api.post<Deal>('/deals', data).then((r) => r.data),

  update: (id: string, data: Partial<Deal>) =>
    api.patch<Deal>(`/deals/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/deals/${id}`),

  uploadContract: (dealId: string, file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post<Deal>(`/deals/${dealId}/contract`, fd).then((r) => r.data)
  },
}

// ── Reminders ─────────────────────────────────────────────────────
export const remindersApi = {
  list: (includeDone = false) =>
    api
      .get<Reminder[]>('/reminders', { params: { include_done: includeDone } })
      .then((r) => r.data),

  due: () => api.get<Reminder[]>('/reminders/due').then((r) => r.data),

  create: (data: Partial<Reminder>) =>
    api.post<Reminder>('/reminders', data).then((r) => r.data),

  update: (id: string, data: Partial<Reminder>) =>
    api.patch<Reminder>(`/reminders/${id}`, data).then((r) => r.data),

  delete: (id: string) => api.delete(`/reminders/${id}`),

  snooze: (id: string) =>
    api.post<Reminder>(`/reminders/${id}/snooze`).then((r) => r.data),
}

// ── Settings ──────────────────────────────────────────────────────
export const settingsApi = {
  get: () => api.get<SystemSettings>('/settings/').then((r) => r.data),

  update: (data: Partial<SystemSettings>) =>
    api.put<SystemSettings>('/settings/', data).then((r) => r.data),
}

// ── Dashboard ─────────────────────────────────────────────────────
export const dashboardApi = {
  stats: () => api.get<DashboardStats>('/dashboard/stats').then((r) => r.data),
}

// ── Card Scanner ──────────────────────────────────────────────────
export const scanApi = {
  scanCard: (file: File) => {
    const fd = new FormData()
    fd.append('file', file)
    return api.post<Record<string, string | null>>('/scan/card', fd).then((r) => r.data)
  },
}
