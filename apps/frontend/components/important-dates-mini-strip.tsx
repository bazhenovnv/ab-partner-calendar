'use client';

import { ArrowRight } from 'lucide-react';
import { useMemo } from 'react';
import { EventItem } from '@/lib/types';

const MONTHS_SHORT = ['янв', 'фев', 'мар', 'апр', 'май', 'июн', 'июл', 'авг', 'сен', 'окт', 'ноя', 'дек'];

function dateKey(value: string | Date) {
  const d = new Date(value);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

type Props = {
  events: EventItem[];
  selectedDate?: Date;
  onSelect?: (event: EventItem) => void;
  onOpenAll?: () => void;
};

export function ImportantDatesMiniStrip({ events, selectedDate, onSelect, onOpenAll }: Props) {
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
      .slice(0, 10);
  }, [events]);

  return (
    <div className='mini-important-strip rounded-[26px] border border-[#7CD8B3] bg-white p-5 shadow-[0_28px_70px_rgba(0,0,0,0.20)]'>
      <div className='flex items-center justify-between gap-4'>
        <h3 className='text-[24px] font-semibold leading-none text-black'>Важные события</h3>
        <button
          type='button'
          onClick={onOpenAll}
          className='inline-flex items-center gap-2 rounded-full border border-[#4FAF8C] bg-white px-4 py-2 text-sm font-medium text-black shadow-[0_10px_24px_rgba(0,0,0,0.16)] transition hover:-translate-y-[1px]'
        >
          Смотреть все
          <ArrowRight className='h-4 w-4' />
        </button>
      </div>

      {uniqueDates.length ? (
        <div className='mt-4 flex flex-wrap items-center gap-3'>
          {uniqueDates.map((event) => {
            const d = new Date(event.startAt);
            const key = dateKey(event.startAt);
            const active = key === activeKey;
            return (
              <button
                key={event.id}
                type='button'
                onClick={() => onSelect?.(event)}
                title={event.title}
                className={`important-date-chip group flex h-[74px] w-[74px] flex-col items-center justify-center rounded-full border bg-[#7CD8B3] text-center text-black shadow-[0_14px_30px_rgba(0,0,0,0.18)] transition hover:-translate-y-[2px] ${active ? 'border-2 border-[#E04B4B]' : 'border-[#4FAF8C]'}`}
              >
                <span className='text-[22px] font-semibold leading-none'>{d.getDate()}</span>
                <span className='mt-1 text-[11px] font-medium uppercase tracking-[0.08em]'>{MONTHS_SHORT[d.getMonth()]}</span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className='mt-4 rounded-[18px] border border-dashed border-[#7CD8B3] bg-white px-4 py-3 text-sm text-slate-500'>
          В текущем месяце нет запланированных важных событий.
        </div>
      )}
    </div>
  );
}
