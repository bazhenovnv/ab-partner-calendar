'use client';

import Image from 'next/image';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { api } from '@/lib/api';
import type { EventItem } from '@/lib/types';
import { extractRussianCity, RUSSIAN_CITIES } from '@/lib/russian-cities';
import {
  compareCompletedEvents,
  compareUpcomingEvents,
  isCompletedEvent,
  isRecentlyCompletedEvent,
} from '@/lib/event-utils';
import { SiteHeader } from './site-header';
import { HighlightCarousel } from './highlight-carousel';
import { EventsCalendarBoard } from './events-calendar-board';
import { EventModal } from './event-modal';
import { ReminderPanel } from './reminder-panel';
import { ReminderButton } from './reminder-button';
import { CompactEventsList } from './compact-events-list';
import { Button } from './ui/button';

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
  cardLabel: string;
  icon: string;
  iconSrc?: string;
  aliases: string[];
};

const topicPresets: TopicPreset[] = [
  { value: '54-ФЗ', cardLabel: '54-ФЗ', icon: '🧾', iconSrc: '/ui-icons/54fz.png', aliases: ['54-фз', '54 фз', 'фискаль', 'чек', 'ккт'] },
  { value: '1С', cardLabel: '1С', icon: '1С', iconSrc: '/ui-icons/1c.png', aliases: ['1с', '1 c', '1с:'] },
  { value: 'ОФД', cardLabel: 'ОФД', icon: '☁️', iconSrc: '/ui-icons/ofd.png', aliases: ['офд', 'оператор фискальных данных'] },
  { value: 'НДС', cardLabel: 'НДС', icon: 'НДС', iconSrc: '/ui-icons/nds.png', aliases: ['ндс', 'налог на добавленную стоимость'] },
  { value: 'ЕГАИС', cardLabel: 'ЕГАИС', icon: '🍾', iconSrc: '/ui-icons/egais.png', aliases: ['егаис'] },
  { value: 'Маркировка', cardLabel: 'Маркировка', icon: '▥', iconSrc: '/ui-icons/markirovka.png', aliases: ['маркировка', 'честный знак'] },
  { value: 'Кассы', cardLabel: 'Кассы', icon: '🛒', iconSrc: '/ui-icons/kassy.png', aliases: ['онлайн кассы', 'онлайн-кассы', 'онлайн касса', 'касса', 'кассы'] },
  { value: 'СНО', cardLabel: 'СНО', icon: '🧩', iconSrc: '/ui-icons/sno.png', aliases: ['сно', 'система налогообложения', 'спецрежим', 'усн', 'осно', 'патент', 'псн', 'нпд'] },
  {
    value: 'Налоги',
    cardLabel: 'Налоги',
    icon: '₽',
    iconSrc: '/ui-icons/nalogi.png',
    aliases: ['налог', 'налоги', 'налогов', 'налоговый', 'налоговая', 'налоговые', 'фнс', 'ифнс', 'ндс', 'ндфл', 'прибыль', 'имущество', 'страховые взносы', 'взносы', 'енс', 'енп', 'декларация', 'отчетность', 'камеральная', 'камеральные', 'проверка', 'проверки', 'доначисления', 'усн', 'осно'],
  },
];

function sameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
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
  return preset ? preset.aliases.some((alias) => haystack.includes(alias.toLowerCase())) : haystack.includes(normalized);
}

function getTopicList(events: EventItem[]) {
  const dynamicTopics = new Set<string>();
  for (const event of events) {
    const category = event.category?.title?.trim();
    if (!category) continue;
    if (!topicPresets.some((topic) => topic.value.toLowerCase() === category.toLowerCase())) dynamicTopics.add(category);
  }
  return [...topicPresets.map((item) => item.value), ...Array.from(dynamicTopics)].filter((topic) => !/^telegram$/i.test(topic));
}

function isCounterActiveEvent(event: EventItem) {
  const status = event.runtimeStatus || event.status;
  return status === 'SCHEDULED' || status === 'LIVE';
}

function sourceLabel(source: string) {
  if (/^telegram$/i.test(source)) return 'Telegram';
  if (/^max$/i.test(source)) return 'Max';
  return source;
}

function isFreeEvent(event: EventItem) {
  return /бесплат|free|0\s*₽|0\s*руб/.test(eventToSearchText(event));
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <label className='grid min-w-0 gap-1'>
      <span className='text-sm font-medium text-slate-600'>{label}</span>
      <div className='relative'>
        <select value={value} onChange={(event) => onChange(event.target.value)} className={`select-clean ${value !== 'ALL' ? 'select-clean--active' : ''}`}>
          {children}
        </select>
        <ChevronDown className='pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400' />
      </div>
    </label>
  );
}

