import { BellRing, CalendarPlus2, Send, Share2 } from 'lucide-react';

const items = [
  {
    icon: Send,
    title: 'Синхронизация с мессенджерами',
    text: 'Получайте напоминания в чате',
  },
  {
    icon: Share2,
    title: 'API и коннекторы',
    text: 'Интеграция с вашими системами',
  },
  {
    icon: BellRing,
    title: 'Умные напоминания',
    text: 'Не пропустите важное',
  },
  {
    icon: CalendarPlus2,
    title: 'Экспорт в календарь',
    text: 'Google, Outlook, Яндекс',
  },
];

export function ReminderPanel() {
  return (
    <section className='surface-card overflow-hidden px-3 py-2 sm:px-4'>
      <div className='grid gap-2 lg:grid-cols-4'>
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className='utility-divider flex items-center gap-4 rounded-xl px-4 py-4'>
              <div className='icon-chip h-12 w-12'>
                <Icon className='h-5 w-5 text-black' />
              </div>
              <div>
                <div className='text-[18px] font-medium text-[#1b1d23]'>{item.title}</div>
                <div className='text-sm text-slate-500'>{item.text}</div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
