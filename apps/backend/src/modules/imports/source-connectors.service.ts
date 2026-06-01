import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../services/prisma.service';

type ConnectorType = 'telegram-public-html' | 'json-api' | 'max-api';

type ConnectorConfig = {
  id: string;
  name: string;
  type: ConnectorType;
  enabled: boolean;
  channelUrl?: string;
  url?: string;
  method?: 'GET' | 'POST';
  headers?: Record<string, string>;
  importantTag?: string;
  chatId?: string;
};

type ExternalEvent = {
  externalId: string;
  title: string;
  description: string;
  startAt?: Date;
  endAt?: Date;
  location?: string;
  sourceUrl: string;
  imageUrl?: string;
  tags?: string[];
  isImportant?: boolean;
  format?: 'ONLINE' | 'OFFLINE' | 'HYBRID';
};

const MONTHS: Record<string, number> = {
  января: 0,
  февраля: 1,
  марта: 2,
  апреля: 3,
  мая: 4,
  июня: 5,
  июля: 6,
  августа: 7,
  сентября: 8,
  октября: 9,
  ноября: 10,
  декабря: 11,
};

const IMPORTANT_KEYWORDS = [
  /#хит/iu,
  /отч[её]т/iu,
  /ндс/iu,
  /ндфл/iu,
  /налог/iu,
  /провер/iu,
  /усн/iu,
  /54\s*-?\s*фз/iu,
  /бухгалтер/iu,
  /конференц/iu,
  /клерк/iu,
];

@Injectable()
export class SourceConnectorsService implements OnModuleInit {
  private readonly logger = new Logger(SourceConnectorsService.name);
  private syncTimer?: NodeJS.Timeout;
  private syncInProgress = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  onModuleInit() {
    const autoSync = this.config.get<string>('AUTO_SYNC_ON_START', 'true') !== 'false';

    const intervalMinutes = Number(
      this.config.get<string>('SYNC_INTERVAL_MINUTES') ||
        this.config.get<string>('TELEGRAM_SYNC_INTERVAL_MINUTES') ||
        this.config.get<string>('MAX_SYNC_INTERVAL_MINUTES') ||
        '60',
    );

    if (autoSync) {
      setTimeout(() => {
        this.syncAll().catch((error) => this.logger.warn(`Автосинхронизация не выполнена: ${(error as Error).message}`));
      }, 2500);
    }

    if (Number.isFinite(intervalMinutes) && intervalMinutes > 0) {
      this.syncTimer = setInterval(() => {
        this.syncAll().catch((error) => this.logger.warn(`Плановая синхронизация не выполнена: ${(error as Error).message}`));
      }, intervalMinutes * 60 * 1000);
      this.syncTimer.unref?.();
    }
  }

  listConnectors() {
    return this.getConnectors();
  }

  private getConnectors(): ConnectorConfig[] {
    const connectors: ConnectorConfig[] = [];

    const telegramSyncEnabled = this.config.get<string>('TELEGRAM_SYNC_ENABLED', 'true') !== 'false';
    const telegramUrl = this.config.get<string>('TELEGRAM_CHANNEL_URL', 'https://t.me/ab_afisha_buh');

    connectors.push({
      id: 'telegram-main',
      name: 'АБ Афиша Бухгалтера / Telegram',
      type: 'telegram-public-html',
      enabled: telegramSyncEnabled,
      channelUrl: telegramUrl,
      importantTag: '#Хит',
    });

    const maxSyncEnabled = this.config.get<string>('MAX_SYNC_ENABLED', 'false') === 'true';
    const maxToken = this.config.get<string>('MAX_BOT_TOKEN', '').trim();
    const maxChatId = this.config.get<string>('MAX_CHAT_ID', '').trim();
    const maxChannelUrl = this.config.get<string>(
      'MAX_CHANNEL_URL',
      'https://max.ru/join/LNPW5HIAqvWwUH1vQtB5V1kytLpmG18IsNURG4is4B0',
    );

    connectors.push({
      id: 'max-main',
      name: 'АБ Афиша Бухгалтера / MAX',
      type: 'max-api',
      enabled: maxSyncEnabled && Boolean(maxToken) && Boolean(maxChatId),
      channelUrl: maxChannelUrl,
      chatId: maxChatId,
      importantTag: '#Хит',
    });

    if (maxSyncEnabled && (!maxToken || !maxChatId)) {
      this.logger.warn('MAX_SYNC_ENABLED=true, но MAX_BOT_TOKEN или MAX_CHAT_ID не заданы. MAX-коннектор отключён.');
    }

    const raw = this.config.get<string>('SOURCE_CONNECTORS_JSON', '[]');
    try {
      const parsed = JSON.parse(raw) as Partial<ConnectorConfig>[];
      for (const item of parsed) {
        if (!item || !item.id || !item.type) continue;
        connectors.push({
          id: item.id,
          name: item.name || item.id,
          type: item.type as ConnectorType,
          enabled: item.enabled !== false,
          channelUrl: item.channelUrl,
          url: item.url,
          method: item.method === 'POST' ? 'POST' : 'GET',
          headers: item.headers || {},
          importantTag: item.importantTag || '#Хит',
          chatId: item.chatId,
        });
      }
    } catch (error) {
      this.logger.warn(`SOURCE_CONNECTORS_JSON не распарсен: ${(error as Error).message}`);
    }

    return connectors;
  }

