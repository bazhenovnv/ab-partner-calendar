'use client';

import { useMemo, useState } from 'react';
import {
  Activity,
  Bell,
  Bot,
  CheckCircle2,
  Database,
  ExternalLink,
  RefreshCw,
  Send,
  Settings,
  ShieldCheck,
  XCircle,
} from 'lucide-react';

type CheckResult = {
  title: string;
  ok: boolean;
  status?: number;
  message: string;
  data?: unknown;
};

function extractTokenFromValue(value: string | null) {
  if (!value) return '';
  const raw = value.trim();
  if (raw.split('.').length === 3) return raw;

  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string' && parsed.split('.').length === 3) return parsed;
    if (parsed && typeof parsed === 'object') {
      const record = parsed as Record<string, unknown>;
      const candidates = [
        record.accessToken,
        record.token,
        record.adminToken,
        record.access_token,
        record.jwt,
        record.user && typeof record.user === 'object' ? (record.user as Record<string, unknown>).accessToken : undefined,
      ];
      for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.split('.').length === 3) return candidate;
      }
    }
  } catch {
    return '';
  }

  return '';
}

function getToken() {
  if (typeof window === 'undefined') return '';
  const keys = [
    'ab_partner_admin_token',
    'accessToken',
    'adminToken',
    'token',
    'authToken',
    'jwt',
    'ab_admin_token',
    'abAdminToken',
    'admin_access_token',
    'admin-token',
    'admin.token',
  ];

  for (const storage of [window.localStorage, window.sessionStorage]) {
    for (const key of keys) {
      const token = extractTokenFromValue(storage.getItem(key));
      if (token) return token;
    }
    for (let index = 0; index < storage.length; index += 1) {
      const key = storage.key(index);
      if (!key) continue;
      const token = extractTokenFromValue(storage.getItem(key));
      if (token) return token;
    }
  }

  return '';
}

async function requestJson(path: string, options: RequestInit = {}) {
  const token = getToken();
  const response = await fetch(path, {
    credentials: 'include',
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  });

  const text = await response.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }

  return { response, data };
}

