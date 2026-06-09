'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { EventItem } from '@/lib/types';

function normalize(value: string) {
  return value.toLowerCase().replace(/\s+/g, ' ').trim();
}

function monthTitle(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' })
    .format(date)
    .replace(/^./, (s) => s.toUpperCase());
}

function findCurrentImportantEvent(events: EventItem[]) {
  const title = document
    .querySelector('.important-events-copy-panel h2')
    ?.textContent
    ?.trim();

  if (!title) return null;
  const normalizedTitle = normalize(title);
  return events.find((event) => normalize(event.title) === normalizedTitle) ?? null;
}

function findCalendarMonthLabel() {
  const labels = Array.from(document.querySelectorAll<HTMLElement>('.calendar-top-panel .text-\[17px\]'));
  return labels.find((node) => /\d{4}/.test(node.textContent || '')) ?? null;
}

function setCalendarMonth(targetDate: Date) {
  const targetLabel = monthTitle(targetDate);
  const monthLabel = findCalendarMonthLabel();
  if (!monthLabel) return;

  let guard = 0;

  while (monthLabel.textContent?.trim() !== targetLabel && guard < 18) {
    const currentText = monthLabel.textContent?.trim() || '';
    const currentYearMatch = currentText.match(/\d{4}/);
    const targetYear = targetDate.getFullYear();
    const currentYear = currentYearMatch ? Number(currentYearMatch[0]) : targetYear;

    const monthNames = Array.from({ length: 12 }, (_, index) =>
      new Intl.DateTimeFormat('ru-RU', { month: 'long' }).format(new Date(targetYear, index, 1)),
    );
    const currentMonthIndex = monthNames.findIndex((name) => currentText.toLowerCase().includes(name));
    const targetMonthIndex = targetDate.getMonth();

    const goNext = currentYear < targetYear || (currentYear === targetYear && currentMonthIndex < targetMonthIndex);
    const navButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.calendar-top-panel .mint-btn--icon'));
    const button = goNext ? navButtons[1] : navButtons[0];
    if (!button) break;

    button.click();
    guard += 1;
  }
}

function selectCalendarDayAndEvent(event: EventItem) {
  const date = new Date(event.startAt);
  setCalendarMonth(date);

  window.setTimeout(() => {
    const dayCells = Array.from(document.querySelectorAll<HTMLElement>('.calendar-days-grid .day-cell'));
    const targetDay = String(date.getDate());
    const cell = dayCells.find((node) => {
      const dayNumber = node.querySelector('.calendar-day-number')?.textContent?.trim();
      return dayNumber === targetDay;
    });

    cell?.click();

    window.setTimeout(() => {
      const eventButtons = Array.from(document.querySelectorAll<HTMLButtonElement>('.selected-day-events-list .mint-btn--event-tab'));
      const target = eventButtons.find((button) => normalize(button.textContent || '').includes(normalize(event.title)));
      target?.click();

      document.querySelector('.dashboard-calendar-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 80);
  }, 80);
}

export function ImportantEventsNavigationEnhancer() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const eventsRef = useRef<EventItem[]>([]);

  useEffect(() => {
    eventsRef.current = events;
  }, [events]);

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
    const handleClick = (nativeEvent: MouseEvent) => {
      const target = nativeEvent.target as HTMLElement | null;
      const button = target?.closest<HTMLButtonElement>('.important-events-copy-panel .important-event-action-btn');
      if (!button) return;
      if (!/подробнее/i.test(button.textContent || '')) return;

      const event = findCurrentImportantEvent(eventsRef.current);
      if (!event) return;

      nativeEvent.preventDefault();
      nativeEvent.stopPropagation();
      nativeEvent.stopImmediatePropagation();
      selectCalendarDayAndEvent(event);
    };

    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, []);

  return null;
}
