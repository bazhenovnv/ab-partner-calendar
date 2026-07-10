# STAGING SETUP — test.ab-event.pro

**Цель:** запустить `https://test.ab-event.pro` для визуальной проверки дизайна.  
**Дата:** 2026-07-10  
**Контекст:** Stage 44A — Pixel Perfect Infrastructure Prerequisite

---

## Диагностика (статический анализ из репозитория)

| Компонент | Статус |
|-----------|--------|
| Nginx HTTP-блок (port 80) для `test.ab-event.pro` | ✅ Настроен |
| Nginx HTTPS-блок (port 443) для `test.ab-event.pro` | ✅ Добавлен в `prod.conf` |
| TLS-сертификат `/etc/letsencrypt/live/test.ab-event.pro/` | ❌ Нужно выпустить |
| DNS A-запись `test.ab-event.pro` | ❓ Нужно проверить |
| Docker-контейнеры | ❓ Нужно проверить на сервере |
| HSTS `includeSubDomains` на `ab-event.pro` | ⚠️ Браузеры требуют HTTPS для субдоменов |

**Корень проблемы:** отсутствует TLS-сертификат для `test.ab-event.pro`.  
Nginx-конфиг обновлён в репозитории — после деплоя нужно только выпустить сертификат.

---

## Что изменено в репозитории

**Файл:** `infra/nginx/conf.d/prod.conf`

1. **HTTP-блок test.ab-event.pro** — изменён:
   - Добавлен `location /.well-known/acme-challenge/` для webroot-challenge certbot
   - Добавлен `return 301 https://...` для редиректа после выпуска сертификата

2. **HTTPS-блок test.ab-event.pro** — раскомментирован и дополнен:
   - `ssl_certificate /etc/letsencrypt/live/test.ab-event.pro/fullchain.pem`
   - `ssl_certificate_key /etc/letsencrypt/live/test.ab-event.pro/privkey.pem`
   - Все необходимые заголовки (CSP, X-Frame-Options, Referrer-Policy)
   - `proxy_pass http://frontend` на все запросы
   - `/api/` проксируется на backend
   - HSTS с коротким `max-age=3600` (без `includeSubDomains`) — безопасно для staging

**Файл:** `docker-compose.prod.yml`
- Добавлен volume `/var/www/certbot:/var/www/certbot:ro` для nginx

---

## Порядок действий на сервере

### Шаг 1 — Проверить DNS

```bash
dig test.ab-event.pro A +short
# Ожидается: IP сервера Timeweb Cloud (тот же, что и у ab-event.pro)

dig ab-event.pro A +short
# Сравнить IP
```

**Если DNS-записи нет** — создать A-запись в панели DNS (на регистраторе или Timeweb):
```
test.ab-event.pro.   A   <IP_сервера>   TTL 300
```
Подождать распространения (5–15 минут).

---

### Шаг 2 — Задеплоить обновлённый nginx-конфиг

```bash
cd /path/to/project   # путь к репозиторию на сервере

git pull origin claude/ab-afisha-architecture-plan-805f5o

# Создать директорию для webroot challenge
mkdir -p /var/www/certbot

# Перезапустить nginx (новый volume + обновлённый conf)
# Сертификат ещё не выпущен, поэтому сразу запустить nginx нельзя!
# Временно убрать HTTPS-блок test.ab-event.pro из conf, запустить, затем вернуть.
```

**ВАЖНО:** nginx сейчас не запустится с HTTPS-блоком до выпуска сертификата.  
Поэтому порядок: сначала certbot → затем nginx reload.

**Вариант A — ОБЫЧНЫЙ (nginx не перезапускать):**
```bash
# Только обновить конфиг + volume (nginx уже запущен, только HTTP-блок активен)
docker compose -f docker-compose.prod.yml up -d --no-deps nginx
```

**Вариант B — ЕСЛИ nginx не запустится из-за отсутствия сертификата:**
```bash
# Убрать HTTPS-блок из prod.conf временно,
# запустить nginx,
# затем выпустить сертификат,
# затем вернуть HTTPS-блок и перезагрузить nginx.
```

---

### Шаг 3 — Выпустить сертификат

```bash
# Webroot метод (предпочтительный)
certbot certonly \
  --webroot \
  --webroot-path /var/www/certbot \
  -d test.ab-event.pro \
  --non-interactive \
  --agree-tos \
  --email admin@ab-event.pro

# Ожидается:
# Successfully received certificate.
# Certificate is saved at: /etc/letsencrypt/live/test.ab-event.pro/fullchain.pem
```

**Альтернатива (если webroot не работает) — standalone метод:**
```bash
# Временно остановить nginx
docker compose -f docker-compose.prod.yml stop nginx

# Выпустить сертификат standalone
certbot certonly \
  --standalone \
  -d test.ab-event.pro \
  --non-interactive \
  --agree-tos \
  --email admin@ab-event.pro

# Запустить nginx обратно
docker compose -f docker-compose.prod.yml start nginx
```

---

### Шаг 4 — Проверить конфиг и перезагрузить nginx

```bash
# Проверить конфиг после выпуска сертификата
docker compose -f docker-compose.prod.yml exec nginx nginx -t
# Ожидается: nginx: configuration file ... syntax is OK

# Если OK — перезагрузить nginx
docker compose -f docker-compose.prod.yml exec nginx nginx -s reload

# Проверить статус
docker compose -f docker-compose.prod.yml ps
```

---

### Шаг 5 — Проверить доступность

```bash
# Проверить HTTPS
curl -I https://test.ab-event.pro

# Ожидается:
# HTTP/2 200
# content-type: text/html; charset=utf-8
# strict-transport-security: max-age=3600
# x-frame-options: SAMEORIGIN

# Проверить редирект с HTTP
curl -I http://test.ab-event.pro
# Ожидается: HTTP/1.1 301 Moved Permanently
#             Location: https://test.ab-event.pro/
```

---

### Шаг 6 — Проверить контейнеры

```bash
docker compose -f docker-compose.prod.yml ps
# Все контейнеры должны быть в статусе "Up (healthy)" или "Up"

docker compose -f docker-compose.prod.yml logs nginx --tail=20
docker compose -f docker-compose.prod.yml logs frontend --tail=20
```

---

## Автопродление сертификата

Добавить в crontab (root) на сервере:

```bash
crontab -e
# Добавить:
0 3 * * * certbot renew --quiet && docker compose -f /path/to/project/docker-compose.prod.yml exec nginx nginx -s reload
```

---

## После завершения

- `https://test.ab-event.pro` открывается в браузере
- Header отображается (статус: IMPLEMENTED, NOT VISUALLY APPROVED)
- Hero-блок заблокирован до утверждения Header
- Можно проводить ручную визуальную проверку против макета `{D2CF8AB4-3632-427C-B53C-4427C836662D}.png`
