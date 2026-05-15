import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../services/prisma.service';

type ConnectorType = 'telegram-public-html' | 'json-api';

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
    const intervalMinutes = Number(this.config.get<string>('TELEGRAM_SYNC_INTERVAL_MINUTES', '60'));

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
    const syncEnabled = this.config.get<string>('TELEGRAM_SYNC_ENABLED', 'true') !== 'false';
    const telegramUrl = this.config.get<string>('TELEGRAM_CHANNEL_URL', 'https://t.me/ab_afisha_buh');

    connectors.push({
      id: 'telegram-main',
      name: 'АБ Афиша Бухгалтера / Telegram',
      type: 'telegram-public-html',
      enabled: syncEnabled,
      channelUrl: telegramUrl,
      importantTag: '#Хит',
    });

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
        });
      }
    } catch (error) {
      this.logger.warn(`SOURCE_CONNECTORS_JSON не распарсен: ${(error as Error).message}`);
    }

    return connectors;
  }

  private decodeHtml(value: string): string {
    return value
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
    return text
      .split('\n')
      .map((line) => line.replace(/\u00A0/g, ' ').trim())
      .filter(Boolean)
      .filter((line) => !/^AB\s*\|/i.test(line))
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
    if (lower.includes('офлайн') || lower.includes('оффлайн') || lower.includes('москва') || lower.includes('краснодар') || lower.includes('екатеринбург') || lower.includes('ростов')) return 'OFFLINE';
    return 'ONLINE';
  }

  private guessYear(monthIndex: number): number {
    const now = new Date();
    let year = now.getFullYear();
    if (monthIndex < now.getMonth() - 2) year += 1;
    return year;
  }

  private parseDateTimeRange(text: string): { startAt?: Date; endAt?: Date } {
    const dotted = text.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4}).{0,40}?(\d{1,2}):(\d{2})(?:\s*[–—-]\s*(\d{1,2}):(\d{2}))?/u);
    if (dotted) {
      const [, dd, mm, yyyy, hh, min, endHh, endMin] = dotted;
      const year = yyyy.length === 2 ? `20${yyyy}` : yyyy;
      const startAt = new Date(Number(year), Number(mm) - 1, Number(dd), Number(hh), Number(min), 0, 0);
      const endAt = endHh ? new Date(Number(year), Number(mm) - 1, Number(dd), Number(endHh), Number(endMin), 0, 0) : undefined;
      return { startAt, endAt };
    }

    const russianWithTime = text.match(/(?:когда\s*:\s*)?(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)[^\d]{0,40}(\d{1,2}):(\d{2})(?:\s*[–—-]\s*(\d{1,2}):(\d{2}))?/iu);
    if (russianWithTime) {
      const [, dd, monthRus, hh, min, endHh, endMin] = russianWithTime;
      const monthIndex = MONTHS[monthRus.toLowerCase()];
      const year = this.guessYear(monthIndex);
      const startAt = new Date(year, monthIndex, Number(dd), Number(hh), Number(min), 0, 0);
      const endAt = endHh ? new Date(year, monthIndex, Number(dd), Number(endHh), Number(endMin), 0, 0) : undefined;
      return { startAt, endAt };
    }

    const russianNoTime = text.match(/(?:когда\s*:\s*)?(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)/iu);
    if (russianNoTime) {
      const [, dd, monthRus] = russianNoTime;
      const monthIndex = MONTHS[monthRus.toLowerCase()];
      const year = this.guessYear(monthIndex);
      return { startAt: new Date(year, monthIndex, Number(dd), 10, 0, 0, 0) };
    }

    return {};
  }

  private parseLocation(text: string, format: 'ONLINE' | 'OFFLINE' | 'HYBRID'): string | undefined {
    const patterns = [
      /где\s*:\s*(.+)/iu,
      /место\s*:\s*(.+)/iu,
      /адрес\s*:\s*(.+)/iu,
      /формат\s*:\s*(.+)/iu,
    ];

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
    return text
      .replace(/https?:\/\/\S+/g, '')
      .replace(/#[\p{L}\p{N}_-]+/gu, '')
      .replace(/(?:^|
)(Источник|Телеграм|Зарегистрироваться|Регистрация).*$/gimu, '')
      .replace(/
{3,}/g, '

')
      .trim();
  }

  private isImportant(text: string, tags: string[], importantTag: string, indexFromChannel: number) {
    const normalizedTag = importantTag.replace('#', '').toLowerCase();
    const explicit = tags.some((tag) => tag.toLowerCase() === normalizedTag);
    const keyword = IMPORTANT_KEYWORDS.some((rule) => rule.test(text));
    return explicit || keyword || indexFromChannel < 5;
  }


  private isCollectionHeader(line: string) {
    return /^(?:\d{1,2}[.\-/]\d{1,2}(?:[.\-/]\d{2,4})?|\d{1,2}\s+(?:января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря))[^\n]{0,80}(?:\d{1,2}:\d{2})?/iu.test(line);
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
      const titleLine = block.find((line, idx) => idx > 0 && !/^стоимость\s*:/iu.test(line) && !/^формат\s*:/iu.test(line) && !/^где\s*:/iu.test(line) && !line.startsWith('#'));
      const title = this.normalizeTitle(titleLine || this.fallbackTitle(block));
      if (!title) continue;

      const joined = block.join('\n');
      const dateInfo = this.parseDateTimeRange(header) || this.parseDateTimeRange(joined);
      if (!dateInfo.startAt) continue;

      const format = this.deriveFormat(joined);
      const tags = this.extractTags(joined);
      events.push({
        externalId: `${baseId}-${i + 1}`,
        title,
        description: joined,
        startAt: dateInfo.startAt,
        endAt: dateInfo.endAt,
        location: this.parseLocation(joined, format),
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
    const format = this.deriveFormat(joined);
    const tags = this.extractTags(joined);
    const markerIdx = lines.findIndex((line) => /^(мероприятие|вебинар)$/iu.test(line));
    const title = markerIdx >= 0 && lines[markerIdx + 1] ? this.normalizeTitle(lines[markerIdx + 1]) : this.fallbackTitle(lines);

    if (!title) return [];

    return [{
      externalId: baseId,
      title,
      description: joined,
      startAt: dateInfo.startAt,
      endAt: dateInfo.endAt,
      location: this.parseLocation(joined, format),
      sourceUrl,
      tags,
      isImportant: this.isImportant(joined, tags, importantTag, indexFromChannel),
      format,
    }];
  }

  private async fetchTelegramPublic(connector: ConnectorConfig): Promise<ExternalEvent[]> {
    const normalized = (connector.channelUrl || 'https://t.me/ab_afisha_buh').replace(/\/$/, '');
    const publicFeedUrl = normalized.includes('/s/') ? normalized : normalized.replace('https://t.me/', 'https://t.me/s/');
    const response = await fetch(publicFeedUrl, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ABPartnerCalendarBot/1.0)' },
    });
    if (!response.ok) throw new Error(`Не удалось получить канал ${publicFeedUrl}: HTTP ${response.status}`);

    const html = await response.text();
    const blocks = html.match(/<div class="tgme_widget_message_wrap[\s\S]*?<\/article>[\s\S]*?<\/div>/g) || [];
    const importantTag = connector.importantTag || '#Хит';

    return blocks.slice(0, 80).flatMap((block, index): ExternalEvent[] => {
      const postMatch = block.match(/data-post="([^"]+)"/);
      const textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
      const photoMatch = block.match(/background-image:url\('([^']+)'\)/);
      const rawText = this.decodeHtml(textMatch?.[1] || '');
      if (!postMatch || !rawText) return [];

      const sourcePostId = postMatch[1].split('/').pop() || postMatch[1];
      const sourceUrl = `${normalized}/${sourcePostId}`;
      const events = this.parseTelegramPost(rawText, sourcePostId, sourceUrl, importantTag, index);
      return events.map((item) => ({ ...item, imageUrl: item.imageUrl || photoMatch?.[1] }));
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

      return [{
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
      }];
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
    return `${base || 'telegram-event'}-${suffix || Date.now()}`.slice(0, 110);
  }

  private async getDefaultCategory() {
    const existing = await this.prisma.category.findFirst({ orderBy: { title: 'asc' } });
    if (existing) return existing;

    return this.prisma.category.create({
      data: {
        title: 'Telegram',
        slug: 'telegram',
        color: '#5eead4',
      },
    });
  }

  private async persistImportedEvent(connector: ConnectorConfig, event: ExternalEvent) {
    const category = await this.getDefaultCategory();
    const sourcePostId = `${connector.id}:${event.externalId}`;
    const rawText = event.description || event.title;
    const cleanDescription = this.sanitizeImportedText(event.description || event.title);

    await this.prisma.telegramImport.upsert({
      where: { sourcePostId },
      update: {
        sourceUrl: event.sourceUrl,
        rawText,
        parsedTitle: event.title,
        parsedStartAt: event.startAt,
        parsedLocation: event.location,
        parsedDescription: cleanDescription,
        status: event.startAt ? 'CONFIRMED' : 'REVIEW',
      },
      create: {
        sourcePostId,
        sourceUrl: event.sourceUrl,
        rawText,
        parsedTitle: event.title,
        parsedStartAt: event.startAt,
        parsedLocation: event.location,
        parsedDescription: cleanDescription,
        status: event.startAt ? 'CONFIRMED' : 'REVIEW',
      },
    });

    if (!event.startAt) return null;

    const slug = this.slugify(event.title, sourcePostId);
    const tags = Array.from(new Set([...(event.tags || []), 'telegram', 'import'])).slice(0, 12);
    const endAt = event.endAt && event.endAt > event.startAt ? event.endAt : new Date(event.startAt.getTime() + 2 * 60 * 60 * 1000);
    const imageUrl = event.imageUrl || '/important-events-photo.png';

    return this.prisma.event.upsert({
      where: { slug },
      update: {
        title: event.title,
        descriptionShort: cleanDescription.slice(0, 180),
        descriptionFull: cleanDescription,
        startAt: event.startAt,
        endAt,
        location: event.location ?? 'Онлайн',
        format: event.format ?? 'ONLINE',
        source: 'TELEGRAM',
        sourceUrl: event.sourceUrl,
        published: true,
        isImportant: Boolean(event.isImportant),
        status: 'SCHEDULED',
        imageUrl,
        tags,
        categoryId: category.id,
      },
      create: {
        title: event.title,
        slug,
        descriptionShort: cleanDescription.slice(0, 180),
        descriptionFull: cleanDescription,
        startAt: event.startAt,
        endAt,
        location: event.location ?? 'Онлайн',
        format: event.format ?? 'ONLINE',
        categoryId: category.id,
        source: 'TELEGRAM',
        sourceUrl: event.sourceUrl,
        published: true,
        isImportant: Boolean(event.isImportant),
        status: 'SCHEDULED',
        imageUrl,
        tags,
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
            const saved = await this.persistImportedEvent(connector, event);
            imported += 1;
            if (saved) {
              upserted += 1;
              connectorUpserted += 1;
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
