'use client';

import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { CalendarRange, ChevronDown, Flame, MapPin, MonitorPlay, RadioTower, SlidersHorizontal, Sparkles, Ticket, Users } from 'lucide-react';
import { SiteHeader } from '@/components/site-header';
import { HighlightCarousel } from '@/components/highlight-carousel';
import { ImportantDatesMiniStrip } from '@/components/important-dates-mini-strip';
import { EventsCalendarBoard } from '@/components/events-calendar-board';
import { EventModal } from '@/components/event-modal';
import { api } from '@/lib/api';
import { EventItem } from '@/lib/types';
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
type TopicPreset = { value: string; label: string; cardLabel: string; icon: string; aliases: string[] };

const topicPresets: TopicPreset[] = [
  { value: '54-ФЗ', label: '54-ФЗ', cardLabel: '54-ФЗ', icon: '🧾', aliases: ['54-фз', '54 фз', 'фискаль', 'чек', 'ккт'] },
  { value: '1С', label: '1С', cardLabel: '1С', icon: '1С', aliases: ['1с', '1 c', '1с:'] },
  { value: 'ОФД', label: 'ОФД', cardLabel: 'ОФД', icon: '☁️', aliases: ['офд', 'оператор фискальных данных'] },
  { value: 'СНО', label: 'СНО', cardLabel: 'СНО', icon: 'Σ', aliases: ['сно', 'система налогообложения', 'налоговый режим', 'усн', 'осн', 'патент'] },
  { value: 'ЕГАИС', label: 'ЕГАИС', cardLabel: 'ЕГАИС', icon: '🍾', aliases: ['егаис'] },
  { value: 'Маркировка', label: 'Маркировка', cardLabel: 'Маркировка', icon: '▥', aliases: ['маркировка', 'честный знак'] },
  { value: 'Кассы', label: 'Кассы', cardLabel: 'Кассы', icon: '🛒', aliases: ['онлайн кассы', 'онлайн-кассы', 'онлайн касса', 'касса', 'кассы'] },
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
  return [event.title, event.descriptionShort, event.descriptionFull, event.location, event.category?.title, ...(event.tags || [])]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}

function eventMatchesTopic(event: EventItem, topic: string) {
  if (topic === 'ALL') return true;
  const normalized = topic.trim().toLowerCase();
  const preset = topicPresets.find((item) => item.value.toLowerCase() === normalized);
  const haystack = eventToSearchText(event);
  if (preset) return preset.aliases.some((alias) => haystack.includes(alias.toLowerCase()));
  return haystack.includes(normalized);
}

function getTopicList(events: EventItem[]) {
  const dynamicTopics = new Set<string>();
  for (const event of events) {
    const categoryTitle = event.category?.title?.trim();
    if (!categoryTitle) continue;
    if (!topicPresets.some((topic) => topic.value.toLowerCase() === categoryTitle.toLowerCase())) {
      if (!/telegram/i.test(categoryTitle)) dynamicTopics.add(categoryTitle);
    }
  }
  return [...topicPresets.map((item) => item.value), ...Array.from(dynamicTopics)];
}

function getTopicCount(events: EventItem[], topic: string) {
  return events.filter((event) => eventMatchesTopic(event, topic)).length;
}

