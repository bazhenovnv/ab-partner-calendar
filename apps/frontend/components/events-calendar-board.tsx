'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, Globe, MapPin } from 'lucide-react';
import { EventItem } from '@/lib/types';
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

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[*_`"«»“”.,:;!?()[\]{}|/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function convertHtmlBoldToMarkdown(value: string) {
  return value
    .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '**$2**')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '');
}

function cleanDescriptionText(value?: string, event?: EventItem) {
  if (!value) return '';

  const eventTitle = event?.title ? normalizeText(event.title) : '';

  return convertHtmlBoldToMarkdown(value)
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#[^\s#]+/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => {
      const normalized = normalizeText(line);

      if (!normalized) return false;

      // Убираем дубль названия мероприятия.
      if (eventTitle && normalized === eventTitle) return false;

      // Убираем служебные строки.
      if (/^(источник|ссылка|регистрация|зарегистрироваться)\b/iu.test(line)) return false;
      if (/зарегистрироваться|регистрация|телеграм|telegram|\bmax\b/iu.test(line)) return false;

      // Убираем строки с датой, временем, форматом и источником.
      if (/^(когда|дата|время|формат|стоимость|источник|город|адрес|место)\s*[:：]/iu.test(line)) return false;
      if (/^\d{1,2}\s+[а-яё]+\s*(?:\d{4}\s*г?\.?)?\s*\|/iu.test(line)) return false;
      if (/^(онлайн|офлайн|очно|гибрид|бесплатно|платно)(\s*\|\s*(онлайн|офлайн|очно|гибрид|бесплатно|платно))*$/iu.test(line)) return false;
      if (/^\d{1,2}[:.]\d{2}\s*[—–-]\s*\d{1,2}[:.]\d{2}/iu.test(line)) return false;
      if (/(?:^|[?&])q=|%[0-9a-f]{2}/iu.test(line)) return false;
      if (/^\(?\??\)?$/.test(line)) return false;

      return true;
    })
    .join('\n')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function renderInlineWithBold(line: string) {
  const parts = line.split(/(\*\*[^*]+?\*\*|__[^_]+?__)/g);

  return parts.map((part, index) => {
    if ((part.startsWith('**') && part.endsWith('**')) || (part.startsWith('__') && part.endsWith('__'))) {
      return (
        <strong key={index} className='font-extrabold text-black'>
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={index}>{part}</span>;
  });
}

function renderRichDescription(text: string) {
  return text.split('\n').map((line, index) => {
    if (!line.trim()) {
      return <div key={index} className='h-2' />;
    }

    return (
      <p key={index} className='mb-2 last:mb-0'>
        {renderInlineWithBold(line)}
      </p>
    );
  });
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
  onMonthChange,
}: {
  events: EventItem[];
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
  filtersPanel?: ReactNode;
  onMonthChange?: (date: Date) => void;
}) {
  const [currentMonth, setCurrentMonth] = useState(startOfMonth(selectedDate));
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [hoverKey, setHoverKey] = useState<string | null>(null);

  useEffect(() => {
    onMonthChange?.(currentMonth);
  }, [currentMonth, onMonthChange]);

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

    return Array.from({ length: 35 }, (_, index) => {
      const day = new Date(firstGridDay);
      day.setDate(firstGridDay.getDate() + index);
      return day;
    });
  }, [currentMonth]);

  const selectedDescription = selectedEvent
    ? cleanDescriptionText(selectedEvent.descriptionFull || selectedEvent.descriptionShort, selectedEvent)
    : '';

  return (
    <section className='calendar-common-shell calendar-unified-shell grid items-start gap-3 xl:grid-cols-[minmax(620px,1.02fr)_minmax(540px,0.98fr)]'>
      <div className='calendar-left-panel event-details-panel surface-card self-start overflow-hidden bg-white h-full min-h-[620px]'>
        <div className='flex h-full min-h-[620px] flex-col overflow-y-auto px-6 py-5'>
          {selectedEvent ? (
            <>
              <div className='flex-1'>
                <div className='mb-4 flex flex-wrap items-start justify-between gap-4'>
                  <div className='min-w-0'>
                    <h3 className='max-w-[900px] text-[25px] font-medium leading-tight text-[#1a1a1a]'>
                      {selectedEvent.title}
                    </h3>
                  </div>

                  <div className='shrink-0 rounded-full border border-[#7CD8B3] bg-[#eefbf4] px-4 py-2 text-sm font-medium text-[#356b51]'>
                    {selectedEvent.format === 'ONLINE' ? 'Онлайн' : selectedEvent.format === 'OFFLINE' ? 'Офлайн' : 'Гибрид'}
                  </div>
                </div>

                <div className='mb-5 break-words text-[17px] leading-8 text-[#404552] [overflow-wrap:anywhere]'>
                  {selectedDescription
                    ? renderRichDescription(selectedDescription)
                    : 'Описание мероприятия будет добавлено позже.'}
                </div>

                <div className='mb-4 flex flex-wrap gap-x-6 gap-y-3 text-[15px] text-slate-600'>
                  <span className='inline-flex items-center gap-2'>
                    <CalendarDays className='h-4 w-4 text-[#2c8d67]' />
                    {formatDateLong(selectedEvent.startAt)}
                  </span>
                  <span className='inline-flex items-center gap-2'>
                    <Clock3 className='h-4 w-4 text-[#2c8d67]' />
                    {formatTime(selectedEvent.startAt)} – {formatTime(selectedEvent.endAt)}
                  </span>
                  <span className='inline-flex items-center gap-2'>
                    <Globe className='h-4 w-4 text-[#2c8d67]' />
                    {selectedEvent.format === 'ONLINE' ? 'Онлайн' : 'Очно'}
                  </span>
                  <span className='inline-flex items-center gap-2'>
                    <MapPin className='h-4 w-4 text-[#2c8d67]' />
                    {selectedEvent.location || 'Адрес уточняется'}
                  </span>
                </div>

                <div className='mt-6 flex flex-wrap items-center gap-3'>
                  <a
                    href={selectedEvent.sourceUrl || '#'}
                    target='_blank'
                    rel='noreferrer'
                    className='mint-btn pressable inline-flex min-w-[260px] items-center justify-between rounded-[18px] px-5 py-3 text-sm font-semibold text-black'
                  >
                    Подробнее о мероприятии
                    <ChevronRight className='h-4 w-4' />
                  </a>

                  <ReminderButton
                    event={selectedEvent}
                    className='mint-btn pressable min-w-[170px] rounded-[18px]'
                  />
                </div>
              </div>

              {selectedDayEvents.length > 1 && (
                <div className='selected-day-events-panel mt-6 h-[178px] shrink-0 overflow-hidden rounded-[18px] border border-[#7CD8B3] bg-white p-3'>
                  <div className='mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-[#2c8d67]'>
                    События выбранного дня
                  </div>

                  <div className='grid max-h-[118px] grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2'>
                    {selectedDayEvents.map((event, index) => (
                      <button
                        key={event.id}
                        type='button'
                        onClick={() => setSelectedEventId(event.id)}
                        className={`mint-btn mint-btn--event-tab pressable w-full justify-start text-left text-[13px] leading-4 ${selectedEvent.id === event.id ? 'mint-btn--active' : ''}`}
                      >
                        <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${eventDotClass(event)}`} />
                        <span className='line-clamp-1'>{index + 1}. {event.title}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className='flex min-h-[560px] flex-col items-center justify-center rounded-[18px] bg-white px-6 py-10 text-center'>
              <img
                src='/calendar-empty-state.png'
                alt='Выберите дату с событиями'
                className='h-[260px] w-[260px] object-contain'
              />
              <div className='mt-2 text-[28px] font-semibold leading-tight text-black'>
                Выберите дату с событиями
              </div>
            </div>
          )}
        </div>
      </div>

      <div className='calendar-panel right-calendar-shell calendar-right-stack grid h-full gap-3 self-start rounded-[26px] border border-transparent bg-transparent p-0'>
        <div className='calendar-top-panel w-full self-start overflow-visible'>
          <div className='w-full rounded-[22px] border border-[#7CD8B3] bg-white p-5 overflow-visible'>
            <div className='mb-3 flex items-center justify-between gap-4 border-b border-[#d8f3e7] pb-3'>
              <div className='flex items-center gap-2'>
                <button
                  type='button'
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
                  className='mint-btn mint-btn--icon pressable'
                >
                  <ChevronLeft className='h-4 w-4' />
                </button>

                <button
                  type='button'
                  onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
                  className='mint-btn mint-btn--icon pressable'
                >
                  <ChevronRight className='h-4 w-4' />
                </button>

                <div className='ml-3 text-[17px] font-medium text-black'>{formatMonth(currentMonth)}</div>
              </div>

              <button
                type='button'
                onClick={() => {
                  const now = new Date();
                  setCurrentMonth(startOfMonth(now));
                  onSelectDate(now);
                }}
                className='mint-btn mint-btn--sm pressable'
              >
                Сегодня
              </button>
            </div>

            <div className='grid grid-cols-7 border border-[#7CD8B3] border-b-0 text-center text-[12px] font-semibold text-black'>
              {weekdayLabels.map((day) => (
                <div key={day} className='border-r border-[#7CD8B3] py-2 last:border-r-0'>
                  {day}
                </div>
              ))}
            </div>

            <div className='calendar-days-grid grid grid-cols-7 border-l border-t border-[#7CD8B3] overflow-visible'>
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
                    onClick={() => {
                      onSelectDate(day);
                      setSelectedEventId(dayEvents[0]?.id ?? null);
                    }}
                    className={`day-cell ${isSelected ? 'day-cell-selected' : ''}`}
                  >
                    <div className={`calendar-day-number ${isSelected ? 'text-black' : isCurrentMonth ? 'text-black' : 'text-slate-400'}`}>
                      {day.getDate()}
                    </div>

                    {dayEvents.length > 0 && (
                      <div className='mt-2 flex flex-wrap gap-1.5'>
                        {dayEvents.slice(0, 4).map((event) => (
                          <span key={event.id} className={`h-2 w-2 rounded-full ${eventDotClass(event)}`} />
                        ))}
                        {dayEvents.length > 4 && (
                          <span className='text-[10px] font-medium text-slate-500'>+{dayEvents.length - 4}</span>
                        )}
                      </div>
                    )}

                    {hoverKey === dayKey && dayEvents.length > 0 && (
                      <div className='calendar-day-popover pointer-events-none absolute bottom-[calc(100%+10px)] left-1/2 z-[9999] w-[280px] -translate-x-1/2 rounded-[16px] border border-[#7CD8B3] bg-white p-3 text-black'>
                        <div className='text-[13px] font-medium text-black'>{formatDate(day)}</div>
                        <div className='mt-2 space-y-2'>
                          {dayEvents.map((event) => (
                            <div key={event.id} className='flex items-start gap-2 text-[12px] leading-5 text-slate-700'>
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

            <div className='flex items-center justify-center gap-5 px-2 pt-3 text-[12px] text-slate-700'>
              <span className='inline-flex items-center gap-2'>
                <span className='h-2.5 w-2.5 rounded-full bg-[#39c285]' />
                Запланировано
              </span>
              <span className='inline-flex items-center gap-2'>
                <span className='h-2.5 w-2.5 rounded-full bg-[#f7c948]' />
                Идёт сегодня
              </span>
              <span className='inline-flex items-center gap-2'>
                <span className='h-2.5 w-2.5 rounded-full bg-[#ef4444]' />
                Прошло
              </span>
            </div>
          </div>
        </div>

        {filtersPanel ? (
          <div className='calendar-bottom-panel w-full rounded-[22px] border border-[#7CD8B3] bg-white overflow-hidden'>
            {filtersPanel}
          </div>
        ) : null}
      </div>
    </section>
  );
}