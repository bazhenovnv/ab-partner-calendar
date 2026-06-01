'use client';

import type { ReactNode } from 'react';
import { CalendarClock, MapPin, Tag, ExternalLink, BellRing } from 'lucide-react';
import { EventItem } from '@/lib/types';
import { formatLabelMap, statusLabelMap } from '@/lib/utils';
import { api } from '@/lib/api';
import { Modal } from './ui/dialog';
import { Button } from './ui/button';

function formatMoscowDateTime(value: string) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow',
  }).format(new Date(value));
}


function resolveDisplayFormat(item: EventItem): 'ONLINE' | 'OFFLINE' | 'HYBRID' {
  const source = `${item.location || ''}\n${item.descriptionShort || ''}\n${item.descriptionFull || ''}`.toLowerCase();

  const hasPhysicalAddress =
    /(санкт-петербург|спб|москва|екатеринбург|краснодар|новосибирск|казань|офис|аудитори|зал|конференц|пространств|бц|бизнес-центр|переул|проспект|улиц|ул\.|дом\b|д\.|строен|корпус|этаж)/iu.test(source);

  if (hasPhysicalAddress) return 'OFFLINE';
  if (item.format === 'HYBRID') return 'HYBRID';
  if (item.format === 'OFFLINE') return 'OFFLINE';
  return 'ONLINE';
}

function getFormatLabel(value: 'ONLINE' | 'OFFLINE' | 'HYBRID') {
  if (value === 'OFFLINE') return 'Офлайн';
  if (value === 'HYBRID') return 'Гибрид';
  return 'Онлайн';
}

function isCompletedStatus(value?: string) {
  return ['COMPLETED', 'FINISHED', 'DONE', 'ARCHIVED'].includes(String(value || '').toUpperCase());
}

function getSourceButtonLabel(url?: string) {
  return /max\.ru/iu.test(url || '') ? 'MAX-канал' : 'Telegram-канал';
}

function cleanDescriptionText(value?: string) {
  if (!value) return '';

  return value
    .replace(/https?:\/\/\S+/g, '')
    .replace(/#[\p{L}\p{N}_-]+/gu, '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^(Источник|Телеграм|Telegram|MAX|Зарегистрироваться|Регистрация)\b/iu.test(line))
    .filter((line) => !/зарегистрироваться|регистрация|телеграм|telegram|\bmax\b/iu.test(line))
    .filter((line) => !/^(Когда|Дата|Время|Формат|Стоимость|Источник|Город|Адрес|Место)\s*[:：]/iu.test(line))
    .filter((line) => !/(?:^|[?&])q=|%[0-9a-f]{2}/iu.test(line))
    .filter((line) => !/^\(?\??\)?$/.test(line))
    .join('\n')
    .replace(/\(\s*\)/g, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function EventModal({
  item,
  open,
  onOpenChange,
}: {
  item: EventItem | null;
  open: boolean;
  onOpenChange: (value: boolean) => void;
}) {
  if (!item) return null;

  const status = item.runtimeStatus ?? item.status;
  const displayFormat = resolveDisplayFormat(item);
  const completed = isCompletedStatus(status);
  const telegramBotDeepLink = process.env.NEXT_PUBLIC_TELEGRAM_BOT_DEEP_LINK || 'https://t.me/PartnersTogether_bot';
  const telegramReminderUrl = `${telegramBotDeepLink}?start=afisha_${item.id}`;
  const sourceUrl = item.sourceUrl || 'https://t.me/ab_afisha_buh';
  const sourceButtonLabel = getSourceButtonLabel(sourceUrl);
  const description = cleanDescriptionText(item.descriptionFull || item.descriptionShort) || 'Описание мероприятия будет добавлено позже.';

  return (
    <Modal open={open} onOpenChange={onOpenChange} title={item.title}>
      <div className='event-modal-layout grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.86fr)]'>
        <div className='event-modal-main min-w-0'>
          {item.imageUrl ? (
            <div className='event-modal-image-wrap'>
              <img
                src={item.imageUrl}
                alt={item.title}
                className='event-modal-image'
              />
            </div>
          ) : null}

          <div className='event-modal-description mt-5 whitespace-pre-line break-words text-sm leading-7 text-slate-600 [overflow-wrap:anywhere]'>
            {description}
          </div>

          <div className='event-modal-main-actions mt-6 flex flex-wrap items-center gap-3'>
            <Button asChild className='event-modal-action-btn event-modal-action-btn-primary'>
              <a href={telegramReminderUrl} target='_blank' rel='noreferrer'>
                <BellRing className='h-4 w-4' />
                Напомнить в Telegram
              </a>
            </Button>
          </div>
        </div>

        <aside className='event-modal-side space-y-4 rounded-[24px] border border-[#7CD8B3] bg-white p-5'>
          <InfoRow label='Дата и время' value={formatMoscowDateTime(item.startAt)} icon={<CalendarClock className='h-4 w-4' />} />
          <InfoRow label='Место проведения' value={item.location || 'Адрес уточняется'} icon={<MapPin className='h-4 w-4' />} />
          <InfoRow label='Формат' value={formatLabelMap[item.format]} icon={<Tag className='h-4 w-4' />} />
          <InfoRow label='Статус' value={statusLabelMap[status]} icon={<BellRing className='h-4 w-4' />} />

          <div className='event-modal-side-actions grid gap-3 pt-4 sm:grid-cols-2'>
            <Button asChild variant='ghost' className='event-modal-action-btn'>
              <a href={api.exportEventIcsUrl(item.slug)} target='_blank' rel='noreferrer'>
                <CalendarClock className='h-4 w-4' />
                Экспорт в календарь
              </a>
            </Button>

            <Button asChild variant='ghost' className='event-modal-action-btn'>
              <a href={item.sourceUrl || 'https://t.me/ab_afisha_buh'} target='_blank' rel='noreferrer'>
                <ExternalLink className='h-4 w-4' />
                Telegram-канал
              </a>
            </Button>
          </div>
        </aside>
      </div>
    </Modal>
  );
}

function InfoRow({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className='event-modal-info-row rounded-2xl border border-[#7CD8B3] bg-white p-4'>
      <div className='mb-1 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-slate-400'>
        {icon}
        {label}
      </div>
      <div className='text-sm font-medium text-slate-800'>
        {value}
      </div>
    </div>
  );
}
