# АБ Партнер — Календарь бухгалтеров

Monorepo-проект для публичной витрины бухгалтерских мероприятий, календаря, Telegram/API-импорта, напоминаний, административной панели и аналитики посещаемости.

## Что внутри
- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Backend**: NestJS, Prisma, PostgreSQL, JWT
- **Интеграции**: Telegram-канал, API-коннекторы, Telegram-бот для напоминаний
- **Админка**: события, импорт, reminders, аналитика, посещаемость
- **Публичная витрина**: highlights, фильтры по формату/городу/теме/источнику/периоду, компактный режим

## Структура
```text
apps/
  frontend/
  backend/
```

## Быстрый запуск
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
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/ab_partner_calendar?schema=public
JWT_SECRET=change_me_super_secret
BACKEND_PORT=4000
NEXT_PUBLIC_API_URL=http://localhost:4000/api
ADMIN_EMAIL=admin@ab-partner.ru
ADMIN_PASSWORD=Admin12345!
TELEGRAM_CHANNEL_URL=https://t.me/ab_afisha_buh
TELEGRAM_CHANNEL_USERNAME=ab_afisha_buh
TELEGRAM_BOT_DEEP_LINK=https://t.me/PartnersTogether_bot
TELEGRAM_SYNC_ENABLED=true
SOURCE_CONNECTORS_JSON=[]
```

## Основные команды
```bash
npm run dev        # frontend + backend
npm run generate   # prisma generate
npm run migrate    # prisma migrate dev --name init
npm run seed       # тестовые данные
npm run lint       # typecheck frontend + backend
npm run build      # production build
```

## Что умеет Telegram-парсер
Поддерживаются два основных формата:

### 1) Подборка недели
Каждый блок вида:
```text
20 апреля, 10:30 | Онлайн, бесплатно
Название события
Описание события
```
будет распознан как отдельное событие.

### 2) Одиночный пост
Форматы с маркерами:
- `Когда:`
- `Формат:`
- `Где:`
- `Стоимость:`
- `#Хит`

Тег `#Хит` помечает событие как важное и отправляет его в блок highlights.

## Внешние API-коннекторы
В `SOURCE_CONNECTORS_JSON` можно добавить JSON-массив коннекторов.

Пример:
```env
SOURCE_CONNECTORS_JSON=[{"id":"partner-api","name":"Partner API","type":"json-api","enabled":true,"url":"https://example.com/api/events","headers":{"X-API-Key":"secret-key"},"importantTag":"#Хит"}]
```

Поддерживаемые типы:
- `telegram-public-html`
- `json-api`

## Публичные API-методы
```http
POST /api/public/sync
GET  /api/public/connectors
POST /api/public/visit
```

## Админские API-методы
```http
GET  /api/admin/dashboard
GET  /api/admin/analytics
GET  /api/admin/imports
POST /api/admin/imports/sync
POST /api/admin/imports/:id/confirm
POST /api/admin/imports/:id/reject
```

## Тестовый доступ в админку
```text
Email: admin@ab-partner.ru
Password: Admin12345!
```

## Подготовка к GitHub
В репозитории уже добавлены:
- `.gitignore`
- `.editorconfig`
- GitHub Actions workflow `.github/workflows/ci.yml`

## Ограничения
Текущий Telegram-коннектор использует публичную HTML-ленту канала. Для приватных каналов и production-режима лучше использовать промежуточный ingestion API или worker через Telegram Bot API / MTProto.