export default function AdminSettingsPage() {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [results, setResults] = useState<CheckResult[]>([]);

  const cards = useMemo(
    () => [
      {
        title: 'Telegram-интеграция',
        icon: Send,
        rows: [
          ['Канал', 't.me/ab_afisha_buh'],
          ['Импорт', 'безопасный парсинг + ручное подтверждение'],
          ['Дубли', 'sourcePostId + sourceUrl + slug события'],
        ],
      },
      {
        title: 'Напоминания и бот',
        icon: Bot,
        rows: [
          ['Интервалы', '5m, 15m, 30m, 1h, 1d'],
          ['Подписки', 'TelegramSubscriber + Reminder'],
          ['Telegram bot', 'статус зависит от TELEGRAM_BOT_TOKEN в .env'],
        ],
      },
      {
        title: 'Защита данных',
        icon: ShieldCheck,
        rows: [
          ['Авторизация', 'JWT Bearer token'],
          ['Удаление событий', 'мягкое удаление deletedAt с восстановлением'],
          ['Секреты', 'редактируются только через .env на сервере'],
        ],
      },
    ],
    [],
  );

  async function runCheck(key: string, title: string, path: string, options: RequestInit = {}) {
    setLoadingKey(key);
    try {
      const { response, data } = await requestJson(path, options);
      setResults((current) => [
        { title, ok: response.ok, status: response.status, message: response.ok ? 'Успешно' : 'Ошибка запроса', data },
        ...current,
      ]);
    } catch (error) {
      setResults((current) => [
        { title, ok: false, message: error instanceof Error ? error.message : 'Неизвестная ошибка' },
        ...current,
      ]);
    } finally {
      setLoadingKey(null);
    }
  }

  const actions = [
    { key: 'dashboard', title: 'Проверить дашборд', description: '/api/admin/dashboard', icon: Activity, onClick: () => runCheck('dashboard', 'Дашборд', '/api/admin/dashboard') },
    { key: 'events', title: 'Проверить мероприятия', description: '/api/admin/events', icon: Database, onClick: () => runCheck('events', 'Мероприятия', '/api/admin/events') },
    { key: 'deleted', title: 'Проверить удалённые', description: '/api/admin/events?includeDeleted=true', icon: Database, onClick: () => runCheck('deleted', 'Удалённые и активные события', '/api/admin/events?includeDeleted=true') },
    { key: 'imports', title: 'Проверить импорт', description: '/api/admin/imports', icon: RefreshCw, onClick: () => runCheck('imports', 'Импорты', '/api/admin/imports') },
    { key: 'sync', title: 'Запустить синхронизацию', description: 'POST /api/admin/imports/sync', icon: RefreshCw, onClick: () => runCheck('sync', 'Синхронизация Telegram', '/api/admin/imports/sync', { method: 'POST' }) },
    { key: 'reminders', title: 'Проверить напоминания', description: '/api/admin/reminders', icon: Bell, onClick: () => runCheck('reminders', 'Напоминания', '/api/admin/reminders') },
    { key: 'broadcasts', title: 'Проверить рассылку', description: '/api/admin/broadcasts', icon: Send, onClick: () => runCheck('broadcasts', 'Рассылка', '/api/admin/broadcasts') },
    { key: 'users', title: 'Проверить пользователей', description: '/api/admin/users', icon: Settings, onClick: () => runCheck('users', 'Пользователи', '/api/admin/users') },
  ];

  return (
    <div className='space-y-6'>
      <section className='rounded-[30px] bg-white p-7 shadow-[0_26px_70px_rgba(0,0,0,0.16)]'>
        <div className='text-[13px] font-semibold uppercase tracking-[0.35em] text-slate-400'>Configuration</div>
        <h1 className='mt-3 text-4xl font-bold text-black'>Настройки</h1>
        <p className='mt-3 max-w-4xl text-base leading-7 text-slate-700'>
          Панель диагностики системных параметров: Telegram-импорт, напоминания, API администратора,
          JWT-авторизация и защита от повторной загрузки удалённых событий.
        </p>
      </section>

      <section className='grid gap-5 xl:grid-cols-3'>
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className='rounded-[26px] border border-[#7CD8B3] bg-white p-6 shadow-[0_22px_54px_rgba(0,0,0,0.14)]'>
              <div className='flex items-center gap-3'>
                <div className='flex h-11 w-11 items-center justify-center rounded-2xl border border-[#7CD8B3] bg-[#effcf6] text-black'><Icon className='h-5 w-5' /></div>
                <h2 className='text-xl font-bold text-black'>{card.title}</h2>
              </div>
              <div className='mt-5 space-y-3'>
                {card.rows.map(([label, value]) => (
                  <div key={label} className='rounded-2xl border border-[#d8f3e7] bg-[#fbfffd] p-4'>
                    <div className='text-xs font-semibold uppercase tracking-[0.12em] text-slate-400'>{label}</div>
                    <div className='mt-1 text-sm font-semibold text-black'>{value}</div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </section>

      <section className='rounded-[30px] border border-[#7CD8B3] bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.16)]'>
        <div className='flex flex-wrap items-start justify-between gap-4'>
          <div>
            <h2 className='text-2xl font-bold text-black'>Проверка функций кабинета</h2>
            <p className='mt-2 text-sm leading-6 text-slate-600'>Кнопки проверяют реальные API-разделы. Если токен администратора истёк, выйдите и войдите снова.</p>
          </div>
          <a href='/admin/events' className='inline-flex items-center gap-2 rounded-2xl border border-black bg-[#7CD8B3] px-5 py-3 text-sm font-semibold text-black shadow-[0_14px_30px_rgba(0,0,0,0.18)]'>
            Открыть мероприятия <ExternalLink className='h-4 w-4' />
          </a>
        </div>
        <div className='mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {actions.map((action) => {
            const Icon = action.icon;
            const isLoading = loadingKey === action.key;
            return (
              <button key={action.key} type='button' onClick={action.onClick} disabled={Boolean(loadingKey)} className='group rounded-[22px] border border-[#7CD8B3] bg-white p-5 text-left shadow-[0_16px_38px_rgba(0,0,0,0.12)] transition hover:-translate-y-0.5 hover:bg-[#f5fffa] disabled:cursor-not-allowed disabled:opacity-60'>
                <div className='flex items-center gap-3'>
                  <div className='flex h-11 w-11 items-center justify-center rounded-2xl border border-[#7CD8B3] bg-[#7CD8B3] text-black'>{isLoading ? <RefreshCw className='h-5 w-5 animate-spin' /> : <Icon className='h-5 w-5' />}</div>
                  <div><div className='text-base font-bold text-black'>{action.title}</div><div className='mt-1 text-sm text-slate-500'>{action.description}</div></div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className='rounded-[30px] border border-[#7CD8B3] bg-white p-6 shadow-[0_24px_64px_rgba(0,0,0,0.16)]'>
        <h2 className='text-2xl font-bold text-black'>Результаты проверок</h2>
        {results.length === 0 ? (
          <div className='mt-5 rounded-[22px] border border-dashed border-[#7CD8B3] bg-[#fbfffd] p-6 text-sm text-slate-500'>Проверки ещё не запускались.</div>
        ) : (
          <div className='mt-5 space-y-4'>
            {results.map((result, index) => (
              <div key={`${result.title}-${index}`} className='rounded-[22px] border border-[#d8f3e7] bg-[#fbfffd] p-5'>
                <div className='flex items-center gap-3'>
                  {result.ok ? <CheckCircle2 className='h-5 w-5 text-emerald-500' /> : <XCircle className='h-5 w-5 text-red-500' />}
                  <div><div className='text-base font-bold text-black'>{result.title}{result.status ? ` · HTTP ${result.status}` : ''}</div><div className='mt-1 text-sm text-slate-600'>{result.message}</div></div>
                </div>
                <pre className='mt-4 max-h-[300px] overflow-auto rounded-2xl bg-black p-4 text-xs leading-5 text-[#7CD8B3]'>{JSON.stringify(result.data, null, 2)}</pre>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
