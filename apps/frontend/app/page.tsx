'use client';

import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronDown, Flame, Layers3, MapPin, SlidersHorizontal, Sparkles, Ticket, Users } from 'lucide-react';
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
  {
    value: 'Налоги',
    label: 'Налоги',
    cardLabel: 'Налоги',
    icon: '₽',
    aliases: [
      'налог',
      'налоги',
      'налогов',
      'налоговый',
      'налоговая',
      'налоговые',
      'фнс',
      'ифнс',
      'ндс',
      'ндфл',
      'прибыль',
      'имущество',
      'страховые взносы',
      'взносы',
      'енс',
      'енп',
      'декларация',
      'отчетность',
      'камеральная',
      'камеральные',
      'проверка',
      'проверки',
      'доначисления',
      'усн',
      'осно',
    ],
  },
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
        <select value={value} onChange={(e) => onChange(e.target.value)} className={`select-clean ${value !== 'ALL' ? 'select-clean--active' : ''} ${icon ? 'pl-11' : ''}`}>
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
  return (
    <FilterSelect label={label} value={value} onChange={onChange}>
      <option value='ALL'>Все города</option>
      {options.map((city) => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </FilterSelect>
  );
}

export default function HomePage() {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [highlights, setHighlights] = useState<EventItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [calendarViewDate, setCalendarViewDate] = useState<Date>(new Date());

  const currentMonthImportantEvents = useMemo(() => {
    const month = calendarViewDate.getMonth();
    const year = calendarViewDate.getFullYear();

    return events
      .filter((item) => {
        if (!item.isImportant) return false;
        const startDate = new Date(item.startAt);
        if (Number.isNaN(startDate.getTime())) return false;
        return startDate.getMonth() === month && startDate.getFullYear() === year;
      })
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
  }, [events, calendarViewDate]);
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

  const filteredCounterEvents = useMemo(() => filteredEvents.filter(isCounterActiveEvent), [filteredEvents]);

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
  }, [filteredCounterEvents]);

  const metrics = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    return {
      today: filteredCounterEvents.filter((item) => sameDay(new Date(item.startAt), now)).length,
      week: filteredCounterEvents.filter((item) => {
        const start = new Date(item.startAt);
        return start >= now && start <= weekEnd;
      }).length,
      important: filteredCounterEvents.filter((item) => item.isImportant).length,
      free: filteredCounterEvents.filter((item) => isFreeEvent(item)).length,
      offline: filteredCounterEvents.filter((item) => item.format === 'OFFLINE').length,
      city: filteredCounterEvents.length,
    };
  }, [filteredEvents]);

  const compactEvents = useMemo(() => {
    return [...filteredEvents].sort((a, b) => +new Date(a.startAt) - +new Date(b.startAt)).slice(0, 12);
  }, [filteredEvents]);

  const topicCards = useMemo(() => {
    return topicPresets.map((topic) => ({ ...topic, count: getTopicCount(events.filter(isCounterActiveEvent), topic.value) }));
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
            <div className='compact-event-title text-lg font-semibold text-[#17191e]'>Формат, город, тема, источник и период</div>
          </div>
        </div>
        <div className='rounded-[14px] border border-[#7CD8B3] bg-white px-3 py-2 text-sm text-slate-500'>
          Текущая тема: {highlightedTopic}<br />
          Найдено событий: {filteredCounterEvents.length}
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

  const importantViewModeControls = (
    <>
      <Button
        variant='primary'
        onClick={() => setViewMode('SHOWCASE')}
        className='important-mode-btn w-full border-[#7CD8B3] bg-[#7CD8B3] font-medium text-black'
      >
        Витрина
      </Button>

      <Button
        variant='primary'
        onClick={() => setViewMode('COMPACT')}
        className='important-mode-btn w-full border-[#7CD8B3] bg-[#7CD8B3] font-medium text-black'
      >
        Полный режим
      </Button>
    </>
  );

  const calendarQuickFiltersPanel = (
    <>
      <Button
        variant='primary'
        onClick={() => setPriceFilter((prev) => prev === 'FREE' ? 'ALL' : 'FREE')}
        className={`calendar-filter-toggle w-full border-[#7CD8B3] bg-[#7CD8B3] font-medium text-black ${priceFilter === 'FREE' ? 'calendar-filter-toggle-active' : ''}`}
      >
        Только бесплатные
      </Button>

      <Button
        variant='primary'
        onClick={() => setOnlyImportant((prev) => !prev)}
        className={`calendar-filter-toggle w-full border-[#7CD8B3] bg-[#7CD8B3] font-medium text-black ${onlyImportant ? 'calendar-filter-toggle-active' : ''}`}
      >
        Только важные
      </Button>
    </>
  );

  const topicButtonsPanel = (
    <div className='calendar-topic-panel p-0'>
      <div className='calendar-topic-panel-title'>ПОДБОРКИ</div>

      <div className='grid gap-3 md:grid-cols-3'>
        {topicCards.map((topic) => {
          const isActive = topicFilter === topic.value;

          return (
            <button
              key={topic.value}
              type='button'
              onClick={() => setTopicFilter(topic.value)}
              className={`topic-filter-button pressable flex min-h-[92px] min-w-0 items-center gap-4 rounded-[18px] border border-[#4FAF8C] bg-[#7CD8B3] px-4 py-3 text-left transition hover:bg-[#86e1bd] ${
                isActive ? 'topic-filter-button-active' : ''
              }`}
            >
              <div
                className={`topic-filter-icon flex h-11 w-11 flex-none items-center justify-center rounded-full text-[17px] ${
                  isActive ? 'bg-white/55 text-[#f29f59]' : 'bg-[#eefbf4] text-[#2a8f68]'
                }`}
              >
                {topic.icon}
              </div>

              <div className='topic-filter-copy min-w-0'>
                <div className='topic-filter-title'>{topic.cardLabel}</div>
                <div className='topic-count-number'>{topic.count}</div>
              </div>
            </button>
          );
        })}

        <button
          type='button'
          onClick={() => setTopicFilter('ALL')}
          className={`topic-filter-button pressable flex min-h-[92px] min-w-0 items-center justify-center gap-3 rounded-[18px] border border-[#4FAF8C] bg-[#7CD8B3] px-4 py-3 text-center transition hover:bg-[#86e1bd] ${
            topicFilter === 'ALL' ? 'topic-filter-button-active' : ''
          }`}
        >
          <Layers3
            className={`h-6 w-6 flex-none ${
              topicFilter === 'ALL' ? 'text-[#f29f59]' : 'text-black'
            }`}
          />
          <span className='topic-filter-title'>Все подборки</span>
        </button>
      </div>
    </div>
  );

  const compactModePanel = (
    <div className='surface-card p-4'>
      <div className='mb-3 text-sm font-medium text-slate-500'>Режимы отображения</div>
      <div className='grid gap-3 md:grid-cols-2'>
        {importantViewModeControls}
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
            { label: 'Сегодня', value: metrics.today, icon: CalendarRange },
            { label: 'На 7 дней', value: metrics.week, icon: Users },
            { label: 'Важно', value: metrics.important, icon: Sparkles },
            { label: 'Бесплатно', value: metrics.free, icon: Ticket },
            { label: 'Оффлайн', value: metrics.offline, icon: MapPin },
            { label: cityFilter === 'ALL' ? 'По всем городам' : cityFilter, value: metrics.city, icon: Flame },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.label} className='metric-card surface-card !bg-white flex items-center gap-3 px-4 py-3'>
                <div className='metric-icon icon-chip h-10 w-10'><Icon className='h-4.5 w-4.5 text-[#2c8d67]' /></div>
                <div>
                  <div className='text-sm text-slate-500'>{item.label}</div>
                  <div className='text-xl font-semibold leading-none text-[#14171c]'>{item.value}</div>
                </div>
              </div>
            );
          })}
        </div>
      </section>
      {viewMode === 'SHOWCASE' && (
        <section id='important-events-section' className='container-shell mt-4'>
          <div className='important-events-combined overflow-hidden rounded-[26px] border border-[#7CD8B3] bg-white'>
            <HighlightCarousel
              embedded
              items={filteredHighlights}
              onOpen={setActiveEvent}
              controls={importantViewModeControls}
            />

            <ImportantDatesMiniStrip
              className='important-events-combined-strip'
              events={currentMonthImportantEvents}
              selectedDate={selectedDate}
              onSelect={(event) => setSelectedDate(new Date(event.startAt))}
              onOpenAll={() => document.getElementById('important-events-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            />
          </div>
        </section>
      )}

      {viewMode === 'COMPACT' ? (
        <>
          <section className='container-shell mt-4'>
            {advancedFiltersPanel}
          </section>
          <section className='container-shell mt-4'>
            {compactModePanel}
          </section>
          <section className='container-shell mt-4'>
            <div className='compact-events-panel surface-card p-5'>
              <div className='mb-4 flex items-center justify-between gap-4'>
                <div>
                  <div className='text-sm font-medium text-slate-500'>Компактный режим</div>
                  <div className='text-2xl font-semibold text-[#17191e]'>Быстрый список событий</div>
                </div>
                <div className='text-sm text-slate-500'>Без лишней графики, только ближайшие события</div>
              </div>
              <div className='compact-events-list grid gap-3'>
                {compactEvents.map((event) => (
                  <div key={event.id} className='compact-event-card rounded-[18px] border border-[#e5e7eb] bg-white p-4 text-left transition hover:-translate-y-[1px]'>
                    <button type='button' onClick={() => setActiveEvent(event)} className='compact-event-main-button w-full text-left'>
                      <div className='compact-event-card-header flex flex-col items-start justify-between gap-3 lg:flex-row lg:items-start'>
                        <div>
                          <div className='text-lg font-semibold text-[#17191e]'>{event.title}</div>
                          <div className='compact-event-meta mt-2 text-sm text-slate-500'>
                            {new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' }).format(new Date(event.startAt))}
                            {' · '}
                            {event.location}
                          </div>
                        </div>
                        <div className='compact-event-badges flex flex-wrap items-center gap-2'>
                          <span className='rounded-full bg-[#eefbf4] px-3 py-1 text-xs font-semibold text-[#2c8d67]'>{event.format}</span>
                          {event.isImportant ? <span className='rounded-full border border-[#4FAF8C] bg-[#7CD8B3] px-3 py-1 text-xs font-semibold text-black'>Важное</span> : null}
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
          <div className='dashboard-unified-shell'>
            <div className='dashboard-filters-wrap'>
              {advancedFiltersPanel}
            </div>

            <div className='dashboard-calendar-wrap'>
              <EventsCalendarBoard
                events={filteredEvents}
                selectedDate={selectedDate}
                onSelectDate={setSelectedDate}
                onMonthChange={setCalendarViewDate}
                calendarControls={calendarQuickFiltersPanel}
                filtersPanel={topicButtonsPanel}
              />
            </div>

          </div>
        </section>
      )}

      <footer className='container-shell mt-4'>
        <div className='platform-footer-shell'>
          <div className='platform-footer-title'>
            Возможности с платформой:
          </div>

          <ReminderPanel />

          <div className='platform-footer-copy'>
            Отдел по работе с партнерами 2022–{new Date().getFullYear()}
          </div>
        </div>
      </footer>

      <EventModal item={activeEvent} open={!!activeEvent} onOpenChange={(open) => !open && setActiveEvent(null)} />
      </div>
    </main>
  );
}
