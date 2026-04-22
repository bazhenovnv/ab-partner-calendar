'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Flame, Layers3, MapPin, MonitorPlay, RadioTower, SlidersHorizontal, Sparkles, Ticket, Users } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { HighlightCarousel } from '@/components/highlight-carousel';
import { EventsCalendarBoard } from '@/components/events-calendar-board';
import { EventModal } from '@/components/event-modal';
import { ReminderPanel } from '@/components/reminder-panel';
import { api } from '@/lib/api';
import { EventItem, TopicCollection } from '@/lib/types';
import { extractRussianCity, RUSSIAN_CITIES } from '@/lib/russian-cities';
import { Button } from '@/components/ui/button';

const formatOptions = [
  { value: 'ALL', label: 'Все форматы' },
  { value: 'ONLINE', label: 'Онлайн' },
  { value: 'OFFLINE', label: 'Офлайн' },
  { value: 'HYBRID', label: 'Гибрид' },
] as const;

type FormatFilter = (typeof formatOptions)[number]['value'];
type PriceFilter = 'ALL' | 'FREE' | 'PAID';
type PeriodFilter = 'ALL' | 'TODAY' | 'WEEK' | 'MONTH';
type ViewMode = 'SHOWCASE' | 'COMPACT';

const topicIcons = ['📄', '1C', '☁️', '🧴', '▥'];

function sameDay(dateA: Date, dateB: Date) {
  return dateA.getFullYear() === dateB.getFullYear() && dateA.getMonth() === dateB.getMonth() && dateA.getDate() === dateB.getDate();
}

function getAnonId() {
  if (typeof window === 'undefined') return 'server';
  const key = 'ab_partner_anon_id';
  let value = window.localStorage.getItem(key);
  if (!value) {
    value = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    window.localStorage.setItem(key, value);
  }
  return value;
}

function getTopicList(events: EventItem[]) {
  const base = ['54-ФЗ', '1С', 'ОФД', 'ЕГАИС', 'Маркировка', 'Налоги', 'Отчетность', 'Кадры'];
  const matched = new Set<string>();
  for (const event of events) {
    const haystack = `${event.title} ${event.descriptionShort} ${event.tags.join(' ')}`.toLowerCase();
    for (const topic of base) {
      if (haystack.includes(topic.toLowerCase())) matched.add(topic);
    }
  }
  return Array.from(matched.size ? matched : new Set(base));
}

