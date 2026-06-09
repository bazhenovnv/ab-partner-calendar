import type { EventItem } from './types';

export const RECENT_COMPLETED_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;

export function getRuntimeStatus(event: EventItem) {
  return String(event.runtimeStatus || event.status || '').toUpperCase();
}

export function isCompletedEvent(event: EventItem) {
  if (getRuntimeStatus(event) === 'COMPLETED') return true;

  const endAt = +new Date(event.endAt || event.startAt);
  return Number.isFinite(endAt) && endAt < Date.now();
}

export function isRecentlyCompletedEvent(event: EventItem) {
  if (!isCompletedEvent(event)) return false;

  const timestamp = +new Date(event.endAt || event.startAt);
  return Number.isFinite(timestamp) && timestamp >= Date.now() - RECENT_COMPLETED_WINDOW_MS;
}

export function compareUpcomingEvents(a: EventItem, b: EventItem) {
  return +new Date(a.startAt) - +new Date(b.startAt);
}

export function compareCompletedEvents(a: EventItem, b: EventItem) {
  return +new Date(b.endAt || b.startAt) - +new Date(a.endAt || a.startAt);
}

export function formatEventType(event: EventItem) {
  if (event.format === 'ONLINE') return 'Онлайн';
  if (event.format === 'OFFLINE') return 'Офлайн';
  return 'Гибрид';
}

export function extractPriceText(value?: string) {
  if (!value) return '';

  const lines = value.split('\n').map((line) => line.trim()).filter(Boolean);
  const explicit = lines.find((line) => /^(стоимость|цена|участие)\s*[:：]/i.test(line));

  if (explicit) {
    return explicit.replace(/^(стоимость|цена|участие)\s*[:：]\s*/i, '').trim();
  }

  if (/\bбесплатн(?:о|ый|ая|ое|ые)?\b/i.test(value)) return 'Бесплатно';
  return '';
}
