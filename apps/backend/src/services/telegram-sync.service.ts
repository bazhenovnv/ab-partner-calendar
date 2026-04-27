import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { Pool } from 'pg';
import { AiParserService } from './ai-parser.service';

@Injectable()
export class TelegramSyncService {
  private readonly logger = new Logger(TelegramSyncService.name);

  private readonly pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  constructor(private readonly ai: AiParserService) {}

  async sync() {
    try {
      const channel = process.env.TELEGRAM_CHANNEL_USERNAME;

      if (!channel) {
        this.logger.warn('No channel specified');
        return;
      }

      const url = `https://api.rss2json.com/v1/api.json?rss_url=https://tg.i-c-a.su/rss/${channel}`;

      const res = await axios.get(url);

      const posts = res.data.items || [];

      for (const post of posts.slice(0, 10)) {
        const text = `${post.title}\n${post.description}`;

        const parsed = await this.ai.parse(text);

        if (!parsed?.title) continue;

        await this.pool.query(
          `
          INSERT INTO events (title, city, date, link, is_free)
          VALUES ($1, $2, $3, $4, $5)
          ON CONFLICT DO NOTHING
          `,
          [
            parsed.title,
            parsed.city || null,
            parsed.date || null,
            parsed.link || post.link,
            parsed.isFree ?? false,
          ],
        );

        this.logger.log(`Saved: ${parsed.title}`);
      }
    } catch (e) {
      this.logger.error('Telegram sync error', e as any);
    }
  }
}