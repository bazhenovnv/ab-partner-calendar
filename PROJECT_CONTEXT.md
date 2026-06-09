# PROJECT_CONTEXT — АБ | Афиша

Этот файл фиксирует фактическую архитектуру и эксплуатационные правила проекта. Не добавляйте сюда токены, пароли, приватные URL с ключами или содержимое production `.env`.

## Основные точки

- Production: `https://ab-event.pro`
- GitHub: `bazhenovnv/ab-partner-calendar`
- Основная ветка: `main`
- Production-каталог на VPS: `~/deploy/app`
- Production-база PostgreSQL: `app`
- Основная таблица мероприятий: `public."Event"`

## Технологический стек

- Frontend: Next.js 15, React, TypeScript, Tailwind CSS.
- Backend: NestJS, Prisma, PostgreSQL, JWT.
- Reverse proxy: Nginx.
- Контейнеризация: Docker Compose.

## Разделение интеграций

### Max — основной источник мероприятий

События должны загружаться из Max API через `SourceConnectorsService`.

Ключевые env-переменные:

```env
MAX_SYNC_ENABLED=true
MAX_BOT_TOKEN=<secret>
MAX_CHAT_ID=<secret-or-configured-id>
MAX_CHANNEL_URL=<public-channel-url>
MAX_SYNC_INTERVAL_MINUTES=60
MAX_MESSAGES_COUNT=50
```

Поток данных:

```text
Max API
  -> SourceConnectorsService
  -> журнал импорта TelegramImport (историческое имя модели)
  -> Event
  -> GET /api/events
  -> frontend
```

### Telegram — только бот напоминаний и рассылки

Telegram Bot API используется отдельно от импорта событий:

```text
Telegram Bot API
  -> TelegramService
  -> TelegramSubscriber
  -> Reminder
  -> Broadcast / BroadcastDelivery
```

Ключевые env-переменные:

```env
TELEGRAM_BOT_TOKEN=<secret>
TELEGRAM_BOT_POLLING=true
TELEGRAM_BOT_ADMIN_IDS=
TELEGRAM_BOT_ADMIN_USERNAMES=
NEXT_PUBLIC_TELEGRAM_BOT_DEEP_LINK=<public-bot-link>
```

Недоступность `api.telegram.org:443` не должна мешать загрузке или отображению событий из Max. При сетевой недоступности Telegram временно не работают подписки, напоминания и рассылки.

### Legacy Telegram-импорт событий

Старый импорт событий из публичного Telegram-канала сохранен в коде только для обратной совместимости. В текущей конфигурации он должен быть отключен:

```env
TELEGRAM_SYNC_ENABLED=false
TELEGRAM_CHANNEL_URL=
```

Не включайте его одновременно с Max без отдельной проверки дедупликации.

## Синхронизация событий

Рабочие способы синхронизации:

1. Автоматически при старте backend, если `AUTO_SYNC_ON_START=true`.
2. По таймеру backend.
3. Вручную через защищенный endpoint админки:

```http
POST /api/admin/imports/sync
Authorization: Bearer <JWT>
```

Публичный endpoint `POST /api/public/sync` не должен обращаться к источникам. Он оставлен только как совместимый no-op для старых frontend-сборок.

## Локальный запуск

### Docker Compose

```bash
cp .env.example .env
# Заполнить секреты только в .env
docker compose up -d --build
docker compose ps
```

Локальные адреса:

```text
Frontend: http://127.0.0.1:3000
Backend:  http://127.0.0.1:4000/api
Postgres: 127.0.0.1:5432
```

Локальный `docker-compose.yml` подключает `.env` для backend и принудительно устанавливает:

```env
TELEGRAM_SYNC_ENABLED=false
```

### Без Docker

```bash
npm install
npm run generate
npm run migrate
npm run seed
npm run dev
```

## Production-деплой

Стандартное обновление VPS:

```bash
cd ~/deploy/app
git pull --ff-only origin main
docker compose -f docker-compose.prod.yml build frontend backend
docker compose -f docker-compose.prod.yml up -d frontend backend
docker compose -f docker-compose.prod.yml ps
```

Если изменены только frontend CSS или frontend-компоненты:

```bash
cd ~/deploy/app
git pull --ff-only origin main
docker compose -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.prod.yml up -d frontend
```

## Проверки после деплоя

```bash
curl -sk https://ab-event.pro/api/events | head -c 2000
curl -sk https://ab-event.pro/api/events/highlights | head -c 2000
docker compose -f docker-compose.prod.yml logs --tail=200 backend
```

Проверка числа мероприятий в production-базе:

```bash
docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U postgres -d app -c \
  'select count(*) as events_total from public."Event";'
```

## UI-правила

- Основной стиль интерфейса: черный, белый, мятный; персиковая обводка активного состояния.
- Кнопки используют объемный стиль и глянцевый hover-блик, аналогичный карточкам раздела «Подборки».
- Не применяйте новые глобальные правила вида `body button { position: relative !important; }` без исключений.
- Критические исключения:
  - `.important-nav-btn` внутри hero-слайдера должны оставаться `position: absolute`;
  - `.calendar-day-popover-portal` должен оставаться `position: fixed`;
  - `.dialog-close-button` должен оставаться закреплен в правом верхнем углу модального окна;
  - `.compact-event-main-button` — прозрачная внутренняя hit-area карточки, а не самостоятельная объемная кнопка.
- Совместимые переопределения размещаются в `apps/frontend/app/hotfix.css`, который подключается после `globals.css`.

## Безопасность

- Реальные `.env` не коммитить.
- В `.env.example` хранить только пустые значения токенов и демонстрационные заглушки.
- После попадания токена в Git или чат токен перевыпустить.
- SQL-бэкапы, дампы, ключи, сертификаты и логи не коммитить.

## Известные особенности

- Prisma-модель `TelegramImport` используется как общий журнал импорта, несмотря на историческое имя.
- Telegram Bot polling зависит от исходящего доступа VPS к `api.telegram.org:443`.
- На VPS может быть внешняя фильтрация Telegram, даже если UFW и локальные nftables разрешают трафик.
