'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { EventItem } from '@/lib/types';

type FeedResponse = {
  items: EventItem[];
  total: number;
};

export default function Feed() {
  const [events, setEvents] = useState<EventItem[]>([]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/feed?chatId=1`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: FeedResponse | EventItem[]) => setEvents(Array.isArray(data) ? data : data.items || []))
      .catch(() => api.events().then(setEvents).catch(() => undefined));
  }, []);

  return (
    <div className='mx-auto max-w-3xl space-y-3 p-6'>
      {events.map((event) => (
        <article key={event.id} className='rounded-2xl border border-slate-200 bg-white p-4'>
          <h2 className='text-lg font-semibold'>{event.title}</h2>
          <div className='mt-1 text-sm text-slate-500'>{new Date(event.startAt).toLocaleString('ru-RU')} · {event.location}</div>
        </article>
      ))}
    </div>
  );
}
