'use client';

import { useEffect, useState } from 'react';
import { Megaphone, RefreshCw, Send, Users } from 'lucide-react';
import { SectionHeader } from '@/components/admin/section-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { getAdminToken } from '@/lib/admin-utils';
import { BroadcastItem, TelegramSubscriber } from '@/lib/types';

export default function AdminBroadcastsPage() {
  const [items, setItems] = useState<BroadcastItem[]>([]);
  const [subscribers, setSubscribers] = useState<TelegramSubscriber[]>([]);
  const [subscriberQuery, setSubscriberQuery] = useState('');
  const [selectedSubscriberId, setSelectedSubscriberId] = useState('');
  const [replyText, setReplyText] = useState('');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function load() {
    const token = getAdminToken();
    if (!token) {
      setError('Нет токена администратора. Выйдите и войдите в админку снова.');
      return;
    }
    const [broadcasts, subs] = await Promise.all([api.broadcasts(token), api.broadcastSubscribers(token)]);
    setItems(broadcasts);
    setSubscribers(subs);
  }

  useEffect(() => {
    load().catch((err) => setError(err instanceof Error ? err.message : 'Ошибка загрузки рассылки'));
  }, []);

  async function createDraft(sendNow = false) {
    const token = getAdminToken();
    if (!token) return setError('Нет токена администратора.');
    if (!text.trim()) return setError('Введите текст рассылки.');

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const broadcast = await api.createBroadcast(token, { title: title.trim() || undefined, text: text.trim() });
      if (sendNow) {
        const result = await api.sendBroadcast(token, broadcast.id);
        setMessage(`Рассылка отправлена. Отправлено: ${result.sent}. Ошибок: ${result.failed}.`);
      } else {
        setMessage('Черновик рассылки создан.');
      }
      setTitle('');
      setText('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось создать рассылку');
    } finally {
      setLoading(false);
    }
  }

  async function sendExisting(item: BroadcastItem) {
    const token = getAdminToken();
    if (!token) return setError('Нет токена администратора.');
    if (!confirm(`Отправить рассылку «${item.title}» всем активным подписчикам?`)) return;

    setLoading(true);
    setError('');
    setMessage('');
    try {
      const result = await api.sendBroadcast(token, item.id);
      setMessage(`Рассылка отправлена. Отправлено: ${result.sent}. Ошибок: ${result.failed}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить рассылку');
    } finally {
      setLoading(false);
    }
  }

  const activeSubscribers = subscribers.filter((item) => item.isActive).length;
  const filteredSubscribers = subscribers.filter((item) => {
    const haystack = [item.username, item.firstName, item.lastName, item.telegramUserId, item.chatId].join(' ').toLowerCase();
    return haystack.includes(subscriberQuery.toLowerCase());
  });
  const selectedSubscriber = subscribers.find((item) => item.id === selectedSubscriberId) || filteredSubscribers[0] || null;

  async function replyToSubscriber() {
    const token = getAdminToken();
    const subscriberId = selectedSubscriber?.id;
    if (!token) return setError('Нет токена администратора.');
    if (!subscriberId) return setError('Выберите подписчика.');
    if (!replyText.trim()) return setError('Введите текст ответа подписчику.');

    setLoading(true);
    setError('');
    setMessage('');
    try {
      await api.replyToSubscriber(token, subscriberId, { text: replyText.trim() });
      setReplyText('');
      setMessage('Сообщение подписчику отправлено.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось отправить ответ подписчику');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Broadcast center'
        title='Рассылка'
        description='Отправка сообщений активным подписчикам Telegram-бота и быстрые ответы на вопросы подписчиков из админки.'
        actions={<Button onClick={() => load()}><RefreshCw className='h-4 w-4' />Обновить</Button>}
      />

      <div className='grid gap-4 md:grid-cols-3'>
        <div className='rounded-[28px] bg-white p-5 shadow-panel'>
          <div className='flex items-center gap-3 text-slate-500'><Users className='h-5 w-5' />Активные подписчики</div>
          <div className='mt-3 text-3xl font-semibold text-slate-950'>{activeSubscribers}</div>
        </div>
        <div className='rounded-[28px] bg-white p-5 shadow-panel'>
          <div className='flex items-center gap-3 text-slate-500'><Megaphone className='h-5 w-5' />Рассылки</div>
          <div className='mt-3 text-3xl font-semibold text-slate-950'>{items.length}</div>
        </div>
        <div className='rounded-[28px] bg-white p-5 shadow-panel'>
          <div className='flex items-center gap-3 text-slate-500'><Send className='h-5 w-5' />Отправлено всего</div>
          <div className='mt-3 text-3xl font-semibold text-slate-950'>{items.reduce((sum, item) => sum + item.sentCount, 0)}</div>
        </div>
      </div>

      {error ? <div className='rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700'>{error}</div> : null}
      {message ? <div className='rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-700'>{message}</div> : null}

      <section className='rounded-[28px] border border-[#7CD8B3] bg-white p-5 shadow-panel'>
        <h2 className='text-xl font-semibold text-slate-950'>Новая рассылка</h2>
        <div className='mt-4 grid gap-4'>
          <label className='grid gap-2 text-sm text-slate-600'>
            Заголовок для админки
            <Input value={title} onChange={(event) => setTitle(event.target.value)} placeholder='Например: Анонс недели' />
          </label>
          <label className='grid gap-2 text-sm text-slate-600'>
            Текст сообщения
            <Textarea className='min-h-[180px]' value={text} onChange={(event) => setText(event.target.value)} placeholder='Введите текст рассылки...' />
          </label>
        </div>
        <div className='mt-5 flex flex-wrap justify-end gap-3'>
          <Button variant='secondary' disabled={loading} onClick={() => createDraft(false)}>Сохранить черновик</Button>
          <Button disabled={loading} onClick={() => createDraft(true)}><Send className='h-4 w-4' />Отправить сразу</Button>
        </div>
      </section>

      <section className='rounded-[28px] bg-white p-5 shadow-panel'>
        <h2 className='text-xl font-semibold text-slate-950'>История рассылок</h2>
        <div className='mt-4 grid gap-4'>
          {items.map((item) => (
            <div key={item.id} className='rounded-3xl border border-slate-100 p-4'>
              <div className='flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between'>
                <div>
                  <div className='text-lg font-semibold text-slate-950'>{item.title}</div>
                  <div className='mt-1 line-clamp-2 text-sm text-slate-500'>{item.text}</div>
                  <div className='mt-2 text-xs text-slate-400'>Создана: {new Date(item.createdAt).toLocaleString('ru-RU')}</div>
                </div>
                <div className='flex flex-wrap items-center gap-2'>
                  <Badge tone={item.status === 'SENT' ? 'mint' : item.status === 'FAILED' ? 'default' : 'blue'}>{item.status}</Badge>
                  <Badge tone='default'>OK: {item.sentCount}</Badge>
                  <Badge tone='default'>Ошибки: {item.failedCount}</Badge>
                  {item.status !== 'SENT' ? <Button disabled={loading} onClick={() => sendExisting(item)}><Send className='h-4 w-4' />Отправить</Button> : null}
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 ? <div className='rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500'>Рассылок пока нет.</div> : null}
        </div>
      </section>

      <section className='rounded-[28px] bg-white p-5 shadow-panel'>
        <div className='mb-5 flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between'>
          <div>
            <h2 className='text-xl font-semibold text-slate-950'>Подписчики</h2>
            <p className='mt-1 text-sm text-slate-500'>Выберите подписчика, найдите его по имени или username и при необходимости отправьте персональный ответ.</p>
          </div>
          <div className='w-full max-w-md'>
            <Input value={subscriberQuery} onChange={(event) => setSubscriberQuery(event.target.value)} placeholder='Поиск по имени, username, ID или chat ID' />
          </div>
        </div>

        <div className='grid gap-5 xl:grid-cols-[1.05fr_0.95fr]'>
          <div className='grid gap-3'>
            {filteredSubscribers.slice(0, 50).map((item) => (
              <button
                key={item.id}
                type='button'
                onClick={() => setSelectedSubscriberId(item.id)}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4 text-left transition ${selectedSubscriber?.id === item.id ? 'border-[#7CD8B3] bg-[#f5fffa] shadow-[0_10px_24px_rgba(15,23,42,0.10)]' : 'border-slate-100 bg-white hover:bg-slate-50'}`}
              >
                <div>
                  <div className='font-semibold text-slate-950'>@{item.username || 'без username'}</div>
                  <div className='text-sm text-slate-500'>ID {item.telegramUserId} · chat {item.chatId}</div>
                  <div className='mt-1 text-xs text-slate-400'>{[item.firstName, item.lastName].filter(Boolean).join(' ') || 'Имя не указано'}</div>
                </div>
                <Badge tone={item.isActive ? 'mint' : 'default'}>{item.isActive ? 'Активен' : 'Отключен'}</Badge>
              </button>
            ))}
            {filteredSubscribers.length === 0 ? <div className='rounded-2xl border border-dashed border-slate-200 p-6 text-sm text-slate-500'>Подписчики не найдены.</div> : null}
          </div>

          <div className='rounded-[24px] border border-[#7CD8B3] bg-[#fbfffd] p-5'>
            <h3 className='text-lg font-semibold text-slate-950'>Ответ подписчику</h3>
            {selectedSubscriber ? (
              <div className='mt-3 rounded-2xl border border-slate-200 bg-white p-4 text-sm text-slate-600'>
                <div className='font-semibold text-slate-950'>@{selectedSubscriber.username || 'без username'}</div>
                <div className='mt-1'>ID {selectedSubscriber.telegramUserId}</div>
                <div>chat {selectedSubscriber.chatId}</div>
              </div>
            ) : (
              <div className='mt-3 rounded-2xl border border-dashed border-slate-200 p-4 text-sm text-slate-500'>Выберите подписчика слева.</div>
            )}

            <label className='mt-4 grid gap-2 text-sm text-slate-600'>
              Текст ответа
              <Textarea className='min-h-[180px]' value={replyText} onChange={(event) => setReplyText(event.target.value)} placeholder='Введите ответ на вопрос подписчика...' />
            </label>
            <div className='mt-4 flex justify-end'>
              <Button disabled={loading || !selectedSubscriber} onClick={replyToSubscriber}><Send className='h-4 w-4' />Отправить ответ</Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
