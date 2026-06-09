'use client';

import type { EventItem } from '@/lib/types';
import { formatEventType, isCompletedEvent } from '@/lib/event-utils';
import { Button } from './ui/button';
import { ReminderButton } from './reminder-button';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function CompactEventsList({
  events,
  onOpen,
}: {
  events: EventItem[];
  onOpen: (event: EventItem) => void;
}) {
  return (
    <div className='compact-events-list grid gap-3'>
      {events.map((event) => {
        const completed = isCompletedEvent(event);

        return (
          <div
            key={event.id}
            className={`compact-event-card rounded-[18px] border bg-white p-4 text-left ${
              completed ? 'compact-event-card--completed' : 'border-[#e5e7eb]'
            }`}
          >
            <button type='button' onClick={() => onOpen(event)} className='compact-event-main-button w-full text-left'>
              <div className='compact-event-card-header flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-start'>
                <div className='min-w-0 flex-1 pr-4'>
                  <div className='break-words pr-2 text-lg font-semibold leading-snug text-[#17191e]'>{event.title}</div>
                  <div className='compact-event-meta mt-2 text-sm text-slate-500'>
                    {formatDate(event.startAt)} · {event.location || 'Локация уточняется'}
                  </div>
                </div>
                <div className='compact-event-badges flex flex-wrap items-center gap-2'>
                  {completed ? <span className='rounded-full border border-[#E04B4B] bg-white px-3 py-1 text-xs font-semibold text-black'>Проведено</span> : null}
                  {event.isImportant ? <span className='rounded-full border border-[#4FAF8C] bg-[#7CD8B3] px-3 py-1 text-xs font-semibold text-black'>Важное</span> : null}
                  <span className='rounded-full bg-[#eefbf4] px-3 py-1 text-xs font-semibold text-[#2c8d67]'>{formatEventType(event)}</span>
                </div>
              </div>
            </button>
            <div className='mt-4 flex flex-wrap gap-3'>
              <Button variant='secondary' onClick={() => onOpen(event)} className='px-4 py-2'>Подробнее</Button>
              <ReminderButton event={event} variant='primary' className='px-4 py-2' />
            </div>
          </div>
        );
      })}
    </div>
  );
}
