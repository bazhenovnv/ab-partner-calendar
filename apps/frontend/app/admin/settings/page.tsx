import { SectionHeader } from '@/components/admin/section-header';

export default function AdminSettingsPage() {
  return (
    <div className='space-y-6'>
      <SectionHeader
        eyebrow='Configuration'
        title='Настройки'
        description='Точка управления системными параметрами: URL Telegram-канала, сценарий напоминаний, параметры JWT, поведение импортера и визуальные настройки проекта.'
      />

      <section className='grid gap-6 xl:grid-cols-2'>
        <div className='rounded-[28px] bg-white p-6 shadow-panel'>
          <h2 className='text-xl font-semibold text-slate-950'>Telegram-интеграция</h2>
          <div className='mt-4 space-y-3 text-sm leading-6 text-slate-600'>
            <p>Канал: <span className='font-medium text-slate-900'>t.me/ab_afisha_buh</span></p>
            <p>Режим импорта: безопасный парсинг + ручное подтверждение публикации.</p>
            <p>Защита от дублей: сравнение по sourcePostId и slug события.</p>
          </div>
        </div>

        <div className='rounded-[28px] bg-white p-6 shadow-panel'>
          <h2 className='text-xl font-semibold text-slate-950'>Напоминания и боты</h2>
          <div className='mt-4 space-y-3 text-sm leading-6 text-slate-600'>
            <p>Поддерживаемые интервалы: 5m, 15m, 30m, 1h, 1d.</p>
            <p>Поведение при отсутствии Telegram-бота: вывод понятного сценария подключения пользователю.</p>
            <p>Хранение подписок: таблица Reminder с уникальностью по eventId + telegramUserId + remindBefore.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
