# ab-partner-calendar integration patch

Что меняется:

1. `apps/backend/src/modules/events/events.controller.ts`
   - добавлен публичный endpoint `GET /api/events/id/:id`
2. `apps/backend/src/modules/events/events.service.ts`
   - добавлен метод `detailById(id)`
3. `apps/frontend/components/event-modal.tsx`
   - кнопка напоминания теперь открывает Telegram-бота с deep-link на конкретное событие
   - payload: `afisha_<uuid события>`
4. `.env.example`
   - добавлена клиентская переменная `NEXT_PUBLIC_TELEGRAM_BOT_DEEP_LINK`

Зачем это нужно:
- фронтенд календаря теперь передает в бота не общую ссылку, а конкретное событие;
- бот может получить UUID события из `/start`, запросить его из API календаря и сразу открыть карточку события с настройкой напоминаний.

Что нужно сделать после применения патча:
- в реальном `.env` календаря добавить `NEXT_PUBLIC_TELEGRAM_BOT_DEEP_LINK`
- перезапустить frontend и backend
- убедиться, что backend доступен боту по `CALENDAR_API_BASE_URL`
