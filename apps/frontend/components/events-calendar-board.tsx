'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Globe, MapPin } from 'lucide-react';
import { EventItem } from '@/lib/types';
import { Button } from './ui/button';
import { ReminderButton } from './reminder-button';

const weekdayLabels = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

function startOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function startOfGrid(date: Date) {
  const first = startOfMonth(date);
  const day = (first.getDay() + 6) % 7;
  const copy = new Date(first);
  copy.setDate(copy.getDate() - day);
  return copy;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function keyOf(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function formatMonth(date: Date) {
  const value = new Intl.DateTimeFormat('ru-RU', { month: 'long', year: 'numeric' }).format(date);
  return value.replace(/^./, (s) => s.toUpperCase());
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' }).format(date);
}

function formatDateLong(date: string) {
  return new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(date));
}

function formatTime(date: string) {
  return new Intl.DateTimeFormat('ru-RU', { hour: '2-digit', minute: '2-digit' }).format(new Date(date));
}

function cleanDescriptionText(value?: string) {
  if (!value) return '';
  return value
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#[\p{L}\p{N}_-]+/gu, '')
    .replace(/(?:^|\n)(Источник|Телеграм|Зарегистрироваться|Регистрация).*$/gimu, '')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function eventDotClass(event?: EventItem) {
  if (!event) return 'bg-[#39c285]';
  if (event.runtimeStatus === 'LIVE') return 'bg-[#f7c948]';
  if (event.runtimeStatus === 'COMPLETED') return 'bg-[#ef4444]';
  return 'bg-[#39c285]';
}

export function EventsCalendarBoard({
  events,
  selectedDate,
  onSelectDate,
}: {
  events: EventItem[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const event of events) {
      const key = keyOf(new Date(event.startAt));
      const list = map.get(key) ?? [];
      list.push(event);
      list.sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
      map.set(key, list);
    }
    return map;
  }, [events]);

  const selectedKey = keyOf(selectedDate);
  const selectedDayEvents = eventsByDay.get(selectedKey) ?? [];

  useEffect(() => {
    if (!selectedDayEvents.length) {
      setSelectedEventId(null);
      return;
    }

    if (!selectedEventId || !selectedDayEvents.some((event) => event.id === selectedEventId)) {
      setSelectedEventId(selectedDayEvents[0].id);
    }
  }, [selectedDayEvents, selectedEventId]);

  const selectedEvent = selectedDayEvents.find((event) => event.id === selectedEventId) ?? selectedDayEvents[0] ?? null;

  const days = useMemo(() => {
    const firstGridDay = startOfGrid(currentMonth);
    return Array.from({ length: 35 }, (_, index) => {
      const day = new Date(firstGridDay);
      day.setDate(firstGridDay.getDate() + index);
      return day;
    });
  }, [currentMonth]);

  return (
    <section className='grid items-start gap-4 xl:grid-cols-[minmax(520px,1.15fr)_minmax(480px,0.85fr)]'>
      <div className='surface-card self-start overflow-hidden bg-white xl:h-[680px]'>
        <div className='h-full overflow-y-auto px-6 py-5'>
          {selectedEvent ? (
            <>
              <div className='mb-4 flex items-start justify-between gap-4'>
                <div>
                  <div className='mb-2 text-sm font-medium text-slate-500'>{formatDate(selectedDate)}</div>
                  <h3 className='max-w-[780px] text-[25px] font-medium leading-tight text-[#1a1a1a]'>{selectedEvent.title}</h3>
                </div>
                <div className='shrink-0 rounded-full bg-[#e7f7ee] px-4 py-2 text-sm font-medium text-[#356b51]'>
                  {selectedEvent.format === 'ONLINE' ? 'Онлайн' : selectedEvent.format === 'OFFLINE' ? 'Офлайн' : 'Гибрид'}
                </div>
              </div>

              <div className='flex flex-wrap gap-x-6 gap-y-3 text-[15px] text-slate-600'>
                <span className='inline-flex items-center gap-2'><CalendarDays className='h-4 w-4' /> {formatDateLong(selectedEvent.startAt)}</span>
                <span className='inline-flex items-center gap-2'><Clock3 className='h-4 w-4' /> {formatTime(selectedEvent.startAt)} – {formatTime(selectedEvent.endAt)}</span>
                <span className='inline-flex items-center gap-2'><Globe className='h-4 w-4' /> {selectedEvent.format === 'ONLINE' ? 'Онлайн' : 'Очно'}</span>
                <span className='inline-flex items-center gap-2'><MapPin className='h-4 w-4' /> {selectedEvent.location || 'Адрес уточняется'}</span>
              </div>

              <div className='mt-7 whitespace-pre-line rounded-[18px] bg-white text-[17px] leading-8 text-[#404552]'>
                {cleanDescriptionText(selectedEvent.descriptionFull || selectedEvent.descriptionShort) || 'Описание мероприятия будет добавлено позже.'}
              </div>

              <div className='mt-8 flex flex-wrap items-center gap-3'>
                <Button asChild variant='dark' className='min-w-[260px] justify-between rounded-[12px]'>
                  <a href={selectedEvent.sourceUrl || '#'} target='_blank' rel='noreferrer'>
                    Подробнее о мероприятии
                    <ChevronRight className='h-4 w-4' />
                  </a>
                </Button>
                <ReminderButton event={selectedEvent} variant='secondary' className='min-w-[170px] rounded-[12px]' />
              </div>
            </>
          ) : (
            <div className='flex min-h-[420px] items-center justify-center rounded-[18px] bg-white text-slate-500'>Выберите дату с событиями</div>
          )}
        </div>
      </div>

      <div className='dark-card self-start overflow-hidden px-4 pb-4 pt-4'>
        <div className='mb-3 rounded-[16px] bg-white p-3 text-[#1a1a1a]'>
          <div className='mb-3 flex items-center justify-between gap-3'>
            <div className='text-[14px] font-semibold'>{formatDate(selectedDate)}</div>
            <div className='inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#8BE2BE] px-2 text-xs font-semibold text-[#163120]'>
              {selectedDayEvents.length}
            </div>
          </div>

          {selectedDayEvents.length ? (
            <div className='grid gap-2'>
              {selectedDayEvents.map((event, index) => (
                <button
                  key={event.id}
                  type='button'
                  onClick={() => setSelectedEventId(event.id)}
                  className={`flex w-full items-start gap-3 rounded-xl border px-3 py-2.5 text-left transition ${selectedEvent?.id === event.id ? 'border-[#7CD8B3] bg-[#e8f8f1]' : 'border-[#e8eaee] bg-white hover:bg-[#f7f9fb]'}`}
                >
                  <span className='mt-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-black px-1.5 text-[11px] font-semibold text-white'>{index + 1}</span>
                  <span className='line-clamp-2 flex-1 text-[14px] leading-5 text-[#222]'>{event.title}</span>
                  <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${eventDotClass(event)}`} />
                </button>
              ))}
            </div>
          ) : (
            <div className='rounded-xl bg-[#f8fafb] px-4 py-5 text-center text-sm text-slate-500'>На эту дату событий нет</div>
          )}
        </div>

        <div className='mb-3 flex items-center justify-between gap-4 border-b border-white/10 pb-3'>
          <div className='flex items-center gap-2'>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10'>
              <ChevronLeft className='h-4 w-4' />
            </button>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10'>
              <ChevronRight className='h-4 w-4' />
            </button>
            <div className='ml-3 text-[17px] font-medium text-white'>{formatMonth(currentMonth)}</div>
          </div>
          <button onClick={() => { const now = new Date(); setCurrentMonth(startOfMonth(now)); onSelectDate(now); }} className='rounded-xl border border-white/14 bg-white/4 px-3 py-1.5 text-sm text-white transition hover:bg-white/10'>
            Сегодня
          </button>
        </div>

        <div className='grid grid-cols-7 border border-white/12 border-b-0 text-center text-[12px] font-semibold text-white/85'>
          {weekdayLabels.map((day) => (
            <div key={day} className='border-r border-white/12 py-2 last:border-r-0'>{day}</div>
          ))}
        </div>

        <div className='grid grid-cols-7 border-l border-t border-white/12'>
          {days.map((day) => {
            const dayKey = keyOf(day);
            const dayEvents = eventsByDay.get(dayKey) ?? [];
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isSelected = isSameDay(day, selectedDate);
            return (
              <div
                key={dayKey}
                onMouseEnter={() => setHoverKey(dayKey)}
                onMouseLeave={() => setHoverKey(null)}
                onClick={() => { onSelectDate(day); setSelectedEventId(dayEvents[0]?.id ?? null); }}
                className={`day-cell ${isSelected ? 'day-cell-selected' : ''}`}
              >
                <div className={`text-[13px] font-medium ${isSelected ? 'text-black' : isCurrentMonth ? 'text-white' : 'text-white/35'}`}>{day.getDate()}</div>

                {dayEvents.length > 0 && (
                  <div className='mt-2 flex flex-wrap gap-1'>
                    {dayEvents.slice(0, 4).map((event) => (
                      <span key={event.id} className={`h-2 w-2 rounded-full ${eventDotClass(event)}`} />
                    ))}
                    {dayEvents.length > 4 && (
                      <span className={`text-[10px] font-medium ${isSelected ? 'text-[#163120]' : 'text-white/72'}`}>+{dayEvents.length - 4}</span>
                    )}
                  </div>
                )}

                {hoverKey === dayKey && dayEvents.length > 0 && (
                  <div className='absolute bottom-3 left-1/2 z-20 w-[240px] -translate-x-1/2 rounded-[16px] border border-white/10 bg-[#050607] p-3 text-white shadow-2xl'>
                    <div className='text-[13px] font-medium text-white'>{formatDate(day)}</div>
                    <div className='mt-2 space-y-2'>
                      {dayEvents.map((event) => (
                        <div key={event.id} className='flex items-start gap-2 text-[12px] leading-5 text-white/86'>
                          <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${eventDotClass(event)}`} />
                          <div className='line-clamp-2'>{event.title}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
