'use client';

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { api } from '@/lib/api';
import type { EventItem } from '@/lib/types';
import { Button } from './ui/button';
import { ReminderButton } from './reminder-button';
import { EventModal } from './event-modal';

const RECENT_WINDOW_MS = 31 * 24 * 60 * 60 * 1000;

function isCompleted(event: EventItem) {
  const status = String(event.runtimeStatus || event.status || '').toUpperCase();
  if (status === 'COMPLETED') return true;
  const timestamp = +new Date(event.endAt || event.startAt);
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

function isRecentlyCompleted(event: EventItem) {
  if (!isCompleted(event)) return false;
  const timestamp = +new Date(event.endAt || event.startAt);
  return Number.isFinite(timestamp) && timestamp >= Date.now() - RECENT_WINDOW_MS;
}

function textOf(event: EventItem) {
  return [event.title, event.descriptionShort, event.descriptionFull, event.location, event.category?.title, ...(event.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function readFilters() {
  const values = Array.from(document.querySelectorAll<HTMLSelectElement>('.select-clean')).map((select) => select.value);
  return {
    format: values[0] || 'ALL',
    city: values[1] || 'ALL',
    topic: values[2] || 'ALL',
    source: values[3] || 'ALL',
    period: values[4] || 'ALL',
  };
}

function matchesFilters(event: EventItem) {
  const filters = readFilters();
  const start = new Date(event.startAt);
  const now = new Date();
  const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate(), 23, 59, 59);
  const haystack = textOf(event);

  if (filters.format !== 'ALL' && event.format !== filters.format) return false;
  if (filters.city !== 'ALL' && !String(event.location || '').includes(filters.city)) return false;
  if (filters.topic !== 'ALL' && !haystack.includes(filters.topic.toLowerCase())) return false;
  if (filters.source !== 'ALL' && String(event.source || '').toUpperCase() !== filters.source.toUpperCase()) return false;
  if (filters.period === 'TODAY' && start.toDateString() !== now.toDateString()) return false;
  if (filters.period === 'WEEK' && !(start >= now && start <= weekEnd)) return false;
  if (filters.period === 'MONTH' && !(start >= now && start <= monthEnd)) return false;

  return true;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(value));
}

export function CompactModeEnhancer() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [target, setTarget] = useState<Element | null>(null);
  const [filterVersion, setFilterVersion] = useState(0);
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const data = await api.events();
        if (!cancelled) setEvents(data);
      } catch (error) {
        console.error(error);
      }
    };

    load();
    const timer = window.setInterval(load, 30 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    const syncTarget = () => setTarget(document.querySelector('.compact-events-list'));
    const handleFilterChange = () => setFilterVersion((value) => value + 1);

    syncTarget();
    const observer = new MutationObserver(syncTarget);
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener('change', handleFilterChange);

    return () => {
      observer.disconnect();
      document.removeEventListener('change', handleFilterChange);
    };
  }, []);

  const sortedEvents = useMemo(() => {
    void filterVersion;
    const filtered = events.filter(matchesFilters);
    const upcoming = filtered
      .filter((event) => !isCompleted(event))
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
    const completed = filtered
      .filter(isRecentlyCompleted)
      .sort((a, b) => +new Date(b.endAt || b.startAt) - +new Date(a.endAt || a.startAt));

    return [...upcoming, ...completed].slice(0, 12);
  }, [events, filterVersion]);

  if (!target) return null;

  return createPortal(
    <>
      {sortedEvents.map((event) => {
        const completed = isCompleted(event);

        return (
          <div
            key={`enhanced-${event.id}`}
            className={`compact-event-card compact-mode-enhanced-card rounded-[18px] border bg-white p-4 text-left transition ${
              completed ? 'compact-event-card-completed border-[#E04B4B]' : 'border-[#e5e7eb]'
            }`}
          >
            <button type='button' onClick={() => setActiveEvent(event)} className='compact-event-main-button w-full text-left'>
              <div className='compact-event-card-header flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-start'>
                <div className='min-w-0 flex-1 pr-4'>
                  <div className='break-words pr-2 text-lg font-semibold leading-snug text-[#17191e]'>{event.title}</div>
                  <div className='compact-event-meta mt-2 text-sm text-slate-500'>
                    {formatDate(event.startAt)} · {event.location || 'Локация уточняется'}
                  </div>
                </div>
                <div className='compact-event-badges flex flex-wrap items-center gap-2'>
                  {completed ? <span className='rounded-full border border-[#E04B4B] bg-white px-3 py-1 text-xs font-semibold text-black'>Проведено</span> : null}
                  {event.isImportant ? <span className='rounded-full border border-[#4FAF8C] bg-[#7CD8B3] px-3 py-1 text-xs font-semibold text-black'>Важное</span> : null}
                  <span className='rounded-full bg-[#eefbf4] px-3 py-1 text-xs font-semibold text-[#2c8d67]'>
                    {event.format === 'ONLINE' ? 'Онлайн' : event.format === 'OFFLINE' ? 'Офлайн' : 'Гибрид'}
                  </span>
                </div>
              </div>
            </button>
            <div className='mt-4 flex flex-wrap gap-3'>
              <Button variant='secondary' onClick={() => setActiveEvent(event)} className='px-4 py-2'>Подробнее</Button>
              <ReminderButton event={event} variant='primary' className='px-4 py-2' />
            </div>
          </div>
        );
      })}
      <EventModal item={activeEvent} open={!!activeEvent} onOpenChange={(open) => !open && setActiveEvent(null)} />
    </>,
    target,
  );
}
