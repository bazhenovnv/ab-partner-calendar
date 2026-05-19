'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MapPin, MonitorPlay } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { EventItem } from '@/lib/types';
import { Button } from './ui/button';
import { ReminderButton } from './reminder-button';

const IMPORTANT_EVENTS_PHOTO = '/important-events-photo-v2.png';

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
    .filter((line) => !/(?:^|[?&])q=|%[0-9a-f]{2}/iu.test(line))
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

export function HighlightCarousel({
  items,
  onOpen,
  embedded = false,
}: {
  items: EventItem[];
  onOpen: (item: EventItem) => void;
  embedded?: boolean;
}) {
  const slides = useMemo(() => (items.length ? items : []), [items]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = window.setInterval(() => {
      setActive((prev) => (prev + 1) % slides.length);
    }, 10000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) {
    const fallback = (
      <div className='overflow-hidden rounded-[18px] border border-[#7CD8B3] bg-white shadow-[0_10px_28px_rgba(0,0,0,0.12)]'>
        <div className='grid min-h-[320px] gap-4 px-3 pt-3 pb-9 lg:grid-cols-2 lg:px-3 lg:pt-3 lg:pb-10'>
          <div className='min-h-[280px] overflow-hidden rounded-[22px] border border-[#7CD8B3] bg-white p-4'>
            <img src={IMPORTANT_EVENTS_PHOTO} alt='Важные события' className='h-full w-full object-contain object-center' />
          </div>

          <div className='flex flex-col justify-center rounded-[22px] border border-[#7CD8B3] bg-white p-6 text-black lg:p-8'>
            <div className='mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#2c8d67]'>Важные события</div>
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
    <div className='overflow-hidden rounded-[18px] border border-[#7CD8B3] bg-white shadow-[0_10px_28px_rgba(0,0,0,0.12)]'>
      <div className='relative grid min-h-[320px] gap-4 px-3 pt-3 pb-9 lg:grid-cols-[0.95fr_1fr] lg:px-3 lg:pt-3 lg:pb-10'>
        <button
          type='button'
          onClick={() => setActive((prev) => (prev - 1 + slides.length) % slides.length)}
          className='absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/16 lg:inline-flex'
          aria-label='Предыдущий слайд'
        >
          <ChevronLeft className='h-5 w-5' />
        </button>

        <div className='min-h-[280px] overflow-hidden rounded-[22px] border border-[#7CD8B3] bg-white p-4'>
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

        <div className='flex flex-col justify-center rounded-[22px] border border-[#7CD8B3] bg-white p-6 text-black lg:p-8'>
          <div className='mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#2c8d67]'>Важные события</div>
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

          <p className='mt-6 max-w-2xl whitespace-pre-line text-[16px] leading-7 text-slate-700'>
            {cleanDescriptionText(item.descriptionShort || item.descriptionFull)}
          </p>

          <div className='mt-6 flex flex-wrap items-center gap-3'>
            <Button variant='dark' onClick={() => onOpen(item)} className='min-w-[170px] shadow-[0_14px_30px_rgba(0,0,0,0.24)] font-bold'>
              Подробнее
            </Button>
            <ReminderButton event={item} variant='secondary' className='min-w-[170px] shadow-[0_14px_30px_rgba(0,0,0,0.24)] font-bold' />
          </div>
        </div>

        <button
          type='button'
          onClick={() => setActive((prev) => (prev + 1) % slides.length)}
          className='absolute right-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/16 lg:inline-flex'
          aria-label='Следующий слайд'
        >
          <ChevronRight className='h-5 w-5' />
        </button>

        <div className='absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-3'>
          {slides.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActive(idx)}
              aria-label={`Слайд ${idx + 1}`}
              className={`h-2.5 rounded-full transition-all ${idx === active ? 'w-8 bg-[#8BE2BE]' : 'w-2.5 bg-white/40 hover:bg-white/70'}`}
            />
          ))}
        </div>
      </div>
    </div>
  );

  if (embedded) return content;
  return <section className='container-shell mt-4'>{content}</section>;
}
