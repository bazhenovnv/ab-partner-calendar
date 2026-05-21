import {
  AdminUser,
  AuthResponse,
  Category,
  DashboardStats,
  EventItem,
  ReminderItem,
  TelegramImport,
  TopicCollection,
  AnalyticsSummary,
  BroadcastItem,
  BroadcastDelivery,
  TelegramSubscriber,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || '/api';

async function fetcher<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

export const api = {
  publicSync: () => fetcher<{ synced: boolean; connectors?: number; imported?: number; upserted?: number; skipped?: boolean; reason?: string }>('/public/sync', { method: 'POST' }),
  trackVisit: (payload: { anonId: string; path: string; source?: string; city?: string }) =>
    fetcher<{ tracked: boolean }>('/public/visit', { method: 'POST', body: JSON.stringify(payload) }),
  events: () => fetcher<EventItem[]>('/events'),
  highlights: () => fetcher<EventItem[]>('/events/highlights'),

  collections: () => fetcher<TopicCollection[]>('/public/collections'),
  exportEventIcsUrl: (slug: string) => `${API_URL}/events/${slug}/ics`,
  eventDetail: (slug: string) => fetcher<EventItem>(`/events/${slug}`),
  categories: () => fetcher<Category[]>('/categories'),
  createReminder: (payload: {
    eventId: string;
    telegramUserId: string;
    telegramUsername?: string;
    remindBefore: '5m' | '15m' | '30m' | '1h' | '1d';
  }) =>
    fetcher('/reminders', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  login: (payload: { email: string; password: string }) =>
    fetcher<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
  dashboard: (token: string) =>
    fetcher<DashboardStats>('/admin/dashboard', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  analytics: (token: string) =>
    fetcher<AnalyticsSummary>('/admin/analytics', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  adminEvents: (token: string, includeDeleted = false) =>
    fetcher<EventItem[]>(`/admin/events${includeDeleted ? '?includeDeleted=true' : ''}`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  createEvent: (token: string, payload: unknown) =>
    fetcher<EventItem>('/admin/events', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  updateEvent: (token: string, id: string, payload: unknown) =>
    fetcher<EventItem>(`/admin/events/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  deleteEvent: (token: string, id: string) =>
    fetcher(`/admin/events/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),
  restoreEvent: (token: string, id: string) =>
    fetcher<EventItem>(`/admin/events/${id}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),
  imports: (token: string) =>
    fetcher<TelegramImport[]>('/admin/imports', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  syncImports: (token: string) =>
    fetcher<{ synced: boolean; connectors: number; imported: number; upserted: number; details?: unknown[] }>('/admin/imports/sync', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),
  confirmImport: (token: string, id: string) =>
    fetcher(`/admin/imports/${id}/confirm`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),
  rejectImport: (token: string, id: string) =>
    fetcher(`/admin/imports/${id}/reject`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),

  broadcasts: (token: string) =>
    fetcher<BroadcastItem[]>('/admin/broadcasts', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  broadcastSubscribers: (token: string) =>
    fetcher<TelegramSubscriber[]>('/admin/broadcasts/subscribers', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  createBroadcast: (token: string, payload: { title?: string; text: string }) =>
    fetcher<BroadcastItem>('/admin/broadcasts', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  updateBroadcast: (token: string, id: string, payload: { title?: string; text?: string; status?: string }) =>
    fetcher<BroadcastItem>(`/admin/broadcasts/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  sendBroadcast: (token: string, id: string) =>
    fetcher<{ id: string; sent: number; failed: number }>(`/admin/broadcasts/${id}/send`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    }),
  broadcastDeliveries: (token: string, id: string) =>
    fetcher<BroadcastDelivery[]>(`/admin/broadcasts/${id}/deliveries`, {
      headers: { Authorization: `Bearer ${token}` },
    }),
  reminders: (token: string) =>
    fetcher<ReminderItem[]>('/admin/reminders', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  users: (token: string) =>
    fetcher<AdminUser[]>('/admin/users', {
      headers: { Authorization: `Bearer ${token}` },
    }),
  createUser: (token: string, payload: { email: string; name: string; password: string; role: 'ADMIN' | 'SUPERADMIN' }) =>
    fetcher<AdminUser>('/admin/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  updateUser: (token: string, id: string, payload: { email?: string; name?: string; password?: string; role?: 'ADMIN' | 'SUPERADMIN' }) =>
    fetcher<AdminUser>(`/admin/users/${id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify(payload),
    }),
  deleteUser: (token: string, id: string) =>
    fetcher<AdminUser>(`/admin/users/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    }),
};
