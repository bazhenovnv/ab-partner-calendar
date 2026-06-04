'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowRight, CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, MonitorPlay } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { EventItem } from '@/lib/types';
import { Button } from './ui/button';
import { ReminderButton } from './reminder-button';

const IMPORTANT_EVENTS_PHOTO = '/important-events-photo-v2.png';

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function cleanDescriptionText(value?: string) {
  if (!value) return '';

  return value
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#[^\s#]+/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(Источник|Телеграм|Telegram|MAX|Зарегистрироваться|Регистрация)\b/i.test(line))
    .filter((line) => !/зарегистрироваться|регистрация|телеграм|telegram|\bmax\b/i.test(line))
    .filter((line) => !/(?:^|[?&])q=|%[0-9a-f]{2}/i.test(line))
    .filter((line) => !/^\(?\??\)?$/.test(line))
    .join('\n')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isActualEventImage(value?: string) {
  if (!value) return false;
  if (value === IMPORTANT_EVENTS_PHOTO) return false;
  if (value.startsWith('/important-events-photo')) return false;
  return /^(https?:)?\/\//i.test(value) || value.startsWith('/');
}

function getRuntimeStatus(event: EventItem) {
  return event.runtimeStatus || event.status;
}

function isCompletedEvent(event: EventItem) {
  if (getRuntimeStatus(event) === 'COMPLETED') return true;

  const endAt = new Date(event.endAt).getTime();
  if (Number.isFinite(endAt)) return endAt < Date.now();

  const startAt = new Date(event.startAt).getTime();
  return Number.isFinite(startAt) && startAt < Date.now();
}

function compareUpcomingEvents(a: EventItem, b: EventItem) {
  return +new Date(a.startAt) - +new Date(b.startAt);
}

function compareCompletedEvents(a: EventItem, b: EventItem) {
  const aDate = +new Date(a.endAt || a.startAt);
  const bDate = +new Date(b.endAt || b.startAt);
  return bDate - aDate;
}

export function HighlightCarousel({
  items,
  onOpen,
  embedded = false,
  controls,
}: {
  items: EventItem[];
  onOpen: (item: EventItem) => void;
  embedded?: boolean;
  controls?: ReactNode;
}) {
  const slides = useMemo(() => {
    const uniqueItems = Array.from(new Map(items.map((event) => [event.id, event])).values());
    const activeEvents = uniqueItems
      .filter((event) => !isCompletedEvent(event))
      .sort(compareUpcomingEvents);
    const completedEvents = uniqueItems
      .filter(isCompletedEvent)
      .sort(compareCompletedEvents);

    if (activeEvents.length >= 2) return activeEvents;
    if (activeEvents.length === 1) return [...activeEvents, ...completedEvents.slice(0, 1)];
    return completedEvents.slice(0, 3);
  }, [items]);
  const [active, setActive] = useState(0);

  const plannedSlides = useMemo(() => {
    return slides
      .map((event, idx) => ({ event, idx }))
      .filter(({ event }) => !isCompletedEvent(event));
  }, [slides]);

  useEffect(() => {
    if (slides.length <= 1) return;

    const timer = window.setTimeout(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 10000);

    return () => window.clearTimeout(timer);
  }, [active, slides.length]);

  useEffect(() => {
    if (slides.length > 0 && active >= slides.length) {
      setActive(0);
    }
  }, [active, slides.length]);

  if (!slides.length) {
    const fallback = (
      <div className='important-events-shell important-events-unified overflow-hidden rounded-[30px] border border-black bg-[var(--ab-panel-bg)]'>
        <div className='grid min-h-[320px] gap-0 lg:grid-cols-2'>
          <div className='important-events-image-panel min-h-[280px] overflow-hidden border-b border-[#7CD8B3] bg-white p-4 lg:border-b-0'>
            <img
              src={IMPORTANT_EVENTS_PHOTO}
              alt='Важные события'
              className='h-full w-full object-contain object-center'
            />
          </div>

          <div className='important-events-copy-panel relative flex flex-col justify-center bg-transparent p-6 text-black lg:p-8'>
            <div className='mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#2c8d67]'>
              Важные события
            </div>

            <h2 className='max-w-2xl text-3xl font-medium leading-tight text-black lg:text-4xl'>
              Важные события загружаются из Telegram-канала и API-источников
            </h2>

            <p className='mt-5 max-w-2xl text-lg leading-8 text-slate-700'>
              После синхронизации здесь появятся главные события с приоритетными публикациями из подключённых источников.
            </p>
          </div>
        </div>
      </div>
    );

    return embedded ? fallback : <section className='container-shell mt-4'>{fallback}</section>;
  }

  const item = slides[active] ?? slides[0];
  const slideImage = isActualEventImage(item.imageUrl) ? item.imageUrl! : IMPORTANT_EVENTS_PHOTO;

  const content = (
    <div className='important-events-shell important-events-unified overflow-hidden rounded-[30px] border border-black bg-[var(--ab-panel-bg)]'>
      <div className='highlight-hero-joined relative overflow-hidden bg-transparent'>
        <div className='grid min-h-[320px] gap-0 lg:grid-cols-[0.95fr_1fr]'>
          <button
            type='button'
            onClick={() => setActive((prev) => (prev - 1 + slides.length) % slides.length)}
            className='important-nav-btn pressable absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full lg:inline-flex'
            aria-label='Предыдущий слайд'
          >
            <ChevronLeft className='h-5 w-5' />
          </button>

          <div className='important-events-image-panel relative min-h-[280px] overflow-hidden border-b border-[#7CD8B3] bg-white p-4 lg:border-b-0'>
            <img
              src={slideImage}
              alt={item.title}
              className='h-full w-full object-contain object-center'
              onError={(event) => {
                const image = event.currentTarget;
                if (!image.src.endsWith(IMPORTANT_EVENTS_PHOTO)) {
                  image.src = IMPORTANT_EVENTS_PHOTO;
                }
              }}
            />
          </div>

          <div className='flex flex-col justify-center bg-transparent p-6 text-black lg:p-8'>
            <div className='mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#2c8d67]'>
              Важные события
            </div>

            <h2 className='max-w-2xl text-[28px] font-medium leading-tight text-black xl:text-[36px]'>
              {item.title}
            </h2>

            <div className='mt-6 flex flex-wrap gap-x-7 gap-y-3 text-slate-700'>
              <span className='inline-flex items-center gap-2 text-[15px]'>
                <CalendarDays className='h-5 w-5 text-[#2c8d67]' />
                {format(new Date(item.startAt), 'd MMMM yyyy', { locale: ru })}
              </span>

              <span className='inline-flex items-center gap-2 text-[15px]'>
                <Clock3 className='h-5 w-5 text-[#2c8d67]' />
                {format(new Date(item.startAt), 'HH:mm')} – {format(new Date(item.endAt), 'HH:mm')}
              </span>

              <span className='inline-flex items-center gap-2 text-[15px]'>
                <MonitorPlay className='h-5 w-5 text-[#2c8d67]' />
                {item.format === 'ONLINE' ? 'Онлайн' : item.format === 'OFFLINE' ? 'Офлайн' : 'Гибрид'}
              </span>

              <span className='inline-flex items-center gap-2 text-[15px]'>
                <MapPin className='h-5 w-5 text-[#2c8d67]' />
                {item.location || 'Локация уточняется'}
              </span>
            </div>

            <p className='important-event-description mt-6 max-w-none whitespace-pre-line text-[16px] leading-7 text-slate-700'>
              {cleanDescriptionText(item.descriptionShort || item.descriptionFull)}
            </p>

            <div className='mt-6 flex flex-wrap items-center gap-3'>
              <Button
                variant='primary'
                onClick={() => onOpen(item)}
                className='important-event-action-btn min-w-[170px]'
              >
                Подробнее
              </Button>

              <ReminderButton
                event={item}
                variant='primary'
                className='important-event-action-btn min-w-[170px]'
              />
            </div>

            {isCompletedEvent(item) ? (
              <div className='important-event-completed-stamp' aria-label='Проведено'>
                <span>ПРОВЕДЕНО</span>
              </div>
            ) : null}
          </div>

          <button
            type='button'
            onClick={() => setActive((prev) => (prev + 1) % slides.length)}
            className='important-nav-btn pressable absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full lg:inline-flex'
            aria-label='Следующий слайд'
          >
            <ChevronRight className='h-5 w-5' />
          </button>
        </div>
      </div>

      <div className='important-events-divider mx-6 border-t border-[#cfcfcf]' />

      <div className='important-events-ribbon bg-transparent px-3 pb-5 pt-5'>
        <div className='important-events-headline-row'>
          <h3 className='important-events-ribbon-title'>ВАЖНЫЕ СОБЫТИЯ</h3>

          {controls ? (
            <h3 className='important-events-mode-title'>РЕЖИМ ОТОБРАЖЕНИЯ</h3>
          ) : (
            <div aria-hidden='true' />
          )}
        </div>

        <div className='important-events-controls-row'>
          <button
            type='button'
            onClick={() => setActive(plannedSlides[0]?.idx ?? 0)}
            className='important-events-view-all-btn inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-black transition'
          >
            Смотреть все
            <ArrowRight className='h-4 w-4' />
          </button>

          {controls ? (
            <div className='important-events-mode-controls grid gap-3 sm:grid-cols-2'>
              {controls}
            </div>
          ) : (
            <div aria-hidden='true' />
          )}
        </div>

        {plannedSlides.length > 0 ? (
          <div className='flex flex-wrap items-center gap-3'>
            {plannedSlides.map(({ event, idx }) => {
              const date = new Date(event.startAt);

              return (
                <button
                  key={event.id}
                  type='button'
                  onClick={() => setActive(idx)}
                  className={`important-date-chip group flex h-[58px] w-[58px] flex-col items-center justify-center rounded-full border bg-white text-center transition ${
                    idx === active ? 'border-[#E04B4B]' : 'border-[#7CD8B3]'
                  }`}
                  title={event.title}
                >
                  <span className='text-[18px] font-semibold leading-none text-black'>
                    {date.getDate()}
                  </span>
                  <span className='mt-1 text-[10px] uppercase tracking-[0.06em] text-black'>
                    {MONTHS_SHORT[date.getMonth()]}
                  </span>
                </button>
              );
            })}
          </div>
        ) : (
          <div className='rounded-[14px] border border-[#7CD8B3] bg-white px-4 py-3 text-sm text-black'>
            Запланированных важных событий пока нет.
          </div>
        )}
      </div>
    </div>
  );

  if (embedded) return content;

  return <section className='container-shell mt-4'>{content}</section>;
}