'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  ArrowRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  MapPin,
  MonitorPlay,
} from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import type { EventItem } from '@/lib/types';
import {
  compareCompletedEvents,
  compareUpcomingEvents,
  extractPriceText,
  formatEventType,
  getRuntimeStatus,
  isCompletedEvent,
  isRecentlyCompletedEvent,
} from '@/lib/event-utils';
import { Button } from './ui/button';
import { ReminderButton } from './reminder-button';

const IMPORTANT_EVENTS_PHOTO = '/important-events-photo-v2.png';
const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function normalizeText(value: string) {
  return value
    .toLowerCase()
    .replace(/[ё]/g, 'е')
    .replace(/[*_`"«»“”.,:;!?()[\]{}|/\\-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanDescriptionText(value?: string, title?: string) {
  if (!value) return '';
  const normalizedTitle = title ? normalizeText(title) : '';

  return value
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#[^\s#]+/g, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => normalizeText(line) !== normalizedTitle)
    .filter((line) => !/^(Источник|Телеграм|Telegram|MAX|Зарегистрироваться|Регистрация)\b/i.test(line))
    .filter((line) => !/^(?:когда|где|место|адрес|формат|дата(?:\s+и\s+время)?|стоимость|цена|участие)\s*[:：]/i.test(line))
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

function getImportantDateChipClass(event: EventItem, active: boolean) {
  const status = getRuntimeStatus(event);
  const isLive = ['LIVE', 'NOW', 'IN_PROGRESS', 'ONGOING'].includes(status);

  if (isCompletedEvent(event)) return 'important-date-chip--completed';
  if (isLive || active) return 'important-date-chip--live';
  return 'important-date-chip--planned';
}

export function HighlightCarousel({
  items,
  onSelectEvent,
  embedded = false,
  controls,
}: {
  items: EventItem[];
  onSelectEvent: (item: EventItem) => void;
  embedded?: boolean;
  controls?: ReactNode;
}) {
  const uniqueItems = useMemo(
    () => Array.from(new Map(items.map((event) => [event.id, event])).values()),
    [items],
  );
  const [showRecentCompleted, setShowRecentCompleted] = useState(false);
  const [active, setActive] = useState(0);

  const upcomingEvents = useMemo(
    () => uniqueItems.filter((event) => !isCompletedEvent(event)).sort(compareUpcomingEvents),
    [uniqueItems],
  );

  const recentlyCompletedEvents = useMemo(
    () => uniqueItems.filter(isRecentlyCompletedEvent).sort(compareCompletedEvents),
    [uniqueItems],
  );

  const slides = useMemo(() => {
    if (showRecentCompleted) return [...upcomingEvents, ...recentlyCompletedEvents];
    if (upcomingEvents.length > 0) return upcomingEvents;
    return recentlyCompletedEvents.slice(0, 3);
  }, [recentlyCompletedEvents, showRecentCompleted, upcomingEvents]);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setTimeout(() => setActive((previous) => (previous + 1) % slides.length), 10000);
    return () => window.clearTimeout(timer);
  }, [active, slides.length]);

  useEffect(() => {
    if (slides.length === 0 || active >= slides.length) setActive(0);
  }, [active, slides.length]);

  const item = slides[active] ?? null;
  const arrowsDisabled = slides.length <= 1;
  const slideImage = item && isActualEventImage(item.imageUrl) ? item.imageUrl! : IMPORTANT_EVENTS_PHOTO;
  const priceText = item ? extractPriceText(`${item.descriptionShort || ''}\n${item.descriptionFull || ''}`) : '';
  const description = item ? cleanDescriptionText(item.descriptionFull || item.descriptionShort, item.title) : '';

  const content = (
    <div className='important-events-shell important-events-unified overflow-hidden rounded-[30px] border border-black bg-[var(--ab-panel-bg)]'>
      <div className='highlight-hero-joined relative overflow-hidden bg-transparent'>
        <div className='grid min-h-[320px] gap-0 lg:grid-cols-[0.95fr_1fr]'>
          <button
            type='button'
            disabled={arrowsDisabled}
            onClick={() => setActive((previous) => (previous - 1 + slides.length) % slides.length)}
            className='important-nav-btn absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full lg:inline-flex'
            aria-label='Предыдущий слайд'
          >
            <ChevronLeft className='h-5 w-5' />
          </button>

          <div className='important-events-image-panel relative min-h-[280px] overflow-hidden border-b border-[#7CD8B3] bg-white p-4 lg:border-b-0'>
            <img
              src={slideImage}
              alt={item?.title || 'Важные события'}
              className='h-full w-full object-contain object-center'
              onError={(event) => {
                const image = event.currentTarget;
                if (!image.src.endsWith(IMPORTANT_EVENTS_PHOTO)) image.src = IMPORTANT_EVENTS_PHOTO;
              }}
            />
          </div>

          <div className='important-events-copy-panel relative flex flex-col justify-center bg-transparent p-6 text-black lg:p-8'>
            <div className='mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#2c8d67]'>Важные события</div>

            <h2 className='max-w-2xl text-[28px] font-medium leading-tight text-black xl:text-[36px]'>
              {item?.title || 'Важные события появятся после синхронизации с Max'}
            </h2>

            {item ? (
              <>
                <div className='important-event-meta mt-6 flex flex-wrap gap-x-7 gap-y-3 text-slate-700'>
                  <span className='important-meta-date inline-flex items-center gap-2 text-[15px]'>
                    <CalendarDays className='h-5 w-5 text-[#2c8d67]' />
                    {format(new Date(item.startAt), 'd MMMM yyyy', { locale: ru })}
                  </span>
                  <span className='important-meta-time inline-flex items-center gap-2 text-[15px]'>
                    <Clock3 className='h-5 w-5 text-[#2c8d67]' />
                    {format(new Date(item.startAt), 'HH:mm')} – {format(new Date(item.endAt), 'HH:mm')}
                  </span>
                  <span className='important-meta-format inline-flex items-center gap-2 text-[15px]'>
                    <MonitorPlay className='h-5 w-5 text-[#2c8d67]' />
                    {formatEventType(item)}
                  </span>
                  {priceText ? (
                    <span className='important-meta-price inline-flex items-center gap-2 text-[15px]'>
                      <CircleDollarSign className='h-5 w-5 text-[#2c8d67]' />
                      {priceText}
                    </span>
                  ) : null}
                  <span className='important-meta-location inline-flex w-full basis-full items-center gap-2 text-[15px]'>
                    <MapPin className='h-5 w-5 text-[#2c8d67]' />
                    {item.location || 'Локация уточняется'}
                  </span>
                </div>

                {description ? (
                  <p className='important-event-description mt-6 max-w-none whitespace-pre-line text-[16px] leading-7 text-slate-700'>
                    {description}
                  </p>
                ) : null}

                <div className='mt-6 flex flex-wrap items-center gap-3'>
                  <Button variant='primary' onClick={() => onSelectEvent(item)} className='important-event-action-btn min-w-[170px]'>
                    Подробнее
                  </Button>
                  <ReminderButton event={item} variant='primary' className='important-event-action-btn min-w-[170px]' />
                </div>
              </>
            ) : (
              <p className='mt-5 max-w-2xl text-lg leading-8 text-slate-700'>
                После загрузки здесь появятся главные события с приоритетными публикациями из подключенного Max-канала.
              </p>
            )}
          </div>

          <button
            type='button'
            disabled={arrowsDisabled}
            onClick={() => setActive((previous) => (previous + 1) % slides.length)}
            className='important-nav-btn absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full lg:inline-flex'
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
          {controls ? <h3 className='important-events-mode-title'>РЕЖИМ ОТОБРАЖЕНИЯ</h3> : <div aria-hidden='true' />}
        </div>

        <div className='important-events-controls-row'>
          <button
            type='button'
            disabled={!item && recentlyCompletedEvents.length === 0}
            aria-pressed={showRecentCompleted}
            onClick={() => {
              setShowRecentCompleted((current) => !current);
              setActive(0);
            }}
            className={`important-events-view-all-btn inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-medium text-black ${
              showRecentCompleted ? 'important-events-view-all-btn-active' : ''
            }`}
          >
            {showRecentCompleted ? 'Запланированные' : 'Смотреть все'}
            <ArrowRight className='h-4 w-4' />
          </button>

          {controls ? <div className='important-events-mode-controls grid gap-3 sm:grid-cols-2'>{controls}</div> : <div aria-hidden='true' />}
        </div>

        {slides.length > 0 ? (
          <div className='important-date-chip-list flex flex-wrap items-center gap-3'>
            {slides.map((event, index) => {
              const date = new Date(event.startAt);

              return (
                <button
                  key={event.id}
                  type='button'
                  onClick={() => setActive(index)}
                  className={`important-date-chip ${getImportantDateChipClass(event, index === active)}`}
                  title={event.title}
                >
                  <span className='important-date-chip-rings' aria-hidden='true'>
                    <span />
                    <span />
                    <span />
                    <span />
                  </span>
                  <span className='important-date-chip-number'>{date.getDate()}</span>
                  <span className='important-date-chip-month'>{MONTHS_SHORT[date.getMonth()]}</span>
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

  return embedded ? content : <section className='container-shell mt-4'>{content}</section>;
}
