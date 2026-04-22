import { Injectable, Logger } from '@nestjs/common';
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

@Injectable()
export class SourceConnectorsService {
  private readonly logger = new Logger(SourceConnectorsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  listConnectors() {
    return this.getConnectors();
  }

  private getConnectors(): ConnectorConfig[] {
    const connectors: ConnectorConfig[] = [];
    const syncEnabled = this.config.get<string>('TELEGRAM_SYNC_ENABLED', 'true') !== 'false';
    const telegramUrl = this.config.get<string>('TELEGRAM_CHANNEL_URL', 'https://t.me/ab_afisha_buh');

    connectors.push({
      id: 'telegram-main',
      name: 'Telegram channel',
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

  private stripHtml(value: string): string {
    return value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#\d+;/g, '')
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
      .filter((line) => !/^AB\s*\|/i.test(line));
  }

  private extractTags(text: string): string[] {
    const matches = text.match(/#[\p{L}\p{N}_-]+/gu) ?? [];
    return matches.map((item) => item.replace(/^#/, ''));
  }

  private deriveFormat(text: string): 'ONLINE' | 'OFFLINE' | 'HYBRID' {
    const lower = text.toLowerCase();
    if (lower.includes('гибрид')) return 'HYBRID';
    if (lower.includes('оффлайн') || lower.includes('офлайн')) return 'OFFLINE';
    return 'ONLINE';
  }

  private parseExplicitDateTime(text: string): Date | undefined {
    const dotted = text.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4}).{0,20}?(\d{1,2}):(\d{2})/u);
    if (dotted) {
      const [, dd, mm, yyyy, hh, min] = dotted;
      const year = yyyy.length === 2 ? `20${yyyy}` : yyyy;
      return new Date(`${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh.padStart(2, '0')}:${min}:00`);
    }

    const russian = text.match(/(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря)[^\d]{0,20}(\d{1,2}):(\d{2})/iu);
    if (russian) {
      const [, dd, monthRus, hh, min] = russian;
      const year = new Date().getFullYear();
      return new Date(year, MONTHS[monthRus.toLowerCase()], Number(dd), Number(hh), Number(min), 0, 0);
    }

    return undefined;
  }

  private parseLocation(text: string): string | undefined {
    const patterns = [
      /где\s*:\s*(.+)/iu,
      /место\s*:\s*(.+)/iu,
      /формат\s*:\s*(.+)/iu,
      /(^|\n)(онлайн|оффлайн|офлайн|гибрид)(\s|$)/iu,
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) return (match[1] || match[2] || match[0]).trim();
    }

    return undefined;
  }

  private normalizeTitle(text: string): string {
    return text.replace(/^[#*•\-\s]+/, '').trim().slice(0, 180);
  }

  private fallbackTitle(lines: string[]): string {
    const blacklist = [
      /^пoдборка недели$/iu,
      /^мероприятие$/iu,
      /^вебинар$/iu,
      /^когда\s*:/iu,
      /^где\s*:/iu,
      /^стоимость\s*:/iu,
      /^формат\s*:/iu,
      /^источник$/iu,
      /^зарегистрироваться/i,
      /^🔥/u,
      /^\[/u,
    ];

    const line = lines.find((item) => item && !blacklist.some((rule) => rule.test(item)) && !item.startsWith('#'));
    return this.normalizeTitle(line || 'Импортированное мероприятие');
  }

  private weeklyDigestHeader(line: string): RegExpMatchArray | null {
    return line.match(/^(\d{1,2})\s+(января|февраля|марта|апреля|мая|июня|июля|августа|сентября|октября|ноября|декабря),\s*(\d{2}:\d{2})\s*\|\s*(.+)$/iu);
  }

  private parseWeeklyDigest(rawText: string, baseId: string, sourceUrl: string, importantTag: string): ExternalEvent[] {
    const lines = this.cleanLines(rawText).filter(
      (line) =>
        !/^подборка недели$/iu.test(line) &&
        !/^🔥?\s*аб афиша бухгалтера:/iu.test(line) &&
        !/^\[[0-9.\s\-]+\]$/u.test(line),
    );

    const blocks: string[][] = [];
    let current: string[] = [];

    for (const line of lines) {
      if (this.weeklyDigestHeader(line)) {
        if (current.length) blocks.push(current);
        current = [line];
      } else if (current.length) {
        current.push(line);
      }
    }
    if (current.length) blocks.push(current);

    return blocks.flatMap((block, idx): ExternalEvent[] => {
      const match = this.weeklyDigestHeader(block[0]);
      if (!match) return [];
      const [, dd, monthRus, time, meta] = match;
      const title = this.normalizeTitle(block[1] || 'Событие из подборки');
      const description = block.slice(1).join('\n').trim();
      const [hh, mm] = time.split(':').map(Number);
      const year = new Date().getFullYear();
      const startAt = new Date(year, MONTHS[monthRus.toLowerCase()], Number(dd), hh, mm, 0, 0);
      const tags = this.extractTags(block.join('\n'));
      const isImportant = tags.some((tag) => tag.toLowerCase() === importantTag.replace('#', '').toLowerCase());
      const format = this.deriveFormat(meta);
      const location = format === 'ONLINE' ? 'Онлайн' : undefined;

      return [{
        externalId: `${baseId}-${idx + 1}`,
        title,
        description,
        startAt,
        location,
        sourceUrl,
        tags,
        isImportant,
        format,
      }];
    });
  }

  private parseSingleEvent(rawText: string, baseId: string, sourceUrl: string, importantTag: string): ExternalEvent | null {
    const lines = this.cleanLines(rawText);
    if (!lines.length) return null;

    let title = '';
    const markerIdx = lines.findIndex((line) => /^(мероприятие|вебинар)$/iu.test(line));
    if (markerIdx >= 0 && lines[markerIdx + 1]) {
      title = this.normalizeTitle(lines[markerIdx + 1]);
    }

    if (!title) {
      title = this.fallbackTitle(lines);
    }

    const description = rawText.trim();
    const startAt = this.parseExplicitDateTime(rawText);
    const location = this.parseLocation(rawText) || (this.deriveFormat(rawText) === 'ONLINE' ? 'Онлайн' : undefined);
    const format = this.deriveFormat(rawText);
    const tags = this.extractTags(rawText);
    const isImportant = tags.some((tag) => tag.toLowerCase() === importantTag.replace('#', '').toLowerCase());

    return {
      externalId: baseId,
      title,
      description,
      startAt,
      location,
      sourceUrl,
      tags,
      isImportant,
      format,
    };
  }

  private parseTelegramPost(rawText: string, baseId: string, sourceUrl: string, importantTag: string): ExternalEvent[] {
    const weekly = this.parseWeeklyDigest(rawText, baseId, sourceUrl, importantTag);
    if (weekly.length) return weekly;
    const single = this.parseSingleEvent(rawText, baseId, sourceUrl, importantTag);
    return single ? [single] : [];
  }

  private async fetchTelegramPublic(connector: ConnectorConfig): Promise<ExternalEvent[]> {
    const normalized = (connector.channelUrl || 'https://t.me/ab_afisha_buh').replace(/\/$/, '');
    const publicFeedUrl = normalized.includes('/s/') ? normalized : normalized.replace('https://t.me/', 'https://t.me/s/');
    const response = await fetch(publicFeedUrl, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ABPartnerCalendarBot/1.0)' },
    });
    if (!response.ok) throw new Error(`Не удалось получить канал: HTTP ${response.status}`);
    const html = await response.text();
    const blocks = html.match(/<div class="tgme_widget_message_wrap[\s\S]*?<\/article>[\s\S]*?<\/div>/g) || [];
    const importantTag = connector.importantTag || '#Хит';

    return blocks.slice(0, 25).flatMap((block): ExternalEvent[] => {
      const postMatch = block.match(/data-post="([^"]+)"/);
      const textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
      const photoMatch = block.match(/background-image:url\('([^']+)'\)/);
      const rawText = this.stripHtml(textMatch?.[1] || '');
      if (!postMatch || !rawText) return [];
      const sourcePostId = postMatch[1].split('/').pop() || postMatch[1];
      const sourceUrl = `${normalized}/${sourcePostId}`;
      const events = this.parseTelegramPost(rawText, sourcePostId, sourceUrl, importantTag);
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
      const tags = Array.isArray(item.tags) ? item.tags.map(String) : [];
      const startAt = item.startAt ? new Date(item.startAt) : this.parseExplicitDateTime(description);
      const endAt = item.endAt ? new Date(item.endAt) : undefined;
      const isImportant = Boolean(item.isImportant) || tags.some((tag: string) => tag.toLowerCase() === importantTag.replace('#', '').toLowerCase());
      const format = ['ONLINE', 'OFFLINE', 'HYBRID'].includes(String(item.format || '').toUpperCase())
        ? (String(item.format).toUpperCase() as 'ONLINE' | 'OFFLINE' | 'HYBRID')
        : this.deriveFormat(description);

      return [{
        externalId: String(item.externalId || item.id || `${connector.id}-${index}`),
        title,
        description,
        startAt,
        endAt,
        location: item.location || item.place ? String(item.location || item.place) : 'Онлайн',
        sourceUrl: String(item.url || item.sourceUrl || connector.url),
        imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
        tags,
        isImportant,
        format,
      }];
    });
  }

  private mockEvents(): ExternalEvent[] {
    return [
      {
        externalId: 'digest-1',
        title: 'Практические вопросы бухгалтерского учета',
        description: '20 апреля, 10:30 | Онлайн, 5 146 ₽\nПрактические вопросы бухгалтерского учета\nНеочевидные ситуации из реальной работы: когда стандартные решения не срабатывают и приходится искать безопасный выход.',
        startAt: new Date('2026-04-20T10:30:00'),
        location: 'Онлайн',
        sourceUrl: 'https://t.me/ab_afisha_buh/100',
        tags: ['telegram'],
        isImportant: false,
        format: 'ONLINE',
      },
      {
        externalId: 'webinar-1',
        title: 'Экономим ресурсы бухгалтера: топ инструментов для складского учёта',
        description: 'Вебинар\nЭкономим ресурсы бухгалтера: топ инструментов для складского учёта\nКогда: 2 апреля, 14:00 (МСК)\nФормат: Онлайн | Бесплатно',
        startAt: new Date('2026-04-02T14:00:00'),
        location: 'Онлайн',
        sourceUrl: 'https://t.me/ab_afisha_buh/101',
        tags: ['Хит'],
        isImportant: true,
        format: 'ONLINE',
      },
      {
        externalId: 'offline-1',
        title: 'Блиц-доклады: вечер практики, идей и знакомств',
        description: 'Мероприятие\nБлиц-доклады: вечер практики, идей и знакомств\nКогда: 4 апреля, 19:00 (МСК)\nГде: Краснодар, ул. Монтажников, 3/2\nСтоимость: 4 000 ₽',
        startAt: new Date('2026-04-04T19:00:00'),
        location: 'Краснодар, ул. Монтажников, 3/2',
        sourceUrl: 'https://t.me/ab_afisha_buh/102',
        tags: ['КраснодарБизнес'],
        isImportant: false,
        format: 'OFFLINE',
      },
    ];
  }

  private async fetchFromConnector(connector: ConnectorConfig): Promise<ExternalEvent[]> {
    if (connector.type === 'telegram-public-html') return this.fetchTelegramPublic(connector);
    if (connector.type === 'json-api') return this.fetchJsonApi(connector);
    return [];
  }

  private async persistImportedEvent(connector: ConnectorConfig, event: ExternalEvent) {
    const category = await this.prisma.category.findFirst();
    if (!category) return null;

    const sourcePostId = `${connector.id}:${event.externalId}`;
    const rawText = event.description || event.title;
    const slug = event.title
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/giu, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);

    await this.prisma.telegramImport.upsert({
      where: { sourcePostId },
      update: {
        sourceUrl: event.sourceUrl,
        rawText,
        parsedTitle: event.title,
        parsedStartAt: event.startAt,
        parsedLocation: event.location,
        parsedDescription: event.description,
        status: event.startAt ? 'CONFIRMED' : 'REVIEW',
      },
      create: {
        sourcePostId,
        sourceUrl: event.sourceUrl,
        rawText,
        parsedTitle: event.title,
        parsedStartAt: event.startAt,
        parsedLocation: event.location,
        parsedDescription: event.description,
        status: event.startAt ? 'CONFIRMED' : 'REVIEW',
      },
    });

    if (!event.startAt) return null;

    const tags = Array.from(new Set([...(event.tags || []), 'import', 'connector'])).slice(0, 12);

    return this.prisma.event.upsert({
      where: { slug },
      update: {
        title: event.title,
        descriptionShort: event.description.slice(0, 180),
        descriptionFull: event.description,
        startAt: event.startAt,
        endAt: event.endAt ?? new Date(event.startAt.getTime() + 2 * 60 * 60 * 1000),
        location: event.location ?? 'Онлайн',
        format: event.format ?? 'ONLINE',
        source: 'TELEGRAM',
        sourceUrl: event.sourceUrl,
        published: true,
        isImportant: Boolean(event.isImportant),
        status: 'SCHEDULED',
        imageUrl:
          event.imageUrl ||
          'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1200&auto=format&fit=crop',
        tags,
        categoryId: category.id,
      },
      create: {
        title: event.title,
        slug,
        descriptionShort: event.description.slice(0, 180),
        descriptionFull: event.description,
        startAt: event.startAt,
        endAt: event.endAt ?? new Date(event.startAt.getTime() + 2 * 60 * 60 * 1000),
        location: event.location ?? 'Онлайн',
        format: event.format ?? 'ONLINE',
        categoryId: category.id,
        source: 'TELEGRAM',
        sourceUrl: event.sourceUrl,
        published: true,
        isImportant: Boolean(event.isImportant),
        status: 'SCHEDULED',
        imageUrl:
          event.imageUrl ||
          'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1200&auto=format&fit=crop',
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
    const connectors = this.getConnectors().filter((connector) => connector.enabled);
    let imported = 0;
    let upserted = 0;
    const details: Array<{ connectorId: string; imported: number; upserted: number; fallback?: boolean }> = [];

    for (const connector of connectors) {
      try {
        let events = await this.fetchFromConnector(connector);
        let fallback = false;

        if (!events.length && connector.type === 'telegram-public-html') {
          this.logger.warn(`Коннектор ${connector.id} не вернул событий, используем fallback.`);
          events = this.mockEvents();
          fallback = true;
        }

        let connectorUpserted = 0;
        for (const event of events) {
          await this.persistImportedEvent(connector, event);
          imported += 1;
          if (event.startAt) {
            upserted += 1;
            connectorUpserted += 1;
          }
        }

        details.push({ connectorId: connector.id, imported: events.length, upserted: connectorUpserted, fallback });
      } catch (error) {
        this.logger.warn(`Ошибка коннектора ${connector.id}: ${(error as Error).message}`);
        if (connector.type === 'telegram-public-html') {
          const events = this.mockEvents();
          let connectorUpserted = 0;
          for (const event of events) {
            await this.persistImportedEvent(connector, event);
            imported += 1;
            if (event.startAt) {
              upserted += 1;
              connectorUpserted += 1;
            }
          }
          details.push({ connectorId: connector.id, imported: events.length, upserted: connectorUpserted, fallback: true });
        }
      }
    }

    return {
      synced: true,
      connectors: connectors.length,
      imported,
      upserted,
      details,
    };
  }
}