  private normalizeEventText(text: string): string {
    return text
      .replace(/([0-9])\uFE0F?\u20E3/g, '$1')
      .replace(/\u00A0/g, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n');
  }

  private decodeHtml(value: string): string {
    return this.normalizeEventText(value)
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<a[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi, '$2')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&laquo;/g, '«')
      .replace(/&raquo;/g, '»')
      .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
      .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCharCode(parseInt(code, 16)))
      .replace(/\u00A0/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private cleanLines(text: string): string[] {
    return this.normalizeEventText(text)
      .split('\n')
      .map((line) => line.replace(/\u00A0/g, ' ').trim())
      .filter(Boolean)
      .filter((line) => !/^AB\s*\|/i.test(line))
      .filter((line) => !/^АБ\s*\|/i.test(line))
      .filter((line) => !/^please open telegram/i.test(line))
      .filter((line) => !/^view in telegram/i.test(line));
  }

  private extractTags(text: string): string[] {
    const matches = text.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
    return Array.from(new Set(matches.map((item) => item.replace(/^#/, ''))));
  }

  private deriveFormat(text: string): 'ONLINE' | 'OFFLINE' | 'HYBRID' {
    const lower = text.toLowerCase();
    if (lower.includes('гибрид')) return 'HYBRID';
    if (
      lower.includes('офлайн') ||
      lower.includes('оффлайн') ||
      lower.includes('москва') ||
      lower.includes('краснодар') ||
      lower.includes('екатеринбург') ||
      lower.includes('ростов')
    ) {
      return 'OFFLINE';
    }
    return 'ONLINE';
  }

  private normalizeFormatByLocation(
    format: 'ONLINE' | 'OFFLINE' | 'HYBRID',
    location: string | undefined,
    text: string,
  ): 'ONLINE' | 'OFFLINE' | 'HYBRID' {
    const source = `${location || ''}\n${text || ''}`.toLowerCase();

    const hasPhysicalAddress =
      /(санкт-петербург|спб|москва|екатеринбург|краснодар|новосибирск|казань|офис|аудитори|зал|конференц|пространств|бц|бизнес-центр|переул|проспект|улиц|ул\.|дом\b|д\.|строен|корпус|этаж)/iu.test(source);

    if (hasPhysicalAddress) return 'OFFLINE';
    return format;
  }

  private guessYear(monthIndex: number): number {
    const now = new Date();
    let year = now.getFullYear();
    if (monthIndex < now.getMonth() - 2) year += 1;
    return year;
  }

  private createMoscowDate(
    year: number,
    monthIndex: number,
    day: number,
    hours: number,
    minutes: number,
  ): Date {
    return new Date(Date.UTC(year, monthIndex, day, hours - 3, minutes, 0, 0));
  }

  private parseDateTimeRange(text: string): { startAt?: Date; endAt?: Date } {
    const normalized = this.normalizeEventText(text);

    const dotted = normalized.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4}).{0,40}?(\d{1,2}):(\d{2})(?:\s*[–—-]\s*(\d{1,2}):(\d{2}))?/u);
    if (dotted) {
      const [, dd, mm, yyyy, hh, min, endHh, endMin] = dotted;
      const year = yyyy.length === 2 ? `20${yyyy}` : yyyy;
      const startAt = this.createMoscowDate(Number(year), Number(mm) - 1, Number(dd), Number(hh), Number(min));
      const endAt = endHh ? this.createMoscowDate(Number(year), Number(mm) - 1, Number(dd), Number(endHh), Number(endMin)) : undefined;
      return { startAt, endAt };
    }

    const russianWithTime = normalized.match(/(?:когда\s*:\s*)?(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)[^\d]{0,40}(\d{1,2}):(\d{2})(?:\s*[–—-]\s*(\d{1,2}):(\d{2}))?/iu);
    if (russianWithTime) {
      const [, dd, monthRus, hh, min, endHh, endMin] = russianWithTime;
      const monthIndex = MONTHS[monthRus.toLowerCase()];
      const year = this.guessYear(monthIndex);
      const startAt = this.createMoscowDate(year, monthIndex, Number(dd), Number(hh), Number(min));
      const endAt = endHh ? this.createMoscowDate(year, monthIndex, Number(dd), Number(endHh), Number(endMin)) : undefined;
      return { startAt, endAt };
    }

    const russianNoTime = normalized.match(/(?:когда\s*:\s*)?(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/iu);
    if (russianNoTime) {
      const [, dd, monthRus] = russianNoTime;
      const monthIndex = MONTHS[monthRus.toLowerCase()];
      const year = this.guessYear(monthIndex);
      return { startAt: this.createMoscowDate(year, monthIndex, Number(dd), 10, 0) };
    }

    return {};
  }

  private parseLocation(text: string, format: 'ONLINE' | 'OFFLINE' | 'HYBRID'): string | undefined {
    const patterns = [/где\s*:\s*(.+)/iu, /место\s*:\s*(.+)/iu, /адрес\s*:\s*(.+)/iu];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match?.[1]) return match[1].split('\n')[0].trim();
    }

    if (format === 'ONLINE') return 'Онлайн';
    return undefined;
  }

  private normalizeTitle(text: string): string {
    return text
      .replace(/\([^)]*https?:\/\/[^)]*\)/g, '')
      .replace(/^[#>*•\-\s]+/, '')
      .replace(/^мероприятие$/iu, '')
      .replace(/^вебинар$/iu, '')
      .trim()
      .slice(0, 180);
  }

  private fallbackTitle(lines: string[]): string {
    const blacklist = [
      /^аб\s*афиша/iu,
      /^а\s*б\s*афиша/iu,
      /^что вас жд[её]т/iu,
      /^мероприятие$/iu,
      /^вебинар$/iu,
      /^когда\s*:/iu,
      /^где\s*:/iu,
      /^стоимость\s*:/iu,
      /^формат\s*:/iu,
      /^источник$/iu,
      /^зарегистрироваться/i,
      /^заявка/i,
      /^🔥/u,
      /^➖/u,
      /^\[/u,
    ];

    const line = lines.find((item) => item && !blacklist.some((rule) => rule.test(item)) && !item.startsWith('#'));
    return this.normalizeTitle(line || 'Импортированное мероприятие');
  }

  private sanitizeImportedText(text: string): string {
    return this.normalizeEventText(text)
      .replace(/https?:\/\/\S+/g, '')
      .replace(/#[\p{L}\p{N}_-]+/gu, '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean)
      .filter((line) => !/^(Источник|Телеграм|Telegram|MAX|Зарегистрироваться|Регистрация)\b/iu.test(line))
      .filter((line) => !/зарегистрироваться|регистрация|телеграм|telegram|\bmax\b/iu.test(line))
      .filter((line) => !/(?:^|[?&])q=|%[0-9a-f]{2}/iu.test(line))
      .filter((line) => !/^\(?\??\)?$/.test(line))
      .join('\n')
      .replace(/\(\s*\)/g, '')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private safeTextForDb(value: string | null | undefined, maxLength = 5000): string {
    return String(value || '')
      .replace(/\u0000/g, '')
      .replace(/\\x[0-9a-f]?/giu, '')
      .replace(/\\u[0-9a-f]{0,3}(?![0-9a-f])/giu, '')
      .replace(/[\u0001-\u0008\u000B\u000C\u000E-\u001F\u007F]/gu, ' ')
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
      .slice(0, maxLength);
  }

  private safeTagsForDb(tags: string[]): string[] {
    return Array.from(
      new Set(
        tags
          .map((tag) =>
            this.safeTextForDb(String(tag || ''), 80)
              .replace(/[{}"\\]/g, '')
              .replace(/^#/, '')
              .trim(),
          )
          .filter(Boolean),
      ),
    ).slice(0, 12);
  }

  private isImportant(text: string, tags: string[], importantTag: string, indexFromChannel: number) {
    void text;
    void indexFromChannel;

    const normalizedTag = importantTag.replace('#', '').trim().toLowerCase();

    return tags.some((tag) => {
      const normalized = String(tag || '').replace('#', '').trim().toLowerCase();
      return normalized === normalizedTag;
    });
  }

  private parseDigestHeader(line: string): {
    startAt?: Date;
    endAt?: Date;
    location?: string;
    format?: 'ONLINE' | 'OFFLINE' | 'HYBRID';
  } | null {
    const normalized = this.normalizeEventText(line)
      .replace(/[🔥🗓📅]/gu, '')
      .replace(/\s+/g, ' ')
      .trim();

    const match = normalized.match(
      /^(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)(?:\s+\d{4})?\s*\|\s*(\d{1,2})[:.](\d{2})(?:\s*[–—-]\s*(\d{1,2})[:.](\d{2}))?\s*\|\s*(.+)$/iu,
    );

    if (!match) return null;

    const [, dd, monthRus, hh, min, endHh, endMin, placeRaw] = match;
    const monthIndex = MONTHS[monthRus.toLowerCase()];
    if (monthIndex === undefined) return null;

    const year = this.guessYear(monthIndex);
    const startAt = this.createMoscowDate(year, monthIndex, Number(dd), Number(hh), Number(min));
    const endAt = endHh
      ? this.createMoscowDate(year, monthIndex, Number(dd), Number(endHh), Number(endMin))
      : undefined;

    const place = String(placeRaw || '')
      .replace(/[.;]+$/g, '')
      .trim();

    let format: 'ONLINE' | 'OFFLINE' | 'HYBRID' = 'ONLINE';

    if (/гибрид|hybrid/iu.test(place)) {
      format = 'HYBRID';
    } else if (/онлайн|online/iu.test(place)) {
      format = 'ONLINE';
    } else if (place) {
      format = 'OFFLINE';
    }

    return {
      startAt,
      endAt,
      location: format === 'ONLINE' ? 'Онлайн' : place || undefined,
      format,
    };
  }

  private isCollectionHeader(line: string) {
    const normalized = this.normalizeEventText(line).trim();

    if (this.parseDigestHeader(normalized)) return true;

    return /^(?:\d{1,2}[.\-/]\d{1,2}(?:[.\-/]\d{2,4})?|\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря))[^\n]{0,120}(?:\d{1,2}:\d{2})?/iu.test(
      normalized,
    );
  }

  private parseTelegramCollection(lines: string[], baseId: string, sourceUrl: string, importantTag: string, indexFromChannel: number): ExternalEvent[] {
    const headerIndexes = lines
      .map((line, index) => ({ line, index }))
      .filter(({ line }) => this.isCollectionHeader(line))
      .map(({ index }) => index);

    if (headerIndexes.length < 2) return [];

    const events: ExternalEvent[] = [];

    for (let i = 0; i < headerIndexes.length; i += 1) {
      const startIndex = headerIndexes[i];
      const endIndex = headerIndexes[i + 1] ?? lines.length;
      const block = lines.slice(startIndex, endIndex).filter(Boolean);
      const header = block[0] || '';
      const digestHeader = this.parseDigestHeader(header);

      const titleLine = block.find(
        (line, idx) =>
          idx > 0 &&
          !/^стоимость\s*:/iu.test(line) &&
          !/^формат\s*:/iu.test(line) &&
          !/^где\s*:/iu.test(line) &&
          !/^место\s*:/iu.test(line) &&
          !/^адрес\s*:/iu.test(line) &&
          !line.startsWith('#'),
      );

      const title = this.normalizeTitle(titleLine || this.fallbackTitle(block));
      if (!title) continue;

      const joined = block.join('\n');

      const headerDateInfo = this.parseDateTimeRange(header);
      const joinedDateInfo = headerDateInfo.startAt ? headerDateInfo : this.parseDateTimeRange(joined);

      const startAt = digestHeader?.startAt || joinedDateInfo.startAt;
      const endAt = digestHeader?.endAt || joinedDateInfo.endAt;

      if (!startAt) continue;

      const parsedFormat = digestHeader?.format || this.deriveFormat(joined);
      const location = digestHeader?.location || this.parseLocation(joined, parsedFormat);
      const format = this.normalizeFormatByLocation(parsedFormat, location, joined);
      const tags = this.extractTags(joined);

      events.push({
        externalId: `${baseId}-${i + 1}`,
        title,
        description: joined,
        startAt,
        endAt,
        location,
        sourceUrl,
        tags,
        isImportant: this.isImportant(joined, tags, importantTag, indexFromChannel),
        format,
      });
    }

    return events;
  }

  private parseTelegramPost(rawText: string, baseId: string, sourceUrl: string, importantTag: string, indexFromChannel: number): ExternalEvent[] {
    const lines = this.cleanLines(rawText);
    if (!lines.length) return [];

    const collectionEvents = this.parseTelegramCollection(lines, baseId, sourceUrl, importantTag, indexFromChannel);
    if (collectionEvents.length) return collectionEvents;

    const joined = lines.join('\n');
    const dateInfo = this.parseDateTimeRange(joined);
    const parsedFormat = this.deriveFormat(joined);
    const location = this.parseLocation(joined, parsedFormat);
    const format = this.normalizeFormatByLocation(parsedFormat, location, joined);
    const tags = this.extractTags(joined);
    const markerIdx = lines.findIndex((line) => /^(мероприятие|вебинар)$/iu.test(line));
    const title = markerIdx >= 0 && lines[markerIdx + 1] ? this.normalizeTitle(lines[markerIdx + 1]) : this.fallbackTitle(lines);

    if (!title) return [];

    return [
      {
        externalId: baseId,
        title,
        description: joined,
        startAt: dateInfo.startAt,
        endAt: dateInfo.endAt,
        location,
        sourceUrl,
        tags,
        isImportant: this.isImportant(joined, tags, importantTag, indexFromChannel),
        format,
      },
    ];
  }

  private normalizeTelegramImageUrl(value?: string): string | undefined {
    if (!value) return undefined;

    const decoded = value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();

    if (!decoded) return undefined;
    if (decoded.startsWith('//')) return `https:${decoded}`;
    if (decoded.startsWith('/')) return `https://t.me${decoded}`;
    return decoded;
  }

  private extractTelegramImage(block: string): string | undefined {
    const patterns = [
      /background-image\s*:\s*url\(\s*['"]?([^'"\)]+)['"]?\s*\)/iu,
      /tgme_widget_message_photo_wrap[\s\S]*?background-image\s*:\s*url\(\s*['"]?([^'"\)]+)['"]?\s*\)/iu,
      /<img[^>]+src=["']([^"']+)["']/iu,
      /<img[^>]+data-src=["']([^"']+)["']/iu,
      /srcset=["']([^"'\s,]+)[^"']*["']/iu,
    ];

    for (const pattern of patterns) {
      const match = block.match(pattern);
      const image = this.normalizeTelegramImageUrl(match?.[1]);
      if (image) return image;
    }

    return undefined;
  }

  private extractMaxImage(attachments: unknown): string | undefined {
    if (!Array.isArray(attachments)) return undefined;

    for (const attachment of attachments) {
      const item = attachment as any;
      const payload = item?.payload || item;
      const url = payload?.url || payload?.photo?.url || payload?.image?.url || payload?.thumbnail?.url || payload?.preview?.url;

      if (typeof url === 'string' && url.trim()) return url.trim();
    }

    return undefined;
  }

  private extractMaxLinks(text: string, markup: unknown): string[] {
    if (!Array.isArray(markup)) return [];

    const links: string[] = [];
    for (const item of markup as any[]) {
      if (item?.type === 'link' && typeof item.url === 'string' && item.url.trim()) {
        links.push(item.url.trim());
      }
    }

    return Array.from(new Set(links)).filter((url) => !text.includes(url));
  }

  private extractMaxSourceUrl(
    channelUrl: string,
    message: any,
    body: any,
    links: string[],
  ): string {
    const candidates = [
      body?.permalink,
      message?.permalink,
      body?.link,
      message?.link,
      body?.url,
      message?.url,
      ...links,
    ]
      .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
      .map((value) => value.trim());

    const directMaxLink = candidates.find(
      (value) =>
        /^https?:\/\/(?:www\.)?max\.ru\//iu.test(value) &&
        !/\/join\//iu.test(value) &&
        !/\.(?:jpg|jpeg|png|webp|gif|svg)(?:\?|$)/iu.test(value),
    );

    return directMaxLink || channelUrl;
  }

  private async fetchWithRetry(url: string, init: RequestInit, attempts = 3): Promise<Response> {
    let lastError: unknown;

    for (let attempt = 1; attempt <= attempts; attempt += 1) {
      try {
        return await fetch(url, init);
      } catch (error) {
        lastError = error;
        if (attempt < attempts) {
          await new Promise((resolve) => setTimeout(resolve, attempt * 1500));
        }
      }
    }

    throw lastError instanceof Error ? lastError : new Error('fetch failed');
  }

  private async fetchTelegramPublic(connector: ConnectorConfig): Promise<ExternalEvent[]> {
    const normalized = (connector.channelUrl || 'https://t.me/ab_afisha_buh').replace(/\/$/, '');
    const publicFeedUrl = normalized.includes('/s/') ? normalized : normalized.replace('https://t.me/', 'https://t.me/s/');
    const sourceBaseUrl = normalized.replace('https://t.me/s/', 'https://t.me/');
    const response = await this.fetchWithRetry(publicFeedUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36',
        accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });
    if (!response.ok) throw new Error(`Не удалось получить канал ${publicFeedUrl}: HTTP ${response.status}`);

    const html = await response.text();
    const splitBlocks = html
      .split(/(?=<div class="tgme_widget_message_wrap\b)/gi)
      .filter((block) => /data-post="[^"]+"/i.test(block));
    const fallbackBlocks = Array.from(
      html.matchAll(/<div[^>]+data-post="[^"]+"[\s\S]*?(?=<div[^>]+data-post="[^"]+"|<\/main>|<\/body>|$)/gi),
    ).map((match) => match[0]);
    const blocks = splitBlocks.length ? splitBlocks : fallbackBlocks;
    const importantTag = connector.importantTag || '#Хит';

    this.logger.log(`Telegram ${publicFeedUrl}: html=${html.length}, blocks=${blocks.length}`);

    return blocks.slice(0, 80).flatMap((block, index): ExternalEvent[] => {
      const postMatch = block.match(/data-post="([^"]+)"/i);
      const textMatch = block.match(/<div class="[^"]*\btgme_widget_message_text\b[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
      const postImageUrl = this.extractTelegramImage(block);
      const rawText = this.decodeHtml(textMatch?.[1] || '');
      if (!postMatch || !rawText) return [];

      const sourcePostId = postMatch[1].split('/').pop() || postMatch[1];
      const sourceUrl = `${sourceBaseUrl}/${sourcePostId}`;
      const events = this.parseTelegramPost(rawText, sourcePostId, sourceUrl, importantTag, index);
      return events.map((item) => ({ ...item, imageUrl: item.imageUrl || postImageUrl }));
    });
  }

  private async fetchMaxApi(connector: ConnectorConfig): Promise<ExternalEvent[]> {
    const token = this.config.get<string>('MAX_BOT_TOKEN', '').trim();
    const chatId = connector.chatId || this.config.get<string>('MAX_CHAT_ID', '').trim();
    const channelUrl = connector.channelUrl || this.config.get<string>('MAX_CHANNEL_URL', '').trim() || 'https://max.ru';
    const count = Number(this.config.get<string>('MAX_MESSAGES_COUNT', '50'));

    if (!token) throw new Error('MAX_BOT_TOKEN не задан.');
    if (!chatId) throw new Error('MAX_CHAT_ID не задан.');

    const safeCount = Number.isFinite(count) && count > 0 ? Math.min(count, 100) : 50;
    const url = `https://platform-api.max.ru/messages?chat_id=${encodeURIComponent(chatId)}&count=${safeCount}`;

    const response = await this.fetchWithRetry(url, {
      headers: {
        Authorization: token,
        accept: 'application/json',
      },
    });

    if (!response.ok) {
      const body = await response.text().catch(() => '');
      throw new Error(`MAX API messages вернул HTTP ${response.status}: ${body.slice(0, 240)}`);
    }

    const payload = (await response.json()) as any;
    const messages = Array.isArray(payload?.messages)
      ? payload.messages
      : Array.isArray(payload?.items)
        ? payload.items
        : Array.isArray(payload)
          ? payload
          : [];

    const importantTag = connector.importantTag || '#Хит';

    this.logger.log(`MAX ${chatId}: messages=${messages.length}`);

    return messages.slice(0, 80).flatMap((message: any, index: number): ExternalEvent[] => {
      const body = message?.body || message?.message?.body || message;
      const rawText = String(body?.text || message?.text || '').trim();
      if (!rawText) return [];

      const externalId = String(body?.mid || body?.seq || message?.mid || message?.seq || `${chatId}-${index}`);
      const imageUrl = this.extractMaxImage(body?.attachments || message?.attachments);

      const links = this.extractMaxLinks(rawText, body?.markup || message?.markup);
      const rawTextWithLinks = links.length ? `${rawText}\n\n${links.join('\n')}` : rawText;

      const directSourceCandidates = [
        body?.link,
        message?.link,
        body?.url,
        message?.url,
        ...links,
      ]
        .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
        .map((value) => value.trim());

      const directSourceUrl =
        directSourceCandidates.find((value) => /^https?:\/\/(?:www\.)?max\.ru\//iu.test(value) && !/\/join\//iu.test(value)) ||
        directSourceCandidates.find((value) => /^https?:\/\/(?:www\.)?t\.me\//iu.test(value));

      const sourceUrl = directSourceUrl || (channelUrl.includes('#') ? channelUrl : `${channelUrl}#${encodeURIComponent(externalId)}`);

      const events = this.parseTelegramPost(rawTextWithLinks, externalId, sourceUrl, importantTag, index);
      return events.map((item) => ({
        ...item,
        imageUrl: item.imageUrl || imageUrl,
        tags: Array.from(new Set([...(item.tags || []), 'max'])),
      }));
    });
  }

  private async fetchJsonApi(connector: ConnectorConfig): Promise<ExternalEvent[]> {
    if (!connector.url) return [];
    const response = await fetch(connector.url, {
      method: connector.method || 'GET',
      headers: { 'content-type': 'application/json', ...(connector.headers || {}) },
    });
    if (!response.ok) throw new Error(`API-коннектор ${connector.id} вернул HTTP ${response.status}`);
    const payload = (await response.json()) as any;
    const items = Array.isArray(payload) ? payload : Array.isArray(payload?.items) ? payload.items : [];
    const importantTag = connector.importantTag || '#Хит';

    return items.flatMap((item: any, index: number): ExternalEvent[] => {
      const title = String(item.title || item.name || '').trim();
      if (!title) return [];
      const description = String(item.description || item.summary || title);
      const tags = Array.isArray(item.tags) ? item.tags.map(String) : this.extractTags(description);
      const startAt = item.startAt ? new Date(item.startAt) : this.parseDateTimeRange(description).startAt;
      const endAt = item.endAt ? new Date(item.endAt) : this.parseDateTimeRange(description).endAt;
      const format = ['ONLINE', 'OFFLINE', 'HYBRID'].includes(String(item.format || '').toUpperCase())
        ? (String(item.format).toUpperCase() as 'ONLINE' | 'OFFLINE' | 'HYBRID')
        : this.deriveFormat(description);

      return [
        {
          externalId: String(item.externalId || item.id || `${connector.id}-${index}`),
          title,
          description,
          startAt,
          endAt,
          location: item.location || item.place ? String(item.location || item.place) : this.parseLocation(description, format),
          sourceUrl: String(item.url || item.sourceUrl || connector.url),
          imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
          tags,
          isImportant: Boolean(item.isImportant) || this.isImportant(description, tags, importantTag, index),
          format,
        },
      ];
    });
  }

  private mockEvents(): ExternalEvent[] {
    const year = new Date().getFullYear();
    return [
      {
        externalId: 'fallback-tax-1',
        title: 'Налоговая реформа: что важно знать бухгалтеру',
        description: 'Fallback-событие. Используется только если IMPORT_FALLBACK_ENABLED=true.',
        startAt: new Date(year, 2, 17, 11, 0, 0),
        location: 'Онлайн',
        sourceUrl: 'https://t.me/ab_afisha_buh',
        tags: ['telegram', 'fallback'],
        isImportant: true,
        format: 'ONLINE',
      },
    ];
  }

  private async fetchFromConnector(connector: ConnectorConfig): Promise<ExternalEvent[]> {
    if (connector.type === 'telegram-public-html') return this.fetchTelegramPublic(connector);
    if (connector.type === 'max-api') return this.fetchMaxApi(connector);
    if (connector.type === 'json-api') return this.fetchJsonApi(connector);
    return [];
  }

  private slugify(value: string, fallback: string) {
    const base = value
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/giu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 70);
    const suffix = fallback
      .toLowerCase()
      .replace(/[^a-z0-9а-я]+/giu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 24);
    return `${base || 'imported-event'}-${suffix || Date.now()}`.slice(0, 110);
  }

  private async getDefaultCategory() {
    const existing = await this.prisma.category.findFirst({ orderBy: { title: 'asc' } });
    if (existing) return existing;

    return this.prisma.category.create({
      data: {
        title: 'Импорт',
        slug: 'import',
        color: '#5eead4',
      },
    });
  }

  private getSourceName(connector: ConnectorConfig): string {
    if (connector.type === 'telegram-public-html') return 'TELEGRAM';
    if (connector.type === 'max-api') return 'MAX';
    return connector.name;
  }

  private getSourceTag(connector: ConnectorConfig): string {
    if (connector.type === 'telegram-public-html') return 'telegram';
    if (connector.type === 'max-api') return 'max';
    return connector.id;
  }

  private async persistImportedEvent(connector: ConnectorConfig, event: ExternalEvent) {
    const category = await this.getDefaultCategory();
    const sourcePostId = this.safeTextForDb(`${connector.id}:${event.externalId}`, 240);
    const eventTitle = this.safeTextForDb(event.title, 180) || 'Импортированное мероприятие';
    const sourceUrl = this.safeTextForDb(event.sourceUrl, 1000);
    const rawText = this.safeTextForDb(event.description || event.title, 20000);
    const cleanDescription = this.safeTextForDb(this.sanitizeImportedText(event.description || event.title), 12000);
    const eventLocation = this.safeTextForDb(event.location ?? 'Онлайн', 240) || 'Онлайн';

    await this.prisma.telegramImport.upsert({
      where: { sourcePostId },
      update: {
        sourceUrl,
        rawText,
        parsedTitle: eventTitle,
        parsedStartAt: event.startAt,
        parsedLocation: eventLocation,
        parsedDescription: cleanDescription,
        status: event.startAt ? 'CONFIRMED' : 'REVIEW',
      },
      create: {
        sourcePostId,
        sourceUrl,
        rawText,
        parsedTitle: eventTitle,
        parsedStartAt: event.startAt,
        parsedLocation: eventLocation,
        parsedDescription: cleanDescription,
        status: event.startAt ? 'CONFIRMED' : 'REVIEW',
      },
    });

    if (!event.startAt) return null;

    const slug = this.slugify(eventTitle, sourcePostId);
    const sourceTag = this.getSourceTag(connector);
    const tags = this.safeTagsForDb([...(event.tags || []), sourceTag, 'import']);
    const endAt = event.endAt && event.endAt > event.startAt ? event.endAt : new Date(event.startAt.getTime() + 2 * 60 * 60 * 1000);
    const imageUrl = event.imageUrl ? this.safeTextForDb(event.imageUrl, 1000) : null;

    const existingDeleted = await this.prisma.event.findFirst({
      where: {
        deletedAt: { not: null },
        OR: [{ sourcePostId }, { slug }],
      },
    });

    if (existingDeleted) {
      this.logger.log(`Импорт пропущен: событие ранее удалено вручную (${sourcePostId}).`);
      return null;
    }

    const data = {
      title: eventTitle,
      descriptionShort: cleanDescription.slice(0, 180),
      descriptionFull: cleanDescription,
      startAt: event.startAt,
      endAt,
      location: eventLocation,
      format: this.normalizeFormatByLocation(event.format ?? 'ONLINE', eventLocation, rawText),
      source: this.getSourceName(connector),
      sourceUrl,
      sourcePostId,
      published: true,
      isImportant: Boolean(event.isImportant),
      status: 'SCHEDULED' as const,
      imageUrl,
      tags,
      categoryId: category.id,
      deletedAt: null,
    };

    const existing = await this.prisma.event.findFirst({
      where: {
        deletedAt: null,
        OR: [{ sourcePostId }, { slug }],
      },
    });

    if (existing) {
      return this.prisma.event.update({
        where: { id: existing.id },
        data,
      });
    }

    return this.prisma.event.create({
      data: {
        ...data,
        slug,
      },
    });
  }

  async listImports() {
    return this.prisma.telegramImport.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async confirm(id: string) {
    return this.prisma.telegramImport.update({ where: { id }, data: { status: 'CONFIRMED' } });
  }

  async reject(id: string) {
    return this.prisma.telegramImport.update({ where: { id }, data: { status: 'REJECTED' } });
  }

  async syncAll() {
    if (this.syncInProgress) {
      return { synced: false, skipped: true, reason: 'sync already in progress' };
    }

    this.syncInProgress = true;
    try {
      const connectors = this.getConnectors().filter((connector) => connector.enabled);
      const fallbackEnabled = this.config.get<string>('IMPORT_FALLBACK_ENABLED', 'false') === 'true';
      let imported = 0;
      let upserted = 0;
      const details: Array<{ connectorId: string; imported: number; upserted: number; fallback?: boolean; error?: string }> = [];

      for (const connector of connectors) {
        try {
          let events = await this.fetchFromConnector(connector);
          let fallback = false;

          if (!events.length && connector.type === 'telegram-public-html' && fallbackEnabled) {
            this.logger.warn(`Коннектор ${connector.id} не вернул событий, используем fallback.`);
            events = this.mockEvents();
            fallback = true;
          }

          let connectorUpserted = 0;
          for (const event of events) {
            try {
              const saved = await this.persistImportedEvent(connector, event);
              imported += 1;

              if (saved) {
                upserted += 1;
                connectorUpserted += 1;
              }
            } catch (error) {
              this.logger.warn(
                `Ошибка сохранения события ${connector.id}:${event.externalId} ` +
                  `«${event.title}»: ${(error as Error).message}`,
              );

              throw error;
            }
          }

          details.push({ connectorId: connector.id, imported: events.length, upserted: connectorUpserted, fallback });
        } catch (error) {
          this.logger.warn(`Ошибка коннектора ${connector.id}: ${(error as Error).message}`);
          details.push({ connectorId: connector.id, imported: 0, upserted: 0, error: (error as Error).message });
        }
      }

      return {
        synced: true,
        connectors: connectors.length,
        imported,
        upserted,
        details,
      };
    } finally {
      this.syncInProgress = false;
    }
  }
}