function normalizeSource(value?: string) {
  const source = (value || 'TELEGRAM').trim();
  if (/max/i.test(source)) return 'MAX';
  if (/telegram|телеграм/i.test(source)) return 'TELEGRAM';
  return source.toUpperCase();
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
  children: ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <label className='grid min-w-0 gap-1'>
      <span className='text-sm font-medium text-black'>{label}</span>
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

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [highlights, setHighlights] = useState<EventItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeEvent, setActiveEvent] = useState<EventItem | null>(null);
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('ALL');
  const [cityFilter, setCityFilter] = useState<string>('ALL');
  const [citySearch, setCitySearch] = useState('');
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
        if (syncBeforeLoad) await api.publicSync().catch(() => null);
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
    const refreshTimer = window.setInterval(() => loadCalendarData(true), 30 * 60 * 1000);
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
    const fromEvents = events.map((item) => extractRussianCity(item.location)).filter(Boolean) as string[];
    return RUSSIAN_CITIES.filter((value, index, arr) => arr.indexOf(value) === index && fromEvents.includes(value)).filter((city) => city.toLowerCase() !== 'онлайн');
  }, [events]);

  const filteredCityOptions = useMemo(() => {
    const q = citySearch.trim().toLowerCase();
    if (!q) return availableCities;
    return availableCities.filter((city) => city.toLowerCase().includes(q));
  }, [availableCities, citySearch]);

  const availableTopics = useMemo(() => getTopicList(events).filter((topic) => !/telegram/i.test(topic)), [events]);
  const availableSources = useMemo(() => {
    const set = new Set(events.map((item) => normalizeSource(item.source)));
    set.add('TELEGRAM');
    set.add('MAX');
    return Array.from(set).filter(Boolean);
  }, [events]);

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
      const sourceMatches = sourceFilter === 'ALL' || normalizeSource(item.source) === sourceFilter;
      const importantMatches = !onlyImportant || item.isImportant;
      const periodMatches =
        periodFilter === 'ALL'
        || (periodFilter === 'TODAY' && sameDay(start, now))
        || (periodFilter === 'WEEK' && start >= now && start <= weekEnd)
        || (periodFilter === 'MONTH' && start >= now && start <= monthEnd);

      return formatMatches && cityMatches && topicMatches && priceMatches && sourceMatches && importantMatches && periodMatches;
    });
  }, [events, formatFilter, cityFilter, topicFilter, priceFilter, sourceFilter, onlyImportant, periodFilter]);

  const filteredHighlights = useMemo(() => highlights.filter((item) => filteredEvents.some((event) => event.id === item.id)), [highlights, filteredEvents]);

  const importantMonthEvents = useMemo(() => {
    const base = selectedDate || new Date();
    const today = new Date();
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    return [...events]
      .filter((event) => event.isImportant)
      .filter((event) => {
        const date = new Date(event.startAt);
        return date.getFullYear() === base.getFullYear() && date.getMonth() === base.getMonth() && date >= todayStart;
      })
      .sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt));
  }, [events, selectedDate]);

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

  const compactEvents = useMemo(() => [...filteredEvents].sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)).slice(0, 12), [filteredEvents]);
  const topicCards = useMemo(() => topicPresets.map((topic) => ({ ...topic, count: getTopicCount(events, topic.value) })), [events]);
  const highlightedTopic = topicFilter === 'ALL' ? 'Все темы' : topicFilter;

  const advancedFiltersPanel = (
    <div className='surface-card p-4'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <div className='icon-chip h-12 w-12'><SlidersHorizontal className='h-5 w-5 text-[#2c2f36]' /></div>
          <div>
            <div className='text-sm font-medium text-black'>Фильтры</div>
            <div className='text-lg font-semibold text-black'>Формат, город, тема, источник и период</div>
          </div>
        </div>
        <div className='rounded-[14px] border border-[#7CD8B3] bg-white px-3 py-2 text-sm text-slate-600'>
          Текущая тема: {highlightedTopic}<br />
          Найдено событий: {filteredEvents.length}
        </div>
      </div>

      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
        <FilterSelect label='Формат' value={formatFilter} onChange={(value) => setFormatFilter(value as FormatFilter)} icon={<MonitorPlay className='h-4 w-4' />}>
          {formatOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </FilterSelect>

        <div className='grid min-w-0 gap-1'>
          <span className='text-sm font-medium text-black'>Город</span>
          <input
            value={citySearch}
            onChange={(e) => setCitySearch(e.target.value)}
            className='mb-2 h-9 rounded-xl border border-[#7CD8B3] bg-white px-3 text-sm text-black outline-none'
            placeholder='Поиск города'
          />
          <div className='relative'>
            <span className='pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400'><MapPin className='h-4 w-4' /></span>
            <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)} className='select-clean pl-11'>
              <option value='ALL'>Все города</option>
              {filteredCityOptions.map((city) => <option key={city} value={city}>{city}</option>)}
            </select>
            <ChevronDown className='pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
          </div>
        </div>

        <FilterSelect label='Тема' value={topicFilter} onChange={setTopicFilter}>
          <option value='ALL'>Все темы</option>
          {availableTopics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}
        </FilterSelect>

        <FilterSelect label='Источник' value={sourceFilter} onChange={setSourceFilter} icon={<RadioTower className='h-4 w-4' />}>
          <option value='ALL'>Все источники</option>
          {availableSources.map((source) => <option key={source} value={source}>{source === 'TELEGRAM' ? 'Telegram' : source === 'MAX' ? 'Max' : source}</option>)}
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
    <div className='rounded-[18px] bg-white p-4 text-black'>
      <div className='mb-3 text-sm font-medium text-black'>Режимы отображения</div>
      <div className='grid gap-3 md:grid-cols-2'>
        <Button variant={viewMode === 'SHOWCASE' ? 'dark' : 'secondary'} onClick={() => setViewMode('SHOWCASE')} className='w-full border-black bg-[#7CD8B3] text-black'>Витрина</Button>
        <Button variant={viewMode === 'COMPACT' ? 'dark' : 'secondary'} onClick={() => setViewMode('COMPACT')} className='w-full border-black bg-[#7CD8B3] text-black'>Полный режим</Button>
        <Button variant={priceFilter === 'FREE' ? 'dark' : 'secondary'} onClick={() => setPriceFilter((prev) => prev === 'FREE' ? 'ALL' : 'FREE')} className='w-full border-black bg-[#7CD8B3] text-black'>Только бесплатные</Button>
        <Button variant={onlyImportant ? 'dark' : 'secondary'} onClick={() => setOnlyImportant((prev) => !prev)} className='w-full border-black bg-[#7CD8B3] text-black'>Только важные</Button>
      </div>
      <div className='mt-2 flex justify-center rounded-[22px] border border-[#7CD8B3] bg-white p-3 shadow-[0_18px_42px_rgba(0,0,0,0.18)]'>
        <img src='/calendar-sticker-note.png' alt='Меньше хаоса — больше пользы' className='h-auto w-full max-w-[320px] object-contain' />
      </div>
    </div>
  );

  return (
    <main className='min-h-screen bg-black px-3 py-5 lg:px-5 lg:py-7'>
      <div className='page-shell mx-auto max-w-[1520px] rounded-[34px] bg-white px-3 py-4 shadow-[0_36px_100px_rgba(0,0,0,0.58)] lg:px-5 lg:py-5'>
        <SiteHeader />

        <section className='container-shell mt-4'>
          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-6'>
            {[
              { label: 'Сегодня', value: metrics.today, icon: CalendarRange },
              { label: 'Неделя', value: metrics.week, icon: Users },
              { label: 'Важно', value: metrics.important, icon: Sparkles },
              { label: 'Бесплатно', value: metrics.free, icon: Ticket },
              { label: 'Оффлайн', value: metrics.offline, icon: MapPin },
              { label: cityFilter === 'ALL' ? 'По всем городам' : cityFilter, value: metrics.city, icon: Flame },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className='surface-card flex items-center gap-3 px-4 py-3 shadow-[0_18px_42px_rgba(0,0,0,0.20)]'>
                  <div className='icon-chip h-10 w-10'><Icon className='h-5 w-5 text-[#2c8d67]' /></div>
                  <div>
                    <div className='text-xs text-slate-500'>{item.label}</div>
                    <div className='text-xl font-semibold text-black'>{item.value}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        <section className='container-shell mt-4'>{advancedFiltersPanel}</section>

        {viewMode === 'SHOWCASE' && (
          <>
            <section className='container-shell mt-4'>
              <HighlightCarousel embedded items={filteredHighlights} onOpen={setActiveEvent} />
            </section>
            <section className='container-shell mt-4'>
              <ImportantDatesMiniStrip
                events={importantMonthEvents}
                selectedDate={selectedDate}
                onSelect={(event) => setSelectedDate(new Date(event.startAt))}
                onOpenAll={() => document.getElementById('important-events-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              />
            </section>
          </>
        )}

        {viewMode === 'COMPACT' ? (
          <>
            <section className='container-shell mt-4'>{modePanel}</section>
            <section className='container-shell mt-4'>
              <div className='surface-card p-5'>
                <div className='mb-4 flex items-center justify-between gap-4'>
                  <div>
                    <div className='text-sm font-medium text-slate-500'>Компактный режим</div>
                    <div className='text-2xl font-semibold text-black'>Быстрый список событий</div>
                  </div>
                  <div className='text-sm text-slate-500'>Без лишней графики, только ближайшие события</div>
                </div>
                <div className='grid gap-3'>
                  {compactEvents.map((event) => (
                    <div key={event.id} className='rounded-[18px] border border-[#7CD8B3] bg-white p-4 text-left transition hover:-translate-y-[1px] hover:shadow-[0_8px_22px_rgba(15,23,42,0.10)]'>
                      <button type='button' onClick={() => setActiveEvent(event)} className='w-full text-left'>
                        <div className='flex flex-wrap items-center justify-between gap-3'>
                          <div>
                            <div className='text-lg font-semibold text-black'>{event.title}</div>
                            <div className='mt-1 text-sm text-slate-500'>{new Date(event.startAt).toLocaleString('ru-RU')} · {event.location || 'Локация уточняется'}</div>
                          </div>
                          <span className='rounded-full border border-[#7CD8B3] bg-[#eefbf4] px-3 py-1 text-xs font-medium text-[#2c8d67]'>{event.format}</span>
                        </div>
                      </button>
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
            <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
              <div>
                <div className='text-sm font-medium text-slate-500'>Фильтры по направлениям</div>
                <div className='text-lg font-semibold text-black'>Выберите тему события</div>
              </div>
              <Button variant='secondary' onClick={() => setTopicFilter('ALL')} className='border-black'>Сбросить тему</Button>
            </div>
            <div className='grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7'>
              {topicCards.map((topic) => (
                <button
                  key={topic.value}
                  type='button'
                  onClick={() => setTopicFilter(topic.value)}
                  className={`rounded-[18px] border px-3 py-3 text-left transition hover:-translate-y-[1px] ${topicFilter === topic.value ? 'border-black bg-[#7CD8B3] text-black shadow-[0_12px_26px_rgba(0,0,0,0.18)]' : 'border-[#7CD8B3] bg-white text-black'}`}
                >
                  <div className='flex items-center gap-2'>
                    <span className='icon-chip h-9 w-9 border-[#7CD8B3]'>{topic.icon}</span>
                    <span className='font-semibold'>{topic.cardLabel}</span>
                  </div>
                  <div className='mt-2 text-xs text-slate-500'>{topic.count} событий</div>
                </button>
              ))}
            </div>
          </div>
        </section>

        <EventModal item={activeEvent} open={!!activeEvent} onOpenChange={(open) => !open && setActiveEvent(null)} />
      </div>
    </main>
  );
}
