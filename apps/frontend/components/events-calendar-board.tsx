'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
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
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#[\p{L}\p{N}_-]+/gu, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(Источник|Телеграм|Telegram|MAX|Зарегистрироваться|Регистрация)\b/iu.test(line))
    .filter((line) => !/зарегистрироваться|регистрация|телеграм|telegram|\bmax\b/iu.test(line))
    .filter((line) => !/(?:^|[?&])q=|%[0-9a-f]{2}/iu.test(line))
    .join('\n')
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
  filtersPanel,
}: {
  events: EventItem[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  filtersPanel?: ReactNode;
}) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  useEffect(() => {
    setCurrentMonth((current) => {
      if (current.getFullYear() === selectedDate.getFullYear() && current.getMonth() === selectedDate.getMonth()) return current;
      return startOfMonth(selectedDate);
    });
  }, [selectedDate]);

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
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(firstGridDay);
      day.setDate(firstGridDay.getDate() + index);
      return day;
    });
  }, [currentMonth]);

  return (
    <section className='calendar-common-shell grid items-stretch gap-4 rounded-[24px] border border-[#7CD8B3] bg-white p-3 shadow-[0_28px_70px_rgba(0,0,0,0.24)] xl:grid-cols-[minmax(720px,1.08fr)_minmax(560px,0.92fr)]'>
      <div className='event-details-panel surface-card h-full min-h-[860px] overflow-hidden bg-white'>
        <div className='h-full overflow-y-auto px-6 py-5'>
          {selectedEvent ? (
            <>
              <div className='mb-4 flex flex-wrap items-start justify-between gap-4'>
                <div>
                  <div className='mb-2 text-sm font-medium text-slate-500'>{formatDate(selectedDate)}</div>
                  <h3 className='max-w-[900px] text-[25px] font-semibold leading-tight text-black'>{selectedEvent.title}</h3>
                </div>
                <div className='shrink-0 rounded-full border border-[#7CD8B3] bg-[#eefbf4] px-4 py-2 text-sm font-medium text-[#356b51]'>
                  {selectedEvent.format === 'ONLINE' ? 'Онлайн' : selectedEvent.format === 'OFFLINE' ? 'Офлайн' : 'Гибрид'}
                </div>
              </div>

              <div className='flex flex-wrap gap-x-6 gap-y-3 text-[15px] text-slate-600'>
                <span className='inline-flex items-center gap-2'><CalendarDays className='h-4 w-4 text-[#2c8d67]' /> {formatDateLong(selectedEvent.startAt)}</span>
                <span className='inline-flex items-center gap-2'><Clock3 className='h-4 w-4 text-[#2c8d67]' /> {formatTime(selectedEvent.startAt)} – {formatTime(selectedEvent.endAt)}</span>
                <span className='inline-flex items-center gap-2'><Globe className='h-4 w-4 text-[#2c8d67]' /> {selectedEvent.format === 'ONLINE' ? 'Онлайн' : 'Очно'}</span>
                <span className='inline-flex items-center gap-2'><MapPin className='h-4 w-4 text-[#2c8d67]' /> {selectedEvent.location || 'Адрес уточняется'}</span>
              </div>

              {selectedDayEvents.length > 1 && (
                <div className='mt-5 rounded-[16px] border border-[#7CD8B3] bg-white p-3'>
                  <div className='mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2c8d67]'>События выбранного дня</div>
                  <div className='flex flex-wrap gap-2'>
                    {selectedDayEvents.map((event, index) => (
                      <button
                        key={event.id}
                        type='button'
                        onClick={() => setSelectedEventId(event.id)}
                        className={`inline-flex max-w-[380px] items-center gap-2 rounded-xl border px-3 py-2 text-left text-[13px] leading-4 transition ${selectedEvent.id === event.id ? 'border-black bg-black text-white shadow-sm' : 'border-[#7CD8B3] bg-white text-slate-700 hover:bg-[#eefbf4]'}`}
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full border border-black ${eventDotClass(event)}`} />
                        <span className='line-clamp-1'>{index + 1}. {event.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className='mt-6 whitespace-pre-line break-words text-[17px] leading-8 text-[#404552] [overflow-wrap:anywhere]'>
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
            <div className='flex min-h-[760px] flex-col items-center justify-center rounded-[18px] bg-white px-6 py-10 text-center'>
              <img
                src='/calendar-empty-state.png'
                alt='Выберите дату с событиями'
                className='h-[260px] w-[260px] object-contain drop-shadow-[0_18px_34px_rgba(0,0,0,0.18)]'
              />
              <div className='mt-6 text-[30px] font-semibold leading-tight text-black'>Выберите дату с событиями</div>
            </div>
          )}
        </div>
      </div>

      <div className='calendar-panel right-calendar-shell grid h-full gap-2 self-start rounded-[22px] border border-[#7CD8B3] bg-white p-3 shadow-[0_24px_60px_rgba(0,0,0,0.20)]'>
        <div className='w-full overflow-visible'>
          <div className='calendar-panel-inner rounded-[22px] border border-[#7CD8B3] bg-white p-5 shadow-[0_18px_42px_rgba(0,0,0,0.16)]'>
            <div className='mb-3 flex items-center justify-between gap-4 border-b border-[#d8f3e7] pb-3'>
              <div className='flex items-center gap-2'>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))} className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black bg-[#7CD8B3] text-black shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition hover:opacity-90'>
                  <ChevronLeft className='h-4 w-4' />
                </button>
                <button onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))} className='inline-flex h-8 w-8 items-center justify-center rounded-lg border border-black bg-[#7CD8B3] text-black shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition hover:opacity-90'>
                  <ChevronRight className='h-4 w-4' />
                </button>
                <div className='ml-3 text-[18px] font-semibold text-black'>{formatMonth(currentMonth)}</div>
              </div>
              <button onClick={() => { const now = new Date(); setCurrentMonth(startOfMonth(now)); onSelectDate(now); }} className='rounded-xl border border-black bg-[#7CD8B3] px-3 py-1.5 text-sm font-medium text-black shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition hover:opacity-90'>
                Сегодня
              </button>
            </div>

            <div className='grid grid-cols-7 overflow-visible rounded-[16px] border-l border-t border-[#7CD8B3]'>
              {weekdayLabels.map((day) => (
                <div key={day} className='border-r border-b border-[#7CD8B3] bg-[#f7fffb] px-2 py-2 text-center text-xs font-semibold text-[#2c8d67]'>
                  {day}
                </div>
              ))}
              {days.map((day) => {
                const key = keyOf(day);
                const inMonth = day.getMonth() === currentMonth.getMonth();
                const dayEvents = eventsByDay.get(key) ?? [];
                const selected = isSameDay(day, selectedDate);
                const today = isSameDay(day, new Date());
                const hovered = hoverKey === key && dayEvents.length > 0;

                return (
                  <button
                    key={key}
                    type='button'
                    onClick={() => onSelectDate(new Date(day))}
                    onMouseEnter={() => setHoverKey(key)}
                    onMouseLeave={() => setHoverKey(null)}
                    className={`day-cell group ${selected ? 'day-cell-selected' : ''} ${!inMonth ? 'text-slate-300' : ''}`}
                  >
                    <span className={`relative z-10 inline-flex h-7 min-w-7 items-center justify-center rounded-[6px] px-1 text-sm ${today && !selected ? 'border border-[#7CD8B3] text-[#2c8d67]' : ''}`}>
                      {day.getDate()}
                    </span>

                    {dayEvents.length ? (
                      <div className='absolute bottom-2 left-2 right-2 flex flex-wrap justify-center gap-1'>
                        {dayEvents.slice(0, 5).map((event) => (
                          <span key={event.id} className={`h-2.5 w-2.5 rounded-full border border-black ${eventDotClass(event)}`} />
                        ))}
                      </div>
                    ) : null}

                    {hovered ? (
                      <div className='pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-50 w-[280px] -translate-x-1/2 rounded-[16px] border border-[#7CD8B3] bg-white p-3 text-left text-black shadow-[0_18px_38px_rgba(0,0,0,0.18)]'>
                        <div className='mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2c8d67]'>{dayEvents.length} событие(й)</div>
                        <div className='space-y-2'>
                          {dayEvents.slice(0, 4).map((event) => (
                            <div key={event.id} className='flex items-start gap-2 text-[12px] leading-4'>
                              <span className={`mt-1 h-2 w-2 shrink-0 rounded-full border border-black ${eventDotClass(event)}`} />
                              <span className='line-clamp-2'>{event.title}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {filtersPanel ? (
          <div className='w-full rounded-[22px] border border-[#7CD8B3] bg-white shadow-[0_18px_42px_rgba(0,0,0,0.16)]'>
            {filtersPanel}
          </div>
        ) : null}
      </div>
    </section>
  );
}
