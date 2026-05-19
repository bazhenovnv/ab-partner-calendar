'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, ChevronDown, Flame, Layers3, MapPin, Search, SlidersHorizontal, Sparkles, Ticket, Users } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { HighlightCarousel } from '@/components/highlight-carousel';
import { EventsCalendarBoard } from '@/components/events-calendar-board';
import { EventModal } from '@/components/event-modal';
import { ReminderPanel } from '@/components/reminder-panel';
import { api } from '@/lib/api';
import { EventItem } from '@/lib/types';
import { extractRussianCity, RUSSIAN_CITIES } from '@/lib/russian-cities';
import { Button } from '@/components/ui/button';
import { ReminderButton } from '@/components/reminder-button';
import { ImportantDatesMiniStrip } from '@/components/important-dates-mini-strip';

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
type TopicPreset = {
  value: string;
  label: string;
  cardLabel: string;
  icon: string;
  aliases: string[];
};

const topicPresets: TopicPreset[] = [
  { value: '54-ФЗ', label: '54-ФЗ', cardLabel: '54-ФЗ', icon: '🧾', aliases: ['54-фз', '54 фз', 'фискаль', 'чек', 'ккт'] },
  { value: '1С', label: '1С', cardLabel: '1С', icon: '1С', aliases: ['1с', '1 c', '1с:'] },
  { value: 'ОФД', label: 'ОФД', cardLabel: 'ОФД', icon: '☁️', aliases: ['офд', 'оператор фискальных данных'] },
  { value: 'ЕГАИС', label: 'ЕГАИС', cardLabel: 'ЕГАИС', icon: '🍾', aliases: ['егаис'] },
  { value: 'Маркировка', label: 'Маркировка', cardLabel: 'Маркировка', icon: '▥', aliases: ['маркировка', 'честный знак'] },
  { value: 'Кассы', label: 'Кассы', cardLabel: 'Кассы', icon: '🛒', aliases: ['онлайн кассы', 'онлайн-кассы', 'онлайн касса', 'касса', 'кассы'] },
  { value: 'СНО', label: 'СНО', cardLabel: 'СНО', icon: '🧩', aliases: ['сно', 'система налогообложения', 'спецрежим', 'усн', 'осно', 'патент', 'псн', 'нпд'] },
];

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