export function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [highlights, setHighlights] = useState<EventItem[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [calendarViewDate, setCalendarViewDate] = useState(new Date());
  const [activeModalEvent, setActiveModalEvent] = useState<EventItem | null>(null);
  const [formatFilter, setFormatFilter] = useState<FormatFilter>('ALL');
  const [cityFilter, setCityFilter] = useState('ALL');
  const [topicFilter, setTopicFilter] = useState('ALL');
  const [priceFilter, setPriceFilter] = useState<PriceFilter>('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('ALL');
  const [onlyImportant, setOnlyImportant] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('SHOWCASE');
  const [didAutoSelect, setDidAutoSelect] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        const [eventItems, highlightItems] = await Promise.all([api.events(), api.highlights()]);
        if (!cancelled) {
          setEvents(eventItems);
          setHighlights(highlightItems);
        }
      } catch (error) {
        console.error(error);
      }
    };

    load();
    const timer = window.setInterval(load, 30 * 60 * 1000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  useEffect(() => {
    api.trackVisit({ anonId: getAnonId(), path: window.location.pathname, source: 'web-app' }).catch(() => undefined);
  }, []);

  useEffect(() => {
    if (didAutoSelect || events.length === 0) return;
    const sorted = [...events].filter((event) => !Number.isNaN(+new Date(event.startAt))).sort(compareUpcomingEvents);
    const first = sorted.find((event) => !isCompletedEvent(event)) ?? sorted[0];
    if (first) {
      const date = new Date(first.startAt);
      setSelectedDate(date);
      setCalendarViewDate(date);
      setSelectedEventId(first.id);
    }
    setDidAutoSelect(true);
  }, [didAutoSelect, events]);

  const availableCities = useMemo(() => {
    const fromEvents = Array.from(new Set(events.map((event) => extractRussianCity(event.location)).filter((value): value is string => Boolean(value))));
    return fromEvents.filter((value) => RUSSIAN_CITIES.includes(value as (typeof RUSSIAN_CITIES)[number]));
  }, [events]);

  const availableTopics = useMemo(() => getTopicList(events), [events]);
  const availableSources = useMemo(() => Array.from(new Set([...events.map((event) => event.source || 'MAX'), 'MAX'])), [events]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate(), 23, 59, 59);

    return events.filter((event) => {
      const start = new Date(event.startAt);
      return (
        (formatFilter === 'ALL' || event.format === formatFilter) &&
        (cityFilter === 'ALL' || extractRussianCity(event.location) === cityFilter) &&
        eventMatchesTopic(event, topicFilter) &&
        (sourceFilter === 'ALL' || (event.source || 'MAX').toUpperCase() === sourceFilter.toUpperCase()) &&
        (priceFilter === 'ALL' || (priceFilter === 'FREE' ? isFreeEvent(event) : !isFreeEvent(event))) &&
        (!onlyImportant || event.isImportant) &&
        (periodFilter === 'ALL' ||
          (periodFilter === 'TODAY' && sameDay(start, now)) ||
          (periodFilter === 'WEEK' && start >= now && start <= weekEnd) ||
          (periodFilter === 'MONTH' && start >= now && start <= monthEnd))
      );
    });
  }, [cityFilter, events, formatFilter, onlyImportant, periodFilter, priceFilter, sourceFilter, topicFilter]);

  const filteredCounterEvents = useMemo(() => filteredEvents.filter(isCounterActiveEvent), [filteredEvents]);
  const filteredHighlights = useMemo(() => {
    const selected = filteredEvents.filter((event) => event.isImportant);
    const fallback = highlights.filter((event) => !selected.some((item) => item.id === event.id));
    return [...selected, ...fallback];
  }, [filteredEvents, highlights]);

  const compactEvents = useMemo(() => {
    const upcoming = filteredEvents.filter((event) => !isCompletedEvent(event)).sort(compareUpcomingEvents);
    const completed = filteredEvents.filter(isRecentlyCompletedEvent).sort(compareCompletedEvents);
    return [...upcoming, ...completed].slice(0, 12);
  }, [filteredEvents]);

  const metrics = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return {
      today: filteredCounterEvents.filter((event) => sameDay(new Date(event.startAt), now)).length,
      week: filteredCounterEvents.filter((event) => new Date(event.startAt) >= now && new Date(event.startAt) <= weekEnd).length,
      important: filteredCounterEvents.filter((event) => event.isImportant).length,
      free: filteredCounterEvents.filter(isFreeEvent).length,
      offline: filteredCounterEvents.filter((event) => event.format === 'OFFLINE').length,
      city: filteredCounterEvents.length,
    };
  }, [filteredCounterEvents]);

  const topicCards = useMemo(() => topicPresets.map((topic) => ({ ...topic, count: events.filter(isCounterActiveEvent).filter((event) => eventMatchesTopic(event, topic.value)).length })), [events]);

  const selectImportantEvent = useCallback((event: EventItem) => {
    const date = new Date(event.startAt);
    setSelectedDate(date);
    setCalendarViewDate(date);
    setSelectedEventId(event.id);
    window.setTimeout(() => document.querySelector('.dashboard-calendar-wrap')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 0);
  }, []);

  const viewModeControls = (
    <>
      <Button variant='primary' onClick={() => setViewMode('SHOWCASE')} className={`important-mode-btn w-full ${viewMode === 'SHOWCASE' ? 'important-mode-btn-active' : ''}`}>Витрина</Button>
      <Button variant='primary' onClick={() => setViewMode('COMPACT')} className={`important-mode-btn w-full ${viewMode === 'COMPACT' ? 'important-mode-btn-active' : ''}`}>Компактный режим</Button>
    </>
  );

  const advancedFilters = (
    <div className='surface-card p-4'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-4'>
        <div className='flex items-center gap-3'>
          <div className='icon-chip h-12 w-12'><SlidersHorizontal className='h-5 w-5 text-[#2c2f36]' /></div>
          <div><div className='text-sm font-medium text-slate-500'>Фильтры</div><div className='text-lg font-semibold text-[#17191e]'>Формат, город, тема, источник и период</div></div>
        </div>
        <div className='rounded-[14px] border border-[#7CD8B3] bg-white px-3 py-2 text-sm text-slate-500'>Текущая тема: {topicFilter === 'ALL' ? 'Все темы' : topicFilter}<br />Найдено событий: {filteredCounterEvents.length}</div>
      </div>
      <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-5'>
        <FilterSelect label='Формат' value={formatFilter} onChange={(value) => setFormatFilter(value as FormatFilter)}>{formatOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</FilterSelect>
        <FilterSelect label='Город' value={cityFilter} onChange={setCityFilter}><option value='ALL'>Все города</option>{availableCities.map((city) => <option key={city} value={city}>{city}</option>)}</FilterSelect>
        <FilterSelect label='Тема' value={topicFilter} onChange={setTopicFilter}><option value='ALL'>Все темы</option>{availableTopics.map((topic) => <option key={topic} value={topic}>{topic}</option>)}</FilterSelect>
        <FilterSelect label='Источник' value={sourceFilter} onChange={setSourceFilter}><option value='ALL'>Все источники</option>{availableSources.map((source) => <option key={source} value={source}>{sourceLabel(source)}</option>)}</FilterSelect>
        <FilterSelect label='Период' value={periodFilter} onChange={(value) => setPeriodFilter(value as PeriodFilter)}><option value='ALL'>Все даты</option><option value='TODAY'>Сегодня</option><option value='WEEK'>Неделя</option><option value='MONTH'>Месяц</option></FilterSelect>
      </div>
    </div>
  );

  const calendarQuickFilters = (
    <>
      <Button variant='primary' onClick={() => setPriceFilter((value) => value === 'FREE' ? 'ALL' : 'FREE')} className={`calendar-filter-toggle w-full ${priceFilter === 'FREE' ? 'calendar-filter-toggle-active' : ''}`}>Только бесплатные</Button>
      <Button variant='primary' onClick={() => setOnlyImportant((value) => !value)} className={`calendar-filter-toggle w-full ${onlyImportant ? 'calendar-filter-toggle-active' : ''}`}>Только важные</Button>
    </>
  );

  const topicButtons = (
    <div className='calendar-topic-panel p-0'>
      <div className='calendar-topic-panel-title'>ПОДБОРКИ</div>
      <div className='grid gap-3 md:grid-cols-3'>
        {topicCards.map((topic) => (
          <button key={topic.value} type='button' onClick={() => setTopicFilter(topic.value)} className={`topic-filter-button flex min-h-[92px] min-w-0 items-center gap-4 rounded-[18px] px-4 py-3 text-left ${topicFilter === topic.value ? 'topic-filter-button-active' : ''}`}>
            <div className='topic-filter-icon flex h-11 w-11 flex-none items-center justify-center rounded-full bg-[#eefbf4] text-[17px] text-[#2a8f68]'>
              {topic.iconSrc ? <Image src={topic.iconSrc} alt='' width={32} height={32} className='topic-filter-image' /> : topic.icon}
            </div>
            <div className='topic-filter-copy min-w-0'><div className='topic-filter-title'>{topic.cardLabel}</div><div className='topic-count-number'>{topic.count}</div></div>
          </button>
        ))}
        <button type='button' onClick={() => setTopicFilter('ALL')} className={`topic-filter-button flex min-h-[92px] min-w-0 items-center justify-center gap-3 rounded-[18px] px-4 py-3 text-center ${topicFilter === 'ALL' ? 'topic-filter-button-active' : ''}`}>
          <Image src='/ui-icons/all-collections.png' alt='' width={32} height={32} className='topic-filter-image flex-none' /><span className='topic-filter-title'>Все подборки</span>
        </button>
      </div>
    </div>
  );

  return (
    <main className='min-h-screen bg-black px-4 py-6 lg:px-6 lg:py-8'>
      <div className='page-shell mx-auto max-w-[1500px] px-4 py-5 lg:px-6 lg:py-6'>
        <SiteHeader />
        <section className='container-shell mt-4'>
          <div className='metrics-grid grid gap-3 md:grid-cols-2 xl:grid-cols-6'>
            {[
              { label: 'Сегодня', value: metrics.today, icon: '/ui-icons/metric-today.png' },
              { label: 'На 7 дней', value: metrics.week, icon: '/ui-icons/metric-week.png' },
              { label: 'Важно', value: metrics.important, icon: '/ui-icons/metric-important.png' },
              { label: 'Бесплатно', value: metrics.free, icon: '/ui-icons/metric-free.png' },
              { label: 'Оффлайн', value: metrics.offline, icon: '/ui-icons/metric-offline.png' },
              { label: cityFilter === 'ALL' ? 'По всем городам' : cityFilter, value: metrics.city, icon: '/ui-icons/metric-cities.png' },
            ].map((item) => <div key={item.label} className='metric-card surface-card !bg-white flex items-center gap-3 px-4 py-3'><div className='metric-icon icon-chip h-10 w-10'><Image src={item.icon} alt='' width={40} height={40} className='metric-icon-image' /></div><div><div className='text-sm text-slate-500'>{item.label}</div><div className='text-xl font-semibold leading-none text-[#14171c]'>{item.value}</div></div></div>)}
          </div>
        </section>

        {viewMode === 'SHOWCASE' ? (
          <section className='container-shell mt-4'>
            <HighlightCarousel embedded items={filteredHighlights} onSelectEvent={selectImportantEvent} controls={viewModeControls} />
          </section>
        ) : null}

        {viewMode === 'COMPACT' ? (
          <>
            <section className='container-shell mt-4'>{advancedFilters}</section>
            <section className='container-shell mt-4'><div className='surface-card p-4'><div className='mb-3 text-sm font-medium text-slate-500'>Режимы отображения</div><div className='grid gap-3 md:grid-cols-2'>{viewModeControls}</div></div></section>
            <section className='container-shell mt-4'><div className='compact-events-panel surface-card p-5'><div className='mb-4 flex items-center justify-between gap-4'><div><div className='text-sm font-medium text-slate-500'>Компактный режим</div><div className='text-2xl font-semibold text-[#17191e]'>Быстрый список событий</div></div><div className='text-sm text-slate-500'>Сначала ближайшие запланированные, затем свежие проведенные</div></div><CompactEventsList events={compactEvents} onOpen={setActiveModalEvent} /></div></section>
          </>
        ) : (
          <section className='container-shell mt-4'>
            <div className='dashboard-unified-shell'>
              <div className='dashboard-filters-wrap'>{advancedFilters}</div>
              <div className='dashboard-calendar-wrap'>
                <EventsCalendarBoard
                  events={filteredEvents}
                  selectedDate={selectedDate}
                  selectedEventId={selectedEventId}
                  onSelectDate={setSelectedDate}
                  onSelectEventId={setSelectedEventId}
                  onMonthChange={setCalendarViewDate}
                  calendarControls={calendarQuickFilters}
                  filtersPanel={topicButtons}
                />
              </div>
            </div>
          </section>
        )}

        <footer className='container-shell mt-4'><div className='platform-footer-shell'><div className='platform-footer-title'>Возможности с платформой:</div><ReminderPanel /><div className='platform-footer-copy'>Отдел по работе с партнерами 2022–{new Date().getFullYear()}</div></div></footer>
        <EventModal item={activeModalEvent} open={!!activeModalEvent} onOpenChange={(open) => !open && setActiveModalEvent(null)} />
      </div>
    </main>
  );
}
