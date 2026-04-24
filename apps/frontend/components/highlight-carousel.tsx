'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight, Clock3, MonitorPlay, Bell } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { EventItem } from '@/lib/types';
import { Button } from './ui/button';

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
    }, 5000);
    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (!slides.length) {
    const fallback = (
      <div className='dark-card overflow-hidden'>
        <div className='grid min-h-[320px] gap-6 px-8 py-7 lg:grid-cols-[1.1fr_0.9fr]'>
          <div className='flex flex-col justify-center'>
            <div className='mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#8BE2BE]'>Важные события</div>
            <h2 className='max-w-3xl text-4xl font-medium leading-tight text-white'>Важные события загружаются из Telegram-канала и API-источников</h2>
            <p className='mt-5 max-w-2xl text-lg leading-8 text-white/78'>
              После синхронизации здесь появятся главные события с приоритетными публикациями из подключённых источников.
            </p>
          </div>
          <div className='hidden items-center justify-center lg:flex'>
            <div className='h-[260px] w-full rounded-[18px] bg-[radial-gradient(circle_at_30%_20%,rgba(139,226,190,0.3),transparent_25%),linear-gradient(135deg,#111,#040404)]' />
          </div>
        </div>
      </div>
    );
    return embedded ? fallback : <section className='container-shell mt-4'>{fallback}</section>;
  }

  const item = slides[active];

  const content = (
    <div className='dark-card overflow-hidden'>
      <div className='relative grid min-h-[320px] gap-4 px-6 py-6 lg:grid-cols-[1.08fr_0.92fr] lg:px-8'>
        <button
          type='button'
          onClick={() => setActive((prev) => (prev - 1 + slides.length) % slides.length)}
          className='absolute left-3 top-1/2 z-10 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white backdrop-blur transition hover:bg-white/16 lg:inline-flex'
          aria-label='Предыдущий слайд'
        >
          <ChevronLeft className='h-5 w-5' />
        </button>

        <div className='flex flex-col justify-center lg:pl-8'>
          <div className='mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-[#8BE2BE]'>Важные события</div>
          <h2 className='max-w-3xl text-[34px] font-medium leading-tight text-white xl:text-[46px]'>
            {item.title}
          </h2>

          <div className='mt-6 flex flex-wrap gap-x-7 gap-y-3 text-white/88'>
            <span className='inline-flex items-center gap-2 text-[15px]'>
              <CalendarDays className='h-5 w-5 text-[#8BE2BE]' />
              {format(new Date(item.startAt), 'd MMMM yyyy', { locale: ru })}
            </span>
            <span className='inline-flex items-center gap-2 text-[15px]'>
              <Clock3 className='h-5 w-5 text-[#8BE2BE]' />
              {format(new Date(item.startAt), 'HH:mm')} – {format(new Date(item.endAt), 'HH:mm')}
            </span>
            <span className='inline-flex items-center gap-2 text-[15px]'>
              <MonitorPlay className='h-5 w-5 text-[#8BE2BE]' />
              {item.format === 'ONLINE' ? 'Онлайн' : item.format === 'OFFLINE' ? 'Офлайн' : 'Гибрид'}
            </span>
            <span className='inline-flex items-center gap-2 text-[15px]'>
              <CalendarDays className='h-5 w-5 text-[#8BE2BE]' />
              {item.location || 'Локация уточняется'}
            </span>
          </div>

          <p className='mt-6 max-w-2xl text-[18px] leading-8 text-white/78'>
            {item.descriptionShort || item.descriptionFull}
          </p>

          <div className='mt-6 flex flex-wrap items-center gap-3'>
            <Button variant='secondary' onClick={() => onOpen(item)} className='min-w-[170px]'>
              Подробнее
            </Button>
            <Button asChild className='min-w-[170px]'>
              <a href={`${process.env.NEXT_PUBLIC_TELEGRAM_BOT_DEEP_LINK || 'https://t.me/PartnersTogether_bot'}?start=afisha_${item.id}`} target='_blank' rel='noreferrer'>
                <Bell className='h-4 w-4' />Напомнить
              </a>
            </Button>
          </div>
        </div>

        <div className='flex items-center justify-center lg:justify-end'>
          <div className='h-full min-h-[250px] w-full overflow-hidden rounded-[18px] border border-white/10 bg-[#090909]'>
            <img src={item.imageUrl || 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?q=80&w=1600&auto=format&fit=crop'} alt={item.title} className='h-full w-full object-cover opacity-90' />
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

        <div className='absolute bottom-6 left-1/2 flex -translate-x-1/2 items-center gap-3'>
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

