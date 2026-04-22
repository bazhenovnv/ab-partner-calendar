'use client';

import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Bookmark, CalendarDays, ChevronLeft, ChevronRight, Clock3, Globe, MapPin } from 'lucide-react';
import { EventItem } from '@/lib/types';
import { Button } from './ui/button';

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

function eventColor(event?: EventItem) {
  if (!event) return '';
  if (event.runtimeStatus === 'LIVE') return 'text-[#f7c948]';
  if (event.runtimeStatus === 'COMPLETED') return 'text-[#ef4444]';
  return 'text-[#8BE2BE]';
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
  const [detailsMode, setDetailsMode] = useState(false);
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
    if (selectedDayEvents.length && !selectedEventId) {
      setSelectedEventId(selectedDayEvents[0].id);
    }
    if (!selectedDayEvents.length) {
      setSelectedEventId(null);
      setDetailsMode(false);
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
    <section className='grid gap-4 xl:grid-cols-[240px_minmax(380px,1fr)_minmax(560px,1.1fr)]'>
      <div className='surface-card overflow-hidden'>
        <div className='border-b border-[#ebedf0] px-5 py-4'>
          <div className='flex items-center justify-between gap-2'>
            <div>
              <div className='text-[14px] font-semibold text-[#1f2937]'>{formatDate(selectedDate)}</div>
            </div>
            <div className='inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-[#8BE2BE] px-2 text-xs font-semibold text-[#163120]'>
              {selectedDayEvents.length}
            </div>
          </div>
        </div>

        <div className='p-3'>
          <div className='space-y-2'>
            {selectedDayEvents.length ? selectedDayEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => {
                  setSelectedEventId(event.id);
                  setDetailsMode(true);
                }}
                className={`w-full rounded-xl p-3 text-left transition ${selectedEvent?.id === event.id ? 'bg-[#dff6e8] border border-[#bde8d0]' : 'hover:bg-[#f7f9fb]'}`}
              >
                <div className='flex gap-3'>
                  <div className={`pt-1 text-[13px] font-medium ${eventColor(event)}`}>{formatTime(event.startAt)}</div>
                  <div className='flex-1'>
                    <div className='text-[15px] leading-5 text-[#222] line-clamp-3'>{event.title}</div>
                    <div className='mt-2 flex items-center gap-2'>
                      <span className={`h-2 w-2 rounded-full ${event.runtimeStatus === 'LIVE' ? 'bg-[#f7c948]' : event.runtimeStatus === 'COMPLETED' ? 'bg-[#ef4444]' : 'bg-[#39c285]'}`} />
                    </div>
                  </div>
                </div>
              </button>
            )) : (
              <div className='rounded-xl bg-[#f8fafb] px-4 py-8 text-center text-sm text-slate-500'>На эту дату событий нет</div>
            )}
          </div>

          <Button variant='secondary' className='mt-5 w-full justify-between'>
            Все события дня
            <CalendarDays className='h-4 w-4' />
          </Button>
        </div>
      </div>

      <div className='surface-card overflow-hidden'>
        <div className='min-h-full px-6 py-5'>
          {detailsMode && selectedEvent ? (
            <button onClick={() => setDetailsMode(false)} className='mb-4 inline-flex items-center gap-2 text-sm text-slate-600 transition hover:text-black'>
              <ArrowLeft className='h-4 w-4' /> Назад
            </button>
          ) : null}

          {selectedEvent ? (
            <>
              <div className='mb-4 flex items-start justify-between gap-4'>
                <h3 className='max-w-[560px] text-[22px] font-medium leading-tight text-[#1a1a1a]'>{selectedEvent.title}</h3>
                <div className='rounded-full bg-[#e7f7ee] px-4 py-2 text-sm font-medium text-[#356b51]'>
                  {selectedEvent.format === 'ONLINE' ? 'Онлайн' : selectedEvent.format === 'OFFLINE' ? 'Офлайн' : 'Гибрид'}
                </div>
              </div>

              <div className='flex flex-wrap gap-x-6 gap-y-3 text-[15px] text-slate-600'>
                <span className='inline-flex items-center gap-2'><CalendarDays className='h-4 w-4' /> {formatDateLong(selectedEvent.startAt)}</span>
                <span className='inline-flex items-center gap-2'><Clock3 className='h-4 w-4' /> {formatTime(selectedEvent.startAt)} – {formatTime(selectedEvent.endAt)}</span>
                <span className='inline-flex items-center gap-2'><Globe className='h-4 w-4' /> {selectedEvent.format === 'ONLINE' ? 'Онлайн' : 'Очно'}</span>
                <span className='inline-flex items-center gap-2'><MapPin className='h-4 w-4' /> {selectedEvent.location || 'Адрес уточняется'}</span>
              </div>

              <div className='mt-7 text-[17px] leading-8 text-[#404552]'>
                {selectedEvent.descriptionFull || selectedEvent.descriptionShort || 'Описание мероприятия будет добавлено позже.'}
              </div>

              <div className='mt-6 flex flex-wrap gap-2'>
                {selectedEvent.tags?.slice(0, 3).map((tag) => (
                  <span key={tag} className='tag-chip'>{tag}</span>
                ))}
              </div>

              <div className='mt-8 flex items-center gap-3'>
                <Button asChild variant='dark' className='min-w-[300px] justify-between rounded-[12px]'>
                  <a href={selectedEvent.sourceUrl || '#'} target='_blank' rel='noreferrer'>
                    Подробнее о мероприятии
                    <ChevronRight className='h-4 w-4' />
                  </a>
                </Button>
                <button className='inline-flex h-[46px] w-[46px] items-center justify-center rounded-xl border border-[#d8dde3] bg-white text-slate-600 transition hover:bg-slate-50'>
                  <Bookmark className='h-5 w-5' />
                </button>
              </div>
            </>
          ) : (
            <div className='flex min-h-[360px] items-center justify-center text-slate-500'>Выберите дату с событиями</div>
          )}
        </div>
      </div>

      <div className='dark-card overflow-hidden px-4 py-4'>
        <div className='mb-4 flex items-center justify-between gap-4 border-b border-white/10 pb-3'>
          <div className='flex items-center gap-2'>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10'>
              <ChevronLeft className='h-4 w-4' />
            </button>
            <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className='inline-flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-white transition hover:bg-white/10'>
              <ChevronRight className='h-4 w-4' />
            </button>
            <div className='ml-4 text-[18px] font-medium text-white'>{formatMonth(currentMonth)}</div>
          </div>
          <button onClick={() => { const now = new Date(); setCurrentMonth(startOfMonth(now)); onSelectDate(now); setDetailsMode(false); }} className='rounded-xl border border-white/14 bg-white/4 px-4 py-2 text-sm text-white transition hover:bg-white/10'>
            Сегодня
          </button>
        </div>

        <div className='grid grid-cols-7 border border-white/12 border-b-0 text-center text-sm font-semibold text-white/85'>
          {weekdayLabels.map((day) => (
            <div key={day} className='border-r border-white/12 py-3 last:border-r-0'>{day}</div>
          ))}
        </div>

        <div className='grid grid-cols-7 border-l border-t border-white/12'>
          {days.map((day) => {
            const dayKey = keyOf(day);
            const dayEvents = eventsByDay.get(dayKey) ?? [];
            const nearest = dayEvents[0];
            const isCurrentMonth = day.getMonth() === currentMonth.getMonth();
            const isSelected = isSameDay(day, selectedDate);
            return (
              <div
                key={dayKey}
                onMouseEnter={() => setHoverKey(dayKey)}
                onMouseLeave={() => setHoverKey(null)}
                onClick={() => { onSelectDate(day); setDetailsMode(false); setSelectedEventId(dayEvents[0]?.id ?? null); }}
                className={`day-cell ${isSelected ? 'day-cell-selected' : ''}`}
              >
                <div className='mb-2 flex items-start justify-between gap-1'>
                  <div className={`text-[15px] font-medium ${isSelected ? 'text-black' : isCurrentMonth ? 'text-white' : 'text-white/35'}`}>{day.getDate()}</div>
                  {dayEvents.length > 0 && (
                    <span className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-semibold ${isSelected ? 'bg-white text-[#163120]' : 'bg-[#8BE2BE] text-[#163120]'}`}>{dayEvents.length}</span>
                  )}
                </div>

                {nearest && (
                  <div className={`max-w-full text-[12px] leading-4 ${isSelected ? 'text-[#163120]' : 'text-white/88'}`}>
                    <div className={`font-medium ${eventColor(nearest)}`}>{formatTime(nearest.startAt)}</div>
                    <div className='mt-1 line-clamp-2'>{nearest.title}</div>
                  </div>
                )}

                {hoverKey === dayKey && dayEvents.length > 0 && (
                  <div className='absolute bottom-4 left-1/2 z-20 w-[240px] -translate-x-1/2 rounded-[16px] border border-white/10 bg-[#050607] p-3 text-white shadow-2xl'>
                    <div className='text-[13px] font-medium text-white'>{formatDate(day)}</div>
                    <div className='mt-2 space-y-2'>
                      {dayEvents.map((event) => (
                        <div key={event.id} className='text-[12px] leading-5 text-white/86'>
                          <div>{formatTime(event.startAt)} · {event.title}</div>
                          <div className='text-white/55'>{event.location || 'Адрес уточняется'}</div>
                        </div>
                      ))}
                    </div>
                    <div className='mt-2 text-[12px] text-white/70'>Все события дня</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className='flex items-center justify-center gap-8 px-2 pt-4 text-[13px] text-white/82'>
          <span className='inline-flex items-center gap-2'><span className='h-2.5 w-2.5 rounded-full bg-[#39c285]' />Запланировано</span>
          <span className='inline-flex items-center gap-2'><span className='h-2.5 w-2.5 rounded-full bg-[#f7c948]' />Идёт сегодня</span>
          <span className='inline-flex items-center gap-2'><span className='h-2.5 w-2.5 rounded-full bg-[#ef4444]' />Прошло</span>
        </div>
      </div>
    </section>
  );
}
