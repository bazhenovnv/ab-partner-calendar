'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, MonitorPlay } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { EventItem } from '@/lib/types';
import { Button } from './ui/button';
import { ReminderButton } from './reminder-button';

const IMPORTANT_EVENTS_PHOTO = '/important-events-photo-v2.png';

function isActualEventImage(value?: string | null) {
  if (!value) return false;
  const lower = value.toLowerCase();
  if (lower.includes('important-events-photo')) return false;
  if (lower.includes('placeholder')) return false;
  return /^https?:\/\//i.test(value) || value.startsWith('/');
}

function cleanDescriptionText(value?: string) {
  if (!value) return '';
  return value
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#[\p{L}\p{N}_-]+/gu, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(Источник|Телеграм|Telegram|MAX|Зарегистрироваться|Регистрация)\b/iu.test(line))
    .filter((line) => !/зарегистрироваться|регистрация|телеграм|telegram|\bmax\b/iu.test(line))
    .slice(0, 7)
    .join('\n')
    .trim();
}

export function HighlightCarousel({ items, onOpen, embedded = false }: { items: EventItem[]; onOpen: (item: EventItem) => void; embedded?: boolean }) {
  const slides = useMemo(() => items.filter((item) => item.isImportant).slice(0, 12), [items]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    setActive(0);
  }, [slides.length]);

  useEffect(() => {
    if (slides.length <= 1) return undefined;
    const timer = window.setInterval(() => setActive((prev) => (prev + 1) % slides.length), 10000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) {
    const fallback = (
      <div className='important-events-shell overflow-hidden rounded-[22px] border border-[#7CD8B3] bg-white shadow-[0_28px_70px_rgba(0,0,0,0.24)]'>
        <div className='grid min-h-[320px] gap-4 px-3 pt-3 pb-9 lg:grid-cols-2 lg:px-3 lg:pt-3 lg:pb-10'>
          <div className='important-event-inner min-h-[280px] overflow-hidden rounded-[22px] border border-[#7CD8B3] bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.20)]'>
            <img src={IMPORTANT_EVENTS_PHOTO} alt='Важные события' className='h-full w-full object-contain object-center' />
          </div>
          <div className='important-event-inner flex flex-col justify-center rounded-[22px] border border-[#7CD8B3] bg-white p-6 text-black shadow-[0_24px_60px_rgba(0,0,0,0.20)] lg:p-8'>
            <div className='important-events-title mb-4 text-[24px] font-semibold text-black'>Важные события</div>
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

  const item = slides[active];
  const slideImage = isActualEventImage(item.imageUrl) ? item.imageUrl! : IMPORTANT_EVENTS_PHOTO;

  const content = (
    <div id='important-events-section' className='important-events-shell overflow-hidden rounded-[22px] border border-[#7CD8B3] bg-white shadow-[0_28px_70px_rgba(0,0,0,0.24)]'>
      <div className='relative grid min-h-[320px] gap-4 px-3 pt-3 pb-9 lg:grid-cols-[0.95fr_1fr] lg:px-3 lg:pt-3 lg:pb-10'>
        {slides.length > 1 ? (
          <button
            type='button'
            onClick={() => setActive((prev) => (prev - 1 + slides.length) % slides.length)}
            className='highlight-nav-btn absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#4FAF8C] bg-[#7CD8B3]/45 text-[#4FAF8C] shadow-[0_12px_26px_rgba(0,0,0,0.18)] backdrop-blur transition hover:bg-[#7CD8B3]/70 lg:inline-flex'
            aria-label='Предыдущий слайд'
          >
            <ChevronLeft className='h-5 w-5' />
          </button>
        ) : null}

        <div className='important-event-inner min-h-[280px] overflow-hidden rounded-[22px] border border-[#7CD8B3] bg-white p-4 shadow-[0_24px_60px_rgba(0,0,0,0.20)]'>
          <img
            src={slideImage}
            alt={item.title}
            className='h-full w-full object-contain object-center'
            onError={(event) => {
              const image = event.currentTarget;
              if (!image.src.endsWith(IMPORTANT_EVENTS_PHOTO)) image.src = IMPORTANT_EVENTS_PHOTO;
            }}
          />
        </div>

        <div className='important-event-inner flex flex-col justify-center rounded-[22px] border border-[#7CD8B3] bg-white p-6 text-black shadow-[0_24px_60px_rgba(0,0,0,0.20)] lg:p-8'>
          <div className='important-events-title mb-4 text-[24px] font-semibold text-black'>Важные события</div>
          <h2 className='max-w-2xl text-[28px] font-medium leading-tight text-black xl:text-[36px]'>{item.title}</h2>

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

          <p className='mt-6 max-w-2xl whitespace-pre-line text-[16px] leading-7 text-slate-700'>
            {cleanDescriptionText(item.descriptionShort || item.descriptionFull)}
          </p>

          <div className='mt-6 flex flex-wrap items-center gap-3'>
            <Button variant='dark' onClick={() => onOpen(item)} className='min-w-[170px] font-medium'>Подробнее</Button>
            <ReminderButton event={item} variant='secondary' className='min-w-[170px]' />
          </div>
        </div>

        {slides.length > 1 ? (
          <button
            type='button'
            onClick={() => setActive((prev) => (prev + 1) % slides.length)}
            className='highlight-nav-btn absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-[#4FAF8C] bg-[#7CD8B3]/45 text-[#4FAF8C] shadow-[0_12px_26px_rgba(0,0,0,0.18)] backdrop-blur transition hover:bg-[#7CD8B3]/70 lg:inline-flex'
            aria-label='Следующий слайд'
          >
            <ChevronRight className='h-5 w-5' />
          </button>
        ) : null}

        <div className='absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3'>
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActive(idx)}
              aria-label={`Слайд ${idx + 1}`}
              className={`rounded-full border border-black transition-all ${idx === active ? 'h-2.5 w-8 bg-[#7CD8B3]' : 'h-2.5 w-2.5 bg-[#7CD8B3]/40 hover:bg-[#7CD8B3]/70'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  if (embedded) return content;
  return <section className='container-shell mt-4'>{content}</section>;
}
