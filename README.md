# АБ Партнер — Календарь бухгалтеров

Monorepo-проект для публичной витрины бухгалтерских мероприятий, календаря, Telegram/API-импорта, напоминаний, административной панели и аналитики посещаемости.

## Что внутри

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS.
- **Backend**: NestJS, Prisma, PostgreSQL, JWT.
- **Интеграции**: Telegram-канал `https://t.me/ab_afisha_buh`, внешние JSON API-коннекторы, опциональный Telegram-бот для напоминаний.
- **Админка**: авторизация, мероприятия, импорт, категории, reminders, пользователи, dashboard, аналитика.
- **Публичная витрина**: highlights, календарь, фильтры, компактный режим, ICS-экспорт.

## Структура

```text
apps/
  frontend/
  backend/
nginx/
docker-compose.yml
docker-compose.prod.yml
```

## Быстрый запуск через Docker

```bash
cp .env.example .env
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
curl -X POST http://127.0.0.1:4000/api/public/sync
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

```env
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/app
JWT_SECRET=change_me
OPENAI_API_KEY=
ADMIN_EMAIL=admin@ab-partner.ru
ADMIN_PASSWORD=Admin12345!

TELEGRAM_SYNC_ENABLED=true
TELEGRAM_CHANNEL_URL=https://t.me/ab_afisha_buh
AUTO_SYNC_ON_START=true
TELEGRAM_SYNC_INTERVAL_MINUTES=60
TELEGRAM_BOT_TOKEN=
TELEGRAM_BOT_POLLING=true
IMPORT_FALLBACK_ENABLED=false
SOURCE_CONNECTORS_JSON=[]

NEXT_PUBLIC_API_URL=/api
NEXT_PUBLIC_TELEGRAM_BOT_DEEP_LINK=https://t.me/PartnersTogether_bot
```

Для локального frontend без Nginx используется `apps/frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
NEXT_PUBLIC_TELEGRAM_BOT_DEEP_LINK=https://t.me/PartnersTogether_bot
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

## Тестовый доступ в админку

```text
URL:      http://127.0.0.1:3000/admin/login
Email:    admin@ab-partner.ru
Password: Admin12345!
```

## Публичные API-методы

```http
GET  /api/events
GET  /api/events/highlights
GET  /api/events/:slug
GET  /api/events/:slug/ics
GET  /api/categories
GET  /api/feed
POST /api/public/sync
GET  /api/public/connectors
GET  /api/public/collections
POST /api/public/visit
POST /api/reminders
POST /api/auth/login
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

## Telegram-импорт

Поддерживаются:

### 1. Одиночный пост

Форматы с маркерами:

```text
Мероприятие
Название события
Когда: 20 апреля 10:30
Где: Онлайн
Формат: онлайн
#Хит
```

### 2. Подборка событий в одном посте

Каждый блок с датой распознаётся как отдельное событие:

```text
20 апреля, 10:30 | Онлайн, бесплатно
Название события
Описание события

22 апреля, 15:00 | Краснодар
Название второго события
Описание второго события
```

Тег `#Хит`, налоговые/бухгалтерские ключевые слова и первые посты канала помечают событие как важное.

## Внешние API-коннекторы

В `SOURCE_CONNECTORS_JSON` можно добавить JSON-массив коннекторов.

```env
SOURCE_CONNECTORS_JSON=[{"id":"partner-api","name":"Partner API","type":"json-api","enabled":true,"url":"https://example.com/api/events","headers":{"X-API-Key":"secret-key"},"importantTag":"#Хит"}]
```

Поддерживаемые типы:

```text
telegram-public-html
json-api
```

## Telegram-бот для напоминаний

Если задан `TELEGRAM_BOT_TOKEN`, backend запускает bot polling и обрабатывает deep link вида:

```text
https://t.me/<bot>?start=afisha_<eventId>
```

Пользователь выбирает интервал напоминания, после чего запись сохраняется в таблицу `Reminder`.

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

## Проверка после исправлений

В этой версии подключены ранее отсутствовавшие модули backend:

```text
AuthModule
UsersModule
CategoriesModule
RemindersModule
DashboardModule
AnalyticsModule
AdminEventsController
TelegramService с опциональным bot polling
```

Также исправлены:

```text
единый API-префикс /api
CORS
backend start: node dist/src/main.js
admin events CRUD
admin imports sync/confirm/reject
feed page
admin categories page
dashboard stats
analytics summary
локальный Docker API URL
Nginx proxy_pass для /api
```
