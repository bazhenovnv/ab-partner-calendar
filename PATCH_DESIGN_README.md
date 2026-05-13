# Design patch: logo + header + reminders

Что изменено:

1. Верхняя панель очищена: убрана текстовая подпись рядом с логотипом.
2. Добавлен новый логотип в `apps/frontend/public/logo-ab-partner.png`.
3. Кнопка `Напомнить` убрана из верхней панели.
4. В верхнюю панель добавлена кнопка `Стать партнером` со ссылкой `https://ab-buhpartner.ru`.
5. Создан общий компонент `ReminderButton`.
6. Кнопка `Напомнить` добавлена:
   - в важные события (`HighlightCarousel`);
   - в список событий выбранного дня календаря;
   - в детальную карточку выбранного события календаря;
   - в компактный список событий.
7. Исправлен frontend-порт Next.js: `3000` вместо `3001`.
8. Исправлен дефолтный API URL frontend: `/api` для production через nginx.
9. Добавлен `docker-compose.prod.yml` для production-запуска.
10. Обновлен `nginx/default.conf` под HTTPS, `/api` proxy и домен `ab-event.pro`.

Команды для запуска на сервере:

```bash
cd ~/deploy/app

docker compose -f docker-compose.prod.yml down
docker compose -f docker-compose.prod.yml up -d --build
```

Команды для локального запуска через Docker:

```bash
cd <папка проекта>

docker compose down
docker compose up -d --build
```

Важно:

- `.env`, `.env.local`, `.git`, `.next`, `node_modules` в чистый архив не включены.
- На сервере `.env` нужно хранить отдельно в `/root/deploy/app/.env`.
