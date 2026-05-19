'use client';

import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';

type MiniEvent = {
  id: string;
  title: string;
  startAt: string | Date;
};

type Props = {
  events: MiniEvent[];
  className?: string;
  onSelect?: (event: MiniEvent) => void;
  onOpenAll?: () => void;
};

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function dateKey(value: string | Date) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export function ImportantDatesMiniStrip({ events, className = '', onSelect, onOpenAll }: Props) {
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
    <div className={`mini-important-strip rounded-[26px] border border-black bg-[#E8E7E3] p-5 shadow-[0_18px_42px_rgba(0,0,0,0.18)] ${className}`}>
      <div className='flex items-center justify-between gap-4'>
        <h3 className='text-[14px] font-semibold uppercase tracking-[0.08em] text-[#1a1a1a]'>
          Важные события
        </h3>

        <button
          type='button'
          onClick={onOpenAll}
          className='inline-flex items-center gap-2 rounded-full border border-black bg-white px-4 py-2 text-sm font-medium text-[#1a1a1a] shadow-[0_8px_20px_rgba(0,0,0,0.12)] transition hover:-translate-y-[1px]'
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

            return (
              <button
                key={event.id}
                type='button'
                onClick={() => onSelect?.(event)}
                className='group flex h-[74px] w-[74px] flex-col items-center justify-center rounded-full border border-black bg-white text-center shadow-[0_8px_18px_rgba(0,0,0,0.10)] transition hover:-translate-y-[2px] hover:shadow-[0_14px_26px_rgba(0,0,0,0.16)]'
                title={event.title}
              >
                <span className='text-[22px] font-semibold leading-none text-[#1a1a1a]'>{day}</span>
                <span className='mt-1 text-[11px] uppercase tracking-[0.08em] text-slate-500'>{month}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className='mt-4 rounded-[18px] border border-black bg-white px-4 py-3 text-sm text-slate-500'>
          Важные даты появятся после загрузки событий.
        </div>
      )}
    </div>
  );
}