function eventMatchesTopic(event: EventItem, topic: string) {
  const haystack = `${event.title} ${event.descriptionShort} ${event.descriptionFull} ${event.tags.join(' ')}`.toLowerCase();
  return haystack.includes(topic.toLowerCase());
}

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [highlights, setHighlights] = useState<EventItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [collections, setCollections] = useState<TopicCollection[]>([]);
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [topicFilter, setTopicFilter] = useState<string>('ALL');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('ALL');
  const [sourceFilter, setSourceFilter] = useState<string>('ALL');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('ALL');
  const [onlyImportant, setOnlyImportant] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('SHOWCASE');

  useEffect(() => {
    api.publicSync()
      .catch(() => null)
      .finally(() => {
        Promise.all([api.events(), api.highlights(), api.collections().catch(() => [])])
          .then(([eventsData, highlightsData, collectionsData]) => {
            setEvents(eventsData);
            setHighlights(highlightsData);
            setCollections(collectionsData);
          })
          .catch(console.error);
      });
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    api.trackVisit({ anonId: getAnonId(), path: window.location.pathname, source: 'web-app' }).catch(() => undefined);
  }, []);

  const availableCities = useMemo(() => {
    const fromEvents = events.map((item) => extractRussianCity(item.location)).filter(Boolean) as string[];
    return RUSSIAN_CITIES.filter((value, index, arr) => arr.indexOf(value) === index && (fromEvents.includes(value) || true));
  }, [events]);

  const availableTopics = useMemo(() => getTopicList(events), [events]);
  const availableSources = useMemo(() => Array.from(new Set(events.map((item) => item.source || 'TELEGRAM'))), [events]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate(), 23, 59, 59);

    return events.filter((item) => {
      const start = new Date(item.startAt);
      const formatMatches = formatFilter === 'ALL' || item.format === formatFilter;
      const city = extractRussianCity(item.location);
      const cityMatches = cityFilter === 'ALL' || city === cityFilter;
      const topicMatches = topicFilter === 'ALL' || eventMatchesTopic(item, topicFilter);
      const priceMatches = priceFilter === 'ALL' || (priceFilter === 'FREE' ? /бесплат/i.test(`${item.descriptionShort} ${item.descriptionFull}`) : !/бесплат/i.test(`${item.descriptionShort} ${item.descriptionFull}`));
      const sourceMatches = sourceFilter === 'ALL' || (item.source || 'TELEGRAM') === sourceFilter;
      const importantMatches = !onlyImportant || item.isImportant;
      const periodMatches =
        periodFilter === 'ALL'
        || (periodFilter === 'TODAY' && sameDay(start, now))
        || (periodFilter === 'WEEK' && start >= now && start <= weekEnd)
        || (periodFilter === 'MONTH' && start >= now && start <= monthEnd);

      return formatMatches && cityMatches && topicMatches && priceMatches && sourceMatches && importantMatches && periodMatches;
    });
  }, [events, formatFilter, cityFilter, topicFilter, priceFilter, sourceFilter, onlyImportant, periodFilter]);

  const filteredHighlights = useMemo(() => {
    return highlights.filter((item) => filteredEvents.some((event) => event.id === item.id));
  }, [highlights, filteredEvents]);

  const visibleCollections = collections.length
    ? collections.slice(0, 5)
    : [
        { slug: '54-fz', title: '54-ФЗ', count: 0, events: [] },
        { slug: '1c', title: '1С', count: 0, events: [] },
        { slug: 'ofd', title: 'ОФД', count: 0, events: [] },
        { slug: 'egais', title: 'ЕГАИС', count: 0, events: [] },
        { slug: 'marking', title: 'Маркировка', count: 0, events: [] },
      ];

  const metrics = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      today: filteredEvents.filter((item) => sameDay(new Date(item.startAt), now)).length,
      week: filteredEvents.filter((item) => {
        const start = new Date(item.startAt);
        return start >= now && start <= weekEnd;
      }).length,
      important: filteredEvents.filter((item) => item.isImportant).length,
      free: filteredEvents.filter((item) => /бесплат/i.test(`${item.descriptionShort} ${item.descriptionFull}`)).length,
      offline: filteredEvents.filter((item) => item.format === 'OFFLINE').length,
      city: cityFilter === 'ALL' ? filteredEvents.length : filteredEvents.filter((item) => extractRussianCity(item.location) === cityFilter).length,
    };
  }, [filteredEvents, cityFilter]);

  const compactEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)).slice(0, 12);
  }, [filteredEvents]);

  return (
    <main className='pb-8'>
      <SiteHeader />

      <section className='container-shell mt-4'>
        <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-6'>
          {[
            { label: 'Сегодня', value: metrics.today, icon: CalendarRange },
            { label: 'На 7 дней', value: metrics.week, icon: Users },
            { label: 'Важно', value: metrics.important, icon: Sparkles },
            { label: 'Бесплатно', value: metrics.free, icon: Ticket },
            { label: 'Оффлайн', value: metrics.offline, icon: MapPin },
            { label: cityFilter === 'ALL' ? 'По всем городам' : cityFilter, value: metrics.city, icon: Flame },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className='surface-card flex items-center gap-4 p-4'>
                <div className='icon-chip h-12 w-12'><Icon className='h-5 w-5 text-[#2c8d67]' /></div>
                <div>
                  <div className='text-sm text-slate-500'>{item.label}</div>
                  <div className='text-2xl font-semibold text-[#14171c]'>{item.value}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {viewMode === 'SHOWCASE' && (
        <section className='container-shell mt-4'>
          <HighlightCarousel items={filteredHighlights} onOpen={setActiveEvent} />
        </section>
      )}

      <section className='container-shell mt-4'>
        <div className='surface-card p-4'>
          <div className='grid gap-4 xl:grid-cols-[1.05fr_repeat(5,minmax(0,1fr))]'>
            <div className='flex items-center gap-3'>
              <div className='icon-chip h-12 w-12'>
                <SlidersHorizontal className='h-5 w-5 text-[#2c2f36]' />
              </div>
              <div>
                <div className='text-sm font-medium text-slate-500'>Фильтры и режимы</div>
                <div className='text-[18px] font-medium text-[#16181d]'>Рабочий режим календаря</div>
              </div>
            </div>

            <label className='grid gap-1'>
              <span className='text-sm font-medium text-slate-600'>Формат</span>
              <div className='relative'>
                <MonitorPlay className='pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <select value={formatFilter} onChange={(e) => setFormatFilter(e.target.value as FormatFilter)} className='select-clean pl-11'>
                  {formatOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
            </label>

            <label className='grid gap-1'>
              <span className='text-sm font-medium text-slate-600'>Город</span>
              <div className='relative'>
                <MapPin className='pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className='select-clean pl-11'>
                  <option value='ALL'>Все города</option>
                  {availableCities.map((city) => <option key={city} value={city}>{city}</option>)}
                </select>
              </div>
            </label>

            <label className='grid gap-1'>
              <span className='text-sm font-medium text-slate-600'>Тема</span>
              <select value={topicFilter} onChange={(e) => setTopicFilter(e.target.value)} className='select-clean'>
                <option value='ALL'>Все темы</option>
                {availableTopics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
              </select>
            </label>

            <label className='grid gap-1'>
              <span className='text-sm font-medium text-slate-600'>Источник</span>
              <div className='relative'>
                <RadioTower className='pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className='select-clean pl-11'>
                  <option value='ALL'>Все источники</option>
                  {availableSources.map((source) => <option key={source} value={source}>{source}</option>)}
                </select>
              </div>
            </label>

            <label className='grid gap-1'>
              <span className='text-sm font-medium text-slate-600'>Период</span>
              <select value={periodFilter} onChange={(e) => setPeriodFilter(e.target.value as PeriodFilter)} className='select-clean'>
                <option value='ALL'>Все даты</option>
                <option value='TODAY'>Сегодня</option>
                <option value='WEEK'>7 дней</option>
                <option value='MONTH'>Месяц</option>
              </select>
            </label>
          </div>

          <div className='mt-4 flex flex-wrap items-center gap-3'>
            <Button variant={viewMode === 'SHOWCASE' ? 'dark' : 'secondary'} onClick={() => setViewMode('SHOWCASE')}>Витрина</Button>
            <Button variant={viewMode === 'COMPACT' ? 'dark' : 'secondary'} onClick={() => setViewMode('COMPACT')}>Компактный режим</Button>
            <Button variant={priceFilter === 'FREE' ? 'dark' : 'secondary'} onClick={() => setPriceFilter((prev) => prev === 'FREE' ? 'ALL' : 'FREE')}>Только бесплатно</Button>
            <Button variant={onlyImportant ? 'dark' : 'secondary'} onClick={() => setOnlyImportant((prev) => !prev)}>Только #Хит</Button>
            <span className='ml-auto text-sm text-slate-500'>Найдено событий: {filteredEvents.length}</span>
          </div>
        </div>
      </section>

      {viewMode === 'COMPACT' ? (
        <section className='container-shell mt-4'>
          <div className='surface-card p-5'>
            <div className='mb-4 flex items-center justify-between gap-4'>
              <div>
                <div className='text-sm font-medium text-slate-500'>Компактный режим</div>
                <div className='text-2xl font-semibold text-[#17191e]'>Быстрый список событий</div>
              </div>
              <div className='text-sm text-slate-500'>Без лишней графики, только ближайшие события</div>
            </div>
            <div className='grid gap-3'>
              {compactEvents.map((event) => (
                <button key={event.id} onClick={() => setActiveEvent(event)} className='rounded-[18px] border border-[#e5e7eb] bg-white p-4 text-left transition hover:-translate-y-[1px] hover:shadow-[0_8px_22px_rgba(15,23,42,0.06)]'>
                  <div className='flex flex-wrap items-center justify-between gap-3'>
                    <div>
                      <div className='text-lg font-semibold text-[#17191e]'>{event.title}</div>
                      <div className='mt-2 text-sm text-slate-500'>
                        {new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(event.startAt))}
                        {' · '}
                        {event.location}
                      </div>
                    </div>
                    <div className='flex items-center gap-2'>
                      <span className='rounded-full bg-[#eefbf4] px-3 py-1 text-xs font-semibold text-[#2c8d67]'>{event.format}</span>
                      {event.isImportant ? <span className='rounded-full bg-black px-3 py-1 text-xs font-semibold text-white'>#Хит</span> : null}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <section className='container-shell mt-4'>
          <EventsCalendarBoard events={filteredEvents} selectedDate={selectedDate} onSelectDate={setSelectedDate} />
        </section>
      )}

      <section className='container-shell mt-4'>
        <div className='surface-card p-4'>
          <div className='grid gap-3 lg:grid-cols-[220px_repeat(5,minmax(0,1fr))_150px]'>
            <div className='flex items-center px-2 text-[16px] font-medium text-[#17191e]'>Подборки по темам</div>
            {visibleCollections.map((collection, index) => (
              <button key={collection.slug} className='surface-card flex items-center gap-4 px-4 py-4 text-left shadow-none transition hover:-translate-y-[1px]'>
                <div className='flex h-12 w-12 items-center justify-center rounded-full bg-[#eefbf4] text-[22px] text-[#2a8f68]'>
                  {topicIcons[index] || <Layers3 className='h-5 w-5' />}
                </div>
                <div>
                  <div className='text-[19px] font-medium text-[#17191e]'>{collection.title}</div>
                  <div className='text-sm text-slate-500'>Мероприятия</div>
                </div>
              </button>
            ))}
            <button className='surface-card flex items-center justify-center gap-3 px-4 py-4 text-[#17191e] shadow-none transition hover:-translate-y-[1px]'>
              <Layers3 className='h-5 w-5' />
              <span className='text-sm font-medium'>Все подборки</span>
            </button>
          </div>
        </div>
      </section>

      <section className='container-shell mt-4'>
        <ReminderPanel />
      </section>

      <EventModal item={activeEvent} open={!!activeEvent} onOpenChange={(open) => !open && setActiveEvent(null)} />
    </main>
  );
}