function eventToSearchText(event: EventItem) {
  return [
    event.title,
    event.descriptionShort,
    event.descriptionFull,
    event.location,
    event.category?.title,
    ...(event.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function eventMatchesTopic(event: EventItem, topic: string) {
  if (topic === 'ALL') return true;
  const normalized = topic.trim().toLowerCase();
  const preset = topicPresets.find((item) => item.value.toLowerCase() === normalized);
  const haystack = eventToSearchText(event);
  if (preset) {
    return preset.aliases.some((alias) => haystack.includes(alias.toLowerCase()));
  }
  return haystack.includes(normalized);
}

function getTopicList(events: EventItem[]) {
  const dynamicTopics = new Set<string>();

  for (const event of events) {
    const categoryTitle = event.category?.title?.trim();
    if (!categoryTitle) continue;
    if (!topicPresets.some((topic) => topic.value.toLowerCase() === categoryTitle.toLowerCase())) {
      dynamicTopics.add(categoryTitle);
    }
  }

  return [...topicPresets.map((item) => item.value), ...Array.from(dynamicTopics)].filter((topic) => !/^telegram$/i.test(topic));
}

function getTopicCount(events: EventItem[], topic: string) {
  return events.filter((event) => eventMatchesTopic(event, topic)).length;
}

function sourceLabel(source: string) {
  if (/^telegram$/i.test(source)) return 'Telegram';
  if (/^max$/i.test(source)) return 'Max';
  return source;
}

function isFreeEvent(event: EventItem) {
  const text = [
    event.title,
    event.descriptionShort,
    event.descriptionFull,
    event.location,
    event.category?.title,
    ...(event.tags || []),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return /бесплат|free|0\s*₽|0\s*руб/.test(text);
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
  icon,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <label className='grid min-w-0 gap-1'>
      <span className='text-sm font-medium text-slate-600'>{label}</span>
      <div className='relative'>
        {icon ? <span className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'>{icon}</span> : null}
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`select-clean ${icon ? 'pl-11' : ''}`}>
          {children}
        </select>
        <ChevronDown className='pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
      </div>
    </label>
  );
}

function CityFilterSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: string[];
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!open) {
      setQuery('');
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    const handlePointerDown = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [open]);

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return options;
    return options.filter((city) => city.toLowerCase().includes(normalized));
  }, [options, query]);

  return (
    <label className='grid min-w-0 gap-1'>
      <span className='text-sm font-medium text-slate-600'>{label}</span>
      <div ref={containerRef} className='relative'>
        <button type='button' onClick={() => setOpen((current) => !current)} className='select-clean pr-11 text-left'>
          {value === 'ALL' ? 'Все города' : value}
        </button>
        <ChevronDown className={`pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 transition ${open ? 'rotate-180' : ''}`} />

        {open ? (
          <div className='absolute left-0 top-[calc(100%+8px)] z-40 w-full overflow-hidden rounded-[18px] border border-[#7CD8B3] bg-white shadow-[0_16px_34px_rgba(15,23,42,0.12)]'>
            <div className='border-b border-[#7CD8B3]/70 p-2'>
              <div className='relative'>
                <Search className='pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  className='h-10 w-full rounded-xl border border-[#7CD8B3] bg-white pl-9 pr-3 text-sm text-slate-700 outline-none transition focus:border-[#2c8d67] focus:ring-4 focus:ring-[#7CD8B3]/30'
                />
              </div>
            </div>

            <div className='max-h-64 overflow-auto py-1'>
              <button
                type='button'
                onClick={() => {
                  onChange('ALL');
                  setOpen(false);
                }}
                className={`flex w-full items-center px-4 py-2 text-left text-sm transition hover:bg-[#eefbf4] ${value === 'ALL' ? 'bg-[#eefbf4] text-[#17191e]' : 'text-slate-700'}`}
              >
                Все города
              </button>

              {filteredOptions.map((city) => (
                <button
                  key={city}
                  type='button'
                  onClick={() => {
                    onChange(city);
                    setOpen(false);
                  }}
                  className={`flex w-full items-center px-4 py-2 text-left text-sm transition hover:bg-[#eefbf4] ${value === city ? 'bg-[#eefbf4] text-[#17191e]' : 'text-slate-700'}`}
                >
                  {city}
                </button>
              ))}

              {filteredOptions.length === 0 ? <div className='px-4 py-3 text-sm text-slate-400'>Город не найден</div> : null}
            </div>
          </div>
        ) : null}
      </div>
    </label>
  );
}

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [highlights, setHighlights] = useState<EventItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
    let cancelled = false;

    const loadCalendarData = async (syncBeforeLoad = false) => {
      try {
        if (syncBeforeLoad) {
          await api.publicSync().catch(() => null);
        }

        const [eventsData, highlightsData] = await Promise.all([api.events(), api.highlights()]);
        if (!cancelled) {
          setEvents(eventsData);
          setHighlights(highlightsData);
        }
      } catch (error) {
        console.error(error);
      }
    };

    const today = new Date();
    setSelectedDate(today);
    loadCalendarData(true);

    const refreshTimer = window.setInterval(() => {
      loadCalendarData(true);
    }, 30 * 60 * 1000);

    return () => {
      cancelled = true;
      window.clearInterval(refreshTimer);
    };
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    api.trackVisit({ anonId: getAnonId(), path: window.location.pathname, source: 'web-app' }).catch(() => undefined);
  }, []);

  const availableCities = useMemo(() => {
    const fromEvents = Array.from(new Set(events.map((item) => extractRussianCity(item.location)).filter((value): value is string => Boolean(value))));
    return fromEvents.filter((value) => RUSSIAN_CITIES.includes(value as (typeof RUSSIAN_CITIES)[number]));
  }, [events]);

  const availableTopics = useMemo(() => getTopicList(events), [events]);
  const availableSources = useMemo(() => Array.from(new Set([...events.map((item) => item.source || 'TELEGRAM'), 'MAX'])), [events]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate(), 23, 59, 59);

    return events.filter((item) => {
      const start = new Date(item.startAt);
      const formatMatches = formatFilter === 'ALL' || item.format === formatFilter;
      const cityMatches = cityFilter === 'ALL' || extractRussianCity(item.location) === cityFilter;
      const topicMatches = eventMatchesTopic(item, topicFilter);
      const sourceMatches = sourceFilter === 'ALL' || (item.source || 'TELEGRAM').toUpperCase() === sourceFilter.toUpperCase();
      const priceMatches = priceFilter === 'ALL' || (priceFilter === 'FREE' ? isFreeEvent(item) : !isFreeEvent(item));
      const importantMatches = !onlyImportant || item.isImportant;
      const periodMatches =
        periodFilter === 'ALL' ||
        (periodFilter === 'TODAY' && sameDay(start, now)) ||
        (periodFilter === 'WEEK' && start >= now && start <= weekEnd) ||
        (periodFilter === 'MONTH' && start >= now && start <= monthEnd);

      return formatMatches && cityMatches && topicMatches && priceMatches && sourceMatches && importantMatches && periodMatches;
    });
  }, [cityFilter, events, formatFilter, onlyImportant, periodFilter, priceFilter, sourceFilter, topicFilter]);

  const filteredHighlights = useMemo(() => {
    const base = filteredEvents.filter((item) => item.isImportant);
    if (base.length >= 10) return base;
    const fallback = highlights.filter((item) => !base.some((event) => event.id === item.id));
    return [...base, ...fallback].slice(0, 10);
  }, [filteredEvents, highlights]);

  const importantEvents = useMemo(() => {
    return [...filteredEvents]
      .filter((item) => item.isImportant)
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt))
      .slice(0, 12);
  }, [filteredEvents]);

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
      free: filteredEvents.filter((item) => isFreeEvent(item)).length,
      offline: filteredEvents.filter((item) => item.format === 'OFFLINE').length,
      city: filteredEvents.length,
    };
  }, [filteredEvents]);

  const compactEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)).slice(0, 12);
  }, [filteredEvents]);

  const topicCards = useMemo(() => {
    return topicPresets.map((topic) => ({ ...topic, count: getTopicCount(events, topic.value) }));
  }, [events]);

  const highlightedTopic = topicFilter === 'ALL' ? 'Все темы' : topicFilter;

  const advancedFiltersPanel = (
    <div className='surface-card p-4'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <div className='icon-chip h-12 w-12'>
            <SlidersHorizontal className='h-5 w-5 text-[#2c2f36]' />
          </div>
          <div>
            <div className='text-sm font-medium text-slate-500'>Фильтры</div>
            <div className='text-lg font-semibold text-[#17191e]'>Формат, город, тема, источник и период</div>
          </div>
        </div>
        <div className='rounded-[14px] border border-[#7CD8B3] bg-white px-3 py-2 text-sm text-slate-500'>
          Текущая тема: {highlightedTopic}<br />
          Найдено событий: {filteredEvents.length}
        </div>
      </div>

      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
        <FilterSelect label='Формат' value={formatFilter} onChange={(value) => setFormatFilter(value as FormatFilter)}>
          {formatOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </FilterSelect>

        <CityFilterSelect label='Город' value={cityFilter} onChange={setCityFilter} options={availableCities} />

        <FilterSelect label='Тема' value={topicFilter} onChange={setTopicFilter}>
          <option value='ALL'>Все темы</option>
          {availableTopics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
        </FilterSelect>

        <FilterSelect label='Источник' value={sourceFilter} onChange={setSourceFilter}>
          <option value='ALL'>Все источники</option>
          {availableSources.map((source) => <option key={source} value={source}>{sourceLabel(source)}</option>)}
        </FilterSelect>

        <FilterSelect label='Период' value={periodFilter} onChange={(value) => setPeriodFilter(value as PeriodFilter)}>
          <option value='ALL'>Все даты</option>
          <option value='TODAY'>Сегодня</option>
          <option value='WEEK'>Неделя</option>
          <option value='MONTH'>Месяц</option>
        </FilterSelect>
      </div>
    </div>
  );

  const modePanel = (
    <div className='rounded-[18px] bg-white p-4 text-black font-semibold'>
      <div className='mb-3 text-sm font-medium text-slate-500'>Режимы отображения</div>
      <div className='grid gap-3 md:grid-cols-2'>
        <Button variant={viewMode === 'SHOWCASE' ? 'dark' : 'secondary'} onClick={() => setViewMode('SHOWCASE')} className='w-full border-[#7CD8B3] bg-[#7CD8B3] shadow-[0_14px_30px_rgba(0,0,0,0.24)] font-medium text-black'>Витрина</Button>
        <Button variant={viewMode === 'COMPACT' ? 'dark' : 'secondary'} onClick={() => setViewMode('COMPACT')} className='w-full border-[#7CD8B3] bg-[#7CD8B3] shadow-[0_14px_30px_rgba(0,0,0,0.24)] font-medium text-black'>Полный режим</Button>
        <Button variant={priceFilter === 'FREE' ? 'dark' : 'secondary'} onClick={() => setPriceFilter((prev) => prev === 'FREE' ? 'ALL' : 'FREE')} className='w-full border-[#7CD8B3] bg-[#7CD8B3] shadow-[0_14px_30px_rgba(0,0,0,0.24)] font-medium text-black'>Только бесплатные</Button>
        <Button variant={onlyImportant ? 'dark' : 'secondary'} onClick={() => setOnlyImportant((prev) => !prev)} className='w-full border-[#7CD8B3] bg-[#7CD8B3] shadow-[0_14px_30px_rgba(0,0,0,0.24)] font-medium text-black'>Только важные</Button>
      </div>
    </div>
  );

  return (
    <main className='min-h-screen bg-black px-4 py-6 lg:px-6 lg:py-8'>
      <div className='page-shell mx-auto max-w-[1500px] px-4 py-5 lg:px-6 lg:py-6'>
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
              <div key={item.label} className='surface-card !bg-white flex items-center gap-3 px-4 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.20)]'>
                <div className='icon-chip h-10 w-10'><Icon className='h-4.5 w-4.5 text-[#2c8d67]' /></div>
                <div>
                  <div className='text-sm text-slate-500'>{item.label}</div>
                  <div className='text-xl font-semibold leading-none text-[#14171c]'>{item.value}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className='container-shell mt-4'>
        {advancedFiltersPanel}
      </section>

      {viewMode === 'SHOWCASE' && (
        <>
          <section id='important-events-section' className='container-shell mt-4'>
            <HighlightCarousel embedded items={filteredHighlights} onOpen={setActiveEvent} />
          </section>

          <section className='container-shell mt-4'>
            <ImportantDatesMiniStrip
              events={importantEvents}
              onSelect={(event) => setSelectedDate(new Date(event.startAt))}
              onOpenAll={() => document.getElementById('important-events-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />
          </section>
        </>
      )}

      {viewMode === 'COMPACT' ? (
        <>
          <section className='container-shell mt-4'>
            {modePanel}
          </section>
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
                  <div key={event.id} className='rounded-[18px] border border-[#e5e7eb] bg-white p-4 text-left transition hover:-translate-y-[1px] hover:shadow-[0_8px_22px_rgba(15,23,42,0.06)]'>
                    <button type='button' onClick={() => setActiveEvent(event)} className='w-full text-left'>
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
                          {event.isImportant ? <span className='rounded-full bg-black px-3 py-1 text-xs font-semibold text-white'>Важное</span> : null}
                        </div>
                      </div>
                    </button>
                    <div className='mt-4 flex flex-wrap gap-3'>
                      <Button variant='secondary' onClick={() => setActiveEvent(event)} className='px-4 py-2'>Подробнее</Button>
                      <ReminderButton event={event} variant='primary' className='px-4 py-2' />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : (
        <section className='container-shell mt-4'>
          <EventsCalendarBoard events={filteredEvents} selectedDate={selectedDate} onSelectDate={setSelectedDate} filtersPanel={modePanel} />
        </section>
      )}

      <section className='container-shell mt-4'>
        <div className='surface-card p-4'>
          <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4'>
            {topicCards.map((topic) => (
              <button
                key={topic.value}
                type='button'
                onClick={() => setTopicFilter(topic.value)}
                className={`flex min-h-[84px] min-w-0 items-center gap-3 rounded-[18px] border px-4 py-3 text-left transition hover:-translate-y-[1px] hover:shadow-[0_8px_22px_rgba(15,23,42,0.06)] ${topicFilter === topic.value ? 'border-[#7CD8B3] bg-black text-white' : 'border-[#7CD8B3] bg-white text-black font-semibold'}`}
              >
                <div className={`flex h-10 w-10 flex-none items-center justify-center rounded-full text-[20px] ${topicFilter === topic.value ? 'bg-white/15 text-white' : 'bg-[#eefbf4] text-[#2a8f68]'}`}>
                  {topic.icon}
                </div>
                <div className='min-w-0'>
                  <div className='text-[16px] font-medium leading-tight break-words'>{topic.cardLabel}</div>
                  <div className={`text-xs ${topicFilter === topic.value ? 'text-white/72' : 'text-slate-500'}`}>{topic.count} мероприятий</div>
                </div>
              </button>
            ))}
            <button
              type='button'
              onClick={() => setTopicFilter('ALL')}
              className={`flex min-h-[84px] min-w-0 items-center justify-center gap-3 rounded-[18px] border px-4 py-3 text-center transition hover:-translate-y-[1px] hover:shadow-[0_8px_22px_rgba(15,23,42,0.06)] ${topicFilter === 'ALL' ? 'border-[#7CD8B3] bg-black text-white' : 'border-[#7CD8B3] bg-white text-black font-semibold'}`}
            >
              <Layers3 className='h-5 w-5 flex-none' />
              <span className='text-sm font-medium'>Все подборки</span>
            </button>
          </div>
        </div>
      </section>

      <section className='container-shell mt-4'>
        <ReminderPanel />
      </section>

      <EventModal item={activeEvent} open={!!activeEvent} onOpenChange={(open) => !open && setActiveEvent(null)} />
      </div>
    </main>
  );
}
