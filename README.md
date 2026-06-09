# АБ Партнер — Календарь бухгалтеров

Monorepo-проект для публичной витрины бухгалтерских мероприятий, календаря, Max-импорта, Telegram-напоминаний, рассылок, административной панели и аналитики посещаемости.

## Что внутри

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS.
- **Backend**: NestJS, Prisma, PostgreSQL, JWT.
- **Источник мероприятий**: Max API.
- **Telegram**: бот напоминаний, подписки и рассылки; не является основным источником мероприятий.
- **Админка**: авторизация, мероприятия, импорт, категории, reminders, пользователи, dashboard, аналитика.
- **Публичная витрина**: highlights, календарь, фильтры, компактный режим, ICS-экспорт.

Подробная эксплуатационная карта проекта находится в [`PROJECT_CONTEXT.md`](./PROJECT_CONTEXT.md).

## Структура

```text
apps/
  frontend/
  backend/
nginx/
docker-compose.yml
docker-compose.prod.yml
PROJECT_CONTEXT.md
```

## Быстрый запуск через Docker

```bash
cp .env.example .env
# Заполнить секреты только в .env
docker compose up -d --build
docker compose ps
```

Адреса локально:

```text
Frontend: http://127.0.0.1:3000
Backend:  http://127.0.0.1:4000/api
Postgres: 127.0.0.1:5432
```

Проверка API:

```bash
curl http://127.0.0.1:4000/api/events
curl http://127.0.0.1:4000/api/events/highlights
```

Ручная синхронизация выполняется только из защищенной админки:

```http
POST /api/admin/imports/sync
Authorization: Bearer <JWT>
```

## Локальный запуск без Docker

Нужен PostgreSQL и корректный `DATABASE_URL`.

```bash
cp .env.example .env
npm install
npm run generate
npm run migrate
npm run seed
npm run dev
```

## Переменные окружения

Шаблон `.env.example` не содержит рабочих секретов. Заполняйте значения только в локальном или серверном `.env`.

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/app
JWT_SECRET=change_me
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=change_me

# Legacy Telegram channel import. Keep disabled when MAX is the event source.
TELEGRAM_SYNC_ENABLED=false
TELEGRAM_CHANNEL_URL=
AUTO_SYNC_ON_START=true
TELEGRAM_SYNC_INTERVAL_MINUTES=60

# Telegram bot: reminders and broadcasts only.
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_POLLING=true
TELEGRAM_BOT_ADMIN_IDS=
TELEGRAM_BOT_ADMIN_USERNAMES=

NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_TELEGRAM_BOT_DEEP_LINK=

# MAX: primary event source.
MAX_SYNC_ENABLED=true
MAX_BOT_TOKEN=
MAX_CHAT_ID=
MAX_CHANNEL_URL=
MAX_SYNC_INTERVAL_MINUTES=60
MAX_MESSAGES_COUNT=50
```

Для локального frontend без Nginx используется `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_TELEGRAM_BOT_DEEP_LINK=https://t.me/<bot-name>
```

## Основные команды

```bash
npm run dev        # frontend + backend
npm run generate   # prisma generate
npm run migrate    # prisma migrate dev --name init
npm run seed       # тестовые данные и администратор
npm run lint       # typecheck frontend + backend
npm run build      # production build
```

## Max-импорт событий

Max API является основным источником мероприятий.

Поток данных:

```text
Max API
  -> SourceConnectorsService
  -> TelegramImport (историческое имя общего журнала импорта)
  -> Event
  -> GET /api/events
  -> frontend
```

Синхронизация запускается:

- при старте backend, если `AUTO_SYNC_ON_START=true`;
- планировщиком backend;
- вручную из защищенной админки.

Публичный endpoint:

```http
POST /api/public/sync
```

оставлен только для совместимости со старыми frontend-сборками и не должен обращаться к внешним источникам.

## Telegram-бот для напоминаний и рассылок

Если задан `TELEGRAM_BOT_TOKEN`, backend запускает bot polling и обрабатывает deep link вида:

```text
https://t.me/<bot>?start=afisha_<eventId>
```

Пользователь выбирает один или несколько интервалов напоминания, после чего записи сохраняются в таблице `Reminder`.

Telegram также используется для подписчиков и рассылок через таблицы:

```text
TelegramSubscriber
Broadcast
BroadcastDelivery
```

Недоступность `api.telegram.org:443` не должна мешать загрузке и отображению мероприятий из Max.

## Legacy Telegram-импорт событий

Старый импорт событий из публичного Telegram-канала сохранен только для обратной совместимости. В текущей конфигурации он должен быть выключен:

```env
TELEGRAM_SYNC_ENABLED=false
TELEGRAM_CHANNEL_URL=
```

Не включайте legacy Telegram-импорт одновременно с Max без отдельной проверки дедупликации.

## Внешние API-коннекторы

В `SOURCE_CONNECTORS_JSON` можно добавить JSON-массив дополнительных коннекторов.

```env
SOURCE_CONNECTORS_JSON=[{"id":"partner-api","name":"Partner API","type":"json-api","enabled":true,"url":"https://example.com/api/events","headers":{"X-API-Key":"secret-key"},"importantTag":"#Хит"}]
```

Поддерживаемые типы:

```text
telegram-public-html
json-api
max-api
```

## Публичные API-методы

```http
GET  /api/events
GET  /api/events/highlights
GET  /api/events/:slug
GET  /api/events/:slug/ics
GET  /api/categories
GET  /api/feed
GET  /api/public/connectors
GET  /api/public/collections
POST /api/public/visit
POST /api/reminders
POST /api/auth/login
POST /api/public/sync      # compatibility no-op
```

## Админские API-методы

JWT передаётся через `Authorization: Bearer <token>`.

```http
GET    /api/admin/dashboard
GET    /api/admin/analytics
GET    /api/admin/events
POST   /api/admin/events
PATCH  /api/admin/events/:id
DELETE /api/admin/events/:id
GET    /api/admin/imports
POST   /api/admin/imports/sync
POST   /api/admin/imports/:id/confirm
POST   /api/admin/imports/:id/reject
GET    /api/admin/reminders
GET    /api/admin/users
```

## Production/Nginx

Backend использует глобальный префикс `/api`. Nginx проксирует `/api/` в backend без обрезания API-префикса:

```nginx
location /api/ {
    proxy_pass http://backend:3000/api/;
}
```

Frontend в production должен использовать:

```env
NEXT_PUBLIC_API_URL=/api
```

## Production-деплой

```bash
cd ~/deploy/app
git pull --ff-only origin main
docker compose -f docker-compose.prod.yml build frontend backend
docker compose -f docker-compose.prod.yml up -d frontend backend
docker compose -f docker-compose.prod.yml ps
```

Проверка после деплоя:

```bash
curl -sk https://ab-event.pro/api/events | head -c 2000
curl -sk https://ab-event.pro/api/events/highlights | head -c 2000
docker compose -f docker-compose.prod.yml logs --tail=200 backend
```

## Безопасность

- Не коммитьте реальные `.env`.
- Не добавляйте токены, пароли, приватные ключи и SQL-дампы в Git.
- После попадания токена в Git, чат или скриншот перевыпустите его.
- В `.env.example` оставляйте только пустые значения токенов и демонстрационные заглушки.
