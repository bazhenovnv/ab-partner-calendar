'use client';

import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

type MiniEvent = {
  id: string;
  title: string;
  startAt: string | Date;
  endAt?: string | Date;
  status?: string;
  runtimeStatus?: string;
};

type Props = {
  events: MiniEvent[];
  selectedDate?: string | Date;
  className?: string;
  onSelect?: (event: MiniEvent) => void;
  onOpenAll?: () => void;
};

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function dateKey(value: string | Date) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function isCompletedEvent(event: MiniEvent) {
  const runtimeStatus = String(event.runtimeStatus || event.status || '').toUpperCase();
  if (runtimeStatus === 'COMPLETED') return true;

  const timestamp = +new Date(event.endAt || event.startAt);
  return Number.isFinite(timestamp) && timestamp < Date.now();
}

export function ImportantDatesMiniStrip({ events, selectedDate, className = '', onSelect, onOpenAll }: Props) {
  const activeKey = selectedDate ? dateKey(selectedDate) : '';

  const uniqueDates = useMemo(() => {
    const seen = new Set<string>();

    return events
      .slice()
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
      .filter((event) => {
        const key = dateKey(event.startAt);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 6);
  }, [events]);

  return (
    <div className={`mini-important-strip rounded-[26px] border border-[#7CD8B3] bg-white p-5 ${className}`}>
      <div className='flex items-center justify-between gap-4'>
        <h3 className='text-[14px] font-semibold uppercase tracking-[0.08em] text-[#1a1a1a]'>
          Важные события
        </h3>

        <button
          type='button'
          onClick={onOpenAll}
          className='inline-flex items-center gap-2 rounded-full border border-[#4FAF8C] bg-white px-4 py-2 text-sm font-medium text-[#1a1a1a] transition hover:-translate-y-[1px]'
        >
          Смотреть все
          <ArrowRight className='h-4 w-4' />
        </button>
      </div>

      {uniqueDates.length > 0 ? (
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          {uniqueDates.map((event) => {
            const d = new Date(event.startAt);
            const day = d.getDate();
            const month = MONTHS_SHORT[d.getMonth()];
            const active = dateKey(event.startAt) === activeKey;
            const completed = isCompletedEvent(event);

            return (
              <button
                key={event.id}
                type='button'
                onClick={() => onSelect?.(event)}
                className={`important-date-chip group flex h-[74px] w-[74px] flex-col items-center justify-center rounded-full border text-center transition hover:-translate-y-[2px] ${
                  completed
                    ? 'is-past-month border-[2px] border-[#E04B4B] bg-white'
                    : active
                      ? 'is-active border-[2px] border-[#4FAF8C] bg-white'
                      : 'border-[#4FAF8C] bg-[#7CD8B3]'
                }`}
                title={event.title}
              >
                <span className='text-[22px] font-semibold leading-none text-[#1a1a1a]'>{day}</span>
                <span className='mt-1 text-[11px] uppercase tracking-[0.08em] text-slate-500'>{month}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className='mt-4 rounded-[18px] border border-[#7CD8B3] bg-white px-4 py-3 text-sm text-slate-500'>
          Важные даты появятся после загрузки событий.
        </div>
      )}
    </div>
  );
}
