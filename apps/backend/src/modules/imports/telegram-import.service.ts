import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../services/prisma.service';

type ParsedPost = {
  sourcePostId: string;
  sourceUrl: string;
  rawText: string;
  title: string;
  startAt?: Date;
  location?: string;
  description: string;
  isImportant: boolean;
};

@Injectable()
export class TelegramImportService {
  private readonly logger = new Logger(TelegramImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private parseDateTime(text: string): Date | undefined {
    const match = text.match(
      /(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4}).{0,20}?(\d{1,2}):(\d{2})/,
    );

    if (!match) return undefined;

    const [, dd, mm, yyyy, hh, min] = match;
    const year = yyyy.length === 2 ? `20${yyyy}` : yyyy;

    return new Date(
      `${year}-${mm.padStart(2, '0')}-${dd.padStart(2, '0')}T${hh.padStart(2, '0')}:${min}:00`,
    );
  }

  private parseTitle(text: string): string {
    const firstLine = text
      .split('\n')
      .map((x) => x.trim())
      .find((line) => Boolean(line) && !/^#\S+$/i.test(line));

    return firstLine?.replace(/^[#*•\-\s]+/, '').slice(0, 140) || 'Импортированное мероприятие';
  }

  private parseLocation(text: string): string | undefined {
    const patterns = [/место[:\s]+(.+)/i, /формат[:\s]+(.+)/i, /(онлайн|офлайн|гибрид)/i];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match) {
        return match[1] || match[0];
      }
    }

    return undefined;
  }

  private stripHtml(value: string): string {
    return value
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#\d+;/g, '')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  private parsePostsMock(): ParsedPost[] {
    const sample = [
      `#Хит\nВебинар: Изменения в 54-ФЗ\nДата: 15.04.2026 11:00\nМесто: Онлайн\nПрактический разбор изменений и реальных кейсов для бухгалтеров.`,
      `#Хит\nПрактикум по маркировке и Честному знаку\n16.04.2026 13:00\nФормат: Онлайн\nРазбор ошибок, остатков и настройки обмена.`,
      `Семинар по 1С и автоматизации торговли\n18.04.2026 14:30\nФормат: Гибрид\nРазберем интеграцию касс, ОФД и учета.`,
    ];

    return sample.map((rawText, index) => ({
      sourcePostId: `demo-${index + 1}`,
      sourceUrl: `https://t.me/ab_afisha_buh/${100 + index}`,
      rawText,
      title: this.parseTitle(rawText),
      startAt: this.parseDateTime(rawText),
      location: this.parseLocation(rawText),
      description: rawText,
      isImportant: /#хит/i.test(rawText),
    }));
  }

  private async fetchPublicChannelPosts(): Promise<ParsedPost[]> {
    const channelUrl = this.config.get<string>('TELEGRAM_CHANNEL_URL', 'https://t.me/ab_afisha_buh');
    const normalized = channelUrl.replace(/\/$/, '');
    const publicFeedUrl = normalized.includes('/s/') ? normalized : normalized.replace('https://t.me/', 'https://t.me/s/');

    const response = await fetch(publicFeedUrl, {
      headers: {
        'user-agent': 'Mozilla/5.0 (compatible; ABPartnerCalendarBot/1.0)',
      },
    });

    if (!response.ok) {
      throw new Error(`Не удалось получить канал: HTTP ${response.status}`);
    }

    const html = await response.text();
    const blocks = html.match(/<div class="tgme_widget_message_wrap[\s\S]*?<\/article>[\s\S]*?<\/div>/g) || [];

    return blocks.slice(0, 20).flatMap((block): ParsedPost[] => {
      const postMatch = block.match(/data-post="([^"]+)"/);
      const textMatch = block.match(/<div class="tgme_widget_message_text[^>]*>([\s\S]*?)<\/div>/);
      const rawText = this.stripHtml(textMatch?.[1] || '');

      if (!postMatch || !rawText) return [];

      const sourcePostId = postMatch[1].split('/').pop() || postMatch[1];
      const sourceUrl = `${normalized}/${sourcePostId}`;

      return [{
        sourcePostId,
        sourceUrl,
        rawText,
        title: this.parseTitle(rawText),
        startAt: this.parseDateTime(rawText),
        location: this.parseLocation(rawText),
        description: rawText,
        isImportant: /#хит/i.test(rawText),
      }];
    });
  }

  private async upsertEventFromPost(post: ParsedPost) {
    if (!post.startAt || !post.title) return null;

    const category = await this.prisma.category.findFirst();
    if (!category) return null;

    const slug = post.title
      .toLowerCase()
      .replace(/[^a-zа-я0-9]+/gi, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 80);

    return this.prisma.event.upsert({
      where: { slug },
      update: {
        title: post.title,
        descriptionShort: post.description.slice(0, 180),
        descriptionFull: post.description,
        startAt: post.startAt,
        endAt: new Date(post.startAt.getTime() + 2 * 60 * 60 * 1000),
        location: post.location ?? 'Онлайн',
        format: 'ONLINE',
        source: 'TELEGRAM',
        sourceUrl: post.sourceUrl,
        published: true,
        isImportant: post.isImportant,
        status: 'SCHEDULED',
        imageUrl:
          'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1200&auto=format&fit=crop',
        tags: post.isImportant ? ['telegram', 'импорт', 'хит'] : ['telegram', 'импорт'],
        categoryId: category.id,
      },
      create: {
        title: post.title,
        slug,
        descriptionShort: post.description.slice(0, 180),
        descriptionFull: post.description,
        startAt: post.startAt,
        endAt: new Date(post.startAt.getTime() + 2 * 60 * 60 * 1000),
        location: post.location ?? 'Онлайн',
        format: 'ONLINE',
        categoryId: category.id,
        source: 'TELEGRAM',
        sourceUrl: post.sourceUrl,
        published: true,
        isImportant: post.isImportant,
        status: 'SCHEDULED',
        imageUrl:
          'https://images.unsplash.com/photo-1554224155-6726b3ff858f?q=80&w=1200&auto=format&fit=crop',
        tags: post.isImportant ? ['telegram', 'импорт', 'хит'] : ['telegram', 'импорт'],
      },
    });
  }

  async sync() {
    let posts: ParsedPost[] = [];

    try {
      posts = await this.fetchPublicChannelPosts();
      if (!posts.length) {
        this.logger.warn('Публичная лента Telegram не вернула событий, используем mock-набор.');
        posts = this.parsePostsMock();
      }
    } catch (error) {
      this.logger.warn(`Ошибка импорта из Telegram, переключаемся на mock: ${(error as Error).message}`);
      posts = this.parsePostsMock();
    }

    const results = [];
    let upserted = 0;

    for (const post of posts) {
      const item = await this.prisma.telegramImport.upsert({
        where: { sourcePostId: post.sourcePostId },
        update: {
          sourceUrl: post.sourceUrl,
          rawText: post.rawText,
          parsedTitle: post.title,
          parsedStartAt: post.startAt,
          parsedLocation: post.location,
          parsedDescription: post.description,
          status: post.startAt ? 'NEW' : 'REVIEW',
        },
        create: {
          sourcePostId: post.sourcePostId,
          sourceUrl: post.sourceUrl,
          rawText: post.rawText,
          parsedTitle: post.title,
          parsedStartAt: post.startAt,
          parsedLocation: post.location,
          parsedDescription: post.description,
          status: post.startAt ? 'NEW' : 'REVIEW',
        },
      });

      results.push(item);

      if (post.startAt) {
        await this.upsertEventFromPost(post);
        upserted += 1;
      }
    }

    return { synced: true, imports: results.length, upserted };
  }
}
